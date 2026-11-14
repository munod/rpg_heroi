# Spec: Ajustes playtest 3 — resolução nítida, Vel inteira, scrollbar

Status: **concluída** (gate verde 3× = 664 confs; mapa 1 em
31,5min) · Data: 2026-11-13 · Iniciativa: correções do
avalição do mantenedor na leva `visual-ui` (3 achados da captura
`Captura_de_tela_20261113_211104.png`).

## Achados e diagnóstico

1. **"Resolução da UI baixa"** — `resize()` usa
   `esc = floor(escala × dpr)` (inteiro) e o CSS **estica** o buffer
   fracionariamente (1280/768 = 1,67×) com `image-rendering:
   pixelated`: o texto nasce em 16px no buffer e é aumentado por
   **vizinho mais próximo** → glyph blocky. Pixel art já saía
   irregular do mesmo jeito (o CSS `pixelated` em 1,67× também é
   irregular), então **não há perda de pixel art em trocar**.
2. **"Vel com casas decimais"** — `status().vel` é fracionário por
   construção (`46 + 24×(DES/8)^0,35`, spec `gestao-atributos`) e é
   impresso cru no rodapé (`UI.linhaStatus`) e no bloco
   `Base → total` da aba Stats (`par()` em `gestao.js`).
3. **"Scrollbar por cima das informações"** — valores da aba Stats
   alinhados à direita em `x=752` e o trilho da rolagem em
   `x=746..754` (thumb cobre os últimos dígitos).

## Decisões

- **Backing = resolução de exibição** (`esc = escala × dpr`,
  **fracionário**): texto/vetores renderizados no tamanho FINAL da
  tela (nítidos), buffer 1:1 com o CSS (sem reamostragem). O
  rasterizador de desenho (`imageSmoothingEnabled=false` por frame,
  já existe) mantém o sprite nítido — mesma irregularidade de escala
  fracionária que o `pixelated` do CSS já produzia. **Nada de
  letterbox/escala inteira** (deixaria a tela cheia de margem).
- **Vel arredondado só na exibição** (`Math.round` no rodapé e no
  `par()` quando a chave é `Vel`): `statusDetalhado` continua com os
  floats crus (testes somam as partes); `Dano`/`FOR` etc. não são
  mexidos (o teste da seta `Dano base→total` parseia os valores
  crus).
- **Valores andam para `x=744`** (2px de folga antes do trilho
  746..754); **trilho não muda** (o teste de arrasto do thumb clica
  em x=750).

## Contratos de teste a atualizar (seção 18)

- `backing store 768×432` / `1382×432 (esc=1)` / `restaurou
  768×432` → passam a afirmar o **invariante novo**:
  `canvas.width === parseInt(style.width) × dpr` (backing = exibição)
  + `Game.W === 768` (layout intacto).

## Requisitos

- **R-AP3-1 (nitidez)** — `resize()`: `esc = escala × dpr` sem
  floor; buffer `round(W×esc)`; comentário do esquema reescrito.
- **R-AP3-2 (Vel inteira na tela)** — rodapé: `'Vel ' +
  Math.round(s.vel)`; bloco Stats: `par()` arredonda base/total
  quando a chave é `Vel`. Nenhuma outra exibição de float cru.
- **R-AP3-3 (scrollbar sem sobreposição)** — constante
  `ST_VAL_X = 744` nos dois `align:'right'` da aba Stats (linhas de
  estatísticas e cooldowns); sonda `Gestao.statsGeom()` →
  `{valX, trilho}`.
- **R-AP3-4 (testes)** — **seção 47**: invariante backing=exibição;
  fixture DES 9 (vel fracionária) → rodapé `Vel \d+` **sem ponto** e
  nenhum texto `Vel \d+\.`; geometria `valX + 2 <= trilho.x`.
  Seção 18 atualizada (R acima). Thumb/arrasto (x=750) intacto.
- **R-AP3-5 (sanidade)** — `todos.js` **3×** (PNGs regeneram em
  1280×720 — QA visual passa a ver o mesmo que o navegador) +
  `ritmo 60` rápido (mudança de resize não toca simulação; prova de
  execução longa).

## Fora de escopo

- Trocar `pixelated`/CSS · mover o trilho · arredondar
  `statusDetalhado` (precisão dos testes) · outros floats de UI
  (nenhum outro existe — verificado) · mudanças de layout/geometry.

## Verificação

- Seção 47 + seção 18 reparada · `todos.js` 3× · `ritmo 60` ·
  QA humano na captura do usuário (texto nítido, `Vel 81`,
  scrollbar na calha) · docs · commit · push com aval.
