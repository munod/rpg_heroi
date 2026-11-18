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
  gate de verificação; rode após qualquer mudança. O CI
  (`.github/workflows/deploy.yml`) roda `node --check` + este gate em
  push/PR, e o deploy do Pages só acontece na `main` (`needs: test`).
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
- **Herói com assets gerados (spec `visual-heroi-spritecook`)** —
  `js/assets.js` (entre `sprite.js` e `anim.js` no `index.html`)
  carrega PNGs do SpriteCook: `assets/herois/` (**as4 classes**, 8
  frames × 3 anims cada — 43×43, **arma da classe embutida na
  arte**; `inicios` do ataque é **por classe**, medido no QA de cada
  geracao). Manifesto **embutido** (sem `fetch` — o jogo abre em
  `file://`), `Assets.carga(cb)` roda no boot ANTES das cenas
  (síncrona no harness) e **fallback procedural**: qualquer classe
  sem manifesto ou com PNG faltando cai no grid de texto antigo —
  ninguém fica sem desenho (decisão da leva 2: manter o procedural
  como rede de segurança; o teste usa classe inexistente). `Anim.hero`
  escolhe o caminho; `Assets.desenha` é um draw puro (o espelhamento
  do `facing` é externo, camada única); `batalha.js` lê
  `Assets.qtd/durFrame/frameAtaque` — os ciclos são idênticos aos do
  procedural (idle 0,7s · walk 0,48s), só a contagem muda (8 frames).
  O manifesto é **fonte única** de geometria: teste lê ele, não
  duplica número. Cenário: **`ESC_CENARIO = 2`** em `desenhaObst`
  (árvore 40×52, pedra 28×22, ancoradas na base — só visual,
  colisão `obst.r` intacta). Reprocessar arte:
  `node testes/prepara-assets.js` (corte ÷2 + folha QA) e
  `node testes/previa-assets.js` (folha no gate). Arte-fonte em
  `assets/fonte/`, IDs em `spritecook-assets.json`.
- Botões de atributo (`+`/`−`) aplicam em `Gestao.update(dt, p)` (clique na
  hora + segurar-repetir + seletor ×1/×5); os demais botões do jogo agem no
  render, pelo retorno de `UI.button`.
- O estado da batalha (onda/ts) é gravado pelo **dono** da batalha em
  memória (`Batalha.dono()`), nunca pelo personagem em foco — na seleção
  os dois podem ser heróis diferentes e gravar pelo focado corrompia o save.
- Sistema punitivo (specs `ritmo-punitivo`/`eventos-aleatorios`): morte →
  `penalizaMorte(mult)` — **−10%×mult do ouro** (piso de 1) e **−5×mult
  ondas** (piso: onda 1 do mapa); a onda reduzida só nasce no
  renascimento (`rollbackPend` → limpa inimigos + `Eventos.reiniciaOnda()`
  — encerra o Enxame e resolve o Gatuno, nada sobrevive à onda refeita —
  + `spawnaOnda()`, extração de `proximaOnda`) e **NÃO conta `stats.ondas`**.
  Regen: 2hp/s constante + **4%/s sem apanhar** (inv=0). Pontos **+1/nível**
  (`PONTOS_CADA`/`PONTOS_NIVEL`, compensação `PONTO_MULT 3×`). O Véu da
  Fênix (fenix) escapa da penalidade. Leva 2: eventos em `js/eventos.js`
  (Açougueiro chamará `penalizaMorte(2)`). Escalas reequilibradas na
  Leva 1 (medido): ESC_HP 1,30 · ESC_DMG 0,10; hoje (leva
  `progressao-exponencial`): **ESC_HP 1,90 · ESC_DMG 0,045** — e a leva
  `balance-dopamina` (R-BAL-3/6) chegou em **ESC_HP 1,25 · ESC_DMG
  0,037** (TTK de esponja ↓; produto 0,0463 = folga máxima no cliff;
  DMG compensa a densidade k0,75: perigo total do fim ≈ baseline).
- **Monstros com skill própria (spec `monstros-novos`)** — 10 espécies
  em `Batalha.TIPOS` (eram 4): **`atirador`** (`ranged: {alcance 90,
  cd 2,2}` — no loop de inimigos o ramo `en.ranged` fica FORA do
  alcance e aproxima, DENTRO dele atira via `Efeitos.missil` (dano na
  chegada, `machucaHeroi` guarda o `inv`); **não tem ramo CQC**),
  **`regenerador`** (`regen 3%/s` só após `semDano > 2` — fonte única
  `regeneraEspecie`, veneno trava) e **`drenador`** (`dreno 0,3` —
  `drenaVida`, 30% do dano vira HP). Os 3 entram como **`raro` dos
  mundos 5-10**; o **`comum` dos 10 intacto** (asserção que protege a
  progressão medida). Eventos novos em `eventos.js` (**Enxame**
  `nasceEnxame` → arena dobra a onda e `mataInimigo` paga ×1,5 via
  `multEnxame`, encerrado em `proximaOnda`; **Cofre** `nasceCofre` →
  posição no campo, herói **caminha até ele** quando não há inimigos —
  guard `!alvo` em `atualizaHeroi` — coleta por proximidade paga
  `forca×25` + drop rar 2). **Sondas novas em `info()`**: `bichos`
  (`chave/hp/dist`), `cofre` (`x/y/dist`), `enxame`; `spawn`/`TIPOS`/
  `regeneraEspecie`/`drenaVida` exportados p/ fixtures. **RNG novo
  exige o mosquetão do topo da fumaça** (regra já documentada — o
  Enxame sem stub derruba stats de qualquer teste que rode ondas).
