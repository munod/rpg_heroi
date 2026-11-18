# Spec: Mundos vivos — cenário, vilas, NPCs e animais

Status: **concluída** (gate = `node testes/todos.js`, 5 arquivos) ·
Data: 2026-11-18 ·
Iniciativa: mantenedor — *"Vamos trabalhar os mundos. Os mundos estão
'vazios e sem vida', não tem casa (vilas), npc's, animais e etc...
Verifiquei que tem alguns presetes da comunidade no spritecook, dá uma
verifica em quais se enquadrão melhor para o projeto. Eu gostei de
alguns: 'Tiny pixel monsters', 'Tiny medieval characters' e no Oficial
do spritecook tem alguns que gostei: 'Foliage' e o 'Skill icons'."*

## Presets avaliados (listados via MCP — oficial + comunidade)

| Preset | Origem | Encaixe | Uso nesta leva |
|---|---|---|---|
| **Foliage** (`spritecook-foliage`, 128px) | oficial | ⭐⭐⭐ | R-MV-1: cobertura do solo (capim/flores/arbustos/pedrinhas) |
| **Character & Props** (`spritecook-character-props`, 64px) | oficial | ⭐⭐⭐ | R-MV-2: casas/cabanas e fogueira da vila (descoberto na análise — nenhum preset citado tem casas) |
| **Tiny medieval characters** (`6ec162d6…`, 256px 5×5 = 25) | comunidade `@brambadil` | ⭐⭐⭐ | R-MV-4: NPCs de vila |
| **Tiny animals** (`ed72f1ae…`, 64px, 4 animais × 4 direções) | comunidade `@brambadil` | ⭐⭐⭐ | R-MV-5: animais ambiente (mesmo criador dos NPCs — estilo coerente) |
| **Tiny pixel monsters** (`a5253c03…`, 32px 7×7 = 49) | comunidade `@kimo` | ⭐⭐ | R-MV-7: **gerar e arquivar** (futura leva de espécies — decisão 2) |
| **Skill Icons** (`spritecook-skill-icons`, 64px) | oficial | ⭐⭐⭐ | R-MV-6: ícones das skills na aba Classe |

Estilo: todas as gerações usam `style_asset_ids` com os sheets já
existentes do herói (`spritecook-assets.json`) — mesma paleta/traço
do jogo. Fonte em `assets/fonte/`, IDs em `spritecook-assets.json`.

## Decisões do mantenedor (respondidas na sessão)

1. **Ordem: mundo primeiro, UI depois** — cenário (foliage+vila) →
   vidas (NPCs+animais) → ícones de skill → QA/docs.
2. **Tiny pixel monsters → gerar e arquivar** para futura leva de
   novas espécies de combate (fora desta leva; nada é integrado).
3. **NPCs ambiente** — andam/flutuam na vila, sem interação
   (balão/recompensa = leva futura).
4. **Vila rara por mapa, colidente** — cluster de 2-3 casas + 1
   fogueira; casas bloqueiam como pedra.

## Correção pós-QA do mantenedor (2026-11-18)

5. **Vila em fachada FRONTAL reta** — a primeira folha (preset
   Character & Props, "front three-quarter view") saiu **isométrica**
   e "não combina com o projeto (top-down)": regenerada com prompt
   explícito de fachada reta **sem perspectiva isométrica**
   (`65f61f50`; a isométrica `ced61759` → `geracoes_substituidas`).
   Casas 33×28 → **66×56 mundo** (≈1,3× o herói). A fusão de
   fragmentos do `prepara-cenario` subiu 12 → **50** (a lenha solta
   da fogueira, n=44, precisa fundir; a menor peça real é folhagem
   com n=93).
6. **Proporções dos animais** — coelho/pássaro/sapo estavam quase
   do tamanho do herói (33×37/33×30/32×28 vs 43): campo `altos`
   no `prepara-cenario.js` (altura-alvo proporcional, nearest,
   paralelo ao `pega`) → **pássaro 14×13 · coelho 14×16 · sapo
   13×11 · veado mantido 36×42** ("o veado ficou bom"). Arte NÃO
   regenerada — só redimensionada. Asserção ≤18px na fumaça 20b e
   linha dos animais no `previa-assets`.

## Requisitos

### R-MV-1 — Folhagem por chunk (Fase 1)

- 3 conjuntos de cobertura do solo (**verde/frio/quente**), 6-8
  sprites cada (capim, flor, arbusto, pedrinha, cogumelo, galho).
- **Mapeamento por tema**: campo novo `folhagem` em cada entrada de
  `Mapas.LISTA` — verde: mundos 1/5/6 · frio: 2/8/9 · quente:
  3/4/7/10 (fonte única = `mapas.js`).
- Colocação **dentro do `chunkDe`** (bake no canvas do chão, custo
  zero por frame): sorteio POR CHUNK com o rng existente
  (`Perlin.sorteio(mapa·7919 + chunk)`), ~8 sprites/chunk,
  coordenada absoluta do Perlin para variar a densidade (padrão das
  flores pintadas).
- **Sem colisão** (não entra em `obst`); PNG ausente = não desenha
  (os dots pintados atuais continuam como fallback).
- As imagens entram na **mesma `Assets.carga(cb)`** do boot (o boot
  das cenas espera — em teste a decodificação é síncrona).

### R-MV-2 — Vila por mapa (Fase 1)

- **1 vila por mapa**, determinística (semente = nº do mapa): 2-3
  casas + 1 fogueira em cluster, centro a **200-360px do spawn**
  (ângulo sortado por mapa) — descoberta a pé, fora do anel de
  visão imediato.
