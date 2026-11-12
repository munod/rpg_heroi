# Spec: Gestão de atributos — pontos escassos, soft caps e Carisma redefinido

Status: **em execução** · Data: 2026-11-11 · Iniciativa: série de
implementações (leva de correção de curvas, antes de monstros novos).

Decisões do usuário (fechadas na conversa):
- **Ritmo: 1 ponto a cada 3 níveis** (hoje: 3 por nível)
- **Teto de nível: mantido em 9500** (progressão longa preservada — a
  alternativa "teto 101" foi calculada e rejeitada por exigir
  rebalanceamento completo e perder os 222h validados)
- **Soft caps: sim** em todos os stats que quebram
- **Teto da velocidade: 250 px/s** (delegado a mim)
- **Carisma: opção (a)** — sai do XP, vira `+ouro` universal e vira o
  `danoMod` do clérigo

## Contexto (auditoria medida)

Relato de jogadores: *"nem ligam pra quantidade de pontos que estão
colocando nos atributos"*. Auditoria das 5 curvas do `Personagem.status`
encontrou o padrão **"teto onde alguém pensou, sem teto onde ninguém
pensou"** (a literatura de idle/RPG chama isso de *linear stacking breaks
games at the extremes*):

| Stat | Forma | Teto |
|---|---|---|
| velocidade | `46 + DES×3` linear | ✗ **não** → Flash no nv 30 (331 px/s) e **357 sub-passos/frame** no teto (bug de FPS projetado pelo mantenedor) |
| XP mult (CAR) | `1+(car−8)×0,03` linear | ✗ **não** → 3,6× no nv 30, **855×** no teto (a progressão real NÃO é a calibrada) |
| HP + regen | `con×4 + nv×6`, regen 4%/s ∝ HP | ✗ **não** → 2.800 hp/s no teto = invencível contra 1-2 inimigos |
| crítico | `4 + DES×1,3` | ✅ clamp 45 |
| recarga | `max(0,08; 35/vel)` | ✅ piso = teto 12,5 g/s |

**Causa raiz do relato**: 3 pontos/nível = **6 decisões por minuto** no
early, valendo ~1% cada → decisão vira ruído e o jogador distribui no
automático. E o `ritmo.js` nunca pegou nenhuma dessas falhas porque
investe **tudo em FORÇA** (nunca em DES/CAR/CON).

