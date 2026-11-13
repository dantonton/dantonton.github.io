/**
 * API do álbum do casamento (Cloudflare Worker).
 *
 * Faz a ponte entre a página estática casamento/index.html e a pasta compartilhada
 * no OneDrive, via Microsoft Graph. O login da Microsoft do dono da pasta fica
 * guardado aqui (refresh token no KV); os convidados nunca falam com a Microsoft.
 *
 * Rotas:
 *   GET  /auth/start?key=ADMIN_KEY  conecta a conta Microsoft (uso único, pelo dono)
 *   GET  /auth/callback             retorno do login da Microsoft
 *   GET  /api/items                 lista fotos e vídeos da pasta
 *   POST /api/uploads               inicia um envio e devolve o token de exclusão
 *   PUT  /api/uploads/chunk         recebe um pedaço do arquivo e repassa ao OneDrive
 *   POST /api/delete                apaga um arquivo, se o token de exclusão bater
 *   GET  /api/thumb/:id[?size=big]  miniatura (bytes direto pelo Graph)
 *   GET  /api/media/:id[?download]  arquivo original (download direto, ou redireciona para tocar vídeo)
 */

const SCOPES = 'offline_access Files.ReadWrite.All User.Read';
/** O Graph exige pedaços múltiplos de 320 KiB (exceto o último). */
const FRAGMENT = 320 * 1024;
/** ~8 MB por requisição: bem abaixo do limite de 100 MB do plano gratuito. */
const CHUNK_SIZE = FRAGMENT * 25;
/**
 * Até este tamanho o arquivo vai inteiro numa requisição só, em fluxo, pelo upload simples do Graph
 * (autenticado com o token normal). Acima disso usa sessão, cuja URL pré-autenticada falha às vezes.
 * O limite de corpo do Worker no plano gratuito é 100 MB.
 */
const simpleMax = (env) => (Number(env.SIMPLE_MAX_MB) || 90) * 1024 * 1024;
/** Miniaturas: tamanho na grade e na tela cheia, com alternativa se o primeiro falhar. */
const THUMB_SIZES = { small: ['c400x400', 'large'], big: ['c1600x1600', 'large'] };
const THUMB_TIMEOUT = 10_000;
const THUMB_CACHE_BYTES = 24 * 1024 * 1024;
const MAX_FILE = 4 * 1024 ** 3;
const LIST_TTL = 20_000;
const REDIRECT_TTL = 20 * 60_000;

const IMAGE_EXT = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'avif', 'bmp', 'tif', 'tiff', 'dng']);
const VIDEO_EXT = new Set(['mp4', 'mov', 'm4v', '3gp', 'webm', 'mkv', 'avi']);
const MIME_EXT = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/avif': 'avif',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/x-m4v': 'm4v',
  'video/3gpp': '3gp',
  'video/webm': 'webm',
};
/** Nome gerado no envio: 2026-12-20_21-14-03_Maria Silva_k3j9x2.jpg (o nome é opcional). */
const NAME_RE = /^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_(?:(.+)_)?[a-z0-9]{6}\.[a-z0-9]+$/i;

/**
 * Estado do isolate: sobrevive entre requisições enquanto o isolate estiver vivo.
 * Guarda só DADOS, nunca promessas em andamento: no Cloudflare, aguardar numa requisição uma
 * promessa (com fetch) criada por outra dá "Cannot perform I/O on behalf of a different request".
 */
const mem = {
  access: null,
  folder: null,
  list: null,
  byId: null,
  listAt: 0,
  redirects: new Map(),
  keys: null,
  /** Vira true se a URL de sessão só aceitar o PUT com o token (diagnóstico). */
  uploadNeedsToken: false,
  /** Cache de miniaturas na memória do isolate (ordem de inserção = LRU simples). */
  thumbs: new Map(),
  thumbBytes: 0,
  thumbFail: new Map(),
};

class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    let response;
    try {
      response = await route(request, env, new URL(request.url));
    } catch (err) {
      const known = err instanceof HttpError;
      if (!known) console.error('erro inesperado', request.method, new URL(request.url).pathname, err?.stack ?? err);
      response = json(
        known
          ? { error: err.code, message: err.message }
          : { error: 'internal', message: 'Algo deu errado, tente de novo', detail: String(err?.message ?? err).slice(0, 200) },
        known ? err.status : 500,
      );
    }

    const headers = new Headers(response.headers);
    for (const [name, value] of Object.entries(cors)) headers.set(name, value);
    return new Response(response.body, { status: response.status, headers });
  },
};

