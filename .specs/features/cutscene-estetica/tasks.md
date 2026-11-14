# Tasks: Cutscene estética — caixa de legenda, sem véu

Status: ⬜ pendente / ✅ feito · `[P]` paralelo

| # | Task | Dep | Status |
|---|------|-----|--------|
| T1 | Spec + tasks | — | ✅ |
| T2 | `cutscene.js`: sem véu, barras `#000`, `caixaCorte` (duplo preenchimento) nos 2 overlays, título único com sombra | T1 | ✅ |
| T3 | `jogo.js`: `Space` avança (ramo do clique fora do botão) | T2 | ✅ |
| T4 | Gate 3× (42/48 intactas, PNGs novos) | T3 | ✅ |
| T5 | Sanidade `ritmo 60` | T4 | ✅ |
| T6 | Docs + commit | T5 | ✅ |
| T7 | Push (no fim, com os demais pendentes) | T6 | ⬜ |

## Verificação por task

- **T2**: a borda NUNCA via `stroke()` (no-op no rasterizador — a
  saída seria painel sem fio em toda screenshot); título desenhado
  **1×** — se sobrar o título do `UI.panel` embaixo, o texto continua
  empilhado (conferir que não há mais chamada de `UI.panel` nestes
  dois overlays).
- **T3**: `Space` só no ramo `foraBt` (dentro do botão, o clique é do
  `UI.button`); `Enter` intocado (contrato da seção 42).
- **T4**: se 42 ou 48 caírem, mexi em geometria/texto — reverter
  (estética não muda contrato).
