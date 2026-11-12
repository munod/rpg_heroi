# Tasks: Cutscenes entre mundos (mapa do universo + eventos)

Status: ⬜ pendente / ✅ feito · `[P]` paralelo

| # | Task | Dep | Status |
|---|------|-----|--------|
| T1 | Spec + tasks | — | ✅ |
| T2 | `js/cutscene.js`: módulo `Cutscene` — estado (mundo/evento, teto 1, auto-dismiss, silenciar), narração (9 mundos + 4 eventos), `desenhar` do overlay com mapa do universo | T1 | ✅ |
| T3 | `js/cutscene.js`: cena `universo` (mapa do universo tela própria, estado do save, Voltar) + registro em `main.js` | T2 | ✅ |
| T4 | `index.html`: declarar `cutscene.js` (antes de `batalha.js`) | T2 | ✅ |
| T5 | `batalha.js`: gatilho em `passaMapa` (fronteira de mundo, destino ≤ 10) + `Cutscene.evento` nos 4 eventos + silenciar em `voltaAusencia` | T2 | ✅ |
| T6 | `jogo.js`: render/update — overlay por cima (prioridade vitória > mundo > evento), bloqueio da gestão, `Cutscene.update(dt)` | T2 | ✅ |
| T7 | `selecao.js`: botão "Universo" na linha do Ranking | T3 | ✅ |
| T8 | Testes: seção 42 (gatilhos, prioridade, teto 1, auto-dismiss, bloqueio, cena universo, botão) + screenshots `cena.js` + reparos | T2-T7 | ✅ |
| T9 | Gate 3× + sanidade `ritmo.js 60` | T8 | ✅ |
| T10 | Docs + commit | T9 | ✅ |

## Verificação por task

- **T2**: narração em dados puros (fácil de revisar/ajustar); desenho só
  com primitivas do rasterizador (testar com `cena.js` antes do gate).
- **T5**: o gatilho usa `Mapas.mundo()` antes e depois do `mapa++` —
  100→101 (destino 11) fora; `restaurarMapa` NÃO dispara (só
  `passaMapa`).
- **T6**: `UI.bloqueia(vit || corte)` durante `desenhaFundo` + pulo do
  `Gestao.update` — mesmos dois níveis do overlay de vitória (o clique
  é bloqueado no desenho E na atualização).
- **T8**: cutscene de evento precisa do mosquetão dos RNGs (regra da
  casa) — a seção 41 já religa `nasceAco`/`nasceEnxame`/`nasceCofre`;
  a 42 reaproveita o padrão.
