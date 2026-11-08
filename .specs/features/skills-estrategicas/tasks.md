# Tasks: Skills estratégicas (Leva C de `gestao-estrategica`)

Legenda: `[P]` paralelo · Status: ⬜ pendente / ✅ feito / ❌ falhou

| # | Task | Dep | Status |
|---|------|-----|--------|
| T1 | Spec + tasks (este diretório) | — | ✅ |
| T2 | `js/skills.js`: `LIMITE = 3`, `carregadas(p)` (interseção + automático = 3 mais avançadas + fallback) | T1 | ✅ |
| T3 | `js/personagem.js`: `KEYSTONES` (4, com efeito em números), `KEY_NIVEL/CUSTO/RESPEC`, `keystoneDe/comprarKeystone/alternarKeystone`, efeitos + clamps finais em `status`, `loadout/keystoneLib/keystoneOn` em `novo/normalizar` | T1 | ✅ |
| T4 | `js/batalha.js`: `skillsVigentes = Skills.carregadas(p)` | T2 | ✅ |
| T5 | `js/gestao.js`: aba Classe 2×2 + linhas das skills (toggle, mín 1/máx 3) + botão do keystone (efeito/custo no rótulo); troca de classe zera loadout | T2-T3 | ✅ |
| T6 | Testes: fumaça seção 25 + atualizar clique do Mago (grade nova) | T2-T5 | ✅ |
| T7 | `ritmo.js 35` na faixa (senão LIMITE 4) + gate `todos.js` (3×) | T6 | ✅ |
| T8 | Docs: CHANGELOG `[Unreleased]`, STATE/ROADMAP, specs, AGENTS | T7 | ✅ |
| T9 | Commit `feat(skills): …` — **push só com aval** | T8 | ⬜ |

## Verificação por task

- **T2**: `ativas` intacta (seção 16 sem mudança); `carregadas` retorna
  ordem de `LISTA` (nível crescente); loadout alheio/vazio → automático.
- **T3**: `status` sem keystone idêntico ao atual (regressão zero);
  com keystone: exatos `round(dano×f)`, `crit+18`, `vel−25` e clamps
  finais (hp≥10, dano≥1, vel≥10, crit0..45); save antigo → 3 campos
  default (null/false/false).
- **T5**: linhas com alvo ≥24px; rótulo do keystone ≤ ~48 chars em 11px;
  clique do Mago atualizado em todos os testes.
- **T7**: seção 16 verde **sem tocar** nela; se ritmo fora da faixa,
  documentar a tentativa (LIMITE 4) antes de mexer em números de skill.
