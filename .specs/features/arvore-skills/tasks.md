# Tasks: Árvore de skills maior (8 skills, ramos, loadout escalonado)

Status: ⬜ pendente / ✅ feito · `[P]` paralelo

| # | Task | Dep | Status |
|---|------|-----|--------|
| T1 | Spec + tasks | — | ✅ |
| T2 | `skills.js`: 12 skills novas (tabela da spec) + `limite(nivel)` (3/4/5) + `LIMITE = 5` | T1 | ✅ |
| T3 | `skills.js`: sistema de ramos — dados dos 32×2 (mods + efeito), `comRamo`, merge em `carregadas` (base neutra sem escolha, `aCada` arredondado) + `dicas` com estados | T2 | ✅ |
| T4 | `personagem.js`: `ramos` em `novo`/`normalizar` (só strings, default null) + `normalizaLoadout` teto 5 (espelho) | T3 | ✅ |
| T5 | `gestao.js`: grade 2×4 da aba Classe + botão de ramo (ciclo base→A→B) + contadores/toasts por `limite(nivel)` + tooltips | T3 | ✅ |
| T6 | `batalha.js`: aviso de level-up quando o teto do loadout sobe (nv 50/150) | T2 | ✅ |
| T7 | Testes: seção 43 + atualizações 16/25 + screenshots `cena.js` | T2-T6 | ✅ |
| T8 | Gate 3× | T7 | ✅ |
| T9 | Sanidade: `ritmo.js 2400` ≥2 runs vs faixa (mapa 29-36 · nv 2600-3300) | T8 | ✅ |
| T10 | Docs + commit | T9 | ✅ |

## Verificação por task

- **T3**: `comRamo` é fonte única do merge — `carregadas` só repassa;
  a batalha NÃO muda (ela lê campos). Teste de sidegrade (≥1 buff e ≥1
  nerf por ramo, tabela de sentido) falha em dado mal autorado.
- **T4**: espelho do teto absoluto (5) em `normalizaLoadout` — a fatia
  por nível fica só em `Skills` (personagem.js não depende de skills.js).
- **T7**: seção 25 usa `nv 45` (teto 3) — o auto de 3 permanece, a
  asserção que muda é a migração (teto 5). `cena.js`: capturar a aba
  Classe com loadout cheio e um ramo alternado.
- **T9**: ≥2 runs (a leva anterior mostrou que 1 run não discrimina);
  comparar MAPA/NV, não mortes.
