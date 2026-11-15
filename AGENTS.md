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
  Leva 1 (medido): ESC_HP 1,30 · ESC_DMG 0,10; hoje (leva
  `progressao-exponencial`): **ESC_HP 1,90 · ESC_DMG 0,045**.
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
  e recarga 0,08 têm; vel/XP/HP não tinham). Hoje: **velocidade =
  `46 + 24×(DES/8)^0,35`** (potência saturante — parte de 70 em DES 8,
  ~241 no fim mono-stat) **+ clamp final 250 px/s** aplicado DEPOIS de
  item+keystone (`VEL_MAX`, sem ele o afixo daria +1.968 no mapa 100 e
  contornaria); **afixo `vel` com escala limitada em 5×** (`escalaVel`
  — o dano mantém escala cheia); **regen com teto 500 hp/s**
  (`REGEN_MAX` — sem ele, HP late 70k regenerava 2.800/s = invencível;
  o HP em si não mexe, sustenta a frente); **Carisma → ouro**
  (`Personagem.multOuroCar`, logarítmico) e **clérigo `danoMod:'car'`**.
  **`xpMult` eliminado** — a renda é exatamente a calibrada.
  **Ritmo de pontos: 1 a cada 3 níveis** (`Personagem.PONTOS_CADA/
  NIVEL` — era 3/nível = 6 decisões/min) **+ compensação 9×**
  (`Personagem.ganhoAtributo`): 1 ponto/3nível = 9× menos pontos, então
  **cada ponto vale 9× mais** (a progressão de poder fica idêntica à
  medida — sem a compensação a medição estolou: 223 mortes/1200min).
  Regra: até a **base** (8+bônus de classe) vale o linear antigo
  (atributo baixo paga penalidade); acima dela, 9×. Metas de sanidade
  na seção 40 (vel ≤250, sub-passos, afixo, regen, cadência).
- Curva de progressão com fonte única em `Personagem.custoProximo`
  (**exponencial**: `146 × 1,07^(nv−1)` — leva `progressao-exponencial`
  calibrava 1,11; a leva `mundos` RE-BASEOU p/ `1,07` junto com H
  `1,10→1,064`, mantendo o ratio `ln(H)/ln(G)` ≈ 0,916 — o linear
  antigo estolava) e renda em `Batalha.xpAbate`
  (**`12 × 1,064^ondaTotal`**, harmônica com o custo → tempo/nível
  estável). Combate em `Batalha`: `ESC_HP 1,90 · ESC_DMG 0,045 ·
  esperaOnda()` (respiro = regen: alavanca de ritmo que NÃO piora
  clear/survival — ver a linha de Mapas abaixo) + `HP_POR_NIVEL 6` em
  `personagem.js` (fonte única — NÃO espelhe fórmula em
  `statusDetalhado`). Mudou algum? Meça com
  `node testes/ritmo.js [min] [mundo|mapa] [k] [semente]` (marcos até
  13.500min p/ a campanha inteira +
  coluna nv/min; argv 2/3 = variante da escala de monstros; argv 4 =
  seed do `Math.random`, padrão 1 → run DETERMINÍSTICO, eventos
  aleatórios ATIVOS (mesma semente = mesmo run = A/B limpo; ≥4 seeds
  por decisão); grava `resultados/ritmo.json` (gitignored) com
  config/marcos/níveis/métricas/commit; métricas: kpm/dps/ttk/espera%/uptime/xpm/gpm/eficiência
  ouro/mortes-h/hpMin/inimigos; fica fora
  do `todos.js`) — **≥4 runs por decisão** (run único iludiu uma
  "validação"). **Cliff mapeado**: produto `ESC_HP×ESC_DMG ≤0,086`
  passa / `≥0,095` estola o mapa 3 em 4/4 (renda fixa num tot parado ×
  custo exponencial = estol estrutural; a morte −5 amplifica). **O
  `ritmo.js` gasta ouro** (keystone no nv 30 + aprimoramento do slot
  mais barato a cada 10s — o baseline é o do jogador que GERENCIA). Alvos
  medidos hoje (média de 4 runs, pós-re-base): 1º nível ~47s ·
  15min = nv 29-33 / onda 43-47 (a banda 33-38 era do G 1,11) ·
  mapa 1 fechado ~31-33min · **SIM COMPLETA: vitória em 222,5h**
  (alvo 200h ±20%), nv final 9.167 (modelo 9.150), 65 mortes/222h
  (eventos), sem estol até o mapa 101 (nv9500 ≤ fim de campanha).
  Variância
  de RNG: decidir pela média de ≥4 runs.
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
  `esc = escala × devicePixelRatio` (**fracionário** — o backing
  nasce na resolução da exibição: texto/vetores nítidos em qualquer
  escala, sem reamostragem CSS; spec `ajustes-playtest-3`) —
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
- **Mundos (spec `mundos`)**: campanha **10 mundos × 10 mapas × 100
  ondas** (`FIM_MAPA` intacto — a onda 100 é o chefe; vencido,
  `passaMapa()` faz `mapa++` e volta a onda 1). `Mapas.mundo(n)` =
  `ceil(n/10)` e `noMundo(n)` (fonte única, exportados); **tema é do
  MUNDO** (`info(n)` → `LISTA[(mundo−1)%10]`, **10 temas autorais**,
  ciclando no infinito — fix do chão que travava no tema 3 do mapa 4 em
  diante). Dados em `js/mapas.js` (`Mapas.forca(n)` só nos drops de
  item; dificuldade/XP de combate = escala contínua `ondaTotal()` em
  `batalha.js` — onda 1 do mapa 2 = patamar da onda 100 do mapa 1);
  cenário reconstruído por `garanteCenario()`. **Respiro entre ondas =
  `esperaOnda()`** (`8 + (min(mapa,100)−1) × 1,1`s — a **alavanca de
  duração** da campanha: mundo 1 intacto = 8s / mapa 1 ≈ 33min, fim da
  campanha = 117s; no infinito trava no patamar do mundo 10; pós-chefe
  usa `ESPERA_TRANSICAO` fixo 8s). **Escala de monstros**:
  `qtdMonstros()` = `min(3+tot/2, teto)` com teto **5→9** shipado
  (`ESC_MONSTROS_K 0,5` — medido: k=1 estolou o mundo 3 em 2 de 2
  runs; k=0 saudável em 3/3) até o fim da campanha — variantes
  `'mundo'` (degraus por fronteira) e `'mapa'` (suave),
  `escalaMonstros(modo, k)` exposta p/ o A/B; `k=0` = teto fixo 5. **Medido: o nº
  de monstros NÃO muda a duração** (só o perigo — XP extra fortalece);
  quem controla tempo é o `esperaOnda()`. Vitória: chefe do mapa 100 →
  overlay em `jogo.js` (`UI.bloqueia` + `p.vitoria`, normalizar com
  default `false`) → Continuar = modo infinito. O estado salvo guarda `mapa` e
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
  `bar` (degradê + brilho; guarda `h>=4` intacta), tooltip/swatch
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
  DPS · Vel · Crít · Alc · XP) com breakdown de
  `Personagem.statusDetalhado(p)` (partes NUMÉRICAS — UI formata,
  teste soma: Σpartes × keystone === status); item em `Itens.dicas`;
  atributo em `Gestao.dicasAtributo`.