- **Cutscenes entre mundos (spec `cutscenes`)** — `js/cutscene.js`
  (módulo `Cutscene` + cena `universo` registrada em `main.js`;
  declarado no `index.html` antes de `batalha.js`). **Fronteira**:
  `passaMapa` compara `Mapas.mundo` antes/depois do `mapa++` — destino
  ≤ 10 → `Cutscene.mundo(de,para)`; destino > 10 (100→101 e infinito)
  → `Cutscene.fecha()` (a vitória assume; mundos ciclam = sem
  cutscene). **Eventos**: `Cutscene.evento(chave)` nos 4 avisos da
  arena — **mosquetão do topo da fumaça** (SEM_* religa só na seção
  42, senão um cofre aleatório bloqueia a gestão nos testes). Overlay
  no **padrão da vitória**: batalha NUNCA pausa (idle sagrado),
  bloqueio em **dois níveis** (`UI.bloqueia(vit||corte)` no desenho +
  pulo do `Gestao.update`) e `Cutscene.update(dt)` no `jogo.update`
  (auto-dismiss 3,5s **só dos eventos** — a fronteira espera o
  jogador). `jogo.enter` chama `Cutscene.fecha()` (reentrada não
  herda) e `voltaAusencia` envolve a simulação em
  `Cutscene.silenciar(true/false)` (eventos offline não viram cutscene;
  a de MUNDO continua = resumo da ausência). Prioridade no render:
  **vitória > cutscene**. **Visual (spec `visual-cutscene`)**:
  **letterbox** deslizante (barras de 52px em 0,35s —
  `info().barras`), **datilografado** 55 chars/s com pausa 0,8s
  entre linhas (`update` roda para os **2 tipos**; `info().revela =
  {linha, chars}`), **dicas piscando** (`floor(relogio*2)%2`) e
  **`avancar()` em 3 estágios** (linha → próxima → fecha) disparado
  por **clique em QUALQUER ponto OU Espaço** no `Jogo.update` —
  **sem botão** desde o ajuste do mantenedor (`info().botao = null`;
  `Enter` segue fechando direto). **Estética (spec
  `cutscene-estetica`)**: **sem véu** — a arena fica viva entre as
  barras **`#000`** e a **caixa de legenda** `caixaCorte` (preto
  **0,60 transparente** + fio dourado por **duplo preenchimento** —
  `stroke()` é no-op no rasterizador); títulos **únicos** com sombra
  (sem o dourado do `UI.panel` embaixo).
  Sondas: `Cutscene.info()` →
  `{tipo,de,para,chave,restante,mudo,barras,revela,botao}`. Cena
  `universo`: lê `Salvar.lerEstado(p.id).mapa` (funciona
  fora da jogatina); botão "Universo" na seleção em (132,306,120,26).
  Narração (9 fronteiras + 4 eventos) em dados puros no próprio
  `cutscene.js`; nome/chefe dos mundos saem de `Mapas.LISTA` (fonte
  única). Só primitivas do rasterizador (fillRect/strokeRect/text).
  Fumaça seção 48 (a 42 espera a narração revelar).
- **Virada do herói (spec `virada-ataque`)** — `h.facing` (1/−1) é
  aplicado NO DESENHO: `desenhaHeroi` espelha o sprite com
  `save → translate(x0+c.w) → scale(-1,1) → drawImage → restore`
  (sombra/alpha fora do save); `Efeitos.corte` recebe `heroi.facing`
  nas 3 chamadas; sonda `info().heroi.facing`. O campo era **morto**
  (escrito em 3 lugares, nunca lido) — o golpe é por distância e
  batia dos dois lados, só o visual estava preso pra direita.
