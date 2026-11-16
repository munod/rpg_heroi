# Spec: Mundos (campanha 10×10, ~200h) + re-base do teto de nível

Status: **em execução** · Data: 2026-11-10 · Iniciativa: série de
implementações (1ª leva). Decisões do usuário: **estrutura 10 mundos ×
10 mapas × 100 ondas (~200h de campanha)** · **vencer mundo 10 = tela de
vitória + modo infinito em loop** · **teto ~9.500 com re-base das curvas**
(minha recomendação anterior de "3.000-5.000" estava errada — ver R-MUN-6)
· **escala de monstros: mundo vs mapa, decidir por medição**.

## Contexto (diagnóstico medido)

- **Bug do chão (mundo 4+)**: `Mapas.LISTA` tem **3 temas** e `info(n)`
  clampa em `Math.min(m, 3)` — do mapa 4 em diante o chão é sempre
  "Ninho Rubro". É o fix mais direto da série.
- **Não existe "mundo"**: só `mapa` infinito com `FIM_MAPA = 100`.
  `ondaTotal = (mapa−1)×100 + onda−1` já é contínuo entre mapas (base da
  escala) — a estrutura nova o aproveita sem mudar a fórmula.
- **Monstros por onda não escalam de verdade**: `n = min(3 + tot/2, 5)`
  trava em **5 pela onda 4** do mapa 1 — é constante no jogo inteiro.
- **Teto vs campanha (correção do erro anterior)**: a progressão segue
  `nv ≈ 0,913 × ondasTotais − 8` (ratio `ln(1,10)/ln(1,11)`, calibrado na
  leva `progressao-exponencial`). Para níveis vivos até a onda 10.000 o
  teto precisa ser **~9.100**, não 3-5 mil. E com `G = 1,11` atual o
  **custo estoura `1e308` no nível 6.775** e a **renda estoura na onda
  7.411** (mapa ~75): qualquer teto ≤ 6.800 morre ANTES do fim da
  campanha (teto 5.000 = níveis param no mapa ~55).
- **Lendários espelham o clamp de 3 temas** (`itens.temaDe`).

## Requisitos

- **R-MUN-1 (estrutura 10×10)**: `Mapas.mundo(n) = ceil(n/10)` e
  `Mapas.noMundo(n) = ((n−1) % 10) + 1` (fonte única, exportados).
  `Mapas.info(n)` passa a resolver **tema por MUNDO**: mundo 1-10 têm
  tema próprio; no modo infinito (mapa 101+) os mundos **ciclam**
  (`mundo 11 → tema do mundo 1`). `FIM_MAPA = 100` intacto.
  - **Emenda `mapa-infinito` R-INF-9 (2026-11-15)** — o playtest pediu
    "alternando a cor, textura e mobs conforme vai passando de mapa":
    `info(n)` passou a resolver **tema por MAPA** (`LISTA[(n−1)%10]`,
    ciclo de10 — `mundo/noMundo` intactos e continuam exportados).
    Efeito medido: os primeiros10 mapas varrem os10 temas (mobs mais
    duros mais cedo — ttk2,48 compensado pelo `balance-dopamina`
    R-BAL-6). As confs da seção12/41/42 da fumaça acompanham.
- **R-MUN-2 (fix do chão + 10 temas autorais)**: `Mapas.LISTA` vira **10
  entradas** — cada mundo com paleta de chão própria (base/par/imp/
  mancha/flores/borda), densidade/tipos de obstáculo, inimigos
  (comum/raro com cor) e **chefe com nome próprio**. Reaproveitar as 4
  espécies de `TIPOS` (recolorização) — novos monstros são leva à parte.
  O mapa 31-40 (mundo 4) fica DISTINTO do mundo 3 (o bug).
- **R-MUN-3 (variação procedural por mapa)**: dentro de um mundo os 10
  mapas já variam pela semente do Perlin (chão/obstáculos). Garantir que
  cada tema explore a variação (densidade de manchas/flores/obst
  suficientemente distintos entre mapas do mesmo mundo).