Fontes consultadas: *Exponential vs Logarithmic Scaling* (HustleTycoon),
*Idle Game Design* (missionszanx), *Soft caps/diminishing returns*
(Game Mechanics Hoard — "without caps, optimal play is always maximal
specialization").

## Requisitos

- **R-GA-1 (ritmo de pontos: 1 a cada 3 níveis)**:
  `ganhaXP` (`batalha.js`) deixa de dar `+3` por nível e passa a dar
  **+1 a cada 3 níveis** (contador por evolução — vários níveis num
  mesmo lote precisam creditar certos). Resultado: **0,7 decisões/min**
  (era 6) e ~**6% de peso por ponto** no nv 30 (era ~1%). O rodapé da
  aba Atributos anuncia a cadência nova.
- **R-GA-2 (soft cap da velocidade + teto 250)**:
  - Forma: **`vel = 46 + k × DES^0,35`** (potência saturante; `k`
    calibrado para **70 px/s em DES 8** = início idêntico ao hoje, e
    ~241 px/s em DES 3.174 = fim da campanha mono-stat).
  - **Clamp final de 250 px/s aplicado DEPOIS de item + keystone**
    (o afixo `Veloz` dá +1.968 no mapa 100 — sem o clamp ele contorna
    o teto). Teto escolhido por: 3,6× o início, cruzar o mundo em
    1,54s, 7,1 g/s (abaixo do piso 12,5), **2 sub-passos/frame** e 17%
    abaixo dos 331 chamados de "Flash".
  - **`statusDetalhado` espelha a mesma fórmula** (regra dos espelhos).
- **R-GA-3 (afixo `vel` limitado)**: o bonus de velocidade dos itens
  passa a ter **escala limitada** (senão o clamp de 250 desperdiça o
  afixo inteiro no late). Regra: o item dá velocidade útil enquanto o
  atributo está abaixo do teto — mono-DES desperdiça, build distribuída
  aproveita (**incentivo natural a distribuir**, que é o objetivo).
- **R-GA-4 (regen com teto)**: a regen percentual (`hpMax × 4%/s`)
  ganha **teto em hp/s** — o HP em si **não muda** (ele sustenta a
  frente contra a dificuldade linear, que é `1+tot×ESC`). Corte no
  early: **zero** (regen early ≈ 6 hp/s); só limita o late (2.800 →
  teto). Valor a calibrar por medição; critério: manter mortes como
  **eventos** na sim (referência: 6 mortes em 2400min).
- **R-GA-5 (Carisma redefinido)**:
  - **Remove `xpMult`** (fonte: `status`, `ganhaXP`, `statusDetalhado`,
    tooltip da aba Stats, da gestão) — a progressão volta a ser
    exatamente a calibrada (`12 × 1,064^onda`), sem multiplicador de
    build.
  - **Vira `+ouro de abate` universal**: multiplicador **logarítmico**
    (`1 + k×ln(1+max(0,car−8))`, k≈0,22) — cresce rápido no início e
    satura (1× em car 8 → 2× em ~100 → 2,75× no fim; nunca explode).
  - **Clérigo: `danoMod: 'for' → 'car'`** (fé converte em dano sagrado)
    + bônus de classe ajustado (FOR sai do clérigo, CAR/CON sobem).
    Demais classes: o Carisma vale pelo efeito de ouro.
- **R-GA-6 (metas de sanidade — hoje não existem)**: asserções novas na
  fumaça cobrindo o que nunca foi coberto: `vel ≤ 250` em qualquer
  build (inclusive mono-DES no teto + item), sub-passos ≤ 3 por frame,
  golpes/s ≤ 12,5, `xpMult` eliminado, regen ≤ teto, e o
  `statusDetalhado` fechando a conta (Σpartes × keystone === status).

- **R-GA-7 (compensação 9× — nasceu da medição do T9)**: com 1 ponto
  a cada 3 níveis o jogador tem **9× menos pontos** (0,33 vs 3,0 por
  nível) — sem compensar, o `ritmo.js` mediu **ESTOL** (1200min: mapa 3,
  223 mortes, +0,1 nv/min vs referência no mapa 4 em 120min com 0
  mortes). Solução: `Personagem.ganhoAtributo(at, at0, porPonto)` —
  **até a base do personagem** (8 + bônus de classe) vale o linear
  antigo (atributo baixo **paga a penalidade** — fixture de vidro
  continua de vidro), e **acima dela cada ponto vale 9×**. Efeito:
  cada decisão importa 9× mais (o objetivo do mantenedor) e a
  progressão de poder fica **idêntica à medida** (nv1 = 10/58/14 ·
  nv79 = 127/1462 · nv9500 = 14.257/171.028 — batem com a curva de
  3 pontos/nível). Aplicado a dano, HP e crítico (o clamp 45
  continua; a velocidade NÃO compensa — é saturante por design).

## Fora de escopo

- Teto de nível (mantido **9500**) · curvas de XP (`146×1,07^nv`) e de
  renda (`12×1,064^onda`) · `esperaOnda()` e o alvo de 222h · escala de
  monstros `k=0,5` · clamps já existentes (crítico 45, recarga 0,08) ·
  monstros novos/cutscenes/árvore de skills/IA (levas seguintes) ·
  **`ritmo.js` como decisor de sensação** (suspenso pelo mantenedor).

## Verificação

- **Seção 40 da fumaça** (nº a definir): ritmo de pontos (nv 3 → +1,
  nv 6 → +1, lote de 3 níveis numa leva só), soft cap (70 no início ·
  ~241 mono no fim · **clamp 250 com item estourando** · sub-passos ≤3),
  afixo `vel` limitado, regen ≤ teto, Carisma (ouro log: 1×/2×/2,75× ·
  `xpMult` sumiu · clérigo escala em CAR e NÃO em FOR), espelho do
  `statusDetalhado`.
- Reparo do que quebrar: seções 2 (+3 pontos), 7 (carisma multiplica
  XP), rodapé (`Cada nível: +3 pontos`), Stats (`XP×`), tooltips.
- `node testes/todos.js` **3×** · **medição comparativa** com o
  `ritmo.js 2400` contra a **run de referência** (mapa 35, 6 mortes,
  ouro 59M, +0,9 nv/min) — provar que a sobrevivência e o ritmo
  continuam dentro do validado · docs (CHANGELOG, AGENTS, STATE,
  ROADMAP) · commit.
