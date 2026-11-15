# Tasks: Visual do cenário

Status: ⬜ pendente / ✅ feito · `[P]` paralelo

| # | Task | Dep | Status |
|---|------|-----|--------|
| T1 | Spec + tasks | — | ✅ |
| T2 | `sprite.js`: `treeCanvas` e `rockCanvas` com rampas + luz | T1 | ✅ |
| T3 | `batalha.js`: `desenhaCofre` com tampa/faixas/fechadura | T2 | ✅ |
| T4 | `batalha.js`: flores em faixa larga + cacho (fora da linha pontilhada) | T3 | ✅ |
| T5 | Iteração visual (previa + screenshots) + gate | T4 | ✅ |
| T6 | Docs (CHANGELOG/STATE/ROADMAP) + commit | T5 | ✅ |

## Verificação por task

- **T2**: grade **20×26** (árvore) e **14×11** (pedra) intactas —
  `desenhaObst` desenha no tamanho nativo; piso da fumaca
  (>150 / >40 px) continua valendo.
- **T3**: só `fillRect`/`strokeRect` (o `cena.js` não tem `arc`/`stroke`
  com caminho — derruba a screenshot).
- **T4**: a mudança é na APLICAÇÃO das cores do tema, não nas paletas
  (`Mapas.LISTA` intocado) — mesma semente ⇒ mesmo chão.