- **R-MUN-4 (escala de monstros — A/B medido)**: substituir o teto fixo
  de 5 por escala **crescente até o fim da campanha**, testando DUAS
  fórmulas com `ritmo.js` (**4 runs por variante**, decidir pela média):
  - **A (por mundo)**: `n = min(3 + floor(tot/2), 5 + floor((mundo−1) × k))`
    — degraus a cada mundo (identidade de mundo);
  - **B (por mapa)**: `n = min(3 + floor(tot/2), 5 + floor((mapa−1) × k/10))`
    — progressão suave (mesmo ponto final de A);
  - Critérios: duração de campanha (~200h), mortes (eventos, não
    esteira), tempo de onda, sem estol. `k` calibrado para o alvo.
  - Cuidados: +monstro = +XP/onda e +dano recebido (pressão sobe) —
    medir; anel de spawn 110-132px comporta ~30 monstros ✓.
  - **RESULTADO (T8, 4 runs/variante, 600min, k=3)**: `'mundo'` =
    mapa 15,3 · nv 1372 · 0,5 mortes vs `'mapa'` = mapa 14,5 ·
    nv 1289 · 1,0 mortes → **variante `'mundo'` mantida** (+6% de
    progressão, 3,75σ no nv, metade das mortes + identidade de degrau).
  - **RESULTADO (premissa refutada)**: a contagem de monstros NÃO
    muda a duração — k=1/3/5 → todos ~21 mapas/600min; k=10 → mesmo
    ritmo com 195 mortes. A duração passou para o `ESPERA` (R-MUN-7).
  - **k shipado = 0,5** (`ESC_MONSTROS_K`, teto 5→9 na campanha; o
    mundo 3 fica em 6): o A/B usou **k=3 nas DUAS variantes** para
    isolar a variável (a forma); o k do jogo é escolha separada e
    passou por **medição de estol** — `k=1` (teto 7 no mundo 3 = +40%
    de dano na fronteira) **estolou o mundo 3 em 2 de 2 runs** (mapa
    22→26 em 2400min, 190→368 mortes, ouro 17M→2M) e `k=0` foi
    **saudável em 3/3** (mapas 24-25, 0-2 mortes) → adotado `k=0,5`
    (escala visível 5→9, impacto suave). `k=0` continua válido
    (reproduz o teto fixo antigo de 5).
- **R-MUN-5 (vitória + infinito)**: derrotar o chefe do **mapa 100**
  (mundo 10) → `passaMapa` dispara **overlay de vitória** ("CAMPANHA
  CONCLUÍDA" + resumo + botão "Continuar — modo infinito") e seta
  `p.vitoria = true` (normalizar com default `false` — sem bump de
  chave). Overlay mora no render/click de `jogo.js` (estado em memória;
  `p.vitoria` é permanente). Depois: mapa 101+ segue normal (mundos em
  loop, escala continua). O cutscene/mapa do universo é leva à parte.
- **R-MUN-6 (re-base do teto — aprovado)**:
  - `CUSTO_G`: **1,11 → 1,07** (fonte única em `personagem.js`);
  - `XP_H`: **1,10 → 1,064** (fonte única em `batalha.js`);
  - `NIVEL_MAX`: **1000 → 9.500**;
  - **Por que funciona** (ratio `ln(1,064)/ln(1,07) = 0,9166` ≈ antigo
    0,9133): `nv(T) ≈ 0,916×T − 12` (antigo `0,913×T − 8`) — trajetória
    praticamente idêntica, recalibragem leve. Fim de campanha
    (T = 9.999): **nv ≈ 9.150 < 9.500** ✓. Segurança numérica:
    `custo(9500) ≈ 10²⁸¹` ✓, `renda(9999) ≈ 10²⁷⁰` ✓; renda só estoura
    em T ≈ 11.433 e custo em nv ≈ 10.441 — **o teto 9.500 é atingido
    primeiro** (T ≈ 10.380, mapa ~104 do infinito) e o guard de cap
    descarta XP antes de qualquer `Infinity` chegar em `ganhaXP`.
  - `PONTOS_MAX 100k` continua folgado (3 × 9.500 = 28.500);
    `ATRIB_MAX 1e6` idem.
  - **`UI.abrev`**: estender para além de 10⁶⁰ (hoje para no sufixo
    "Nod" e mostraria `1e+221Nod`) — fallback em notação científica
    `X,YeZ` (pt-BR) quando `i > SUF.length − 1`.
- **R-MUN-7 (duração ~200h)**: calibrar com `ritmo.js` até a campanha
  (100 mapas) levar **~200h em média** (±20%). **Alavanca =
  `ESPERA_ONDA` (refutou R-MUN-4 como alavanca de tempo)** — a
  medição mostrou que a contagem de monstros não mexe na duração, então
  o respiro passou a escalar por profundidade
  (`8 + (mapa−1)×1,1`s → 117s no fim; mundo 1 intacto). **SIM
  COMPLETA (T9, k=0,5): VITÓRIA em 13.352min = 222,5h de jogo** —
  **dentro do alvo 200h ±20%** (+11%). nv final **9.167** (modelo
  previa 9.150 — 0,2%), **65 mortes em 222h** (0,29/h = eventos),
  **sem estol** (chegou ao mapa 101), mapa 1 fechado em **30,9min**
  (alvo ~32-33). O modelo `100×(clear + 8 + 1,1(m−1))s` bateu em ±3%
  nos marcos parciais.
  - **Emenda `balance-dopamina` (2026-11-15)** — o mantenedor
    **aceitou campanha mais curta** para matar o "dorme entre as
    ondas": `ESPERA_BASE 8→2` + **`ESPERA_TETO 45s`** (rampa trava no
    mapa ~40). O alvo de 200h ±20% fica **substituído pelo valor da
    sim completa pós-teto** (medido na leva `balance-dopamina` R-BAL-4/5
    — o número vive no AGENTS e no CHANGELOG da leva). O método
    permanece: calibrar com `ritmo.js` semeado, ≥4 seeds por decisão.
  - **Desfecho (espec `onda-timer`, 2026-11-15)** — o mantenedor foi
    adiante e **removeu a espera entre ondas** ("muito ruim e chato"):
    a alavanca de duração do R-MUN-7 **deixou de ser a espera e passou
    a ser o clear**. Alvo vigente: **vitória em 44,0h medido**
    (sim seed1,0 mortes — AGENTS/CHANGELOG). O R-BAL-1/teto foi
    superado; a emenda acima fica como histórico de como o alvo de
    200h foi sendo reduzido até a remoção da espera.
