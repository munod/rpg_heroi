# AGENTS.md

## O projeto

- RPG idle em **JavaScript puro**: sem build, sem npm, sem dependências, sem
  linter/typecheck. Abra `index.html` direto no navegador (não há servidor).
- **Código, comentários e textos de UI em português (pt-BR)** — mantenha o
  padrão em tudo que escrever.
- `README.md` documenta jogo, estrutura de arquivos e testes em detalhe.
- Repositório Git com remote `origin` =
  `git@github.com:munod/rpg_heroi.git`, branch `main`. Identidade de commit
  configurada apenas localmente no clone (`Munod <thiagodss@hotmail.com>`).
- `.gitignore` exclui `testes/*.png` — esses PNGs são regenerados pelos
  testes (`previa.js`, `cena.js`) e não são versionados.

## Comandos

- `node testes/todos.js` — roda **tudo** (exit 1 se falhar). É o único
  gate de verificação; rode após qualquer mudança.
- `node testes/fumaca.js` — teste de fumaça principal (jogo completo no Node).
- `node testes/grade.js` — asserções de pixel em coordenadas exatas do sprite.
- `node testes/previa.js` / `node testes/cena.js` — regeneram os PNGs em
  `testes/` (folhas de sprite e screenshots das telas).
- Ferramentas manuais: `node testes/mapa.js X.png` (layout em ASCII),
  `node testes/ampliar.js X.png 4` (zoom por vizinho mais próximo).

## Arquitetura

- **Sem módulos**: cada arquivo de `js/` é um script clássico que expõe um
  global via IIFE (`var Foo = (function () { ... })();`), carregado por
  `<script>` na ordem de `index.html`. Dependências resolvem-se pela posição,
  não por imports.
- Adicionar/renomear arquivo em `js/` **exige** atualizar `index.html`;
  `testes/carga.js` lê a lista de scripts do próprio `index.html`, então os
  testes acompanham a mudança automaticamente.
- `js/` é deliberadamente **ES5** (`var`, `function`, sem `const`/arrow/class/
  import). Mantenha o estilo. Já `testes/` usa JS moderno (roda só no Node).
- Cenas: `js/main.js` (`Game`) inicia no `load` da janela, cena inicial
  `selecao` e depois `jogo`. Loop em `js/loop.js` (rAF, `dt` limitado a 0.05s).
- Save/toast/autosave das telas vive em `js/gravacao.js` (instância única;
  o `enter()` de cada tela zera com `Gravacao.entrar(p)`) — mudanças de
  gravação vão para lá, não duplicadas nas telas.
- Botões de atributo (`+`/`−`) aplicam em `Gestao.update(dt, p)` (clique na
  hora + segurar-repetir + seletor ×1/×5); os demais botões do jogo agem no
  render, pelo retorno de `UI.button`.
- O estado da batalha (onda/ts) é gravado pelo **dono** da batalha em
  memória (`Batalha.dono()`), nunca pelo personagem em foco — na seleção
  os dois podem ser heróis diferentes e gravar pelo focado corrompia o save.
- Sistema punitivo (specs `ritmo-punitivo`/`eventos-aleatorios`): morte →
  `penalizaMorte(mult)` — **−10%×mult do ouro** (piso de 1) e **−5×mult
  ondas** (piso: onda 1 do mapa); a onda reduzida só nasce no
  renascimento (`rollbackPend` → limpa inimigos + `spawnaOnda()`,
  extração de `proximaOnda`) e **NÃO conta `stats.ondas`**. Regen: 2hp/s
  constante + **4%/s sem apanhar** (inv=0). Pontos **+3/nível**. O Véu da
  Fênix (fenix) escapa da penalidade. Leva 2: eventos em `js/eventos.js`
  (Açougueiro chamará `penalizaMorte(2)`). Escalas reequilibradas na
  Leva 1 (medido): **ESC_HP 1,30 · ESC_DMG 0,10**.
