# ROADMAP

Ordem é intenção, não compromisso. Cada linha entregue vira spec/link na
feature correspondente; cada linha futura nasce aqui antes de virar spec.

## Entregue

### v0.5.0 — 2026-11-15 (ver `CHANGELOG.md`) — série visual, parte 2
- `visual-heroi-arma` — motor de cor (rampas HSL + luz única), herói
  autorado em grids de texto e armas com largura/guarda por raridade
- `visual-monstros` — mesmas rampas nas 3 formas + detalhe por
  espécie (10 espécies) · lição: partes de 1px vão após o contorno
- `visual-cenario` — árvore em camadas, pedra facetada, cofre
  redesenhado, flores em cacho · lição: medir a hipótese antes de
  consertar (era texto flutuante, não o chão)
- `preview-heroi` — prévia ao vivo do herói na aba Apar (criação e
  jogo) com ciclo idle→ataque
- `icones-itens` — 5 ícones 16×16 com acento de raridade + chip
  clicável na bolsa
- gate 708 confs · sanidade `ritmo 60`: mapa 1 em **30,3min**

### v0.4.1 — 2026-11-14 (ver `CHANGELOG.md`)
- `virada-ataque` — herói espelha o sprite/corte para o alvo
- `ajustes` — ESPERA_BASE 8→4s (mantenedor, sem medição)
- `cutscene-estetica` — caixa transparente (0,60) e sem botão
- **release v0.4.1** (tag + gh release + Pages, 2026-11-14)

### v0.4.0 — 2026-11-14 (ver `CHANGELOG.md`)
- `ranking` · `velocidade` · `ajustes` · `progressao` ·
  `gestao-atributos` (19 commits desde a v0.3.0)
- `mundos` — campanha 10×10×100, vitória no mundo 10 + modo infinito
- `monstros-novos` · `cutscenes` · `arvore-skills`
- IA: `ia-monstros` (flocking + influence map) · `ia-heroi`
  (Behavior Tree + evasão de cerco)
- série visual: `visual-ui` · `ajustes-playtest-3` ·
  `visual-cutscene` · `visual-efeitos` · `cutscene-estetica`
- **release v0.4.0** (tag + gh release + Pages, 2026-11-14)

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

0a. ✅ **`ranking-antitrampa`** *(não liberado — em `Unreleased`)* —
    só rules (jogo intocado): **score recalculado no servidor**
    (espelho exato do `scoreDe`), **teto de progressão por tempo do
    projeto** (30 + min/100 desde 2026-11-01 — recalibrar com o
    `ritmo.js` se o ritmo mudar), `at` ±24h e `nivel ≤ 9500`.
    Conf nova trava a identidade rules↔cliente · **`testes/regras.js`**
    (rede, fora do gate) sonda o que está implantado · limite
    honesto registrado: a 1ª marca por apelido é confiável (sem
    relógio por jogador — `resource` não expõe `createTime`).
0b. ✅ **`save-assinado`** *(não liberado — em `Unreleased`)* —
    **HMAC-SHA256 em JS puro** (`js/assinatura.js`; `crypto.subtle` não
    vale em `file://` e o sandbox tem whitelist — verificado contra o
    `crypto` do Node) assinando personagens **e** estado de batalha;
    adulterado/sem `_s` → **rejeitado e PRESERVADO** (nada é apagado);
    migração **sem janela** (sem marcador → reescreve assinado na
    hora); export assinado / import com aviso p/ backup antigo;
    `Salvar.rejeitados()`. **+10 confs = 719** · limite honesto: a
    chave vai no bundle (barreira p/ edição casual, não segredo) e o
    placar não depende daqui (é a leva 0a).

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
3. ✅ **`cutscenes`** — 3 frentes confirmadas: cutscene ao cruzar
   fronteira de mundo (mapa do universo + narração, 9 na campanha;
   100→101 é da vitória), cutscene nos **4 eventos** (auto-dismiss
   3,5s, teto 1) e **Mapa do Universo** como cena própria (botão na
   seleção). Batalha nunca pausa (padrão vitória). **Seção 42** ·
   gate 3× = **585 confs** · sanidade `ritmo 60`: mapa 1 em 31,5min
   (alvo intacto).
