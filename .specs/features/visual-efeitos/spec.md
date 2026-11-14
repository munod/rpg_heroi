# Spec: Visual efeitos — pools, receitas, hit-stop e camadas

Status: **concluída** (gate verde 3× = 694 confs; sanidade 2× mapa 1
30,7/32,6min — hit-stop <2%) · Data: 2026-11-13 · Iniciativa: série visual
(leva 8 de 9 — 2ª frente aprovada; **a maior da série**).

Base visual: **`/home/thiago/Projetos/Docs/efeitos.md`** (guia do
sistema de efeitos — valores exatos de receitas/curvas/pools).

## Contexto (estado atual medido)

- **`js/efeitos.js` tem 196 linhas** (doc: ~870): 1 pool (`lista`,
  teto 300), 5 tipos (brasas/mote/pulso/anel/corte) + missil, gatilhos
  granulares (`brasas/explosao/corte/cura/missil`). **Não existe**:
  hit-stop, shake com fórmula, flash de evento, vinheta de evento,
  perigo de vida, receitas completas, catálogo de partículas,
  sprites de glow/anel cacheados, camadas de desenho, `silenciar`.
- **O game feel vive ESPALHADO no `batalha.js`**: `parts` + `faísca()`
  (8 call sites), `poeira` (36 motes de ambiente — **é o "pólen" do
  doc, já existe**), `shake` próprio (duração 0,08-0,15, amplitude
  fixa ±1,5, sítios em 876/1150/1219/1284/1333), `tFlash` (flash do
  nível X — 1,6s), vinheta estática de janela (4 degraus), `nums`
  (2 estilos, `numero()` com boolean `big`) e o desenho de números
  dentro de `Batalha.desenhar`.
- **Gatilhos prontos para receitar**: `danoHeroi` (shake 0,15 +
  número), golpes (`golpeCorpo`/dano à distância: `hitFlash` +
  `faísca` + número com crítico), `mataInimigo` (faísca + números),
  nível up (`ganhaXP` → `tFlash = 1,6`), renascimento (`DE VOLTA!`),
  spawn de chefe (`spawnaOnda`), skills (casts com `shake`).
- **Rasterizador** (`cena.js`): suporta `fillRect`, `strokeRect`,
  `ellipse+fill`, `rect+fill`, `drawImage` (RGBA com alpha do FONTE,
  **sem** multiplicar `globalAlpha` — a corrigir), `save/restore/
  clip/translate`, `globalAlpha`. `globalCompositeOperation='lighter'`
  = atributo inofensivo nos testes (aditivo só no navegador).
  Offscreen canvases do harness usam o mesmo ctx (glow cache via
  fillRect 1×1 + alpha funciona em todos os contextos).
- **Testes**: `Efeitos.qtd() > 0` (5 asserts de skill) e
  `Batalha.limparEfeitos()` (7 sites — zera nums/parts/Efeitos/shake/
  tFlash) são os contratos; nenhum teste lê `Efeitos.limpar`
  diretamente nem assera valores de shake.

## Decisões de escopo

1. **Dono único**: `Efeitos` passa a deter pools com teto, receitas,
   shake/hit-stop/flash/vinheta/perigo, `silenciar` e camadas de
   desenho. `Batalha` mantém: `poeira` (ambiente mundial = pólen do
   doc ✓), vinheta estática de janela, `hitFlash` do sprite, `missil`
   (lógica com callback), `numero()`/`aviso()` como fachadas.
2. **Flash/vinheta/perigo em camada de JANELA** (`desenharTela` depois
   do `restore`) — desvio documentado do doc (que não tem câmera):
   o flash tem que cobrir a janela, não o mundo.
3. **nums migram para `Efeitos.nota`** (3 estilos normal/crit/big com
   os tempos/velocidades/fontes do doc); `Batalha.numero(x, y, txt,
   cor, tipo)` delega mantendo a assinatura legada (`true→'big'`,
   `false→'normal'`); **só o dano crítico** muda de estilo (era
   "big", vira `crit` com tremor/halo — upgrade visível).
