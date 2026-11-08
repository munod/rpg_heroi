# Spec: Drops, equipamento e aba Itens (backfill)

Status: **Entregue** — v0.1.0 · Commits: `e939927`

## Objetivo
Dar profundidade ao loot: itens que caem dos abates, se equipam sozinhos
quando são melhores que os atuais e gerenciam-se numa aba própria do painel —
tudo sem nenhuma tela extra (o jogo segue 100% automático).

## Requisitos
- **R-ITM-1**: Novo `js/itens.js` com armas e armaduras em **3 raridades**;
  sorteio de drop a cada abate (25% com RNG natural) e chefe sempre dropando
  **2 itens de raridade ≥ 2** — commit `e939927`.
- **R-ITM-2**: Auto-equip por **pontuação**: equipa quando a soma dos bônus é
  maior que a do item equipado; o antigo volta para a bolsa — commit
  `e939927`.
- **R-ITM-3**: Bolsa com **teto 10** itens (o mais antigo sai) e
  `Itens.guardar`/`equiparSeMelhor` como API única — commit `e939927`.
- **R-ITM-4**: Bônus flat (dano/hp/vel/crit) escalado por `Mapas.forca` no
  momento do drop — o item nasce pronto e export/import carrega tudo — commit
  `e939927`.
- **R-ITM-5**: Modelo do herói ganha `equip`/`bolsa` (novo/normalizar com
  descarte de item malformado), `bonusEquipamento` entra no `status`
  (dano/vida/velocidade/crítico) e `lookDe` usa a arma equipada sobrepondo a
  da classe — commit `e939927`.
- **R-ITM-6**: `Gestao` vira 4 abas (Atrib/Apar/Classe/Itens) com rótulos
  encurtados e grade de cliques x=226/270/314/358; aba Itens mostra 2 slots +
  bolsa **paginada** equipando no clique da linha — commit `e939927`.
- **R-ITM-7**: Rebalance pós-itens medido com `ritmo.js`: `ESC_HP` 1,2 → 1,5 e
  `Mapas.forca` 0,75 → 1,0 (mapa N = ×N) — commit `e939927` (o `ESC_HP` foi
  depois a 1,85 em `642c638`).

## Verificação
- Gate `node testes/todos.js` (193 asserções no total hoje; 110 na época do
  commit).
- `testes/fumaca.js` **seção 3) export/import JSON**: round-trip de
  `equip`/`bolsa`, JSON antigo ganha `equip`/`bolsa` vazios, item malformado é
  descartado, bônus entra no `status` (dano/hpMax/vel/crit) e `lookDe` troca a
  arma visual; **seção 15) drops, equipamento e aba de itens**: drop real com
  `Math.random` zerado, `sorteiaDrop` válida, chefe com 2 itens rar ≥ 2,
  auto-equip compara pontuação (pior não substitui, melhor equipa e o antigo
  vai pra bolsa), armadura soma no `hpMax`, aba Itens abre com `Bolsa` e o
  clique na linha da bolsa equipa.
- `testes/cena.js` clica nas abas pela grade atualizada (capturas
  `tela-jogo*.png` com o painel de itens) — cliques das abas em `fumaca` e
  `cena` foram atualizados junto com a grade de 4 abas.
- `testes/ritmo.js` — medição do commit `e939927`: 1º nível **34s**,
  15min = **nv 33 / onda 59**, mapa 1 fechado em **28,8min** (na faixa).
