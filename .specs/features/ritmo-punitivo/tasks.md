# Tasks: Ritmo punitivo (Leva 1 do sistema punitivo)

Legenda: `[P]` paralelo · Status: ⬜ pendente / ✅ feito / ❌ falhou

| # | Task | Dep | Status |
|---|------|-----|--------|
| T1 | Spec + tasks (este diretório) | — | ✅ |
| T2 | `js/batalha.js`: `ganhaXP` +3 · extrair `spawnaOnda()` de `proximaOnda` · `penalizaMorte(mult)` na morte (ouro −10% c/ piso 1, onda −5 c/ piso 1, limpa inimigos, `rollbackPend`) · renascimento spawna a onda reduzida sem contar `stats.ondas` | T1 | ✅ |
| T3 | `js/gestao.js`: texto `Cada nível: +3 pontos` | T2 | ✅ |
| T4 | Testes: ajustar teste de nível (+5→+3) e seção nova de penalidade (ouro/onda/piso/fênix/sstats.ondas) | T2-T3 | ✅ |
| T5 | `ritmo.js 50` nos alvos novos (18-22/25-35, mapa 1 45-55min); se fora: curva de XP — documentar decisão | T4 | ✅ |
| T6 | Gate `todos.js` 3× + offline ok | T5 | ✅ |
| T7 | Docs: CHANGELOG `[Unreleased]`, STATE (alvos novos substituem), ROADMAP (iniciativa punitiva), AGENTS/PROJECT (alvos), spec status | T6 | ✅ |
| T8 | Commit `feat(punitivo): …` — push só com aval | T7 | ⬜ |

## Verificação por task

- **T2**: ES5; `penalizaMorte(1)` único ponto da penalidade (Leva 2 vai
  chamar com 2); morte NÃO passa por `proximaOnda` (senão contaria onda
  limpa e incrementaria); Véu da Fênix retorna antes da penalidade.
- **T5**: alvos são números medidos, não estimativa — colar a saída do
  `ritmo.js` na docs.
- **T6**: flake conhecido da 21 — repetir até 3× verdes.