- **Curvas de status com teto (spec `gestao-atributos`)** — auditoria
  revelou "teto onde pensaram, sem teto onde não pensaram" (crítico 45
  e recarga 0,08 têm; vel/XP/HP não tinham). **Exceção deliberada:** o
  keystone de crítico (`falcao`, `+18C/−10%D`) é aplicado **depois** do
  teto 45 e o ROMPE (45 → 63) — senão o +18 virava só o custo no late
  game; os demais keystones não mexem no teto. Hoje: **velocidade =
  `46 + 24×(DES/8)^0,35`** (potência saturante — parte de 70 em DES 8,
  ~241 no fim mono-stat) **+ clamp final 250 px/s** aplicado DEPOIS de
  item+keystone (`VEL_MAX`, sem ele o afixo daria +1.968 no mapa 100 e
  contornaria); **afixo `vel` com escala limitada em 5×** (`escalaVel`
  — o dano mantém escala cheia); **regen com teto 1250 hp/s**
  (`REGEN_MAX` — sem ele, HP late 70k regenerava 2.800/s = invencível;
  o HP em si não mexe, sustenta a frente; **500→1250 na leva
  `balance-dopamina` R-BAL-6**: o `ESPERA_TETO 45s` encolheu a janela
  de cura do fim e a sim completa estolou no mapa97 — "se a sim
  estolar, SOBE este número" pagou; cap só pega com HP >31k = late);
  **Carisma → ouro**
  (`Personagem.multOuroCar`, logarítmico) e **clérigo `danoMod:'car'`**.
  **`xpMult` eliminado** — a renda é exatamente a calibrada.
  **Ritmo de pontos: 1 ponto POR NÍVEL** (`Personagem.PONTOS_CADA/
  NIVEL` — era 3/nível, depois 1/3nível na leva `gestao-atributos`,
  e a leva `balance-dopamina` V1 neutrou para 1/nível: 3× mais
  decisões, como o card por nível do gênero) **+ compensação 3×**
  (`Personagem.ganhoAtributo`): a régua é **pontos × mult =
  constante** (3× pontos ⇒ mult ÷ 3), então o poder MEDIDO fica
  idêntico — sem compensação a medição estolou (223 mortes/1200min;
  e sem a de 3× o V1 de pontos estolaria igual).
  Regra: até a **base** (8+bônus de classe) vale o linear antigo
  (atributo baixo paga penalidade); acima dela, o mult. Metas de sanidade
  na seção 40 (vel ≤250, sub-passos, afixo, regen, cadência).
- Curva de progressão com fonte única em `Personagem.custoProximo`
  (**exponencial**: `146 × 1,07^(nv−1)` — leva `progressao-exponencial`
  calibrava 1,11; a leva `mundos` RE-BASEOU p/ `1,07` junto com H
  `1,10→1,064`, mantendo o ratio `ln(H)/ln(G)` ≈ 0,916 — o linear
  antigo estolava) e renda em `Batalha.xpAbate`
  (**`12 × 1,064^ondaTotal`**, harmônica com o custo → tempo/nível
  estável). Combate em `Batalha`: `ESC_HP 1,25 · ESC_DMG 0,037 ·
  onda-timer` (**spec `onda-timer`**: sem espera entre ondas — o clear
  dá a batida de `BEAT 2s` e cada onda tem cota de `ONDA_SEG 20s`
  (era 30; mantenedor reduziu p/ 15 e recusou — virou fluxo contínuo;
  20 = "mundo-fullscreen" medido: atraso ~20%, espera ~9% —
  expirou → reforços com os sobreviventes); a alavanca de duração da
  campanha passou a ser o **clear**) + `HP_POR_NIVEL 6` em
  `personagem.js` (fonte única — NÃO espelhe fórmula em
  `statusDetalhado`). Mudou algum? Meça com
  `node testes/ritmo.js [min] [mundo|mapa] [k] [semente]` (marcos até
  13.500min p/ a campanha inteira +
  coluna nv/min; argv 2/3 = variante da escala de monstros; argv 4 =
  seed do `Math.random`, padrão 1 → run DETERMINÍSTICO, eventos
  aleatórios ATIVOS (mesma semente = mesmo run = A/B limpo; ≥4 seeds
  por decisão); grava `resultados/ritmo.json` (gitignored) com
  config/marcos/níveis/métricas/commit; métricas: kpm/dps/ttk/espera%/uptime/xpm/gpm/eficiência
  ouro/mortes-h/hpMin/inimigos/clear-médio-p95-máx/atrasoPct; fica fora
  do `todos.js`) — **≥4 runs por decisão** (run único iludiu uma
  "validação"). **Cliff mapeado**: produto `ESC_HP×ESC_DMG ≤0,086`
  passa / `≥0,095` estola o mapa 3 em 4/4 (renda fixa num tot parado ×
  custo exponencial = estol estrutural; a morte −5 amplifica). **O
  `ritmo.js` gasta ouro** (keystone no nv 30 + aprimoramento do slot
  mais barato a cada 10s — o baseline é o do jogador que GERENCIA). Alvos
  medidos hoje (**leva `onda-timer`**: A/B = média de4 seeds ×240min,
  sim = seed1): nv10 ~3,5min · nv30 ~8,6min · keystone ~9,2min ·
  15min = nv 60 / onda 75 · mapa 1 fechado ~20min · A/B @240min =
  mapa 12 / nv 1.050 / **atrasoPct 0** · **SIM COMPLETA: vitória em
  44,0h** (2.639min), nv final 9.170 (modelo 9.150), **0 mortes**,
  clear p95 19s (cota30 nunca estourou em9.900 clears). Referências:
  a config COM espera venceu em136,2h/0 mortes (R-BAL-6) e a pré-
  compensação estolou no mapa97 (1.357 mortes). Variância
  de RNG: decidir pela média de ≥4 runs. **Esses alvos são do
  PRE-fullscreen** — a leva `mundo-fullscreen` (anel 460 + cota 20s)
  mediu: nv10 5,8min · keystone ~15min · 15min = nv 31 / onda 45 ·
  @240min = mapa 8 / nv 664 / atraso ~20% / 0 mortes (campanha
  estimada ~70-75h) — A/B de 4 vias em
  `.specs/features/mundo-fullscreen/relatorio-ritmo-final.md`;
  **decisão do mantenedor: aceitar sem reequilíbrio** (2026-11-18).
- Canvas **768×432 de base com largura adaptativa**: altura fixa,
  `W = clamp(432 × aspecto, 768, 1728)` recalculado em `main.js
  resize()` (também no `orientationchange`); `Game.W` expõe a largura
  vigente e `Input.ajusta` acompanha o mapeamento do ponteiro. Em 16:9
  **W = 768 e tudo cai exatamente nas coordenadas de referência** (os
  cliques dos testes seguem válidos); em tela larga o layout se
  expande **ancorado**: top bar/rodapé/status/toast em largura toda
  (centro = `W/2`), mundo ao fundo, gestão à direita — o painel
  direito inteiro desloca com `ctx.translate(dx)` + `UI.deslocar(dx)`
  (dx = W − 768) e `Gestao.update` desconta dx do ponteiro (retângulos
  são locais ao painel); a **barra de abas centraliza** (desloca dx/2). × escala de exibição: `resize()` também calcula
  escala fracionária que preenche a janela (CSS) e
  `esc = escala × devicePixelRatio` (**fracionário** — o backing
  nasce na resolução da exibição: texto/vetores nítidos em qualquer
  escala, sem reamostragem CSS; spec `ajustes-playtest-3`) —
  `ctx.setTransform(esc,...)` por frame. **Nunca** desenhar em
  coordenadas de tela cheia: tudo é coordenada de jogo (W × 432).
- Mundo × janela (**spec `mundo-fullscreen` — k=1, sem zoom**):
  `VW/VH` são DINÂMICOS (largura = `Game.W`, altura fixa 432;
  `janelaOK()` sincroniza antes de cada leitura) — a tela inteira É
  a janela (`Batalha.desenhar(ctx, 0, 0, W, 432)`, `k = vw/VW` = 1:
  `translate(vx,vy) → scale(k) → translate(-cam)`). Física/câmera/
  ritmo vivem em unidades de mundo. Câmera `cam` com lerp em
  `atualizaCamera` centraliza o herói no **CENTRO DA TELA** (roda até
  pausada, é apresentação; teleporte >96px trava) — `info().janela` =
  `{768, 432}`. Obstáculos de `mapas.js` valem na base 192×134 e são
  escalados em `obstChunk`; inimigos nascem em anel DINÂMICO
  `raioSpawn()` ≈ **460px** (canto mais distante da tela + folga; era
  110-132 — **mudar isso muda o ritmo**, medido em
  `relatorio-ritmo-final.md`); renascimento em
  `posicaoAleatoriaSegura()` (**anel de 40-120px do herói**) e
  inimigos miram no local da morte. `info()` expõe `janela`/`mundo`
  (**região ativa com raio dinâmico = 5×5 chunks = 1920×1340** em
  16:9, derivada de `max(VW/2, raioSpawn())` — `atualizaObstAtivos`
  reconstrói no resize e `info()` se auto-sincroniza)/`cam`/`heroi`
  (`hpMax` incluso — sonda do fuzz; `hp` do info é `ceil`, então o
  máximo autoritativo é `heroi.hpMax`) para os testes (seções 17-18).
- **Tela de jogo (spec `mundo-fullscreen`)**: o mundo é o FUNDO e os
  elementos flutuam por cima. **Top bar** `faixaTopo(34)` de largura
  total: `NOME — MAPA n` (cursor) · `Nv` · XP · `Pontos` · botão
  **Opções dentro** em `(W−72, 8, 64, 24)` (coords de clique
  antigas valem) + linha de XP de 2px na base da faixa. **Sem dica
  persistente** (a `Combate 100% automático` saiu; só toasts
  transitórios de `Gravacao.msg` — `desenharAviso(ctx, dica, y,
  minX)`: jogo usa `minX=408` p/ não cobrir o título, seleção usa
  `y=340` na faixa livre acima do rodapé). **HP do herói SOBRE A
  CABEÇA** no espaço de mundo (`desenhaHeroi`: barra fina `alt×0,8` ×
  3px, ~6px acima do sprite, **só quando machucado**, sem número —
  estilo inimigo; a barra/texto antigos do HUD saíram). **Onda/cota
  no canto superior esquerdo** (`x=8, y=46/64` — único canto livre).
  Janela da Gestão flutuante à direita (retângulo intacto 408,36 ·
  352×300; `UI.janela` translúcida α0,88 + título = nome da aba +
  **X fecha**; estado `aberta` padrão ABERTO, `Gestao.update` ignora
  cliques de conteúdo fechada) e **barra de abas centrada no rodapé**
  (`Gestao.barra`: botões 68px/passo 72, centros
  `240/312/384/456/528` · y=418 em W=768, desloca **dx/2** em tela
  larga — desenhada ANTES da janela p/ a aba trocar no MESMO frame
  do clique; geometria em `Gestao.abasGeom()`).
- **Mundos vivos (spec `mundos-vivos`)** — cenário e vida SEM mexer
  no ritmo (nada de spawn/XP/dano muda): **folhagem** por chunk (PNGs
  de `assets/cenario/` assados no `chunkDe` — paleta por tema via o
  campo `folhagem` de `Mapas.LISTA` [verde 1/5/6 · frio 2/8/9 ·
  quente 3/4/7/10], sorteio com o rng do chão = **último uso do
  rng** do bake; sem PNG = dots pintados continuam), **1 vila por
  mapa** (`vilaDe()` em `batalha.js`: semente do mapa, centro
  200-360px do spawn, fogueira no miolo [dd 0-35, **opcional**] +
  2-3 casas no anel [dd 60-130], colidente `r` 18/14 com `cy`
  deslocado; busca angular em **círculo livre** — a faixa estreita
  morria 60/60 contra obstáculo; merge **DEPOIS** dos itens de chunk
  em `atualizaObstAtivos` → `obst[0]` intacto; contratos da fumaça
  20: ≥55px entre QUALQUER par + zona livre 72×64; sonda
  `info().vila`), **vidas** em `js/ambientais.js` (declarado no
  `index.html` antes de `batalha.js`): NPCs ancorados na frente das
  peças da vila (vagueio + espera, validado contra `colideObst`) e
  animais por chunk (semente mapa+chunk, ~42%/chunk, teto `CAP` 12 na
  janela ativa) com **fuga a 60px** do herói — ZERO impacto: fora de
  `inimigos`/`obst`/stats/XP. A batalha alimenta: `.reinicia` no
  `garanteCenario`, `.atualiza(dt, cfg)` no topo do frame (após
  pausa/hit-stop), y-sort `t=5` na cena e `.sincroniza` no `info()`
  (ler sem frame — mesmo tratamento do `info().obst`). **Ícones das
  skills** (32 em `assets/icones/`, ordem da `Skills.LISTA` via
  `indexOf`) desenhados pela opção `icon` NOVA do `UI.button` (o
  texto anda junto; retângulo de clique intacto; fonte das skills
  10→9px p/ o nome caber). Pipeline: `js/assets.js` manifesto
  `{dir, qtd}` na mesma `carga` (92 peças; fallback por construção =
  não desenha), `testes/prepara-cenario.js` (corte por alfa
  CONECTADO + fusão de fragmentos <12px + `pega` [remapeia
  peça→skill: o modelo desenha na ordem dele] + `quadro` [normaliza
  14×14]) e `previa-assets` com 4 linhas de cenário + 4 de ícones.
  Fumaça seções 20 (tipos estendidos `casa`/`fogueira` + vila) e 20b
  (NPCs/animais/fuga/abates intactos). Arte via presets do SpriteCook
  (Foliage, Character&Props, Tiny medieval, Tiny animals, Skill
  Icons) com `style_asset_ids` dos sheets do herói; IDs em
  `spritecook-assets.json` — monstros gerados e **adiados** (R-MV-7).
- **Mundos (spec `mundos`)**: campanha **10 mundos × 10 mapas × 100
  ondas** (`FIM_MAPA` intacto — a onda 100 é o chefe; vencido,
  `passaMapa()` faz `mapa++` e volta a onda 1). `Mapas.mundo(n)` =
  `ceil(n/10)` e `noMundo(n)` (fonte única, exportados); **tema é do
  MAPA** (`info(n)` → `LISTA[(n−1)%10]`, **10 temas autorais**
  ciclando a cada 10 mapas — spec `mapa-infinito` R-INF-9, era por
  MUNDO: cor/textura/mobs alternam a cada mapa; fix do chão que
  travava no tema 3 do mapa 4 em diante). Dados em `js/mapas.js` (`Mapas.forca(n)` só nos drops de
  item; dificuldade/XP de combate = escala contínua `ondaTotal()` em
  `batalha.js` — onda 1 do mapa 2 = patamar da onda 100 do mapa 1);
  cenário reconstruído por `garanteCenario()`. **Espera entre ondas =
  `BEAT` de 2s** (spec `onda-timer` — era `esperaOnda()` com rampa até
  111s, removida por decisão do mantenedor: "muito ruim e chato") — o
  campo limpo → batida → próxima onda, e **cada onda tem cota de
  `ONDA_SEG` 20s** (era 30; 15s medido e recusou — virou fluxo
  contínuo): não limpou → `ONDA ATRASADA — REFORÇOS!` (sobreviventes + novos; medido com anel 460: atraso ~20%, espera
  ~9%, clear p95 ~41s; pré-fullscreen com cota30: atraso 0,0%,
  clear p95 18s). A **alavanca de duração** da campanha passou a ser
  o **clear** (medido: **44,0h a vitória** — sim seed1; modelo
  ~35h subestimou o clear do late);
  pós-chefe usa `ESPERA_TRANSICAO` fixo 8s e o kill do
  chefe zera o timer — troca de mapa = 8s únicos, não 16). **Escala de
  monstros**:
  `qtdMonstros()` = `min(3+tot/2, teto)` com teto **5→11** shipado
  (`ESC_MONSTROS_K 0,75` desde a leva `balance-dopamina`; antes 0,5 —
  medido: k=1 estolou o mundo 3 em 2 de 2 com ESC_HP 1,90; k=0
  saudável em 3/3) até o fim da campanha — variantes
  `'mundo'` (degraus por fronteira) e `'mapa'` (suave),
  `escalaMonstros(modo, k)` exposta p/ o A/B; `k=0` = teto fixo 5. **Medido: o nº
  de monstros NÃO muda a duração** (só o perigo — XP extra fortalece);
  quem controla tempo é o **clear** (+ a cota `ONDA_SEG` como freio de
  build fraca). Vitória: chefe do mapa 100 →
  overlay em `jogo.js` (`UI.bloqueia` + `p.vitoria`, normalizar com
  default `false`) → Continuar = modo infinito. O estado salvo guarda `mapa` e
  `Salvar.lerEstado` migra saves legados (onda >100 → mapa/onda equivalentes)
  — a migração é na leitura, sem rewrite.
