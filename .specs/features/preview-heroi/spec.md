# Spec: Prévia do herói na tela de aparência

Status: **concluída** (gate = 704 + 2 novas confs = 706; screenshots tela-aparencia e tela-selecao-apar olhados) · Data: 2026-11-15 · Iniciativa: mantenedor
(sequência **B1→B4**; B1 `visual-monstros`, B2 `visual-cenario`).

## Contexto

- A **única** tela que muda a aparência é a aba **Apar** de `Gestão`
  (`desenhaAparencia`) — ela serve **tanto** a criação (com
  `o.criacao`, chamada por `selecao.js`) **quanto** o jogo (`jogo.js`).
- Nela você troca **pele, cabelo, estilo e roupa** e o texto só diz
  *"Muda na arena em tempo real"* — ou seja: **só dá pra ver o
  resultado entrando na arena** (e na criação, só depois do Enter).
- Espaço: as 4 linhas são contrato de teste (o `>` da linha Pele é
  clicado em `(706, 96)` pela fumaça) e ficam em `y = 104/136/168/200`;
  as dicas ocupam `x416..~560` em `y248/280/308`. **Livre**: o canto
  direito-de-baixo do painel (`x ≥ ~580`, `y ≥ 232`).

## Requisitos

- **R-VP-1 (desenho)** — `desenhaAparencia` ganha uma **caixa de
  prévia** no canto direito-baixo (`UI.panel`) com o sprite do herói
  a **×3** (pé na base da caixa), **sombra elíptica** e rótulo — o
  sprite sai de `Anim.hero(Personagem.lookDe(p), anim, quadro)`, ou
  seja, **reflete as 4 linhas na hora** (mesma fonte do desenho da
  arena, sem espelho).
- **R-VP-2 (animação)** — ciclo de ~4s: **idle** (2 frames, 0,35s)
  por 3s → **ataque** (3 frames, 0,36s) no último segundo; o relógio
  (`prevT += dt`) vive em `Gestao.update`, que roda **também na
  criação** (`selecao.js` chama) — antes dos `return` das abas.
- **R-VP-3 (sonda)** — `Gestao.previa()` devolve
  `{anim, quadro, caixa:{x,y,w,h}}` p/ teste e p/ futuros usos.
- **R-VP-4 (testes)** — fumaça: **a prévia anima** (frame muda ao
  correr 40+ frames) e a caixa fica **abaixo das linhas** (sem cobrir
  o contrato `(706,96)`); as asserções existentes da aba intactas.
  Screenshots `tela-aparencia.png` (jogo) e `tela-selecao.png`
  (criação) **olhados**.
- **R-VP-5 (docs)** — CHANGELOG/ROADMAP/STATE.

## Fora de escopo

Preview na arena/`selecao` fora da aba Apar · trocar de aba
automaticamente · preview de itens/armadura · qualquer mudança de
layout das 4 linhas (contrato de clique).

## Verificação

`node testes/todos.js` · `tela-aparencia.png` e `tela-selecao.png`
olhados (sprite grande + sombra + caixa, sem colidir com as dicas) ·
trocar pele/estilo na tela e ver o sprite mudar **sem** entrar na
arena (QA manual no navegador).
