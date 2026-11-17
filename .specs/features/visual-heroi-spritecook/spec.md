# Spec: Visual do herói via SpriteCook — arte gerada + pipeline de assets

Status: **piloto concluído** (gate verde = `node testes/todos.js`
com 5 arquivos — entrou o `previa-assets.js`) ·
Data: 2026-11-16 ·
Iniciativa: mantenedor — *"Vamos trabalhar a arte do game, começando
pelos personagens. Analise os sprites dos personagens para montarmos
uma base que servirá para o spritecook, e assim criaremos o visual
novo deles."*

## Contexto (análise dos sprites atuais)

Hoje tudo é procedural em `js/sprite.js` (grade 20×20, autoria em
grid de texto, paleta de 30 índices por material com rampas HSL
hue-shift, luz única topo-esquerda, contorno `#1b1424`):

- **Partes compostas**: `CORPO` (1) · `PERNAS` (3 poses) ·
  `BRACO_TRAS` (3) · `BRACO_FRENTE` (4: baixo/wind/slash/recover) ·
  `CABELOS` (5 estilos) · `CLASSES` (4) · arma vetorial
  (`armaDesenhar`: punho→ponta, espada/adaga/cajado/martelo).
- **Animações**: idle 2f (bob) · walk 4f · attack 3f — frames
  fixados em `batalha.js` (`anima()` %4/%2 e `÷3` do ataque) e no
  `previaFrame()` da gestão.
- **Customização**: `p.look` = skin/hair/cloth (hex) × 5 estilos ×
  4 classes × 5 armas × 4 raridades de acento; `Anim.hero` cacheia
  por `skin|hair|estilo|cloth|classe|rar|weapon|anim|frame`.
- **Desenho**: 1:1 no mundo (20px na janela 192×134 — herói ~15%
  da altura da janela), espelhado por `facing`,2 pontos de desenho:
  `batalha.js desenhaHeroi` e `gestao.js desenhaPrevia`.

## Decisões do mantenedor (levantamento)

1. **Estilo: pixel art rico, sprite de 32-48px** — mantém a
   linguagem do jogo (cenário/monstros/UI são pixel art), mais
   detalhe que os 20px atuais.
2. **Look fixo por classe** — 4 heróis autorais; a aba Apar perde
   pele/cabelo/estilo/tecido.
3. **Arma como sprite separado** — composta na mão do sprite; o
   acento da raridade vira recolor de máscara (preserva
   *"raridade visível na mão"*, spec `visual-heroi-arma`).
4. **Piloto: 1 classe completa** (guerreiro: corpo + arma +
   idle/walk/attack, integrado no jogo e nos testes) antes de
   replicar o pipeline.

## Reversão de decisão registrada (PNG externo)

O `STATE.md` (leva `visual-heroi-arma`) registra: *"Descartado asset
PNG externo: quebraria o harness (que lê os pixels gerados) e a regra
'sem dependências, sem build'"*. **Esta leva reverte essa decisão**,
com justificativa:

- `testes/png.js` já tem `lerPNG` (upgrade RGB→RGBA é pequeno);
- o harness pode ganhar stub de `Image` com decode síncrono (Node
  lê de disco — sem rede, sem servidor);
- "sem dependências, sem build" **não proíbe PNG**: `Image` com
  caminho relativo funciona em `file://` e no Pages; nenhum passo de
  build é adicionado (os PNGs são arte commitada).

**Degradação por construção**: classe sem asset carregado cai no
procedural antigo — o piloto convive com as 3 classes ainda
procedurais, e um PNG ausente/quebrado nunca deixa o herói sem
desenho.

## Requisitos

- **R-VHS-1 (base de referência p/ SpriteCook)** — materializar a
  análise em folha de referência (poses ×4 ampliadas + paleta +
  proporções; `testes/previa-zoom.png` já entrega boa parte — script
  dedicado só se precisar de mais contexto); upload via MCP
  (`spritecook-upload-assets`) e manifesto `spritecook-assets.json`
  no repo (só `asset_id`/`sha12`/`label` — nunca URL/token).
  Preflight: `get_credit_balance` antes do batch.

- **R-VHS-2 (geração do guerreiro)** — rota A:
  `generate_character(perspective="platformer")` (o herói atual é
  **visto de lado olhando à direita** — olho/nariz à direita,
  orelha à esquerda — e os presets `idle/walk/attack` do platformer
  casam com as 3 animações do jogo); se voltar perfil estrito,
  rota B: `generate_game_art` com prompt livre (3/4 olhando à
  direita) + animação no still. Modelo: Nano Banana 2.1
  (`pixel=true`), fundo transparente. **Sem arma na mão** (arma é
  composta à parte; prompt pede mão fechada como se segurasse algo).
  Design canônico documentado na seção abaixo. Geração em resolução
  alta (fonte ≥64px) + **redução local por vizinho mais próximo**
  para a **altura-alvo de mundo = 32px** (1,6× o atual — constante
  no manifesto; QA no screenshot da arena antes de fechar; subir p/
  40px é mexer na constante, não regerar).

- **R-VHS-2b (animações)** — `generate_character_animations` no
  `character_id`, `animation_ids: ["idle","walk","attack"]`;
  conferir o frame 0 contra o still (evitar "jump" na virada) e as
  contagens de frame novas entram no manifesto. **As contagens
  deixam de ser fixas**: `batalha.js` (`anima()` e o `÷3` do
  ataque) e o `previaFrame()` da gestão passam a ler
  `Assets.frames(anim)` com fallback 4/2/3 (procedural).

