# Spec: IA do herói — Behavior Tree por camadas + evasão de cerco

Status: **concluída** (gate verde 3× = 645 confs; sanidade: mapa 1
31,5/33,5min · 2×2400 mapa 38/36 · nv 3442/3244 — sem estol, sem
intervenção) · Data: 2026-11-13 · Iniciativa: série de
implementações (6ª e última leva — ROADMAP `IA herói`, leva 2 de 2).

Pedido do mantenedor: *"Behavior Tree por camadas de prioridade (INT
controla a profundidade da árvore)"*. Escopo confirmado: **BT
estrutural com comportamento intacto + evasão de cerco** (a opção 1 do
mantenedor somada à evasão de cerco da opção 2). **Prioridade de
conflito invertida em relação às levas anteriores (decisão do
mantenedor): o comportamento novo é o objetivo e a progressão pode ser
mais maleável** — no futuro haverá níveis de dificuldade no endgame;
assim mesmo, medir sempre e intervir só se a progressão ESTOLAR.

## Contexto (estado atual medido)

- **`decideHeroi` (ia.js) é Avaliação Utilitária monolítica**: escolhe
  alvo por peso (−distância + prioridade×40×agu + ruído), calcula
  contexto (hp%, cerco num raio de 44px), aplica uma cadeia
  `if/else if` de 4 estados (**recuar → kite → combate → perseguir**,
  `espera` sem inimigos) com limiares escalados pela agudeza, aplica
  o ruído de "cambaleia" do burro e monta o destino por estado.
- **Gates de INT hoje**: `recuar` exige agu ≥ 0,45 (HP < 0,25+0,15×agu);
  `kite` exige classe à distância + agu ≥ 0,35 (histerese); demais
  estados sempre acessíveis. **Esses gates SÃO a "profundidade" que o
  ROADMAP pede** — a leva os formaliza como camadas da árvore.
- **Destino de fuga é cego**: `recuar` =90px na direção oposta ao
  centróide dos inimigos próximos; `kite` = 24px para longe do mais
  perto. **Não olha obstáculos nem a matilha** — correr para dentro de
  uma rocha ou de uma brecha ocupada é resolvido só por A* depois
  (o herói "escorrega" na colisão).
- **Influence map já existe** (leva `ia-monstros`): `IA.pintaMapa`
  repinta a ocupação por frame (grade 8px) e `IA.celulaOcup(x, y)`
  devolve a soma 3×3; `IA.celulaObst(x, y, raio)` consulta a rocha com
  o raio da entidade. **Reuso direto na evasão do herói.**
- **Ordem do loop**: `atualizar()` chama `atualizaHeroi` (que chama
  `decideHeroi`) **antes** de `atualizaInimigos` (que pinta o mapa) —
  hoje o herói leria a pintura do frame anterior. O `pintaMapa` vai
  para o **topo de `atualizar()`** (após os guards), pintura fresca
  para os dois lados.
- **Contratos de teste existentes** (seções 22/32 — contrato):
  - 22: gênio (INT 20/40) escolhe o alvo prioritário 60/60 e **recua**
    com HP baixo; burro (INT 1) quase sempre no mais perto (≤15/60) e
    **nunca recua**; `skillEfeito`, A*, agudeza/astúcia intactos.
  - 32: ranged ataca com inimigo colado; **destino de fuga sempre
    dentro do mapa** (margem 16); DES acelera o ataque.
  - Os 5 estados são lidos por `batalha.js` (`perseguir/combate` →
    segue alvo vivo; `recuar`/`kite` → movimento de fuga com
    `temEspaco`) e expostos em `info().heroi.estado/agu` — **o
    vocabulário de estados não muda**.

## Riscos

1. **Balanceamento**: a evasão de cerco melhora a sobrevivência do
   herói (menos dano recebido em aperto) → ondas mais fáceis,
   progressão mais rápida. Prioridade invertida (mantenedor): o
   comportamento novo é o objetivo; medir e **só intervir se estolar**
   (ex.: mapa 1 > ~40min, mortes em massa, estol de nível).
2. **Contratos das seções 22/32** (acima) — a refatoração tem que
   preservar gates, ruído e vocabulário **por construção** (os gates
   atuais viram os gates de profundidade da árvore).
3. **Mapa 1 frame stale / nunca pintado**: decisão direta em fixtures
   lê ocupação residual → testes chamam `IA.pintaMapa(...)` explícito
   (mesmo padrão da seção 23/44); com mapa vazio o desempate cai no
   candidato base = **comportamento idêntico ao antigo**.
4. **Perf**: `direcaoEvasao` = 12 candidatos × (soma 3×3 + consulta de
   rocha) só em estados de fuga, no tick de 0,2s — desprezível.

## Requisitos

