# Tasks: Save assinado

Status: ⬜ pendente / ✅ feito · `[P]` paralelo

| # | Task | Dep | Status |
|---|------|-----|--------|
| T1 | Spec + tasks | — | ✅ |
| T2 | `js/assinatura.js`: SHA-256 + HMAC em ES5 (`hmac(texto, chave)` → hex) + `index.html` antes de `salvar.js` | T1 | ✅ |
| T3 | `salvar.js`: assinar ao gravar (personagens **e** estado), verificar na leitura, marcador por storage com migração que **reescreve na hora**, preservação do dado rejeitado, `rejeitados()` | T2 | ✅ |
| T4 | `salvar.js`: export assinado + import verificando (sem assinatura = aviso) | T3 | ✅ |
| T5 | `fumaca.js`: 5 confs (HMAC×Node, round-trip, adulteração+preservação, migração, estado) | T4 | ✅ |
| T6 | Iteração visual/manual + gate | T5 | ✅ |
| T7 | Docs (CHANGELOG/ROADMAP/STATE) + commit | T6 | ✅ |

## Verificação por task

- **T2**: sem `crypto.subtle` (file:// e sandbox) nem API nova —
  SHA-256 puro; a prova é o confronto com o `crypto` do Node no teste
  (a implementação errada é o único modo de o teste passar de forma
  falsa).
- **T3**: payload assinado e verificado são **o mesmo**
  `JSON.stringify` do objeto sem `_s` (ordem de chaves igual gravação→
  leitura); `normalizar` descarta `_s` na leitura ⇒ o campo nunca
  entra no jogo em memória.
- **T3**: regra do marcador: só existe "rejeitado" com marcador ativo
  — sem ele migra e **reescreve** (senão o 2º boot rejeitaria o save
  do próprio jogador).
- **T3**: `salvar()` substitui **por id** e mantém as demais entradas
  **como estiverem** (a rejeitada é preservada com o `_s` dela).
