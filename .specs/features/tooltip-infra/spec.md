# Spec: Infra de tooltips + breakdown de modificadores (Leva 3)

Status: **concluída** (gate 3×, ritmo intacto)
· Data: 2026-11-08 · Iniciativa: stats/tooltips
(→ v0.3.0) · Decisões do usuário: tooltips em tudo que precisa de
detalhe, breakdown por fonte, **DPS básico com a conta visível**,
long-press 500ms no celular.

## Contexto

Pesquisa (PoE/D3/D4 + padrões de tooltip touch): resumo visível +
**detalhe por fonte no hover**; desktop = hover com delay; **touch =
long-press ~500ms com caixa retida**, acima do dedo; ordem fixa de
linhas (lição D4); tooltip desenhado **por cima de tudo**, sem hit-test
(nunca rouba clique dos testes). Hoje o rodapé é um texto único sem
`"porquê"` de cada número.

## Requisitos

- **R-TIP-1 (infra)**: `UI.dica(ret, linhas, cor?)` chamado durante o
  render (mesma convenção de retângulo LOCAL dos botões, com
  `deslocX` interno) + `UI.desenhaTooltip()` como **última coisa** no
  render de `jogo.js` e `selecao.js`. Desktop: hover com **delay 0,25s**
  (sem flicker), segue o cursor, clamp nas bordas. Celular: **segurar
  500ms sem arrastar** → caixa **retida** posicionada acima do dedo,
  toque fora fecha. Caixa = painel escuro + linhas 13px (ordem fixa,
  cores por raridade/sinal), **só primitivas do rasterizador**
  (`fillRect/strokeRect/text`) e **sem hit-test**.
- **R-TIP-2 (rodapé segmentado + breakdown)**: `UI.linhaStatus` vira
  segmentos hoveráveis (HP · Dano · Vel · Crít · Alcance · **DPS**) medidos
  por matemática monoespaçada (sem `measureText` — o rasterizador não o
  tem). Cada segmento abre o breakdown de
  **`Personagem.statusDetalhado(p)`** (fonte única, mesmo arquivo do
  `status`): cada stat com suas partes (base da classe · atributo ·
  itens(±aprimoramento) · keystone · teto), mais **agudeza (INT)**,
  **recarga**, **XP mult** e efeitos lendários ativos quando existirem
  (lidos dos campos `efeito` dos itens — sem dependência nova).
  **DPS básico** = `dano × (1 + crít/100) ÷ recarga` com a conta nos
  dados do tooltip.
- **R-TIP-3 (tooltips de conteúdo)**: (a) **atributos** (aba Atributos:
  o que cada atributo alimenta + valor atual); (b) **item completo**
  (cabeçalhos dos slots + linhas da bolsa): raridade/nome, bônus por
  chave, **afixos 1 a 1** (negativo em vermelho), efeito lendário por
  extenso, aprimoramento `up/max`, deltas vs equipado, venda/sucata e
  custos `A+`/`R+` — conteúdo montado em `Itens.dicas(p, item)`.
- **R-TIP-4**: testes novos (seção 30) cobrindo delay, long-press
  (touchstart segurado), cancelamento por arrasto, exatidão do
  `statusDetalhado` (partes somam o stat) e as linhas do tooltip de item;
  nada de testes antigos quebrados (tooltip é desenho puro).

## Fora de escopo

- Tooltips de skill/keystone/stats-da-aba (Leva 4), tooltip de
  inimigos/ondas, scroll dentro da caixa, sons.

## Verificação

- `node testes/todos.js` 3×; cena regenera screenshots; ritmo **não
  muda** (só UI/dados — reconfirmar 15min).