- **R-HEROI-1 (Behavior Tree)** — `decideHeroi` vira um **seletor de
  camadas** (`IA.CAMADAS` + `IA.avaliaCamadas(ctx)`), ordem de
  prioridade:
  1. **sobrevivência** → `recuar` (gate: prof ≥ 3 && HP baixo);
  2. **posicionamento** → `kite` (gate: prof ≥ 2 && classe à
     distância && histerese de distância — a mesma de hoje);
  3. **combate** (gate: alvo no alcance);
  4. **perseguição** (folha padrão — sempre disponível).
  `espera` continua pré-raiz (sem inimigos). **Profundidade da INT** =
  `IA.profundidade(agu)`: **1** (agu < 0,35 — só camadas 3-4) · **2**
  (0,35 ≤ agu < 0,45 — + posicionamento) · **3** (agu ≥ 0,45 — árvore
  completa). Os números são exatamente os gates atuais → **comportamento
  preservado por construção**.
- **R-HEROI-2 (contrato de saída intacto)** — `ia.estado` ∈ os mesmos
  5 estados, `ia.alvo`/`ia.destino`/`ia.agu` inalterados; o **ruído de
  cambaleia** permanece idêntico (prob `(0,55−agu)×0,45`, troca
  perseguir↔combate, **nunca toca em sobrevivência**) e é um
  decorador da raiz (nó "ruído" pós-seleção). `batalha.js` não muda
  (exceto o movimento do `pintaMapa`).
- **R-HEROI-3 (evasão de cerco — comportamento novo)** —
  `IA.direcaoEvasao(h, angBase, dist)`:
  - **12 candidatos** girando a partir do ângulo base (k=0 = direção
    de sempre), todos `clampFuga` (margem 16);
  - **score** (menor vence, `<` estrito → desempate em k=0):
    `celulaOcup(ponto)` **+ 100 se `celulaObst(ponto, 6)`**;
  - **mapa vazio = score 0 em todos = k=0 = exatamente o destino
    antigo** (compatibilidade por construção);
  - `recuar` usa angBase = oposta ao centróide (ou ao alvo) a **90px**;
    `kite` = afasta do mais perto a **24px** — as bases geométricas de
    hoje, agora com "olhos".
- **R-HEROI-4 (pintura fresca)** — `IA.pintaMapa(inimigos)` sai do
  topo de `atualizaInimigos` e entra no **topo de `atualizar()`**
  (após os guards de pausa/vitória), antes de `atualizaHeroi` — o
  herói e os inimigos leem a ocupação do frame corrente.
- **R-HEROI-5 (sonda)** — `info().heroi` ganha `prof` (1-3, a
  profundidade vigente da árvore) junto de `estado`/`agu`.
- **R-HEROI-6 (testes)** — **seção 45**: estrutura (`CAMADAS` na
  ordem, `profundidade` 1/2/3 nas fronteiras 0,35/0,45); gates por
  fixture direta (burro com HP 1 nunca `recuar` nem `kite` em 60
  ticks; gênio com HP 1 `recua` já no 1º tick; ranged burro não
  `kita`, ranged gênio `kita`); evasão (mapa vazio = destino antigo
  exato; inimigo no ponto base → gira p/ célula livre; rocha no ponto
  base → evita; raio/margem mantidos); integração na arena (fugas com
  destino **fora de rocha** — amostragem na fixture da seção 32).
  **Seções 22/32 sem mudança** (contrato).
- **R-HEROI-7 (sanidade de ritmo — prioridade invertida)** — `ritmo 60`
  (mapa 1) + `ritmo 2400` **≥2 runs**, **reportar** vs banda de
  referência (mapa 29-36 · nv 2600-3300). Critério novo do
  mantenedor: **o comportamento novo é o objetivo; progressão
  maleável** (dificuldades de endgame virão). Intervir só se
  **estolar** (mapa 1 > ~40min, mortes em massa, estol de nível) — aí
  afro a evasão/camadas novas até sanear. O `ritmo.js` continua
  **suspenso como decisor de gosto**.

## Fora de escopo

- Novos estados ou mudanças no vocabulário de `ia.estado` · mudanças em
  dano/HP/velocidade/curvas · comportamento do monstro (leva 5 fechou)
  · evasão do `h.fuga` (dash de skill — direção fixa) · mudanças em
  `clampFuga`/margens · árvore para inimigos (eles ficam com a
  avaliação utilitária da leva 5) · árvore persistida/serializada ·
  debug visual da árvore na tela.

## Verificação

- **Seção 45** + reparo do que quebrar.
- `node testes/todos.js` **3×** · **sanidade `ritmo 60` + `ritmo 2400`
  ≥2 runs** (R-HEROI-7 — reportar; intervenção só em estol).
- Docs (CHANGELOG, AGENTS, STATE, ROADMAP, README) · commit · push
  só com aval.
