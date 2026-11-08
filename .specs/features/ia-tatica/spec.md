# Spec: IA tática — cérebro por INT e astúcia dos NPCs (backfill)

Status: **Entregue** — v0.1.0 · Commits: `2f4948c`, `2eb26a2`, `3ec4ab8`

## Objetivo
Deixar a luta de verdade tática: o herói decide alvo/estado pela Inteligência
(a INT deixa de ser atributo só-de-mago) e os monstros ganham astúcia própria
(cerco, antecipação, esquiva) — fases A (herói + A*), B (NPCs) e C (skills por INT + docs).

## Requisitos
- **R-IA-1**: Novo `js/ia.js` com Avaliação Utilitária (árvore de decisão
  ponderada, lógica difusa nos fatores) em ticks de 0,2s: `agudeza(int)`
  mapeia INT 4 → 0 (burro) e 20 → 1 (gênio), pesos com ruído ∝ (1 − agudeza)
  — commit `2f4948c`.
- **R-IA-2**: Estados do herói `espera/perseguir/combate/kite/recuar`: kite só
  para classes à distância (mantém 0,7–0,9 de alcance, com histerese) e
  recuar só com agudeza ≥ 0,45 e HP < 0,25 + 0,15×agu (burro nunca recua) —
  commit `2f4948c`.
- **R-IA-3**: Alvo por peso (distância + prioridade do alvo perigoso e fraco,
  ruído ∝ 1−agu): gênio escolhe o prioritário, burro vai no mais perto —
  commit `2f4948c`.
- **R-IA-4**: `linhaLivre` + **A\*** (grade 16px, 8 direções, sem corte de
  quina) só quando a reta está bloqueada e só para entidades espertas (herói
  agudeza ≥ 0,35), com cooldown de reteste 0,4s e invalidação se o destino
  anda > 48px — commit `2f4948c`.
- **R-IA-5**: `astucia(espécie, mapa)` = base + 0,12/mapa, teto 1;
  `decideInimigo` por limiares: **cerco** (≥ 0,35) em slot próprio a **11px**
  do herói com ângulo por inimigo + jitter, **antecipar** (≥ 0,45) mirando
  40px à frente enquanto `heroi.escapa` vale (0,6s) e **esquiva** (≥ 0,55)
  com deslize de 0,16s a 160px/s e cooldown `3,5 − 1,5×astúcia`; na janela o
  golpe **erra** (`ESQUIVOU!` no corpo a corpo e na chegada do projétil —
  AoE/nuke acertam sempre) — commits `2f4948c` (semântica), `2eb26a2` (uso).
- **R-IA-6**: `Batalha.info()` expõe `heroi.estado`, `heroi.agu` e
  `esquivando` para os testes — commits `2f4948c`, `2eb26a2`.
- **R-IA-7**: `skillEfeito` aplicado em `skillsPeriodicas` e
  `skillsPosicionamento` via `aguHeroi()`: nuke/cura espera menos e o raio de
  gatilho de mobilidade/medo é maior conforme a agudeza (gênio INT 20:
  intervalo ×0,855 e raio ×1,2; burro INT 4: ×1,3 / ×0,85) — commit `3ec4ab8`.
- **R-IA-8**: Documentação: descrição da Inteligência anuncia a IA ("dano
  mágico e a qualidade da IA em combate"), bullet de IA tática no `README.md`
  e bullet completo no `AGENTS.md` (réguas, limiares, gatilhos, A* e regra do
  `ESQUIVOU!`) — commit `3ec4ab8`.

## Verificação
- Gate `node testes/todos.js` (193 asserções no total; 185 após `2f4948c` e
  180 de fumaça + 13 da grade a partir de `2eb26a2`).
- `testes/fumaca.js` **seção 22) IA tática** (+11 confs): `agudeza` (INT 4→0, 20→1, teto 1),
  `astucia` (espécie + mapa, teto 1), alvo gênio **60/60** vs burro **≤ 15/60**, `skillEfeito`
  (raio maior/cooldown menor), A* dando a volta no obstáculo real e `caminho` = `null` com a
  reta livre, gênio recuando com HP baixo e **burro nunca recuando** (filtro de agudeza do
  tick — estado stale não conta).
- `testes/fumaca.js` **seção 23) IA dos NPCs** (+8 confs): slime do mapa 1 sem slot, slot do
  cerco a **11,0px** com slots distintos, antecipação com destino à frente (`x ≥ 140`), ingênuo
  não antecipa, esquiva só com astúcia ≥ 0,55 (burro nunca esquiva) e esquiva **na arena**
  (mapa 6, `info().esquivando > 0`).
- `testes/ritmo.js` — medições: `2f4948c` 1º nível **36–48s**, 15min = **nv 32 / onda 53**,
  mapa 1 em **30,5min**, mapa 2 onda 10 em **+132s**; `2eb26a2` 1º nível **41,3s**,
  **nv 31 / onda 51**, chefe **30,0min**, mapa 1 fechado em **30,8min** (baseline de
  astúcia 0/0,15 intacta); `3ec4ab8` 1º nível **33–44s**, 15min **nv 31–36 / onda 51–58**,
  chefe **29,9min** — tudo na faixa do `AGENTS.md`.