4. **Hit-stop ligado na simulação** (`congelar(dt)` no topo do
   update após a pausa) — é o coração do "peso" do doc; recipes de
   golpe normal 0,02s / crítico 0,08s / fatal·chefe 0,12-0,14s. Se a
   sanidade de ritmo estourar, afro durações (nunca desligo por
   completo sem decisão do mantenedor).
5. **`silenciar(true)` bloqueia TODO spawn** (parts/nums/anéis/raios/
   arcos + sacudir/parar/flash/borda) e zera pools — `voltaAusencia`
   envolve a simulação como já faz com `Cutscene.silenciar`.

## Riscos

1. **Hit-stop muda timing de testes/ritmo** — congela mundo E
   partículas: contagens de golpes em janela (seção 32: `g8`/`g62`,
   `colado`) e o `ritmo.js` andam mais devagar (0,02s × golpes/s).
   Medir; se cair teste, alargo a janela/tempo; se ritmo estourar,
   afro durações.
2. **Migração de nums/parts** muda o que `Efeitos.limpar` limpa (hoje
   texto flutua fora do Efeitos — nota do AGENTS some; `limparEfeitos`
   continua zerando tudo ✓).
3. **Receitas são "mais coisa ao mesmo tempo"** (shake+hit-stop+
   flash+vinheta no mesmo golpe) — em fixtures de 1 bicho isso
   amplifica ruído visual, não lógico; pools com teto seguram memória.

## Requisitos

- **R-EF-1 (pools com teto)** — `Efeitos` com `parts 380 · nums 50 ·
  aneis 24 · raios 8 · arcos 10` + `limitar()` (remove do início);
  `parts` e `nums` do batalha migram para cá (`faísca()` do batalha
  vira fachada). `qtd()` = soma dos pools.
- **R-EF-2 (sprites cacheados)** — `glow(cor, r)` e `anelSprite(cor)`
  gerados **1×** por `cor|raio` em canvas offscreen (fillRect 1×1 com
  alpha por pixel — funciona em TODO ctx do harness) e desenhados
  com `drawImage` + `globalAlpha`; `cena.js` ganha multiplicação de
  `globalAlpha` no `drawImage` (hoje só o alpha da fonte).
- **R-EF-3 (catálogo)** — física do doc: `faisca` (gravidade 190,
  rastro), `caco` (240, giro 2×1, esfria), `brasa` (zigue-zague,
  cintilação), `fumaca` (cresce, desenha por último), `poeira`,
  `confete` (vento), `estrela` (cruz 4 pontas), `brilho` (glow),
  `raio` (radial), `mote`; + `missil` (nosso — com glow na ponta).
- **R-EF-4 (receitas com valores exatos do doc)** — `impacto(x, y,
  cor, crit)`, `impactoHeroi(x, y, fatal)`, `morte(x, y, cor, boss)`,
  `nivelUp(x, y)`, `reviver(x, y)`, `bossChegou(x, y)`,
  `corte(x, y, cor, esc, facing)` (16 segmentos, núcleo branco +
  halo dourado), `raio(xAlvo)` (polilinha jagged) — TODAS respeitam
  `mudo`. Fiores de chamada: dano do herói → `impactoHeroi`; golpes
  (corpo e distância) → `impacto`; abate → `morte`; `ganhaXP` nível →
  `nivelUp` (substitui o `tFlash` local); renascimento → `reviver`;
  spawn de chefe → `bossChegou`; casts de skill → `sacudir`.
