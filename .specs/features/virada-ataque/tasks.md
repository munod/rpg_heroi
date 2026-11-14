# Tasks: Virada do herói — facing no desenho

Status: ⬜ pendente / ✅ feito · `[P]` paralelo

| # | Task | Dep | Status |
|---|------|-----|--------|
| T1 | Spec + tasks | — | ✅ |
| T2 | `batalha.js`: flip em `desenhaHeroi` (facing −1) + `heroi.facing` nas 3 chamadas de `corte` + sonda `info().heroi.facing` | T1 | ✅ |
| T3 | `cena.js`: `drawImage` com escala negativa (espelho) + auto-check sintético que **throwa** se errar | T2 | ✅ |
| T4 | Testes: seção 50 (vira esquerda/direita) + reparos | T2-T3 | ✅ |
| T5 | Gate 3× | T4 | ✅ |
| T6 | Sanidade `ritmo 60` | T5 | ✅ |
| T7 | Docs + commit | T6 | ✅ |
| T8 | Push (só com aval — pós-release) | T7 | ⬜ |

## Verificação por task

- **T2**: o flip envolve SÓ o `drawImage` (sombra e alpha fora do
  save/restore — senão a sombra também espelha e o alpha do
  invulnerável vaza pro contexto).
- **T3**: a matemática do espelho: origem = borda esquerda
  `tx + (dx+dw)·sx` quando `sx<0` e índice da fonte invertido
  (`DW−1−X`) — o auto-check com cores distintas p/ pixel p/ pixel é
  o que segura a conta (se errar 1px, o gate falha).
- **T4**: a fixture precisa de `con` altíssimo (nobody dies) e teto
  de frames — entre golpes (recarga ~0,6s) o ramo `!atacando`
  re-vira o `facing`; amostrar em ≤90 frames.