- **R-MUN-8 (lendários por mundo)**: `itens.temaDe` passa a resolver por
  MUNDO com **ciclo dos 3 pools existentes**
  (`tema = ((mundo−1) % 3) + 1`) — mundos 1/4/7/10, 2/5/8, 3/6/9.
  Sem novos efeitos nesta leva (14 lendários novos = 14 mecânicas novas
  = leva à parte).

## Fora de escopo

- Cutscenes/mapa do universo (leva própria) · novos monstros/skills de
  monstro (leva própria) · árvore de skills (leva própria) · IA
  (flocking/influence/BT — 2 levas) · novos tipos de obstáculo (sprites
  novos) · novos efeitos lendários · astúcia por mundo (hoje satura no
  mapa ~4 por design testado — deixar como está) · score do ranking
  (min(nv,999) empata acima de 999 — cosmético; trocar a fórmula
  embaralha a ordem de docs antigos no Firestore).

## Verificação

- Seções novas da fumaça (nº a definir):
  1. **estrutura**: `mundo/noMundo` corretos; `info` com 10 temas
     distintos (mundo 4 ≠ mundo 3 — **o bug**); ciclo em mapa 101+;
     `forca` monotônica; lendários por mundo (ciclo de 3).
  2. **vitória**: empurrar para o mapa 100 (setter de mapa, exportar se
     preciso), matar chefe → overlay aparece + `p.vitoria` salvo; clicar
     em "Continuar" → overlay some, mapa 101; reabrir cena → NÃO
     re-mostra.
  3. **re-base**: `NIVEL_MAX === 9500`; razão G = 1,07 constante do 1º
     ao 9.500º; `custo(9500)` finito; razão H = 1,064; `xpAbate` em
     T=9.999 finito; nível 9.499 → 9.500 com sobra descartada;
     `abrev` > 10⁶⁰; saves nv 36k → 9.500.
  4. **escala de monstros**: contagem na onda 1/mundo 1 = 3-5 (early
     intacto), crescimento até o ponto final da variante escolhida.
- Atualizar as quebram: seção 12 (`info(99) === info(3)` → ciclo de
  mundo), pool por tema (seção ~30), seção 36 (teto), seção 38 (curvas),
  abrev.
- `node testes/todos.js` **3×** · loop de calibragem `ritmo.js` (**≥4
  runs por decisão**) · **sim final de campanha completa** (100 mapas) ·
  docs (CHANGELOG, STATE, AGENTS, README, ROADMAP) · commit (push com
  aval).
