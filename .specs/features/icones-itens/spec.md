# Spec: Ícones de item na aba Itens

Status: **concluída** (gate = 708 confs — 691 fumaca + 17 grade; tela-itens.png + folha 5 ícones × 4 raridades olhadas) · Data: 2026-11-15 · Iniciativa: mantenedor
(sequência **B1→B4**; B1 `visual-monstros`, B2 `visual-cenario`,
B3 `preview-heroi`).

## Contexto

- A aba **Itens** é **100% texto**: "Arma: …", "Armadura: …" e as
  linhas da bolsa são strings coloridas por raridade — não dá pra
  distinguir **espada de adaga de cajado** (nem o tipo de equipamento)
  sem ler. É o único lugar do jogo em que o item não tem imagem.
- Já existe todo o sistema pra fazer barato: `sprite.js` (grade +
  paleta + `rampa()`), `Anim` (cache por chave) e a **cor de raridade**
  `Itens.corRar(rar)` (hex pronto).
- Geometria da aba (contratos de clique da fumaça):
  - slot equipado: texto `x416, y96/y124` (não é botão — teste clica
    em `(500,96)` e espera **nada** acontecer), fixar `x640`,
    `A+` `x676`, `R+` `x718`;
  - linha da bolsa: botão `UI.button(416, y, 272, 26, …, align:left)`
    → texto em `x424`; testes clicam em **`(584, 216)`** e
    **`(584, 246)`** para equipar, `V` em `(707,189)`;
  - a linha usa `Itens.linha(item, atual, max)` com `max=33` e a
    string de **deltas (com `★` do lendário) vem DEPOIS do nome e
    nunca é cortada** (só o nome trunca) — as asserções `-15HP` e
    `★` dependem disso.

## Requisitos

- **R-II-1 (sprites)** — `Sprite.iconeCanvas(tipo, corAcento)` com
  **5 ícones 16×16** (`espada`, `adaga`, `cajado`, `martelo`,
  `armadura`) no mesmo sistema (grade de texto + `rampa()` de metal/
  madeira/couro + o **acento vindo da raridade**). Nativos (sem
  escala) para não pixelar fora de ordem.
- **R-II-2 (cache)** — `Anim.icone(tipo, cor)` com chave própria
  (mesma regra das outras caches).
- **R-II-3 (slots equipados)** — "chip" `UI.button(416, y, 24, 24)`
  com o ícone por cima e o texto **deslocado para `x442`** (`max`
  20→17 e 16→13 p/ não invadir o `fixar` em x640); tooltip cobre
  `x416..662`. Chip vazio quando não há item.
- **R-II-4 (linhas da bolsa)** — chip `UI.button(416, y, 24, 26)` +
  linha passa a `UI.button(444, y, 244, 26, …)` (texto em `x452`,
  `max` **33→29** — só o nome trunca, deltas/`★` intactos). Chip
  **clicável equipa** (mesma ação da linha).
- **R-II-5 (testes)** — fumaça verde **sem mexer em nenhum clique
  existente** (`(584,216)`, `(584,246)`, `(707,189)`, `(695,96)`,
  `(500,96)` = "não é botão") + asserção nova de que o ícone está
  desenhado (chips `drawImage` presentes na aba) · screenshot novo
  `tela-itens.png` **olhado**.
- **R-II-6 (docs)** — CHANGELOG/ROADMAP/STATE.

## Fora de escopo

Ícones de **afixo/buff** (o delta continua texto) · ícone de ouro/bolsa
· trocar `Itens.linha` por layout tabular · qualquer mudança de
raridade/coroamento dos textos (a cor continua `Itens.corRar`).

## Verificação

`node testes/todos.js` · `tela-itens.png` olhado (chip + ícone nas
duas linhas de slot e nas 5 da bolsa, texto sem colidir com `fixar`/
`V`/`S`) · conferir que `★` e `-15HP` continuam na linha (asserções
26/15 da fumaça).
