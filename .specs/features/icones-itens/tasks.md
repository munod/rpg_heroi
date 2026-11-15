# Tasks: Ícones de item na aba Itens

Status: ⬜ pendente / ✅ feito · `[P]` paralelo

| # | Task | Dep | Status |
|---|------|-----|--------|
| T1 | Spec + tasks | — | ✅ |
| T2 | `sprite.js`: `iconeCanvas(tipo, cor)` — 5 ícones 16×16 em grid de texto | T1 | ✅ |
| T3 | `anim.js`: `Anim.icone(tipo, cor)` com cache | T2 | ✅ |
| T4 | `gestao.js`: chips + textos deslocados nos slots e nas linhas da bolsa (max 17/13/29) | T3 | ✅ |
| T5 | `cena.js`: screenshot `tela-itens.png` com itens equipados (spec manda olhar) | T4 | ✅ |
| T6 | Iteração visual + gate (cliques existentes intactos) | T5 | ✅ |
| T7 | Docs (CHANGELOG/ROADMAP/STATE) + commit | T6 | ✅ |

## Verificação por task

- **T2**: paleta própria do ícone (metal/madeira/couro + acento da
  raridade passado como HEX — `sprite.js` **não** pode importar
  `itens.js`, regra do repo).
- **T4**: nenhum retângulo de clique pode engolir contrato: linha da
  bolsa segue cobrindo `(584,216)` e `(584,246)` (444 ≤ 584 ≤ 688) e
  `(500,96)` continua **fora** de botão algum.
- **T4**: `Itens.linha` só trunca o NOME — `★`/`-15HP` estão no `d`
  e as asserções 15/26 têm que continuar verdes.
