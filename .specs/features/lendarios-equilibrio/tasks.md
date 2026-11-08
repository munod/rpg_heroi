# Tasks: Lendários e equilíbrio final (Leva D de `gestao-estrategica`)

Legenda: `[P]` paralelo · Status: ⬜ pendente / ✅ feito / ❌ falhou

| # | Task | Dep | Status |
|---|------|-----|--------|
| T1 | Spec + tasks (este diretório) | — | ✅ |
| T2 | `js/itens.js`: raridade 4 (PESO_RAR/CORES/QTD_AFIXOS), `LEGENDARIOS` (6, 2/tema), `geraItem` lendário (1 neg forçado + 1 pos com smart-loot), chefe 15%, `★` em `linha`, `temEfeito/multDano/multOuro/pctVamp` | T1 | ✅ |
| T3 | `js/personagem.js`: `normalizaItem` com `rar ≤ 4` + sanitiza `efeito` | T2 | ✅ |
| T4 | `js/batalha.js`: hooks (vampiro em `stat`, fúria no refresh de stats, ouro em `mataInimigo`, 2ª vida em `danoHeroi`, reset em `proximaOnda`, cura fere em `skillsPeriodicas`), `★` no popup, `info().dano` | T2 | ✅ |
| T5 | Testes: fumaça seção 26 | T2-T4 | ✅ |
| T6 | `ritmo.js 35` na faixa + gate `todos.js` (3×) | T5 | ✅ |
| T7 | Docs: CHANGELOG, STATE/ROADMAP (plano D ✅), specs, AGENTS | T6 | ✅ |
| T8 | Commit `feat(lendarios): …` — push + **release 0.2.0 só com aval** | T7 | ⬜ |

## Verificação por task

- **T2**: ES5; drops rar 1-3 idênticos aos atuais (nada de regressão no
  drop comum); lendário sempre com `efeito` da tabela do tema; exports
  antigos intactos.
- **T4**: hooks não mudam comportamento sem item equipado (ritmo é a
  prova); `2ª vida` zera em `proximaOnda` (inclusive troca de mapa).
- **T6**: se algum alvo sair da faixa, documentar a correção em STATE
  antes de ajustar (ordem: peso lendário → bônus → nunca a curva).
- **T8**: checklist do `VERSIONING.md` (gate → changelog →
  `chore(release)` → tag → push com aval → `gh release` → Pages).
