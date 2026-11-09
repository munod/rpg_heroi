# Tasks: Ajustes playtest 2 (recarga piso · cooldown Stats · teto 1000 · ranking)

Status: ⬜ pendente / ✅ feito · `[P]` paralelo

| # | Task | Dep | Status |
|---|------|-----|--------|
| T1 | Spec + tasks | — | ✅ |
| T2 | Mapear: `desenhaStats`, `Input` (wheel), cabeçalho `jogo.js`, `ganhaXP`, `normalizar`, exports de `ia.js` | T1 | ✅ |
| T3 | **B**: `recarga = max(0,08; 35/vel)` + seção 34 atualizada + emenda na spec `velocidade-curva` | T2 | ✅ |
| T4 | **D**: `NIVEL_MAX=1000` (ganhaXP/normalizar/cabeçalho) + `ganhaXP` exportado | T2 | ✅ |
| T5 | **C**: bloco de cooldowns na aba Stats + rolagem (Input wheel + thumb) | T2 | ✅ |
| T6 | **A**: `ultimoEnvio`/motivos/toasts/file:// + status na cena + `top()` detecta file | T2 | ✅ |
| T7 | Testes: seções 36 e 37 | T3-T6 | ✅ |
| T8 | Gate 3× + `ritmo.js` 4 runs na faixa + sim longa até nv1000 | T7 | ✅ |
| T9 | Docs (CHANGELOG emenda, STATE, AGENTS, README, ROADMAP, specs) + commit | T8 | ✅ |

## Verificação por task

- **T3**: ES5; DES 8 intacto (0,500s — início do jogo não muda);
  seção 34 perde o assert `35/vel` puro e ganha `max(0,08;…)` + teto.
- **T4**: clamp na LEITURA (`normalizar`) — save legado não quebra;
  XP descartado = early return ANTES de somar; "MÁXIMO" usa marcador
  exclusivo (não "Força"-style genérico).
- **T5**: sem `ctx.clip` (rasterizador) — pula linha fora da faixa;
  thumb só desenha se conteúdo > visível; wheel zerado no `endFrame`
  (padrão `typed`); arrasto usa `Input.mouse` (toque já mapeia).
- **T6**: dica única por sessão p/ sem-apelido e file:// (senão a morte
  spama toast); `nao-melhor` e `desativado` silent (não são falha);
  toast chega via `Gravacao.msg` — jogo precisa estar na cena `jogo`
  p/ desenhar (fixture navega).
- **T8**: piso 0,08 só liga em DES ≳ 130 — esperado: ritmo intacto;
  medir mesmo assim (regra do projeto).
