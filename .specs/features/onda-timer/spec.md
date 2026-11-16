# Spec: Onda com cota de tempo — a espera vira pressão

Status: **CONCLUÍDA** (gate732 confs · A/B4 seeds ×240min: mapa9→12,
nv777→1050, espera37→17%, atrasoPct 0,00% · **sim completa:
VITÓRIA em2.639min = 44,0h · nv final9.170 (modelo9.150) · 0 mortes ·
clear p95 19s e máx 26s — a cota de30s nunca estourou em9.900
clears**) · Data: 2026-11-15 ·
Iniciativa: mantenedor ("remover a espera entre as ondas, pois isso é
muito ruim e chato" + "x segundos de duração de onda: se o jogador
exceder, a outra onda já inicia — desafio maior").

## Contexto

- Hoje o ciclo é **clear (~13s) + espera** (`esperaOnda()` = rampa
  `2+(m−1)×1,1` com `ESPERA_TETO 45`): **~76% do tempo é a espera
  parada** (medido: `esperaPct` 68-76% na sim longa) e a alavanca de
  duração da campanha é justamente essa espera (R-MUN-7). Consequências:
  a build do jogador quase não muda a velocidade da campanha, o
  herói "dorme entre as ondas" e toda tentativa de encurtar a espera
  (teto 45s) só remendava o sintoma.
- A ideia nova inverte o sinal: **a pressão fica DURANTE a onda**. Limpo
  rápido → próxima onda na hora (build boa = campanha rápida); lento →
  reforços entram no campo com os sobreviventes (build fraca = espiral
  → morte = −5 ondas = castigo). O desafio vira função da build.
- O Enxame (2× monstros) passa a ser a onda que estoura a cota — tensão
  natural nos eventos.
- Decisões do mantenedor (2026-11-15): **aceitar campanha ~45-50h**
  (10.000 ondas × clear + batida), **batida curta ~2s** após o clear
  (o toast respira + micro-regen), **`ESPERA_TRANSICAO` 8s mantida**
  (troco de mapa é outro contexto — banner/cutscene).

## Requisitos

- **R-TIM-1 (espera → batida)** — `esperaOnda()`/`ESPERA_BASE`/
  `ESPERA_PASSO`/`ESPERA_TETO` **saem de cena**; o clear seta
  `BEAT = 2.0` (constante exportada). O clear limpo → batida de2s →
  próxima onda. `ESPERA_TRANSICAO` intacta. (Superado: R-BAL-1 do
  `balance-dopamina`.)
- **R-TIM-2 (cota da onda)** — novo timer `tCota` iniciado em
  `spawnaOnda` com `ONDA_SEG` (chute inicial 30s, ajustado pela
  medição de R-TIM-6), conta **com campo cheio e herói vivo**. Expirou:
  `proximaOnda()` — os **sobreviventes ficam** e os reforços nascem no
  anel de sempre; `aviso('ONDA ATRASADA — REFORÇOS!', '#ff6b6b')`; o
  contador de onda **avança** (foi sobrevivida, `stats.ondas` conta) e
  **não** dispara o `ONDA LIMPA` (não limpou). Sem teto de campo: o
  acúmulo é o perigo, e a morte (rollback limpa tudo + re-spawna a
  onda atual) é o freio.
- **R-TIM-3 (chefe isento)** — onda de chefe nasce com `tCota = −1`
  (sem cota, sem HUD de tempo): o chefe é o clímax, sem prazo.
- **R-TIM-4 (HUD)** — durante a onda (não-boss): linha de baixo passa
  a mostrar **`TEMPO Xs`** (mesmo lugar do countdown do respiro —
  vermelho ≤5s = alerta); na batida continua `PRÓXIMA ONDA EM Xs`.
  `info().cota = tCota` (−1 = sem cota) p/ teste; `info().espera`
  continua sendo a batida.
- **R-TIM-5 (intactos)** — rollback de morte (limpa campo e
  re-spawna), cooldowns de evento **por rolagem de onda** (eventos por
  campanha ficam iguais:10.000 rolagens), cofre (o anel de40-120px <
  os ~140px que o herói anda na batida de2s → alcança a coleta;
  durante o combate a coleta por proximidade de22px roda em todo
  frame), enxame (bônus ×1,5 encerra no avanço da onda — aceito, os
  sobreviventes pagam preço cheio).
- **R-TIM-6 (medição — o gate)** —
  (a) **instrumentar antes**: `ritmo.js` ganha duração de clear por
  onda (transições campo>0 → campo=0 em `amostra`) → `clearMedio/
  clearMax/clearP95` + **baseline4 seeds ×240min** → daí sai o
  `ONDA_SEG` (cota ≈ p95 × margem; sanity: o baseline quase nunca
  estoura);
  (b) **A/B pós**:4 seeds ×240min — `atrasoPct` ≈0 no baseline,
  `esperaPct` cai p/ ~2% (só a batida), ondas/h sobe, mortes segue
  evento, sem estol;
  (c) **sim completa** (~5.000min — a campanha encurtou, custo ~¼ do
  antigo): vitória + duração final + anti-estol.
  **RESULTADO (2026-11-15)**: (a) p95=18s/máx34,6s → ONDA_SEG 30;
  (b) espera37→17%, atrasoPct **0,00%**, mapa9→12, nv777→1050,
  mortes0; (c) **VITÓRIA em2.639min = 44,0h**, nv final9.170
  (modelo9.150), **0 mortes**, hpMin41, clear da campanha p95 19s /
  máx 26,07s — a cota de30s **nunca estourou em9.900 clears** (nem o
  Enxame no late: build saudável é sempre folgada; a cota puniria só
  build fraca — exatamente o projeto).
- **R-TIM-7 (docs)** — AGENTS: a alavanca de duração da campanha deixa
  de ser a espera e passa a ser o **clear** (reescrita do parágrafo do
  respiro + alvos de tempo re-meditados); emendas `mundos` (R-MUN-7) e
  `respiro` (R-RES-1/5 superados); `balance-dopamina` fechado (R-BAL-1
  superado, R-BAL-6 valendo); CHANGELOG/ROADMAP/STATE/README.

## Fora de escopo

- Cura no clear (% de HP ao limpar) — só se a medição mostrar
  mortalidade inaceitável sem a janela de regen (alavanca documentada,
  não preventiva).
- Cota escalando com nº de monstros (manter X fixo e legível; se a
  medição exigir, escala é ajuste de 1 linha).
- Teto de campo / ondas sobrepostas por tempo (o freio é a morte).

## Verificação

`node testes/todos.js` (seção51 reescrita: batida, cota, chefe
isento, HUD) · baseline/DEPOIS em `resultados/*.json` · sim completa ·
QA manual: onda que não limpa em Xs → reforços entram e o campo fica
mais quente; onda limpa rápido → entra na hora seguinte.
