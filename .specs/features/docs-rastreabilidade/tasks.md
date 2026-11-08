# Tasks: Documentação, versionamento e rastreabilidade

Legenda: `[P]` paralelo · Status: ⬜ pendente / ✅ feito / ❌ falhou

| # | Task | Dep | Status |
|---|------|-----|--------|
| T1 | [P] `.specs/project/`: PROJECT.md, ROADMAP.md, STATE.md, VERSIONING.md | — | ✅ |
| T2 | [P] `.specs/codebase/`: STACK, ARCHITECTURE, CONVENTIONS, STRUCTURE, TESTING, INTEGRATIONS, CONCERNS | — | ✅ |
| T3 | [P] `.specs/features/`: 10 specs backfill (requisito→commit) | — | ✅ |
| T4 | [P] `CHANGELOG.md` raiz: Keep a Changelog, backfill 0.1.0 (21 commits) | — | ✅ |
| T5 | `AGENTS.md` + `README.md`: referenciar `.specs/`, CHANGELOG, Conventional Commits, fluxo de release | T1-T4 | ✅ |
| T6 | Verificação: `node testes/todos.js` + consistência (todos os caminhos citados existem, contagens do README) | T1-T5 | ✅ |
| T7 | Commit `docs(specs): …` (Conventional Commits) | T6 | ✅ |
| T8 | Push (3 commits de IA + docs) · tag `v0.1.0` · `gh release create` com notas do CHANGELOG | T7 | ✅ |

## Verificação por task

- **T1-T4**: arquivos existem, em pt-BR, sem placeholders; T3: cada spec
  tem IDs de requisito com commit associado e os 21 commits do histórico
  aparecem em CHANGELOG ou spec.
- **T5**: links/âncoras apontam para arquivos reais; nada do conteúdo
  técnico antigo do README/AGENTS foi removido.
- **T6**: gate verde (193 asserções) — docs não podem quebrar o jogo.
- **T8**: `git tag` + `gh release view v0.1.0` OK; Pages re-deploya sozinho.
