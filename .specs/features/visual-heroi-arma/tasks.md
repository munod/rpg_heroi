# Tasks: Visual do herói e das armas

Status: ⬜ pendente / ✅ feito · `[P]` paralelo

| # | Task | Dep | Status |
|---|------|-----|--------|
| T1 | Spec + tasks | — | ✅ |
| T2 | `sprite.js`: motor de cor (rampas HSL com hue-shift + paleta por material) | T1 | ✅ |
| T3 | `sprite.js`: poses do herói autoradas em grid-texto (9 frames) + overlays de cabelo (5) e classe (4) | T2 | ✅ |
| T4 | `personagem.js`: `lookDe` expõe `classe` e `rar` (sem mudar save) | T3 | ✅ |
| T5 | `sprite.js`: `armaDesenhar` com largura/guarda/cabo/gema + raridade | T4 | ✅ |
| T6 | `anim.js`: cache key com `classe` e `rar` | T5 | ✅ |
| T7 | Testes: `grade.js` (legenda + asserções novas) e conferência dos limites da `fumaca` | T6 | ✅ |
| T8 | Iteração visual: `previa.js`/`cena.js` → PNGs olhados e ajustados | T7 | ✅ |
| T9 | Gate `todos.js` | T8 | ✅ |
| T10 | Docs (CHANGELOG/STATE/ROADMAP) + commit | T9 | ✅ |

## Verificação por task

- **T2**: `rampa()` devolve 4 tons distintos para qualquer cor de
  entrada (nunca repetir índices por acidente) e `shade` segue
  exportado — a legenda do `grade.js` depende dele.
- **T3**: grade continua **20×20** com corpo em `x=8`, pés em
  `y=19/20` e colunas 13–19 livres (âncoras de `desenhaHeroi` não
  mudam) — as contagens de frame ficam 2/4/3 pra não tocar em
  `batalha.js`.
- **T4**: `lookDe` só **acrescenta** campos derivados; `p.look` e
  `normalizar` intactos (save não muda de formato).
- **T6**: key da cache é string concatenada — esquecer `classe`/`rar`
  deixa sprite velho após trocar de classe ou equipar item melhor.
- **T7**: asserções que mudam de coordenada/cor são atualizadas
  **de propósito** e documentadas (o `grade.js` é contrato de
  posição, não baseline de arte).
