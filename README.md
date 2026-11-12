# dantonton.github.io

Site pessoal de Dânton Moura, publicado no GitHub Pages a partir da raiz da branch `master`.

Feito em Angular 22 (standalone, zoneless e signals), sem bibliotecas de UI. Animações em CSS puro.

## Ambiente

```bash
nvm use            # Node 24 LTS (definido em .nvmrc)
npm install
```

## Desenvolvimento

```bash
npm start          # http://localhost:4200
```

Links diretos para cada estado: `#perfil`, `#servicos/2`, `#portfolio/3`.

## Publicação

```bash
npm run deploy     # ng build + copia dist/dantonton/browser para a raiz
git add -A && git commit -m "..." && git push
```

O `scripts/deploy.mjs` apaga da raiz apenas os artefatos de build anteriores (listados em
`.deploy-manifest.json`) e nunca toca em `src/`, `public/` ou nos arquivos de configuração.

## Estrutura

```
src/app/
  app.*                 pílula, abas, estado global, clique fora, Esc
  data/content.ts       todos os textos (perfil, skills, serviços, portfólio)
  profile-panel/        conteúdo do Perfil
  services-panel/       "gotas" de Serviços (acordeão)
  portfolio-carousel/   carrossel com scroll-snap, arrastar, roda e teclado
  lightbox/             imagem em tela cheia
src/styles.scss         tokens (cores, fontes, layout) e base
public/assets/          imagens (WebP)
```

Todo o layout deriva das variáveis em `src/styles.scss` (`--pill-w`, `--circle`, `--tab-w`,
`--panel-h`…), ajustadas por media queries até 360px de largura.
