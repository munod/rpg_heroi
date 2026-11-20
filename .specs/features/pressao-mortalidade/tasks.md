# Tasks: Pressão de mortalidade — mortes como desafio

Status: ⬜ pendente / ✅ feito · `[P]` paralelo

| # | Task | Dep | Status |
|---|------|-----|--------|
| T1 | Spec `pressao-mortalidade` | — | ✅ |
| T2 | `ESC_DMG 0,037 → 0,06` + `RITMO_TAG` (JSONs de A/B paralelo) | T1 | ✅ (`2168fe3` · fumaça verde) |
| T3 | **Guarda anti-estol** (sonda da parede @0,06) | T2 | ✅ **FALHOU p/ 0,06** — estolou (1.324 mortes, onda 1 presa) → calibragem |
| T4 | **Calibragem** (escada da spec): sondas @0,055 e @0,05 (worktrees) | T3 | ⏳ em background — escolher o maior valor que VENCE a parede |
| T5 | A/B 4 seeds × 600min: baseline 0,037 (s1-4) vs valor escolhido (s1-4) — mortes/dnv/atraso/projeção | T4 | ⏳ baseline s1 ✓ (guardado) + s2-4 em background · 0,06 s1-4 em background (dose-resposta) |
| T6 | Sim completa do valor escolhido (guarda de estol final + duração na faixa ≤+15% candidato) | T5 | ⬜ |
| T7 | Docs (CHANGELOG · AGENTS valor · STATE · ROADMAP) + gate final + push (aval do mantenedor) | T6 | ⬜ |

## Verificação por task

- **T3/T4**: `sonda-fim` = 16min por valor (parede do mapa 100) — o
  funil barato substitui a sim de 6h; worktree por valor para não
  atropelar os loops que ainda leem o disco do `main`.
- **T5**: ≥4 seeds por via (regra do AGENTS); `RITMO_TAG` isola os
  JSONs; baseline roda no worktree `55383ad` (pré-constante).
- **T6**: critério de estol da emenda R-EDP-4 (progresso parado).
- **T7**: ES5 · `node --check` · gate `todos.js`.