async function route(request, env, url) {
  const { pathname } = url;
  const method = request.method;

  if (method === 'GET' && pathname === '/') return new Response('ok', { headers: { 'Content-Type': 'text/plain' } });
  if (method === 'GET' && pathname === '/auth/start') return authStart(env, url);
  if (method === 'GET' && pathname === '/auth/callback') return authCallback(env, url);
  if (method === 'GET' && pathname === '/api/items') return listItems(env);
  if (method === 'POST' && pathname === '/api/uploads') return createUpload(request, env);
  if (method === 'PUT' && pathname === '/api/uploads/chunk') return uploadChunk(request, env);
  if (method === 'POST' && pathname === '/api/delete') return deleteItem(request, env);

  const file = method === 'GET' && pathname.match(/^\/api\/(thumb|media)\/([^/]+)$/);
  if (file) {
    const id = decodeURIComponent(file[2]);
    return file[1] === 'thumb' ? thumb(env, id, url) : media(env, id, request, url);
  }

  throw new HttpError(404, 'not_found', 'Não encontrado');
}

/* ==========================================================================
   Login da Microsoft (uso único, pelo dono da pasta)
   ========================================================================== */

async function authStart(env, url) {
  if (!env.ADMIN_KEY || !(await safeEqual(url.searchParams.get('key') ?? '', env.ADMIN_KEY))) {
    throw new HttpError(403, 'forbidden', 'Chave inválida');
  }
  const issued = Date.now().toString(36);
  const authorize = new URL(`${loginBase(env)}/oauth2/v2.0/authorize`);
  authorize.search = new URLSearchParams({
    client_id: env.MS_CLIENT_ID,
    response_type: 'code',
    redirect_uri: `${url.origin}/auth/callback`,
    response_mode: 'query',
    scope: SCOPES,
    state: `${issued}.${await sign(env, `state:${issued}`)}`,
    prompt: 'select_account',
  });
  return Response.redirect(authorize.toString(), 302);
}

async function authCallback(env, url) {
  const error = url.searchParams.get('error');
  if (error) {
    return page('Não deu certo', escapeHtml(`${error}: ${url.searchParams.get('error_description') ?? ''}`), 400);
  }

  const [issued, signature] = (url.searchParams.get('state') ?? '').split('.');
  const fresh = issued && Date.now() - parseInt(issued, 36) < 15 * 60_000;
  if (!fresh || !signature || !(await safeEqual(signature, await sign(env, `state:${issued}`)))) {
    return page('Link expirado', 'Abra o endereço /auth/start?key=… de novo.', 400);
  }

  const tokens = await tokenRequest(env, {
    grant_type: 'authorization_code',
    code: url.searchParams.get('code') ?? '',
    redirect_uri: `${url.origin}/auth/callback`,
  });
  await saveTokens(env, tokens);

  const folder = await resolveFolder(env);
  await env.ALBUM_KV.put('folder', JSON.stringify(folder));
  mem.folder = folder;
  mem.list = null;

  return page(
    'Pronto ✓',
    `Pasta conectada: <b>${escapeHtml(folder.name)}</b> (${folder.count ?? 0} itens).<br>Já pode fechar esta aba.`,
  );
}

