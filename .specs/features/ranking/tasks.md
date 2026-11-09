# Tasks: Ranking global (Firebase/Firestore)

Status: ⬜ pendente / ✅ feito · `[P]` paralelo

| # | Task | Dep | Status |
|---|------|-----|--------|
| T1 | Spec + tasks | — | ✅ |
| T2 | Mapear padrões (cenas, seleção, gatilhos, input de texto) | T1 | ✅ |
| T3 | `js/ranking-config.js` (placeholder + instruções) e `js/ranking.js` (API: slug, score, submete/top com degradação, cache) | T2 | ✅ |
| T4 | Cena `ranking` (render + input de apelido + estados) + botão na seleção + registro em `main.js` + scripts no `index.html` | T3 | ✅ |
| T5 | Gatilhos em `batalha.js` (passaMapa + morte antes da penalidade) + `passaMapa` exportado p/ teste — o apelido mora no próprio `ranking.js` (`rpg_rank_nick_v1`), não em `gravacao.js` | T4 | ✅ |
| T6 | Testes: seção 35 (fórmula, slug, degradação, lazy-load, cena com stub, gatilhos, erro/cache) | T5 | ✅ |
| T7 | Gate 3× (441 confs) | T6 | ✅ |
| T8 | Docs (CHANGELOG, STATE, AGENTS, README, ROADMAP, spec/tasks) + commit | T7 | ✅ |
| T9 | Orientar usuário no setup do Firebase (console, regras, config) | T8 | ✅ |

## Verificação por task

- **T3**: ES5; lazy-load por injeção de `<script>` (createElement —
  só chamado na abertura da cena; sandbox não tem firebase → no-op);
  doc só vai com score maior (e as regras do servidor reforçam).
- **T4**: cena segue o padrão de `selecao.js` (retângulos + `UI.dica`);
  botão da seleção em (260,306,108,26) — conferido contra TODOS os
  cliques existentes da fumaça (nenhum no retângulo); painéis da
  direita ancorados com `rd = W − 768`.
- **T5**: early-return barato; morte ~8×/run e `passaMapa` 1× — sem
  debounce extra (regras do servidor cortam não-melhorias). A morte
  submete ANTES de `penalizaMorte` (progresso real, não pós-rollback).
- **T6**: sem SDK a cena NÃO lança; com stub (thenable síncrono — o
  harness não esvazia microtasks) a cena renderiza; spy confirma os 2
  gatilhos. Fixture de morte exige `restaurarOnda(50)` (pressão — com
  onda 1 a regen de nv20 não deixava morrer; lição já registrada).
- **T7**: 3× verde (`node testes/todos.js`).
- **T9**: orientação passo a passo entregue na conversa (console +
  regras verbatim + config) — setup manual fora do gate.