4. ✅ **`arvore-skills`** — 3 frentes confirmadas: **8 skills por
   classe** (12 novas, níveis 60/150/400), **ramos literais** (2
   variantes por skill, sidegrade obrigatório, base neutra sem
   escolha) e **loadout escalonado** 3 → 4 (nv 50) → 5 (nv 150). UI:
   grade 2×4 com botão de ramo. **Seção 43** · gate 3× = **615
   confs** · sanidade 2×2400min: **mapa 36 · nv 3247 · 1 morte**
   (faixa 29-36/2600-3300) — sem rebalance.
5. ✅ **`ia-monstros`** — **flocking + influence map**: separação
   universal (0 com 1 monstro = baseline intacta) com clamp de 12,5px +
   destino do cerco via influence map (grade 8px, 12 candidatos a
   raio 11, score = ocupação + preferência do slot, obstáculo com o
   raio da entidade). Escopo: separação universal, destino por
   astúcia. **Seção 44** (vão do cerco = 81°) · gate 3× = **631
   confs** · sanidade: mapa 1 **31,8min** + 2×2400min **mapa 36 · nv
   3216/3280** (faixa 29-36 · 2600-3300) — sem rebalance.
6. ✅ **`ia-heroi`** — **Behavior Tree** (seletor de `CAMADAS`, INT =
   profundidade com os gates de sempre) + **evasão de cerco** (destino
   de fuga por células livres — mapa vazio = destino antigo). Escopo e
   prioridade com o mantenedor: **comportamento novo > progressão**
   (maleável p/ dificuldades de endgame). **Seção 45** · gate 3× =
   **645 confs** · sanidade: mapa 1 **31,5/33,5min** + 2×2400min
   **mapa 38/36 · nv 3442/3244 · 0-3 mortes** (levemente à frente da
   faixa — sem estol, sem intervenção). **Série de 6 levas concluída.**

## Série visual (3 levas — base: `/home/thiago/Projetos/Docs/`)

7. ✅ **`visual-ui`** — paleta/primitivas com fallback, gradientes,
   cantos arredondados, sombras, CSS (moldura + halo). **Seção 46** ·
   gate 3× = **658 confs** · sanidade: A/B ritmo prova que a variação
   31→37min do mapa 1 é de SESSÃO, não da leva (antigo hoje:
   37,7/34,6min).
7b. ✅ **`ajustes-playtest-3`** — achados do playtest: **backing =
   exibição** (esc fracionário — texto nítido em qualquer escala),
   **Vel inteira** na tela, **valores da aba Stats à esquerda da
   scrollbar** (x744, trilho intacto). **Seção 47** · gate 3× =
   **664 confs** · mapa 1 **31,5min** · sondas fixas do rodapé
   viraram varredura (layout recentra).
9. ✅ **`visual-cutscene`** — letterbox (52px/0,35s), datilografado
   (55 c/s + pausa 0,8), dicas piscando, `avancar()` 3 estágios
   (clique fora do botão; `Enter`/botão intactos). **Seção 48** ·
   gate 3× = **676 confs** · mapa 1 **34,3min**.
8. ✅ **`visual-efeitos`** — `efeitos.js` reescrito como dono único:
   pools com teto, receitas com valores exatos do doc, **hit-stop**,
   shake com fórmula, flash/vinheta/perigo, 3 camadas, aura do chefe,
   números em 3 estilos (migração por fachada) e `silenciar` com
   **exceção do missil** (dano offline). **Seção 49 (18 confs)** ·
   gate 3× = **694 confs** · sanidade 2× mapa 1 **30,7/32,6min**
   (hit-stop <2%). **Série visual completa (7-9 + 7b).**