/** Descobre a pasta a partir do link de compartilhamento. */
async function resolveFolder(env) {
  if (!env.SHARE_URL) throw new HttpError(500, 'no_share', 'Defina o segredo SHARE_URL');

  const encoded = 'u!' + btoa(env.SHARE_URL).replace(/=+$/, '').replace(/\//g, '_').replace(/\+/g, '-');
  const res = await graph(env, `/shares/${encoded}/driveItem?$select=id,name,folder,parentReference`);
  let item = res.ok ? await res.json() : null;

  if (!item) {
    // Plano B: o 1drv.ms redireciona para uma URL com resid=<CID>!<id>, e o CID é o id do drive.
    console.warn('shares/driveItem falhou', res.status);
    const redirect = await fetch(env.SHARE_URL, { redirect: 'manual' });
    const resid = new URL(redirect.headers.get('Location') ?? 'about:blank').searchParams.get('resid');
    if (resid?.includes('!')) {
      const driveId = resid.split('!')[0].toLowerCase();
      item = await graphJson(env, `/drives/${driveId}/items/${encodeURIComponent(resid)}?$select=id,name,folder,parentReference`);
    }
  }

  if (!item?.folder) throw new HttpError(500, 'not_folder', 'O link de compartilhamento não aponta para uma pasta');
  return { driveId: item.parentReference.driveId, id: item.id, name: item.name, count: item.folder.childCount };
}

async function getFolder(env) {
  mem.folder ??= await env.ALBUM_KV.get('folder', 'json');
  if (!mem.folder) throw new HttpError(503, 'not_configured', 'O álbum ainda não foi conectado');
  return mem.folder;
}

/* ==========================================================================
   Tokens e Microsoft Graph
   ========================================================================== */

function loginBase(env) {
  return `${env.LOGIN_BASE || 'https://login.microsoftonline.com'}/${env.MS_TENANT || 'consumers'}`;
}

function graphBase(env) {
  return env.GRAPH_BASE || 'https://graph.microsoft.com/v1.0';
}

async function tokenRequest(env, params) {
  const res = await fetch(`${loginBase(env)}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.MS_CLIENT_ID,
      client_secret: env.MS_CLIENT_SECRET,
      scope: SCOPES,
      ...params,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    console.error('token', res.status, data.error, data.error_description);
    throw new HttpError(503, 'auth_failed', 'O álbum precisa ser reconectado');
  }
  return data;
}

async function saveTokens(env, data) {
  const ttl = Number(data.expires_in) || 3600;
  const access = { token: data.access_token, exp: Date.now() + ttl * 1000 };
  mem.access = access;
  // A Microsoft troca o refresh token a cada renovação: guarda sempre o mais novo.
  const writes = [env.ALBUM_KV.put('access', JSON.stringify(access), { expirationTtl: Math.max(60, ttl - 120) })];
  if (data.refresh_token) writes.push(env.ALBUM_KV.put('refresh_token', data.refresh_token));
  await Promise.all(writes);
}

async function getAccessToken(env, force = false, minValidity = 60_000) {
  const soon = Date.now() + minValidity;
  if (!force && mem.access?.exp > soon) return mem.access.token;
  if (!force) {
    const cached = await env.ALBUM_KV.get('access', 'json');
    if (cached?.exp > soon) {
      mem.access = cached;
      return cached.token;
    }
  }
  return refreshAccess(env);
}

async function refreshAccess(env) {
  const refreshToken = await env.ALBUM_KV.get('refresh_token');
  if (!refreshToken) throw new HttpError(503, 'not_configured', 'O álbum ainda não foi conectado');
  const data = await tokenRequest(env, { grant_type: 'refresh_token', refresh_token: refreshToken });
  await saveTokens(env, data);
  return data.access_token;
}

async function graph(env, path, init = {}, retried = false) {
  const token = await getAccessToken(env, retried);
  const res = await fetch(/^https?:/.test(path) ? path : graphBase(env) + path, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token}` },
  });
  if (res.status === 401 && !retried) return graph(env, path, init, true);
  if (res.status === 429 || res.status === 503) {
    throw new HttpError(503, 'busy', 'Muita gente ao mesmo tempo, tente de novo em instantes');
  }
  return res;
}

async function graphJson(env, path, init) {
  const res = await graph(env, path, init);
  if (!res.ok) throw await graphError(res);
  return res.json();
}

async function graphError(res, message = 'Falha ao acessar o álbum') {
  const data = await res.json().catch(() => null);
  console.error('graph', res.status, data?.error?.code, data?.error?.message);
  return new HttpError(502, 'storage_error', message);
}

/* ==========================================================================
   Listagem
   ========================================================================== */

async function listItems(env) {
  const items = await getList(env);
  return json({ items, at: mem.listAt });
}

async function getList(env, fresh = false) {
  if (!fresh && mem.list && Date.now() - mem.listAt < LIST_TTL) return mem.list;
  const list = await fetchList(env);
  mem.list = list;
  mem.byId = new Map(list.map((item) => [item.id, item]));
  mem.listAt = Date.now();
  return list;
}

async function fetchList(env) {
  const folder = await getFolder(env);
  const items = [];
  let next =
    `/drives/${folder.driveId}/items/${encodeURIComponent(folder.id)}/children` +
    '?$top=200&$select=id,name,file,image,video,createdDateTime,size,cTag,eTag';

  for (let page = 0; next && page < 25; page++) {
    const data = await graphJson(env, next);
    for (const raw of data.value ?? []) {
      const item = toItem(raw);
      if (item) items.push(item);
    }
    next = data['@odata.nextLink'];
  }

  return items.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : a.name < b.name ? 1 : -1));
}

