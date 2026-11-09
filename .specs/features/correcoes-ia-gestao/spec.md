# Spec: Correções de IA/combate + gestão de itens (lote de bugs)

Status: **concluída** (gate 3×, 26 confs novas, ritmo na faixa —
6 runs ~47-48min) · Data: 2026-11-08 · Iniciativa: correções
apontadas no playtest · Decisões do usuário: executar tudo junto ·
auto-reroll **fora** (escopo: só auto-aprimorar) · fixar item = 1
checkbox **por slot** · IA = só fixes + melhorias pontuais · stats base
= formato pesquisado (D3/D4).

## Contexto

Playtest apontou 4 bugs e 3 melhorias. Investigação com a skill
`systematic-debugging` (reprodução + medição no harness **antes** de
qualquer fix) encontrou as causas-raiz:

1. **Ranged não ataca colado** — `atualizaHeroi`: `foge = (kite &&
   dist < 0.7×alc)` bloqueia o golpe nessa faixa; medido: **7815 frames
   com inimigo colado → 0 golpes iniciados**. Pior com o bug 2 (não
   cria distância → nunca sai da faixa).
2. **INT alta encurrala no vértice** — destinos de fuga (`recuar` 90px,
   `kite` 24px) sem clamp: **77% dos frames de fuga tinham destino fora
   do mapa** → herói empurra a parede para sempre; no estado `recuar`
   ele **nunca ataca**, então vira saco de pancada.
3. **DES morre em ~17 pontos** — ciclo real do golpe =
   `max(atkT=0.36 fixo, recarga)`; medido: intervalo 30 frames (des 8)
   → **23 frames e plateau (des ≥ 20)**. O piso documentado (0,15s,
   des ≈ 62) nunca é alcançado.
4. **Tooltip do `−`** — `UI.dica` da linha de atributo cobre
   x=416..716; botão `−` em 684..708 (**dentro**), `+` em 716..740
   (fora, por 1px) — segurar `−` >250ms abre a caixa.

## Requisitos

- **R-COR-1 (ataca colado)**: herói à distância ataca mesmo com o
  inimigo `< 0.7×alcance` (tiro point-blank) — `foge` só decide
  MOVIMENTO, nunca bloqueia o golpe.
- **R-COR-2 (fuga nos limites)**: destino de `recuar`/`kite` é
  **clampado** aos limites do mundo (margem 16px); se o herói não
  consegue criar distância (destino < 24px — encostado na parede),
  **ataca** em vez de ficar parado (`recuar` deixa de ser gelo total).
- **R-COR-3 (DES vale até o piso)**: `atkT` do golpe passa a ser
  `min(0.36, recarga)` (com `hitDone`/frames relativos à duração
  real) — ciclo = recarga em qualquer DES, piso 0,15s intacto.
- **R-COR-4 (tooltip do `−`)**: `UI.dica` da linha de atributo não
  cobre os botões `−`/`+` (largura encurtada até x < 684).
- **R-GES-1 (fixar slot)**: checkbox por slot (`[x]` na aba Itens) —
  `equiparSeMelhor` ignora o slot fixado; troca manual (clique na
  bolsa) continua liberada; flag persistida com default `false`.
- **R-GES-2 (auto-aprimorar)**: checkbox `Auto A+ [x]` na aba Itens —
  quando ligado, `Gestao.update` gasta ouro no `A+` do slot de **menor
  custo** (arma/armadura alternam), respeitando teto `MAX_UP` e saldo;
  **padrão OFF**; contador `aprimoramentos`/`ouroGasto` conta normal.
- **R-GES-3 (stats base → total)**: bloco novo na aba Stats no padrão
  D3/D4 (`Life: 143/143 (15+108+20)` / `Strength (Item Contribution)`):
  atributos `investido → efetivo` e derivados
  `Dano 46->120 · HP 180->412`, com delta explicado no tooltip da
  linha; fonte = `statusDetalhado` (campos `base` numéricos novos) +
  `efetivos()` — **fonte única, teste soma**.

## Fora de escopo

- Auto-reroll (usuário cortou), durabilidade/reparo (não existe),
  reestruturação da IA, novos modificadores de atributo.

## Verificação

- Fumaça **seções 32** (bugs: ranged colado ataca · destino nunca
  fora do mapa · DES ≥ 40 dá ≥1,5× golpes de DES 8 · tooltip do `−`
  não abre com o botão) e **33** (fixar slot · auto-aprimorar liga/
  desliga · bloco base→total com soma exata).
- `todos.js` 3× · `ritmo.js 15` na faixa (mudança de ataque afeta DPS:
  medir) · sem quebra dos cliques existentes na aba Itens.
