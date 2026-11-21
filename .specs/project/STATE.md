# STATE — memória persistente

Atualizado a cada leva de trabalho (decisões, adiados, preferências,
lições). É daqui que uma sessão nova retoma o contexto de produto.

## Decisões (com porquê)

- **JS puro ES5 em `js/`, zero dependências, sem build** — o jogo abre
  com `index.html`; testes rodam no Node com harness próprio.
- **Combate 100% automático** (promessa do README) — skills/IA nunca
  ganham botão; o jogador só gere.
- **Layout ancorado com largura adaptativa** (W = clamp(432×aspecto,
  768, 1728)) — 16:9 de referência intacto (testes), telas largas
  preenchem sem barra lateral.
- **Escala de ondas contínua (`ondaTotal`)** — fim do "reset" de
  dificuldade a cada mapa; `Mapas.forca` ficou só nos drops.
- **Perlin com semente = número do mapa** — determinismo exigido por
  testes e screenshots; sorteios independentes do ruído (trocar o chão
  não mexe nos obstáculos).
- **IA utilitária + ruído ∝ (1−agudeza)**, não FSM rígida — INT vira
  atributo buildável em todas as classes; NPCs usam `astúcia(espécie,
  mapa)` (o herói não controla a IA dos monstros).
- **A* só sob demanda** (linha bloqueada + entidade esperta) — arena
  miúda, custo zero no frame comum; burros escorregam de propósito.
- **SemVer 0.x + Keep a Changelog + Conventional Commits** a partir da
  v0.1.0 (ver `VERSIONING.md`).
- **Afixos enxutos (12) em vez de pool grande** — pesquisa mostrou
  *affix bloat* como a armadilha clássica (item vira planilha); raridade
  = quantidade de afixos (0/1/2), no máx. 1 negativo por item.
- **Mods negativos com magnitude 1,5×** — o tradeoff é o que impede o
  auto-equip de decidir tudo; item "amaldiçoado" é recusado por soma
  assinada mas equipável à mão (decisão estratégica sem botão de luta).
- **Smart-loot 70/30 por classe** — drop relevante sem monótono (30%
  foge do viés); `sorteiaDrop` sem classe cai para uniforme (testes).
- **Save sem bump de chave na migração de itens** — `normalizaItem`
  aceita negativos/`afixos` e o corte de nome sobe para 40 (precedente:
  `normalizaStats`); bump de chave só quando a normalização não basta.
- **Economia de moeda única (ouro)** — sem materiais/loja nesta leva:
  venda 25% × sucata com piso cria a decisão (item bom vende, ruim
  sucateia); bolsa cheia sucateia automático (todo drop tem valor).
- **Aprimoramento no ITEM, com vaga defendida** — auto-equip compara
  `pontuarEfet` (soma × (1+0,08×up)), senão o próximo drop comeria o
  investimento em silêncio; `APR`/`MAX_UP` espelhados em `personagem.js`
  (regra dos espelhos: ele não depende de `itens.js`).
- **Re-roll assimétrico** — sair de maldição (rol positivo garantido) é
  seguro; mexer em afixo positivo é aposta (pode virar neg): custo
  escala com tentativas p/ conter spam.
- **Combo de balanço medido (ESC_HP 1,30 · ESC_DMG 0,10 · regen 4%/s)** —
  *(SUPERADO pela leva `progressao-exponencial`: ESC 1,90/0,045 +
  ESPERA8 + HP/nível×6 — a economia exponencial mudou o regime.)*
  com 3 pontos/nível a luta na fronteira era mais longa que a
  sobrevivência (~1 morte/min) e o −5/morte virou esteira (67 mortes/
  50min, mapa 1 >100min). Experimentos isolados não bastavam (só dano:
  53 mortes; só HP: 68; só regen: 52) — só o combo devolveu ~45min e
  ~35 mortes. **Morte frequente anula a própria punição** (lição D2:
  morte = evento). Aprovado pelo usuário com a tabela de dados.
- **O `ritmo.js` gasta ouro** (keystone nv30 + aprimoramento do slot mais
  barato) — o baseline medido é o do jogador que GERENCIA; sem gestão o
  jogo tropeça na fronteira de propósito (é a tese da leva).
- **XP intacto** — a desaceleração real já vem dos 3 pontos (orçamento de
  atributos −40%); alvo de nv redefinido empiricamente (40-48 @15min).
- **Eventos com pacing medido (Leva 2)** — números iniciais foram
  ajustados com dados do `ritmo.js`: Açougueiro desde a onda 30 (com 10
  ele chegava ~min5 = herói fraco = morte ×2 + −10 ondas = onda16@15min,
  fora do alvo), hp×3/dano×1,35 (×5/×1,6 era parede inquebrável: stall
  de 45s), tempo 30s e gatuno 1,5% (a perseguição universal custava
  ondas). Resultado: mapa 1 em 44,6/48,6min ✓ faixa.
- **Herói persegue o Gatuno por prioridade plana (+1000 no peso)** —
  defender o ouro é universal (até INT mínima) e torna o resgate
  determinístico; sem isso a contrajogada era imprevisível (lição de
  projeto: evento com recompensa exige AI que o trate como alvo).
- **Loadout com teto 3 e automático = 3 mais avançadas** — decisão só
  cria dilema com escassez (pesquisa: points ≪ nodes); o automático
  preserva saves antigos e os gatilhos (seção 16 intacta). Medido:
  ritmo na faixa mesmo com o teto — fallback LIMITE 4 não foi preciso.
- **Keystone mora em `personagem.js`, não em `skills.js`** — é
  matemática de status derivado e `Personagem.status` é fonte única
  (UI de status, batalha e testes leem ela); assim o efeito não precisa
  de espelho. `skills.js` fica só com o que dispara em combate.
- **Respec: loadout livre, keystone 10 de ouro** — cobrar por trocar de
  ideia sem ponto investido seria freio (padrão D4: respec barato); o
  custo simbólico honra a decisão aprovada e o sink real é o
  desbloqueio (200).
- **Aba Classe em grade 2×2** — 5 abas são contrato de teste (grade de
  cliques); o espaço de uma linha por classe virou 2 colunas p/ caber
  loadout + keystone dentro do painel de 300px (clique do Mago
  atualizado: 673,102).
- **Lendário = 1 negativo forçado + 1 positivo + efeito** — regra
  única e testável (o tradeoff mora na estrutura, não em texto);
  pool de 2 por tema espelhando o CLAMP de `Mapas.info` (mapa 4+ = tema
  3, igual ao cenário); efeitos com matemática pura em `itens.js`
  (testável sem arena) e gatilhos comportamentais em `batalha.js`
  (1 hook cada — padrão keystone/efeito).
- **Teste de efeito ao vivo precisa ler o status AO VIVO** — congelar
  `stBase` quebra com nivelamento/drop de armadura no meio; e o frame do
  hit tem lag de 1 (stats calculados antes do dano do inimigo) — só
  confirmar no frame seguinte (lição da seção 26).
- **Fixtures de morte/HP-baixo exigem `restaurarOnda` de pressão** — com
  sustento + ondas fracas herdadas o herói não morre nem cai de HP:
  seções 12/16(×2)/17/21/22/27/veneno agora forçam onda alta ou calma
  explicitamente; asserts de onda/ouro na morte são **relativos ao frame
  anterior** (pathing livre dá kills e limpa ondas antes do contato).
- **Ritmo varia ±7min entre runs** (RNG/drops/mortes) — alvo de ritmo só
  pela média de ≥4 runs; e guarda velho tipo `rar <= 3` vira flake de 1%
  quando nasce raridade nova (lendário) — revisar guards a cada raridade.
- **`p.nivel`/`p.classe` alterados numa fixture vazam p/ seções
  seguintes** — restaurar o valor logo após o teste (precedente: 17 →
  `p.nivel = 25`).
- **Evento aleatório em jogo roda EM MASSA durante o teste** (centenas de
  ondas = Açougueiro/Gatuno disparando em seções antigas: stats
  poluídos, roubos/penalidades ×2 quebrando asserts exatos) — o harness
  **desliga os dois via stub** (`Eventos.nasceAco/nasceGat`) e só as
  seções dedicadas religam. Regra: qualquer RNG novo de gameplay precisa
  de um mosquetão de teste.
- **Carência/cooldown: cada CHAMADA decrementa** — testes unitários de
  cooldown precisam de livro-caixa explícito (contar chamadas), senão a
  contagem vira flake enigmático.
- **Tooltip: dwell por FRAME, não por relógio destrutivo** — o
  candidato precisa de flag de consumo (`usada`): zerá-lo todo frame
  reseta o delay e o tooltip nunca abre (bug real achado pelo teste);
  saída do ponteiro = frame sem registro. `performance.now()` do
  harness avança com `frame()` ✓ (16,7ms).
- **Rodapé em 768px: math monoespaçada e separador compacto** —
  `measureText` NÃO existe no rasterizador; 7 segmentos + arma com
  `'  ·  '` estouravam a largura — `' · '` + rótulos curtos ('Crít',
  'Alc') cabem.
