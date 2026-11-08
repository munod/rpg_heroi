# Tasks: Eventos aleatórios (Leva 2 do sistema punitivo)

Legenda: `[P]` paralelo · Status: ⬜ pendente / ✅ feito / ❌ falhou

| # | Task | Dep | Status |
|---|------|-----|--------|
| T1 | Spec + tasks (este diretório) | — | ✅ |
| T2 | `js/eventos.js` (novo): rolagens por onda (Açougueiro 1,5%+pity0,5% teto25% desde onda10 · Gatuno 2,5% só ouro>0 cooldown3), estado (roubo, timers, despawn por timeout), recompensas puras; carregar no `index.html` antes de `batalha.js` | T1 | ✅ |
| T3 | `js/batalha.js`: hook em `spawnaOnda` (nasce evento) · TIPOS/flags `acougueiro` (hp×5 dano×1,6) e `gatuno` · fuga p/ borda em `atualizaInimigos` · despawn (timeout no update; morte do herói → despawn na revivência) · `penalizaMorte` com mult2 se Açougueiro em campo · recompensas em `mataInimigo` (ouro×10, XP×4, resgate×1,2, stats) · lendário garantido em `soltaItens` · `info().acougueiro/gatuno` | T2 | ✅ |
| T4 | `js/personagem.js`: STATS + `gatunos`/`acouigueiros` (espelho; `normalizaStats` zera sozinho) · `js/gestao.js`: aba Stats 10 linhas × 22px | T3 | ✅ |
| T5 | Testes: seções 28/29 | T2-T4 | ✅ |
| T6 | `ritmo.js 50` re-medido na faixa + gate 3× | T5 | ✅ |
| T7 | Docs: CHANGELOG, STATE/ROADMAP, AGENTS, spec/tasks | T6 | ✅ |
| T8 | Commit `feat(eventos): …` — push só com aval (no fim, v0.3.0) | T7 | ⬜ |

## Verificação por task

- **T2**: ES5; sem dependência de carregamento (só runtime); puro o
  bastante p/ teste unitário (timeout/pity/cooldown sem arena).
- **T3**: `spawn`/laços de inimigos intactos (gatuno é entity com branch,
  não vira IA normal); despawns fora do laço decrescente (ponto seguro =
  revivência/update); penalidade ×2 verificada relativamente ao frame.
- **T6**: se algum alvo sair da faixa (ouro ×10 inflaciona a economia?),
  ajustar APENAS números de evento — nunca a curva base — e documentar.
