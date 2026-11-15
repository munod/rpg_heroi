# Tasks: Ranking antitrampa

Status: ⬜ pendente / ✅ feito · `[P]` paralelo

| # | Task | Dep | Status |
|---|------|-----|--------|
| T1 | Spec + tasks | — | ✅ |
| T2 | `.specs/features/ranking/regras-firestore.rules`: paridade de score + teto por tempo + `at` fresco + `nivel ≤ 9500` | T1 | ✅ |
| T3 | `fumaca.js`: conf da identidade do score (trava de deriva vs `scoreDe`) | T2 | ✅ |
| T4 | `testes/regras.js`: sonda opcional de rede (leitura/paridade/teto) **fora** do gate | T3 | ✅ |
| T5 | Gate + registro do procedimento de implantação (console do Firebase) | T4 | ✅ |
| T6 | Docs (CHANGELOG/ROADMAP/STATE) + commit | T5 | ✅ |

## Verificação por task

- **T2**: só arquivo de rules (**zero mudança no jogo** — o cliente já
  envia o formato certo); `min()`/ternário não existem na linguagem →
  usar a identidade `(nivel ≤ 999 && x == nivel) || (nivel ≥ 999 &&
  x == 999)`; constantes nomeadas (`MAPA_EPOCA`, `MAPAS_BASE`,
  `MIN_POR_MAPA`) com a fórmula de recalibragem no comentário (o
  `ritmo.js` mudou ontem: `ESPERA_BASE 8→4` — recalcular se o ritmo
  mudar).
- **T3**: casos de borda obrigatórios (nv 998/999/1000, onda 1/100,
  mapa 1/100000) — é o teste que amarra rules ↔ cliente.
- **T4**: rede **nunca** entra no gate (`todos.js`); a sonda P1 usa
  `rank/diagnostico` (doc de lixo existente) para o caso de falha ser
  inócuo.
