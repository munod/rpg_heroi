# Changelog

Todas as mudanças notáveis deste projeto são documentadas aqui.
Formato [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) ·
Versionamento [Semantic Versioning](https://semver.org/lang/pt-BR/) em
**0.x** — política completa em `.specs/project/VERSIONING.md`.

As linhas citam os commits (`sha`) e a rastreabilidade requisito→commit
vive em `.specs/features/`.

## [Unreleased]

### Added

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

[Unreleased]: https://github.com/munod/rpg_heroi/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/munod/rpg_heroi/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/munod/rpg_heroi/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/munod/rpg_heroi/releases/tag/v0.1.0
