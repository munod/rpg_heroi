# Relatório de drift FINAL — anel full screen + cota 15s (3 vias)

Data: 2026-11-18 · Método: `testes/ritmo.js` determinístico,
**4 seeds × 15min + 4 seeds × 240min por via**, mesma máquina,
eventos ATIVOS, default do jogo.

- **A · ANTIGO** = `c983d2e` — anel 110-132px + cota 30s (baseline;
  reproduz os alvos documentados no AGENTS)
- **B · MEIO** = `4d19057` — anel ≈460px + cota 30s (fase B original)
- **C · NOVO** = `21ca93f` — anel ≈460px + **cota 15s** (rodada 2 do
  mantenedor; UI/câmera não afetam a sim, só `ONDA_SEG`)

Artefatos: `resultados/{a,b,c}{15,240}_s{1..4}.json` nas worktrees
`/tmp/opencode/ritmo-{a,b,c}`.

## 15 minutos (média de 4 seeds)

| Métrica | A · ANTIGO | B · MEIO | **C · NOVO** |
|---|---|---|---|
| nv10 | 3,0min | 6,1min | **4,6min** |
| nv30 | 8,0min | 10,8min | 11,1min |
| keystone | 8,4min | ~15min* | 11,4min |
| @15min nv / onda | 64 / 80 | 30 / 44 | **42 / 56** |
| kpm | 27,3 | 14,4 | 18,8 |
| clear p95 | 13,5s | 24,5s | **285s** (fluxo — ver nota) |
| espera% (batida) | 18,0% | 9,7% | **2,8%** |
| atrasoPct (cota) | 0,0% | 1,2% | **71,6%** |
| mortes | 0 | 0 | 0 |

\* keystone não foi atingido em 3 de 4 seeds no MEIO.

## 240 minutos (média de 4 seeds)

| Métrica | A · ANTIGO | B · MEIO | **C · NOVO** |
|---|---|---|---|
| **mapa** | **12,5** (11-14) | 7,3 (7-8) | **9,0** (9 em 4/4) |
| **nível** | **1.099** | 612 | **795** |
| kpm | 26,3 | 14,8 | 19,1 |
| ouro | 3,71M | 0,60M | 1,20M |
| clear médio / p95 | 9,9s / 14,6s | 19,1s / 25,3s | 84,7s / 260s |
| espera% | 17,6% | 9,8% | **2,5%** |
| atrasoPct | 0,0% | 0,2% | **81,8%** |
| mortes / mortes-h | 0 / 0 | 0 / 0 | 0 / 0 |
| nv10 · keystone | 3,0 · 8,4min | 6,1 · 15,1min | 4,6 · 11,4min |

Variância: NOVO bem estável (mapa 9 em 4/4; nv 792-798).

## O que a cota 15s fez (leitura)

1. **Ref quase sempre dispara** (atraso 0 → 82%): com anel ≈460 o
   clear típico é ~19s > 15s → reforços entram na maioria das ondas.
2. **O jogo vira FLUXO CONTÍNUO**: campo praticamente nunca esvazia
   (espera 17,6% → 2,5%; clear p95 vira ~4-5min porque "onda" passa a
   ser um rio de monstros até a matança superar a entrada). A batida
   (BEAT 2s) quase não acontece mais.
3. **Progressão parcialmente recuperada**: vs MEIO, cota 15 devolve
   ~+30% (mapa 7,3→9,0; nv 612→795) — os monstros extras de reforço
   pagam XP/ouro. Ainda assim **−28% vs original** (mapa 12,5; nv1.099).
4. **Early game melhora** (nv10 6,1→4,6min) — reforços no início são
   XP grátis.
5. **Letalidade intacta**: 0 mortes nas 3 vias (o build gerido do
   `ritmo.js` aguenta; perigo maior não apareceu nessa métrica).
6. **Efeito colateral visual**: o aviso `ONDA ATRASADA — REFORÇOS!`
   passa a aparecer ~a cada 15s (82% das ondas) — pode parecer spam.

## Opções (decisão do mantenedor — nada aplicado ainda)

1. **Aceitar C (anel460 + cota15)** — ação contínua quase sem pausa,
   progressão −28% do original, aviso de reforço frequente.
2. **Voltar a cota 30s (estado B)** — respiro preservado, mas
   progressão −42%.
3. **Cota intermediária (20s)** — meio termo; exige nova medição.
4. **Compensar renda em C** (`xpAbate`/ouro ×~1,4) — devolve a
   progressão do original mantendo anel longo + cota15.
5. **Reduzir o anel (~380-400px)** — alivia o clear em qualquer cota
   (menos tempo de aproximação), recuperação parcial.

Qualquer escolha: novo A/B (≥4 seeds) + `node testes/todos.js` +
docs (AGENTS/CHANGELOG) antes de fechar a leva.

---

# Rodada 4 — cota 20s (2026-11-18, commit `0469f3a`)

Mantenedor recusou 15s e pediu medição com **20s**. Mesmo método
(4 seeds × 15min + 4 seeds × 240min), worktree `ritmo-d`, artefatos
`d15_s*`/`d240_s*`.

## 4 vias — 240 min (média de 4 seeds)

| Métrica | A anel110+30 | B anel460+30 | **D anel460+20** | C anel460+15 |
|---|---|---|---|---|
| **mapa** | **12,5** | 7,3 | **8,0** | 9,0 |
| **nv** | **1.099** | 612 | **664** | 795 |
| kpm | 26,3 | 14,8 | 15,9 | 19,1 |
| clear médio / p95 | 9,9 / 14,6s | 19,1 / 25,3s | **21,7 / 41,4s** | 84,7 / 260s |
| espera% | 17,6% | 9,8% | **8,9%** | 2,5% |
| **atrasoPct** | 0,0% | 0,2% | **19,8%** (15-23/seed) | 81,8% |
| ouro | 3,71M | 0,60M | 0,77M | 1,20M |
| mortes | 0 | 0 | 0 | 0 |

## 15 min (média)

| | A | B | **D** | C |
|---|---|---|---|---|
| nv10 | 3,0min | 6,1 | **5,8** | 4,6 |
| keystone | 8,4min | ~15 | ~15 | 11,4 |
| @15min nv/onda | 64/80 | 30/44 | **31/45** | 42/56 |
| atraso% | 0 | 1,2 | **34,2** | 71,6 |

## Leitura (D vs as demais)

- **Reforços ocasionais, não constantes**: atraso ~20% das ondas
  (15-23% por seed) — ~1 a cada 5 ondas aperta; a batida continua
  acontecendo (espera 8,9% ≈ B) e o campo **esvazia de verdade**
  (clear p95 41s, sem rios intermináveis como o p95 260s do C).
- **Progressão levemente melhor que B** (+9%: mapa 7,3→8,0; nv
  612→664 — XP dos reforços pontuais), **ainda −36% vs A**
  (mapa 12,5; nv 1.099). O drift continua sendo do **ANEL**, não da
  cota: early game praticamente idêntico a B (nv10 5,8 vs 6,1).
- Estável entre seeds (mapa 8 em 4/4; atraso 15-23%).
- Estimativa de campanha: A = 44h (documentado) → **D ≈ 70-75h**,
  C ≈ 60-65h, B ≈ 80h.

## Estado atual do código

**anel ≈460 + cota 20s** (commit `0469f3a`, gate `todos.js` verde).
Opções seguem abertas (relatório anterior): aceitar · compensar renda
(×~1,55 em D) · reduzir anel (~380-400px) · misturar.
