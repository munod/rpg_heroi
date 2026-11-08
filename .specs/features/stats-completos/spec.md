# Spec: Estatísticas completas + tooltips de skill/keystone (Leva 4)

Status: **concluída** (gate 3×, ritmo intacto) · Data: 2026-11-08 ·
Iniciativa: stats/tooltips (→ v0.3.0) · Decisão do usuário: "pacote
completo" de 7 stats + tooltips onde falta detalhe.

## Contexto

Fecha o plano de transparência: a aba Stats mostrava só 8 contadores de
vida; a economia nova (Levas A-C) movia ouro sem deixar rastro, e as
linhas de skill/keystone não explicavam nada sem o jogador já saber.

## Requisitos

- **R-STA-1 (7 stats)**: `Personagem.STATS` += `ouroGanho`,
  `ouroGasto`, `vendidos`, `sucateados`, `aprimoramentos`, `rerolls`,
  `lendarios` — incrementados **onde o ouro/investimento muda**:
  `Itens.conta()` em vender/sucatear/auto-sucata/aprimorar/reroll,
  `Batalha.stat(n)` em `mataInimigo` (ouro do abate, resgate do gatuno,
  lendário no drop) e nos gastos do keystone/respec (`personagem.js`).
  `normalizaStats` zera saves antigos (migração de graça).
- **R-STA-2 (tooltips)**: cada linha da aba Stats com tooltip
  (`Gestao.DESC_STATS` — o que a contagem mede); **skill**
  (`Skills.dicas`: nível, tipo e o efeito com os números dos campos);
  **keystone** (tradeoff + níveis/custos + ponteiro p/ o breakdown do
  rodapé).

## Verificação

- Seção 31 da fumaça (11 confs): increments exatos (+15 venda, +3
  sucata, +3 auto-sucata, +25 aprimoramento, +30 re-roll), lendário
  contado pela seção 28, ouroGanho > 0, e os 3 tooltips abrindo por
  hover (com botão keystone desativado sem ouro = sem efeito colateral).
- Gate 3× · ritmo 15min na faixa (UI/dados, sem poder novo).