- **R-EF-5 (game feel)** — `sacudir(forca)` (duração 0,18+f×0,22,
  amplitude 0,8+f×1,8, offset **inteiro** via `shakeOffset()` —
  `Batalha.desenhar` traduz; o `shake` local some), `parar/congelar`
  (gate no topo do update **após** a pausa), `flashTela(cor, α, t)`
  (fraco nunca substitui forte), `bordaTela(cor, α, t)` (4 molduras
  oscilando), `perigo(frac)` (HP<35% pisca vermelho, chamado todo
  frame) — flash/borda/perigo desenhados em `desenharTela`.
- **R-EF-6 (números em 3 estilos)** — `Efeitos.nota(x, y, txt, cor,
  estilo)`: normal (0,9s/24/sombra), `crit` (1,15s/34/halo dourado +
  tremor 0,12s), `big` (1,4s/16/pulso + balanço); teto 50; saída de
  cena nos últimos 0,25s; `Batalha.numero` delega.
- **R-EF-7 (camadas)** — `desenharBaixo` (anéis no chão, atrás das
  entidades) · `desenharTopo` (ordem do doc: aditiva `lighter` →
  sólida → fumaça → números) · `desenharTela(ctx, vx, vy, vw, vh)`
  (flash/vinheta/perigo em espaço de janela). `auraBoss(ctx, x, y)`
  atrás do sprite do chefe (`en.tipo.boss`) em `desenhaInimigo`.
- **R-EF-8 (silenciar)** — bloqueia os spawns DECORATIVOS e zera os
  pools **exceto `missil`** (ele leva dano na chegada e a simulação
  offline precisa que ele voe — exceção documentada) e o `atualizar`
  roda sempre (o missil precisa dele); `voltaAusencia` (jogo.js)
  envolve a simulação junto do `Cutscene.silenciar`.
- **R-EF-9 (testes)** — **seção 49**: tetos dos pools; `nota` nos 3
  estilos (sonda `info().numEstilos`); `congelar` consome e expira;
  `sacudir`/`shakeOffset` inteiros; `flashTela` fraco não substitui
  forte; receitas com `mudo` não gastam; `qtd()` soma; glow cache
  cresce; perigo/aura não quebram o rasterizador. Contratos
  existentes: `qtd() > 0` (5) e `limparEfeitos` (7) intactos.
- **R-EF-10 (sanidade)** — `todos.js` **3×** + `ritmo 60` **≥2
  runs** (hit-stop atrasa o mundo — medir contra mapa 1 31-33min e
  reportar; afar durações se estourar >40min).

## Fora de escopo

- Pólen novo (a `poeira` de 36 motes já é o ambiente do doc) ·
  vinheta estática de janela (fica) · som · WebGL · mudar dano/curvas
  · textos/estilos de número além dos 3 · aura de monstros comuns ·
  conteúdos de roteiro de cutscene (leva 9).

## Ajuste pós-avaliação (feedback do mantenedor, pré-push)

- **"A tremedeira ficou muito bruta"** → shake suavizado: senóide
  com **fase por impacto** (impactos encadeados mantêm a fase — sem
  salto aleatório por frame), duração **0,14+f×0,16** (doc: 0,18+
  f×0,22), amplitude **0,6+f×1,2** (doc: 0,8+f×1,8) e forças dos
  recipes maiores reduzidas (crítico 0,9→0,6, fatal 1,1→0,8, morte
  de chefe 1,3→0,9, nível 0,5→0,3, chegada de chefe 1,4→1,0).
  Amplitudes finais: hit normal **±1px** · crítico ±1-2 · fatal/chefe
  ±2. Conforto do mantenedor vence os valores do doc (o doc era o
  alvo de "peso", não de quanto incômodo).

## Verificação

- Seção 49 + reparo do que quebrar · `todos.js` 3× · `ritmo 60` ≥2
  runs (R-EF-10) · QA humano (Ctrl+Shift+R: peso do golpe, crítico
  dourado tremendo, morte do chefe com clarão, flash de nível).
- Docs (CHANGELOG, AGENTS, STATE, ROADMAP, README) · commit · push
  no fim da rodada (decisão do mantenedor: "deixa o push por último").
