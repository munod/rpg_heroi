# Spec: Cutscene estética — caixa de legenda do original, sem véu

Status: **concluída** (gate verde 3× = 695 confs; sanidade 2× mapa 1
34,0/37,4min) · Data: 2026-11-14 · Iniciativa: avaliação do
mantenedor pós-push parcial — *"vamos melhorar o cutscene, pois está
visualmente feio"*, com o **código do original do outro projeto**
enviado como referência.

## Contexto (diagnóstico: original × nosso)

| Original (referência) | Nosso hoje |
|---|---|
| Só letterbox + caixa de legenda (arena aparece entre as barras) | **Véu cheio `rgba(8,6,16,0.84)`** em cima de tudo + barras → tela chapada e escura |
| Caixa preta translúcida `rgba(8,6,14,0.90)` + **fio dourado** `rgba(232,200,106,0.45)` | `UI.panel` roxa com strip de título = visual de painel de gestão |
| Título **único** dourado com sombra | Evento desenha o título **2×** (dourado do `UI.panel` + sobreposição na cor do evento) |
| Barra `#000` pura | Barra `rgba(0,0,0,0.92)` sobre o véu |
| `Space` avança | Só clique (fora do botão) e `Enter` (fecha) |

Já iguais: geometria ×2 (barras 52px), datilografado 55 c/s + pausa
0,8, dicas piscando, `avancar()` 3 estágios.

**Decisões do mantenedor**: **véu removido** (fiel ao original; a
arena continua viva — idle sagrado — e aparece na faixa fina entre
barras e caixa) · **só o estilo** (geometria intocada).

## Riscos

1. **Borda dourada por `stroke()` sumiria dos PNGs** — `stroke()` é
   no-op no rasterizador (lição da spec `visual-ui`). Solução: borda
   por **duplo preenchimento** (anel externo na cor dourada +
   miolo translúcido por dentro) — igual ao painel da UI.
2. **Sem véu, legibilidade** — resolve-se com o próprio fundo 0,90 da
   caixa (mesma solução do original); títulos ganham `sombra`.
3. **Contratos** — seções 42/48 asserem textos e geometria
   (`info().botao`), nada assera véu/cor de caixa → não devem mexer.

## Requisitos

- **R-CE-1 (véu)** — `desenhar()` deixa de desenhar o retângulo
  `rgba(8,6,16,0.84)`; sobra letterbox + caixa sobre a arena viva.
- **R-CE-2 (barras)** — `#000000` puro (antes `rgba(0,0,0,0.92)`).
- **R-CE-3 (caixa de legenda)** — helper `caixaCorte(ctx, x, y, w, h,
  r)`: **anel** `caixa(..., 'rgba(232,200,106,0.45)')` + **miolo**
  `caixa(x+1, y+1, w-2, h-2, r-1, 'rgba(8,6,14,0.90)')` (duplo
  preenchimento — nunca `stroke()`); usada nos **dois** overlays
  (mundo e evento), `r = 8`.
- **R-CE-4 (título único)** — mundo: `UI.text('MUNDO N — tema',
  px+10, py+15, {color: '#f0cd72', font: 'bold 16px monospace',
  sombra: true})` (mesma posição do strip antigo, 1× só); evento:
  título **só na cor do evento** com `sombra: true` (acaba o texto
  empilhado). Nenhum outro texto muda de lugar.
- **R-CE-5 (Espaço)** — `Input.pressed('Space')` no mesmo ramo do
  clique fora do botão em `Jogo.update` (avança narração); `Enter`
  segue fechando direto (contrato da 42).
- **R-CE-6 (intocado)** — geometria (`MUNDO_*`, `EV_*`, `botao()`),
  gatilhos, datilografado, piscar, auto-dismiss, cena `universo`,
  overlay de vitória.
- **R-CE-7 (verificação)** — seções 42/48 **sem mudança** ·
  `todos.js` **3×** (PNGs da cutscene regeneram com a nova estética)
  · `ritmo 60` rápido · QA humano do mantenedor.

## Fora de escopo

- Proporção/rasura dos painéis (mantenedor escolheu "só o estilo") ·
  cena `universo` e overlay de vitória (continuam com `UI.panel`/
  véu próprios) · gatilhos/comportamento · som.

## Ajuste pós-avaliação 2 (mantenedor)

- **Caixa transparente + SEM botão** (print de referência do outro
  projeto): miolo `rgba(8,6,14,0.90)` → **`0,60`**; botões
  "Continuar"/"Entrar no Mundo" removidos — `botao()` some,
  `info().botao = null`, `Jogo.update` avança com **todo clique**
  (sem check de retângulo) + `Espaço`. Contratos migrados: 42
  (botão → dicas piscantes + laço de cliques) e 48 (retângulo →
  `botao === null` + cliques encerram).

## Verificação

Gate 3× + `ritmo 60` · QA no navegador (sem véu, caixa preta com fio
dourado, título único, Espaço avança) · docs · commit (push continua
no fim com os demais pendentes).