function toItem(raw) {
  // Sem conteúdo: sobra de um envio que não terminou.
  if (!raw.file || !raw.size) return null;
  const mime = raw.file.mimeType ?? '';
  const ext = raw.name.split('.').pop().toLowerCase();
  const type =
    raw.video || mime.startsWith('video/') || VIDEO_EXT.has(ext)
      ? 'video'
      : raw.image || mime.startsWith('image/') || IMAGE_EXT.has(ext)
        ? 'image'
        : null;
  if (!type) return null;

  const meta = raw.image ?? raw.video ?? {};
  return {
    id: raw.id,
    name: raw.name,
    type,
    // Versão do conteúdo: entra na URL da miniatura para o navegador poder guardar para sempre.
    v: String(raw.cTag || raw.eTag || raw.size).replace(/[^\w]/g, '').slice(-24),
    w: meta.width ?? null,
    h: meta.height ?? null,
    dur: raw.video?.duration ?? null,
    at: raw.createdDateTime,
    size: raw.size,
    author: raw.name.match(NAME_RE)?.[1] ?? null,
  };
}

async function findItem(env, id) {
  // Para conferir se o arquivo é do álbum, serve a lista em memória mesmo que antiga: assim um
  // isolate novo não faz uma listagem para cada miniatura pedida ao mesmo tempo.
  if (!mem.byId) await getList(env);
  let item = mem.byId?.get(id);
  // Pode ser um arquivo que acabou de chegar: recarrega a lista (no máximo a cada 3 s).
  if (!item && Date.now() - mem.listAt > 3000) {
    await getList(env, true);
    item = mem.byId?.get(id);
  }
  if (!item) throw new HttpError(404, 'not_found', 'Arquivo não encontrado');
  return item;
}

/* ==========================================================================
   Envio (upload em pedaços)
   ========================================================================== */

async function createUpload(request, env) {
  const body = await readJson(request);
  const fileName = String(body.fileName ?? '').slice(0, 200);
  const mime = String(body.mime ?? '').toLowerCase();
  const size = Number(body.size);

  if (!Number.isSafeInteger(size) || size <= 0) throw new HttpError(400, 'bad_size', 'Arquivo vazio');
  if (size > MAX_FILE) throw new HttpError(413, 'too_big', 'Arquivo muito grande (máximo 4 GB)');
  const ext = extensionFor(fileName, mime);
  if (!ext) throw new HttpError(415, 'bad_type', 'Envie apenas fotos ou vídeos');

  const folder = await getFolder(env);
  const author = cleanAuthor(body.author);
  const newName = () => `${[stamp(env), author, randomId()].filter(Boolean).join('_')}.${ext}`;

  // Arquivo pequeno: vai inteiro num PUT só, direto pela API do Graph (sem URL de sessão).
  if (size <= simpleMax(env)) {
    const name = newName();
    return json({
      name,
      token: await deleteToken(env, name),
      session: await seal(env, { m: 'simple', n: name, s: size, x: Date.now() + 6 * 3600_000 }),
      chunkSize: size,
    });
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const name = newName();
    const res = await graph(
      env,
      `/drives/${folder.driveId}/items/${encodeURIComponent(folder.id)}:/${encodeURIComponent(name)}:/createUploadSession`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item: { '@microsoft.graph.conflictBehavior': 'fail' } }),
      },
    );
    if (res.status === 409) continue;
    if (!res.ok) throw await graphError(res, 'Não foi possível iniciar o envio');

    const { uploadUrl, expirationDateTime } = await res.json();
    const expires = Date.parse(expirationDateTime) || Date.now() + 24 * 3600_000;
    console.log('upload session', JSON.stringify(describeUploadUrl(uploadUrl)));
    return json({
      name,
      token: await deleteToken(env, name),
      session: await seal(env, { m: 'session', u: uploadUrl, n: name, s: size, x: expires }),
      chunkSize: CHUNK_SIZE,
    });
  }
  throw new HttpError(409, 'conflict', 'Tente de novo');
}

