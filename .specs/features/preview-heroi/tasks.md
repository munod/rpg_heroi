# Tasks: Prévia do herói na tela de aparência

Status: ⬜ pendente / ✅ feito · `[P]` paralelo

| # | Task | Dep | Status |
|---|------|-----|--------|
| T1 | Spec + tasks | — | ✅ |
| T2 | `gestao.js`: relógio `prevT` em `Gestao.update` (antes dos `return`) | T1 | ✅ |
| T3 | `gestao.js`: caixa de prévia em `desenhaAparencia` (panel + sombra + sprite ×3) + `Gestao.previa()` | T2 | ✅ |
| T4 | `fumaca.js`: seção da prévia (anima + caixa abaixo das linhas) | T3 | ✅ |
| T5 | Iteração visual (screenshots olhados) + gate | T4 | ✅ |
| T6 | Docs (CHANGELOG/ROADMAP/STATE) + commit | T5 | ✅ |

## Verificação por task

- **T2**: `update` faz `return` cedo em abas ≠ atributos — o relógio
  precisa vir ANTES; e `update` roda em `jogo.js` **e** `selecao.js`
  (senão a criação ficaria com sprite congelado).
- **T3**: mesmo caminho do desenho da arena (`Anim.hero` +
  `lookDe`) — sem caminho próprio, senão a prévia pode divergir da
  arena (cache com chave diferente).
- **T4**: contrato `(706, 96)` (botão `>` da linha Pele) não pode ser
  coberto — a caixa começa em `y ≥ 232`.
