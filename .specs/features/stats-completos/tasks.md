# Tasks: Estatísticas completas + tooltips (Leva 4)

Status: ⬜ pendente / ✅ feito · `[P]` paralelo

| # | Task | Dep | Status |
|---|------|-----|--------|
| T1 | Spec + tasks | — | ✅ |
| T2 | STATS +7 + increments (itens `conta()`, batalha `stat(n)`, keystone `ouroGasto`) | T1 | ✅ |
| T3 | `Gestao.DESC_STATS` + dicas nas linhas da Stats; `Skills.dicas` + dica nas linhas de skill; dica no botão do keystone | T2 | ✅ |
| T4 | Testes: seção 31 (11 confs) | T3 | ✅ |
| T5 | Gate 3× + ritmo 15 na faixa | T4 | ✅ |
| T6 | Docs + commit | T5 | ✅ |

## Verificação por task

- **T2**: chave nova só existe se estar em `Personagem.STATS` (espelho);
  todo `p.ouro +=` tem par `stat('ouroGanho'|'ouroGasto')`.
- **T4**: nenhum clique de teste altera keystone sem ouro (botão
  disabled); tooltip de skill usa números dos campos (nada de texto
  solto em asserção de valor).
