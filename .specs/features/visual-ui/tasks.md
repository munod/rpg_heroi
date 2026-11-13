# Tasks: Visual UI — paleta, primitivas, gradientes, cantos arredondados

Status: ⬜ pendente / ✅ feito · `[P]` paralelo

| # | Task | Dep | Status |
|---|------|-----|--------|
| T1 | Spec + tasks | — | ✅ |
| T2 | `ui.js`: `PALETA` + primitivas (`grad`/`caminho`/`caixa`/`sombra` + `text.sombra`) com fallbacks | T1 | ✅ |
| T3 | `ui.js`: receitas — `fundo`/`faixaTopo`, `panel` (borda dupla + título `[8,8,0,0]`), `button` (4 estados doc, hit-test intacto), `bar` (degradê + brilho, guarda h≥4), `tom()` | T2 | ✅ |
| T4 | Cenas (jogo/selecao/ranking/cutscene): fundo/cabeçalho via `UI.fundo`/`UI.faixaTopo` + tooltip/swatch arredondados | T3 | ✅ |
| T5 | `style.css`: shell do doc (radial + border-radius + moldura dourada + halo) | T3 | ✅ |
| T6 | Testes: seção 46 (PALETA, fallbacks, Δchamadas, sombra, título) + reparos | T2-T5 | ✅ |
| T7 | Gate 3× (fumaca + grade + previa + cena) | T6 | ✅ |
| T8 | Sanidade `ritmo 60` | T7 | ✅ |
| T9 | Docs + commit | T8 | ✅ |
| T10 | Push (só com aval) | T9 | ⬜ |

## Verificação por task

- **T3**: o hit-test de `button` NÃO pode mudar — se um clique de
  teste cair, o desenho foi alterado junto (regra: nunca tocar em
  `mx >= x && mx < x + w` nem nas coordenadas de `text` do rótulo).
- **T3**: `bar` — o guard `h >= 4` envolve **tanto** `strokeRect`
  quanto o brilho; a fumaça já asserta a presença/ausência
  (seção 9): não duplicar, só não quebrar.
- **T6**: fallbacks são o coração da tarefa — `grad` tem que devolver
  string no harness (contador `createLinearGradient` → `undefined`) e
  `caminho` tem que cair em `rect` no rasterizador (sem `roundRect`).
  Se qualquer asserção de texto antiga cair com a sombra, é porque a
  sombra foi ligada sem opt-in.
- **Flake corrigido na T7**: a asserção da seção 32 ("fuga nunca em
  rocha") caiu1× em5 execuções (12/5664) — duas classes: casca de
  ≤0,7px entre o float validado e o int que `info()` exibe, e o
  fallback documentado quando TODOS os candidatos estão bloqueados.
  Fix na FONTE (`direcaoEvasao` testa a rocha no ponto arredondado)
  + tolerância de 1% no assert. 3× verde depois.
- **T7**: os PNGs regenerados (`previa`/`cena`) são o QA visual
  estático — painéis devem aparecer em cor de verdade agora (o
  fallback hex melhora o PNG; hoje `rgba` virava preto na captura).
