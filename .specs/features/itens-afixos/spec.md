# Spec: Itens com afixos — mods positivos e negativos (Leva A)

Status: **concluída** (gate verde 3×, ritmo na faixa) · Data: 2026-11-08 ·
Feature pai: `gestao-estrategica` (R-GES-1) · Versão alvo: 0.2.0

## Contexto

Hoje `js/itens.js` tem lista fixa de modelos com bônus fixo, 3 raridades e
4 chaves positivas (`dano, hp, vel, crit`); o auto-equip compara a soma e o
jogador praticamente não decide nada. Pesquisa (Diablo 2/PoE, Last Epoch,
Scope RPG, Game Mechanics Hoard): raridade deve definir **quantos afixos
rollam**, o pool deve ser **enxuto** (armadilha do affix bloat), **mods
negativos** criam a decisão que o auto-equip sozinho não dá, **smart-loot**
evita drop inútil e **deltas por stat** são obrigatórios para leitura
rápida.

## Requisitos

- **R-AFI-1**: sistema de afixos em `js/itens.js` — a raridade define a
  quantidade de afixos rollados: **comum = 0, incomum = 1, raro = 2**
  (sem duplicata no mesmo item). Cada afixo tem `chave`, `valor` (faixa
  sorteada), `neg` (bool) e `nome` (prefixo ou sufixo); o nome final do
  item = `prefixo? + nomeBase + ?sufixo`.
- **R-AFI-2**: **mods negativos** — em itens rar ≥ 2, cada rolagem de afixo
  tem ~30% de chance de sair negativa (**teto de 1 negativo por item**),
  com magnitude 1,5× a de um positivo (tradeoff compensa). O `bonus`
  resultante pode ficar negativo numa chave — item "amaldiçoado" que o
  auto-equip (soma assinada) recusa, mas o jogador pode equipar à mão.
- **R-AFI-3**: **smart-loot** — afixos positivos pesam as chaves da classe
  do herói (guerreiro: dano/hp · mago: dano/crit · ladino: vel/crit ·
  clérigo: hp/dano) com 70% de probabilidade; negativos e chaves restantes
  em 30%. `sorteiaDrop(mapa, chefe, classe)` — sem classe, peso uniforme
  (compatível com chamadas antigas).
- **R-AFI-4**: **UI de deltas na aba Itens**: linha da bolsa mostra
  `deltas(item, equipado[slot])` (item − equipado por chave, ex.
  `+5D -12HP +3V`); cabeçalhos dos slots passam a mostrar o `resumo` do
  item equipado. Clique na linha continua **equipando direto** (sem
  seleção intermediária — contrato dos testes preservado).
- **R-AFI-5**: auto-equip (`equiparSeMelhor`) continua automático, mas com
  **soma assinada** (negativos contam contra) — decisão estratégica fica
  na troca manual e no descarte.
- **R-AFI-6**: migração de save **sem mudar chaves** (`rpg_personagens_v1`
  permanece): `Personagem.normalizaItem/normalizar` passam a aceitar
  valores negativos (com teto de magnitude) e o array `afixos` de itens
  legados; item antigo sem afixos continua válido. `Personagem.status`
  ganha clamps defensivos (hpMax ≥ 10, crit ≥ 0, vel ≥ 10, dano ≥ 1) e o
  corte de nome sobe de 24 para 40 caracteres (nomes com afixo).
- **R-AFI-7**: `p.personagem` — nada de dependência nova: `personagem.js`
  segue sem importar `itens.js` (chaves de bônus espelhadas, já existente);
  `itens.js` mantém `ARMAS/ARMADURAS/CHANCE/BOLSA_MAX` exportados (testes).

## Fora de escopo

- Slots novos (amuleto/anel), venda/ouro/aprimoramento (Leva B),
  lendários (Leva D), qualquer mudança de balanceamento de curva.

## Verificação

- Gate `node testes/todos.js` verde (193+ asserções; seção 15 ampliada).
- Testes novos na fumaça (seção 15): raridade → qtd de afixos; teto de 1
  negativo; smart-loot por classe (estatístico, 70% esperado — folga
  ampla p/ não flakar); delta de UI na linha da bolsa; migração de save
  com item negativo (importarJSON/normalizar).
- `node testes/ritmo.js` **só se mexer em poder** — afixos são bônus novo;
  rodar 15min e comparar com faixa alvo (nv30-35/onda40-60) antes do
  commit; se estourar, reduzir faixas de afixo (não a curva base).
- `node testes/cena.js` regenera screenshots da aba Itens.