- **R-VHS-3 (armas)** — os **4 tipos** (espada/adaga/cajado/martelo
  — cobre as 4 classes e todos os drops; gerar todos evita classe
  sem arma no meio da leva) na mesma leva, como objetos simples:
  lâmina **na horizontal**, acento (guarda/gema/faixa) em **magenta
  em 3 tons** (luz/base/sombra) para o recolor. Variantes de ângulo
  **derivadas localmente** por script Node sem dependências
  (rotação exata 45° por transposição — sem drift de estilo, sem
  crédito) e commitadas: `cima` (wind) · `meio` (slash) · `baixo`
  (idle/walk/recover). **Sem `ctx.rotate`**: o rasterizador de teste
  não suporta rotação (lição: estender infra só se necessário — e
  aqui não é).

- **R-VHS-4 (infra de assets)** —
  - `testes/png.js`: `lerPNG` ganha **RGBA** (color type 6) +
    PLTE/tRNS se o download vier paletizado;
  - `testes/carga.js`: stub de `Image` com **decode síncrono**
    (via `lerPNG`, vindo do Node) e `onload` síncrono — convenção
    alfa 0 = vazio (mesma do `previa.js`);
  - **`js/assets.js` novo** (declarado no `index.html` antes de
    `anim.js` — o `carga.js` lê a lista de lá): manifesto
    **embutido em JS** (nunca `fetch` — bloqueado em `file://`),
    `Assets.carga(cb)` idempotente com fallback, e bake de cada
    frame em `{canvas, w, h}` (formato do `paraCanvas` —
    espelhamento/`globalAlpha`/call sites ficam intactos);
  - boot: `main.js init` espera `Assets.carga` antes de
    `setScene`+`Loop.start` (timeout cai no procedural; no harness
    o stub é síncrono e nada atrasa);
  - **ES5 preservado** em `js/` (`var`/`function`, sem seta).

- **R-VHS-5 (integração do desenho)** — `Anim.hero`: classe com
  asset → sprite novo (chave `classe|anim|frame|weapon|rar`);
  sem asset → procedural (chave antiga intacta). Dimensões e
  ancoragem dirigidas pelo manifesto: `desenhaHeroi` passa a
  `y0 = heroi.y − ALTURA` (pés na âncora, como hoje) e a sombra
  acompanha; `desenhaPrevia` da gestão usa as dimensões do
  manifesto em vez de 20 fixos.

- **R-VHS-6 (arma composta + raridade)** — o composite final
  (herói + arma) vira **um** `{canvas, w, h}` por
  `classe|anim|frame|arma|rar` — os call sites não mudam.
  Âncora da mão **por frame** no manifesto (medida com
  `testes/ampliar.js` após a geração). Recolor da raridade:
  pixels do marcador magenta → `corArma(rar)` (ouro→azul→roxo→
  vermelho, fonte única `Sprite.corArma`), cache 4 por arma. O
  espelhamento por `facing` segue no draw (composite inteiro).

- **R-VHS-7 (Apar simplificada)** — `desenhaAparencia` perde as 4
  linhas (Pele/Cabelo/Estilo/Roupa) e vira **prévia + rótulo da
  classe + dicas** (aba e grade de5 abas intactos — contrato de
  clique das abas não muda). `p.look` **continua no save**
  (validação/`novo`/`normalizar` sem bump; as 3 classes
  procedurais ainda desenham com o look salvo até a leva 2).

- **R-VHS-8 (testes)** —
  - `fumaca.js` seção 1: asserções procedurais **mantidas**
    (fallback continua exportado) + seção nova: assets do guerreiro
    carregados (dimensões, não-vazio, transparência nos cantos),
    fallback procedural p/ as demais classes, e raridade trocando a
    cor do acento da arma;
  - contrato da Apar remapeado: `clique(706,96)` (linha Pele) morre
    — substituído por asserts da caixa da prévia + rótulo da classe;
  - `grade.js`: seção nova **inspecionando o sprite novo** (dump em
    grade + spot-checks: corpo opaco, contorno, pés na última
    fileira); asserções antigas seguem (procedural);
  - `testes/previa-assets.js` novo (folha dos assets novos p/ QA
    visual) registrado no `todos.js`;
  - `cena.js` regenerado e **olhado** (tela-jogo, tela-aparencia);
  - gate `node testes/todos.js` verde.

- **R-VHS-9 (docs)** — `STATE.md` (reversão + lições), `CHANGELOG`
  em `[Unreleased]`, `tasks.md` da spec, commit Conventional
  Commits pt-BR.

## Design canônico do guerreiro (piloto)

Referência visual = o guerreiro atual (zoom `previa-zoom.png`),
redesenhado com mais detalhe: **couro `#6b4a2e`** (botas/cinto),
**metal `#a8b8cc`** (peitoral/ombreiras com especular),
**dourado `#d9a62a`** (fivela/faixa), **tecido azul `#3a5a8c`**
(túnica), **contorno `#1b1424`**, pele `#e0a878`, cabelo castanho
curto; luz única **topo-esquerda**; **3/4 olhando à direita**; mão
direita fechada (segurar a arma composta); **sem arma no sprite**.

## Fora de escopo (próximas levas)

- **Leva 2**: mago/ladino/clerigo (3 gerações + animações), decisão
  sobre remover o código procedural (ou mantê-lo como fallback
  permanente), fechamento da Apar.
- Monstros (3 formas × 10 espécies) · cenário · ícones de item ·
  demais usos de `p.look` (corpo/rosto do herói nas cutscenes etc.).

## Verificação

`node testes/todos.js` (gate) · `grade.js` (inspeção) ·
`previa-assets.png` + `cena.js` revisados visualmente (QA em
`JANELA=1280x400 node testes/cena.js` para a arena) · ES5 preservado
em `js/`.
