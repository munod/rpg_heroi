# Spec: Visual do herói e das armas — pixel art 16-bit vibrante

Status: **concluída** (gate verde = **704 confs** — 687 fumaça + 17
grade; arte iterada nos PNGs de `previa.js`/`cena.js` e revisada) ·
Data: 2026-11-14 ·
Iniciativa: mantenedor — *"os personagens e armamentos estão com
visual tosco e muito simples; queria melhorar isso"* (+ pesquisa
online: Lospec, índice de tutoriais Cure/Derek Yu/saint11, Wikipedia,
Slynyrd nº 1/6/16, Shading Reference).

## Contexto (diagnóstico do código atual)

Tudo é procedural em `js/sprite.js` (grade 20×20 do herói, paleta
por índice, `contorna()` de 1px). Pesquisa de referência feita na
levantagem (Lospec "Pixel Art: Where to Start" + índice de
tutoriais de Cure/Derek Yu/saint11; Wikipedia — dithering, AA,
clusters, cores limitadas; Slynyrd Pixelblog nº 1 "paletas com
HSB", nº 6 "luz e sombra", nº 16 "armas medievais"; Shading
Reference). Diagnóstico:

- **`shade(hex, f)` só multiplica RGB** → escuros ficam acinzentados
  e sem matiz (sem rampa de verdade).
- **Sem direção de luz**: só "base + sombra", sem highlight, nenhuma
  fonte definida → aspecto plano.
- **Contorno uniforme**: `contorna()` pinta tudo de `#1b1424`,
  inclusive falhas internas, sem peso de base (bottom-heavy).
- **Corpo grosseiro**: braços são colunas de 1px, pernas blocos,
  rosto = 4 pixels avulsos, cabelo é uma elipse chapada.
- **Arma = linha de 1px** (`armaDesenhar` joga `linhaPts` + 3px de
  guarda) — sem largura, sem guarda, sem cabo, sem fio.
- **Zero identidade de classe/raridade**: `Personagem.lookDe()`
  expõe só `skin/hair/estilo/cloth/weapon`.

## Direção de arte (escolha do mantenedor)

**Escopo: herói + armas · grade 20×20 intacta · estilo 16-bit
vibrante.** Princípios:

1. **Luz única topo-esquerda** em todo sprite (herói e, no futuro,
   monstros/cenário).
2. **Rampas de 4 tons em HSB com hue-shift** por material: a sombra
   desloca o matiz pro azul e satura; a luz desloca pro amarelo e
   clareia (Slynyrd nº 1) — substitui a multiplicação crua.
3. **Contorno externo** `#1b1424` mantido (legibilidade na arena
   `#0d0b14`) + **linhas internas escuras na base** (sob queixo,
   ombros, cinto, entre pernas) = volume sem sujar a silhueta.
4. **Metal com especular** de 1px · **couro** escuro com fivela
   dourada · olho de 2px.
5. Contratos de coordenada preservados onde dá: olho branco `(9,4)`,
   pupila `(10,4)`, pés em `y=19/20`, corpo centrado em `x=8`,
   colunas 13–19 livres pro golpe.

## Requisitos

- **R-VHA-1 (motor de cor)** — `sprite.js`: `hexToHsb`/`hsbToHex`
  (ou HSL) + `rampa(hex)` devolvendo 4 tons com hue-shift; paleta do
  herói por material (pele/cabelo/tecido/couro/metal/dourado/gema/
  madeira/olho). `Sprite.shade` **continua exportado** (usado pelos
  testes/legenda).
- **R-VHA-2 (herói redesenhado)** — poses do herói autoradas como
  **grids em texto** (ES5, string array) para idle 2 · walk 4 ·
  ataque 3 frames, com silhueta nova: cabeça com maxilar/orelha,
  braços de 2px com mão, pernas com botas/fivelas, cinto com fivela,
  rosto expressivo. **Mesmas contagens de frame** → `batalha.js`
  intocado.
- **R-VHA-3 (cabelo ×5 e classe ×4 como overlays)** — `CABELOS`
  (curto/longo/rabo/moicana/careca) e `CLASSES`
  (guerreiro/mago/ladino/clerigo) blitados com âncora deslocada pelo
  `bob` do frame. `lookDe()` passa a expõer **`classe`** (campo
  derivado — **nada muda no save**, `p.look` segue só com
  skin/hair/estilo/cloth).
- **R-VHA-4 (armas com largura e raridade)** — `armaDesenhar`
  redesenhado: cabo, guarda em cruz, lâmina de 2px (fio claro +
  corpo escuro + ponta), pomo; adaga curta, martelo chanfrado,
  cajado com gema. `lookDe()` expõe **`rar`** (`p.equip.arma.rar`,
  1–4, já preservado pelo `normalizaItem`) → gema/fio por raridade.
- **R-VHA-5 (cache)** — `Anim.hero` inclui `classe` e `rar` na cache
  key (senão trocar de classe/equipamento deixa o sprite velho).
- **R-VHA-6 (testes)** — `grade.js` com legenda/asserções novas
  (o que puder manter, mantém: olho, pupila, lâmina, guarda, bota);
  `fumaca.js` **sem mudança de limite** (80–400 px continua porque a
  grade continua 20×20); `previa.js`/`cena.js` regenerados e
  **olhados** como loop de iteração visual; gate `todos.js` verde.
- **R-VHA-7 (docs)** — CHANGELOG em `[Unreleased]`, `STATE.md`/
  `ROADMAP.md` ao concluir, commit Conventional Commits pt-BR.

## Fora de escopo (próximas levas)

Monstros (3 formas × 10 espécies) · cenário (árvores/pedras) ·
ícones de item na aba Itens · preview do herói na seleção · subir a
grade pra 40×40 na mesma caixa de 20 unidades (4× mais detalhe).

## Verificação

`node testes/todos.js` (gate) · `grade.js` (asserções de pixel) ·
`previa.png`/`previa-zoom.png`/`cena.js` visualmente revisados ·
ES5 preservado em `js/` (`var`/`function`, sem seta/`const`).