- **`statusDetalhado` numérico (não string)** — UI formata, teste soma:
  Σpartes × keystone === status é assert exato; string de tooltip nunca
  entra em asserção de valor.
- **Bugs de IA/combate: medir ANTES de consertar** (lição grande da
  leva de correções) — as 4 causas raiz saíram de sondas no harness:
  faixa de golpes por distância, destino de fuga vs limites, intervalo
  real entre golpes e cobertura do retângulo do botão. Cada fix virou
  conf reproduzível (seção 32) que FALHAVA com o código antigo.
- **Fixture de DPS precisa de alvo que NÃO morre** — `for=999` 1-shot
  fazia os dois cenários darem o mesmo nº de golpes (limitado por
  spawn, não por recarga); `for=1` + onda 15 = combate contínuo e a
  recarga vira o gargalo (29 vs 68 golpes/10s).
- **Assert de tooltip precisa de marcador EXCLUSIVO** — testar `'Força'`
  casava com o rótulo permanente da linha; o marcador é o conteúdo do
  tooltip (`'Valor atual'`).
- **Medição de ouro em teste = batalha PAUSADA** — kills e penalidade
  de morte mexiam no saldo (60→29) e quebravam asserts exatos.
- **Velocidades (spec `velocidade-curva`, emendada na leva
  `ajustes-playtest-2`)** — decisão do usuário: recarga
  **`max(0,08; 35/vel)`** (piso 0,08s = teto 12,5 g/s — o playtest
  rejeitou o sem-piso: "rápido demais, bagunça/DPS"; antes da emenda a
  decisão era sem piso nenhum) e
  movimento mantém `46+DES×3` com sub-passos ≤4px no `mover()`. Medição
  que motivou: DES 100/300/500 davam todos 6,67 g/s (piso 0,15 desde
  DES 62). **Sub-passos precisam de teste de sensibilidade**: a seção 34
  tem caso SINTÉTICO (salto de 28px pelo miolo acusa) + rodada real —
  revertendo o `mover()` antigo ela detectou 8 violações (prova que o
  conf tem dentes). Propriedade geométrica: reta corta o miolo
  (dist < r−2) E os dois extremos longes da borda (> r+2) = atravessou
  (escorregão legítimo na borda não acusa). `info().obst` expõe
  `cx/cy/r` (o y exposto NÃO é o centro de colisão — offset da âncora).
- **Ranking global (spec `ranking`)** — decisão do usuário: **Firebase
  (Firestore, plano Spark)** para leaderboard entre jogadores, sem
  servidor (o projeto é estático no Pages). Escopo fechado em4
  perguntas: **score composto** `mapa×100000 + onda×1000 + min(nv,999)`
  (não tempo — vale para runs infinitas) · **apelido livre** com doc por
  slug e melhor-melhor-apelido (falsificável aceito; as regras do
  Firestore cortam spam: forma validada + `score` estritamente crescente
  no update) · **cena nova** com botão na seleção (não mexeu na grade
  de abas dos testes) · **gatilhos** em `passaMapa` e morte **antes**
  da penalidade (registra o progresso real, não o pós-rollback).
  Arquitetura: SDK por **lazy-load** (só ao abrir a tela) e degradação
  total sem config/rede — o jogo nunca depende de rede; fake do SDK nos
  testes é um **thenable síncrono** (o harness não roda microtasks).
- **Ajustes playtest 2 (spec `ajustes-playtest-2`)** — 4 decisões do
  usuário: **piso 0,08s** na recarga (playtest: sem piso = 44 g/s
  caótico) · **cooldowns efetivos na aba Stats** com rolagem (o valor
  real de combate `intervalo×(1,3−0,45×agu)` — o tooltip mostrava o
  base; e a aba precisou de wheel+thumb porque o conteúdo passou do
  painel — sem `clip` no rasterizador: pula linha fora da faixa) ·
  **teto de nível 1000** *(SUPERADO pela leva `mundos`: teto 9500 p/
  níveis durarem a campanha de 100 mapas — a pesquisa de caps de 1000
  não sobreviveu ao escopo de 200h; XP no cap continua DESCARTADO e o
  save de nv 36 mil segue clamped na leitura)* ·
  **ranking NUNCA silencioso** (sonda REST provou regras OK — escrita
  válida 200 / inválida 403; o bug era observabilidade: `ultimoEnvio`
  com motivo + toasts + status na cena, e detecção de `file://`).
- **Progressão exponencial (spec `progressao-exponencial`)** — decisão
  do usuário ("padrão da indústria"): custo `146 × 1,11^(nv−1)` +
  renda `12 × 1,10^onda` (harmônicos → tempo/nível estável) — *valores
  RE-BASEADOS pela leva `mundos` para 1,07/1,064 (ratio idêntico,
  números cabem na campanha inteira)*; combate
  ESC 1,90/0,045 + ESPERA 8s + HP/nível 6, e safeguards de save (fecha
  o 83k: xpProx recalculado, xp ≤ xpProx−1, tetos de ouro/pontos/
  atributo). Lições da calibragem (~14 iterações): **renda fixa × custo
  exponencial = estol estrutural** (só escapa quem nunca trava na onda);
  **cliff do produto HP×DMG** (≤0,086 passa / ≥0,095 estola em 4/4 — a
  morte −5 amplifica); **o alvo antigo de 30-40 mortes/50min era o
  SINTOMA do estol** (grind), não meta — com economia funcional a morte
  virou evento de fronteira/boss (~10-19/120min); **run único não decide
  curva** (uma "validação" rodou constantes erradas por âncora de
  texto — 4 runs salvaram); ESPERA_ONDA é alavanca de ritmo que NÃO
  toca no clear/survival. **Correção**: HP/dano são lineares
  (1+tot×ESC) — a "parede exponencial" do diagnóstico inicial era a
  espiral econômica.
- **Mosquetão de eventos: desligar no FIM de cada seção** — o Gatuno
  ficava religado após a 29 e corria nas 30+ (flake latente achado ao
  revisar o harness).
- **Ritmo pós-correções: média ~47-48min (6 runs: 39/45/>50/>50/
  50/49)** — dentro da faixa 40-55; onda@15 média ~44 ✓; mortes 5-7 ✓.
  A DES acelerar de verdade não mudou o ritmo (o `ritmo.js` só bombeia
  FOR). Não reequilibrar por variancia de RNG (±7min).
- **Stats de economia: incremento onde o ouro MUDA, não em ponto único**
  — `conta()` em `itens.js` + `Batalha.stat(n)` em `mataInimigo`; as
  chaves vivem no espelho `Personagem.STATS` (normalizaStats zera save
  antigo de graça). Contar `ouroGanho` em TODO ganho (inclui resgate e
  auto-sucata) e `ouroGasto` em TODO gasto (inclui keystone/respec).


- **Campanha 10 mundos × 10 mapas × 100 ondas (~200h)** — decisão do
  mantenedor (série de levas): a estrutura 10×10 é a ESPELINHA de
  cutscenes, monstros novos e árvore de skills da série. **Vencer o
  mundo 10 = overlay de vitória + modo infinito em loop** (não fim
  definitivo).
- **Teto de nível ~9.500 com RE-BASE das curvas** — a recomendação
  inicial de "3-5 mil" estava ERRADA (recalculado): a progressão segue
  `nv ≈ 0,9166 × ondas` (ratio `ln H/ln G`), então a onda 10.000 chega
  em nv ≈ 9.150; e com `G 1,11` o custo estourava `1e308` no nv 6.775 /
  a renda na onda 7.411 (mapa ~75) — **teto ≤ 6.800 morre antes do fim
  da campanha**. Re-base `G 1,11→1,07` + `H 1,10→1,064` mantém o ratio
  (0,9166 vs 0,9133 → mesma trajetória) com 30+ ordens de folga.
- **ESPERA entre ondas é a alavanca de DURAÇÃO; nº de monstros é de
  PERIGO** (medido, refuta a premissa da spec) — k=1/3/5 em `ritmo.js`
  → todos ~21 mapas/600min (XP extra fortalece o herói e compensa);
  k=10 → mesmo ritmo com 195 mortes. Já o respiro é linear e não
  toca no cliff `HP×DMG`: 8s→21 mapas, 40s→8, 70s→5 (600min). Por
  isso a duração escala com `esperaOnda()` = `8 + (mapa−1)×1,1`s
  (mundo 1 intacto, fim da campanha = 117s) e a contagem de monstros
  ficou sendo decisão de IDENTIDADE/perigo (degraus por mundo vs
  progressão suave por mapa).

