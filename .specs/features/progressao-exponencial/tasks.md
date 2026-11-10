# Tasks: Progressão exponencial + safeguards

Status: ⬜ pendente / ✅ feito · `[P]` paralelo

| # | Task | Dep | Status |
|---|------|-----|--------|
| T1 | Spec + tasks | — | ✅ |
| T2 | `personagem.js`: `custoProximo` exponencial (146 × 1,11^(nv−1)) + `OURO_MAX` + tetos no `normalizar` (xpProx recalculado, xp clamp, ouro/pontos/atributos) | T1 | ✅ |
| T3 | `batalha.js`: `xpAbate` (6 × 1,09^tot, exportado) + guard de `ganhaXP` + clamp de ouro no `mataInimigo` | T1 | ✅ |
| T4 | `ui.js`: `UI.abrev` + `jogo.js` usa na barra de XP | T1 | ✅ |
| T5 | `ritmo.js`: marcos 180/240 + coluna nv/min | T1 | ✅ |
| T6 | Testes: seção 38 (curva, renda, safeguards, abrev) + reparo do que quebrar | T2-T5 | ✅ |
| T7 | **Loop de calibragem**: ritmo ≥4 runs/iteração até os alvos (15min nv25-35 · mapa1 40-55min · mortes 30-40 · sem estol) | T6 | ✅ |
| T8 | Sim longa: nv1000 em 15-25h (ritmo 900-1500min) | T7 | ✅ |
| T9 | Gate 3× + docs (CHANGELOG, STATE **com correção do HP linear**, AGENTS novos alvos, README, ROADMAP) + commit | T8 | ✅ |

## Verificação por task

- **T2**: ES5; SEM `Math.round` no custo (razão exata testável);
  `xpProx` salvo passa a ser ignorado (fecha o 83k) — saves legítimos
  inalterados (sempre `xp < xpProx`).
- **T3**: continuidade `xpAbate(0,0) === 6` (= fórmula antiga em
  tot=0); guard de `ganhaXP` sem teto superior (renda tardia legítima
  ≈ 10⁴⁶ — o teto morre no `normalizar`).
- **T4**: `abrev` sem locale (pt-BR, vírgula decimal); cabeçalho
  continua com MÁXIMO no teto (teste existente).
- **T7**: cada iteração = 4 runs; decidir pela MÉDIA (variancia ±7min
  é RNG, não curva). Constantes só viram commit com alvo batido.
- **T8**: sim única no fim (15-25h ≈ 3-4M frames ≈ 15-25min de
  parede); relatório entra na spec.
