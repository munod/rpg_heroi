# Tasks: Curvas de velocidade (recarga sem piso + sub-passos)

Status: ⬜ pendente / ✅ feito · `[P]` paralelo

| # | Task | Dep | Status |
|---|------|-----|--------|
| T1 | Spec + tasks | — | ✅ |
| T2 | `js/personagem.js`: `recarga = 35/vel` sem piso + comentário | T1 | ✅ |
| T3 | `js/batalha.js`: `mover()` com sub-passos ≤4px + `resolve()` por fração · comentário do atkDur (linha "piso de 0,15s") · `info().obst` ganha `r` | T1 | ✅ |
| T4 | Testes: seção 34 (recarga exata sem piso + propriedade de atravessamento) | T2-T3 | ✅ |
| T5 | Gate 3× + `ritmo.js 50` na faixa | T4 | ✅ |
| T6 | Docs (CHANGELOG, STATE, AGENTS, README se preciso, spec/tasks) + commit | T5 | ✅ |

## Verificação por task

- **T2**: ES5; `vel ≥ 10` garante recarga ≤ 3,5s; DPS do rodapé usa a
  mesma fonte (`s.recarga`) — nada a ajustar, só conferir número.
- **T3**: sub-passo mantém o padrão eixo-a-eixo (x→resolve→y→resolve)
  de cada fração; `n = ceil(d/4)` — pior caso DES 999 ≈ 13 iterações.
  `r` no `info()` é só leitura p/ teste (arredondar? NÃO — fração
  importa na propriedade geométrica).
- **T4**: propriedade precisa diferenciar os códigos: SEM sub-passos o
  segmento de 25px corta o miolo com os dois extremos longos → falha;
  COM sub-passos todo contato projeta um extremo na borda → não acusa.
- **T5**: se o ritmo sair da faixa (itens com vel > 233 encurtam a
  recarga), documentar — nunca ajustar por engano.