- **Curvas com teto + pontos escassos (spec `gestao-atributos`)** —
  a raiz do relato *"jogadores não ligam onde colocam os pontos"* era
  dupla: (1) **3 pontos/nível = 6 decisões por minuto** valendo ~1%
  cada (decisão vira ruído → distribuição no automático); (2) **stats
  lineares sem teto** (vel/XP/HP) — mono-stat virava "Flash" no nv 30
  e o `xpMult` do Carisma chegava a **855×**, fazendo a progressão real
  divergir da calibrada. O `ritmo.js` nunca pegou nada disso porque
  investe **tudo em FORÇA**. Escolhas do mantenedor: 1 ponto/3 níveis ·
  soft caps (sim) · teto da vel 250 (delegado) · Carisma → dano do
  clérigo (opção a) · **teto de nível mantido em 9500** (a alternativa
  "101" foi calculada: exigiria rebalancear XP/itens/dificuldade e
  perderia os 222h validados — e com a curva atual os 101 níveis
  durariam 4-7 minutos).
- **O "Flash" e o bug de FPS previstos eram reais** — `46+DES×3` sem
  teto dava 85.561 px/s no teto (357 sub-passos/frame); a literatura
  (Game Mechanics Hoard) chama exatamente isso de *"linear stacking
  breaks games at the extremes — without caps, optimal play is always
  maximal specialization"*.
- **Medir ANTES de consertar pagou de novo**: a compensação 9× nasceu
  da medição (sem ela: 1200min no mapa 3 com 223 mortes = estol). E a
  primeira fórmula de compensação errou a base (usei o literal 8 em vez
  de `8 + bônus de classe`) e IGNORAVA atributo abaixo da base (fixture
  de vidro virou tanque: con 1 dava 58 de HP em vez de 30) — a
  `ganhoAtributo` com três estados resolveu os dois.
- **Itens também eram fonte de problema**: o afixo `Veloz` escala com
  `forca(mapa)` e daria +1.968 no mapa 100 — qualquer teto de
  atributo seria contornado sem limitar o afixo.

- **BUG DE INTEGRAÇÃO: copiar os campos de skill do TIPOS para a
  entidade** (lição da leva `monstros-novos`) — o `spawn` constrói a
  entidade com campos **explícitos**, então `t.ranged`/`t.regen`/
  `t.dreno` **nunca chegam em `en.*`** e as 3 skills novas **não
  funcionavam** no jogo (só passaram nos testes por serem funções puras
  exportadas — o teste comportamental do atirador é que pegou: `cd`
  parado em −0,01 = ele só dava golpe corpo a corpo). Regra: skill nova
  em `TIPOS` **exige** copiar no `spawn` + **teste comportamental na
  arena** (função pura sozinha não prova integração).
- **`restaurarOnda(1)` deixa `onda = 0` → `ondaTotal = −1` → `escHp =
  −0,9` → HP NEGATIVO no spawn** (inimigo inválido some na hora). Para
  fixture de arena use `restaurarOnda(2)` (onda 1, tot 0) — e repare
  que a onda 1 nasce com slimes, então isolar um bicho exige esperar a
  limpeza (ou medir por efeito próprio, ex.: o reset do `atkCd`).
- **A VARIÂNCIA ENTRE RUNS É 1..112 MORTES** (7 runs de 2400min
  isolando Enxame/Cofre) — 1 run de "referência" **não discrimina**
  nada (a minha referência tinha 20 mortes; uma run com TODO o evento
  novo desligado deu **1** e outra com cofre desligado deu **87**).
  Decisões de evento/pressão agora são por **progressão projetada**
  (mapas/h) e por isolamento de variáveis, nunca por diferença de
  mortes entre 2 runs.
- **Mosquetão de RNG: a regra existe e eu esqueci de aplicar nos RNGs
  novos** (lição da leva `monstros-novos`): o AGENTS já dizia "qualquer
  RNG novo precisa desse mosquetão" — o Enxame, sem stub no topo,
  dobrou ondas e ×1,5 o ouro **dentro do teste do Açougueiro** (delta 66
  em vez de 22..40). Não é defeito de design do evento, é teste sem
  mosquetão.
- **"Distância no frame do dano" é proxy frágil p/ provar que é tiro** —
  o critério `> 40px` falhou (o HERÓI vem até o atirador e a distância
  cai p/ 20). A prova correta é `> 13px`: é o ramo CQC do inimigo
  (mesmo `distH` de todos) — dano com distância maior **só** pode ter
  vindo do missil.

- **Cutscenes: a batalha NUNCA pausa** (spec `cutscenes`) — decisão
  após comparar com o overlay de vitória: pausar violaria o idle (AFK
  numa fronteira = progresso travado até clicar). Fronteira espera o
  jogador (9 na campanha, sem auto-dismiss); evento tem auto-dismiss
  3,5s + teto 1 (Cofre é 8% por onda — bloquear sem saída seria
  intrusivo). Eventos silenciados em `voltaAusencia` (centenas de
  ondas disparariam em massa); a cutscene de MUNDO continua ali de
  propósito: é o resumo da ausência. Não persiste entre sessões (é
  momento, não estado — fechar no meio perde a narração, o progresso
  não).

- **Ramos: base NEUTRA como default, não o ramo A** (spec
  `arvore-skills`) — se o ramo A viesse por padrão, todo jogador (e o
  `ritmo.js`) jogaria com mods desde o nv 5 e o baseline medido
  (222,5h) mudaria sem ninguém pedir. Sem escolha = valores originais
  intactos; o merge só acontece em `p.ramos` preenchido. Corolário:
  **todo ramo é sidegrade** (tabela `Skills.SENTIDO`: ≥1 buff e ≥1
  nerf por variante, asserção de dados) — árvore não pode ser power
  creep; e **`gatilho` é probito nos mods** (fugir antes é seguro mas
  tira uptime — polaridade ambígua não dá para asserir).
- **Loadout escalonado protege o early game** (nv < 50 = teto 3, idêntico
  ao medido) — o crescimento 3→4→5 todo acontece depois da primeira
  meia hora, então a sanidade (2 runs de 2400min: mapa 36/nv 3247,
  dentro da faixa 29-36/2600-3300) não precisou de rebalance.

- **Flocking mora na camada de MOVIMENTO, não em `ia.destino`** (spec
  `ia-monstros`) — a seção 23 é contrato: burro = `destino === null` e
  astuto = raio **exato 11px**. Se a separação entrasse em
  `ia.destino`, esses asserts cairiam (e o `null` dos burros seria
  mentira). O deslocamento entra no alvo (`alvoX/Y += sep`) com
  **clamp a 12,5px**: sem o clamp o destino do anel (11) + sep (10)
  chega a 21px, o monstro para em cima dele e o ramo de golpe
  (`distH ≤13`) **nunca dispara** — o monstro vira estátua. Base longa
  (antecipação a 40px) não é clampada: cortar a fuga precisa do ponto
  à frente.
- **Influence map em 8px, não 16** — resolução tem que ser MENOR que
  o fenômeno: o anel de 11px tem candidatos a ~5,7px, todos na mesma
  célula de grade 16px (a do A*) → ocupação sem discriminação nenhuma.
  Obstáculo é consulta DIRETA por candidato (com o raio da entidade —
  boss não passa onde slime passa) em vez de memo: memo entre frames
  fica stale quando `garanteCenario` troca o mapa.
- **Escopo e prioridade decididos com o mantenedor**: separação
  universal + destino escalado pela astúcia (burros seguem direto);
  se a sanidade estourasse a faixa, afro os NOVOS mecanismos até caber
  (a progressão medida é o contrato). Aprovado sem ajuste: mapa 1 em
  31,8min e 2×2400min em mapa 36/nv ~3250.

- **Escopo da IA do herói: BT estrutural + evasão de cerco** (spec
  `ia-heroi` — resposta do mantenedor a "o que deve sair da leva 6"):
  a Behavior Tree é ARQUITETURA (mesmos 5 estados, mesmos gates) e a
  evasão de cerco é o comportamento novo visível.
- **PRIORIDADE INVERTIDA nesta leva (decisão do mantenedor)** — pela
  primeira vez **o comportamento novo vale mais que a progressão
  medida**: "a progressão pode ser mais maleável, pois futuramente
  vamos implementar níveis de dificuldade no endgame". Intervenção só
  em ESTOL (mapa 1 > ~40min / estol de nível / mortes em massa) —
  medido: mapa 1 em 31,5/33,5min e 2×2400 levemente à frente
  (mapa 38/36 · nv 3442/3244) → nenhuma intervenção. Levas futuras
  que retomem o contrato antigo confirmam com o mantenedor antes de
  afro qualquer coisa.
- **Gates da INT = profundidade da árvore** — a BT não INVENTOU
  limiares novos: `profundidade(agu)` formaliza os 0,35 (kite) e 0,45
  (recuar) que já existiam, como camadas 1/2/3. Por isso as seções
  22/32 passaram sem mudança de assert — refator de comportamento
  idêntico é verificável pelos contratos antigos.

- **Base visual da série = os 3 docs em `/home/thiago/Projetos/Docs/`**
  (ui/efeitos/cutscenes — escritos para OUTRO build: resolução
  384×216 e cutscene a cada 10 ondas). Mantidos os nossos: esquema
  768×432+adaptativo (mais novo, testes dependem) e gatilhos de
  cutscene da spec leva 3 (mundo/evento) — adotado só o **visual**.
  Série de 3 levas aprovada pelo mantenedor: ui → efeitos → cutscene.
