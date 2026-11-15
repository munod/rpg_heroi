# Spec: Mapa procedural infinito (herói sempre no centro da tela)

Status: **código completo (fases A-E) e gate verde** · medição R-INF-10
(ritmo4 seeds ×240min vs b3): IA nova **neutra dentro do ruído**
(isolada: ttk2,11 — faixa do baseline) · o ciclo de tema por mapa sobe
o ttk (mobs mais duros nos mapas iniciais:2,48) compensado pelo
R-BAL-6 (ESC_HP1,25 →2,32 com progressão na faixa do baseline) ·
**sim completa da candidata em curso** (R-INF-11/estol do mapa97) ·
Data: 2026-11-15 ·
Iniciativa: mantenedor (playtest: "esse mapa limitado faz o char sumir
da tela... fica só metade dele qnd sobe"; pedido: "fazendo ele
procedural, sempre vai ficar no meio da tela — o D2 Survivors fez isso
mto bem, só fazer igual").

## Contexto

- Hoje o mundo é **fixo 384×268** (2× da janela 192×134): a câmera
  **trava nos limites** (`alvoCamera` com clamp) e o herói nas bordas
  sai do centro — e com sprite ancorado nos pés, sobe → corta o topo.
- O D2 Survivors (survivors-like) não tem borda: arena aberta, herói
  **sempre centralizado**. Nosso gênero é idle, mas a lição vale.
- Peças que hoje dependem do mundo fixo (levantamento feito):
  - `batalha.js`: `alvoCamera` clamp · `resolve()` clamp [8, MW−8] ·
    spawn anel com clamp de borda · `posicaoAleatoriaSegura` (mundo) ·
    `constroiChao` (canvas MW×MH + `strokeRect` de borda) ·
    `constroiObst` (sorteia na base 192×134 do mapa) · poeira wrap
    MW/MH · gatuno foge "p/ a borda mais próxima" · cofre.
  - `ia.js`: `clampFuga` (limites 384×268, margem 16 — sem ele o
    herói "empurrava a parede e ficava preso"; sem mundo, o risco vira
    **fuga infinita**, relatada pelo mantenedor) · A* grade absoluta
    24×17 (`clamp` colapsa tudo p/ a origem longe do 0) · influence
    map grade absoluta 48×34 (`idxInfl` prende na borda).
  - Testes: **seção 17** (contrato `mundo 384×268`, "câmera presa nos
    limites" ×2, renascimento dentro dos limites) · seção 20 (layout
    do cenário = f(mapa)) · 34/44/45 (colisão/flocking/A* com
    obstáculos do mapa) · `cena.js`/`previa.js` (regen de PNGs).
    `grade.js` **não é afetado** (só sprite+personagem, sem câmera).
- Tema hoje é do **MUNDO** (`LISTA[(mundo−1)%10]`); o pedido é
  alternar **por mapa** ("conforme vai passando de mapa").

## Requisitos

### Geometria e câmera

- **R-INF-1 (câmera sempre central)** — `alvoCamera()` sem clamp:
  `{x: heroi.x − VW/2, y: heroi.y − VH/2}`. O herói fica **sempre no
  centro** da janela, em qualquer borda, sem cortes. Teleporte
  (renascimento) continua com o trava-rápido do lerp.
- **R-INF-2 (sem bordas no mundo)** — remove os clamps de borda de
  `resolve()`; `spawn()` usa só o anel 110−132px do herói (sem clamp
  [14, MW−14]); `posicaoAleatoriaSegura()` vira **anel ao redor do
  herói** (40−120px, testando colisão) — renascimento sempre perto e
  em local distinto do anterior.
- **R-INF-3 (fuga com teto de distância)** — `clampFuga(x, y)` deixa
  de usar os limites do mundo e passa a **limitar a distância ao
  herói** (destino de fuga a no máx ~72px do herói atual): sem mundo,
  o teto de distância é o que impede a "fuga infinita" relatada. Os
  obstáculos naturais (R-INF-6) dão a estrutura de parede.
- **R-INF-4 (gatuno/cofre/poeira)** — gatuno foge na direção **mais
  longe do herói** (era "borda mais próxima"); cofre nasce no anel de
  `posicaoAleatoriaSegura`; poeira ambiente faz wrap na **janela
  visível** (cam), não em MW/MH.

### Terreno e obstáculos por chunk

- **R-INF-5 (chão por coordenada absoluta)** — o `chao` vira cache de
  **chunks 384×268** (mesma escala atual) em volta do herói: região
  ativa **3×3 chunks** (1152×804), renderizados sob demanda com a
  mesma receita de hoje (grid + manchas do `Perlin.ruido(x,y)` — já é
  absoluto ✓ — + flores com `sorteio` derivado do id da célula),
  **sem `strokeRect` de borda**. Troca de mapa invalida o cache
  (`garanteCenario` → limpa chunks). Desenho: um `drawImage` por
  chunk visível (≤4 por frame), mantendo o custo de desenho baixo.
- **R-INF-6 (obstáculos por chunk)** — `constroiObst` passa a
  construir **por chunk**, com `Perlin.sorteio(hash(mapa, chunkX,
  chunkY))`: mesmo mapa + mesmo chunk = mesmos obstáculos (o
  determinismo do Perlin por semente de mapa é preservado dentro do
  mapa). `obst[]` vira a **lista ativa** = chunks num raio de 1 chunk
  do herói (cull ao mudar de chunk); `colideObst` consulta a lista
  ativa (mesma API). "Centro livre" do sorteio vira ausência de
  restrição de centro (não há centro) — mantidos os filtros de
  clareira/distância entre vizinhos.

### IA e grades

- **R-INF-7 (A* em janela rolante)** — a grade do A* (16px) passa a
  ser **ancorada na célula do herói** (offset `floor(heroi/cell)`),
  24×17 células da janela: coordenadas de célula relativas, sem
  `clamp` para a origem. Mesmo custo por chamada.
- **R-INF-8 (influence map em janela rolante)** — idem para a grade
  de 8px (48×34): origem = herói − metade; `idxInfl`/`celulaOcup`
  relativos. Repintura por frame já existe.

### Tema por mapa

- **R-INF-9 (tema alterna por mapa)** — `Mapas.info(n)` passa a usar
  `LISTA[(n−1) % 10]` (era por mundo). Mobs já alternam por mapa ✓.
  **Emenda na spec `mundos`** (contrato "tema é do MUNDO" muda) +
  ajuste do teste da seção 12 (`info(31) !== info(21)` — com tema
  por mapa ambos viram tema 1 → o teste vira "mapas distintos têm
  temas distintos no ciclo").

### Testes (o gate da leva)

- **R-INF-10** — fumaça: **seção 17 reescrita** — "câmera sempre
  centralizada no herói (dx≈0, dy≈0)" (era: presa nos limites) ×2,
  renascimento em locais distintos **fora do chunk central** (era:
  dentro dos limites do mundo), `info().mundo` **muda de contrato**
  (vira a **região ativa 3×3 chunks = 1152×804**, com `janela`
  intacta) e seções 20/34/44/45 ajustadas aos chunks/grades
  rolantes. `cena.js`/`previa.js` regeneram PNGs (gitignored).
  **Re-confirmação final com `ritmo.js`** (≥4 seeds, 240min): mortes
  segue evento, sem estol, marcos de mapa/onda na mesma faixa do
  baseline `b3` — a IA nova não pode regredir o clear/survival.
- **R-INF-11 (docs)** — AGENTS (mundo/câmera/Perlin/tema), emenda
  `mundos`, CHANGELOG/ROADMAP/STATE.

## Fora de escopo

- Múltiplos mapas abertos ao mesmo tempo (o mapa continua sendo a
  unidade de tema/dificuldade — só o TERRENO é infinito).
- Persistência de posição do herói (o save continua guarda onda/mapa).
- Mudar janela/chunk de escala (192×134 e 384×268 são contrato).

## Verificação

`node testes/todos.js` (com seção 17 reescrita) · `node testes/cena.js`
(screenshots olhados: herói centralizado, sem borda visível) ·
`ritmo 240 mundo 0.75 <s> ×4` vs baseline `b3_s*.json` (clear/survival
intactos) · QA manual: correr pra borda do mapa antigo → herói
centralizado, terreno segue, sem vazio.
