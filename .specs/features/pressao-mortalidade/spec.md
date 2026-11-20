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

- `Batalha.ESC_DMG: 0,037 → 0,06` (produto `1,25 × 0,06 = 0,075 ≤
  0,086`). Alvo: **mortalidade visível p/ build gerenciado** (mortes
  recorrentes na fronteira/chefe) sem estol.
- **Calibragem**: se a sim estolar ou a duração inflar além da faixa
  → recuar (0,055 → 0,05; nunca acima de 0,069 = cliff). Medir com os
  instrumentos rápidos (projeção + sonda-fim) antes da sim completa.

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
  1. `sonda-fim` (parede do fim, 16min): o build def **ainda vence** a
     parede com ESC_DMG novo? (guarda anti-estol do cliff)
  2. **4 seeds × 600min** por via (baseline 0,037 vs nova 0,06):
     mortes, dnv, atraso%, ttk, **projeção de vitória** — janela onde
     fronteiras de mapa ~18 já são atingidas
  3. **Sim completa** do vencedor (guarda de estol final)
- **Critério de aceite**: mortes do build gerenciado ↑ de forma
  **recorrente** (faixa medida) · sem estol · duração na faixa
  (candidato: ≤ +15% vs 57,2h — medir e decidir) · ttk/sobrevivência
  sanos (espera > 0, uptime ~100%).

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
