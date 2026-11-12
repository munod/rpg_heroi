# ROADMAP

Ordem é intenção, não compromisso. Cada linha entregue vira spec/link na
feature correspondente; cada linha futura nasce aqui antes de virar spec.

## Entregue

### v0.1.0 — 2026-11-08 (ver `CHANGELOG.md`)
- `core-idle` — núcleo idle, save/progresso, UX dos pontos, ritmo medido
- `arena-camera` — câmera, mundo 2×, renascimento aleatório
- `mapas-e-equilibrio` — 3 mapas + chefe + escala contínua de ondas
- `equipamento` — drops, auto-equip, bolsa, aba Itens
- `skills` — skills automáticas (5/classe), efeitos, mobilidade/medo,
  ataques à distância
- `responsivo-celular` — 768×432 adaptativa, toque, layout ancorado
- `mapas-procedurais` — Perlin Noise com semente do mapa
- `estatisticas` — `p.stats` + aba Stats
- `deploy-pages` — publicação automática no GitHub Pages
- `ia-tatica` — INT do herói, astúcia dos NPCs, A* sob demanda

## Próximo (candidatos a 0.2.0)

- **Gestão estratégica** (spec umbrella `gestao-estrategica`, 4 levas):
  ✅ **A `itens-afixos`** (afixos, negativos, smart-loot, deltas) ·
  ✅ **B `economia-ouro`** (ouro, venda/sucata, aprimoramento, re-roll) ·
  ✅ **C `skills-estrategicas`** (loadout 3, keystone/classe, respec) ·
  ✅ **D `lendarios-equilibrio`** (6 lendários com efeito mecânico +
  re-medição final) — **plano `gestao-estrategica` completo e
  publicado na release v0.2.0** (2026-11-08).
- **Ranking de jogadores** — *adiado pelo mantenedor até as
  estatísticas existirem* (já entregues em `estatisticas`; base `p.stats`
  pronta: nível/mapa/ondas/abates/bosses). Escopo local (heróis do
  aparelho) — sem backend.
- **Nome do herói via teclado virtual no celular** — ideia anotada na
  leva responsiva (hoje digitação física).
- **Usar melhor o espaço central entre painéis** em telas largas — ideia
  da leva de largura adaptativa (hoje fica o fundo do jogo).
- **Specs contínuas** — toda feature nova começa com
  `.specs/features/<nome>/spec.md` antes do primeiro commit.

## Concluído — v0.3.0: sistema punitivo + stats/tooltips

1. ✅ `ritmo-punitivo` — pontos 5→3, morte −5 ondas/−10% ouro, combo
   reequilibrado (HP/dano/regen), ritmo gasta ouro, alvos novos medidos
2. ✅ `eventos-aleatorios` — Açougueiro (penalidade dobrada, ouro×10,
   lendário) + Gatuno fugitivo (roubo contrariável, prioridade na IA)
3. ✅ `tooltip-infra` — tooltips (hover + long-press retido), rodapé
   segmentado com breakdown por fonte + DPS básico
4. ✅ `stats-completos` — aba Stats +7 (ouro ganho/gasto, vendas,
   sucateados, aprimoramentos, re-rolls, lendários) + tooltips de
   skill/keystone/linha de stat
5. ✅ **release v0.3.0** (tag + gh release + Pages, 2026-11-08)

## Concluído — correções de playtest (bugfixes + gestão)

1. ✅ `correcoes-ia-gestao` — 4 bugs (ranged colado, vértice de fuga,
   DES estagnada, tooltip do `−`) com causa raiz medida + checkboxes
   (fixar slot por linha, auto A+) + bloco `Base → total` na aba Stats
2. ✅ `velocidade-curva` — recarga sem piso (`35/vel`) + sub-passos ≤4px
   no `mover()` (colisão vale em qualquer velocidade)

## Concluído — ranking global (Firebase)

1. ✅ `ranking` — tela Ranking (botão na seleção) com top 10 + meu
   melhor, apelido por slug, score composto `mapa×100000 + onda×1000 +
   min(nv,999)`, envios em fecho de mapa/morte, SDK Firebase por
   lazy-load com degradação total sem config/rede; gatilhos + seção 35
   (46 confs). Setup manual do Firebase pendente com o mantenedor
   (config + regras).

