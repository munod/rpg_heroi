# Spec: Pressão de mortalidade — mortes como desafio, estol proibido

Status: **em execução** · Data: 2026-11-20 · Iniciativa: mantenedor
(*"mortes têm que fazer parte do jogo, para o jogador se sentir
desafiado a melhorar o gerenciamento [...] o jogo está muito fácil e
'não jogar' (modo offline) parece ser mais compensador"*).

## Contexto (medição)

- **Sim completa pós-levas: 0-2 mortes em 59h** (BASE 0 · DEF 2) — o
  build gerenciado praticamente não é desafiado. A alavanca foi
  apertada demais na correção do estol antigo (682 mortes/10h → 0).
- **Achado do mantenedor medido** (`RITMO_SEM_PONTOS`, seed1, 600min):
  sem distribuir pontos, fecha o mapa 1 (~150min, com mortes
  ocasionais — a memória de "não morre" cobre a janela inicial sem
  mortes) mas **trava no mapa 2** (onda 43 presa de 360→600min, 224
  mortes, projeção 223.705min vs 3.482min gerenciado) — **16 mapas de
  diferença em 10h**. A gestão importa desde cedo; o que falta é
  desafio pra quem **gestiona bem**.
- **Envelope medido do cliff** (`progressao-exponencial`): produto
  `ESC_HP×ESC_DMG ≤ 0,086` passa / `≥ 0,095` estola 4/4. Hoje:
  `1,25 × 0,037 = 0,0463` — **folga de ~1,9× em ESC_DMG** (teto
  teórico 0,069 mantendo ESC_HP 1,25).
- **Critério de estol formalizado** na emenda de
  `economia-de-pontos` (R-EDP-4): estol = progresso parado
  (dnv < 0,1 × 600min · onda ≥30min · sim sem vitória); mortes são
  mecanismo/corroboracão, **não** o critério.

## Requisitos

### R-PM-1 — ESC_DMG sobe dentro do envelope do cliff

- `Batalha.ESC_DMG: 0,037 → 0,055` (**valor final calibrado** — a
  tentativa 0,06 reprovou; ver emenda abaixo). Alvo: **mortalidade
  visível p/ build gerenciado** (mortes recorrentes na fronteira/
  chefe) sem estol.
- **Calibragem**: se a sim estolar ou a duração inflar além da faixa
  → recuar um degrau. Medir com os instrumentos rápidos (projeção +
  sonda-fim) antes da sim completa — **a sonda da parede é o filtro
  real** (o produto do cliff não pegou a parede; ver emenda).

### R-PM-2 — Meta de mortes (emenda de design)

- **"0 mortes" deixa de ser alvo** (era o estado saudável pós-estol;
  virou "jogo fácil"). Meta nova: **mortes recorrentes na fronteira/
  chefe para o build gerenciado**, com o personagem se recuperando
  (−5 ondas ≠ espiral). Estol continua **proibido** pelos critérios
  da emenda R-EDP-4.
- A meta quantitativa é **definida pela medição** desta leva
  (faixa de mortes/240-600min observada em ≥4 seeds) — não inventada
  antes de medir.

### R-PM-3 — Medição (A/B obrigatório — alavanca de combate)

- **Funil rápido** (instrumentos da emenda R-EDP-4):
  1. `sonda-fim` (parede do fim, 16min): o build **skill (gerenciado)**
     ainda vence a parede com ESC_DMG novo? (**guarda anti-estol** —
     emenda: era `def`, reprovou em todo valor >0,037; ver abaixo)
  2. **4 seeds × 600min** por via (baseline 0,037 vs nova 0,06):
     mortes, dnv, atraso%, ttk, **projeção de vitória** — janela onde
     fronteiras de mapa ~18 já são atingidas
  3. **Sim completa** do vencedor (guarda de estol final)
- **Critério de aceite**: mortes do build gerenciado ↑ de forma
  **recorrente** (faixa medida) · sem estol · duração na faixa
  (candidato: ≤ +15% vs 57,2h — medir e decidir) · ttk/sobrevivência
  sanos (espera > 0, uptime ~100%).

## Emenda: calibragem medida + guarda = build skill (2026-11-20)

### Escada na parede (`sonda-fim`, 600min, seed 1 — 6 valores × 2 builds)

| ESC_DMG | def (mono-FOR) | skill (gerenciado) |
|---|---|---|
| 0,037 | 🏆 41,4min · 3 mortes | 🏆 36,0min · 0 mortes |
| 0,04 | ❌ 747 mortes (onda 1 presa) | — |
| 0,045 | ❌ 876 mortes | 🏆 36,1min · 0 |
| 0,05 | ❌ 1.021 mortes | 🏆 36,2min · 0 |
| 0,055 | ❌ 1.166 mortes | 🏆 38,1min · 1 |
| 0,06 | ❌ 1.324 mortes | 🏆 56,3min · 9 |

- **Achado metodológico**: o produto do cliff (`≤0,086`) **não pegou
  a parede** — 0,04 (produto 0,05) reprovou. O cliff foi calibrado
  p/ estol de campanha; a parede do mapa 100 é outra restrição
  (margem ~0 pro def). **Filtro real = sonda da parede.**
- **`def` não tem folga** acima de 0,037 (espiral na onda 1; resposta
  monotônica nos mortes = instrumento limpo). Só o `skill` aguenta
  dano novo — e ele é o **build gerenciado** da R-PM-2.

### Guarda emendada (aprovada pelo mantenedor, 2026-11-20)

- **Referência/parede = build skill** (gerencia os dois poços da
  `economia-de-pontos` — o playstyle validado pelaquela leva). `def`
  vira **hard mode documentado**: quem ignora skills estola na parede
  do mapa 100 (dá pra respecar/competir skills — sem soft-lock).

### A/B campanha (4 seeds × 600min, `RITMO_SKILL=1`)

| Via | ondas méd | mortes [intervalo] | proj duração | Δ |
|---|---|---|---|---|
| 0,037 baseline | 1.788 | 0 [0-0] | 3.403min | — |
| **0,055 (final)** | **1.782** | **0,8 [0-2]** | **3.391min** | **−0,4%** |
| 0,06 (reprovado) | 1.519 | 37,5 [0-146] | 4.433min | +30,3% |

- **0,06 reprovado no A/B** (não só na parede): s4 entrou em
  **espiral de 146 mortes** (mapa 3 preso 6h — −10% de ouro composto
  por morte fomeia o aprimoramento → fraco → morre mais; recupera
  sozinha no fim, mas duração média +30% ≫ +15% do critério).
- **0,055 aprovado**: 4/4 igual ao baseline, duração idêntica,
  **3 mortes somadas vs 0** (s1: 2 · s3: 1) — pressão presente sem
  variância destrutiva. `def` @0,06 em campanha: progressão idêntica
  (mapa 18 = baseline), mortes 0→1-3, sem estol (dose-resposta de
  apoio — a campanha aguenta; só a parede é apertada pro def).

## Fora do escopo (deliberado)

- `ESC_HP`, densidade de monstros (`ESC_MONSTROS_K`), penalidade de
  morte (`ritmo-punitivo`), regen — **intocados** (uma alavanca por
  decisão; o cliff é sobre o produto, mexer em duas de uma vez impede
  isolar a causa).
- Nada de XP/curvas (leva `economia-de-pontos`).
- Offline (`AUSENCIA_*`) — a correção do "offline compensa" é a
  gestão importar (medido: ela importa), não nerfar a ausência.

## Verificação

`node testes/todos.js` (gate) · `node testes/ritmo.js` (projeção +
aborto ≥4 seeds) · `node testes/sonda-fim.js` (parede) ·
`node --check` em todo arquivo tocado · **ES5 preservado em `js/`** ·
docs (CHANGELOG, AGENTS — valor da constante, STATE, ROADMAP) ·
push só com aval do mantenedor.
