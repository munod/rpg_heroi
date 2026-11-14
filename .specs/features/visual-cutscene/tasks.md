# Tasks: Visual cutscene — letterbox, datilografado, dica piscando

Status: ⬜ pendente / ✅ feito · `[P]` paralelo

| # | Task | Dep | Status |
|---|------|-----|--------|
| T1 | Spec + tasks | — | ✅ |
| T2 | `cutscene.js`: estado `{linha, chars, pausa, barras, relogio}` + `update` para os 2 tipos + `avancar()` 3 estágios | T1 | ✅ |
| T3 | `cutscene.js`: render — letterbox antes do painel, texto `slice(chars)`, dicas piscando (evento + nova do mundo) + `info().barras/revela` | T2 | ✅ |
| T4 | `jogo.js`: clique fora do botão → `Cutscene.avancar()` (Enter/botão intactos) | T3 | ✅ |
| T5 | Testes: seção 48 (estágios, typewriter, letterbox, piscar) + espera de narração na 42 | T2-T4 | ✅ |
| T6 | Gate 3× | T5 | ✅ |
| T7 | Sanidade `ritmo 60` | T6 | ✅ |
| T8 | Docs + commit | T7 | ✅ |
| T9 | Push (só com aval) | T8 | ⬜ |

## Verificação por task

- **T4**: a ordem importa — o `avancar` roda no **update** e o
  clique dentro de `info().botao` é DEIXADO para o `UI.button` do
  render (senão o clique no botão fecha2× ou o skip nunca roda).
- **T5**: os 2 asserts de narração da 42 são contrato que MUDA de
  timing (o texto agora demora ~1-2,5s) — esperar com teto de frames
  e manter as mensagens; título/botão continuam no frame 1.
- **T5**: auto-dismiss — a espera de narração do evento tem que caber
  em 3,5s (2 linhas ≈ 2,4s ✓); se um texto crescer, o teste falha
  antes do corte — é o comportamento desejado (o cronômetro manda).
- **T6**: PNGs da cutscene regeneram com letterbox — conferir que o
  véu + barras não cobrem o painel (barras em 52px, painel em py 66+).
