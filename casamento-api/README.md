# casamento-api

Backend do álbum do casamento (`https://dantonton.github.io/casamento/`). É um Cloudflare Worker
gratuito que guarda o login da Microsoft do dono da pasta e faz a ponte com o OneDrive pelo
Microsoft Graph. Os convidados só falam com o Worker, nunca com a Microsoft.

```
convidado ─► casamento/index.html ─► Worker (este) ─► Microsoft Graph ─► pasta do OneDrive
```

- **Listagem:** fotos e vídeos da pasta, do mais novo para o mais antigo. Arquivos que vocês
  colocarem direto no OneDrive também aparecem.
- **Envio:** em pedaços de ~8 MB, até 4 GB por arquivo. O nome fica
  `AAAA-MM-DD_HH-MM-SS_Nome do convidado_xxxxxx.ext`.
- **Exclusão:** cada envio recebe um token assinado (HMAC com `APP_SECRET`), que o navegador do
  convidado guarda. Sem esse token o Worker recusa a exclusão, então cada um só apaga o que enviou.

## Configuração (uma vez só)

**Todos os comandos rodam dentro de `casamento-api/`**, com o Node do projeto (`nvm use`). Na raiz do
repositório, o `wrangler` usa outra configuração e os comandos vão para outro worker.

### 1. Cloudflare

Crie uma conta grátis em <https://dash.cloudflare.com/sign-up> e rode:

```bash
npx wrangler@4.152.0 login
npx wrangler@4.152.0 kv namespace create ALBUM_KV   # copie o "id" para o wrangler.jsonc
npx wrangler@4.152.0 deploy                          # mostra a URL: https://casamento-api.<sub>.workers.dev
```

Anote a URL do Worker. Ela entra no passo 2 e no passo 5.

### 2. App da Microsoft (Azure / Entra)

1. Uma conta pessoal (Hotmail/Outlook) sozinha não consegue entrar no Entra: aparece o erro
   `AADSTS16000 … does not exist in tenant 'Microsoft Services'`. Antes, crie o seu próprio
   diretório:
   - Numa **janela anônima**, abra <https://azure.microsoft.com/pt-br/free/> e crie a conta
     gratuita com a **conta Microsoft dona da pasta**. A Microsoft pede telefone e cartão só para
     verificação. Este projeto não usa nenhum recurso pago do Azure.
   - Ainda em janela anônima, abra <https://portal.azure.com>. Se cair em "Microsoft Services",
     clique no seu perfil (canto superior direito) → *Alternar diretório* → *Diretório Padrão*.
   - Abra *Microsoft Entra ID → Registros de aplicativo → Novo registro*.
2. Preencha o registro:
   - **Nome:** Álbum do casamento.
   - **Tipos de conta:** "Somente contas pessoais da Microsoft" (ou "Contas em qualquer diretório
     organizacional e contas pessoais da Microsoft").
   - **URI de redirecionamento:** plataforma *Web*, valor
     `https://casamento-api.<sub>.workers.dev/auth/callback`.
3. Se a opção de contas pessoais não aparecer, crie mesmo assim e depois, em *Manifesto*, troque
   `"signInAudience"` para `"AzureADandPersonalMicrosoftAccount"` e
   `"requestedAccessTokenVersion"` para `2`.
4. Copie o **ID do aplicativo (cliente)** para `MS_CLIENT_ID` no `wrangler.jsonc`.
5. Em *Certificados e segredos → Novo segredo do cliente*, copie o **Valor** (não o ID).
6. Em *Permissões de API → Adicionar → Microsoft Graph → Permissões delegadas*, adicione
   `Files.ReadWrite.All`, `offline_access` e `User.Read`.

### 3. Segredos

```bash
npx wrangler@4.152.0 secret put MS_CLIENT_SECRET   # o Valor do passo 2.5
npx wrangler@4.152.0 secret put SHARE_URL          # o link 1drv.ms da pasta
npx wrangler@4.152.0 secret put APP_SECRET         # texto aleatório longo, ex.: openssl rand -base64 32
npx wrangler@4.152.0 secret put ADMIN_KEY          # outro texto aleatório
npx wrangler@4.152.0 deploy                         # publica com o MS_CLIENT_ID preenchido
```

Se você já tem esses quatro valores no `.dev.vars` (usado para rodar localmente), dá para mandar
todos de uma vez: `npx wrangler@4.152.0 secret bulk .dev.vars`.

> **Não troque o `APP_SECRET` depois que os convidados começarem a enviar.** Isso invalida os
> tokens e ninguém mais consegue apagar o que enviou.

### 4. Conectar a conta

Abra `https://casamento-api.<sub>.workers.dev/auth/start?key=<ADMIN_KEY>` e entre com a conta dona
da pasta. No fim aparece **"Pronto ✓ Pasta conectada: …"**.

### 5. Página

Em `casamento/index.html`:

- troque `API_BASE` pela URL do Worker;
- troque os nomes e a data (procure por `EDITE`).

Depois faça commit e push. O link para o QR code é `https://dantonton.github.io/casamento/`.

Para testar: envie uma foto pela página, confira se ela aparece na pasta do OneDrive e depois
apague pela própria página.

## Manutenção

| Situação | O que fazer |
|---|---|
| A página diz que não conseguiu carregar, ou `/api/items` responde `auth_failed` | O login venceu (cerca de 90 dias sem uso, ou troca de senha). Repita o passo 4. |
| O segredo do cliente venceu (no máximo 24 meses) | Crie outro no Entra e rode `secret put MS_CLIENT_SECRET`. |
| Tirar uma foto do álbum | Apague direto na pasta do OneDrive. Em até um minuto ela some da página. |
| Ver erros | `npx wrangler@4.152.0 tail` |

### Limites do plano gratuito

São 100 mil requisições por dia. Cada página aberta atualiza o álbum a cada 60 s, e cada ~8 MB
enviados contam como uma requisição. Por exemplo, 150 convidados com a página aberta por 4 horas
dão cerca de 36 mil requisições. O KV só é gravado quando o token é renovado, mais ou menos uma
vez por hora.

### Vídeos

Vídeos `.mov` (HEVC) do iPhone podem não tocar em alguns navegadores, como o Chrome no Android e
no Windows. Nesses casos a página mostra o aviso e o botão **Baixar**.

## Teste local

```bash
npx wrangler@4.152.0 dev --port 8787
```

Sirva a pasta `casamento/` em `localhost` e abra `/casamento/?api=http://localhost:8787`. O `?api=`
só funciona em localhost. As variáveis `GRAPH_BASE` e `LOGIN_BASE` permitem apontar o Worker para
um Graph falso nos testes.
