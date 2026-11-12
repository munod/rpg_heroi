# Tasks: Monstros novos (espécies, ranged, eventos)

Status: ⬜ pendente / ✅ feito · `[P]` paralelo

| # | Task | Dep | Status |
|---|------|-----|--------|
| T1 | Spec + tasks | — | ✅ |
| T2 | `batalha.js`: 3 espécies em `TIPOS` (`atirador`, `regenerador`, `drenador`) com stats próprios | T1 | ⬜ |
| T3 | `batalha.js`: ataque à distância do `atirador` (alcance 90, cd 2,2s, `Efeitos.missil`, sem tiro em cadáver) + movimento (aproxima se > alcance) | T2 | ⬜ |
| T4 | `batalha.js`: skills dos outros 2 — regen após 2s sem apanhar · dreno 30% do dano | T2 | ⬜ |
| T5 | `mapas.js`: espécies novas como `raro` dos mundos 5-10 (**`comum` intacto**) | T2-T4 | ⬜ |
| T6 | `eventos.js` + `batalha.js`: **Enxame** (2× inimigos, ×1,5) e **Cofre Abandonado** (aproximação + ouro + drop) | T1 | ⬜ |
| T7 | Testes: seção 41 (espécies, ranged, regen, dreno, comum intacto, 2 eventos) + reparos | T2-T6 | ✅ |
| T8 | Gate 3× | T7 | ✅ |
| T9 | **Sanidade**: `ritmo.js 2400` vs referência (mapa 36 · nv 3224 · 20 mortes) — critério e ≥4 runs se empate | T8 | ✅ |
| T10 | Docs + commit | T9 | 🔶 |

## Verificação por task

- **T3**: o projétil do inimigo precisa `resolve()` no impacto (senão o
  dano atravessa obstáculos) e NÃO conta como hit do herói (`danoHeroi`
  só quando `heroi.inv <= 0`, igual ao corpo a corpo).
- **T5**: snapshot do `comum` dos 10 mundos ANTES de mexer e asserir
  igual depois (é o que protege a progressão medida).
- **T9**: a medição só prova "não quebrou" — o `ritmo.js` continua
  **suspenso como decisor de gosto** (decisão do mantenedor).
- **T9 FECHADO**: 7 runs isolando Enxame/Cofre. Achados: (1) a
  variância entre runs é **1..112 mortes** (a "referência" de 1 run era
  possivelmente sortuda — uma run com tudo desligado deu **1** morte);
  (2) o **Enxame** pesa na progressão (3% → ~253h projetado) →
  calibrado em **1,5%**; (3) o **Cofre** NÃO é causa (desligá-lo deu
  87 mortes); (4) durante a investigação achei o **bug do spawn**
  (skills não copiadas do TIPOS) — as medições iniciais rodaram SEM as
  skills ativas, o que torna as comparações de "monstros novos" na
  verdade medições dos EVENTOS. **A progressão projetada com 1,5% fica
  ~200-220h** (dentro do alvo).
- **T9 (registro antigo)**: a 1ª medição **FALHOU** o critério (2400min: mapa 29 /
  nv 2657 / **112 mortes** vs 36 / 3224 / 20) — mas os monstros novos
  não participaram (mundo 5 = mapa 41, a run parou no 29). **Isolamento
  com `ENX_BASE=0`** apontou o **Enxame** (1200min: mapa 24 / 1 morte
  sem ele vs mapa 21 / 27 com ele). Enxame calibrado 10% → **3%**;
  medição final em curso.
