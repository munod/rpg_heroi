# Spec: Deploy no GitHub Pages (backfill)

Status: **Entregue** — v0.1.0 · Commits: `e4c49de`

## Objetivo
Publicar o jogo automaticamente em `https://munod.github.io/rpg_heroi/` sem
nenhum passo de build — o projeto é 100% estático (`index.html` + `style.css`
+ `js/`), então o deploy é só subir a raiz a cada push na `main`.

## Requisitos
- **R-DEP-1**: Workflow `.github/workflows/deploy.yml` disparado a cada push
  na `main` (ou manualmente por `workflow_dispatch` na aba Actions) — commit
  `e4c49de`.
- **R-DEP-2**: Publicação sem build: `actions/checkout` →
  `actions/configure-pages` → `actions/upload-pages-artifact` com `path: .`
  (raiz inteira) → `actions/deploy-pages` — commit `e4c49de`.
- **R-DEP-3**: Permissões mínimas `contents: read`, `pages: write`,
  `id-token: write` e `concurrency` no grupo `pages` com
  `cancel-in-progress: true` (deploys concorrentes cancelam, o mais novo
  vence) — commit `e4c49de`.
- **R-DEP-4**: Pages habilitado com `build_type=workflow`; o job expõe a URL
  de saída via `steps.deployment.outputs.page_url` e o site fica em
  `https://munod.github.io/rpg_heroi/` — commit `e4c49de`.

## Verificação
- Gate `node testes/todos.js` (193 asserções no total) segue sendo a
  verificação do projeto: o workflow **não** executa teste algum — ele só
  sobe a raiz (`path: .`) como artefato e publica.
- Este é o único commit da leva **sem teste automatizado próprio**: ele
  altera apenas `.github/workflows/deploy.yml` (37 linhas, 1 arquivo). A
  validação é o próprio deploy (job Actions verde + site no ar) e a checagem
  estática é o YAML em `.github/workflows/deploy.yml`.
- Observação: `README.md` e `AGENTS.md` **não** citam o Pages nem a URL do
  site (o texto vive só no cabeçalho do `deploy.yml`) — ver inconsistências
  relatadas no relatório de backfill.