- **Colidente**: peças entram no `obst` com `tipo: 'casa'`/
  `'fogueira'` (`cx/cy/r` — casa r≈16, fogueira r≈8), merge **APÓS**
  os itens de chunk em `atualizaObstAtivos` (item de chunk continua
  sendo `obst[0]` — contratos da seção 20/45 da fumaça preservados).
- **Restrições do gerador** (contratos da fumaça seção 20, medidos):
  zona livre central (`|x−192| ≥ 72 OU |y−134| ≥ 64`), **≥55px entre
  QUALQUER par** de obstáculos (vila × chunk e vila × vila), peças
  fora do `obst` ativo nunca bloqueiam (a vila só existe perto do
  spawn — merge é por mapa, lista ativa cobre 5×5 chunks).
- Desenho em `desenhaObst` via `Assets.cena(tipo)`; **sem imagem =
  a peça não nasce** (nunca parede invisível). Sombra própria no
  chão (padrão `sombra()`), y-sort intacto (entra na lista `cena`).
- `posicaoAleatoriaSegura` já consulta `colideObst` → renascimento
  não cai dentro de casa. A* / `linhaLivre` / `pintaMapa` participam
  sozinhos (leem `obst`).
- Sonda: `Batalha.info().vila` = `{x, y, casas, peças}` p/ teste.

### R-MV-3 — Pipeline de assets de cenário (Fase 1)

- PNGs versionados em `assets/cenario/`; manifesto **embutido** em
  `js/assets.js` (chave `cena`, mesma `carga` — sem fetch, file://).
- `testes/prepara-cenario.js` novo (manual, fora do gate): corta
  grades 2D e reduz (nearest) para o tamanho final de mundo.
- `testes/previa-assets.js` (no gate) ganha **seção de cenário**
  (folhagem + casas) — QA visual no gate, sem arquivo novo.
- Fallback: quem não tem PNG não desenha (nenhuma quebra de
  desenho/colisão; vila sem imagem = sem vila).

### R-MV-4 — NPCs ambiente (Fase 2)

- Módulo novo **`js/ambientais.js`** (declarado no `index.html`
  antes de `batalha.js` — o `testes/carga.js` lê a lista de lá).
- NPCs ancorados na vila do mapa: vagueio curto (~30px do ponto
  âncora), viram na direção do movimento, ciclo de vida ligado à
  lista ativa (pool com teto, só perto do herói).
- **Zero impacto em combate**: sem colisão, sem dano, sem XP, não
  entram em `inimigos`, não contam em `stats`.
- Desenho na cena com y-sort (entrando na lista `cena` como um tipo
  próprio). `Efeitos.silenciar`/modo ausência respeitado (padrão
  `voltaAusencia`).

### R-MV-5 — Animais ambiente (Fase 2)

- 4 espécies (veado/pássaro/coelho/sapo) nascendo por chunk com
  semente (mapa+chunk), pool com teto (~12 em cena).
- Vagueio lento + **fuga suave** a ~60px do herói (sempre foge, nunca
  colide, nunca bloqueia); espelhamento horizontal na direção.
- Fora do `obst`, fora do `inimigos`, sem recompensa.

### R-MV-6 — Ícones de skill (Fase 3)

- 8 ícones por classe (32 total, 1 por skill id) gerados com o
  preset **Skill Icons** (packs por classe), reduzidos p/ ~20×20.
- Botões da aba Classe ganham ícone à esquerda do texto; **retângulos
  de clique intactos** (contrato — `Gestao.dicasAtributo`/grade 2×4
  não mudam de geometria). PNG ausente = texto sozinho.

### R-MV-7 — Arquivo da grade de monstros (Fase 4)

- Grade 7×7 do preset **Tiny pixel monsters** gerada, baixada para
  `assets/fonte/` + ID em `spritecook-assets.json` + nota **"adiado —
  futura leva de espécies"**. Nenhuma integração.

### R-MV-8 — Testes, QA e docs (Fase 4)

- Fumaça: seção nova (vila existe no mapa 1 com ≥2 casas + fogueira,
  ≥55px, fora da clareira, `colideObst` verdadeiro na casa,
  determinismo vila = f(mapa), `Assets` carregou folhagem/vila,
  mapeamento `folhagem` dos 10 temas) — asserções de `tipo` da seção
  20 estendidas (`casa`/`fogueira`).
- QA visual: `previa-assets.png` (seção nova), `cena.js` regenerado,
  `JANELA=1280x400` (cópias em caminho novo — o display da sessão
  cacheia imagem).
- Docs ao fechar: AGENTS (contratos), CHANGELOG `[Unreleased]`,
  STATE, README, spec/tasks concluídos.

## Fora do escopo (deliberado)

- Interação com NPC (fala/balão/recompensa) — decisão 3, leva futura.
- Integração dos monstros gerados — decisão 2, leva futura.
- Substituir monstros procedurais, casas temáticas por mundo,
  cercas/caminhos de vila, animação de frames (v1 = sprite único +
  movimento procedural).
- **Ritmo intocado**: nada de spawn/XP/dano muda — sem novo A/B
  (`ritmo.js`) nesta leva; se qualquer alavanca medida mudar, a regra
  do AGENTS (≥4 seeds + relatório) volta a valer.

## Verificação

`node testes/todos.js` (gate, 5 arquivos) ao fim de cada fase ·
`node testes/prepara-assets.js` / `prepara-cenario.js` quando a fonte
mudar · `node testes/previa-assets.js` (folha QA) ·
`JANELA=1280x400 node testes/cena.js` (telas) · ES5 preservado em
`js/` · `node --check` em todo arquivo tocado.