- **Ritmo do mapa 1 variou 31→37min entre sessões SEM mudança de
  gameplay** (leva `visual-ui`): A/B com `git stash` — o código
  ANTIGO de hoje dá 37,7/34,6min vs média 34,1 do novo. A faixa
  31-33 era de sessões antigas; variação entre sessões > dentro
  delas. **Regra: A/B (stash) antes de culpar uma leva pela medição**;
  critério de estol do mantenedor (>40min) segue como porto seguro.

- **Backing = exibição, não escala inteira** (spec
  `ajustes-playtest-3` — "resolução da UI baixa" no playtest): o
  `floor(escala×dpr)` deixava o buffer em 1× e o CSS esticava com
  `pixelated` (1,67× = glyph blocky). Agora `esc` é fracionário e o
  buffer nasce no tamanho da tela — texto/vetores nítidos; pixel art
  não perde (nearest = a mesma irregularidade que o CSS já produzia).
  O §1 do `Docs/ui.md` recomenda escala inteira + letterbox —
  **REJEITADO**: deixaria margem na tela (o jogo já preenche por
  design); o princípio "backing = exibição" é o equivalente nosso.
- **Exibição de float cru é bug de UI** (mesma spec): a Vel é
  fracionária por construção (curva 46+24×(DES/8)^0,35) e saía como
  "81.25361691040177" no rodapé/Stats. Arredondar NO RENDER, nunca
  em `statusDetalhado` (os testes somam as partes numéricas).

- **Cutscene: letterbox + véu juntos** (spec `visual-cutscene`) — o
  doc tem só as barras (o mundo deles congela); como a nossa batalha
  **nunca pausa**, manter o véu dá legibilidade do painel sobre arena
  viva e as barras dão o quadro cinematográfico. Gatilhos e
  auto-dismiss intocados (spec `cutscenes` = contrato — "só visual"
  foi decisão explícita do mantenedor).
- **A dica "clique para seguir" era mentira antes** — só o botão
  fechava. Agora o clique fora **avança** (3 estágios do doc) e a
  dica pisca de verdade; `Enter`/botão seguem fechando direto
  (contrato da 42 preservado).

- **Efeitos: dono único + missil como exceção do silenciar** (spec
  `visual-efeitos`) — o doc manda silenciar a simulação offline
  inteira, mas NOSSO dano à distância cai na CHEGADA do missil
  (callback da Batalha): silenciar bloqueia só os spawns
  decorativos, **preserva o missil** (voa e acerta offline) e o
  update roda sempre. Adotar o doc literalmente teria REDUZIDO a
  renda offline das classes à distância.
- **nums/parts migraram para o Efeitos por FACHADA** —
  `Batalha.numero(x, y, txt, cor, big)` virou casca sobre
  `Efeitos.nota` (booleano legado `true`='big' preserva os ~20 call
  sites; só o dano crítico mudou de estilo: big → crit com tremor do
  doc). `limparEfeitos` = `Efeitos.limpar()` (a nota antiga do
  AGENTS "só Efeitos.limpar deixa texto" morreu).
- **Flash/vinheta/perigo em espaço de JANELA** — desvio documentado
  do doc (que não tem câmera): `desenharTela` roda depois do
  `restore` porque flash tem que cobrir a janela, não o mundo.
- **Hit-stop ligado e medido**: 0,02s/golpe normal, 0,08 crítico,
  0,14 fatal — sanidade 2×: mapa 1 em **30,7/32,6min** (banda
  intacta; a quantização por frame custa <2%).

- **Shake: conforto do mantenedor vence os valores do doc** (ajuste
  pré-push da `visual-efeitos` — "tremedeira muito bruta"): o caos
  vinha do **salto aleatório por frame** (o doc manda round(rand(±amp))
  por frame) + amplitudes até ±3px. Virou **senóide com fase por
  impacto** (encadeamentos mantêm a fase), duração/amplitude ~40%
  menores e forças maiores cortadas — hit normal agora ±1px. Lição:
  doc de referência é alvo de partida, não de chegada; a régua final
  é o jogador.

- **Cutscene sem véu, com a caixa do original** (spec
  `cutscene-estetica` — mantenedor achou "visualmente feio" e mandou
  o código do outro projeto como referência): a feiura vinha do véu
  `rgba(8,6,16,0,84)` de tela inteira (achata tudo) + `UI.panel` roxa
  (visual de painel de gestão) + título DUAS vezes no evento. Agora:
  barras `#000`, caixa preta translúcida + fio dourado, título
  único. Legibilidade sem véu = fundo 0,90 da própria caixa (a
  solução do original). A lição do `stroke()` no-op (já registrada
  na `visual-ui`) voltou na prática: borda por duplo preenchimento.

- **Cutscene sem botão e caixa transparente** (ajuste do mantenedor
  pelo print de referência do outro projeto): miolo da caixa 0,90 →
  **0,60** (a arena dá pra ver por trás) e os botões
  "Continuar"/"Entrar" **saíram** — `info().botao = null`, o check de
  retângulo saiu do `Jogo.update` e TODO clique avança (3 estágios;
  o último encerra). Enter fecha direto; eventos mantêm auto-dismiss
  3,5s; a fronteira continua "esperando o jogador" — por clique.
  Testes 42/48 migraram de asserts de botão para as dicas
  piscantes + laço de cliques (o retângulo era o contrato, não o
  texto).
- **ESPERA_BASE 8→4 sem medição** — pedido explícito do mantenedor
  ("commitar sem teste"): registrado no CHANGELOG; se a sim estolar,
  o comentário do código manda subir o número.
- **Arte do herói autorada em GRID DE TEXTO** (`visual-heroi-arma`):
  cada pose é uma faixa de linhas de 20 colunas (char = índice de
  paleta) e as partes se compõem (corpo + pernas + braços + cabelo
  ×5 + classe ×4 com âncora no bob); `desenhaFaixa` **throwa** se uma
  linha não tiver 20 colunas — a mesma grade ASCII que o `grade.js`
  imprime é a fonte do desenho. Descartado asset PNG externo: quebraria
  o harness (que lê os pixels gerados) e a regra "sem dependências,
  sem build". Iteração visual = rodar `previa.js`/`cena.js` e **olhar
  o PNG** (asserção verde não é opinião de arte).
- **Rampas HSL com hue-shift em vez de multiplicação** (mesma leva) —
  `shade(hex, f)` só escurece os canais → escuros acinzentados (era o
  "visual tosco"). Luz única topo-esquerda em todo sprite; contorno
  externo `#1b1424` mantido (legibilidade na arena escura). Duas
  consequências não óbvias: a borda de cada forma perde a cor sozinha
  na passagem `contorna()` (o "canto de fora" é silhueta) e a franja
  do cabelo **para em x8** — se cobrisse x9/x10 o olho sumiria no
  frame com bob=1.
- **Raridade visível na mão** (mesma leva) — guarda/cristal/faixa do
  martelo saem de `look.rar` (ouro → azul → roxo → vermelho);
  `lookDe()` passou a expor **`classe`** e **`rar`** como campos
  DERIVADOS (o save segue só com skin/hair/estilo/cloth, formato
  intocado) e a cache key do `Anim.hero` inclui os dois — sem isso a
  troca de classe/equipamento ficava com o sprite velho em cache.
- **Partes de 1px vão DEPOIS do `contorna()`** (`visual-monstros`) —
  asas/orelhas/pernas de 1-2px pintadas antes viravam **todas
  contorno** (o morcego virou uma cruz preta e a aranha um borrão de
  linhas escuras). A ordem certa no monstro é: corpo grosso →
  `contorna()` → partes finas via `pintorDestaque` → rosto →
  `contornaDestaque()`. Mesma lógica da arma do herói — vira regra
  geral do `sprite.js`.
- **Prévia embaixo das linhas + texto curto à esquerda**
  (`preview-heroi`): a aba Apar tem contrato de clique nas 4 linhas
  (`(706,96)` = `>` da Pele) e as dicas em `x416` — a caixa ficou em
  `616,232` (132×96) e as dicas **encurtaram** porque `16px monospace`
  ≈ **9,6px por caractere**: "Nome: digite qualquer tecla no topo"
  (35 chars = 336px) invadia a caixa. Regra prática: medir o texto
  (`n × 9,6`) antes de pôr caixa ao lado — e conferir no PNG, que o
  texto do harness é bloco, não glifo.
- **Relógio de animação de UI mora no `Gestao.update`** — ele já roda
  nas **duas** telas (jogo e criação) e antes dos `return` de aba; um
  rAF/setInterval próprio congelaria na criação e quebraria a regra
  do harness (rAF disparado à mão).
