# Changelog

Todas as mudanças notáveis deste projeto são documentadas aqui.
Formato [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) ·
Versionamento [Semantic Versioning](https://semver.org/lang/pt-BR/) em
**0.x** — política completa em `.specs/project/VERSIONING.md`.

As linhas citam os commits (`sha`) e a rastreabilidade requisito→commit
vive em `.specs/features/`.

## [Unreleased]

### Added

- **Onda com cota de tempo (spec `onda-timer`)** — fechamento da
  queixa "o personagem dorme entre as ondas": **a espera entre ondas
  SAIU** (era `esperaOnda()` com rampa até111s e depois `ESPERA_TETO
  45s` — removidas por decisão do mantenedor: "muito ruim e chato").
  Ciclo novo: **clear → batida de `BEAT 2s` → próxima onda na hora**
  (o toast `ONDA LIMPA` respira) e **cada onda tem cota de
  `ONDA_SEG 30s`**: não limpou no prazo → `ONDA ATRASADA —
  REFORÇOS!` e a nova onda entra **com os sobreviventes** (build fraca
  = campo acumulando = espiral → morte = −5 ondas; build boa = campanha
  na velocidade do clear). **Chefe isento** (clímax sem prazo,
  `cota=-1`), HUD vira `TEMPO Xs` durante o combate (vermelho ≤5s) e
  `info().cota` expõe o timer. X escolhido por medição: baseline
  clear p95 =18s → cota30 = folga67% (**`atrasoPct 0,00%` em4 seeds**).
  A/B (4 seeds ×240min): espera%37→17, **mapa9→12, nv777→1050**,
  clear intacto, mortes0. `ritmo.js` ganha `clearMedio/clearP95/
  clearMax/atrasoPct`. A alavanca de duração da campanha passou a ser
  o **clear** (~35h modelo — sim completa em curso).


- **Mapa procedural infinito (spec `mapa-infinito`)** — playtest:
  *"esse mapa limitado faz o char sumir da tela, fica só metade dele
  qnd sobe"*. O herói agora fica **sempre no centro da janela**:
  câmera sem clamp de bordas (R-INF-1), mundo sem limites — `resolve`/
  `spawn` sem clamps, renascimento em **anel de 40-120px do herói**
  (R-INF-2), fuga limitada a **96px do herói** (R-INF-3, era limites
  do mundo) e gatuno foge por **distância** (240px, era borda — R-INF-4,
  o clamp antigo o prendia no mundo velho). Terreno **por chunk**
  384×268 renderizado sob demanda (R-INF-5: manchas do Perlin em
  coordenada absoluta = contínuo, flores/pedrinhas por chunk, **sem
  borda desenhada**) e obstáculos por chunk com lista ativa 3×3 em
  volta do herói (R-INF-6). A* e influence map em **janelas rolantes**
  ancoradas na entidade/herói (R-INF-7/8 — era grade absoluta que
  colapsava longe do 0). **Tema por mapa** com ciclo de10 (R-INF-9:
  cor/textura/mobs alternam a cada mapa — emenda do R-MUN-1).
  Fumaça seção17 reescrita +45/20/41/42 ajustados · gate727 confs ·
  medição: IA isolada = neutra no ruído (4 seeds ×240min).
- **Compensação do estol da sim completa (R-BAL-6)** — a sim de
  13500min com `ESPERA_TETO45` **estolou no mapa97** (nv para em
  8.895, ~1.357 mortes): o teto encolheu a janela de cura do fim
  (45×500 = 22,5k vs 56,5k sem teto). `REGEN_MAX 500→1250` (cura
  por respiro de volta à janela histórica) + `ESC_DMG 0,045→0,037`
  (perigo total do fim com k0,75 ≈ baseline) + `ESC_HP 1,55→1,25`
  (tema por mapa subiu o ttk;4 seeds ×240min: progressão de volta à
  faixa do baseline). **Sim completa da candidata em curso.**

### Changed

- **Balance da leva dopamina (spec `balance-dopamina`)** — três
  alavancas medidas com o `ritmo.js` semeado (**≥4 seeds por
  decisão**):
  - **`ESPERA_TETO = 45s`** no `esperaOnda()` — o rampa trava no mapa
    ~40: sono do mapa 100 **111s → 45s** (sem teto, 88% do tempo era
    morto naquele ponto). Alvo de duração do R-MUN-7 passa a ser o da
    **sim completa pós-teto** (mantenedor aceitou campanha mais curta).
    Comportamento exportado e testado (`esperaOnda`: mapa 1 = 2s,
    mapa 100 = 45s travado).
  - **Ponto POR NÍVEL (V1 neutro)** — `PONTOS_CADA 3→1` **+**
    `PONTO_MULT 9→3` (régua: pontos × mult = constante → poder
    medido idêntico, 3× mais decisões — a "lição do card" do gênero
    aplicada aos atributos). Medido: nv médio 738→740 (+0,3% =
    ruído), ttk idêntico, mesmo mapa em 4 seeds × 240min.
  - **Esponja de dano + densidade** — `ESC_HP 1,90→1,55` (TTK
    **2,21s → 1,95s = −12%**, produto do cliff 0,0855 → 0,0698 com
    folga) + `ESC_MONSTROS_K 0,5→0,75` (teto final 9 → 11, tela mais
    povoada). Medido: sem estol no mundo 3 (900min → mapa 20-23,
    mortes 0-1) — o cenário do estol histórico do k alto.


- **Respiro entre ondas vira beat (spec `respiro`)** — reclamação do
  playtest: *"o personagem dorme entre as ondas"*. O HUD agora mostra
  **`PRÓXIMA ONDA EM Xs`** durante o respiro (`info().espera` expõe o
  timer), o clear do campo dispara **`ONDA LIMPA · Xs · +N PONTOS`**
  (a espera vira momento de decisão — a "lição do card" do D2
  Survivors; o chefe mantém `BOSS DERROTADO!` + `MAPA N`) e a morte na
  onda 100 **zera o timer**: os dois 8s que se somavam no troco de
  mapa (16s de campo vazio) viraram **8s únicos**, com banner/corte já
  no kill. `ESPERA_BASE` 4→2s (respiro do mundo 1, ajuste do
  mantenedor). Fumaça seção 51.
- **Opções do jogo (spec `opcoes`)** — módulo `js/opcoes.js` com 4
  toggles de conforto persistidos em **`rpg_opcoes_v1`** (default =
  comportamento atual): **Sacudir a tela**, **Flash e vinheta**
  (inclui o vermelho de perigo), **Números de dano** (estilo `big`/
  aviso fica sempre) e **Poeira ambiente**. Overlay `OPÇÕES` aberto
  pelo botão no cabeçalho (não mexe na grade de abas da Gestão);
  fecha por `Fechar`, `Esc` ou clique fora; vitória/cutscene têm
  prioridade. Fumaça seção 52.


- **`ritmo.js` vira instrumento de balanceamento (fase 1)** — seed do
  RNG (4º arg, padrão 1, mulberry32 espelhado do `perlin.js`; run
  **determinístico** com os eventos aleatórios **ativos** — mesma
  semente = mesmo run = A/B limpo entre versões), **sondas por frame**
  (espera = condição do contador de `tOnda`: `esperaPct`/`esperaMediaS`/
  `esperaMaxS` por marco e agregado — o número da queixa "dorme entre
  as ondas"), **métricas de combate/economia** de `p.stats` (kpm · dps
  efetivo · ttk médio · inimigos médio/máx · gpm · eficiência ouro ·
  xpm analítico · uptime · mortes/h · menor HP vivo), **marcos de
  nível** (nv 10/20/30 + instante da Keystone) e **JSON** em
  `resultados/ritmo.json` (gitignored) com config/marcos/níveis/
  métricas/commit p/ comparar builds.

## [0.6.0] — 2026-11-15

### Security

- **Ranking antitrampa: score e progressão validados no servidor (spec
  `ranking-antitrampa`)** — auditoria prévia mostrou o buraco real: as
  regras validavam só a *forma* e **`score` era escolhido pelo cliente**
  (dá pra postar o score máximo sem jogar) e a key do Firebase é
  pública **por design** (vai no bundle do jogo — manter o repo privado
  não a esconde e ainda quebra o Pages no plano gratuito). A leva mexe
  **só nas rules** (zero mudança no jogo): **paridade exata**
  `score == mapa×100000 + onda×1000 + min(nivel,999)` (sem `min()` na
  linguagem — identidade dos dois ramos, espelho de `Ranking.scoreDe`),
  **teto de progressão por tempo do projeto** (`mapa ≤ 30 +
  minutosDesde2026-11-01 / 100`, constante nomeada + fórmula de
  recalibragem no arquivo — sem relógio por jogador: `resource` só
  expõe `data/id/__name__`), **`at` fresco** (±24h / nunca no futuro)
  e `nivel ≤ 9500` (teto do jogo). Testes: **conf nova** que trava a
  identidade rules↔`scoreDe` em 8 casos de borda (se a fórmula mudar,
  o teste avisa que as rules mudam junto) · **`node testes/regras.js`**
  (rede, fora do gate) sonda as rules implantadas: leitura 200 ·
  paridade violada → 403 · envio legítimo → 200 · `--teto` opcional.
  Limite documentado: a **1ª marca de um apelido é confiável até o
  teto** (eliminar exigiria identidade ou save autoritativo — opção C,
  adiada).
- **Save assinado: integridade do localStorage (spec `save-assinado`)**
  — cada entrada de `rpg_personagens_v1` **e** de `rpg_estado_v1` sai
  com `_s = HMAC-SHA256(JSON sem _s)` (`js/assinatura.js` novo —
  SHA-256/HMAC **em JS puro**, porque `crypto.subtle` não é confiável
  em `file://` e o sandbox dos testes tem whitelist; verificado contra
  o `crypto` do Node em 10 casos). Com o marcador do storage ativo,
  entrada adulterada **ou sem `_s`** é **rejeitada** — mas o dado
  rejeitado **nunca é destruído** (fica intacto e todo `salvar`
  preserva as entradas alheias ⇒ falso positivo não apaga save). Primeira
  leitura sem marcador **migra re-escritando na hora** (sem janela em
  que o save aceito vire rejeitado no boot seguinte). Export sai
  **assinado** (transferência entre aparelhos valida — sem sal por
  aparelho de propósito); import aceita JSON antigo sem assinatura com
  aviso. Sonda `Salvar.rejeitados()` + `console.warn` por entrada.
  **+10 confs = 719**: HMAC×Node, round-trip, adulteração→rejeição,
  **preservação no storage**, migração, estado→null, limpeza. Limite
  honesto: a chave vai no bundle (barreira p/ edição casual, não
  segredo) e **o placar não depende daqui** (é a outra leva).

## [0.5.0] — 2026-11-15

### Added

- **Prévia do herói na tela de aparência (spec `preview-heroi`)** —
  a aba **Apar** (que serve a criação **e** o jogo) só dizia *"muda
  na arena"*: agora tem uma **caixa de prévia** no canto
  direito-de-baixo com o sprite a **×3**, sombra elíptica e ciclo de
  ~4s (**idle** 3s → **ataque** 1s) — quem troca pele/cabelo/estilo/
  roupa vê o resultado **sem entrar na arena**, inclusive na criação.
  Mesmo caminho do desenho da arena (`lookDe` + `Anim.hero`, mesma
  cache). Relógio em `Gestao.update` (roda em `jogo.js` **e**
  `selecao.js`, antes dos `return` de aba); sonda `Gestao.previa()`.
  As 4 linhas continuam **intocadas** (contrato do clique `(706,96)`)
  e as dicas encurtaram para caber à esquerda da caixa (16px
  monospace ≈ 9,6px/char). Screenshots novos `tela-selecao-apar.png`
  (criação); testes: **+2 confs = 706** (caixa fora das linhas +
  animação).
- **Ícones de item na aba Itens (spec `icones-itens`)** — a aba era
  100% texto; agora cada equipamento tem **ícone próprio**:
  `Sprite.iconeCanvas(tipo, corAcento)` com **5 ícones 16×16** em
  grid de texto (espada · adaga · cajado · martelo · armadura), mesma
  paleta-rampa do resto (metal/madeira/couro) e o **acento vindo da
  raridade** (`Itens.corRar`, passado como HEX — `sprite.js` não
  depende de `itens.js`). Cache `Anim.icone(tipo, cor)`. Nos **slots
  equipados** o ícone abre a linha (texto sai de x416 → x442, corte
  20→17 / 16→13 p/ passar antes do `fixar` em x640); nas **linhas da
  bolsa** ele vira **chip clicável** à esquerda (equipa igual à linha)
  e a linha recua para `444..688` (corte 33→29 — só o **nome**
  trunca, os deltas com `★`/`-15HP` nunca são cortados). Contorno do
  ícone só **por fora** (`contornaDestaque`) — o `contorna()` comeria
  a lâmina de 3px. Screenshots: `tela-itens.png` novo; testes **+2
  confs = 708** (ícone desenhado + cache separa raridade) e nenhum
  clique existente mudou (`(584,216)`, `(584,246)`, `(707,189)`,
  `(695,96)`, `(500,96)`).

### Changed

- **Visual do herói e das armas — pixel art 16-bit (spec
  `visual-heroi-arma`)** — redesenho completo a partir do diagnóstico
  *"visual tosco e muito simples"*: **motor de cor novo** em
  `sprite.js` (rampas HSL de 4 tons com **hue-shift** — sombra desloca
  o matiz pro azul e satura, luz pro amarelo — e **luz única
  top-esquerda**; antes era `shade()` puro = escuros acinzentados) e
  **herói autorado em grids de texto** (corpo, pernas e braços por
  pose + **5 estilos de cabelo** e **4 classes** como overlays com
  âncora no bob — franja cobre a testa mas deixa olho/pupila livres
  em qualquer frame). Identidade visual: **guerreiro** ombreiras +
  peitoral, **mago** capuz + gola/ornamento dourado, **ladino**
  colete, **clérigo** capa + estola. **Armas com largura**: cabo,
  guarda em cruz, lâmina de 2px (fio claro + corpo, deslocamento
  **inteiro** pra não furar no meio), cabeça de martelo chanfrada e
  cristal de cajado — com **acento por raridade do item equipado**
  (ouro → azul → roxo → vermelho). `lookDe()` ganha **`classe`** e
  **`rar`** (derivados — **save intacto**) e a cache do `Anim.hero`
  passa a incluir os dois (senão trocar de classe/equipar deixava o
  sprite velho). Grade continua **20×20** → âncoras de `batalha.js`,
  limites da `fumaca` (80-400 px) e screenshots intactos; `grade.js`
  com legenda nova (`heroPaleta`/`txtPaleta` exportados) e asserções
  reposicionadas — as do rosto (olho `(9,4)`, pupila `(10,4)`) e mão
  `(12,13)` seguem as mesmas.
- **Monstros com rampa e identidade por espécie (spec
  `visual-monstros`)** — as 3 formas saíram do `shade()` legado e
  passaram a usar as **mesmas rampas e a mesma luz topo-esquerda** do
  herói (`2 corpo · 3 sombra · 4 luz`, índices 0-6 intactos) e ganharam
  **detalhe por espécie** via 3º parâmetro opcional `chave`
  (`undefined` = forma base, assinatura atual preservada): **coroa**
  do chefe, **mandíbula com presas** do Açougueiro, **máscara** do
  Gatuno, **broto** do regenerador, **presas** do drenador, **brilho
  viscoso** do visgo, **chifres** do atirador e **listra** na aranha.
  `spriteInimigo` passa `en.chave` e as caches do `Anim` incluem a
  chave (sem isso a espécie herdaria o sprite da anterior). Achado:
  **partes de 1px têm que ser pintadas DEPOIS do `contorna()`** —
  asas, orelhas e pernas entravam como silhueta e viravam tudo
  contorno (o morcego era uma cruz preta). `previa.js` agora mostra
  as 10 espécies na linha do cenário (loop de iteração).
- **Cenário com as mesmas rampas — árvore, pedra, cofre e flores
  (spec `visual-cenario`)** — os 2 últimos sprites "fora do sistema"
  ganharam a luz topo-esquerda do herói: **árvore** com copa em 3
  camadas e **bojos quebrando a silhueta** (era um círculo perfeito),
  tronco com lado claro/escuro + raiz; **pedra facetada** (linhas com
  cantos cortados, cap de luz, sombra de base e fenda) em vez de
  elipse. **Cofre** redesenhado (tampa em 2 degraus, faixas de latão,
  fechadura com fechadura escura, contorno `#1b1424`) — continua só
  `fillRect`/`strokeRect` — com **screenshot novo `tela-cofre.png`**
  (sem ele dá pra mudar o cofre sem olhar nada). **Flores** em faixa
  aceita mais larga + 1 vizinho por flor (aceite em ~33 tentativas em
  vez de 121). Registro honesto: a "linha pontilhada" que eu atribuí
  ao chão era **texto de dano flutuante** no rasterizador — refutado
  por contagem de px e toggle de camada (lição no `STATE`).

## [0.4.1] — 2026-11-14

### Changed

- **Respiro entre ondas do mundo 1: 8s → 4s** (`ESPERA_BASE`,
  ajuste **direto do mantenedor** — pedido explícito de commit
  **sem medição**; o `ritmo.js` não roda nesta leva. Se a sim
  estolar, o comentário do código manda subir o número de novo).
- **Cutscene sem botão e caixa transparente (spec
  `cutscene-estetica`)** — pelo print de referência do outro projeto:
  miolo da caixa de `rgba(8,6,14,0.90)` → **`0,60`** (a arena dá pra
  ver por trás) e os botões "Continuar"/"Entrar no Mundo" **saíram**:
  `info().botao` virou `null`, o check de retângulo saiu do
  `Jogo.update` e **todo clique avança** (3 estágios; o último
  encerra) junto do `Espaço` (`Enter` fecha direto; eventos seguem
  com auto-dismiss 3,5s; a fronteira continua esperando o jogador
  por clique). Seções 42/48 migraram dos asserts de botão para as
  **dicas piscantes** + laço de cliques até fechar · gate 3× = **701
  confs**.

### Fixed

- **Herói vira para o lado que está batendo (spec `virada-ataque`)** —
  `h.facing` era um campo **morto**: escrito em 3 lugares e nunca
  lido no desenho (`desenhaHeroi` fazia `drawImage` direto) → o
  herói sempre olhava/batia pra direita. Agora `facing === -1`
  **espelha o sprite** (sombra e alpha de invulnerável fora do
  `save/restore`) e as 3 chamadas de `Efeitos.corte` passam
  `heroi.facing` (o arco já sabia espelhar, ninguém informava).
  Rasterizador `cena.js` ganhou **`drawImage` com escala negativa**
  (antes `DW = max(1, round(dw·sx))` viraria 1px — o herói virado
  viraria uma coluna nas screenshots) + **auto-check sintético**
  pixel a pixel que derruba o gate se o espelho errar. Testes:
  **seção 50 (3 confs)** — alvo à esquerda → `facing −1`, à direita →
  `1`; sonda `info().heroi.facing`. Gate 3× = **699 confs** ·
  sanidade: mapa 1 **36,4min**.

## [0.4.0] — 2026-11-14

### Added

- **Cutscene com a estética do original (spec `cutscene-estetica`)** —
  avaliação do mantenedor (*"está visualmente feio"*) com o código do
  outro projeto como referência: **véu cheio removido** (a arena fica
  viva entre as barras e a caixa — a legibilidade vem do fundo 0,90
  da própria caixa, como no original), barras letterbox em **`#000`
  puro** e os dois overlays ganharam a **caixa de legenda do
  original** (`caixaCorte`: preto translúcido `rgba(8,6,14,0.90)` +
  fio dourado `rgba(232,200,106,0.45)` — **borda por duplo
  preenchimento**, nunca `stroke()`: no-op no rasterizador, lição da
  `visual-ui`). **Título único** com sombra nos dois overlays (o
  evento desenhava o dourado do `UI.panel` por baixo + a cor do
  evento por cima = texto empilhado). **Espaço** agora avança a
  narração (o pulo do original; `Enter` segue fechando — contrato da
  42 intacto). Geometria/gatilhos/datilografado/piscar intocados —
  seções 42/48 sem mudança. Gate 3× = **695 confs** · sanidade 2×:
  mapa 1 **34,0/37,4min** (variância de sessão já mapeada).
- **Visual efeitos: pools, receitas, hit-stop e camadas (spec
  `visual-efeitos`, 2ª frente da série visual — base:
  `Docs/efeitos.md`; a maior da série)** — `js/efeitos.js` reescrito
  (196 → ~850 linhas) como **dono único do feedback**: pools com
  teto (`parts 380 · nums 50 · anéis 24 · raios 8 · arcos 10`),
  catálogo do doc (faisca com rastro+glow, caco que esfria, brasa
  cintilante, fumaca/poeira crescendo, confete com vento, estrela em
  cruz, brilho, mote, relâmpago vertical + raio radial) e as
  **receitas com valores exatos** (`impacto`/crítico,
  `impactoHeroi`/fatal, `morte`/chefe, `nivelUp`, `reviver`,
  `bossChegou`, `corte` de16 segmentos). **Game feel novo**:
  **hit-stop** (`parar`/`congelar` no topo do update — o golpe
  congela mundo e partículas), shake com a fórmula do doc
  (`sacudir` + offset inteiro), **flash de evento** (fraco nunca
  apaga o forte), vinheta de evento e **perigo de vida** (HP<35%
  pisca vermelho). **3 camadas** de desenho (anéis no chão /
  aditiva→sólida→fumaça→números / flash+vinheta+perigo em espaço de
  janela — desvio documentado: tem câmera) + **aura do chefe** atrás
  do sprite. **Números migraram para cá** em 3 estilos (normal/crit
  com tremor halo dourado/big com pulso — `Batalha.numero` é fachada,
  booleano legado `true`='big'; só o dano crítico mudou de estilo) e
  **`silenciar`** torna a simulação offline barata — **com exceção
  documentada do missil** (ele leva dano na chegada: sem ele voando,
  classes à distância ganhariam menos offline). `voltaAusencia`
  envolve o mudo junto do `Cutscene.silenciar`. `Batalha` enxugou:
  shake/tFlash/parts/nums locais morreram (fachadas `numero`/
  `limparEfeitos` intactas); glow/anel são sprites offscreen
  cacheados 1× (fillRect 1×1 com alpha) + `drawImage` (rasterizador
  agora multiplica `globalAlpha`). Testes: **seção 49 (18 confs)**
  — tetos, 3 estilos, hit-stop (máximo + expiração), offset inteiro,
  flash guard, missil sobrevive ao mudo, receitas, glow cache no
  desenho, `limparEfeitos` zera tudo. Gate 3× = **694 confs** ·
  sanidade 2×: mapa 1 em **30,7/32,6min** (hit-stop custa <2%).
  **Ajuste pós-feedback**: shake suavizado antes do push — senóide
  com fase por impacto (sem salto aleatório por frame), duração
  0,14+f×0,16 e amplitude 0,6+f×1,2, forças maiores reduzidas
  (crítico 0,9→0,6 · fatal 1,1→0,8 · chefe 1,4→1,0): hit normal
  ±1px, crítico/fatal ±2 no máximo.
- **Visual cutscene: letterbox, datilografado e dica piscando (spec
  `visual-cutscene`, 3ª e última frente da série visual — base:
  `Docs/cutscenes.md`; gatilhos intocados)** — os overlays de
  fronteira/evento ganham **letterbox** (barras pretas de 52px
  deslizando em 0,35s), **narração datilografada** (55 chars/s por
  linha com pausa 0,8s — `update` passou a rodar também para o
  mundo, que antes só esperava) e **dicas piscando**
  (`floor(relogio*2)%2`). Um **clique fora do botão agora avança a
  narração** em 3 estágios (linha → próxima → fecha) via
  `Cutscene.avancar()` no `Jogo.update` — a dica "clique para
  seguir" deixou de ser mentira; o clique dentro de `info().botao`
  continua sendo do botão e o `Enter` segue fechando direto
  (contrato da seção 42 intacto). `info()` ganhou `barras` e
  `revela {linha, chars}`. Testes: **seção 48 (12 confs)** —
  estágios, letterbox até o cap, typewriter sozinho, piscar (30/60
  visível), clique fora avança / no botão fecha; **seção 42** só
  ganhou esperas nos 2 asserts de narração (o timing mudou por
  design — título e botões continuam no frame 1); PNGs da cutscene
  capturam com barras abertas e narração revelada. Gate 3× = **676
  confs** · sanidade: mapa 1 **34,3min** (variância de sessão já
  mapeada). **Série visual completa (levas 7-9).**
- **Ajustes do playtest: resolução nítida, Vel inteira, scrollbar
  (spec `ajustes-playtest-3`)** — 3 achados da captura do mantenedor:
  1) **"resolução da UI baixa"** → `resize()` passa a usar
  `esc = escala × dpr` **fracionário**: o backing nasce na resolução
  da exibição (buffer 1:1 com o CSS — texto/vetores renderizados no
  tamanho final, sem esticar com `pixelated`; antes o `floor` deixava
  em 1× e o CSS esticava 1,67× por vizinho mais próximo = glyph
  blocky). Pixel art não perde nada (nearest por frame = a mesma
  irregularidade que o CSS já produzia). 2) **Vel com casas decimais**
  → arredondada só na exibição (rodapé + bloco `Base → total`;
  `statusDetalhado` segue com os floats crus — os testes somam as
  partes). 3) **Scrollbar da aba Stats cobrindo os números** → valores
  em `x=744` (2px antes do trilho; o trilho não anda — o teste de
  arrasto clica em x=750). Contratos da **seção 18** atualizados para
  o invariante novo (backing = exibição) + **seção 47 (6 confs)**;
  sondas fixas do rodapé viraram **varredura** (o `Vel` encurtou,
  o rodapé recentrou e os probes caíam nos intervalos ` · ` — nenhum
  bug, só fragilidade). Gate 3× = **664 confs** · sanidade: mapa 1
  **31,5min**. PNGs agora nascem em 1280×720 (= tela real).
