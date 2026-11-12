# Tasks: Gestão de atributos (pontos escassos + soft caps + Carisma)

Status: ⬜ pendente / ✅ feito · `[P]` paralelo

| # | Task | Dep | Status |
|---|------|-----|--------|
| T1 | Spec + tasks | — | ✅ |
| T2 | `batalha.js`: 1 ponto a cada 3 níveis (contador por evolução) + rodapé | T1 | ⬜ |
| T3 | `personagem.js`: soft cap `46 + k·DES^0,35` (k p/ 70 em DES 8) + clamp 250 final + espelho `statusDetalhado` | T1 | ⬜ |
| T4 | `itens.js`: bonus de `vel` com escala limitada | T3 | ⬜ |
| T5 | `batalha.js`: regen com teto em hp/s (HP intocado) | T1 | ⬜ |
| T6 | Carisma: remove `xpMult` (4 pontos) · vira `+ouro` log · clérigo `danoMod:'car'` + bônus | T1 | ⬜ |
| T7 | Testes: seção nova (ritmo, clamp, afixo, regen, ouro, clérigo, espelho) + reparo (2, 7, rodapé, Stats) | T2-T6 | ⬜ |
| T8 | Gate 3× | T7 | ✅ |
| T9 | **Medição comparativa** `ritmo.js 2400` vs run de referência (mapa 35 · 6 mortes · ouro 59M) + relatório ao mantenedor | T8 | ✅ |
| T10 | Docs (CHANGELOG, AGENTS, STATE, ROADMAP) + commit | T9 | ✅ |

## Verificação por task

- **T2**: 3 níveis numa mesma leva de XP creditam 1 ponto exatamente;
  saves antigos com pontos acumulados continuam válidos (normalizar não
  mexe em `p.pontos` além do clamp).
- **T3**: `status().vel` e `statusDetalhado().vel.total` idênticos em
  qualquer build (regra dos espelhos); início **70** intacto; **250 é
  inatingível pelo atributo sozinho** (só com item) — o clamp é que
  vale.
- **T5**: regen no early inalterada (≈ hp×4%); teto visível só no
  late. Se a medição (T9) mostrar estol/mortes demais, o teto sobe.
- **T9**: decidir **pela comparação com a referência**, não por
  sensação (o `ritmo.js` segue suspenso como decisor de gosto — aqui ele
  só serve para "não quebrou o que estava validado").
- **T9 RESULTADO (2400min)**: **sem** a compensação 9× → **ESTOL**
  (mapa 3, 223 mortes, +0,1 nv/min); **com** → **mapa 36 · nv 3224 ·
  +1,0 nv/min · 20 mortes (0,5/h = eventos) · ouro 72,7M** vs
  referência *mapa 36 · nv 3260 · +0,9 · 6 mortes · 59,9M* — **mesmo
  mapa, nv com 1,1% de diferença**. A progressão de decisão nova
  (0,7 decisões/min) não quebrou o que estava validado.
