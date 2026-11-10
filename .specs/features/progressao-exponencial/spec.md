# Spec: Progressão exponencial (padrão de indústria) + safeguards

Status: **concluída** (gate 3× · 489 confs · calibragem ~14 iterações
com 4 runs/decisão · sim 1500min: nv1000 ≤25h) · Data: 2026-11-09
**ALVOS AMENDADOS PELA MEDIÇÃO** — constantes finais: `CUSTO_BASE 146 ·
CUSTO_G 1,11 · XP_BASE 12 · XP_H 1,10 · ESC_HP 1,90 · ESC_DMG 0,045 ·
ESPERA 8 · HP_POR_NIVEL 6`:
- 1º nível **46,6s** (alvo 35-45 — +2s, no limite);
- 15min **nv 33-38** (alvo 25-35 — no topo da faixa);
- mapa 1 **31,7-32,3min** (alvo 40-55 — AMENDADO: sumiram as mortes de
  early que travavam a onda líquida; subir mais exigiria refazer o muro);
- mortes **~10-19/120min, só em fronteira/boss** (alvo 30-40/50 —
  AMENDADO: o alvo antigo era o SINTOMA do estol/grind);
- **sem estol: 4/4 runs** (120min ≥ mapa 3 mid-wave, nv/min plano) ✓;
- **nv1000 ≤ 25h** ✓ (sim1500min: nv503@3h, 693@4h, cap no fim; mapa
  6→8→13 sem parar).
