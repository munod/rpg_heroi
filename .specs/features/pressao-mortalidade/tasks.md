# Tasks: Pressão de mortalidade — mortes como desafio

Status: ⬜ pendente / ✅ feito · `[P]` paralelo

| # | Task | Dep | Status |
|---|------|-----|--------|
| T1 | Spec `pressao-mortalidade` | — | ✅ |
| T2 | `ESC_DMG 0,037 → 0,06` + `RITMO_TAG` (JSONs de A/B paralelo) | T1 | ✅ (`2168fe3` · fumaça verde) |
| T3 | **Guarda anti-estol** (sonda da parede @0,06) | T2 | ✅ **FALHOU p/ 0,06 no def** — estolou (1.324 mortes) |
| T4 | **Calibragem** (escada de sondas) | T3 | ✅ **Escada completa**: def falha em ≥0,04 (sem folga) · skill vence tudo (0,055=1 morte · 0,06=9 mortes) → decisão do mantenedor: **guarda = skill** (emenda R-PM-3) |
| T5 | A/B 4 seeds × 600min por via | T4 | ✅ baseline 0,037 4/4 · 0,06 4/4 **reprovado** (s4 espiral 146 mortes, duração +30%) · **0,055 4/4 aprovado** (−0,4%, 3 mortes vs 0) |
| T6 | Sim completa do valor escolhido (guarda de estol final) | T5 | ✅ **skill@0,055 venceu: 59,1h · 2 mortes · nv 9170** (baseline 57,5h/0 = +2,8% ≤ +15% ✓ · sem estol · mortes às 90min, mapa 3 — zona perigosa) |
| T7 | Docs (CHANGELOG · AGENTS valor · STATE · ROADMAP) + gate final + push (aval do mantenedor) | T6 | ✅ docs completas (spec/tasks/AGENTS/CHANGELOG/STATE/ROADMAP + fix de unidade na projeção do `ritmo.js`) · ⬜ gate + push |

## Verificação por task

- **T3/T4**: `sonda-fim` = ~16min por valor — o funil barato
  substitui a sim de 6h. Worktrees por valor (`dmg0XX`) p/ não
  atropelar; **filtro real da calibragem = a parede** (o produto do
  cliff não pegou — registrado na spec).
- **T5**: ≥4 seeds por via; `RITMO_TAG` isola os JSONs; baseline no
  worktree `55383ad` (pré-constante). **Achado**: o `RITMO_SKILL`
  só diverge do def acima de ATRIB_LIM (nv ~3500) — os shorts de
  600min medem o mesmo early build nas duas vias (isolam o ESC_DMG);
  a divergência dos poços e a mortalidade do gerenciado aparecem nos
  full runs (T6) + na parede.
- **T6**: critério de estol da emenda R-EDP-4 (progresso parado);
  comparação de mortes/duração vs o baseline completo (T9).
- **T7**: ES5 · `node --check` · gate `todos.js`.
