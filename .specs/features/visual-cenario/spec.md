# Spec: Visual do cenário — árvores, pedras, cofre e chão

Status: **concluída** (gate verde = 704 confs; PNGs olhados: previa, tela-cofre, tela-jogo) · Data: 2026-11-15 · Iniciativa: mantenedor
(sequência **B1→B4**; B1 = `visual-monstros`).

## Contexto

- **`treeCanvas`/`rockCanvas`** ainda têm paleta **fixa e chapada**
  (`['#2f6a3c','#3f8a4a',…]`, sem rampa nem fonte de luz) — são os
  únicos sprites do jogo fora do sistema novo.
- **Cofre** (`desenhaCofre`) é 3 retângulos + `strokeRect` — com
  `#8a6a2a` chapado, sem tampa arredondada nem faixas metálicas.
- **Chão** (`constroiChao`): as flores são aceitas só numa **faixa
  estreita do ruído** (`0,55 ≤ fa ≤ 0,67`) — o aceite leva 121
  tentativas pras 30 florinhas. **Hipótese descartada por medição**:
  a "linha pontilhada" que aparecia nas screenshots **não era o chão**
  — era **texto de dano flutuante** (a cor casava com `#ffd866` a ~40%
  e a linha desapareceu com `Efeitos.limparEfeitos()` antes da captura;
  o rasterizador de teste desenha glifo como bloco, e no navegador
  aparece como número). As flores, medidas uma a uma, já caíam
  **espalhadas**.

## Requisitos

- **R-VC-1 (árvore)** — `treeCanvas` com as mesmas rampas/luz do
  sistema: copa em **3 camadas** (luz no alto-esquerdo, base, sombra
  embaixo), tronco com **lateral iluminada + raiz**, contorno
  `#1b1424`. Grade e tamanho **20×26 intactos** (âncora de
  `desenhaObst` não muda) e piso da fumaca (**>150 px**) preservado.
- **R-VC-2 (pedra)** — `rockCanvas` com rampa, **face superior acesa**,
  fenda escura e contorno; grade **14×11 intacta** (piso >40 px).
- **R-VC-3 (cofre)** — `desenhaCofre` com tampa em degrau, **faixas
  douradas** e fechadura; continua **só `fillRect`/`strokeRect`**
  (primitivas que o rasterizador entende).
- **R-VC-4 (flores)** — faixa aceita **mais larga** (`0,45 ≤ fa ≤
  0,75`) e cada flor vira um **cachozinho** (2×2 + 1 vizinho) com
  contagem/tentativas mantidas (`i < 30`, `tent < 500`): aceite em
  ~33 tentativas em vez de 121 e distribuição mais solta. Justificativa
  CORRIGIDA na leva: a "linha pontilhada" das screenshots era **texto
  flutuante** (ver Contexto), não as flores — a mudança fica por ser
  um espalhamento melhor, não por consertar um bug.
- **R-VC-5 (testes/docs)** — `fumaca` (árvores/pedras) intacta, gate
  `todos.js`, PNGs de `previa.js`/`cena.js` olhados, CHANGELOG/
  ROADMAP/STATE.

## Fora de escopo

Forma/raio de colisão dos obstáculos (os r ×7/×5 e o
`constroiObst` não mudam) · paletas dos 10 temas (`Mapas.LISTA`
intacta — só a APLICAÇÃO delas muda) · chuva/neblina/partículas.

## Verificação

`node testes/todos.js` · `previa.png` (linha do cenário) ·
`tela-jogo.png`, `tela-mapa2.png`, `tela-boss.png` e
**`tela-cofre.png` (screenshot novo — só assim dá pra OLHAR o cofre
redesenhado)** · `node testes/mapa.js` (layout de obstáculos intacto).

**Diagnóstico registrado**: a hipótese da "linha pontilhada no chão"
foi **refutada com medição** (contagem de px + teste com
`Efeitos.limparEfeitos()` → 66 px → 0 px) — era texto de dano
flutuante no rasterizador. Lição: testar a hipótese antes de
"consertar" o que não está quebrado.
