# Tasks: Economia com ouro (Leva B de `gestao-estrategica`)

Legenda: `[P]` paralelo · Status: ⬜ pendente / ✅ feito / ❌ falhou

| # | Task | Dep | Status |
|---|------|-----|--------|
| T1 | Spec + tasks (este diretório) | — | ✅ |
| T2 | `js/itens.js`: `APR/MAX_UP`, `valor/precoVenda/precoSucata`, `vender/sucatear`, sucata automática em `guardar`, `custoAprim/aprimorar`, `custoReroll/reroll` (nome via `base`), `pontuarEfet`, `geraItem` grava `base/escala` | T1 | ✅ |
| T3 | `js/personagem.js`: `p.ouro` em `novo/normalizar`, campos `up/rerolls/escala/base` em `normalizaItem`, `APR` espelhado em `bonusEquipamento` | T2 | ✅ |
| T4 | `js/batalha.js`: ouro por abate em `mataInimigo` (escala ×forca ×onda, chefe ×8) | T2 | ✅ |
| T5 | `js/gestao.js`: linha `Ouro · Bolsa`, legenda, linhas `principal|V|S`, botões `A+`/`R+` nos cabeçalhos, toasts | T2-T4 | ✅ |
| T6 | Testes: fumaça — ouro, venda/sucata/piso, bolsa cheia, aprimoramento no status, re-roll (RNG stubado), migração, UI (V, A+, linha Ouro) | T2-T5 | ✅ |
| T7 | `ritmo.js 35` na faixa + gate `todos.js` (3×) | T6 | ✅ |
| T8 | Docs: CHANGELOG `[Unreleased]`, STATE/ROADMAP, specs (umbrella + AGENTS) | T7 | ✅ |
| T9 | Commit `feat(economia): …` — **push só com aval** | T8 | ⬜ |

## Verificação por task

- **T2**: ES5; exports antigos intactos; `guardar` continua retornando
  verdadeiro/falso-compatível; re-roll preserva qtd de afixos, teto de 1
  neg e prefixo/sufixo únicos.
- **T3**: save antigo normaliza idêntico (`ouro: 0`, sem campos de item);
  `status` com item `up>0` sobe exatamente `round(bonus × (1+0,08×up))`
  por chave.
- **T6**: re-roll com `Math.random` stubado é reprodutível; testes
  estatísticos só com folga larga.
- **T7**: faixas alvo iguais à Leva A (ouro não pode mudar o baseline).
