# Tasks: Infra de tooltips + breakdown (Leva 3 de stats/tooltips)

Status: ⬜ pendente / ✅ feito · `[P]` paralelo

| # | Task | Dep | Status |
|---|------|-----|--------|
| T1 | Spec + tasks | — | ✅ |
| T2 | `js/ui.js`: `dica()`/`desenhaTooltip()` (delay 0,25s, long-press 500ms, caixa retida, clamp, 1 por vez, primitivas seguras) | T1 | ✅ |
| T3 | `js/jogo.js` + `js/selecao.js`: chamar `UI.desenhaTooltip()` no fim do render | T2 | ✅ |
| T4 | `js/personagem.js`: `statusDetalhado(p)` (partes por fonte + DPS + agudeza/recarga/XP + lendários ativos) | T1 | ✅ |
| T5 | `js/ui.js` `linhaStatus`: segmentos hoveráveis (HP/Dano/Vel/Crít/Alcance/**DPS**) com math monoespaçada | T2-T4 | ✅ |
| T6 | `js/itens.js`: `Itens.dicas(p, item)`; `js/gestao.js`: registrar dicas nos slots/bolsa + linhas de atributo | T4-T5 | ✅ |
| T7 | Testes: seção 30 (hover, long-press, cancel, exatidão, linhas de item) + gate 3× | T2-T6 | ✅ |
| T8 | Docs (CHANGELOG/STATE/ROADMAP/AGENTS/spec) + commit | T7 | ⬜ |

## Verificação por task

- **T2**: sem `measureText`/`arc`/gradiente; dica só DESENHA (nenhum
  `return` de clique muda); posções em coordenadas de jogo.
- **T4**: `soma(d partes) === s.chave` para dano/hp/vel/crit (com
  keystone e aprimoramento no lugar certo); DPS com os 3 operandos
  visíveis; sem dependência de `itens.js` (lê campos dos itens).
- **T7**: long-press = touchstart + ~30 frames sem soltar; arrasto
  (touchmove) cancela; clique em botão nunca esconde sua própria ação.
