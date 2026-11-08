# Tasks: Itens com afixos (Leva A de `gestao-estrategica`)

Legenda: `[P]` paralelo · Status: ⬜ pendente / ✅ feito / ❌ falhou

| # | Task | Dep | Status |
|---|------|-----|--------|
| T1 | Spec + tasks (este diretório) | — | ✅ |
| T2 | `js/itens.js`: pool de afixos (12: 4 pre-pos, 4 suf-pos, 4 neg), rolagem por raridade com teto de 1 neg, magnitude 1,5×, smart-loot por classe, nome com prefixo/sufixo, `item.afixos`, `deltas()` | T1 | ✅ |
| T3 | `js/batalha.js`: passa `p.classe` em `sorteiaDrop` | T2 | ✅ |
| T4 | `js/personagem.js`: `normalizaItem` aceita negativos/`afixos`, clamps em `status` (hpMax≥10, crit≥0, vel≥10, dano≥1) | T2 | ✅ |
| T5 | `js/gestao.js`: deltas na linha da bolsa + resumo nos cabeçalhos dos slots | T2 | ✅ |
| T6 | Testes: fumaça seção 15 ampliada (requisitos novos), conferir grade/cena | T2-T5 | ✅ |
| T7 | Medição: `ritmo.js` na faixa (42,6s · nv33/onda53 · mapa 1 em 28,5min); gate `todos.js` (3×) | T6 | ✅ |
| T8 | Docs: CHANGELOG `[Unreleased]`, STATE/ROADMAP, status da spec umbrella | T7 | ✅ |
| T9 | Commit `feat(itens): …` (**push só com aval**) | T8 | ⬜ |

## Verificação por task

- **T2**: `Itens.geraItem(rar, mapa, classe)` gera itens conforme R-AFI-1..3;
  exports antigos intactos; sem `const`/arrow (ES5).
- **T4**: save antigo (sem `afixos`, só positivos) normaliza idêntico ao
  atual; item com negativo preserva o sinal; `status` nunca devolve
  hpMax<10/crit<0/vel<10.
- **T5**: clique na linha da bolsa ainda equipa no mesmo lugar (contrato
  `fumaca.js` 584,216); texto de delta com sinal `-` para negativo.
- **T6**: asserções determinísticas para estrutura; estatística só com
  folga larga (nunca perto do limiar).
- **T7**: faixa alvo: 1º nível ~42s · 15min nv30-35/onda40-60 · mapa 1 em
  25-35min; se fora, ajustar faixas de afixo e re-medir.
