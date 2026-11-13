# Spec: IA de monstros — flocking (separação) e influence map

Status: **concluída** (gate verde 3× = 631 confs; sanidade: mapa 1
31,8min · 2×2400min mapa 36/nv 3216-3280 na faixa) · Data: 2026-11-13 · Iniciativa: série de
implementações (6ª leva — ROADMAP `IA monstros`, leva 1 de 2).

Pedido do mantenedor: *"flocking + influence map (matilha que cerca;
resolve as ondas ainda fáceis)"*. Escopo confirmado: **separação
universal** (todos os monstros) + **destino via influence map com
força escalada pela astúcia**; prioridade em conflito = **caber na
medição** (se estourar a faixa, afro os novos mecanismos até caber).

## Contexto (estado atual medido)

- **`resolve()` só trata bordas e obstáculos — NÃO há separação entre
  monstros**: dois monstros na mesma direção chegam ao herói e
  **se empilham no mesmo ponto** (corpos sobrepostos, um golpe do
  herói pega os dois, o "cerco" vira monte).
- **Cerco = 6 slots fixos** (`decideInimigo`, ast ≥0,35): ângulo
  `(slot%6)×60° + jitter`, raio 11px. Problemas medidos no código:
  slot é **sorteado** (`random×6`) → 3 monstros podem cair todos do
  mesmo lado; **7+ monstros colidem em slot** (`slot%6` repete);
  o ponto pode cair **dentro de um obstáculo** (o monstro gruda na
  borda tentando alcançar um ponto inalcançável — sem A*, pois a reta
  "está livre" até o ponto dentro da rocha).
- **Burros (ast <0,35)** vão na linha reta no herói exato → fila +
  monte. O early game (mapas 1-3) é exatamente isso.
- **Contratos de teste existentes** (seção 23): burro →
  `ia.destino === null`; astuto → raio **exato 11px**
  (`|raio−11| < 0,01`); dois inimigos → destinos distintos;
  antecipação/ingênuo intactos. A separação **não pode entrar em
  `ia.destino`** (quebraria o `null` dos burros) — vai na camada de
  movimento (`alvoX/alvoY` em `atualizaInimigos`).
- **Geometria reusada**: a IA já tem grade 16px (24×17 = 408 células)
  para o A* — o mapa de influência usa a mesma grade.

## Riscos

1. **Balanceamento**: cercar melhor = monstros simultâneos em
   alcance = ondas mais duras → mortes sobem → progressão desacelera.
   Critérios duros: **mapa 1 fechado em 31-33min** (ritmo 60) e
   **banda de 2400min: mapa 29-36 · nv 2600-3300** (≥2 runs).
2. **Contratos da seção 23** (acima) — a integração tem que preservar
   `destino null` (burro) e raio 11 (astuto) **mesmo com o mapa
   pintado**.
3. **Perf**: `pintaMapa` por frame = zerar 408 + pintar N (≤23) —
   desprezível; `destinoCerco` = 12 candidatos × (amostra 3×3 +
   `colideObst`) por astuto por frame — cabe (o A* já roda por frame
   quando a reta bloqueia).

## Requisitos

- **R-IA5-1 (mapa de influência)** — em `ia.js`, **grade 8px**
  (48×34 = 1632 células — resolução para discriminar os candidatos do
  anel de 11px, que ficam ~5,7px entre si; a grade do A* continua em
  16px), com:
  - **ocupação**: contagem de monstros por célula, **repintada por
    frame** (`IA.pintaMapa(inimigos)` chamada no topo de
    `atualizaInimigos`, antes do laço);
  - **obstáculo**: consulta **direta por candidato** —
    `IA.celulaObst(x, y, raio)` = `colideObst` com o raio da entidade
    (o boss de raio 11 não passa onde o slime de 6 passa); **sem memo
    entre frames** para nunca ficar stale entre mapas (o A* usa memo
    por chamada, mesmo princípio).
  Consulta de ocupação: `IA.celulaOcup(x, y)` = soma **3×3** (~24px —
  amostra suave: um aliado penaliza o candidato e os vizinhos).