async function uploadChunk(request, env) {
  const session = await unseal(env, request.headers.get('X-Session') ?? '');
  if (Date.now() > session.x) throw new HttpError(410, 'expired', 'O envio expirou, começando de novo');

  const range = (request.headers.get('X-Range') ?? '').match(/^bytes (\d+)-(\d+)\/(\d+)$/);
  if (!range) throw new HttpError(400, 'bad_range', 'Pedaço inválido');
  const [start, end, total] = range.slice(1).map(Number);
  const simple = session.m === 'simple';
  const valid =
    total === session.s &&
    (simple
      ? start === 0 && end === total - 1 && total <= simpleMax(env)
      : start <= end && end < total && end - start + 1 <= CHUNK_SIZE && start % FRAGMENT === 0);
  if (!valid) throw new HttpError(400, 'bad_range', 'Pedaço inválido');
  const declared = request.headers.get('Content-Length');
  if (declared !== null && Number(declared) !== end - start + 1) throw new HttpError(400, 'bad_length', 'Pedaço incompleto');

  if (simple) {
    // Em fluxo, sem guardar o arquivo na memória do Worker (até ~90 MB).
    if (!request.body) throw new HttpError(400, 'bad_length', 'Pedaço incompleto');
    const { readable, writable } = new FixedLengthStream(total);
    request.body.pipeTo(writable).catch(() => {});
    return simpleUpload(env, session, readable);
  }

  const body = await request.arrayBuffer();
  if (body.byteLength !== end - start + 1) throw new HttpError(400, 'bad_length', 'Pedaço incompleto');
  return sessionChunk(env, session, body, start, end, total);
}

/** Upload simples: PUT /content autenticado, o mesmo tipo de chamada da listagem. */
async function simpleUpload(env, session, body) {
  const folder = await getFolder(env);
  const path = `/drives/${folder.driveId}/items/${encodeURIComponent(folder.id)}:/${encodeURIComponent(session.n)}:`;
  // O corpo é um fluxo: não dá para repetir a requisição, então pega um token com folga de 15 min.
  const token = await getAccessToken(env, false, 15 * 60_000);
  const res = await fetch(`${graphBase(env)}${path}/content?@microsoft.graph.conflictBehavior=fail`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/octet-stream' },
    body,
  });
  if (res.status === 401) {
    // Token recusado: descarta para o próximo pedido renovar, e o navegador tenta de novo.
    mem.access = null;
    await env.ALBUM_KV.delete('access');
    throw new HttpError(502, 'upload_failed', 'Falha ao enviar o arquivo');
  }
  if (res.status === 429 || res.status === 503) {
    throw new HttpError(503, 'busy', 'Muita gente ao mesmo tempo, tente de novo em instantes');
  }

  let item = res.ok ? await res.json().catch(() => ({})) : null;
  if (res.status === 409) {
    // Já existe: provavelmente a tentativa anterior chegou e só a resposta se perdeu.
    const existing = await graph(env, `${path}?$select=id,size`);
    const data = existing.ok ? await existing.json() : null;
    if (data?.size === session.s) item = data;
    else throw new HttpError(409, 'conflict', 'Tente de novo');
  }
  if (!item) throw await graphError(res, 'Falha ao enviar o arquivo');

  mem.list = null;
  return json({ done: true, id: item.id ?? null });
}

/** Pedaço de um arquivo grande: PUT na URL da sessão (pré-autenticada, sem header Authorization). */
async function sessionChunk(env, session, body, start, end, total) {
  const headers = { 'Content-Range': `bytes ${start}-${end}/${total}` };
  const withToken = async () => ({ ...headers, Authorization: `Bearer ${await getAccessToken(env)}` });

  let res = await fetch(session.u, { method: 'PUT', headers: mem.uploadNeedsToken ? await withToken() : headers, body });
  if (res.status === 401 && !mem.uploadNeedsToken) {
    console.error('chunk 401 sem token', JSON.stringify(await describeFailure(res, session.u)));
    // Diagnóstico: tenta uma vez com o token. Se passar, as próximas já vão com ele.
    res = await fetch(session.u, { method: 'PUT', headers: await withToken(), body });
    if (res.ok || res.status === 202) {
      mem.uploadNeedsToken = true;
      console.log('chunk: a URL da sessão aceitou com token');
    }
  }

  if (res.status === 200 || res.status === 201) {
    const item = await res.json().catch(() => ({}));
    mem.list = null;
    return json({ done: true, id: item.id ?? null });
  }
  if (res.status === 202) return json({ done: false, next: nextOffset(await res.json().catch(() => null), end + 1) });
  if (res.status === 416) {
    // Pedaço repetido (ex.: a resposta anterior se perdeu): pergunta onde o OneDrive parou.
    const status = await fetch(session.u);
    const next = status.ok ? nextOffset(await status.json().catch(() => null), total) : total;
    return json({ done: next >= total, next });
  }
  if (res.status === 404 || res.status === 410) throw new HttpError(410, 'expired', 'O envio expirou, começando de novo');

  console.error('chunk', JSON.stringify(await describeFailure(res, session.u)));
  throw new HttpError(502, 'upload_failed', 'Falha ao enviar um pedaço do arquivo');
}