- **UI visual: paleta, gradientes e cantos arredondados (spec
  `visual-ui`, 1ª de 3 frentes visuais — base: `Docs/ui.md`)** —
  `js/ui.js` ganha **`UI.PALETA`** (fonte única do cromo com os hex
  do doc) e primitivas **com fallback**: `grad` (sem
  `createLinearGradient` real → 1ª cor sólida), `caminho` (probe de
  assinatura — o Proxy do harness tem `length 0` → `rect`), `caixa`,
  `sombra`, `tom` (hex misturado com branco) e `text` com **sombra
  opt-in**. Receitas novas: `fundo`/`faixaTopo` (gradiente de tela +
  faixa de cabeçalho com **fio dourado** — as 4 cenas passam a
  chamá-las), **painel** (sombra + gradiente + borda dupla por duplo
  preenchimento + faixa de título `[8,8,0,0]` com fio dourado),
  **botão** (4 estados com gradientes/bordas exatos do doc — hover
  roxo claro, ativo dourado — cantos `r≤6`, sombra; **hit-test
  intocado**), **barra** (degradê tom claro→cor + brilho de 1px;
  guarda `h≥4` intacta) e tooltip/swatch arredondados. **Testes veem
  quadrado/chapado, navegador vê arredondado/gradiente.** `style.css`
  com a moldura do "monitor" (fio dourado + anel roxo + halo +
  `border-radius`). Rasterizador de teste (`cena.js`): `fill()`
  passou a rasterizar **retângulo de caminho** (antes só elipse —
  painéis sumiriam dos PNGs). **Seção 46 (13 confs)** · gate 3× =
  **658 confs** · sanidade: A/B com `git stash` prova que a variação
  do mapa 1 (31→37min entre sessões) **não é da leva** (código
  antigo hoje: 37,7/34,6min). Também **fix de flake** na asserção de
  rocha da seção 32: `direcaoEvasao` valida a rocha no ponto
  **arredondado** (o mesmo que `info()` exibe — matou a classe de
  falso-positivo por casca ≤0,7px) + tolerância de 1% para o
  fallback de todos-bloqueados.