- **Ícone em escala NATIVA + chip clicável** (`icones-itens`): os
  ícones são 16×16 desenhados **sem reamostrar** (escala 1,43
  borraria a borda) e, na bolsa, o ícone virou um **chip-botão** à
  esquerda da linha — em vez de empurrar o texto, que estava fixo em
  `x+8` pelo `UI.button` (não aceita indent). Cortes: 20/16→17/13 nos
  slots e 33→29 na bolsa; como o `Itens.linha` **só trunca o nome**,
  `★`/`-15HP` (asserções 15/26) sobrevivem por construção.
- **Contorno de parte fina é só por fora** — a lição do morcego
  (asas de 1px virando contorno) voltou nos **ícones**: rodar
  `contorna()` na lâmina de 3px a transformaria toda em contorno;
  o caminho é marcar os pixels e chamar `contornaDestaque()`.
- **Teto do ranking por TEMPO DO PROJETO, não por jogador**
  (`ranking-antitrampa`): o `resource` do rules só expõe
  `data/id/__name__` (**sem `createTime`**) e sem identidade não há
  relógio por jogador — a 1ª marca de um apelido é indistinguível de
  um legítimo atrasado. Escolhas conscientes: (a) teto **absoluto**
  (`30 + min desde 2026-11-01 / 100`) em vez de limite por *delta*,
  porque delta gera **cascata de rejeição** (um envio recusado aumenta
  o delta do próximo → bloqueio permanente do jogador); (b) constante
  folgada (cresce 14,4 mapas/dia vs 10,8 legítimos) p/ nunca travar
  legítimo — **recalibrar com `ritmo.js` se o ritmo mudar**; (c) a
  1ª marca segue confiável até o teto (reduz o espaço de 10¹⁰ p/
  ~10⁷⁻⁸) — eliminar de vez exigiria save/placar autoritativo
  (opção C, adiada pelo mantenedor).
- **`min()` não existe nas rules; `math.*` e `request.time.toMillis()`
  existem** — a paridade do score usa a identidade dos dois ramos
  (`nivel ≤ 999 && x == nivel) || (nivel ≥ 999 && x == 999)`, que é
  exatamente `min(nivel,999)`), e toda constante de teto vive nomeada
  no arquivo do rules com a fórmula de recalibragem.
- **Save assinado é BARRERA, não segredo** (`save-assinado`): a chave
  do HMAC está no bundle e o dono do save é o próprio jogador — a
  promessa é "mexer no JSON no DevTools deixa de ser silencioso", não
  "não dá pra editar". Três escolhas que evitaram armadilha: (a)
  **sem sal por aparelho** — com sal local a transferência do export
  entre máquinas falharia (assinatura da origem ≠ do destino); (b)
  **migração re-escreve na hora** — aceitar save antigo sem reescrever
  deixaria uma janela em que o PRÓPRIO save do jogador viraria
  rejeitado no boot seguinte (marcador já ativo); (c) **rejeitado é
  PRESERVADO** — `gravar`/`salvar` re-assinam só o que passou e mantêm
  o resto intacto, porque apagar num falso positivo = perda de save e
  re-assinar = aceitar a trapaça na marra. E o placar continua sendo
  da outra leva: `Ranking.submete()` monta o payload do estado ao
  vivo, não do save.

- **Leva "dopamina/viciante" em 4 levas rápidas primeiro** (reclamação
  do playtest: tédio nas pausas, "o personagem dorme entre as ondas",
  esponja de dano no endgame, mapa limitado cortando o herói):
  (1) **ritmo como instrumento antes de qualquer balance** — a fase 1
  semeia o RNG (mulberry32, seed fixa = A/B limpo, **eventos
  aleatórios ATIVOS** por decisão do mantenedor) e ganha espera%/
  ttk/marcos/JSON, porque as levas 3-4 (teto do rampa, pontos/level,
  esponja/densidade) só se decidem medindo; (2) percepção sem mexer em
  balance (countdown + toast de clear + fim do **delay duplo 16s→8s**
  do troco de mapa + overlay de opções com defaults intactos);
  (3) **balance medido — CONCLUÍDA com uma reviravolta** (≥4 seeds por
  decisão: `ESPERA_TETO 45` · ponto/nível V1 neutro validado idêntico ·
  TTK −12% com densidade ↑; **a sim completa de13500min estolou no
  mapa97** — o teto encolheu a janela de regen do fim (45×500 vs
  113×500) e o k0,75 subiu o dano: compensação medida =
  `REGEN_MAX 1250` + `ESC_DMG 0,037` + `ESC_HP 1,25`, sim da
  candidata em curso); (4) **mapa procedural infinito — FASES A-E
  COMPLETAS** (câmera centralizada, chunks, janelas rolantes, tema por
  mapa; fumaça reescrita; IA isolada neutra no ruído) com spec antes
  do código. Referência de gênero: D2
  Survivors (survivors-like) — nunca deixar tela sem informação e
  transformar pausa em **decisão** (o card por nível), não em espera.
  Lições de medição: (a) em240min o teto do respiro é inócuo (mapa9
  ainda <45s) — alavanca tardia só aparece em run longo; (b) a
  variança de seed domina (onda14-99, ttk1,77-3,2 entre runs) —
  ≥4 seeds ou não decidir; (c) **rodar a sim completa SEMPRE que a
  fronteira mudar** — o estol do mapa97 só aparece em140h+, nenhum
  teste curto pegaria; (d) isolar a causa com A/B parcial (tema vs
  IA) antes de "consertar" — o isolamento mostrou que a IA nova era
  neutra e o conteúdo era o responsável.
- **Onda-timer (5º leva, fechamento)** — o mantenedor mandou **remover
  a espera entre ondas** ("muito ruim e chato") e propôs **cota de
  tempo por onda** ("se exceder X segundos, a outra onda já inicia").
  A ideia foi aceita como estruturalmente superior: inverte o sinal
  (espera parada → pressão durante o combate), faz a **build virar o
  motor da progressão** (build boa = campanha no ritmo do clear;
  build fraca = reforços acumulando → espiral → morte) e dá papel de
  drama aos eventos (Enxame = a onda que estoura a cota). Execução:
  spec `onda-timer` antes do código → instrumentar clear (p95) no
  ritmo → **X escolhido pelos dados** (p95=18s → cota30, folga67%)
  → implementação com timers preservando os fluxos de
  morte/rollback/troca de mapa → A/B4 seeds (mapa9→12, nv777→1050,
  atraso0%) → sim completa p/ duração. Aceite do mantenedor: campanha
  ~45-50h (**medida: VITÓRIA em44,0h,0 mortes, atraso0% em9.900
  clears**), batida de2s mantida, troco de mapa8s mantido. Alavanca de
  duração da campanha: **deixou ser a espera e passou a ser o clear**
  (AGENTS reescrito; alvo vigente44,0h — a sim COM espera vale como
  referência histórica em136,2h).

- **Visual do herói via SpriteCook (spec `visual-heroi-spritecook`)**
  — decisões do mantenedor no levantamento: **pixel art rico (32-48px)**
  · **look fixo por classe** (a Apar perde Pele/Cabelo/Estilo/Roupa;
  `p.look` segue no save sem bump) · **arma como sprite separado**
  (preserva "raridade visível na mão" via recolor do marcador magenta)
  · **piloto = 1 classe completa** (guerreiro) antes de replicar.
  **Reversão da decisão "PNG externo descartado"** (STATE da
  `visual-heroi-arma`) com justificativa: `lerPNG` já existia (ganhou
  RGBA), o harness ganhou `Image` síncrona e "sem build" não proíbe
  PNG — é arte commitada. **Degradação por construção**: classe sem
  asset cai no procedural (mago/ladino/clerigo seguem iguais na leva
  1), então o piloto nunca deixa o herói sem desenho. Escala: fonte
  86px → **÷2 vizinho = 43×43** (olhos sobrevivem — conferido no
  PNG), pés na fileira 42 (ancoragem `y0 = heroi.y − ALT` idêntica à
  antiga), corpo centrado em x21. O manifesto (`js/assets.js`) é
  fonte única de frames/âncoras/geometria — os testes leem ele, não
  duplicam números. Arma: fatiada na nuvem (`auto_slice_asset`),
  ângulos por `rotate_sprite` (RotSprite grátis), redução ÷4 +
  recolor das 4 raridades no `testes/prepara-assets.js` (também mede
  o punho por detecção de pele e gera a folha QA).

- **Geração: preset não basta — a pose precisa de prompt** (mesma
  spec) — o preset `walk` balançava os DOIS braços (a mão da arma
  sumia atrás do corpo em metade dos frames) e o preset `attack`
  punha o punho NA CARA (a espada cruzaria o rosto) + materializou
  lâminas do "invisible sword". Os dois viraram **animações custom**
  com a restrição explícita ("braço direito firme no quadril",
  "punho ao lado da orelha, nunca sobre o rosto") e os fragmentos de
  lâmina sobraram num **recorte documentado** (`RECORTES_ATAQUE` no
  `prepara-assets.js`). Lição: animação gerada é POSE, e a pose tem
  que ser compatível com o que o jogo compõe por cima (a arma).