/** Para o log: a URL da sessão sem o tempauth, e se o fetch a reescreve (ex.: ' vira %27). */
function describeUploadUrl(raw) {
  const hide = (value) => value.replace(/([?&]tempauth=)[^&]+/i, '$1(oculto)');
  let sent = raw;
  try {
    sent = new URL(raw).href;
  } catch {}
  return sent === raw ? { url: hide(raw), rewritten: false } : { url: hide(raw), rewritten: true, sent: hide(sent) };
}

async function describeFailure(res, uploadUrl) {
  const headers = {};
  for (const name of ['www-authenticate', 'request-id', 'sprequestguid', 'x-msedge-ref', 'content-type']) {
    const value = res.headers.get(name);
    if (value) headers[name] = value.slice(0, 300);
  }
  return {
    status: res.status,
    redirected: res.redirected ? new URL(res.url).host : false,
    ...describeUploadUrl(uploadUrl),
    headers,
    body: (await res.text().catch(() => '')).slice(0, 500),
  };
}

function nextOffset(data, fallback) {
  const range = data?.nextExpectedRanges?.[0];
  return range ? Number(range.split('-')[0]) : fallback;
}

function extensionFor(fileName, mime) {
  if (mime && !/^(image|video)\//.test(mime) && mime !== 'application/octet-stream') return null;
  const fromName = fileName.match(/\.([a-z0-9]{1,5})$/i)?.[1]?.toLowerCase();
  if (fromName && (IMAGE_EXT.has(fromName) || VIDEO_EXT.has(fromName))) return fromName;
  return MIME_EXT[mime] ?? null;
}

/** Nome do convidado seguro para nome de arquivo (sem _ porque ele separa as partes). */
function cleanAuthor(value) {
  return String(value ?? '')
    .normalize('NFC')
    .replace(/[\\/:*?"<>|_#%&{}~\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40)
    .trim();
}

function stamp(env) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: env.TIMEZONE || 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(new Date())
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}_${parts.hour}-${parts.minute}-${parts.second}`;
}

function randomId() {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from(crypto.getRandomValues(new Uint8Array(6)), (byte) => alphabet[byte % 36]).join('');
}

/* ==========================================================================
   Exclusão
   ========================================================================== */

async function deleteItem(request, env) {
  const { name, token } = await readJson(request);
  if (typeof name !== 'string' || typeof token !== 'string' || !name || name.length > 300 || /[\\/]/.test(name)) {
    throw new HttpError(400, 'bad_request', 'Pedido inválido');
  }
  if (!(await safeEqual(token, await deleteToken(env, name)))) {
    throw new HttpError(403, 'forbidden', 'Você só pode apagar o que enviou');
  }

  const folder = await getFolder(env);
  const res = await graph(
    env,
    `/drives/${folder.driveId}/items/${encodeURIComponent(folder.id)}:/${encodeURIComponent(name)}:`,
    { method: 'DELETE' },
  );
  if (!res.ok && res.status !== 404) throw await graphError(res, 'Não foi possível apagar');

  if (mem.list) {
    mem.list = mem.list.filter((item) => item.name !== name);
    mem.byId = new Map(mem.list.map((item) => [item.id, item]));
  }
  return json({ ok: true });
}

/* ==========================================================================
   Miniaturas e arquivos originais (redirecionamentos)
   ========================================================================== */

/**
 * Miniatura pela própria API do Graph com "Prefer: noRedirect": os bytes vêm direto, com o token
 * normal. O redirecionamento padrão leva a uma URL pré-autenticada que a Microsoft recusa às vezes.
 */
async function thumb(env, id, url) {
  await findItem(env, id);
  const big = url.searchParams.get('size') === 'big';
  const version = url.searchParams.get('v') ?? '';
  const key = `${big ? 'big' : 'small'}:${id}:${version}`;

  const hit = mem.thumbs.get(key);
  if (hit) {
    mem.thumbs.delete(key);
    mem.thumbs.set(key, hit);
    return imageResponse(hit, version);
  }
  if ((mem.thumbFail.get(key) ?? 0) > Date.now()) throw new HttpError(404, 'no_thumb', 'Miniatura indisponível');

  const folder = await getFolder(env);
  const base = `/drives/${folder.driveId}/items/${encodeURIComponent(id)}/thumbnails/0`;
  let busy = false;
  for (const size of THUMB_SIZES[big ? 'big' : 'small']) {
    try {
      const res = await graph(env, `${base}/${size}/content`, {
        redirect: 'manual',
        headers: { Prefer: 'noRedirect' },
        signal: AbortSignal.timeout(THUMB_TIMEOUT),
      });
      const type = res.headers.get('Content-Type') ?? '';
      if (res.ok && type.startsWith('image/')) {
        const entry = { body: await res.arrayBuffer(), type };
        rememberThumb(key, entry);
        return imageResponse(entry, version);
      }
      await res.body?.cancel();
    } catch (err) {
      if (err instanceof HttpError && err.code === 'busy') busy = true;
    }
  }
  if (busy) throw new HttpError(503, 'busy', 'Muita gente ao mesmo tempo, tente de novo em instantes');
  if (mem.thumbFail.size > 5000) mem.thumbFail.clear();
  mem.thumbFail.set(key, Date.now() + 60_000);
  throw new HttpError(404, 'no_thumb', 'Miniatura indisponível');
}

function rememberThumb(key, entry) {
  const bytes = entry.body.byteLength;
  if (bytes > THUMB_CACHE_BYTES / 8) return;
  mem.thumbs.set(key, entry);
  mem.thumbBytes += bytes;
  for (const [oldKey, old] of mem.thumbs) {
    if (mem.thumbBytes <= THUMB_CACHE_BYTES) break;
    mem.thumbs.delete(oldKey);
    mem.thumbBytes -= old.body.byteLength;
  }
}

function imageResponse(entry, version) {
  // Cópia: o buffer do cache é reaproveitado entre requisições.
  return new Response(entry.body.slice(0), {
    headers: {
      'Content-Type': entry.type,
      // Com a versão na URL, o conteúdo nunca muda: o navegador pode guardar para sempre.
      'Cache-Control': version ? 'public, max-age=31536000, immutable' : 'public, max-age=3600',
    },
  });
}

/**
 * Original: com ?download=1 vem direto pelo Graph ("Prefer: noRedirect"), como anexo. Sem isso
 * (vídeo tocando), redireciona para a URL de download, que aceita Range para avançar o vídeo.
 */
async function media(env, id, request, url) {
  const item = await findItem(env, id);
  const folder = await getFolder(env);
  const path = `/drives/${folder.driveId}/items/${encodeURIComponent(id)}/content`;

  if (url.searchParams.has('download')) {
    const res = await graph(env, path, { redirect: 'manual', headers: { Prefer: 'noRedirect' } });
    if (res.ok) {
      const headers = new Headers({
        'Content-Type': res.headers.get('Content-Type') ?? 'application/octet-stream',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(item.name)}`,
        'Cache-Control': 'private, max-age=3600',
      });
      const length = res.headers.get('Content-Length');
      if (length) headers.set('Content-Length', length);
      return new Response(res.body, { headers });
    }
    await res.body?.cancel();
  }
  return redirectFor(env, `media:${id}`, [path], request.headers.get('Range'));
}