- **IA do herói: Behavior Tree e evasão de cerco (spec `ia-heroi`, leva
  2 de 2 — fecha a série de 6)** — `decideHeroi` vira um **seletor de
  camadas** (`IA.CAMADAS`: sobrevivência → posicionamento → combate →
  perseguição) onde a **INT controla a profundidade da árvore**
  (`IA.profundidade(agu)` 1/2/3 com os **gates de sempre** — 0,35 e
  0,45 — comportamento medido preservado **por construção**; o
  decorador de ruído/cambaleia mantém a fórmula antiga). O destino de
  fuga ganha **evasão de cerco** (`IA.direcaoEvasao` — 12 direções a
  partir da direção de sempre, score = ocupação do influence map + 100
  se cai em rocha, `<` estrito desempata em k=0 → **mapa vazio =
  exatamente o destino antigo**): o herói não corre mais para dentro
  de rocha nem da matilha. O `pintaMapa` subiu para o **topo de
  `atualizar()`** (herói e monstros leem a pintura do frame) e
  `info().heroi` ganhou `prof`. Escopo e prioridade definidos com o
  mantenedor: **BT estrutural + evasão** e — pela primeira vez —
  **comportamento novo > progressão** (dificuldades de endgame
  virão; intervir só em estol). Teste: **seção 45 (13 confs)** +
  asserção de rocha na32. **Sanidade**: mapa 1 em **31,5/33,5min** ·
  2×2400min em **mapa 38/36 · nv 3442/3244 · 0-3 mortes** —
  progressão levemente mais rápida (menos mortes), dentro da
  maleabilidade aceita; sem intervenção.