- Mapas procedurais em `js/perlin.js` (Perlin melhorado + mulberry32):
  a **semente é o número do mapa** (mesmo mapa = mesmo layout, em qualquer
  sessão) e é aplicada em `Batalha.garanteCenario` → `Perlin.definirSemente`;
  **desde o mapa-infinito o terreno é POR CHUNK** (384×268): o chão é
  cache de `chunkDe(cx, cy)` renderizado sob demanda (manchas amostram
  a coordenada ABSOLUTA do Perlin = contínuo entre chunks) e os
  obstáculos são `obstChunk(cx, cy)` com semente mapa+chunk, filtrados
  (clareira do ruído em coord. absoluta, centro livre ≥36×32 base,
  ≥30 de base entre vizinhos **+ margem [12,176] que garante ≥56 entre
  chunks**; densidade/tipos vêm de
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
  `pontuarEfet` no auto-equip) e `reroll` (normal: o negativo só sai com
  rol positivo; lendário: o negativo é mantido — é o preço);
  UI na aba Itens: `V`/`S` por linha, `A+`/`R+` nos slots, linha de ouro
  e legenda. **Lendários (rar 4)**: `LEGENDARIOS` (2 por tema; os 3 pools
  ciclam POR MUNDO via `Itens.temaDe`→`Mapas.mundo`, enquanto o tema do
  chão é por MAPA — R-INF-9), 1% dos drops + 15% no chefe,
  **1 neg forçado + 1 pos** (o re-roll do lendário NÃO apaga o negativo);
  efeitos = matemática pura em `Itens`
  (`temEfeito/multDano/multOuro/pctVamp`) + gatilhos em `Batalha`
  (vampiro em `stat`, fúria no refresh de stats, ouro em `mataInimigo`,
  2ª vida em `danoHeroi`, reset em `proximaOnda`, cura fere em
  `skillsPeriodicas`); testes ao vivo leem o `status` AO VIVO (lag de 1
  frame no hit). **`personagem.js` não pode depender de `itens.js`**
  (grade/previa carregam só sprite+personagem) — chaves de bônus **e**
  `APR`/`MAX_UP` são espelhadas nos dois arquivos.