- Curva de progressão com fonte única em `Personagem.custoProximo`
  (`CUSTO_INICIAL` + `CUSTO_BASE × nível`); ritmo das ondas em constantes
  de `Batalha` (`ESC_HP`, `ESPERA_ONDA`). Mudou algum? Meça com
  `node testes/ritmo.js [min]` (fica fora do `todos.js`) antes de achar
  que está bom. **O `ritmo.js` gasta ouro** (keystone no nv 30 +
  aprimoramento do slot mais barato a cada 10s — o baseline é o do
  jogador que GERENCIA; sem gestão a penalidade de morte cria esteira na
  fronteira: morre −5 / re-limpa +1). Alvos medidos hoje (sistema
  punitivo): 1º nível ~35-45s · 15min = nv 40-48 / onda 40-55 · mapa 1
  fechado em 40-55min (média ~45; variância de RNG ±7min entre runs —
  decidir pela média de ≥4 runs) · mortes ~30-40 aos 50min.
- Canvas **768×432 de base com largura adaptativa**: altura fixa,
  `W = clamp(432 × aspecto, 768, 1728)` recalculado em `main.js
  resize()` (também no `orientationchange`); `Game.W` expõe a largura
  vigente e `Input.ajusta` acompanha o mapeamento do ponteiro. Em 16:9
  **W = 768 e tudo cai exatamente nas coordenadas de referência** (os
  cliques dos testes seguem válidos); em tela larga o layout se
  expande **ancorado**: cabeçalho/rodapé/status/toast em largura toda
  (centro = `W/2`), arena à esquerda, gestão à direita — o painel
  direito inteiro desloca com `ctx.translate(dx)` + `UI.deslocar(dx)`
  (dx = W − 768) e `Gestao.update` desconta dx do ponteiro (retângulos
  são locais ao painel). × escala de exibição: `resize()` também calcula
  escala fracionária que preenche a janela (CSS) e
  `esc = floor(escala × devicePixelRatio)` para o backing store —
  `ctx.setTransform(esc,...)` por frame. **Nunca** desenhar em
  coordenadas de tela cheia: tudo é coordenada de jogo (W × 432).
- Mundo × janela: `VW/VH` (192×134, janela do painel — o layout NÃO muda)
  × `MW/MH` (384×268, mundo). A janela é desenhada com `k = vw/VW`
  (=2 na tela nova): `translate(vx,vy) → scale(k) → translate(-cam)`.
  Física/câmera/ritmo vivem em unidades de mundo e NÃO mudam com k.
  Câmera `cam` com lerp em `atualizaCamera` (roda até pausada, é
  apresentação; teleporte >96px trava). Obstáculos de `mapas.js` valem
  na base 192×134 e são escalados em `constroiObst`; inimigos nascem em
  anel de 110-132px do herói (fora da janela — mudar isso muda o
  ritmo); renascimento em `posicaoAleatoriaSegura()` e inimigos miram
  no local da morte. `info()` expõe `janela`/`mundo`/`cam`/`heroi`
  para os testes (seções 17-18).
- Mapas: ciclo de `FIM_MAPA` (100) ondas — a onda 100 é o chefe; vencido,
  `passaMapa()` faz `mapa++` e volta a onda 1. Dados em `js/mapas.js`
  (`Mapas.info(n)` p/ tema; dificuldade/XP de combate = escala contínua
  `ondaTotal()` em `batalha.js` — onda 1 do mapa 2 = patamar da onda 100
  do mapa 1 — e `Mapas.forca(n)` só nos drops de item); cenário
  reconstruído por `garanteCenario()`. O estado salvo guarda `mapa` e
  `Salvar.lerEstado` migra saves legados (onda >100 → mapa/onda equivalentes)
  — a migração é na leitura, sem rewrite.
- Mapas procedurais em `js/perlin.js` (Perlin melhorado + mulberry32):
  a **semente é o número do mapa** (mesmo mapa = mesmo layout, em qualquer
  sessão) e é aplicada em `Batalha.garanteCenario` → `Perlin.definirSemente`;
  `constroiChao` amostra manchas/flores do campo e `constroiObst` sorteia
  pontos **filtrados** (clareira do ruído, centro livre ≥36×32 base,
  ≥30 de base entre vizinhos; densidade/tipos vêm de
  `Mapas.info().obst = {tipos, qtd}`). Sorteios usam `Perlin.sorteio(n)`
  **independente** da semente do ruído — trocar o chão não pode mexer nos
  obstáculos. `info().obst` expõe o layout (fumaça seção 20).
