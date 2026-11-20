# Spec: Economia de pontos — respec pago, retornos decrescentes e nível de skill

Status: **em execução** · Data: 2026-11-18 · Iniciativa: mantenedor
(reclamação: *"o jogador nem se preocupa em distribuir os pontos — clica
no multiplicador e vai colocando; os pontos perdem o peso de decisão"*).

Decisões do usuário (fechadas na conversa):
- **Direção A + D**: retornos decrescentes nos atributos + respec pago
- **Taxa do respec**: **% do ouro atual** (escala sozinha: simbólico no
  early, com peso no late inflado — sink natural)
- **Moeda das skills**: **pontos de atributo** (segundo poço de gasto —
  não XP, que é auto-consumido pelo loop de nível)
- **Escopo**: spec única cobrindo as 3 fases (D → A → S), um A/B final

## Contexto (diagnóstico medido)

- A progressão é **exponencial por design** (spec
  `progressao-exponencial`: a economia 100% linear ESTOLOU — espiral de
  mortes, mapa 3 parado) → 10.000 ondas ÷ ~1,1 onda/nível ≈ **9.150
  níveis** → **~9.150 pontos de atributo** pra distribuir.
- O poder do herói é **linear** (× escala inimiga linear = invariante
  anti-estol). A exponencial é só a régua de ritmo — mas ela cospe
  milhares de pontos, e **milhares de pontos = cada ponto vira ruído**.
- Quatro causas do "sem peso": (1) volume; (2) retorno **linear sem
  ponto de parada** acima da base (`PONTO_MULT 3×` — crit 45 e vel 250
  são as exceções com teto); (3) **respec grátis e instantâneo** (`−`
  devolve sem custo); (4) MAX/×50 remove até o atrito físico.
- Skills hoje: 8/classe desbloqueiam **por nível** (5…400), loadout 3-5,
  ramos 2 vias — **nenhum investimento**: valores fixos pra sempre.

## Requisitos

### R-EDP-1 — Respec pago (% do ouro atual)

- `Gestao.aplicar(dir < 0)` passa a **custar ouro por ponto devolvido**:
  `custo = max(RESPEC_PISO, ceil(ouro × RESPEC_PCT))` — `RESPEC_PCT =
  0,01` (1%) e `RESPEC_PISO = 5` em `personagem.js` (fonte única,
  exportados — mesmo padrão de `KEY_CUSTO`/`KEY_RESPEC`).
- O custo é computado **uma vez por chamada** de `aplicar` (fixo durante
  o laço — sem drift) e a guarda `p.ouro < custo → return` **nunca
  deixa o saldo negativo**: sem ouro suficiente o ponto **não devolve**.
- `stats.ouroGasto` incrementa (contador de stats existe).
- Tooltip do `−` mostra o custo atual (`dicasAtributo` ganha linha
  *"Respec custa N de ouro por ponto"*).
- MAX no `−` (laço infinito) para **na guarda de ouro** ou no piso do
  atributo — nunca gasta mais do que tem.

### R-EDP-2 — Retornos decrescentes (soft cap no atributo)

- `ATRIB_LIM = 3500` (pontos investidos ACIMA da base) em
  `personagem.js` (exportado — UI lê).
- **Fonte única nova** `valorInvestido(investido, porPonto)`:
  - `investido ≤ ATRIB_LIM` → **idêntico ao atual**
    (`investido × porPonto × PONTO_MULT`) — baseline intacta (fixtures
    nv1, builds espalhadas ~1.830/atributo na campanha, testes com
    atributos < 3.500);
  - acima → `ATRIB_LIM × porPonto × PONTO_MULT + exc × porPonto ×
    mult(exc)` com `mult(exc) = 1 + (PONTO_MULT − 1) × ATRIB_LIM /
    (ATRIB_LIM + exc)` — decai **suave de 3× até piso 1×** (k = 1,
    contínuo no limiar).
- `ganhoAtributo` passa a usar a helper; `statusDetalhado` espelha com
  a **mesma helper** (`danoInv`/`hpInv` — o espelho do crítico já chama
  `ganhoAtributo`) → **Σpartes segue fechando** (contrato do rodapé).
- `Gestao.dicasAtributo`: linha de aviso **quando `investido > ATRIB_LIM`**
  — *"acima de 3.500: retornos reduzidos"* (padrão dos clamps).
- **Por que não estola por construção**: mono-stat passa do limiar ~2/3
  da campanha e perde força; build espalhada nunca cruza → poder total
  segue linear × linear. O A/B confirma (R-EDP-4).

### R-EDP-3 — Nível de skill com pontos de atributo

- **Estado**: `p.skillNv = {skillId: nv}` · `novo()` → `null` ·
  `normalizaSkillNv` (padrão `normalizaRamos`: objeto, chaves string
  ≤24, valores int `0..SKILL_NV_MAX`, teto 32 entradas, lixo descartado).
- **Constantes espelhadas** (padrão `normalizaLoadout`/`LIMITE`):
  `SKILL_NV_MAX = 10` em `personagem.js` (save) **e** em `skills.js`
  (UI/combate) — comentário de espelho nos dois.
- **Custo crescente**: `Skills.custoNivel(nv)` = custo para ir de `nv`
  para `nv+1` = `Math.round(10 × 1,5^(nv−1))` → 10, 15, 23, 34, 51, 76,
  114, 171, 256, 384 (**1.138 pontos** pra zerar uma skill ≈ 12,4% da
  campanha; as 8 zeradas ≈ 99,5% dos pontos — *profundo vs largo* é
  escolha real).
- **Compra**: `Skills.sobe(p, id, n)` gasta `custoNivel` por nível,
  guarda `pontos ≥ custo` e `nv < SKILL_NV_MAX` (compra parcial — mesmo
  espírito das guardas de `aplicar`).
- **Poder**: `Skills.aplicaNivel(sk, nv)` devolve cópia com campos de
  **PODER** × `1 + 0,25 × nv` (`mult, pct, dps, impulso, dur, alcance`) —
  **buff pós-A/B**: com 0,08 o pivô extremo estolou (67% do dps do
  mono-FOR); 0,25 compensa a base de dano dividida (skills escalam
  com `stats.dano`);
  campos de **frequência/gatilho intactos** (`aCada, intervalo, chance,
  gatilho`). **Identidade quando `nv = 0`** — quem não investe tem
  poder **exatamente** o medido (baseline intacta, padrão "base neutra"
  do ramo).
- **Aplicação (fonte única)**: em `Skills.carregadas(p)` **depois** do
  `comRamo` — a batalha continua lendo campos e nem sabe que mudou;
  `skillsVigentes` já é recomputado por frame (muda em combate ao vivo).
- `Skills.dicas` ganha 3º parâmetro opcional `nvSkill` → linha
  *"Nível X: +Y% de poder · custo N"* (sem nv = linhas de hoje).
- **UI (aba Classe)**: controle segmentado **[Ramo][Nível]** no
  cabeçalho (640,154,56,20) e (700,154,56,20) — escolhe a função do
  **3º botão da grade**; cabeçalho esquerdo absorve a contagem
  (`Skills ativas (máx 5) 2/5` — mantém o substring `máx 5`,
  contrato da seção 43).
  - **modo padrão `'ramo'`** → contratos de clique existentes intactos;
  - modo `'nível'`: 3º botão vira **`+custo`** — `disabled` quando
    skill fechada / sem pontos / nv no teto; clique →
    `Skills.sobe(p, id, passo)` (**aproveita o multiplicador**
    ×1/×5/×50/MAX — MAX = "maxar a skill de uma vez") +
    `Gravacao.msg` de feedback; dica mostra nv atual → próximo, custo,
    +25% e o passo ativo.

### R-EDP-4 — Medição (A/B obrigatório — alavanca medida)

- **`ritmo.js` default INTACTO** (mono-FOR, referência estável) — é o
  **pior caso** do R-EDP-2: se o mono-stat decaindo passa, builds
  gerenciadas passam *a fortiori*.
- **`RITMO_SKILL=1` (env)**: investidor novo do simulador — respeita o
  limiar (FOR até a base + `ATRIB_LIM`) e desbota o excedente em
  **níveis de skill** (skill mais barata não-máxima) — modelo do
  jogador que gerencia A+S juntos.
- **A/B ≥4 seeds** (240min) + **sim completa** (13500min) vs a
  referência **pós-`mundo-fullscreen`** (nv10 5,8min · keystone ~15min ·
  15min = nv 31/onda 45 · @240min mapa 8 / nv 664 / atraso ~20% /
  0 mortes) e o ground truth completo da própria leva (abaixo).
- **Critério de aceite**: sem estol (4/4) · duração/marcos na faixa ·
  ttk/kpm sanos. Se estolar → sobe `ATRIB_LIM` ou suaviza `k`
  (calibragem, o instrumento existe).

## Emenda: instrumento rápido + critério de estol (2026-11-20)

Decisão do mantenedor: *"precisamos de testes mais rápidos que sirvam
para projeções matemáticas"* + *"mortes têm que fazer parte do jogo
[...] o jogo está muito fácil e não jogar parece mais compensador"*.

### Instrumento rápido (projeção matemática — minutos, não horas)

1. **Projeção linear no `ritmo.js`** — regressão ondas×tempo
   (marcos ≥240min) → `ondasPorMin`, `R²` e **vitória projetada**.
   **Validada contra os runs completos**: DEF projetado 3396min vs
   real 3433 = **−1,1%** · BASE 3580 vs 3566 = **+0,4%**. Serve p/
   decisões de ritmo/duração em minutos.
   **Limite medido**: cega p/ parede de fim de jogo — a via skill
   projetava vitória e estolou no mapa 100.
2. **Aborto automático de estol** no `ritmo.js` (`RITMO_JANELA_MIN`,
   padrão 600): janela sem progresso (dnv < 0,1 **E** ondas < 300 —
   piso saudável ~2,4) → corta o run e grava `estol` no JSON.
   Exceção: janela toda na onda 100 com poucas mortes = chefe
   legítimo. Runs vencedores nunca disparam (abortam só no fim).
3. **`testes/sonda-fim.js`** — monta o herói **já na reta final**
   (nv = trajetória medida `0,9169×ondas − 35,6`, gear dos drops do
   próprio mapa + teto8, keystone, loadout automático) e corre até a
   parede: **600min em ~16min de parede**. Builds: `def|skill|sem`.
   **Validação**: `def` venceu (41,4min · nv final 9171 = idêntico ao
   run completo) — `skill` e `sem` em curso p/ fechar o ground truth.
4. `RITMO_SEM_PONTOS=1` — diagnóstico "sem distribuir" (L2).

### Critério de estol formalizado (substitui "quantas mortes?")

**Estol = progresso parado** (mortes são MECANISMO/sintoma, não o
critério — alvo antigo de mortes já foi rebaixado a sintoma no
`progressao-exponencial`):

| Critério | Limiar |
|---|---|
| Estol de nível | `dnv < 0,1 nv/min` sustentado ≥ **600min** (caso mapa 97: dnv0) |
| Estol de onda/mapa | mesma onda **≥30min** (definição original) · mapa 1 **>40min** (porto seguro do mantenedor) |
| Sim completa | **sem vitória** em 13500min |

**Mortes = corroboração**: espiral confirmada quando mortes em taxa
alta (≥10/h) **E** um critério de progresso zerado. Morte isolada na
fronteira/chefe com `dnv` plano = **pressão saudável — não é estol**.
Meta nova de mortes (emenda do mantenedor): **"0 mortes" deixa de ser
alvo** — mortes na fronteira são pressão legítima que motiva
gerenciamento; **estol continua proibido**.

### Ground truth da leva (seed 1, mesma máquina)

| Via | Vitória | Mortes | Estol |
|---|---|---|---|
| BASE (`5315631`) | **59,4h** | 0 | não |
| DEF (soft cap, mono-FOR) | **57,2h** (−3,7%) | 2 | não |
| SKILL (gerente A+S) | **falhou** — parede do mapa 100 (dnv0 de 4200→10800min) | 6.707+ | **sim** |

A/B curto (4 seeds × 240min) ✅ idêntico à referência (@240: mapa 8,0
/ nv 664,0 / 0 mortes). A via skill é a pendência: sonda diagnóstica
em curso p/ decidir buff de skill vs estratégia do investidor.

## Fora do escopo (deliberado)

- **Não** mexe em XP, curvas de nível, `NIVEL_MAX` nem ritmo de níveis
  (o estudo dos números astronômicos de XP é leva separada).
- MAX/×50 permanece — com 2 poços ele vira *"apostar tudo"*, que é
  decisão com peso.
- Skills continuam **100% automáticas** (promessa do README) — investir
  é decisão fora de combate.
- Nenhuma moeda nova (nada de "ponto de skill" separado).

## Verificação

`node testes/todos.js` (gate, 5 arquivos) ao fim de **cada fase** ·
fumaça **seção 55** (economia de pontos: respec, soft cap, skillNv) ·
`node testes/ritmo.js` (A/B do R-EDP-4) · `node --check` em todo arquivo
tocado · **ES5 preservado em `js/`** · QA visual da aba Classe
(`JANELA=1280x400 node testes/cena.js`) · push só com aval do
mantenedor.
