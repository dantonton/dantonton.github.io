// Publica o build na raiz do repositório (GitHub Pages servindo a branch master).
// Uso: npm run deploy  (roda `ng build` antes deste script)
import { existsSync } from 'node:fs';
import { cp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const dist = join(root, 'dist', 'dantonton', 'browser');
const manifestPath = join(root, '.deploy-manifest.json');

/** Arquivos de builds anteriores (inclui os do Angular 8) que podem ser apagados. */
const BUILD_ARTIFACT = [
  /^(main|polyfills|runtime|styles|chunk|scripts|vendor)[-.][\w.-]+\.(js|css|map)$/,
  /^3rdpartylicenses\.txt$/,
];

/** Nunca apagar: fontes e configuração do projeto. */
const PROTECTED = new Set([
  '.git', '.github', '.vscode', '.angular', 'node_modules', 'dist', 'src', 'public', 'scripts',
  'package.json', 'package-lock.json', 'angular.json', 'tsconfig.json', 'tsconfig.app.json',
  'README.md', '.gitignore', '.editorconfig', '.prettierrc', '.nvmrc', '.deploy-manifest.json',
]);

if (!existsSync(join(dist, 'index.html'))) {
  console.error(`Build não encontrado em ${dist}. Rode "ng build" primeiro.`);
  process.exit(1);
}

const built = (await readdir(dist)).sort();
const previous = existsSync(manifestPath) ? JSON.parse(await readFile(manifestPath, 'utf8')) : [];

const toRemove = new Set([...previous, ...built]);
for (const name of await readdir(root)) {
  if (BUILD_ARTIFACT.some((pattern) => pattern.test(name))) toRemove.add(name);
}

for (const name of toRemove) {
  if (PROTECTED.has(name)) {
    console.error(`Recusado: "${name}" é um arquivo do projeto e não pode ser sobrescrito pelo build.`);
    process.exit(1);
  }
}

for (const name of toRemove) await rm(join(root, name), { recursive: true, force: true });
for (const name of built) await cp(join(dist, name), join(root, name), { recursive: true });

await writeFile(join(root, '.nojekyll'), '');
await writeFile(manifestPath, JSON.stringify(built, null, 2) + '\n');

console.log(`Publicado na raiz: ${built.join(', ')}`);
console.log(`Removidos: ${[...toRemove].filter((name) => !built.includes(name)).join(', ') || '(nada)'}`);
