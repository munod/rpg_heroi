# Spec: Economia com ouro — venda, salvagem, aprimoramento, re-roll (Leva B)

Status: **concluída** (gate verde 3×, ritmo na faixa) · Data: 2026-11-08 · Feature pai:
`gestao-estrategica` (R-GES-2) · Versão alvo: 0.2.0

## Contexto

Hoje não existe moeda: item indesejado é lixo (bolsa cheia descarta o mais
antigo em silêncio) e não há porque olhar duas vezes um drop. A pesquisa
(Melvor, Scope RPG, Ash & Oath, Game Design Lab) fecha o loop: **todo
drop tem valor mínimo** (venda/salvagem), e **sinks** (aprimoramento,
re-roll) criam o dilema "melhorar o atual ou caçar o próximo" — exatamente
a decisão que faltava na Leva A.

## Requisitos

- **R-ECO-1**: **ouro** cai de todo abate em `Batalha.mataInimigo`
  (`p.ouro`, escala com `Mapas.forca(mapa)` × onda, chefe ×8) e aparece
  na linha da aba Itens (`Ouro N · Bolsa x/10`).
- **R-ECO-2**: **venda** (`Itens.vender`: 25% de
  `valor = max(1, soma assinada) × 6`) e **salvagem**
  (`Itens.sucatear`: piso garantido `max(3, 2 × rar × escala)`),
  botões `V`/`S` por linha da bolsa — venda vale p/ item bom, sucata p/
  item ruim. **Bolsa cheia vira sucata automática** (o mais antigo sai
  por ouro, nunca em silêncio).
- **R-ECO-3**: **aprimoramento** (`Itens.aprimorar`): custo
  `25 × (up+1)²`, teto `MAX_UP = 8`; efeito **+8% por nível** nos bônus
  do item (multiplicador aplicado em `Personagem.bonusEquipamento`,
  constante **espelhada** `APR` nos dois arquivos — `personagem.js` não
  depende de `itens.js`). Auto-equip compara por
  `pontuarEfet` (soma × (1+0.08×up)) — item aprimorado defende a vaga.
- **R-ECO-4**: **re-roll** (`Itens.reroll`): custo
  `10 × rar × escala × (1 + 0,5 × rerolls)`; substitui **um afixo** — o
  negativo se houver (novo rol **só positivo**: saída de maldição
  garantida), senão um aleatório (novo rol **comum, pode sair neg**:
  aposta) — respeitando teto de 1 neg, tipos pre/suf livres e smart-loot;
  nome recalculado de `item.base`.
- **R-ECO-5**: **UI na aba Itens**: cabeçalhos dos slots ganham botões
  `A+custo` (aprimora) e `R+custo` (re-roll); linhas da bolsa ficam
  `principal(272px) | V | S`; legenda `V=vende · S=sucata · A+=aprim. ·
  R+=rer.`; ações disparam toast (`Gravacao.msg`). Clique-equipa
  preservado (linha ainda começa em x=416).
- **R-ECO-6**: persistência com migração **sem bump de chave**:
  `p.ouro` (novo/normalizar, piso 0) e nos itens `up`, `rerolls`,
  `escala`, `base` (com defaults p/ saves da Leva A e anteriores).

## Fora de escopo

- Segunda moeda/materiais, loja, compra de itens, venda de equipados
  direto (vende-se após trocar), confirmação de venda, lendingários.

## Verificação

- Gate `node testes/todos.js` (seção 15 ampliada ou nova seção): ouro de
  abate, venda/sucata (piso), sucata automática da bolsa cheia, custos e
  efeito do aprimoramento no `status`, re-roll determinístico com RNG
  stubado (nome/afixos/contador), migração dos campos novos, UI (cliques
  em `V`, `A+custo`, linha `Ouro`).
- `node testes/ritmo.js 35` — ouro não entra no poder baseline (ritmo não
  gasta), mas o handler de kill mudou: reconfirmar faixa (42s / nv30-35 /
  onda40-60 / mapa 1 em 25-35min).
- Números de custo/recompensa são **constantes de calibração** — ajuste
  fino fica documentado em STATE se houver playtest.
