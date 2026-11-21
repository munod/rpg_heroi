# Tasks: Visual skills — assinatura por tipo estilo Vampire Survivors

Status: ⬜ pendente / ✅ feito · `[P]` paralelo

| # | Task | Dep | Status |
|---|------|-----|--------|
| T1 | Spec + tasks | — | ✅ |
| T2 | `efeitos.js`: pools `zonas/ondas/feixes` + singleton `carga` + `nuvem`/`rastro` + `escala(nv)` + missil de rastro denso · `silenciar`/`limpar`/`qtd`/`info()` | T1 | ✅ |
| T3 | `efeitos.js`: desenho — `desenharBaixo` (zonas/ondas) · `desenharTopo` (feixes/carga aditivos) | T2 | ✅ |
| T4 | `batalha.js`: assinatura por tipo (area/nuke/cura/veneno/mobilidade/medo) + escala `nvSkill` nos call sites + flash de nuke `mult ≥ 2,5` | T3 | ✅ |
| T5 | Testes: seção 56 (tetos, silenciar, receitas, escala, integracionais) + reparos | T4 | ✅ |
| T6 | Gate 3× + `ritmo 60` sanidade 1× | T5 | ✅ |
| T7 | QA visual (cena PNGs + navegador) | T6 | ✅ |
| T8 | Docs (CHANGELOG, AGENTS, STATE, ROADMAP) + commits | T7 | ✅ |
| T9 | Push (por último — aval do mantenedor) | T8 | ⬜ |

## Verificação por task

- **T2**: TODA receita respeita `mudo` (simulação offline não gasta);
  `carga` é singleton — `silenciar`/`limpar` zeram; `qtd()` soma os
  pools novos (contrato da seção 49: `limparEfeitos` → `qtd === 0`).
- **T3**: só primitivas do rasterizador (`ellipse+fill`,
  `fillRect`, `drawImage`+`globalAlpha`) — **borda via `anelSprite`
  escalado**, nunca `stroke()` de elipse.
- **T4**: escala NUNCA toca dano/tempo (só raio/contagem); `nv 0` =
  efeito idêntico ao de hoje (baseline); flash atrás de
  `Opcoes.liga('flash')` (já é gate interno do `flashTela`).
- **T5**: RNG extra pode deslocar fixtures da seção 16 — se cair,
  reduzir draws na receita, nunca afrouxar o teste.
- **T6**: ritmo esperado intacto (visual puro) — comparar com o
  registro do STATE; estol >40min = investigar.