- **UI visual (spec `visual-ui`)** — base visual em
  `/home/thiago/Projetos/Docs/ui.md`: `UI.PALETA` (fonte única do
  cromo) + primitivas **com fallback** — `grad` (sem
  `createLinearGradient` real → 1ª cor sólida), `caminho` (probe de
  assinatura: o Proxy do harness tem `length 0` → `rect`), `caixa`,
  `sombra`, `tom` (hex misturado com branco) e `text` com sombra
  **opt-in** (`o.sombra` dobra `fillText` — só ligue onde os testes
  usam `.some`). Receitas: `fundo`/`faixaTopo` (gradiente + fio
  dourado — as 4 cenas chamam), `panel` (sombra + gradiente + borda
  por **duplo preenchimento** — `strokeRect` não acompanha canto e
  `stroke()` é no-op — + faixa `[8,8,0,0]`), `button` (4 estados do
  doc; **só o desenho muda — o retângulo de clique é contrato**),
  **`janela`/`barra`** (flutuantes translúcidas α0,88 + barra de
  título — spec `mundo-fullscreen`: janela da Gestão, top bar e
  contêiner da barra de abas), `bar` (degradê + brilho; guarda
  `h>=4` intacta), tooltip/swatch
  r=4. **Testes veem quadrado/chapado, navegador vê
  arredondado/gradiente.** CSS com moldura do "monitor" (fio dourado
  + anel + halo) em `style.css`. Fumaça seção 46.
