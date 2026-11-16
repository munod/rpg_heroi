# Spec: Balance da leva dopamina — teto do respiro, pontos por nível e esponja de dano

Status: **CONCLUÍDA** (gate 727 confs; A/B ≥4 seeds por decisão: V1
neutro idêntico, TTK −12%, sem estol no mundo 3 em 900min; **sim
completa da candidata: VITÓRIA em 8.171min = 136,2h com 0 mortes**
(vs a sim sem a compensação que estolou no mapa97 com1.357) — alvo de
duração medido da config COM espera; a vigência passou para a sim do
`onda-timer`) · Data: 2026-11-15 ·
Iniciativa: mantenedor (reclamações: "espera só sobe a cada mapa",
"esponja de dano — grande problema do endgame do D4", "a evolução
dos pontos/lvl pode resolver isso, precisa testar").

## Contexto

- **Espera**: `esperaOnda()` sem teto → 111s no mapa 100 (vs ~15s de
  clear = 88% morto naquele ponto). O rampa é a alavanca de duração da
  campanha (R-MUN-7, ~200h) — qualquer teto **encurta** a campanha e o
  mantenedor **aceitou campanha mais curta** (decisão 2026-11-15).
- **Pontos**: `PONTOS_CADA = 3` (1 ponto a cada 3 níveis = decisão
  rara) com `PONTO_MULT = 9` compensando a escassez. O gênero (D2
  Survivors: card **todo** nível) pede decisão a cada nível.
- **Esponja**: `ESC_HP = 1,90` — produto do cliff `ESC_HP×ESC_DMG =
  0,0855` colado no limite (≤0,086 passa / ≥0,095 estola). TTK alto =
  monstro vira esponja. Densidade (`ESC_MONSTROS_K = 0,5`, teto 5→9)
  é o ajuste de "sabor" mais barato que existe (medido: **nº de
  monstros não muda duração**, só perigo/XP).
- Instrumento pronto (spec `respiro`): `ritmo.js` semeado com
  `ttkMedio`, `esperaPct`, `mortes`, marcos e JSON.

## Requisitos

- **R-BAL-1 (teto do respiro)** — *(SUPERADO em2026-11-15 pela spec
  `onda-timer`: a espera entre ondas foi removida — `esperaOnda`/
  `ESPERA_TETO` saíram de cena; vira `BEAT2s + ONDA_SEG30`.)*
  `esperaOnda()` ganha `ESPERA_TETO = 45` (`Math.min` com o rampa),
  **exportado** em `Batalha`. Sono do mapa 100: 111s → **45s**; respiro ainda ≥ 25s =
  janela de full-heal (4%/s) preservada em qualquer mapa. Escrita do
  bloco de calibragem em `batalha.js` atualizada com os novos números.
- **R-BAL-2 (ponto todo nível — V1 neutro)** — `PONTOS_CADA 3→1` **e**
  `PONTO_MULT 9→3` juntos: 3× mais pontos × 1/3 de valor = poder
  **medido idêntico**, só que 3× mais decisões. `gestao.js` anuncia em
  singular quando `PONTOS_CADA === 1` ("A cada nível: +1 ponto").
  Confs de contrato atualizadas (seções 4/34/rodapé).
- **R-BAL-3 (esponja + densidade)** — `ESC_HP 1,90 → 1,55` (TTK cai,
  produto do cliff 0,0855 → **0,0698** = folga real p/ viver o cliff) +
  `ESC_MONSTROS_K 0,5 → 0,75` (teto final 9 → 11: tela mais povoada).
  Risco: mais monstro = mais dano total na fronteira (k=1 estolou o
  mundo 3 antes) — por isso medir.
- **R-BAL-6 (compensação do estol da sim completa)** — a sim de
 13500min com `ESPERA_TETO45 + REGEN_MAX500 + k0,75` **estolou no
  mapa97** (8400min→fim: nv para em8.895, ~1.357 mortes em cascata,
  dnv0): (a) o teto encolheu a janela de cura do fim (45×500 = 22,5k
  vs113s×500 = 56,5k sem teto) → **`REGEN_MAX500 →1250`** (45×1250 =
  56k ≈ a janela histórica estável; cap só pega com HP >31k = late;
  "se a sim estolar, SOBE este número" do AGENTS); (b) `k0,75` dá
  teto11 no mundo10 (+22% de monstros) → **`ESC_DMG0,045 →0,037`**
  (perigo total do fim: 11×0,037 = 0,407 ≈ 9×0,045 = 0,405 do
  baseline medido —222,5h sem estol);
  (c) `ESC_HP1,55 →1,25` (com o tema por mapa o ttk voltou a2,48;
  em4 seeds ×240min o1,25 devolve a progressão à faixa do baseline
  com ttk2,32 ≈ pré-leva3). **Validação: sim completa — VITÓRIA em
  8.171min = 136,2h, nv final9.171 (modelo9.150), 0 mortes** (a sim
  SEM a compensação estolou no mapa97 com1.357 mortes — comparar com
  `resultados/completa_s1.json` vs `completa2_s1.json`).
- **R-BAL-4 (medição — o gate da leva)** — por decisão, **≥4 seeds**
  (`node testes/ritmo.js 240 mundo 0.5 <s>`) comparando DEPOIS vs
  ANTES: (a) V1 neutro → nv/onda/mapa/ttk **idênticos** (se divergir
  > ruído de seed, recuar); (b) esponja → `ttkMedio` **↓** e `mortes`
  segue evento (não explode) e **sem estol** no mapa 3 (240min alcança
  o mapa 3+); (c) teto → **sim completa** (`ritmo 13500`, 1 run de
  seed 1, precedente da v0.4.0) documentando a duração nova no
  AGENTS/ROADMAP. Gate `node testes/todos.js` em cada commit.
- **R-BAL-5 (docs)** — alvo de duração re-documentado (AGENTS linha
  do ritmo + mundos R-MUN-7 emenda: o alvo passa a ser o **medido da
  sim nova**, não mais 200h) + CHANGELOG + ROADMAP/STATE.

## Fora de escopo

- Redesenho do clear/XP/custo (as curvas continuam as mesmas).
- Variante `mapa` da escala (o A/B da spec mundos ficou `mundo`).
- V2 de pontos (PONTO_MULT alto = poder extra) — se o neutro não
  resolver a esponja, aí sim medir V2 como etapa separada.

## Verificação

`node testes/todos.js` · A/B por decisão conforme R-BAL-4 (JSONs em
`resultados/` antes/depois) · sim completa 1× em background ·
`ritmo 60` de sanidade (mapa 1 / keystone / ttk).