- Drops/equipamento em `js/itens.js`: `mataInimigo` chama
  `Itens.sorteiaDrop(mapa, chefe, classe)`; auto-equip por
  `Itens.pontuar` (soma **assinada** — afixo negativo conta contra), senão
  vai para `p.bolsa` (teto 10). Raridade define afixos (comum 0/incomum
  1/raro 2; pool de 12 em `AFIXOS`, teto de 1 negativo ×1,5, smart-loot
  70% nas chaves da classe em `AFINS`); a UI da aba Itens usa
  `Itens.linha/deltas` (delta por chave contra o equipado, linhas em
  13px cortadas). Itens vivem em `p.equip`/`p.bolsa` do personagem e
  `Personagem.status`/`lookDe` leem os bônus (com clamps hp≥10/dano≥1/
  vel≥10/crit≥0). **Economia** (Leva B): `p.ouro` (mataInimigo paga
  `Mapas.forca × onda`, chefe ×8), `vender/sucatear` (bolsa cheia
  sucateia sozinha), `aprimorar` (`custoAprim`, +8%/nível via
  `pontuarEfet` no auto-equip) e `reroll` (neg sai só com rol positivo);
  UI na aba Itens: `V`/`S` por linha, `A+`/`R+` nos slots, linha de ouro
  e legenda. **Lendários (rar 4)**: `LEGENDARIOS` (2 por tema, clamp
  `Math.min(mapa,3)` como `Mapas.info`), 1% dos drops + 15% no chefe,
  **1 neg forçado + 1 pos**; efeitos = matemática pura em `Itens`
  (`temEfeito/multDano/multOuro/pctVamp`) + gatilhos em `Batalha`
  (vampiro em `stat`, fúria no refresh de stats, ouro em `mataInimigo`,
  2ª vida em `danoHeroi`, reset em `proximaOnda`, cura fere em
  `skillsPeriodicas`); testes ao vivo leem o `status` AO VIVO (lag de 1
  frame no hit). **`personagem.js` não pode depender de `itens.js`**
  (grade/previa carregam só sprite+personagem) — chaves de bônus **e**
  `APR`/`MAX_UP` são espelhadas nos dois arquivos.
- Tooltips (Leva 3) em `js/ui.js`: `UI.dica(ret, linhas)` é chamado
  durante o render (retângulo LOCAL como os botões; o rodapé é global —
  `deslocX` está 0 lá) e `UI.desenhaTooltip()` fecha o render de
  `jogo.js`/`selecao.js` — desenhado por cima de tudo, **sem hit-test**.
  Dwell por FRAME com flag `usada` (nunca zerar o candidato por frame —
  senão o delay nunca completa). Long-press 500ms → caixa retida, clique
  fora fecha. Linhas = `[[texto, cor?], …]`, fonte 13px, sem
  `measureText` (rasterizador). Rodapé: segmentos fixos (HP · Dano ·
  DPS · Vel · Crít · Alc · XP) com breakdown de
  `Personagem.statusDetalhado(p)` (partes NUMÉRICAS — UI formata,
  teste soma: Σpartes × keystone === status); item em `Itens.dicas`;
  atributo em `Gestao.dicasAtributo`.
- Gestão tem 5 abas (Atrib/Apar/Classe/Itens/Stats): botões de 66px com
  passo 70 a partir de x=412, y=40 — centros 445/515/585/655/725 em y=54;
  testes que clicam abas dependem dessa grade.
- Skills automáticas em `js/skills.js` (procs por classe; 5 skills em
  5/15/25/35/45) com **loadout** (`Skills.LIMITE = 3` ativas;
  `Skills.carregadas(p)` = desbloqueadas ∩ `p.loadout`, automático =
  3 mais avançadas; `Batalha` lê só ela). **Keystones** (1 por classe,
  tradeoff) vivem em `personagem.js` junto do `status` (fonte única:
  `KEYSTONES`, compra nv 30 × 200, respec 10 — sem espelho). Gatilhos em
  `Batalha` — `golpeia()` conta as 'area' e
  aplica 'veneno' (classes com `distancia: true` em `personagem.js` mandam
  projétil em `golpeDistancia`, dano na chegada), e
  `atualizaHeroi` roda timers de 'nuke'/'cura' via `skillsPeriodicas` +
  o gatilho por proximidade de 'mobilidade'/'medo' via
  `skillsPosicionamento` (esquiva/teleporte do herói, empurrão e medo nos
  inimigos — estado em `heroi.fuga`/`en.empurra`/`en.medo`, exposto em
  `info()`); o estado das skills fica em `skillsEstado` (zerado em
  `iniciar()`, criado na preguiça p/ troca de classe em combate).
  `Batalha` e `Gestao` dependem de skills.js; `personagem.js` não
  (grade/previa carregam só ele).
