# Tasks: Visual efeitos — pools, receitas, hit-stop, camadas

Status: ⬜ pendente / ✅ feito · `[P]` paralelo

| # | Task | Dep | Status |
|---|------|-----|--------|
| T1 | Spec + tasks | — | ✅ |
| T2 | `efeitos.js`: pools + `limitar` + `silenciar` + sprites glow/anel (cache) + catálogo do doc | T1 | ✅ |
| T3 | `efeitos.js`: receitas (impacto/impactoHeroi/morte/nivelUp/reviver/bossChegou/corte/raio) + game feel (sacudir/parar/flash/borda/perigo) + `nota` 3 estilos | T2 | ✅ |
| T4 | `efeitos.js`: camadas `desenharBaixo/Topo/Tela` + `auraBoss` · `cena.js`: `drawImage` × `globalAlpha` | T3 | ✅ |
| T5 | `batalha.js`: migração — nums/parts/shake/tFlash saem; fachadas `numero/faísca`; receitas nos gatilhos (dano/golpe/morte/nível/renascimento/chefe/casts); gate `congelar`; `perigo` todo frame; `auraBoss` no chefe | T2-T4 | ✅ |
| T6 | `jogo.js`: `voltaAusencia` envolve `Efeitos.silenciar` | T5 | ✅ |
| T7 | Testes: seção 49 + reparos (timing de golpes se hit-stop cair teste) | T5-T6 | ✅ |
| T8 | Gate 3× | T7 | ✅ |
| T9 | Sanidade `ritmo 60` ≥2 runs (hit-stop: medir; afar durações se estourar) | T8 | ✅ |
| T10 | Docs + commit | T9 | ✅ |
| T11 | Push (por último — junto com o da cutscene, aval do mantenedor) | T10 | ⬜ |

## Verificação por task

- **T3**: TODA receita respeita `mudo` — a simulação offline roda
  milhares de golpes; um `parar()` sem guarda congelaria
  `voltaAusencia` inteira (e o teste de autosave junto).
- **T5**: `limparEfeitos` tem que continuar zerando TUDO (nums agora
  moram no Efeitos — os 7 sites de teste dependem dele).
- **T5**: o gate do `congelar` fica DEPOIS da pausa (pausado não
  consome hit-stop) e ANTES de qualquer lógica (mundo inteiro congela
  — doc: "hit-stop antes de tudo").
- **T7**: se a seção 32 (`g8`/`g62`, `colado`) cair, é timing do
  hit-stop — primeiro medir quanto tempo congelou; solução = janela
  maior do teste, nunca desligar o hit-stop.
- **T9**: ≥2 runs; comparar MAPA/NV; alvo mapa 1 31-33min (estol
  >40min = intervenção: afar durações 0,02→0,01 etc.).
