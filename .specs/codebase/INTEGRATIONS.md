# Integrações

Nenhuma integração externa em runtime — o jogo é 100% client-side.

- **GitHub Pages** (único deploy): `.github/workflows/deploy.yml` — gatilho
  `push` na `main` (mais `workflow_dispatch` manual) → `checkout` →
  `configure-pages` → `upload-pages-artifact` (path `.` = raiz inteira:
  `index.html`, `style.css`, `js/`; sem build) → `deploy-pages`. Concorrência
  `group: pages` com cancelamento do mais antigo. Site publicado em
  https://munod.github.io/rpg_heroi/
- **Git**: remote `origin` = `git@github.com:munod/rpg_heroi.git`
  (SSH), branch `main`; identidade de commit só local no clone
  (`Munod <thiagodss@hotmail.com>`). Histórico: 21 commits.
- **GitHub API / `gh` CLI**: usados só para **releases** — fluxo é tag
  SemVer 0.x + `gh release create` com notas do `CHANGELOG.md`
  (primeira tag: `v0.1.0`, nesta leva; checklist em
  `.specs/project/VERSIONING.md`).
- **`localStorage`** (persistência no navegador, sem backend):
  `rpg_personagens_v1`, `rpg_ultimo_id`, `rpg_estado_v1` — chaves
  versionadas; mudou o formato do save, sobe o sufixo `_vN` e/ou normaliza
  na leitura (`Personagem.normalizar`). Export/import de JSON manual pela
  tela de seleção.
- **Fora do escopo**: não há API, CDN, analytics, WebSocket, banco de dados
  ou qualquer chamada de rede — além do próprio Pages, nada externo.