## Concluído — ajustes playtest 2

1. ✅ `ajustes-playtest-2` — piso 0,08s na recarga (playtest: sem piso
   = bagunça/DPS) · cooldowns efetivos na aba Stats + rolagem · teto de
   nível 1000 (XP descartado, save 36k clamped, "MÁXIMO") · ranking
   observável (motivos/toasts/status + detecção `file://`; sonda REST
   das regras = 200) — seções 36/37

## Concluído — progressão exponencial

1. ✅ `progressao-exponencial` — custo `146×1,11^(nv−1)` + renda
   `12×1,10^onda` (tempo/nível estável) · combate reequilibrado (ESC
   1,90/0,045, ESPERA 8s, HP/nível ×6) · safeguards de save (fecha o
   83k) · `UI.abrev` na barra de XP · calibragem ~14 iterações (4
   runs/decisão, cliff HP×DMG mapeado) · sim 1500min: **nv1000 ≤25h** —
   seção 38 (19 confs)

## Série 2026-11 — em curso (ordem aprovada pelo mantenedor)

0. ✅ **`gestao-atributos`** *(leva de correção, antes dos monstros)* —
   pontos escassos (**1 a cada 3 níveis + compensação 9×**: cada decisão
   vale 9× mais) + soft caps (vel saturante com **teto 250**, regen com
   teto 500 hp/s, afixo `vel` limitado) + **Carisma vira ouro** (log) e
   **dano do clérigo**. **Gate 3× = 526 confs** · medição comparativa:
   **mesmo mapa (36) e nv com 1,1% da referência** — sem a compensação
   a medição estolou (223 mortes), com ela: 20 mortes em 40h
   (eventos) — seção 40.

1. ✅ **`mundos`** *(esta leva)* — campanha **10 mundos × 10 mapas ×
   100 ondas**, **sim completa: vitória em 222,5h** (alvo 200h ±20%),
   nv final 9.167, 65 mortes (eventos), **sem estol**; 10 temas
   autorais (fix do chão travado no tema 3 do mapa 4+), **vitória no
   mundo 10 + modo infinito** (overlay `p.vitoria`), **re-base do
   teto** (G 1,07 · H 1,064 · NIVEL_MAX 9500), respiro escalado
   `esperaOnda()` e escala de monstros (forma `'mundo'` no A/B;
   **k=0,5** — k=1 estolou o mundo 3 em 2/2 runs, k=0 saudável 3/3) —
   spec `.specs/features/mundos/`, seções 36-39 (516 confs).
2. ✅ **`monstros-novos`** — 3 espécies com skill própria (**atirador**
   com ataque à distância · **regenerador** · **drenador**) como raro
   dos mundos 5-10 (**comum intacto**) + **2 eventos** (Enxame com
   pressão/paga e Cofre Abandonado, o 1º evento "bom"). **Seção 41** ·
   gate 3× = 548 confs · sanidade medida (240/480min idênticos à
   referência).
3. ⬜ **Cutscenes entre mundos** — mapa do universo com os 10 mundos +
   cutscene de eventos.
4. ⬜ **Árvore de skills maior** — o jogador escolhe quais usar
   (amplia o loadout de 3).
5. ⬜ **IA monstros** (leva 1 de 2) — Flocking + influence map
   (matilha que cerca; resolve as ondas ince fáceis).
6. ⬜ **IA herói** (leva 2 de 2) — Behavior Tree por camadas de
   prioridade (INT controla a profundidade da árvore).

## Backlog de ideias (sem compromisso)

- Mais mapas/temas no ciclo infinito com mecânicas próprias.
- Novas skills por classe (ciclo de balanceamento medido).
- Inimigos à distância em mapas profundos (exige re-medir ritmo).
- Decompor `js/batalha.js` (1445 linhas) em módulos menores — dívida
  registrada em `.specs/codebase/CONCERNS.md`.
- **Regeneração fora de combate ou teto no `recuar`** — impasse raro
  descoberto pelo flake da seção 21: build gênia (INT alta) fraca em
  dano entra em `recuar` permanente (não ataca, não se cura fora do
  clérigo) e a progressão trava. Candeia do IA; mexe no ritmo (medir).
- Ajustes finos de IA (novos estados, memória maior de perseguição).
