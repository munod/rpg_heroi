# Tasks: Visual dos monstros

Status: ⬜ pendente / ✅ feito · `[P]` paralelo

| # | Task | Dep | Status |
|---|------|-----|--------|
| T1 | Spec + tasks | — | ✅ |
| T2 | `sprite.js`: paleta de monstro em `rampa()` + 3º parâmetro `chave` nas 3 formas + detalhes de espécie | T1 | ✅ |
| T3 | `anim.js`: cache key com `chave` nas 3 formas | T2 | ✅ |
| T4 | `batalha.js`: `spriteInimigo` passa `en.chave` | T3 | ✅ |
| T5 | `previa.js`: espécies nas células livres (QA) | T4 | ✅ |
| T6 | Iteração visual (PNG olhado) + gate | T5 | ✅ |
| T7 | Docs (CHANGELOG/STATE/ROADMAP) + commit | T6 | ✅ |

## Verificação por task

- **T2**: índices 0-6 **iguais aos de hoje** (qualquer teste/leitura
  que os use não muda); `chave === undefined` ⇒ mesmo desenho base;
  assinatura continua compatível com 2 argumentos.
- **T3**: chave concatenada — sem `chave` na key, `visgo` e `drenador`
  (mesma forma/cor?) guardariam o sprite um do outro.
- **T4**: só o desenho — `en.chave` já nasce no spawn (sonda 41).
- **T6**: limite da fumaca (slime >50 px) é piso de "tem desenho",
  não baseline de arte; o julgamento é o PNG.