- Gestão tem 5 abas (Atrib/Apar/Classe/Itens/Stats): botões de 66px com
  passo 70 a partir de x=412, y=40 — centros 445/515/585/655/725 em y=54;
  testes que clicam abas dependem dessa grade.
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
  Seção 35: SDK fake é **thenable síncrono** (sem microtasks no
  harness); fake de gravação registra `['set', id, doc]` p/ asserções.
- Ajustes playtest 2 (spec `ajustes-playtest-2`) + leva `mundos`:
  **teto de nível 9500** (era 1000) — `Personagem.NIVEL_MAX` (fonte
  única); `Batalha.ganhaXP` (exportado p/ teste) DESCARTA o XP no cap e
  zera a sobra; `normalizar` clampa `nivel ≤ 9500` na leitura (save nv
  36k → 9500, atributos intactos, sem bump de chave); cabeçalho mostra
  **"MÁXIMO"**. **9500 = p/ níveis durarem os 200h da campanha**: a
  trajetória é `nv ≈ 0,9166 × ondas` (ratio ln H/ln G) → fim de
  campanha (T=9.999) ≈ nv 9.150 < teto, e as curvas re-baseadas só
  estouram `1e308` muito acima (renda em T≈11.433, custo em nv≈10.441)
  — com as curvas antigas (1,11/1,10) qualquer teto ≤ 6.800 morria ANTES
  do fim. **`UI.abrev`** cobre >10⁶⁰ com notação científica pt-BR
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
  `clampFuga` em `ia.js` prende destinos de fuga aos limites (384×268,
  margem 16); em `batalha.js`, destino a <24px = sem espaço → o herói
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
  `rpg_rank_cache_v1`, `rpg_rank_ultimo_v1`). Ao alterar o formato do
  save, suba o sufixo `_v1` e/ou normalize na leitura (`Personagem.normalizar`) — não
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
