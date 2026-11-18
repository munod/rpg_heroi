# Spec: Mundo full screen + UI flutuante (referência: Leveling Idle 2D)

Status: **em execução** (gate = `node testes/todos.js`, 5 arquivos) ·
Data: 2026-11-17 ·
Iniciativa: mantenedor — *"Vamos agora trabalhar no visual da UI e do
mundo do jogo. O mundo agora vai ser full screen, sem zoom para não
distorcer. As janelas devem ser flutuantes e a HUD continua na tela do
mundo. Vamos ter um menu de botões, que devem conter as abas. Pesquisa
online sobre a UI do levelingidle2d como referência. Vamos deixar tudo
lindão!"*

## Referência (Leveling Idle 2D — 2 screenshots oficiais analisados)

- **Mundo cobre 100% da tela**; tudo o mais é overlay flutuante.
- Canto sup. esquerdo: card do personagem (nível, barras, stats) —
  escuro, arredondado, flutuando sobre o mundo.
- Canto sup. direito: fileira de botões de sistema + botão MENU.
- Base central: barra estilo *skill bar* com as ações (= nosso menu
  de abas).
- Modal central: janela flutuante escura translúcida com barra de
  título + botões de fechar; **o jogo continua rodando atrás**.
- Finais de barra/progresso na borda inferior.

## Decisões do mantenedor (levantamento — respondidas na sessão)

1. **k=1 nativo** — 1 unidade de mundo = 1 px de canvas; a tela
   mostra `W×432` unidades (768×432 em 16:9 ≈ 4,8× mais área que a
   janela antiga 192×134). Sem ampliação, sem distorção (escala 1:1).
   Consequência aceita: sprites pela metade do tamanho atual na tela.
2. **Barra inferior fixa** com os 5 botões de aba (estilo skill bar
   da referência) — no lugar da fileira de abas dentro do painel.
3. **Janela da Gestão à direita, mesma posição** (408,36 · 352×300) —
   conteúdo interno e ~100 coordenadas de clique preservados; vira
   janela flutuante de verdade (sombra, cantos, barra de título com o
   nome da aba, botão X).
4. **Aumentar o anel de spawn** — o anel antigo (110-132px) nasce
   DENTRO da tela nova; o anel novo fica fora da janela visível.
   **O anel é alvo de ritmo**: medir com `ritmo.js` (≥4 seeds) e
   reportar drift ao mantenedor ANTES de qualquer reequilíbrio
   (rebalance = decisão separada; levers documentados no AGENTS).
## Requisitos

### R-MF-1 — Mundo full screen sem zoom (Fase A)

- `Batalha.desenhar(ctx, 0, 0, W, 432)` passa a ser o canvas inteiro;
  **k = 1** (1 un. de mundo = 1 px de jogo) — sem ampliação e sem
  distorção (escala uniforme preservada).
- `VW/VH` deixam de ser constantes 192×134: a **largura segue
  `Game.W`** (dinâmica, resize) e a altura é o design fixo **432**.
  Afeta: `alvoCamera` (herói centralizado na tela), `aviso`,
  `semearPoeira`, wrap da poeira, faixa de chunks visíveis,
  `info().janela`.
- **Região ativa de obstáculos** passa a ser janela-dinâmica
  (raio em chunks derivado da janela + anel de spawn + margem de
  sprite): **5×5 chunks = 1920×1340** em 16:9 (era 3×3 = 1152×804).
  `info().mundo` acompanha. `atualizaObstAtivos` reconstrói também
  quando o raio muda (resize).
- `jogo.js`: **remove o painel da arena** (`UI.panel(8,36,392,300)`);
  o mundo vira o fundo da cena; o título `NOME — MAPA n` (com cursor
  piscante) migra para o canto superior esquerdo, abaixo do cabeçalho.
- HUD do herói dentro de `desenhar` (barra de HP, contador de onda,
  PRÓXIMA ONDA/TEMPO) reposicionada para o novo layout: topo-esquerdo
  abaixo do cabeçalho (y≥36) e alinhada à direita na borda esquerda
  da janela da Gestão (`Game.W - 360 - 8`) — nunca por baixo dela.
- Aviso grande (ONDA/CHEJE/MAPA): reposicionado para30% da altura
  (abaixo do cabeçalho) e centrado na área livre (fora da janela da
  Gestão).
- **Fontes em espaço de mundo**: o estilo `big` do `Efeitos.nota`
  (aviso/banner — âncora de tela, não de sprite) dobra de tamanho
  (10→20px, sobe 16→32) para manter presença; `normal`/`crit`
  (dano — ancorados no sprite) mantêm8/11px: com k=1 a razão
  número:herói fica idêntica à antiga e bate com a referência
  (~14px de dano num herói de ~45px).