- Estatísticas do jogador em `p.stats` (`Personagem.STATS`: abates,
  mortes, dano causado/recebido, ondas, bosses, itens, tempo, gatunos,
  acougueiros) incrementadas
  por `Batalha.stat()` nos pontos certos (aplicação de dano, morte, onda
  limpa, drop) e exibidas na 5ª aba de `Gestao` (Stats, `milhar`/`tempoHumano`
  em pt-BR). O `tempo` só corre em `atualizar(dt, true)` — o `true` vem do
  `update` de `jogo.js`; a simulação offline não conta. `normalizaStats`
  completa saves antigos (floor — o tempo ao vivo é fracionário).
- Eventos aleatórios em `js/eventos.js` (declarado no `index.html`
  ANTES de `batalha.js` — script novo exige editar o index, o
  `testes/carga.js` lê a lista de lá): rolagens/estado/timers puros; a
  arena fica em `batalha.js` (hooks: `spawnaOnda` → `nasceEventos`, branch
  de fuga do gatuno em `atualizaInimigos`, recompensas em `mataInimigo`,
  despawns no `atualizar`/revivência, `penalizaMorte` com ×2 quando o
  Açougueiro está em campo, `info().acougueiro/gatuno`). **Açougueiro**:
  onda ≥ 30, 1,5%+pity 0,5% (teto 25%), hp×3/dano×1,35, 30s em campo,
  morte = despawn, vitória = ouro×10 + XP×4 + lendário (`★` no drop).
  **Gatuno**: 1,5% (só `ouro > 0`, carência 3), rouba 15% → resgate
  ×1,2; a IA o persegue com **prioridade plana (+1000)**. Como é RNG de
  gameplay, o harness **desliga** (`Eventos.nasceAco/nasceGat` stubados
  no topo da fumaça) e só as seções 28/29 religam — qualquer RNG novo
  precisa desse mosquetão.
- IA tática em `js/ia.js` (carregado antes de `batalha.js`; usa
  `Batalha.colideObst` em runtime): `agudeza(int)` (INT 4→0, 20→1) →
  `decideHeroi` (alvo por peso = −distância + prioridade×40×agu + ruído
  ×(1−agu); estados espera/perseguir/combate/kite/recuar — kite só em
  classe à distância com agu≥0,35, recuar só agu≥0,45 e HP<0,25+0,15×agu);
  `astucia(tipo, mapa)` (base da espécie + 0,12/mapa, teto 1) →
  `decideInimigo` (slot de cerco ≥0,35 a 11px do herói com ângulo por
  `en.slot`, antecipação ≥0,45 usando `heroi.escapa` (direção da fuga,
  0,6s), esquiva ≥0,55 com cooldown 3,5−1,5×ast); `skillEfeito` aplicado
  em `skillsPeriodicas`/`skillsPosicionamento` (raio/cooldown por
  agudeza); `linhaLivre`/`caminho` (A* 16px/8-dir) chamados por
  `Batalha.moverPara` **só** com linha bloqueada + entidade esperta
  (herói agu≥0,35, monstro ast≥0,4 — burros escorregam na colisão).
  Esquiva inimiga faz o golpe errar ('ESQUIVOU!') em `golpeCorpo` e na
  chegada do projétil (AoE/nuke acertam sempre). Exposições em `info()`:
  `heroi.estado`/`heroi.agu`/`esquivando`. Fumaça seções 22-23.