- **IA dos monstros: flocking (separação) e influence map (spec
  `ia-monstros`, leva 1 de 2)** — a matilha agora **cerca** de
  verdade: **separação universal** (`IA.separacao` — empurra o destino
  para longe dos aliados, **só monstro×monstro**, magnitude ≤10px,
  **exatamente 0 com 1 monstro** = baseline intacta) integrada no
  movimento com **clamp a 12,5px do alvo** (sem ele o destino sai de
  13px e o ramo de golpe — `distH ≤13` — nunca dispara) + **mapa de
  influência** (grade **8px** 48×34, ocupação repintada por frame;
  obstáculo = consulta direta com o **raio da entidade** — o boss de
  r11 não passa onde o slime de r6 passa; sem memo entre frames, nunca
  stale entre mapas) que escolhe o **destino do cerco**: **12
  candidatos a raio exato 11** (contrato da seção 23) com score =
  ocupação 3×3 ×3 + preferência do ângulo do slot — desvia de aliados
  e rochas em vez do slot fixo que colidia com >6 monstros e podia
  cair dentro de uma rocha. Escopo confirmado com o mantenedor:
  **separação universal, destino escalado pela astúcia** (burros
  continuam direto no herói) e **prioridade = caber na medição**.
  Teste: **seção 44 (16 confs)** — a matilha chega ao alcance, par
  mínimo **12px** (sem empilhar) e **cerco com vão máximo 81°**;
  seções 23/32/41 intactas. **Sanidade**: mapa 1 em **31,8min** (alvo
  31-33) · 2×2400min em **mapa 36 · nv 3216/3280 · 1-4 mortes** (faixa
  29-36 · 2600-3300) — sem rebalance.
- **Árvore de skills maior: 8 skills, ramos e loadout escalonado
  (spec `arvore-skills`)** — 3 frentes confirmadas com o mantenedor:
  **(1)** 5 → **8 skills por classe** (12 novas reusando os 6 tipos de
  gatilho; desbloqueio em **60/150/400** além de 5/15/25/35/45 — a
  árvore rende novidade muito além dos 20min atuais); **(2)**
  **ramos (árvore literal)**: toda skill tem **2 variantes com mods
  numéricos** — **sidegrade obrigatório** (todo ramo mistura buff e
  nerf, asserção de dados com a tabela `SENTIDO`; `gatilho` proibido
  nos mods por polaridade ambígua), escolha por skill em `p.ramos`
  (ciclo **base → A → B → base**; **sem escolha = base neutra
  intacta**, então o baseline medido não muda para quem não mexe);
  o merge vive em `Skills.comRamo` (`aCada` arredonda ≥1 — o proc
  `area` usa `%`) e `carregadas` devolve as skills **prontas** — **a
  batalha não mudou**; **(3)** **loadout escala com o nível**:
  `Skills.limite(nivel)` 3 → **4 no nv 50** → **5 no nv 150** (teto
  absoluto `LIMITE = 5`, espelho do `normalizaLoadout`) com aviso no
  level-up. UI da aba Classe vira **grade 2×4** (toggle + botão de
  ramo por skill; tooltips mostram os dois ramos e os números do
  estado atual). Teste: **seção 43 (30 confs)** + screenshot
  `tela-arvore.png`; seções 16/25 atualizadas (contrato 5→8, teto de
  migração 5). **Sanidade**: 2 runs de 2400min → **mapa 36 · nv 3247
  · 1 morte**, dentro da faixa de referência (mapa 29-36 · nv
  2600-3300) — sem rebalance.