9b. ✅ **`cutscene-estetica`** — estética do original (feedback do
   mantenedor): **sem véu** (arena viva entre as barras), barras
   `#000`, caixa preta + fio dourado (duplo preenchimento) nos 2
   overlays, título único, **Espaço** avança. Gate 3× = **695
   confs** · 42/48 intactas · mapa 1 **34,0/37,4min**.
10. ✅ **`visual-heroi-arma`** —
    *"visual tosco e muito simples"* (pedido direto do mantenedor +
    pesquisa: Lospec · Slynyrd · Wikipedia). **Motor de cor**: rampas
    HSL de 4 tons com **hue-shift** + luz única topo-esquerda (o
    `shade()` só multiplicava RGB → escuros acinzentados). **Herói
    em grids de texto** (9 poses × 5 cabelos × 4 classes como
    overlay), **armas com largura** (cabo/guarda/lâmina de 2px/
    cristal) e **acento por raridade**; `lookDe` ganha `classe`/`rar`
    (derivados, save intacto) + cache key do `Anim.hero`. Grade
    20×20 intacta (âncoras/fumaca sem mudança). **Gate = 704 confs**
    (687 fumaça + 17 grade) · arte iterada nos PNGs de
    `previa.js`/`cena.js`.
11. ✅ **`visual-monstros`** —
    mesma paleta/luz do herói nas 3 formas + **detalhe por espécie**
    (3º parâmetro opcional `chave`, assinatura compatível): coroa do
    chefe, presas do Açougueiro, máscara do Gatuno, broto do
    regenerador, presas do drenador, brilho do visgo, chifres do
    atirador, listra na aranha · `Anim` ganha `chave` na cache ·
    **lição: partes de 1px vão DEPOIS do `contorna()`** (asas/orelhas/
    pernas viravam contorno e o morcego era uma cruz preta) ·
    `previa.js` com as 10 espécies.
12. ✅ **`visual-cenario`** —
    árvore (copa em 3 camadas + bojos na silhueta, tronco com lado
    claro/escuro e raiz) e pedra **facetada** com as mesmas rampas/luz
    do herói; **cofre** redesenhado (tampa em degraus, faixas de
    latão, fechadura — só `fillRect`/`strokeRect`) + screenshot novo
    `tela-cofre.png` p/ poder olhá-lo; flores em faixa larga + cacho.
    **Hipótese refutada com medição**: a "linha pontilhada" do chão
    era texto de dano flutuante (66 px → 0 px com `limparEfeitos`).
13. ✅ **`preview-heroi`** —
    prévia do herói ao vivo na aba Apar (×3 + sombra + ciclo idle/
    ataque de 4s), nos **dois contextos** (criação e jogo), mesma
    fonte do desenho da arena; caixa em `x616,y232` abaixo das 4
    linhas (contrato `(706,96)` intacto), dicas encurtadas p/ caber à
    esquerda. Sonda `Gestao.previa()` + **+2 confs = 706** ·
    screenshot novo `tela-selecao-apar.png`.
14. ✅ **`icones-itens`** —
    **5 ícones 16×16** (espada/adaga/cajado/martelo/armadura) no
    sistema de grid+rampa, acento da **raridade** passado por HEX
    (sprite não depende de itens), cache `Anim.icone`; slots com o
    ícone abrindo a linha (texto 416→442, cortes 17/13) e bolsa com
    **chip clicável** (linha 444..688, corte 33→29 — `★`/`-15HP`
    intactos). **+2 confs = 708** · screenshot `tela-itens.png` ·
    nenhum clique de teste mudou.
8. ⬜ **`visual-efeitos`** — `Docs/efeitos.md`: hit-stop, shake com
   fórmula, flash/vinheta/perigo de vida, receitas com valores
   exatos, catálogo de partículas, glow/anel cacheados, 2 camadas,
   `silenciar()`, números em 3 estilos.
9. ⬜ **`visual-cutscene`** — `Docs/cutscenes.md`: letterbox
   deslizante, datilografado, dica piscando, painel arredondado —
   **nos gatilhos atuais** (mundo/evento).

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