- **Emenda do veredito: arma EMBUTIDA + cenário ×2 + raridade fora**
  — o mantenedor avaliou o piloto e apontou3 defeitos, todos
  confirmados na análise: (1) herói ~40px > árvore 26px (proporção
  invertida); (2) o follow-through cruzava o punho e a composição
  ESPERELHAVA a arma = "muda de mão"; (3) âncora por centroide +
  ângulos discretos = "não segura". **Decisões**: abandonar a arma
  separada e **embutir a arma padrão da classe na arte** (a geração
  pede o objeto na mão — grip, mão única e arco do golpe nascem na
  pose; some `assets/armas/` inteiro, âncoras, ângulos e espelhamento
  de composição) · **"raridade visível na mão" abandonada** para o
  herói novo (itens de arma viram números; mantida no procedural e
  nos ícones) · **cenário ×2 só visual** (`ESC_CENARIO = 2` em
  `desenhaObst`, ancorado na base — `obst.r` intocado, sem remedaça;
  proporções restauradas: árvore/herói 0,6→1,2 [original 1,37],
  pedra/herói 0,26→0,51 [original 0,58]). A geração custom confirmou
  as lições do piloto no prompt ("espada visível o tempo todo", "braço
  firme") — e o ataque novo nasceu com **arco de corte** no frame do
  golpe. Verificação por **captura dos args do drawImage** (40×52 /
  28×22), não por olho — a tool de leitura serviu imagens com escala
  desconhecida e minhas medições por cor confundiram tronco com
  grama.

- **Leva 2: as3 classes restantes + `inicios` por classe + fallback
  mantido** — mago/ladino/clerigo gerados no mesmo pipeline (base com
  a arma da classe na mão, prompts custom com a lição do "braço
  firme"). **`inicios` do ataque é POR CLASSE** (R-VHS-14): o frame
  do golpe depende da pose gerada — medido por `max-x` por frame
  (guerreiro e ladino: transição wind→forward em f5 = tabela padrão;
  mago e clérigo: golpe em f6 = tabela própria `[0,.04,.08,.12,.16,
  .22,.28,.70]`, golpe começando em 0,28 ≈ o momento do dano em
  dur 0,36). **Fallback procedural MANTIDO** (decisão da leva 2):
  continua a rede de segurança (PNG ausente nunca deixa o herói sem
  desenho), é o que a seção1 da fumaça e o `previa.js` cobrem, e
  custa zero em runtime — removê-lo só ganharia linhas. O teste do
  fallback migrou para **classe inexistente** (`Assets.qtd('xena')`
  cai em 4/2/3), já que todas as reais têm asset agora. Lição nova:
  com o display de imagem da sessão TRAVADO (a tool servia a MESMA
  imagem para qualquer arquivo), a QA visual virou programática —
  paleta por histograma, presença/continuidade da arma por contagem
  (frame ≠ <55% da mediana), pés na fileira42, `max-x` do golpe —
  e a conferência a olho — aprovada pelo mantenedor em 2026-11-18
  (`testes/previa-assets.png`,12 linhas).
- **Mundo full screen + UI flutuante (Leva `mundo-fullscreen`,
  2026-11-18)** — referência do mantenedor: UI do **Leveling Idle 2D**.
  Decisões em 2 rodadas: (1) **k=1 sem zoom** (tela = `W×432`,
  1 un. = 1 px), **barra de abas fixa no rodapé**, **janela da Gestão
  à direita na mesma posição** (conteúdo/cliques intactos) e **anel de
  spawn aumentado** (110-132 → `raioSpawn()` ≈460px — fora da tela;
  alvo de ritmo: A/B ≥4 seeds e relatório ANTES de reequilíbrio);
  (2) após o 1º relatório: **herói no CENTRO da tela** (abandonou a
  área livre — brigas atrás da janela α0,88, X fecha), **HP sobre a
  cabeça** estilo inimigo (sem número), **top bar** no lugar do card
  (NOME — MAPA · Nv · XP · Pontos · Opções dentro + linha de XP),
  **sem dica persistente**, **Onda no canto sup. esq.**, cota
  `ONDA_SEG` 30→15→**20s**. Ritmo final (4 vias × 4 seeds): anel460 +
  cota20 = mapa 8 / nv 664 @240min (−36% vs baseline, atraso ~20%,
  espera ~9%, clear p95 41s, **0 mortes**, campanha ~70-75h) —
  **mantenedor: "Opção 1. Eu gostei muito" — aceito SEM
  reequilíbrio** (relatórios em
  `.specs/features/mundo-fullscreen/relatorio-ritmo-{faseB,final}.md`).
  Lições: cota 15s virou fluxo contínuo (atraso 82%, clear p95 260s,
  batida sumiu) — cota precisa ficar ≥ clear p95; flakes novos de
  fixture com anel longo (morte > cota, cofre fora da clareira);
  `garanteCenario` perdeu o early-return (semente do Perlin podia
  divergir no meio do run) e `info()` passou a auto-sincronizar a
  lista ativa de obstáculos.
- **Mundos vivos (Leva `mundos-vivos`, 2026-11-18)** — pedido: "Os
  mundos estão 'vazios e sem vida', não tem casa (vilas), npc's,
  animais… dá uma verificada nos presets que se enquadram". Avaliados
  oficial + comunidade e escolhidos: **Foliage** (folhagem),
  **Character & Props** (casas — nenhum dos citados tinha), **Tiny
  medieval characters** (NPCs), **Tiny animals** (animais, mesmo
  criador), **Skill Icons** (ícones), **Tiny pixel monsters**
  (ADIADA — decisão 2). Decisões do mantenedor: (1) ordem mundo →
  UI → QA/docs; (2) monstros gerados e só arquivados; (3) NPCs
  **ambiente**, sem interação; (4) vila **rara por mapa,
  colidente**. Entregue em 4 fases (`1d35a9c` cenário+vila ·
  `1353e63` vidas · `33aa3ab` ícones · `9dade27` monstros adiados):
  folhagem por tema (3 paletas × 10), vila determinística (10/10
  mapas, ≥55px, fora da zona livre), vidas com fuga (1→48px em
  0,75s, **0 abates**), 32 ícones 14×14 na aba Classe. Lições:
  busca angular em **faixa estreita morre** contra obstáculo (60/60
  rejeitadas → círculo livre); a fogueira no miolo precisou ser
  **opcional** (no anel das casas nunca achava vaga); modelo de
  grade desenha **na ordem dele** e nem respeita 4×2 (pega
  remapeia peça→skill após QA) e regenerar "melhor" pode piorar
  (ladino fusionado — mantida a original); botão de 110px não cabe
  ícone + nome longo (fonte 10→9px: pior caso 119,5px vs 116,4px de
  hoje); Chrome indisponível no ambiente — QA visual via PNGs +
  PIL (o display da sessão serviu imagem errada 2×: sempre copiar
  p/ caminho novo).
- **Correção pós-QA (mesmo dia)** — mantenedor reprovou a vila
  ("isométrica, o projeto é top-down") e as proporções dos animais
  ("coelhos/sapos/pássaros grandes; o veado ficou bom"). Correções:
  (a) vila regenerada com prompt de **fachada frontal reta, NO
  isometric perspective** (`65f61f50`) — casas 66×56 mundo; (b) campo
  **`altos`** no `prepara-cenario.js` (altura-alvo por peça, nearest,
  paralelo ao `pega`) → pássaro 14×13 · coelho 14×16 · sapo 13×11 ·
  veado mantido — sem regenerar arte (0 créditos); (c) fusão de
  fragmentos 12 → 50 (lenha da fogueira n=44); (d) asserção ≤18px na
  fumaça 20b + linha dos animais no previa-assets. **Lições**: pedir
  a VISTA de forma explícita no prompt (o preset Character & Props é
  three-quarter por padrão) e medir a proporção contra o herói
  (43px) ANTES de integrar. **Flake do CI no teste de fuga**: o
  `Math.random` da IA NÃO é semeado no harness (run = run varia) — a
  sonda `animalPerto` (mínimo global) acoplava o teste ao estado
  aleatório; corrigido com **sonda exata por id** (`Ambientais.distDe`
  + `id` no bicho) + fuga que **desliza pela parede** + até 3
  candidatos — lição: teste de comportamento nunca deve ler o mínimo
  global de entidades que você não controla.
- **Instrumento rápido de projeção matemática (2026-11-20, pedido
  explícito do mantenedor: *"testes mais rápidos que sirvam para
  projeções matemáticas"*)** — três peças, todas validadas contra
  ground truth: (1) **projeção linear** no `ritmo.js` (ondas×tempo,
  marcos ≥240min): R² 0,9999 e **erro +1,4% do real** a partir de
  16min (validada nos runs completos 3432,7min); **limite medido** =
  cega p/ parede de fim de jogo (o skill projetava vitória e estolou);
  (2) **aborto automático de estol** (`RITMO_JANELA_MIN` 600:
  dnv<0,1 + ondas<300 — exceção de chefe legítimo) → runs mortos
  cortam em minutos; (3) **`sonda-fim.js`** — herói já na reta final
  (nv = trajetória `0,9169×ondas−35,6`, gear dos drops do mapa,
  keystone) correndo a parede: **600min em ~16min**, validada 3/3
  (def vence/nv final idêntico · skill(8%) falha · sem falha). O
  loop de decisão de balance passou de 6h para 16min. Achados:
  `RITMO_SEM_PONTOS` mediu o achado do mantenedor (**sem pontos
  fecha o mapa 1 mas trava no mapa 2** — 16 mapas/10h: gestão
  importa; falta era desafio p/ quem gestiona BEM) e a sonda
  calibrou a leva `pressao-mortalidade` (6 valores × 2 builds).
- **Pressão de mortalidade: guarda = build skill · `ESC_DMG 0,055`
  (2026-11-20, mantenedor escolheu entre as opções medidas)** —
  contexto: 0-2 mortes em 59h = "jogo fácil"; **"0 mortes" deixou
  de ser alvo** e o **critério de estol formalizado** = progresso
  parado (dnv<0,1×600min · onda ≥30min · sim sem vitória), mortes =
  corroboração. **Escada na parede** provou que o **def (mono-FOR)
  não tem folga** acima de 0,037 (≥0,04 = espiral na onda 1 do mapa
  100; o produto do cliff `≤0,086` não pegou essa parede — **cliff é
  de campanha, parede é restrição própria; filtro = sonda**). A/B
  4 seeds × 600min: **0,06 reprovado** (1/4 seeds em espiral de 146
  mortes — morte −10% ouro composto fomeia aprimoramento → fraco →
  morre mais; duração +30%) · **0,055 aprovado** (4/4 = baseline,
  duração −0,4%, 3 mortes vs 0). **Emenda R-PM-3 aprovada**: referência
  da parede = **build skill** (o gerenciado da `economia-de-pontos`);
  def vira **hard mode** (estola na parede se ignora skills — dá pra
  respecar, sem soft-lock).
- **Efeitos especiais das skills estilo Vampire Survivors (spec
  `visual-skills`, 2026-11-21)** — pedido do mantenedor: *"pesquisa
  online como eles são para aplicar e deixar o game mais chamativo"*.
  Pesquisa → 5 princípios VS: **luz (aditivo) · assinatura por arma ·
  área com limite legível · flash reservado a evento grande +
  toggle · densidade escala com o poder**. Aplicado como **assinatura
  por TIPO** (6 tipos, não 32 skills): receitas novas `zona`/`onda`/
  `feixe`/`carga`/`nuvem`/`rastro` + missil de rastro denso, cada uma
  com pool+teto+`silenciar`. **Decisões**: (a) `carga` é **singleton**
  estilo `flash` (não pool — só 1 conjuração por vez, expira sozinho
  em 0,15s sem refresh); (b) escalação do `nvSkill` = **fonte única**
  `Efeitos.escala(nv)` testável em unit (`1+0,1×nv`, teto 10 = 2×),
  aplicada só a raio/altura/contagem — **nunca dano/tempo** (nv 0 =
  baseline intacta, contrato da `economia-de-pontos` preservado);
  (c) flash de nuke = `mult ≥ 2,5` **dentro do `flashTela`**
  (o gate de acessibilidade/`mudo` já existia — nada novo de opção);
  (d) zona nasce **no ponto onde o dano caiu** com lifetime 0,6s
  (não vira "dano contínuo" enganoso); (e) onda de empurrão/medo usa
  o **`alcance` real** da skill (acurado). **RNG**: mais draws nos
  efeitos deslocou a sequência — o gate 3× passou sem cair fixture
  (lição da spec: se cair, reduzir draws na receita, nunca afrouxar
  o teste). Gate 3× verde · `ritmo 60` intacto (mapa 1 em 33,0min,
  faixa 31,5/33,5) · 25 confs novas (seção 56) + 3 capturas por pool
  no `cena.js` (`capturaReceita` — o `capturaSkill` genérico salvava
  5 frames depois e perdia pools de <0,7s).

## Bloqueios

- Nenhum.

## Adiados (decisão do mantenedor)

- Nome do herói com teclado virtual no celular.
- Uso do espaço central entre painéis em telas largas.

## Preferências de fluxo

- **Push/commit de release só com aval explícito** do mantenedor.
- Toda mudança de balanceamento é **medida com `node testes/ritmo.js`**
  antes de virar commit; gate sempre `node testes/todos.js`.
- Trabalho em **fases aprovadas** pelo mantenedor (aprovação por leva).
- Docs e commits em **pt-BR**; mensagens Conventional Commits (tipo em
  minúsculo + escopo opcional; corpo/descrição em pt-BR).

## Lições

- **Estado escrito e nunca lido = campo morto** (spec
  `virada-ataque`): `h.facing` existia desde sempre (3 atribuições)
  e ninguém lia no desenho — o bug "só bate pra um lado" era um
  campo órfão, não uma lógica errada. Ao ADICIONAR estado, grep nas
  leituras na hora; ao RECEBER bug visual, procurar primeiro se o
  campo existe mas ninguém consome. Bônus: campos espelháveis testam
  bem com sonda em `info()` (vira−1/direita1 em fixtures).

- **Consolidar > duplicar** (leva visual-efeitos): o game feel vivia
  espalhado (shake/tFlash/parts/nums/vinheta no `batalha`) e o doc
  descrevia um sistema único — a migração inteira passou o gate de
  PRIMEIRA porque os contratos eram **fachadas finas**
  (`numero`/`limparEfeitos`/`qtd`) e não arrays internos. Amar
  testes a estruturas internas custaria uma refactor de 7 seções.
- **Assert de hit-stop tem que entender quantização por frame**:
  `congelar(dt)` devolve `true` no frame em que HÁ saldo mesmo que
  `dt` passe do saldo — o teste "0,03+0,03 = 0,05 → false no 2º"
  estava errado, não o código. Semântica de frame, não de relógio.
- **Animação × contrato de "está na tela"**: virar texto estático em
  datilografado derruba asserts que afirmam a linha no frame 1 (42).
  Correto = **esperar o texto aparecer com teto de frames** (não
  soltar o assert, não dormir sem teto); título/botão continuam
  imediatos para os asserts de presença ficarem no frame 1.
- **Sondas de coordenada fixa em layout que recentra** (leva
  ajustes-playtest-3): encurtar o 'Vel' recentrou o rodapé e as
  sondas fixas (`[150..610]` e `pressionar(240,356)`) caíram nos
  intervalos ` · ` (que NÃO têm retângulo de tooltip) — 2 testes
  "quebraram" sem bug nenhum. Fix: varredura fina + alvo em
  retângulo de posição fixa. **Teste que aponta um ponto deve
  varrer ou saber a geometria; nunca assumir layout centrado.**
- **Receita de doc externo × rasterizador de teste** (leva
  visual-ui): a receita "caminho + fill" faria painéis/botões
  sumirem das screenshots — o `fill()` do `cena.js` só tratava
  elipse. Antes de adotar primitiva de doc: conferir o que o
  rasterizador suporta; se faltar, **estender o rasterizador (infra)**
  em vez de rebaixar o visual.
- **`typeof` mente em Proxy**: o ctx do harness "tem" `roundRect`
  (o Proxy devolve fn genérica); só `fn.length > 0` separa o real
  (WebIDL ≥4) do fake (length 0) — probe de assinatura, não de
  existência.
- **Degradar para o comportamento antigo por CONSTRUÇÃO** (leva IA do
  herói): a evasão devolve exatamente o destino antigo quando o mapa
  está vazio (k=0 com desempate por `<` estrito) e a BT usa os gates
  numéricos de sempre — o teste novo prova o degrau ("sem influence
  map = igual") e os antigos provam a continuidade. Forma mais barata
  de mudar arquitetura sem renegociar cada assert.
- **Ler os CONTRATOS dos testes antes de projetar** (leva IA
  monstros): a seção 23 (burro `destino === null`, astuto raio exato
  11) decidiu ANTES do código onde a separação podia morar — se eu
  tivesse implementado "bonito" (separação dentro de `ia.destino`),
  teria descoberto o conflito só depois de4 asserts caírem, com a
  solução certa (camada de movimento) bem mais cara de refazer.
- **Influence map: a grade precisa ser mais fina que o fenômeno** —
  candidatos do anel ficam a ~5,7px; grade de 16px coloca 4+ candidatos
  na mesma célula e a "discriminação" vira zero.8px resolve; e o
  obstáculo não entra na grade (memo fica stale entre mapas) — consulta
  direta com o raio da entidade.

- **Mudança de layout = mapear TODOS os cliques dos testes** (leva
  árvore de skills): a coluna única → grade 2×4 quebrou 4 asserts da
  seção 25 (coordenadas antigas `y=178+i*25` caíam em linhas erradas).
  Receita: `grep -n "clique(" testes/fumaca.js` na faixa de `y`
  alterada e converter `i` → `(col=i%2, linha=floor(i/2))` — a seção
  31 (tooltip) sobreviveu por acaso (x=500 ainda caía no toggle).
- **Const de seção da fumaca não vaza para a próxima** — as seções são
  blocos `{}`; `const Cutscene = sandbox.Cutscene` numa seção não
  existe na seguinte (`ReferenceError` na 43). Usar `sandbox.X` ou
  redeclarar em cada bloco que precisar.

- **`iniciar()` dá `inv: 1` ao herói (1s de graça)** — teste que monta
  a arena logo após `setScene('jogo')` corre o risco de o **1º golpe
  cair na janela de graça** e o dano ser engolido **sem retry** (o 2º
  tiro do atirador vem a 2,2s = fora de uma espera de 120 frames).
  Flake medido na seção 41: **3 falhas em 5 runs**. Fix: rodar **≥61
  frames** antes de montar a arena — a onda 1 nasce no frame 60, então
  até lá não há combate e o `inv` decai em paz. Regra: fixture que
  depende de dano recebido precisa de frames de folga após o `iniciar`.
- **ROADMAP ambíguo: perguntar antes de codar** — "mapa do universo +
  cutscene de eventos" admitia 3 leituras diferentes (cutscene só na
  fronteira / tela própria / também eventos); uma pergunta de escopo
  com opções antes da spec evitou retrabalho de uma leva inteira.

- **Cena com backend: render de estado só muda via `enter`/`atualiza`**
  (lição da seção 35) — `Ranking.top(cb)` direto chama o callback do
  TESTE, não o da cena; para o render mostrar a nova situação é preciso
  `Game.setScene(...)` de novo. E o fake do SDK é um **thenable
  síncrono** (`{then(ok){ok(v)}}`): o harness não esvazia microtasks
  entre asserts, então `Promise` real deixaria os asserts cegos.
- Testes usam `Math.random` real: flakes raros são possíveis (já houve1
  aparente em leva de IA) — repetir a fumaça 3× antes de concluir.
- **Fixture de luta precisa fixar a agudeza**: a seção 21 flakava ~1 em
  6 porque herdava INT 50 → estados `kite/recuar` do cérebro e, sem
  regeneração, o herói fraco fugia sem atacar (1 abate/67s — trace
  diagnosticou). Luta de teste = INT 8 (burro agressivo). Achado
  correlato registrado no ROADMAP (impasse potencial de build gênia
  fraca: `recuar` não ataca e não cura).
- Coordenadas de UI viram contrato de teste (grade de abas, ×2 do
  harness): mudar layout exige atualizar `fumaca.js`/`cena.js` juntos.
- Âncoras de texto em scripts de edição de docs quebram por quebra de
  linha — conferir com `grep` antes de substituir em lote.
- **Espelho de fórmula quebra na hora** — o HP por nível estava literal
  `×4` em `status` E `statusDetalhado`; subir o slope p/ ×6 em um lugar
  só derrubou o teste Σpartes. Constantes de balanço viram fonte única
  (`HP_POR_NIVEL`) — mesmo caso dos `APR`/`MAX_UP` espelhados.
- **Run único não decide curva de progressão** — no loop da leva
  `progressao-exponencial`, uma "validação 4 runs" na verdade rodou
  constantes erradas (âncora de texto falhou e o script anterior não
  gravou) e outra config passou 1× de200min e estolou 4/4 depois. Só
  média de ≥4 runs (e conferir `grep` das constantes ANTES de rodar).
- **Fixture de luta precisa ZERAR o equip e o XP durante o loop**
  (lição da seção 27, medida com `[diag]`): o teste de "herói de vidro
  morre" deixava drops serem **auto-equipados** no meio (arma +4 → dano
  5→13) e o XP subir de nível — ele fazia farm até a onda 10 e "nunca
  morria" (`hpMin=22`, quase morreu). Congelar `p.equip`/`p.xp` a cada
  frame resolve; a mesma classe de risco vale para qualquer fixture que
  dependa de o herói NÃO fortalecer (matar rápido / cair). Correlato:
  **fixtures de mago precisam zerar INT, não FOR** (o dano escala em
  `danoMod` — zerar FOR não enfraquece o mago; as seções 6 e 16 tinham
  esse bug herdado e flakavam ~1 em 6; o baseline do HEAD flakou o
  mesmo teste, provando que não era regressão).
- **`file://` não serve p/ serviços web (CORS)** — o README manda abrir
  `index.html` direto (o jogo funciona), mas a origem `null` é recusada
  pelo Firestore: foi a causa provável do "ranking não salvando" no
  playtest. O jogo agora detecta e avisa; p/ teste local use um servidor
  estático (`python3 -m http.server`). E não rodar o gate NO MESMO bloco
  de chamadas que edita os arquivos (corrida: o teste leu o meio da
  edição e acusou falha fantasma).
- **Medir a hipótese antes de "consertar"** (leva `visual-cenario`):
  uma linha pontilhada nas screenshots foi atribuída às **flores do
  chão** (coerente com a faixa estreita do ruído) e a spec prometeu
  corrigir; a medição **refutou** — as flores já caíam espalhadas (30
  pontos soltos, medida de posição) e a linha era **texto de dano
  flutuante** (a cor casava com `#ffd866` a ~40% sobre o chão e ela
  sumiu com `Efeitos.limparEfeitos()` antes da captura: 66 px → 0 px;
  o rasterizador de teste desenha glifo como bloco). Duas ferramentas
  baratas decidiram o caso: **contar px por cor na captura** e
  **isolar a camada com um toggle** — sem elas teríamos "consertado" o
  chão sem nada quebrado, e a spec teria uma justificativa falsa.

- **"PNG corrompido" × display da tool de leitura** (leva
  `visual-heroi-spritecook`): a folha `previa-assets.png` apareceu
  como lixo (cara gigante + faixa) em 4 leituras seguidas, inclusive
  em cópia e re-encodagem — enquanto **dois decodificadores
  independentes** (parser Python feito do zero + `lerPNG`) liam os
  pixels certos (o ASCII renderizou os heróis nas células). O display
  é quem servia conteúdo errado, não o arquivo. Regra: antes de
  concluir "arquivo corrompido", validar com um decoder
  INDEPENDENTE — a concordância writer+reader próprios não prova nada
  (bug simétrico passaria) e a tool de imagem já mostrou servir tela
  errada para outros PNGs novos (verifiquei `tela-aparencia.png` por
  recorte Python antes de achar que a aba Apar não abria).

- **Detecção de punho: excluir a cara = componente do pixel de pele
  mais alto** (mesma leva) — e a mão se FRAGMENTA em blobs (o contorno
  interno do desenho quebra a conectividade: 2px + 5px), então o
  merge por proximidade de caixa (≤2px) depois de tirar a cara é o
  que faz a mão aparecer; em resolução ÷2 a mão fica <4px e some.
  Dois modos porque um só não serve: no relaxado (idle/walk) o punho
  erguido do ataque FUNDE com a cara e é excluído junto (perde-se o
  frame); no estrito (ataque) a mão na sombra fragmenta e some.
  Quando o detector erra de propósito (mão escondida atrás do corpo
  no walk), o certo é **override manual documentado** (`OVERRIDE` no
  `prepara-assets.js`) conferido no QA — não afinar o detector até
  acertar tudo.

- **`pkill -f` casa com o PRÓPRIO shell** (mesma leva): o padrão
  aparece na cmdline do comando que o executa → o shell se mata
  (SIGTERM 143) e o resto da linha não roda. Matar processo por PID
  registrado, ou usar padrão que não casar com a própria invocação.

- **Movimento e animação no MESMO fluxo de controle** (fix do cofre,
  achado no QA da leva visual): um bloco que chama `anima(walk)` sem
  `return` e é seguido de uma cadeia com `else` final chamando
  `anima(idle)` = **sobrescrita silenciosa** — o `mover()` já tinha
  rodado, então o herói DESLIZAVA em idle até o cofre. O relato do
  mantenedor ("vai para cima em linha reta fica idle") era o caminho
  RETO do cofre (`mover` direto, sem IA); a perseguição estava
  correta (verificada:61 frames andando,0 em idle — a cadeia
  `else if` é exclusiva). Lições: (a) **reproduzir antes de
  consertar** — log frame a frame de desloc × pose desenhada mostrou
  `dy=-1/-2` com `idle` em toda frame, e o A/B com o fix revertido
  provou a causalidade; (b) **não usar `return` como fix** — ele
  pularia a regeneração de 2hp/s da linha seguinte (o fix é uma
  flag); (c) a sonda `anim` em `info().heroi` viabilizou o conf que
  falhava antes ("83 em movimento,83 em idle" → "80,0"); (d) o conf
  mede o invariante **movimento ⇒ walk** (conta frames em
  deslocamento, não distância — ortogonal a obstáculo no caminho);
  (e) o bug era **pré-existente** (`732d4e7`) — as levas visuais
  só o tornaram perceptível (o walk novo contrasta mais com o idle).
