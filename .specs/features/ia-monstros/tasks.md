# Tasks: IA de monstros — flocking (separação) e influence map

Status: ⬜ pendente / ✅ feito · `[P]` paralelo

| # | Task | Dep | Status |
|---|------|-----|--------|
| T1 | Spec + tasks | — | ✅ |
| T2 | `ia.js`: mapa de influência — grade 16px, camadas ocupação (repinta por frame) + obstáculo (lazy por raio), `pintaMapa`/`celulaOcup`/`celulaObst` | T1 | ✅ |
| T3 | `ia.js`: `separacao(en, inimigos)` (só monstro×monstro, cap 10px, 0 com 1 monstro) + integração em `atualizaInimigos` (`alvo += sep` + clamp 12,5px; medo/fuga/morto sem sep) | T2 | ✅ |
| T4 | `ia.js`: `destinoCerco(en, heroi)` — 12 candidatos a 11px, score = ocupação×3 + obstáculo + preferência do slot; `decideInimigo` usa p/ ast ≥0,35 (fallback = slot atual) | T2 | ✅ |
| T5 | `batalha.js`: chamar `IA.pintaMapa` no topo de `atualizaInimigos` + sonda `x,y` em `info().bichos` | T2-T4 | ✅ |
| T6 | Testes: seção 44 (mapa, separação, destino, integração) + `pintaMapa([],…)` na fixture da seção 23 + reparos | T2-T5 | ✅ |
| T7 | Gate 3× | T6 | ✅ |
| T8 | Sanidade: `ritmo 60` (mapa 1 = 31-33min) + `ritmo 2400` ≥2 runs vs banda (mapa 29-36 · nv 2600-3300) — estourou? afro os novos mecanismos | T7 | ✅ |
| T9 | Docs + commit | T8 | ✅ |
| T10 | Push (só com aval) | T9 | ⬜ |

## Verificação por task

- **T3**: o clamp de 12,5px é o que mantém o monstro ATA CANDO — sem
  ele, destino fora de 13px = `distH >13` para sempre e o golpe nunca
  sai (regra do ramo de ataque em `atualizaInimigos`).
- **T4**: `destinoCerco` lê o mapa **pintado neste frame**; fixtures
  diretas (seção 23) chamam `pintaMapa([], heroi)` antes — sem isso a
  ocupação residual de testes anteriores pode girar o slot.
- **T6**: seção 23 é CONTRATO (null p/ burro, raio exato 11,
  destinos distintos) — se algo ali quebrar, a integração está errada,
  não o teste.
- **T8**: ≥2 runs (a série já mostrou que 1 run não discrimina);
  comparar MAPA/NV, não mortes. Alavancas de ajuste na ordem da spec
  (R-IA5-7) — nunca as curvas antigas.