- **Cutscenes entre mundos: mapa do universo, narração e eventos
  (spec `cutscenes`)** — 3 frentes confirmadas com o mantenedor:
  **(1)** ao cruzar fronteira de mundo na campanha (mapas 10→11 …
  90→91) abre um overlay com o **mapa do universo** (10 nós com a cor
  do tema de cada mundo: conquistado/atual/trancado), **narração** do
  que você venceu + o que espera (com o chefe do novo mundo) e botão
  "Entrar no Mundo N" — 9 cutscenes; **100→101 não dispara** (a
  vitória assume e corta a pendente) e no modo infinito não há (os
  mundos ciclam = spam); **(2)** os **4 eventos aleatórios**
  (Açougueiro, Gatuno, Enxame, Cofre) também viram cutscene —
  **auto-dismiss ~3,5s** (são frequentes) e **teto 1** (nunca acumula
  nem reinicia timer; mundo substitui evento); **(3)** **Mapa do
  Universo como cena própria** (botão "Universo" na seleção) com o
  progresso do save. Padrão do **overlay de vitória**: a batalha
  **nunca pausa** (idle sagrado) — só a gestão bloqueia, em **dois
  níveis** (`UI.bloqueia` + pulo do `Gestao.update`); eventos
  **silenciados** na simulação de ausência (`voltaAusencia` — a
  cutscene de mundo continua: é o resumo do que aconteceu enquanto
  esteve fora). Teste: **seção 42 (36 confs)** + screenshots
  `tela-cutscene*.png`/`tela-universo.png`.
- **Monstros novos: espécies com skill própria, ataques à distância e
  2 eventos (spec `monstros-novos`)** — as 4 espécies viram **10** e
  nenhuma é só recolor: **`atirador`** (ataque à distância — alcance
  90px, cd 2,2s, projétil via `Efeitos.missil` com dano **na chegada**,
  mesmíssimo padrão do herói; não atira em cadáver), **`regenerador`**
  (cura 3%/s só após 2s sem apanhar; veneno trava) e **`drenador`**
  (30% do dano que dá vira vida dele). Entram como **`raro` dos mundos
  5-10** — o `comum` dos 10 mundos **não mudou** (progressão medida
  intacta). **2 eventos novos**: **Enxame** (2× inimigos + XP/ouro
  ×1,5 só na onda dele; **1,5% desde a 15**, calibrado em 7 runs — 10%
  projetava 253h de campanha) e **Cofre Abandonado** (1º
  evento "bom": nasce no campo, o herói **caminha até ele** sem
  inimigos, paga `forca×25` de ouro + drop garantido rar 2). Skills
  extraídas em **funções puras** (`regeneraEspecie`/`drenaVida`) p/ ser
  testáveis sem arena. **Bug de integração achado pelo teste**: o
  `spawn` constrói a entidade com campos explícitos e **não copiava**
  `ranged`/`regen`/`dreno` de `TIPOS` — as 3 skills **não funcionavam**
  no jogo (os testes de função pura passavam; pegou o teste na arena).
  **Lições**: skill nova em `TIPOS` exige copiar no `spawn` **e**
  teste comportamental · `restaurarOnda(1)` deixa `onda 0` →
  `ondaTotal −1` → **HP negativo** no spawn (use `restaurarOnda(2)`) ·
  **a variância entre runs é 1..112 mortes** — 1 run de referência não
  discrimina (uma run com todo evento novo desligado deu 1 morte, outra
  com cofre desligado deu 87). Teste: seção 41 (24 confs) + mosquetão
  dos RNGs novos no topo da fumaça (regra da casa).
- **Gestão de atributos: pontos escassos, soft caps e Carisma
  redefinido (spec `gestao-atributos`)** — resposta ao relato de
  jogadores que *"nem ligam pra quantidade de pontos"*: a auditoria das
  5 curvas achou o padrão **"teto onde pensaram, sem teto onde não
  pensaram"**. Mudanças: **1 ponto a cada 3 níveis** (era 3/nível = 6
  decisões/min valendo ~1% → agora 0,7/min valendo ~6%) **+ a
  compensação 9×** (`ganhoAtributo`: com 9× menos pontos cada um vale
  9× mais — até a base do atributo o linear antigo, acima dela 9×;
  sem isso a medição estolou com 223 mortes em 1200min); **Carisma sai
  do XP** (o `xpMult` linear chegava a **855×** e quebrava a curva
  calibrada — era a "progressão errada" relatada) e vira **+ouro
  logarítmico** (`multOuroCar`: 1× em car 8 · 2× em ~100 · 2,77× no
  fim, nunca explode); **clérigo escala em CAR** (`danoMod: 'car'` — fé
  vira dano sagrado, FOR sai dele). Testes: seção 40.
- **Mundos: campanha 10 × 10 × 100 (spec `mundos`)** — a campanha
  virou **10 mundos × 10 mapas × 100 ondas** (10.000 ondas, alvo de
  **~200h**). `Mapas.mundo(n)`/`noMundo(n)` (fonte única) e
  `Mapas.info(n)` resolve o **tema pelo mundo**, **ciclando no modo
  infinito** (mundo 11 = tema do mundo 1). **10 temas autorais** com
  chão/obstáculos/inimigos/chefe próprios — nomes próprios por mundo
  (Slime Dourado → Devorador de Mundos) e recolorização das 4 espécies
  existentes (novos monstros = leva à parte). **Vitória**: derrubar o
  chefe do **mapa 100** abre o overlay **"CAMPANHA CONCLUÍDA"**
  (`jogo.js`, com `UI.bloqueia` — a UI de baixo desenha sem responder)
  e grava `p.vitoria` (normalizar com default `false`, sem bump de
  chave); **Continuar** libera o **modo infinito** (mapa 101+, mundos em
  loop, escala segue) e o overlay não reabre. Lendários passam a
  ciclar os 3 pools por mundo (`itens.temaDe`). Testes: **seção 39**
  (18 confs: estrutura/ciclo, contagem, vitória, persistência).
- **Safeguards de save/progressão** (fecha o bug dos níveis 83k):
  `normalizar` **recalcula `xpProx`** da fonte única (o valor salvo é
  ignorado — editá-lo não salta mais nível), **`xp ≤ xpProx−1`**
  (excesso descartado, como no teto) e tetos `OURO_MAX 1e12` /
  `PONTOS_MAX 100k` / `ATRIB_MAX 1e6` (tudo < 2⁵³); `ganhaXP` rejeita
  NaN/negativo/infinito/zero; ouro clampado no abate. E **`UI.abrev`**
  (K/M/B/T/Qa… até 10⁶⁰, pt-BR) na barra de XP — com custo exponencial
  a barra passaria de 46 dígitos. Testes: seção 38.
- **Ranking global (Firebase/Firestore)**: nova tela **Ranking** (botão
  na seleção) com **top 10** (mapa·onda·nível, classe, data), bloco
  **meu melhor** destacado e apelido editável na própria cena (1-20
  chars, lembrado em `rpg_rank_nick_v1`). Score composto
  `mapa×100000 + onda×1000 + min(nível,999)` — ordena por progresso,
  nunca por sorteio; upsert **só na melhor marca por apelido** (cliente
  só envia melhoria e as **regras do Firestore** rejeitam score menor no
  servidor — sonda REST confirmou: escrita válida aceita, inválida
  recusada com 403). Envios no **fecho de mapa** e **na morte (antes da
  penalidade de −5 ondas)**. Camada 100% opcional: o SDK entra por
  **lazy-load** (injeção de `<script>` só ao abrir a tela) e sem
  config/rede tudo degrada — "não configurado", cache local do último
  top-10 e zero bloqueio no jogo. Config do Firebase preenchida
  (`js/ranking-config.js` — chaves públicas por design) + regras em
  `.specs/features/ranking/regras-firestore.rules`. Spec
  `.specs/features/ranking/`.
