# Tasks: IA do herói — Behavior Tree + evasão de cerco

Status: ⬜ pendente / ✅ feito · `[P]` paralelo

| # | Task | Dep | Status |
|---|------|-----|--------|
| T1 | Spec + tasks | — | ✅ |
| T2 | `ia.js`: `CAMADAS` + `profundidade(agu)` + seletor `avaliaCamadas`; `decideHeroi` reescrito sobre a árvore (gates/ruído/saída idênticos) | T1 | ✅ |
| T3 | `ia.js`: `direcaoEvasao(h, angBase, dist)` (12 candidatos clampFuga, score = ocupação + 100×rocha, desempate k=0) + `recuar`/`kite` usam | T2 | ✅ |
| T4 | `batalha.js`: `pintaMapa` do topo de `atualizaInimigos` para o topo de `atualizar()` + sonda `prof` em `info().heroi` | T2-T3 | ✅ |
| T5 | Testes: seção 45 (estrutura, gates, evasão, arena) + amostragem de rocha na fixture da seção 32 + reparos | T2-T4 | ✅ |
| T6 | Gate 3× | T5 | ✅ |
| T7 | Sanidade: `ritmo 60` + `ritmo 2400` ≥2 runs — **reportar** (prioridade invertida: comportamento novo > progressão; intervir só em estol) | T6 | ✅ |
| T8 | Docs + commit | T7 | ✅ |
| T9 | Push (só com aval) | T8 | ⬜ |

## Verificação por task

- **T2**: os gates da árvore são NUMERICAMENTE os atuais (prof 3 =
  agu ≥ 0,45; prof 2 = agu ≥ 0,35) — se um assert da seção 22 cair,
  o gate mudou de número, não a arquitetura. O ruído de cambaleia
  aplica-se só pós-seleção e nunca na camada de sobrevivência
  (mesma condição `estado !== 'recuar'` de sempre).
- **T3**: com `pintaMapa([])` o retorno tem que ser **exatamente**
  `clampFuga(base)` (float idêntico) — é a prova de que a evasão
  degrada para o comportamento antigo. Candidato k=0 primeiro + `<`
  estrito = desempate determinístico no base.
- **T4**: a pintura fresca muda o frame que os DOIS lados leem —
  seções 22/32/44 rodam frames reais e são a rede de segurança.
- **T5**: seção 22 e 32 são CONTRATO — nada de mudar asserts delas.
  A amostragem de rocha na 32 usa a fixture de fugas já existente
  (>500 fugas) sem duplicar setup.
- **T7**: ≥2 runs; comparar MAPA/NV. Intervenção só em estol
  (mapa 1 > ~40min / estol de nível / mortes em massa) — fora disso,
  reportar e seguir (prioridade do mantenedor).
