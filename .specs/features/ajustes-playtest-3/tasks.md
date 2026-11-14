# Tasks: Ajustes playtest 3 — resolução, Vel, scrollbar

Status: ⬜ pendente / ✅ feito · `[P]` paralelo

| # | Task | Dep | Status |
|---|------|-----|--------|
| T1 | Spec + tasks | — | ✅ |
| T2 | `main.js`: `esc = escala × dpr` fracionário (backing = exibição) + comentário | T1 | ✅ |
| T3 | `ui.js`: Vel arredondado no rodapé · `gestao.js`: `par()` arredonda `Vel`, `ST_VAL_X=744` nos 2 `align:'right'`, sonda `statsGeom()` | T2 | ✅ |
| T4 | Testes: seção 18 (invariante backing=exibição) + seção 47 (nitidez, Vel sem ponto, geometria scrollbar) | T3 | ✅ |
| T5 | Gate 3× (PNGs em 1280×720) | T4 | ✅ |
| T6 | Sanidade `ritmo 60` | T5 | ✅ |
| T7 | Docs + commit | T6 | ✅ |
| T8 | Push (só com aval) | T7 | ⬜ |

## Verificação por task

- **T2**: `render()` já faz `setTransform(esc)` + `imageSmoothing=false`
  POR FRAME — esc fracionário só funciona por causa disso (não tocar).
- **T3**: arredondar SÓ `Vel` no `par()` — o teste da seção 27 parseia
  `'Dano ' + det.dano.base + '→'` com o valor CRU; arredondar tudo
  derrubaria ele.
- **T4**: seção 18 é contrato do esquema antigo (768×432 / 1382×432)
  — reescrever para o invariante novo, não apagar.
- **T4**: o teste de arrasto do thumb (pressiona em 750,150) prova que
  o TRILHO não pode andar — só os valores.
