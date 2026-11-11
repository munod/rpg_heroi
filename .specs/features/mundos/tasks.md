# Tasks: Mundos (campanha 10×10) + re-base do teto

Status: ⬜ pendente / ✅ feito · `[P]` paralelo

| # | Task | Dep | Status |
|---|------|-----|--------|
| T1 | Spec + tasks | — | ✅ |
| T2 | `mapas.js`: 10 temas autorais + `mundo()`/`noMundo()` + `info()` por mundo com ciclo no infinito | T1 | ✅ |
| T3 | `itens.js`: `temaDe` por mundo (ciclo de 3 pools) + comentário do espelho | T1 | ✅ |
| T4 | `personagem.js`: `CUSTO_G 1,07` + `NIVEL_MAX 9500` · `batalha.js`: `XP_H 1,064` · `ui.js`: `abrev` > 10⁶⁰ | T1 | ✅ |
| T5 | `batalha.js`: escala de monstros — implementar variantes A (mundo) e B (mapa) com constante de modo | T1 | ✅ |
| T6 | Vitória: chefe do mapa 100 → overlay em `jogo.js` + `p.vitoria` (normalizar) + continuar no 101 | T1 | ✅ |
| T7 | Testes: seções novas (estrutura/ciclo, vitória, re-base, contagem) + reparo do que quebrar (12, pool, 36, 38) | T2-T6 | ✅ |
| T8 | **A/B de monstros**: A vs B com `ritmo` ≥4 runs cada → escolher variante + calibrar `k` p/ ~200h | T5, T7 | ✅ |
| T9 | **Calibragem final**: alvos (mapa 100 ≈ 200h, sem estol, mortes eventos, nv fim ≈ 9.150) + sim longa completa em background | T8 | ✅ |
| T10 | Gate 3× + docs (CHANGELOG, STATE, AGENTS, README, ROADMAP) + commit | T9 | ⬜ |

## Verificação por task

- **T2**: ES5; `info(n)` para mundo = tema único (testável:
  `info(31) !== info(21)`); `info(101) === info(1)` (ciclo); 10 temas
  com chao/boss/inimigos distintos.
- **T4**: razões exatas testáveis (sem round, como hoje);
  `custoProximo(9500) < 1e308`; `xpAbate(9999) < 1e308`; saves antigos
  (nv ≤ 1000) funcionam sem migração (normalizar recalcula xpProx).
- **T6**: overlay sem nova cena (só render/click em `jogo.js`);
  `p.vitoria` não re-mostra; ranking continua submetendo no `passaMapa`
  normal.
- **T8**: decidir pela MÉDIA de ≥4 runs (variância de RNG); critério
  combinado: duração + mortes + estol — não só "qual é mais rápido".
- **T9**: sim de 100 mapas leva horas de parede — rodar em **background**
  e checar marcos (60/120/240min) enquanto trabalha nas docs.