- PoEira:36 → **150 motes** (densidade proporcional à área nova).

### R-MF-2 — Anel de spawn fora da tela (Fase B)

- `spawn()` ganha raio dinâmico: `√((W/2)² + (432/2)²) + margem` —
  em 16:9 ≈ **460-480px** (era 110-132). O anel passa a nascer fora
  da janela visível em QUALQUER direção.
- **Ritmo**: `node testes/ritmo.js` × ≥4 seeds, comparar com os
  alvos registrados (nv10 ~3,5min · nv30 ~8,6min · 15min=nv60 ·
  mapa1 ~20min · clear p95 · atrasoPct 0). **Relatório de drift ao
  mantenedor antes de qualquer reequilíbrio.**
- Geometria da seção do gatuno (`fumaca`, spawn a 110px com RNG
  zerado) reajustada ao anel novo — e o **limite de fuga do Gatuno
  deriva do anel** (`raioSpawn() + 120`, era `240` fixo no anel
  110-132; teto fixo faria o ladrão nascer "escapado").

### R-MF-3 — Janela flutuante + menu de abas (Fase C)

- `UI.janela`: receita nova (sombra + raio + barra de título + X) no
  padrão já estabelecido — *teste vê quadrado/chapado, navegador vê
  arredondado/translúcido* (α≈0,88 sobre o mundo).
- `Gestao.desenhar` vira janela flutuante: **título = nome da aba**,
  botão **X** fecha, estado `aberta` (padrão **aberto** — testes
  clicam conteúdo direto), `Gestao.update` (+/− de atributo) só roda
  com aberta. Conteúdo de y≥80 **intacto** (coords preservadas).
- `Gestao.barra(ctx)` — nova barra de abas **centrada no rodapé**
  (5 botões; centros 240/312/384/456/528 · y=418 em W=768) +
  `Gestao.abasGeom()` (precedente: `statsGeom`) p/ testes.
  Clicar abre/troca a janela (**sem toggle na aba ativa** — cliques
  repetidos dos testes não podem fechar a janela por acidente); o
  `[X]` da barra de título fecha.
- **Título do cabeçalho vira card flutuante no canto** (decisão do
  mantenedor): `HERÓI IDLE` sai da faixa; o card concentra
  `NOME — MAPA n · Nv · XP · Pontos`; **Opções vai para o canto
  superior direito** (`W-72, 8`).
- **Toast/aviso sai de y=405** (colide com a barra nova) →
  **topo-centro** (y=4..30), desenhado por cima (comportamento
  atual preservado). Assinatura `Gravacao.desenharAviso(ctx, dica,
  y, minX)`: no jogo `minX=408` desloca o pill **à direita do card**
  (senão a dica persistente cobriria o título para sempre — texto
  ≤33ch p/ caber antes do Opções) e na seleção `y=340` usa a faixa
  livre acima do rodapé (o topo tem o campo de nome).
- `linhaStatus` ganha fundo translúcido (texto sobre o mundo).

### R-MF-4 — Testes e verificação (em todas as fases)

- `fumaca:1211` → janela `768×432` / mundo `1920×1340`.
- Câmera (`fumaca:1221+`): adapta lendo `info().janela` (assinatura
  mantida — `cam = herói - janela.w/2` continua válida com janela
  dinâmica).
- **~56 cliques de aba em `fumaca` + ~10 em `cena`** remapeados:
  `(445|515|585|655|725, 50)` e `(412+i*70+33, 54)` → centros da
  barra; wide-screen: barra centrada desloca **dx/2** (hoje usam
  `+dxL`) — usar `Gestao.abasGeom()` ou calcular de `Game.W`.
- Opções: `(584,15)` → `(W-40,20)`.
- Conf novo: `[X]` fecha a janela / clique na barra reabre.
- `node testes/todos.js` verde ao fim de CADA fase; QA visual em
  `testes/previa-assets.png` + `cena.js` (pendente do mantenedor).

## Fora de escopo

- Reequilíbrio de ritmo (só após relatório de drift + decisão do
  mantenedor).
- Redimensionar/reordenar o conteúdo interno da Gestão.
- Cenas seleção/ranking/cutscene (seleção recebe a mesma barra e
  janela por compartilharem a Gestão; o resto não muda).
- Mobilidade (arrastar janelas).

## Verificação

`node testes/todos.js` (gate,5 arquivos) · `node testes/ritmo.js`
(≥4 seeds, p/ R-MF-2) · `previa-assets.png` + `cena.js` revisados
visualmente · ES5 preservado em `js/`.
