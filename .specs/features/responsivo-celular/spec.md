# Spec: Responsivo e toque no celular (backfill)

Status: **Entregue** — v0.1.0 · Commits: `4291092`, `4c249e4`

## Objetivo
O jogo ocupava 384×216 de uma tela 844×390 e não respondia a toque: resolver
resolução/DPR, gesto de toque completo e, por fim, o layout 16:9 fixo que
sobrava com barras laterais no celular em paisagem.

## Requisitos
- **R-UI-1**: Base 768×432 com `resize()` rodando **antes** de `getContext()`
  (o rasterizador aloca o buffer na 1ª chamada), escala fracionária que
  preenche a janela (CSS) e `esc = floor(escala × dpr)` no backing com
  `setTransform(esc)` por frame — commit `4291092`.
- **R-UI-2**: `index.html` com viewport travado
  (`maximum-scale=1/viewport-fit=cover`), `theme-color`, safe-area no wrapper
  e banner **"Gire o celular para jogar"** em retrato (`pointer:coarse`, não
  bloqueante) — commit `4291092`.
- **R-UI-3**: Toque completo: `touchstart`/`touchmove` no canvas e
  `touchend`/`touchcancel` na window com `{passive:false}` +
  `preventDefault` (mata rolagem, zoom e mouse sintético), primeiro dedo
  controla por `identifier`, `touch-action: none` no CSS — commit `4291092`.
- **R-UI-4**: Alvos de toque dos atributos de 11 → **24px** com centro fixo;
  ponteiro mapeado por dimensão de **jogo** (não por `canvas.width`), correto
  em qualquer DPR — commit `4291092`.
- **R-UI-5**: Largura lógica adaptativa em `main.js resize()`:
  `W = clamp(432 × aspecto, 768, 1728)`, recalculada no resize e no
  `orientationchange`, `Game.W` expõe a largura e `Input.ajusta` remapeia o
  ponteiro; em 16:9 **W = 768** com layout de referência byte a byte — commit
  `4c249e4`.
- **R-UI-6**: Layout ancorado (`dx = W − 768`): cabeçalho/rodapé/status/toast
  em largura toda, painel de gestão deslocado com `ctx.translate(dx)` +
  `UI.deslocar(dx)` e `Gestao.update` descontando `dx` do ponteiro
  (retângulos continuam locais ao painel) — commit `4c249e4`.
- **R-UI-7**: Harness com env `JANELA=WxH` (padrão 1280x720) e
  `getBoundingClientRect` dinâmico (`Game.W × 2`); a fumaça fixa 1280×720
  antes do load — commit `4c249e4`.
- **R-UI-8**: UI caprichada: botão com estado pressionado (feedback de toque)
  e faixa de luz, painel com realce, divisor no rodapé, toast/dica em
  mini-painel, vinheta/sombra/poeira na arena — commit `4291092`.

## Verificação
- Gate `node testes/todos.js` (193 asserções no total hoje; 144 após
  `4291092` — fumaça 131 + grade 13 — e 151 após `4c249e4`).
- `testes/fumaca.js` **seção 18) toque, resolução e escala responsiva** (15
  confs): backing 768×432, CSS preenchendo a janela (escala 1,67×), ouvintes
  registrados, `touchstart` vira down+clicked com `preventDefault`, mapeamento
  de coordenada de jogo, `touchmove` seguindo o dedo que começou, segundo
  dedo ignorado, `touchend`/`touchcancel` soltando na hora certa.
- `testes/fumaca.js` **seção 19) viewport larga: layout ancorado e
  preenchido (celular)** (+7 confs): 1280×400 → `Game.W === 1382`, CSS sem
  barra lateral, backing 1382×432, Pausar ancorado à direita responde, botão
  `+` do painel deslocado por `dx` aplica, aba Itens clicável sob
  `translate` e restauração a 16:9 (W volta a 768).
- `testes/cena.js` acompanha `dx` nos cliques das abas e aceita QA visual em
  tela larga: `JANELA=1280x400 node testes/cena.js`.
- `testes/ritmo.js` — medições: `4291092` 1º nível **38–40s**, **nv 32–35 /
  onda 53–57** @15min, mapa 1 em **29,2min**; `4c249e4` 1º nível **46,7s**,
  **nv 32 / onda 53** @15min (física intocada).