/** O Graph responde 302 para uma URL temporária e pré-autenticada: repassa o redirecionamento. */
async function redirectFor(env, key, paths, range) {
  const hit = mem.redirects.get(key);
  if (hit && hit.exp > Date.now()) return found(hit.url);

  for (const path of paths) {
    const res = await graph(env, path, { redirect: 'manual', headers: range ? { Range: range } : {} });
    const location = res.status >= 300 && res.status < 400 ? res.headers.get('Location') : null;
    if (location) {
      if (mem.redirects.size > 5000) mem.redirects.clear();
      mem.redirects.set(key, { url: location, exp: Date.now() + REDIRECT_TTL });
      return found(location);
    }
    if (res.ok) {
      // Sem redirecionamento: entrega o conteúdo pelo próprio Worker.
      const headers = new Headers({ 'Cache-Control': 'private, max-age=3600' });
      for (const name of ['Content-Type', 'Content-Length', 'Content-Range', 'Accept-Ranges']) {
        const value = res.headers.get(name);
        if (value) headers.set(name, value);
      }
      return new Response(res.body, { status: res.status, headers });
    }
  }
  throw new HttpError(404, 'not_found', 'Arquivo não encontrado');
}

function found(location) {
  return new Response(null, { status: 302, headers: { Location: location, 'Cache-Control': 'private, max-age=600' } });
}