- Efeitos visuais em `js/efeitos.js` (chamado por `Batalha` em
  `atualizar`/`desenhar`/`limparEfeitos`): **só primitivas que
  `testes/cena.js` rasteriza** — `fillRect`, `strokeRect` (com
  `strokeStyle`/`lineWidth`), `ellipse`+`fill`, `translate`/`scale`/
  `setTransform` e `globalAlpha`. `arc`/`stroke()`/gradiente
  **quebram o screenshot** (o `stroke()` do rasterizador é no-op). O dano do missil vive no callback
  que a `Batalha` passa, não no Efeitos. Em teste, para zerar efeitos
  pendentes use `Batalha.limparEfeitos()` (limpa também `nums`): só
  `Efeitos.limpar()` deixa texto flutuando por 1,4s e dá falso-positivo
  em conf de "efeito apareceu".

## Testes — peculiaridades

- Os testes executam o jogo inteiro no Node via `testes/carga.js`: DOM,
  canvas e `localStorage` falsificados, scripts rodando num sandbox `vm` com
  **whitelist de globals**.
- Se o código do jogo passar a usar uma API de navegador que não está stubada
  ali (`setInterval`, `Image`, `crypto`...), os testes quebram com
  `ReferenceError` — adicione o stub no sandbox de `carga.js`.
- No sandbox, `setTimeout` executa o callback **sincronamente** (sem atraso),
  o rAF é acionado manualmente com `frame(n)` e `performance.now()` só avança
  via `frame()`.
- `grade.js` valida coordenadas de pixel exatas do herói: mover um pixel do
  sprite quebra essas asserções de propósito.
- O clique nos testes usa coordenadas do jogo **×2** (harness devolve
  `getBoundingClientRect` = dimensões de jogo ×2, independente do
  backing); mudar esse stub quebra os cliques. O toque é testado na
  seção 18 disparando os ouvintes `touchstart/touchmove` (canvas) e
  `touchend/touchcancel` (window) com `touches: [{identifier, clientX,
  clientY}]` — em `touchend`, `e.touches` são os toques que **restam**.
- `main.js resize()` precisa rodar **antes** de `getContext()` no init:
  o rasterizador de `cena.js` aloca o buffer na primeira chamada.
- Janela falsificada do harness = env `JANELA=WxH` (padrão 1280x720 =
  16:9). A **fumaça fixa 1280×720** antes do load (valida o layout de
  referência) e a **seção 19** simula a tela do celular (1280×400,
  ~3.2:1) para testar o layout ancorado — ou seja, `JANELA` só muda o
  `cena.js`. Para QA visual em tela larga:
  `JANELA=1280x400 node testes/cena.js`. O `getBoundingClientRect` do
  harness devolve `Game.W × 2` (dinâmico).

## Persistência

- Chaves do `localStorage` são versionadas: `rpg_personagens_v1`,
  `rpg_ultimo_id`, `rpg_estado_v1`. Ao alterar o formato do save, suba o
  sufixo `_v1` e/ou normalize na leitura (`Personagem.normalizar`) — não
  quebre saves antigos em silêncio (hoje: `p.stats` via
  `Personagem.normalizaStats`).

## Versionamento e documentação

- Specs e memória do projeto em `.specs/`: `project/` (PROJECT, ROADMAP,
  STATE — decisões/adiados/preferências — e VERSIONING), `codebase/` (7
  docs brownfield) e **`features/<nome>/spec.md` ANTES do código** de
  cada feature nova (IDs de requisito rastreando requisito→commit). Ao
  concluir uma leva: atualizar `STATE.md`/`ROADMAP.md` e o
  `CHANGELOG.md`.
- `CHANGELOG.md` (raiz, Keep a Changelog, pt-BR): o que muda o jogo entra
  em `[Unreleased]`; a release move para `## [X.Y.Z] — data` com os
  SHAs. Histórico backfilled até a v0.1.0.
- Commits em **Conventional Commits** (`feat:`/`fix:`/`docs:`/`test:`/
  `chore:`… com resumo em pt-BR) — a partir da v0.1.0; mensagens antigas
  não se reescrevem. Versão em 0.x; checklist completo de release em
  `.specs/project/VERSIONING.md` (gate `todos.js` → changelog → commit
  `chore(release)` → tag `vX.Y.Z` → **push com aval do mantenedor** →
  `gh release create` → Pages re-deploya sozinho).
