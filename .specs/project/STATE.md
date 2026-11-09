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
  **teto de nível 1000** (pesquisa: Idle Heroes Saga/Fangclash capam em
  1000; XP no cap é DESCARTADO — banco escondido confunde o jogador;
  save de nv 36 mil clamped na leitura, atributos preservados) ·
  **ranking NUNCA silencioso** (sonda REST provou regras OK — escrita
  válida 200 / inválida 403; o bug era observabilidade: `ultimoEnvio`
  com motivo + toasts + status na cena, e detecção de `file://`).
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
- **`file://` não serve p/ serviços web (CORS)** — o README manda abrir
  `index.html` direto (o jogo funciona), mas a origem `null` é recusada
  pelo Firestore: foi a causa provável do "ranking não salvando" no
  playtest. O jogo agora detecta e avisa; p/ teste local use um servidor
  estático (`python3 -m http.server`). E não rodar o gate NO MESMO bloco
  de chamadas que edita os arquivos (corrida: o teste leu o meio da
  edição e acusou falha fantasma).