- **Ranking observável (nunca silencioso)**: `Ranking.ultimoEnvio()`
  guarda `{ok, motivo, quando, detalhe}` com motivo distinguível —
  `enviado ✓ · sem apelido · arquivo local (file://) · sem melhoria ·
  falha no SDK · servidor recusou · sem rede` — com **toast na
  jogatina** (dica única por sessão para apelido/file://) e **linha de
  status "último envio: ..."** na tela do ranking. A rejeição do `set`
  deixa de ser engolida (guarda a mensagem do servidor) e `file://` é
  detectado antes de qualquer tentativa (origem `null` não passa no
  CORS — o aviso explica em vez de falha misteriosa). Testes: seção 37.
- **Cooldown das skills na aba Stats (com barra de rolagem)**: bloco
  "Skills — cooldown" com o valor **efetivo de combate** —
  `intervalo × (1,3 − 0,45×agudeza)` da INT real (base entre
  parênteses), área como `≈Xs a cada N golpes` com a recarga atual e
  veneno como chance/duração; skills bloqueadas em cinza com "nv X".
  O conteúdo passou do painel de 300px → a aba Stats ganhou **rolagem**
  (wheel + arrasto do thumb com offset de agarre; linhas fora da faixa
  não são desenhadas — sem `clip`, que o rasterizador de testes não
  tem). Testes: seção 36 (limites de clamp inclusive).
- **Teto de nível 1000** (`Personagem.NIVEL_MAX`, fonte única): no cap
  o **XP é descartado** (não acumula buffer invisível — prática da
  pesquisa de gênero: Idle Heroes Saga e Fangclash capam em 1000), o
  cabeçalho mostra barra cheia + **"MÁXIMO"** e `normalizar`
  **clampa saves acima de 1000 na leitura** (save de nv 36.000 visto
  em produção → 1000, atributos preservados; sem bump de chave). O
  score do ranking já capava em 999 — inalterado.

- **Checkboxes de gestão (aba Itens)**: um **`[x]` por slot** (arma e
  armadura) que **fixa o item equipado** — o auto-equip não troca por
  melhor enquanto marcado (clique manual na bolsa continua livre);
  **`Auto A+ [x]`** que **aprimora sozinho** o slot de menor custo
  (teto `MAX_UP` e saldo respeitados, padrão OFF) — flags persistidas
  com default seguro em saves antigos; e a **aba Stats ganha o bloco
  `Base → total`** no padrão D3/D4 (`Dano 31→93 · HP …`): o que itens,
  aprimoramento e keystone estão acrescentando, visível sem hover (o
  detalhe por fonte continua no rodapé) — `statusDetalhado` ganha
  campos `base` numéricos (fonte única, teste soma).
  Spec `.specs/features/correcoes-ia-gestao/`.

### Changed

- **Re-base do teto de nível p/ a campanha de 100 mapas (R-MUN-6)**:
  `CUSTO_G` **1,11 → 1,07** + `XP_H` **1,10 → 1,064** (ratio
  `ln(H)/ln(G)` = 0,9166 ≈ 0,9133 → a trajetória nv/onda não muda) e
  **`NIVEL_MAX` 1000 → 9500**. Motivo medido: com `G 1,11` o custo
  estourava `1e308` no nv 6.775 e a renda na onda 7.411 (mapa ~75) —
  **qualquer teto ≤ 6.800 morria antes do fim da campanha** (teto 5.000
  = níveis param no mapa ~55). Agora `custo(9500) ≈ 10²⁸¹` e
  `renda(9999) ≈ 10²⁷⁰` (30+ ordens de folga) e a campanha termina em
  **nv ≈ 9.150 < 9.500** — níveis vivos os 200h inteiros. `UI.abrev`
  ganhou **notação científica pt-BR** (`1,5e281`) além de 10⁶⁰ (os
  sufixos terminavam em "Nod"). Alvos de early re-medidos (média de 4
  runs: 1º nível 46,5s · mapa 1 ~31min · nv 29-33 @15min — a banda
  33-38 era do G 1,11, a re-base desloca ~3 níveis no mesmo T).
  **Sim completa de campanha (T9): VITÓRIA em 222,5h** (alvo 200h
  ±20%), nv final 9.167, 65 mortes (0,29/h = eventos), sem estol.
  Testes: seções 36/38/39.
- **Respiro entre ondas escalado por profundidade (`esperaOnda()`)** —
  a **alavanca de duração** da campanha: a medição refutou a premissa
  da spec (**nº de monstros NÃO muda a duração**: k=1/3/5 → todos ~21
  mapas/600min; só o perigo muda — k=10 → 195 mortes, porque o XP
  extra fortalece o herói), enquanto o respiro é linear e seguro
  (tempo de regen, sem tocar no cliff `HP×DMG`): 8s → 21 mapas/600min,
  40s → 8, 70s → 5. Agora **`8s + (mapa−1) × 1,1s`** — o mundo 1
  mantém os 8s medidos (**mapa 1 ≈ 33min intacto**) e o fim da campanha
  respira **117s**; no infinito trava no patamar do mundo 10 (senão
  cresceria sem limite). Pós-chefe usa `ESPERA_TRANSICAO` fixo de 8s
  (a troca de mapa é o seu próprio tempo — e a vitória não atrasa 117s
  após o último chefe).
- **Escala de monstros por mundo (`qtdMonstros`/`escalaMonstros`)** — o
  teto antigo era **fixo em 5** (batia na onda 4 do mapa 1 e nunca mais
  mudava: constante no jogo inteiro). Agora **cresce de 5 até 9**
  (k=0,5 — medido: k=1 estolou o mundo 3 em 2 de 2 runs, k=0 saudável
  em 3/3) até o fim da campanha, com duas variantes para o A/B medido
  (`'mundo'` =
  degraus na fronteira de cada mundo — identidade; `'mapa'` =
  progressão suave ~a cada 11 mapas), **travado no infinito** (a
  dificuldade lá segue pela escala de HP/dano, não por contagem). O
  ramp inicial `3+tot/2` continua (early intacto: nasce 3, completa 5).
- **Progressão exponencial + combate reequilibrado (spec
  `progressao-exponencial`)**: custo de nível virou **`146 × 1,11^(nv−1)`**
  (razão constante; o linear `125+21×nv` subia mais rápido que a renda
  ×onda → tempo/nível crescia → espiral de mortes e estol no mapa 3) e a
  renda virou **`12 × 1,10^ondaTotal`** (`xpAbate`, harmônica com o
  custo → tempo/nível estável). Combate: **ESC_HP 1,30→1,90 · ESC_DMG
  0,10→0,045 · ESPERA_ONDA 2→8s** (o respiro é tempo de regen — controla
  o early sem piorar clear/survival) e **HP/nível 4→6** (`HP_POR_NIVEL`,
  fonte única — o espelho ×4 do `statusDetalhado` quebrou e virou
  constante). Calibragem: ~14 iterações com `ritmo.js` (**4 runs por
  decisão** — run único iludiu uma "validação"); cliff mapeado: produto
  `ESC_HP×ESC_DMG ≤0,086` passa / `≥0,095` estola em 4/4 (renda fixa num
  tot parado × custo exponencial = estagnação estrutural). Alvos:
  1º nível ~47s · nv33-38@15min · mapa1 ~32min · **sem estol (4/4)** ·
  **nv1000 ≤ 25h** (sim 1500min: nv503@3h, 693@4h). Correção de
  diagnóstico: HP/dano do jogo são LINEARES (1+tot×ESC) — a "parede
  exponencial" era a espiral econômica.
- **Curvas de velocidade maiores (destreza) — emendadas no playtest**:
  a recarga do golpe virou **`max(0,08; 35/vel)`** — piso **0,08s =
  teto 12,5 golpes/s** (pedido: "maiores, bem maiores"; o playtest
  depois sentiu o sem-piso "rápido demais: bagunça/DPS" — sem piso
  DES 500 batia 44 g/s; o piso original de 0,15s estagnava a DES em
  6,67 g/s desde DES 62 — medido: DES 100 → 9,9 g/s · DES 300/500 →
  12,5 g/s). E o `mover()` ganhou **sub-passos ≤4px**: com a DES em
  1546 px/s (25,8px/frame, raio do herói 6, obstáculos r=5-7) o
  salto de um frame **atravessava obstáculos** (sensibilidade provada:
  8 atravessamentos detectados sem o fix → 0 com ele) — a colisão vale
  agora em qualquer velocidade. Curva de movimento mantida
  (`46 + DES×3`). Specs `.specs/features/velocidade-curva/` +
  `.specs/features/ajustes-playtest-2/`.

### Fixed

- **Chão do mundo 4 em diante nunca mudava (bug da série)** —
  `Mapas.LISTA` tinha **3 temas** e `info(n)` clampa em
  `Math.min(m, 3)`: do mapa 4 em diante o cenário era sempre "Ninho
  Rubro" (e `itens.temaDe` espelhava o mesmo clamp). Agora são **10
  temas** resolvidos por mundo (fix direto do pedido) e o clamp virou
  ciclo no infinito.
- **Correções de IA/combate com causa raiz medida** (skill
  `systematic-debugging`, reprodução no harness antes de cada fix):
  - **Heróis à distância não atacavam com o alvo colado** — o estado
    `kite` bloqueava o golpe em `<0.7×alcance` (medido: 7815 frames de
    inimigo colado → **0 golpes**); agora a fuga decide só o MOVIMENTO
    entre golpes e o tiro sai point-blank (7777 frames → 256 golpes).
  - **INT alta encurralava nos vértices** — os destinos de fuga
    (`recuar` 90px, `kite` 24px) não tinham clamp: **77% dos frames de
    fuga apontavam para fora do mapa** e o herói empurrava a parede em
    gelo; agora `clampFuga` prende o destino aos limites (margem 16) e,
    com o destino a <24px (sem espaço), o gênio para de correr e **briga**
    (medido: 7560 fugas, 0 fora do mapa).
  - **Destreza parava de acelerar o ataque em ~17 pontos** — a animação
    tinha `atkT = 0.36` fixo, então o ciclo real era
    `max(recarga, 0.36s)` (medido: intervalo 30 frames → 23 e PLATEAU);
    agora a animação acompanha a recarga (`min(0.36, recarga)` com
    frames/hit relativos) — **des8=29 vs des62=68 golpes/10s (2,3×)**,
    piso de 0,15s intacto.
  - **O botão `−` dos atributos abria o tooltip** — o retângulo da dica
    (x=416..716) cobria o botão (684..708); encurtado até x=680.

## [0.3.0] — 2026-11-08

Sistema punitivo + transparência: morte com preço, eventos (Açougueiro e
Gatuno), progressão ~50% mais lenta e gestão completa de stats/tooltips.

### Added

- **Sistema punitivo — Leva 1 de 4 (ritmo punitivo)**: pontos por nível
  **5 → 3**; morte cobra **−10% do ouro** (piso de 1) e **volta de 5
  ondas** (piso: onda 1 do mapa atual — nunca sai do mapa), com a onda
  reduzida renascendo fresca no renascimento **sem contar em
  `stats.ondas`** (`spawnaOnda` extraída de `proximaOnda`) — o Véu da
  Fênix escapa da penalidade; **re-equilíbrio medido** para a morte voltar
  a ser evento (ESC_HP 1,85→**1,30**, ESC_DMG 0,18→**0,10** + sustento
  **4%/s sem apanhar** sobre a regen constante): sem isso os dados
  mostravam esteira (67 mortes/50min, mapa 1 >100min) — com o combo,
  ~35 mortes/50min e mapa 1 ~45min; **`ritmo.js` agora gasta ouro**
  (keystone nv30 + aprimoramento do slot mais barato — baseline = jogador
  que gerencia) e mostra mortes/ouro por marco — spec
  `.specs/features/ritmo-punitivo/` (R-PUN-1..5). Alvos novos medidos (6
  runs): 1º nível ~35-45s · 15min nv 40-48/onda 40-55 · mapa 1 em
  40-55min (média ~45) · mortes ~30-40 aos 50min. Testes: seção 27 (17
  confs) + fixtures com `restaurarOnda` de pressão.
- **Eventos aleatórios (Leva 2 de 4)**: novo `js/eventos.js` —
  **Açougueiro** ("AÇOUGUEIRO — CARNE FRESCA!"): 1,5% por onda desde a
  **30** com pity +0,5%/onda (teto 25%), 1 chance (timeout de 30s ou
  morte do herói = despawn), **morte com ele em campo paga penalidade
  ×2** (−20%/−10 ondas), vitória = **ouro ×10 + XP ×4 + lendário
  garantido** + `stats.acougueiros`; **Gatuno**: rouba **15%** do ouro e
  foge p/ a borda (1,5%/onda, carência de 3, só com cofre cheio) —
  matá-lo devolve **roubo ×1,2** + `stats.gatunos`, e o herói o
  **persegue por prioridade na IA** (defende o ouro, até burro);
  timeouts por unidade (`Eventos.atualiza*`), recompensas/punições em
  `mataInimigo` com ouro relativo aos kills; aba Stats +2 linhas
  (Açougueiros/Gatunos) — spec `.specs/features/eventos-aleatorios/`
  (R-EVE-1..4).
- **Sistema de tooltips + breakdown de modificadores (Leva 3)**:
  infraestrutura em `js/ui.js` (`UI.dica`/`UI.desenhaTooltip` — hover com
  delay 250ms no desktop, **long-press 500ms** com caixa retida no
  celular, 1 caixa, clamp nas bordas, desenhada por cima de tudo e
  **sem hit-test**); **rodapé segmentado** com ordem fixa (HP · Dano ·
  **DPS** · Vel · Crít · Alc · XP) onde cada número abre o
  **breakdown por fonte** de `Personagem.statusDetalhado` (base ·
  atributo · itens(±aprimoramento) · keystone · notas de lendários
  ativos) — **DPS básico = dano × (1+crít/100) ÷ recarga** com a conta
  visível; tooltips de **atributo** (o que cada um alimenta + agudeza da
  IA) e de **item completo** (`Itens.dicas`: afixos 1 a 1, efeito,
  aprimoramento, deltas, venda/sucata/custos) — spec
  `.specs/features/tooltip-infra/` (R-TIP-1..4). Testes: seção 30 (13
  confs: somas exatas, hover, DPS, item, INT, long-press retido e
  fechamento).
- **Estatísticas completas + tooltips de skill/keystone (Leva 4)**:
  aba Stats **+7 chaves de economia** (`ouroGanho`, `ouroGasto`,
  `vendidos`, `sucateados`, `aprimoramentos`, `rerolls`, `lendarios`)
  incrementadas nos pontos exatos de mudança de ouro/investimento
  (venda, sucata, auto-sucata, aprimoramento, re-roll, keystone, abates
  e resgates) com migração automática; cada linha da aba ganha tooltip
  do que conta; **tooltip de skill** (`Skills.dicas`: nível, tipo, o que
  faz com os números dos campos) e **tooltip do keystone** (tradeoff +
  custos + onde aparece no breakdown) — spec
  `.specs/features/stats-completos/`. Testes: seção 31 (11 confs:
  increments exatos +3 tooltips). Pacing ajustado com dados do `ritmo.js` (chegada na
  onda30, hp×3/dano×1,35, 30s, gatuno 1,5%): mapa 1 em **44,6/48,6min**
  (2 runs) mantendo a faixa 40-55. Testes: seções 28/29 (47 confs) com
  eventos **desligados do harness nas seções 1-27** (senão disparavam em
  massa e poluíam stats/ouro/penalidades).

## [0.2.0] — 2026-11-08

Gestão estratégica completa: itens com afixos, economia com ouro,
skills com loadout/keystone e lendários — 4 levas, 22 requisitos
rastreáveis, ritmo medido em cada uma.

### Added

- **Itens com afixos (Leva A da gestão estratégica)**: raridade define
  quantos afixos rollam (comum 0 · incomum 1 · raro 2) num pool enxuto de
  12 (prefixo/sufixo, faixa de valor); **mods negativos** com teto de 1
  por item e magnitude 1,5× (item amaldiçoado que o auto-equip, por soma
  assinada, recusa mas o jogador pode equipar à mão); **smart-loot** por
  classe (70% dos afixos nas chaves da classe); UI da aba Itens com
  **delta por chave** contra o equipado na linha da bolsa e resumo nos
  cabeçalhos dos slots (linhas em 13px com corte de nome); migração de
  save sem mudar chaves (`normalizaItem` aceita negativos/`afixos`, nome
  até 40 chars) e clamps de status (hpMax ≥ 10, dano ≥ 1, vel ≥ 10,
  crit ≥ 0) — spec `.specs/features/itens-afixos/` (R-AFI-1..7). Ritmo
  medido: 1º nível 42,6s · 15min nv33/onda53 · mapa 1 em 28,5min.
- **Economia com ouro (Leva B da gestão estratégica)**: ouro de todo
  abate (escala com mapa/onda, chefe ×8) exibido na aba Itens; **venda**
  (25% do valor) e **salvagem** (piso `max(3, 2×rar×escala)`) por linha
  (`V`/`S`), com **bolsa cheia sucateando o mais antigo por ouro** (fim
  do descarte silencioso); **aprimoramento** de item (custo
  `25×(up+1)²`, teto 8, +8%/nível no status — auto-equip compara valor
  efetivo e a vaga fica defendida) e **re-roll** de um afixo (custo
  `10×rar×escala×(1+0,5×tentativas)`; negativo sai só com rol positivo,
  positivo é aposta) — botões `A+`/`R+` nos slots, toast de feedback;
  migração sem bump de chave (`p.ouro`, `up/rerolls/escala/base`) —
  spec `.specs/features/economia-ouro/` (R-ECO-1..6). Ritmo reconfirmado
  (37,9s · nv34/onda55 · mapa 1 em 29min).
- **Skills estratégicas (Leva C da gestão estratégica)**: **loadout** —
  máx. 3 skills ativas por vez (`Skills.carregadas`; automático = as 3
  mais avançadas, mínimo 1, troca de classe zera); **keystone por
  classe** com tradeoff forte (Fúria Incontida +35%D/−20%HP · Peso do
  Poder +50%D/−25V · Olhos de Falcão +18C/−10%D · Voto de Pobreza
  +30HP/−20%D) liberado no nv 30 por 200 ouro, aplicado dentro de
  `Personagem.status` (fonte única); **respec barato** — loadout troca
  livre, keystone alterna por 10 ouro; aba Classe reorganizada (grade
  2×2, linhas de skill com toggle e botão do keystone com efeito/custo);
  `Batalha` lê o loadout; migração com `loadout/keystoneLib/keystoneOn`
  — spec `.specs/features/skills-estrategicas/` (R-SKL-1..4). Ritmo com
  o teto de 3 skills na faixa (39,9s · nv34/onda55 · mapa 1 em 30,4min);
  seção 16 (gatilhos) passou sem tocar nela.
- **Itens lendários (Leva D da gestão estratégica)**: raridade 4 com 1%
  dos drops + chefe com 15% de elevar (cor laranja, `★` na linha da UI),
  **exatamente 1 afixo negativo + 1 positivo** (o preço do poder) e
  **6 lendários — 2 por tema de mapa**: *Sangue Frio* (vampirismo 4%),
  *Véu da Fênix* (2ª vida 1×/onda), *Lâmina Espectral* (fúria: dano ×1,5
  com HP < 30%), *Manto do Mercador* (ouro ×1,5), *Cetro da Tempestade*
  (ondas renovam os timers das skills) e *Égide Santificada* (a cura
  respinga o mesmo valor nos inimigos próximos) — matemática pura em
  `Itens` (`temEfeito/multDano/multOuro/pctVamp`), 1 gatilho cada em
  `Batalha`, `info().dano` novo e migração de `rar ≤ 4`/`efeito`
  sanitizado — spec `.specs/features/lendarios-equilibrio/` (R-LEG-1..5).
  Ritmo final na faixa (42,3s · nv34/onda54 · mapa 1 em 32,4min); gate
  3×.

## [0.1.0] — 2026-11-08

Primeira versão: jogo idle completo no navegador, suíte de 193 asserções
e deploy no GitHub Pages.

### Added

- **Núcleo idle**: criação/seleção de herói, combate 100% automático,
  save/autosave/progresso offline (`0256b59`); herói novo nasce com 0
  pontos, só +5 por nível (`876b0ff`); segurar botão para repetir e
  seletor ×1/×5 de gasto (`a8e6472`); curva de progressão e ritmo das
  ondas em constantes nomeadas, medidos por `testes/ritmo.js` (`1b674a2`).
- **Mapas, monstros e chefe**: 3 mapas temáticos com 100 ondas cada
  (chefe na onda 100), modo infinito e migração de saves legados
  (`48b4ed4`).
- **Equipamento**: drops de arma/armadura em 3 raridades, auto-equip por
  pontuação, bolsa (teto 10) e aba Itens com paginação (`e939927`).
- **Skills automáticas por classe** (procs sem botão — promessa do
  combate automático) (`642c638`) e **efeitos visuais próprios** restritos
  às primitivas do rasterizador de testes (`9018ef5`).
- **Câmera e arena**: mundo 2× (384×268) com janela 192×134, câmera com
  lerp e trava, renascimento aleatório seguro e inimigos mirando o local
  da morte (`18ea9e3`).
- **Responsivo e celular**: base 768×432 com escala fracionária + DPR,
  toque completo (clique/arrasto/soltura por dedo), alvos de 24px e
  banner de retrato (`4291092`); **largura lógica adaptativa**
  (W = clamp(432×aspecto, 768, 1728)) com layout ancorado nas bordas —
  tela cheia sem barra lateral em telas largas (`4c249e4`).
- **Skills v2**: rename `magias`→`skills`, 5 skills por classe
  (5/15/25/35/45), tipos mobilidade/medo (Empurrão, Teleporte, Esquiva,
  Amedronta) e **ataques à distância** para mago/ladino/clérigo (`f300542`).
- **Mapas procedurais**: Perlin Noise com semente = número do mapa —
  chão (manchas/flores) e posições de obstáculos determinísticos
  (`ad65530`).
- **Estatísticas do jogador**: 8 chaves em `p.stats`, contagem central,
  aba Stats (5ª aba) e tempo de jogo só na jogatina (`530ba88`).
- **Deploy no GitHub Pages** via Actions, estático sem build —
  https://munod.github.io/rpg_heroi/ (`e4c49de`).
- **IA tática**: cérebro do herói por Inteligência (agudeza, alvo
  prioritário, kite, recuo, ruído para INT baixa) + A* sob demanda
  (`2f4948c`); NPCs com astúcia por espécie+mapa — cerco em slots,
  antecipação de fuga e esquiva com falha de golpe "ESQUIVOU!"
  (`2eb26a2`); INT também modula raio/cooldown das skills (`3ec4ab8`).
- **Documentação de engenharia**: `AGENTS.md`, `README.md`, suíte de
  testes com harness (193 asserções) e ferramentas manuais
  (`0256b59`, `66109f2`, e ao longo de todas as levas).
- **Rastreabilidade**: estrutura `.specs/` (project, codebase e backfill
  de specs por feature), este CHANGELOG e política SemVer 0.x +
  Conventional Commits (`docs-rastreabilidade`).

### Changed

- `magias` renomeado a `skills` em código, UI e testes (`f300542`).
- Abas do painel de gestão: de 4 para 5 (grade 66px/passo 70,
  centros 445/515/585/655/725) (`530ba88`).
- `Mapas.forca` saiu da equação de combate e ficou só nos drops (`590fae7`).

### Fixed

- **Contaminação de save entre heróis** e gravação unificada das telas
  (`f70bb21`).
- **Primeiras ondas dos mapas seguintes muito fáceis**: escala de
  dificuldade/XP agora é contínua entre mapas (`ondaTotal`) (`590fae7`).
- **Barras laterais no celular**: layout passou a seguir o aspecto da
  viewport (bug reportado por print) (`4c249e4`).

[Unreleased]: https://github.com/munod/rpg_heroi/compare/v0.6.0...HEAD
[0.6.0]: https://github.com/munod/rpg_heroi/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/munod/rpg_heroi/compare/v0.4.1...v0.5.0
[0.4.1]: https://github.com/munod/rpg_heroi/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/munod/rpg_heroi/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/munod/rpg_heroi/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/munod/rpg_heroi/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/munod/rpg_heroi/releases/tag/v0.1.0