- Tooltips (Leva 3) em `js/ui.js`: `UI.dica(ret, linhas)` é chamado
  durante o render (retângulo LOCAL como os botões; o rodapé é global —
  `deslocX` está 0 lá) e `UI.desenhaTooltip()` fecha o render de
  `jogo.js`/`selecao.js` — desenhado por cima de tudo, **sem hit-test**.
  Dwell por FRAME com flag `usada` (nunca zerar o candidato por frame —
  senão o delay nunca completa). Long-press 500ms → caixa retida, clique
  fora fecha. Linhas = `[[texto, cor?], …]`, fonte 13px, sem
  `measureText` (rasterizador). Rodapé: segmentos fixos (HP · Dano ·
  DPS · Vel · Crít · Alc · arma) com breakdown de
  `Personagem.statusDetalhado(p)` (partes NUMÉRICAS — UI formata,
  teste soma: Σpartes × keystone === status; os clamps finais entram
  como linhas: `limite 45%`, `limite 250`, `piso 1/10`, `piso 0%`);
  item em `Itens.dicas`;
  atributo em `Gestao.dicasAtributo`.
- Gestão tem 5 abas (Atrib/Apar/Classe/Itens/Stats): os botões
  saíram de dentro do painel (grade antiga x=412+passo70, y=40) para
  a **barra inferior centrada** `Gestao.barra` — centros
  240/312/384/456/528 em y=418 (W=768), passo 72, **dx/2** em tela
  larga; `Gestao.abasGeom()` expõe centros/`fechar`/`aberta`; testes
  que clicam abas dependem dessa grade (remapeada na leva
  `mundo-fullscreen`).