/* ==========================================================================
   Criptografia: token de exclusão (HMAC) e sessão de envio (AES-GCM)
   ========================================================================== */

const encoder = new TextEncoder();

async function keys(env) {
  if (mem.keys?.secret === env.APP_SECRET) return mem.keys;
  if (!env.APP_SECRET) throw new HttpError(500, 'no_secret', 'Defina o segredo APP_SECRET');
  const hmac = await crypto.subtle.importKey('raw', encoder.encode(env.APP_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const aesRaw = await crypto.subtle.digest('SHA-256', encoder.encode(`aes:${env.APP_SECRET}`));
  const aes = await crypto.subtle.importKey('raw', aesRaw, 'AES-GCM', false, ['encrypt', 'decrypt']);
  mem.keys = { secret: env.APP_SECRET, hmac, aes };
  return mem.keys;
}

async function sign(env, message) {
  const { hmac } = await keys(env);
  return toBase64Url(await crypto.subtle.sign('HMAC', hmac, encoder.encode(message)));
}

function deleteToken(env, name) {
  return sign(env, `delete:${name}`);
}

async function seal(env, payload) {
  const { aes } = await keys(env);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aes, encoder.encode(JSON.stringify(payload)));
  const out = new Uint8Array(iv.length + data.byteLength);
  out.set(iv);
  out.set(new Uint8Array(data), iv.length);
  return toBase64Url(out);
}

async function unseal(env, token) {
  const { aes } = await keys(env);
  try {
    const bytes = fromBase64Url(token);
    const data = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(0, 12) }, aes, bytes.slice(12));
    return JSON.parse(new TextDecoder().decode(data));
  } catch {
    throw new HttpError(400, 'bad_session', 'Envio inválido, tente de novo');
  }
}

/** Comparação em tempo constante (compara os hashes, então o tamanho não vaza). */
async function safeEqual(a, b) {
  const [x, y] = await Promise.all([a, b].map((value) => crypto.subtle.digest('SHA-256', encoder.encode(value))));
  const ua = new Uint8Array(x);
  const ub = new Uint8Array(y);
  let diff = 0;
  for (let i = 0; i < ua.length; i++) diff |= ua[i] ^ ub[i];
  return diff === 0;
}

function toBase64Url(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function fromBase64Url(value) {
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

/* ==========================================================================
   Utilitários HTTP
   ========================================================================== */

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin');
  const headers = { Vary: 'Origin' };
  if (origin && isAllowedOrigin(origin, env)) {
    Object.assign(headers, {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Session, X-Range',
      'Access-Control-Max-Age': '86400',
    });
  }
  return headers;
}

/** ALLOWED_ORIGINS: lista separada por vírgula; "http://localhost:*" aceita qualquer porta. */
function isAllowedOrigin(origin, env) {
  return (env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .some((entry) =>
      entry.endsWith(':*') ? origin.startsWith(entry.slice(0, -1)) && /^\d+$/.test(origin.slice(entry.length - 1)) : entry === origin,
    );
}

async function readJson(request) {
  const text = await request.text();
  if (text.length > 10_000) throw new HttpError(413, 'too_big', 'Pedido grande demais');
  try {
    const data = JSON.parse(text);
    if (data && typeof data === 'object') return data;
  } catch {}
  throw new HttpError(400, 'bad_json', 'Pedido inválido');
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

function page(title, body, status = 200) {
  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
<body style="font:16px/1.5 system-ui,sans-serif;max-width:560px;margin:15vh auto;padding:0 16px;color:#26273a;background:#f7f3ea">
<h1 style="font-weight:600">${escapeHtml(title)}</h1><p>${body}</p></body>`;
  return new Response(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