- **R-IA5-2 (separação universal — o flocking)** — função pura
  `IA.separacao(en, inimigos)` → vetor `{x, y}`:
  - aliados dentro de `raio(en) + raio(aliado) + 6px` empurram para
    longe (soma de `(eu − aliado)/d`, normalizada);
  - **só monstro×monstro** (nunca empurra para longe do herói — ele é
    o alvo);
  - magnitude **capada em 10px** e integrada no movimento:
    `alvoX/Y += sep` e **raio final do alvo ≤12,5px do herói**
    (clamp — sem isso o destino sai de 13px e o monstro para de
    atacar: `distH >13` nunca entra no ramo de golpe);
  - **com 1 monstro o vetor é exatamente 0** → comportamento idêntico
    ao de hoje (protege seções 23/32/41, que são fixtures de1 bicho).
- **R-IA5-3 (destino via influence map, escalado pela astúcia)** —
  `decideInimigo` para ast ≥0,35 passa a chamar
  `IA.destinoCerco(en, heroi)`:
  - **12 candidatos** a raio exato **11px** (30° — dobra a resolução
    dos 6 slots p/ mais de 6 monstros sem colisão de slot);
  - **score** (menor vence): `ocupação3×3 do candidato × 3`
    **+** `preferência do ângulo do slot` (0 no ângulo próprio, cresce
    com o desvio — mantém a identidade do slot e evita troca de ângulo
    a cada frame); **obstáculo rejeita** o candidato (pula) e, se
    **todos** estiverem bloqueados, cai no slot de sempre; a própria
    célula do monstro é **descontada** (senão ele nunca fica feliz e
    troca de candidato para sempre);
  - **sem mapa pintado (ou tudo igual)** → cai no slot atual (jitter
    incluído) — compatível com fixtures diretas;
  - ast **<0,35 permanece `destino = null`** (só separação, como
    escolhido: universal no movimento, astúcia no destino).
- **R-IA5-4 (integração no movimento)** — em `atualizaInimigos`,
  logo após `alvoX/alvoY` (`destino` do herói quando nulo):
  `alvo += separacao(...)` + clamp de raio 12,5px (guard
  `!heroi.morto`; ramos de **medo/fuga/morto não recebem separação** —
  fugir não briga com a matilha).
- **R-IA5-5 (sonda)** — `info().bichos` ganha `x, y` (junto de
  `chave/hp/dist/atkCd`) p/ os testes calcularem distância mínima e
  cobertura angular da matilha.
- **R-IA5-6 (testes)** — **seção 44**: mapa de influência (ocupação
  pintada, obstáculo por raio — slime passa onde o boss não);
  separação (1 monstro = 0; dois a 8px se afastam; dois a 40px = 0);
  destino (aliado na preferência → gira p/ célula livre; candidato em
  obstáculo → rejeitado; raio 11 mantido); integração (2 monstros
  empilhados no fixture se separam em ≥8px; 8 astutos escolhem ângulos
  distintos). **Contratos da seção 23 intactos** (+ `pintaMapa([], …)`
  na fixture p/ limpar ocupação residual). Seções 32/41 sem mudança.
- **R-IA5-7 (sanidade de ritmo)** — `ritmo 60`: **mapa 1 fechado em
  31-33min** (alvo dura); `ritmo 2400` **≥2 runs** vs banda (mapa
  29-36 · nv 2600-3300). Se estourar para cima: **afro os novos
  mecanismos** até caber (alavancas, nesta ordem: magnitude da
  separação → peso da ocupação no score → nº de candidatos → raio do
  anel), nunca as curvas antigas. O `ritmo.js` continua **suspenso
  como decisor de gosto**.

## Fora de escopo

- Alignment/cohesion explícitos (a coesão da matilha vem do alvo
  comum + separação — escolha do escopo confirmado) · mudanças de
  dano/HP/velocidade · comportamento do herói (leva 6: Behavior Tree)
  · novo spawn · A* novo · boss com regra própria · desenho
  debug do mapa de influência na tela.

## Verificação

- **Seção 44** (nº a definir) + reparo do que quebrar.
- `node testes/todos.js` **3×** · **sanidade `ritmo 60`** (mapa 1) +
  **`ritmo 2400` ≥2 runs** (R-IA5-7).
- Docs (CHANGELOG, AGENTS, STATE, ROADMAP, README) · commit.