- Skills automáticas em `js/skills.js` (procs por classe; **8 skills**
  em **5/15/25/35/45/60/150/400**) com **loadout escalonado**
  (`Skills.limite(nivel)` = 3 → **4 no nv 50** → **5 no nv 150**;
  `Skills.LIMITE = 5` é o teto ABSOLUTO (espelho do
  `normalizaLoadout`); `Skills.carregadas(p)` = desbloqueadas ∩
  `p.loadout` **fatiada no limite atual**, automático = as `limite`
  mais avançadas; `Batalha` lê só ela). **RAMOS** (árvore literal,
  spec `arvore-skills`): toda skill tem 2 variantes
  (`ramos:[{id,nome,efeito,mods}]`) com **mods numéricos** (fatores
  × campos) — escolha em `p.ramos` (ciclo **base→A→B**, **base
  neutra sem escolha** = valores originais intactos — quem não mexe
  joga o baseline medido); `Skills.comRamo` faz o merge (**`aCada`
  arredonda ≥1** — o proc `area` usa `%`; **`gatilho` proibido** nos
  mods) e `carregadas` devolve as skills PRONTAS — **a batalha não
  muda** (lê campos). Sentido buff/nerf em `Skills.SENTIDO` (todo
  ramo mistura os dois — asserção na 43). UI na aba Classe: **grade
  2×4** (toggle 110 + ramo 52; linha `178+floor(i/2)*29`, coluna
  `416+(i%2)*174` — coordenadas viram contrato de teste), tooltips
  com os ramos, aviso no level-up quando o teto sobe (nv 50/150). **Keystones** (1 por classe,
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
- Velocidades (spec `velocidade-curva` + emenda `ajustes-playtest-2`):
  `recarga = Math.max(0.08, 35/vel)` — **piso 0,08s = teto 12,5 g/s**
  (história: piso 0,15 estagnava a DES em 6,67 g/s desde DES 62 → a
  leva de velocidade tirou o piso → o playtest sentiu 44 g/s "rápido
  demais" → piso 0,08) e `mover()` com **sub-passos ≤4px**
  (fração aplicada com `resolve()` — sem isso, DES alta salta por cima
  dos obstáculos de r=5-7; seção 34 prova com propriedade geométrica +
  caso sintético). `info().obst` expõe `cx/cy/r` (centro de colisão cru
  — `y` exposto é a âncora do sprite, não o centro).
- Ranking global (spec `ranking`) em `js/ranking.js` + config em
  `js/ranking-config.js` (declaram os dois no `index.html` **antes** de
  `batalha.js`, que os chama nos gatilhos): Firebase/Firestore **sem
  servidor** — SDK por **lazy-load** (injeção de `<script>` do CDN só
  ao abrir a cena) e **degradação total** sem config/rede (`submete`/
  `top` viram no-op, cena mostra "não configurado", cache local em
  `rpg_rank_cache_v1`) — o jogo **nunca** depende de rede. Score =
  `mapa×100000 + onda×1000 + min(nv,999)` (onda 0 conta como 1; ordem
  estrita: mapa M onda 100 < mapa M+1 onda 1). Doc por **slug** do
  apelido; envio só na MELHORIA (cliente) e as regras do Firestore
  reforçam no servidor (`update` exige `score >` anterior; ver
  `.specs/features/ranking/regras-firestore.rules`). Gatilhos em
  `Batalha.passaMapa()` e na morte **antes** de `penalizaMorte` (progresso
  real, não pós-rollback); `passaMapa` está exportado p/ teste. Cena
  `ranking` registrada em `main.js`, botão na seleção (260,306,108,26).
  **Limite conhecido**: as regras não exigem `request.auth`/App Check e o
  teto de progressão é global (`mapa <= 30 + minutos/100` desde
  2026-11-01), então progresso inventado dentro do teto é aceito — é
  "melhor esforço", não placar competitivo (ver CONCERNS).
  Seção 35: SDK fake é **thenable síncrono** (sem microtasks no
  harness); fake de gravação registra `['set', id, doc]` p/ asserções.
- Ajustes playtest 2 (spec `ajustes-playtest-2`) + leva `mundos`:
  **teto de nível 9500** (era 1000) — `Personagem.NIVEL_MAX` (fonte
  única); `Batalha.ganhaXP` (exportado p/ teste) DESCARTA o XP no cap e
  zera a sobra; `normalizar` clampa `nivel ≤ 9500` na leitura (save nv
  36k → 9500, atributos intactos, sem bump de chave) e o XP em
  `xpProx − 1` — acima de ~2^53 o `−1` não é representável (nv ~500) e
  o clamp usa epsilon relativo para manter `xp < xpProx` sempre;
  cabeçalho mostra
  **"MÁXIMO"**. **9500 = p/ níveis durarem os 200h da campanha**: a
  trajetória é `nv ≈ 0,9166 × ondas` (ratio ln H/ln G) → fim de
  campanha (T=9.999) ≈ nv 9.150 < teto, e as curvas re-baseadas só
  estouram `1e308` muito acima (renda em T≈11.433, custo em nv≈10.441)
  — com as curvas antigas (1,11/1,10) qualquer teto ≤ 6.800 morria ANTES
  do fim. **No modo infinito** a renda chega ao estouro (T≈11.433 = mapa
  ~115): `Batalha.xpAbate` devolve **1e300** (finito) em vez de
  `Infinity` — o popup mostrava "+Infinity XP"; o `ganhaXP` já descarta
  no teto de nível. **`UI.abrev`** cobre >10⁶⁰ com notação científica pt-BR
  (`1,5e281`). Aba Stats:
  **bloco de cooldowns efetivos** (`IA.skillEfeito` com a agudeza da
  INT — espelho do `aguHeroi`; área ≈ `aCada × recarga atual`) +
  **rolagem** (wheel via `Input.roda()`, zerado no `endFrame` como o
  `typed`; thumb com offset de agarre em `Gestao`; linhas fora da faixa
  são PULADAS — sem `clip`, que o rasterizador não tem). Ranking:
  `Ranking.ultimoEnvio()` = `{ok, motivo, quando, detalhe}` + toast
  (dica única por sessão p/ sem-apelido e file://) + linha de status na
  cena — rejeição do `set` guarda a mensagem; `file://` detectado antes
  de qualquer tentativa (o README manda abrir direto, mas Firebase
  exige http(s)). Sonda REST das regras: válida 200 / inválida 403.
  Testes: seções 36/37.
- Playtest/correções: **medir antes de consertar** — sondas no
  `info()` (`inimigoPerto`, `atacando`, `destino`) existem p/ fixtures
  das seções 32; cada fix de IA/combate vira conf que falhava antes.
  `clampFuga` em `ia.js` limita o destino de fuga a **96px do herói**
  (era: limites do mundo 384×268 — spec mapa-infinito R-INF-3, sem
  parede a proteção é a distância); o **teleporte/blink** do mago e do
  clérigo também deixou de clampar em `MW/MH` (o resíduo arrastava o
  herói para o canto antigo; fumaça seção 53, sonda `_posicionaHeroi`);
  em `batalha.js`, destino a <24px = sem espaço → o herói
  briga em vez de empurrar parede; a animação do golpe é
  `min(0.36, recarga)` (o `atkT` fixo de 0,36s estagnava a DES em ~17
  pontos). Aba Itens: `p.trava.{arma,armadura}` (fixar slot — só o
  auto-equip respeita) e `p.autoApr` (Auto A+, roda em
  `Gestao.update`, 0,5s, menor custo, padrão OFF). Aba Stats: bloco
  `Base → total` de `statusDetalhado(p).{hp,dano,vel,crit}.base`.
- Estatísticas do jogador em `p.stats` (`Personagem.STATS`: abates,
  mortes, dano causado/recebido, ondas, bosses, itens, tempo, gatunos,
  acougueiros, ouroGanho, ouroGasto, vendidos, sucateados,
  aprimoramentos, rerolls, lendarios) incrementadas
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
  ×(1−agu)) roda uma **Behavior Tree** (spec `ia-heroi`): seletor de
  `CAMADAS` por prioridade (sobrevivência→`recuar` · posicionamento→
  `kite` · combate · perseguição; `espera` sem inimigos = os mesmos 5
  estados de sempre) com **profundidade pela INT**
  (`profundidade(agu)` 1/2/3 — os gates de sempre 0,35/0,45 =
  comportamento medido intacto) e decorador de ruído (cambaleia)
  pós-seleção; destino de fuga via **`direcaoEvasao`** (12 direções a
  partir da base, score = ocupação 3×3 + 100×rocha, `<` estrito
  desempata em k=0 → **mapa vazio = destino antigo**);
  `astucia(tipo, mapa)` (base da espécie + 0,12/mapa, teto 1) →
  `decideInimigo` (cerco ≥0,35 via **influence map** — `destinoCerco`
  escolhe entre **12 candidatos a raio exato 11** com score = ocupação
  3×3 ×3 + preferência do ângulo do `en.slot`, rejeitando obstáculos e
  descontando a própria célula; antecipação ≥0,45 usando
  `heroi.escapa` (direção da fuga, 0,6s), esquiva ≥0,55 com cooldown
  3,5−1,5×ast); **flocking** — `separacao` (só monstro×monstro, raio
  somado+6px, teto 10px, **0 com 1 monstro**) desloca o alvo em
  `atualizaInimigos` com **clamp a 12,5px do alvo** (sem o clamp o
  destino sai de 13px e o golpe nunca sai; base longa tipo antecipação
  não é clampada); `pintaMapa` repinta a **ocupação** no **topo de
  `atualizar()`** — antes do herói e dos monstros, os dois leem a
  pintura do frame (grade
  **8px** 48×34 — resolução menor que o anel de 11px; a do A* segue
  16px) e `celulaObst` consulta `colideObst` com o raio da entidade
  (sem memo entre frames = nunca stale entre mapas); `skillEfeito` aplicado
  em `skillsPeriodicas`/`skillsPosicionamento` (raio/cooldown por
  agudeza); `linhaLivre`/`caminho` (A* 16px/8-dir) chamados por
  `Batalha.moverPara` **só** com linha bloqueada + entidade esperta
  (herói agu≥0,35, monstro ast≥0,4 — burros escorregam na colisão).
  Esquiva inimiga faz o golpe errar ('ESQUIVOU!') em `golpeCorpo` e na
  chegada do projétil (AoE/nuke acertam sempre). Exposições em `info()`:
  `heroi.estado`/`heroi.agu`/`heroi.prof`/`esquivando`. Fumaça seções
  22-23 (IA do herói/monstros) e 44-45 (flocking + Behavior Tree).
- Efeitos visuais em `js/efeitos.js` (spec `visual-efeitos` — dono
  único do feedback, base `Docs/efeitos.md`): **pools com teto**
  (`parts 380 · nums 50 · aneis 24 · raios 8 · arcos 10` via
  `limitar`), **receitas com valores exatos** (`impacto`/crítico,
  `impactoHeroi`/fatal, `morte`/chefe, `nivelUp`, `reviver`,
  `bossChegou`, `corte` 16 segmentos, `raio` vertical + `raioRadial`)
  e **game feel**: `sacudir` (fórmula do doc; `shakeOffset()` inteiro
  — `Batalha.desenhar` traduz), **`parar`/`congelar` = hit-stop** no
  topo de `atualizar` **após a pausa** (congela mundo E partículas;
  o tempo de jogo não corre), `flashTela` (fraco nunca substitui o
  forte), `bordaTela` e `perigo` (<35% pisca vermelho, chamado todo
  frame). **3 camadas**: `desenharBaixo` (anéis no chão, antes das
  entidades) · `desenharTopo` (aditiva `lighter` → sólida → fumaça →
  números) · `desenharTela(ctx, vx, vy, vw, vh)` (**espaço de
  janela**, depois do `restore` — desvio documentado: flash/vinheta
  têm que cobrir a janela, não o mundo com câmera) · `auraBoss`
  atrás do sprite do chefe (`en.tipo.boss`). **Números moram aqui**:
  `nota(x, y, txt, cor, estilo)` em 3 estilos (normal/crit com tremor
  e halo dourado/big com pulso — `Batalha.numero` é fachada e o
  booleano legado `true` = 'big'; só o dano crítico virou 'crit').
  **`silenciar`** bloqueia os spawns DECORATIVOS e zera pools —
  **`missil` é exceção** (leva dano na chegada: a simulação offline
  precisa que ele voe; `voltaAusencia` envolve junto do
  `Cutscene.silenciar`). Glow/anel = sprites offscreen gerados 1×
  (fillRect 1×1 com alpha — funciona em todo ctx do harness) e
  desenhados com `drawImage` (o rasterizador multiplica
  `globalAlpha`). **Só primitivas que `testes/cena.js` rasteriza** —
  `fillRect`, `strokeRect`, `ellipse`+`fill`, `rect`+`fill`,
  `drawImage`, `translate`/`scale`/`setTransform`, `globalAlpha`;
  `arc`/`stroke()`/gradiente **quebram o screenshot** (`stroke()` é
  no-op; gradiente cai no fallback sólido), `lighter` só soma no
  navegador; **`drawImage` com escala negativa espelha** (auto-check
  no `cena.js`, spec `virada-ataque`). O dano do missil vive no callback que a `Batalha`
  passa. Em teste, para zerar TUDO use `Batalha.limparEfeitos()` (=
  `Efeitos.limpar()` — cobre nums/parts/anéis/shake/hit-stop/flash
  desde esta spec). Fumaça seção 49.

## Testes — peculiaridades

- Os testes executam o jogo inteiro no Node via `testes/carga.js`: DOM,
  canvas e `localStorage` falsificados, scripts rodando num sandbox `vm` com
  **whitelist de globals**.
- Se o código do jogo passar a usar uma API de navegador que não está stubada
  ali (`setInterval`, `Image`, `crypto`...), os testes quebram com
  `ReferenceError` — adicione o stub no sandbox de `carga.js`.
  O **stub de `Image`** decodifica PNG do disco de forma **síncrona**
  (onload dispara dentro do `src`) e expõe `_data` RGBA — convenção
  do `cena.js`; `grade.js`/`previa-assets.js` leem esse buffer com
  stride 4. `testes/png.js` lê e grava RGB **e RGBA** (o sprite do
  jogo tem alfa).
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
  `rpg_ultimo_id`, `rpg_estado_v1` (e as do ranking: `rpg_rank_nick_v1`,
  `rpg_rank_cache_v1`, `rpg_rank_ultimo_v1`; e a das opções:
  `rpg_opcoes_v1` — toggles de conforto, lida/grava em `js/opcoes.js`
  com merge defensivo sobre o padrão; sem escolha salva, respeita
  `prefers-reduced-motion` (shake/flash desligados)). Ao alterar o formato do
  save, suba o sufixo `_v1` e/ou normalize na leitura (`Personagem.normalizar`) — não
  quebre saves antigos em silêncio (hoje: `p.stats` via
  `Personagem.normalizaStats`). **`normalizar` nunca pode lançar** para
  JSON arbitrário (o `listar` roda no boot): nome não-string/espaço cai
  no fallback `Herói`, `xp < xpProx` usa epsilon relativo no nível alto e
  `listar`/`gravar` isolam/preservam uma entrada que quebre a
  normalização (nada é apagado).
- **Tetos de item × mapa infinito**: `normalizaItem` aceita bônus/afixo
  até **1e9** e `escala` até **1e6** (os antigos 99.999/999 apagavam o
  bônus e congelavam a escala de itens acima do mapa ~3.000 na leitura).
- A **assinatura** (`js/assinatura.js`, HMAC com a chave no bundle) é
  barreira casual, não segredo: o import aceita JSON **sem `_s`**
  (backup antigo) e apagar `rpg_assinatura_v1` faz `listar()` re-assinar
  tudo. Save rejeitado é preservado no storage e a seleção avisa (não é
  destruído); o placar não depende disso (regras do servidor).

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