Iniciativa: playtest
("reavaliar ritmo e progressão — estão quebrando tudo; padrão da
indústria"). Decisões do usuário: **custo exponencial puro** · **renda
XP harmônica com o custo** · **HP/dano: medir primeiro, mexer se
preciso** · alvos: **nv1000 em ~15-25h suave** · **~30 níveis aos
15min** · mortes ~30-40/50min.

## Contexto (diagnóstico medido)

- **Correção de premissa**: HP/dano NÃO são exponenciais — são
  **lineares** (`escHp = 1 + 1,30×ondaTotal`, `escDmg = 1 + 0,10×…`).
  A "parede" sentida era outra.
- **A economia 100% linear é o problema** (custo × nível, renda ×
  onda, ambos lineares): nível correu à frente da onda (≈2,25 níveis/
  onda) → custo subiu mais rápido que a renda → tempo/nível cresceu
  (2,8 → 1,4 níveis/min) → HP do herói (linear no nível) parou de
  acompanhar o dano inimigo → **espiral de mortes** (136@120min,
  682@10h; penalidade −5 ondas corta a renda) → **estol** (mapa 3,
  onda 1 por 30min). Flood inicial: custo trivial → nv47@15min.
- Sem travas: `xpProx` do save aceito como está (editável → salto de
  nível, bug dos 83k), `xp`/`ouro`/`pontos` sem teto.

## Modelo (matemática de referência)

Custo `G^L` + renda `H^onda` com `H ≈ G^α` (α = níveis/onda na
fronteira) → renda acumulada `H^t` absorve o custo `G^L` → **L cresce
linearmente no tempo com tempo/nível constante** (`ln G / ln H`) → o HP
do herói acompanha o dano inimigo em tendência → fim da espiral; custo
subindo desde o nível 1 mata o flood.

## Requisitos

- **R-PEX-1 (custo exponencial puro)**:
  `custoProximo(nv) = CUSTO_BASE × CUSTO_G^(nv−1)` (fonte única;
  SEM `Math.round` — razão exata testável; float < 2⁵³ ok, exibição
  via abreviação). **Pontos iniciais a calibrar**: `CUSTO_BASE = 146`
  (1º nível ~35-45s intacto) · `CUSTO_G = 1,11`. Análise: G=1,11 com
  renda harmônica reproduz nv≈30@15min com a renda atual.
- **R-PEX-2 (renda harmônica)**: `xpAbate(tot, xpExtra) =
  round(XP_BASE × XP_H^tot) + xpExtra` — função extraída e
  **exportada** de `batalha.js` (padrão `passaMapa`). Continuidade na
  fronteira: `XP_BASE = 6` (= fórmula antiga em tot=0). **XP_H = 1,09**
  (= CUSTO_G^0,8 ≈ α inicial medido). Boss ×5 e Açougueiro ×4
  mantidos (os multiplicadores ficam nas linhas de sempre).
- **R-PEX-3 (HP/dano intocados por enquanto)**: `ESC_HP = 1,30` e
  `ESC_DMG = 0,10` continuam; só se toca com medição fora do alvo de
  mortes (~30-40/50min) e aí com re-medida.
- **R-PEX-4 (safeguards — fecha o 83k)**:
  - `normalizar`: **`xpProx` SEMPRE recalculado** de
    `custoProximo(nivel)` (valor salvo é ignorado — fecha salto de
    nível editado); **`xp = min(xp, xpProx−1)`** (excesso descartado —
    save legítimo sempre tem `xp < xpProx`); tetos
    `ouro ≤ OURO_MAX (1e12)`, `pontos ≤ 100.000`, `atributos ≤ 1e6`.
    (`Personagem.OURO_MAX` exportado — fonte única.)
  - `ganhaXP`: rejeita qtd não-numérica/`!isFinite`/`≤ 0` (NaN, −5,
    Infinity viram no-op; o teto superior morre na clámpula do
    `normalizar` — a renda legítima tardia é da ordem de 10⁴⁶).
  - Ouro total com clamp na soma (`mataInimigo`).
  - Tudo < 2⁵³ (integer-safe).
  - **Exibição**: `UI.abrev(n)` (K/M/B/T/Qa/Qi/Sx/Sp/Oc/No/Dc/Ud/Dd/
    Td/Qad/Qid/Sxd/Spd/Ocd/Nod — até 10⁶⁰) na barra de XP do
    cabeçalho; `milhar` permanece p/ stats.
- **R-PEX-5 (ritmo reavaliado)**: marcos novos 180/240min + coluna
  `+X.X nv/min` (tendência deve ficar PLANA — a atual decaía
  2,8 → 1,4). Loop de calibragem `medir → ajustar G/H/X0 → medir` com
  **≥4 runs por iteração**.
- **R-PEX-6 (alvos de aceitação)**: 1º nível 35-45s · **15min nv
  25-35** (hoje 47) · mapa 1 fechado 40-55min · mortes ~30-40/50min ·
  **sem estol** (120min: mapa ≥4 avançando) · **nv1000 em ~15-25h com
  tempo/nível estável** (sim longa final).

## Fora de escopo

- Ouro exponencial (permanece linear — sem pedido), prestige/ascensão,
  mudanças em IA/drops.

## Verificação

- Seção 38 da fumaça:
  1. razão `custoProximo(n+1)/custoProximo(n)` **constante** (exponencial
     pura) em qualquer n; `custoProximo(1) === 146`;
     `custoProximo(1000)` finito < 1e308; monotonia;
  2. `xpAbate`: valor exato em tot=0 (=6, continuidade) e em extras;
     razão ≈ XP_H constante; boss/ Açougueiro multiplicadores intactos
     (linhas de sempre);
  3. safeguards com fixture de save editado: `xpProx:1` → recalculado;
     `xp:1e18` → clamp `xpProx−1`; `ouro:1e20` → OURO_MAX;
     `pontos`/`atributos` com teto; `ganhaXP(NaN|−5|Infinity|0)` →
     no-op; level-up com custo float funciona (50→51, sobra zerada);
  4. `UI.abrev` (999 · 1,5K · 1M · 10⁴⁵).
- `todos.js` 3× · **loop de calibragem ritmo ≥4 runs por iteração**
  até os alvos de R-PEX-6 · sim longa do teto · docs · commit (push
  com aval).
