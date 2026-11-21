# Spec: Visual skills — assinatura por tipo estilo Vampire Survivors

Status: **em execução (emenda pós-feedback)** · leva original concluída
(gate 3× = 694 + 25 confs · `ritmo 60` intacto mapa 1 em 33,0min) mas
**direção rejeitada pelo mantenedor** (círculo gigante sem identidade)
→ ver "Ajuste pós-avaliação" ao final (batch área → QA → batch resto) ·
Data: 2026-11-21 · Iniciativa: mantenedor
(pedido: *"trabalhar nos efeitos especiais das skills. A base de
efeitos visuais é o Vampire Survivors. Pesquisa online como eles são
para que possamos aplicar esses efeitos e deixar o game mais chamativo
visualmente"*).

## Contexto (pesquisa VS + estado atual medido)

**Pesquisa (Game Design Lab/teemo.dev, wiki/modding do VS, entrevistas
do criador)** — o que o VS faz:

1. **Camada aditiva** — partículas/projéteis/raios com blending
   aditivo: sobrepostos clareiam em branco, leem como "luz" sobre
   sprites pixel-art chapados (Holy Wand azul, rastro de fogo).
2. **Assinatura única por arma** — cada arma tem forma própria
   (chicote = arco, Bible = livros girando, Garlic = aura circular);
   o jogador parseia cooldowns sobrepostos pela forma.
3. **Área com limite legível** — aura do Garlic = círculo plano
   semitransparente (o raio de dano é visível no meio da briga);
   Santa Water deixa poças no chão.
4. **Flash de tela reservado** — flash cheio só em evento grande
   (level-up/wipe); golpe pesado faz o inimigo piscar; toggle de
   acessibilidade ("Flashing VFX") em tudo.
5. **Escalação** — a densidade de efeito cresce com o poder (upar
   arma = efeito maior).

**Estado atual (`js/efeitos.js` + `js/batalha.js`)** — a spec
`visual-efeitos` entregou pools/receitas/game feel, mas as skills
reusam receitas genéricas: **todo nuke é o mesmo missil miúdo, toda
cura é o mesmo halo, a varredura é só o arco** — mago/clérigo/guerreiro
parecem iguais; `nvSkill` (nível investido = 2º poço de pontos) só
muda número, nunca o visual; nuke pesado não sinaliza em tela.

## Decisões de escopo

1. **Visual puro** — zero mudança de dano/curvas/timing (hit-stop
   intocado). Risco de RNG: mais `Math.random` nos efeitos desloca a
   sequência de runs — gate 3× + `ritmo 60` 1× só para sanidade.
2. **Assinatura por TIPO de skill** (area/nuke/cura/veneno/
   mobilidade/medo), não por skill individual — 6 tipos × 4 classes
   sem virar 32 receitas.
3. **Escalação `nvSkill`** no tamanho/contagem, fórmula mora em
   `Efeitos.escala(nv)` (fonte única testável): `1 + 0,1 × nv` com
   teto do próprio `SKILL_NV_MAX` (10 → 2×).
4. **Flash de nuke pesado** (`mult ≥ 2,5`) na cor da skill, sempre
   atrás do gate já existente `Opcoes.liga('flash')` (padrão VS:
   flash reservado a evento grande + acessibilidade).
5. **Carga do nuke acompanha o herói** — singleton estilo `flash`
   atualizado por frame na janela do timer (não pool com posição
   fixa: o herói anda durante a conjuração).

## Riscos

1. **RNG extra** — fixtures da fumaca (seção 16) são sensíveis a
   sequência. Mitigação: draws baratos, rodar o gate 3×; se cair
   fixture, avaliar reduzir draws, nunca "consertar" o teste.
2. **Pools novos × densidade** — centenas de inimigos. Mitigação:
   tetos (`limitar`) como os atuais; singleton para `carga`.
3. **Rasterizador** — só primitivas suportadas (`fillRect`,
   `ellipse+fill`, `drawImage`+`globalAlpha`); **borda de zona via
   `anelSprite` escalado** (como `desenhaAneis`), nunca `stroke()` de
   elipse (no-op no harness).
4. **Zona enganosa** — parecer "dano contínuo" sem ser. Mitigação:
   lifetime curto (0,6s) e nasce onde o dano REALMENTE caiu (chegada
   do missil).

## Requisitos

- **R-VS-1 (receitas novas em `efeitos.js`)** — cada uma com
  pool+teto+`silenciar`+`limpar`+`qtd`+`info()` como os atuais:
  - `zona(x, y, r, cor, dur)` — círculo no chão: fill elipse alpha
    baixo + borda por `anelSprite` escalado, pulso de alpha;
    desenhada em `desenharBaixo`. Pool `zonas` teto **10**.
  - `onda(x, y, r0, r1, cor)` — disco expandindo (ease-out como o
    `anel`) com borda, alpha caindo até sumir; `desenharBaixo`.
    Pool `ondas` teto **16**.
  - `feixe(x, y, cor, alt)` — pilar vertical (3 camadas de
    `fillRect`: halo alpha baixo + miolo branco + glow na base);
    `desenharTopo` (aditivo). Pool `feixes` teto **6**.
  - `carga(x, y, cor, prog)` — **singleton** (estilo `flash`): glow
    que cresce com `prog` + anel que contrai; some se não atualizar
    em 0,15s. Sonda `info().carga`.
  - `nuvem(x, y, cor, n)` — motes subindo (bubbles) — fachada do
    `motePart` hoje interno.
  - `rastro(x0, y0, x1, y1, cor, n)` — N glows ao longo da linha
    (fantasma origem→destino).
  - **missil com rastro denso** — 2 partículas/frame (era 1 com
    p=0,9), dispersão menor e `dur` maior → rastro longo estilo
    Holy Wand.
  - `Efeitos.escala(nv)` = `1 + 0,1 × min(nv, 10)` (fonte única da
    escalação visual; `nv` ausente = 1).
- **R-VS-2 (assinatura por tipo em `batalha.js`)** —
  - `area` (varredura) → `onda` 360° no chão (raio 200×esc = cobre a
    janela vertical; acurado: acerta todos) + corte existente.
  - `nuke` (conjuraNuke) → `carga` na janela final do timer
    (`st.t ≤ 0,35s`, só com alvo) → missil de rastro longo →
    `zona` temporária no ponto de chegada + `impacto`.
  - `cura` → `feixe` + motes existentes.
  - `veneno` (aplicaVeneno) → `nuvem` (bolhas subindo) no alvo.
  - `mobilidade` → `rastro` origem→destino no blink e na esquiva;
    `empurra` → `onda` de poeira no chão (raio = `alcance` real).
  - `medo` → `onda` expansiva roxa até o `alcance` real (acurado).
- **R-VS-3 (escalação nvSkill)** — `esc = Efeitos.escala(mg.nvSkill)`
  aplicado a raio/altura/contagem do efeito em TODOS os call sites
  acima (nunca a dano/tempo). `nv 0` = idêntico hoje (baseline
  intacta); `nv 10` = 2× o tamanho.
- **R-VS-4 (flash de nuke pesado)** — no impacto do missil, `mult ≥
  2,5` → `Efeitos.flashTela(mg.cor, 0,18, 0,2)` (já gateado por
  `Opcoes.liga('flash')` e `mudo`).
- **R-VS-5 (testes — seção 56 da fumaca)** — tetos dos pools novos;
  `silenciar`/`limpar` zeram tudo (contratos 49 intactos); receitas
  gastam o pool certo; `carga` some sem refresh; `escala(0)===1` e
  `escala(10)===2`; integracionais: varredura → `ondas > 0`, meteoro
  (mult 3,0) → flash na cor da skill + `zonas > 0`, bola de fogo
  (mult 1,8) → **sem** flash na cor da skill.
- **R-VS-6 (QA visual)** — `cena.js` regenera `tela-skill-*.png` no
  gate; QA humano no navegador (Ctrl+Shift+R) conferindo assinaturas.

## Fora de escopo

- Mudança de dano/curvas/timing/hit-stop · som · WebGL · nova opção
  de UI (o gate de flash usa `Opcoes` existente) · efeito por skill
  individual (32 receitas) · aura persistente tipo Garlic com dano
  contínuo (mecânica nova) · reequilíbrio de ritmo.

## Verificação

- Seção 56 + reparo do que quebrar · `node testes/todos.js` **3×** ·
  `ritmo 60` **1×** só para sanidade (visual puro — esperado intacto
  vs o registro corrente do STATE) · QA humano nos efeitos.
- Docs (CHANGELOG, AGENTS, STATE, ROADMAP) · commits Conventional em
  pt-BR · **push por último** (decisão do mantenedor).

## Ajuste pós-avaliação (feedback do mantenedor, pré-push)

**Rejeição**: *"Não gostei esse círculo gigante. Ex: Rajada arcana
deveria ser algo como tiros, talvez para todos os lados no varredura.
Cada skill deveria ter seu próprio efeito e sub-efeitos dos seus
ramos."* — a direção **por tipo** (6 assinaturas p/ 32 skills) era
coarse demais: toda `area` saiu igual (a `onda` de raio 200 da
varredura = meia tela lavada, sem identidade) e os ramos só mudavam
números.

**Decisões da emenda** (mantém: visual puro, escala `nvSkill`, gates
`Opcoes`, pools+teto+`silenciar`, primitivas do rasterizador, lição
de RNG; **reverte** "efeito por skill individual" do fora de escopo):

1. **Identidade mora nos dados** — campo `vfx` em cada skill **e em
   cada ramo** (`skills.js`). `comRamo` mescla `vfx` (ramo vence por
   chave; sem ramo = base intacta, contrato "base neutra" preservado)
   → no call site `mg.vfx` já vem com o ramo escolhido.
2. **Dispatch por `vfx.tipo`** em `batalha.js` (não por id de skill):
   `efeitoArea(mg, esc)` etc. com `switch` + fallback seguro (corte,
   sem círculo) p/ skill futura sem `vfx`. `mg.vfx` é read-only
   (referência compartilhada da `LISTA`). `efeitos.js` continua sem
   conhecimento de skills — só receitas.
3. **A `onda` r200 morre** — `onda` só onde é semântica: empurrão e
   medo (raio = `alcance` real, acurado) e terremoto (moderada, junto
   da fissura).
4. **Ramos ganham `vfx` explícito** (override por chave, 64 ramos no
   total) — não derivado dos mods (implícito/difícil de tunar).

**Faseamento** (decisão do mantenedor): **batch `area` primeiro**
(com QA/screenshots validando a direção) → depois o resto na mesma
leva.

### Requisitos da emenda

- **R-VS-7 (batch área)** — `vfx` nas 7 skills `area` + seus 14
  ramos; 5 receitas novas em `efeitos.js`: `tiro` (projétil reto com
  rastro, partícula `tiro`), `chuva` (cai do teto com estilhaço,
  partícula `cai`), `pilares` (N `feixe` com `atraso` escalonado),
  `giro` (arcos rotativos, extende o pool `arcos`), `fissura` (pool
  `fissuras` teto 8, geometria pré-calculada no spawn) +
  `faiscaMuita` com `ang`/`abertura` opcionais (default = círculo
  total, chamadores intactos). Sondas novas: `tiros`, `cais`,
  `fissuras`, `giros`. Mapeamento: Golpe Embravecido `crescente` ·
  Terremoto `fissura` (+ onda moderada 140) · Fúria `giro` · Nova
  Arcana `estrela` (receitas existentes) · **Rajada `radial` (tiros p/
  todos os lados)** · Chuva de Adagas `chuva` · Julgamento `pilares`.
- **R-VS-8 (batch resto)** — nukes: `vfx = {trilha, impacto}` (estilo
  do rastro do missil + receita de impacto na chegada; **Adaga Gêmea =
  2º missil decorativo sem callback**, dano continua no missil real) ·
  cura: `feixe`/`escudo`/`halo` (composições) · medo: onda com raio =
  `alcance` sempre + extras (anéis, motes) · veneno/mobilidade: params
  `n`/`esc` · `vfx` nos 50 ramos restantes · conf "32/32 skills e
  64/64 ramos com `vfx`".
- **R-VS-9 (verificação da emenda)** — 43: skills `area` + ramos têm
  `vfx`, ramo sobrepõe só a chave dele, sem ramo = base intacta · 56:
  terremoto → `fissuras` + `ondaR 140` (nv10 → 280, escala mantida) ·
  rajada → `tiros` · chuva → `cais` · unitários das receitas (pool,
  silenciar, draw) · seção 56 do batch resto: 1-2 representativos por
  tipo + "32/32 e 64/64 com `vfx`" · `cena.js`: captura da onda migra
  p/ fixture do terremoto + `tela-skill-rajada.png`. Gate 3× +
  `ritmo 60` + QA navegador por batch.

**Timing inalterado** (regra da emenda): origem/destino do missil não
mudam (senão o tempo de voo muda); missil decorativo da Gêmea não tem
callback; nenhuma receita nova chama `parar`/`sacudir` além dos
existentes.

**Commits**: emenda por cima dos 4 commits locais não-pushados
(precendente `visual-heroi-spritecook`); entrada do CHANGELOG
`[Unreleased]` reescrita antes do push.
