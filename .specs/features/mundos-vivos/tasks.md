# Tasks: Mundos vivos — cenário, vilas, NPCs e animais

Status: ⬜ pendente / ✅ feito · `[P]` paralelo

| # | Task | Dep | Status |
|---|------|-----|--------|
| T1 | Spec + tasks | — | ✅ |
| T2 | **Fase 1**: geração dos assets de cenário (folhagem ×3 conjuntos + casas/fogueira via presets Foliage/Character&Props, `style_asset_ids` do herói) + corte em `testes/prepara-cenario.js` + PNGs em `assets/cenario/` | T1 | ✅ (31 peças: 27 folhagens 12-22px + 3 casas 35-38px + fogueira 28×21; IDs em `spritecook-assets.json`) |
| T3 | **Fase 1**: `js/assets.js` manifesto `cena` na mesma `carga` + `Mapas.LISTA.folhagem` (3 conjuntos × 10 temas) | T2 | ✅ |
| T4 | **Fase 1**: `chunkDe` assa a folhagem (rng do chunk, ~8/chunk, Perlin p/ densidade) + `desenhaObst` desenha `casa`/`fogueira` via `Assets.cena` | T3 | ✅ (folhagem ×1 · casas ×ESC_CENARIO=2 como a árvore) |
| T5 | **Fase 1**: vila por mapa (`vilaDe`, 200-360px do spawn, ≥55px, zona livre central) + merge em `atualizaObstAtivos` + sonda `info().vila` | T4 | ✅ (10/10 mapas com vila — 2-3 casas + fogueira; 2 fixes medidos: busca angular em círculo livre [a estreita morria 60/60] e fogueira opcional no miolo) |
| T6 | **Fase 1**: fumaça (seção nova da vila + tipos estendidos + mapeamento folhagem) + `previa-assets` com seção de cenário + gate | T5 | ✅ |
| T7 | **Fase 2**: `js/ambientais.js` (NPCs na vila + animais por chunk, pool, fuga 60px, y-sort, silenciar) + declarar no `index.html` | T6 | ✅ (pool CAP 12 · auto-sincronização no `info()` p/ ler sem frame — mesmo tratamento do `info().obst`; sem `silenciar` — vidas são mobília do mundo, não efeito transitório) |
| T8 | **Fase 2**: assets de NPC/animal (presets Tiny medieval/Tiny animals) + fumaça (0 impacto em combate/stats, determinismo) + gate | T7 | ✅ (25 NPCs + 4 animais laterais [0,4,8,12] · seção 20b: fuga 1→48px, abates intactos, determinismo) |
| T9 | **Fase 3**: 8 ícones/classe (preset Skill Icons) + ícone nos botões da aba Classe (clique intacto) + gate | T8 | ✅ (4 packs → 32 ícones 14×14 via `pega`+`quadro` no prepara · `UI.button` ganha opção `icon` [retângulo intacto] · fonte 10→9px p/ o nome caber — pior caso119,5px vs 116,4px de hoje) |
| T10 | **Fase 4**: grade Tiny pixel monsters gerada e arquivada (`assets/fonte/` + ID + nota adiado) | T9 | ✅ (`9dade27`) |
| T11 | **Fase 4**: QA visual (previa/cena/ampliar, `JANELA=1280x400`) + docs (AGENTS/CHANGELOG/STATE/README) + spec/tasks concluídos | T10 | ✅ (telas verdes em 16:9 e 1280×400 — vila/vidas/ícones conferidos a olho) |
| T12 | Gate `todos.js` verde ao fim de CADA fase · Push (só com aval do mantenedor) | T11 | ✅ gate (4 fases) · ⬜ push |
| T13 | **Correção pós-QA**: vila frontal reta (regeneração `65f61f50`, fusão 12→50) + `altos` nos animais (14×13/14×16/13×11) + asserção ≤18px + linha de animais no previa + docs da emenda | T12 | ✅ (gate verde; decisão 5-6 na spec) |

## Verificação por task

- **T2/T8/T9**: geração em lote via MCP; arte-fonte em
  `assets/fonte/`, IDs em `spritecook-assets.json`; QA de corte na
  folha do `previa-assets` antes de integrar.
- **T5**: restrições da fumaça seção 20 são CONTRATO — vila nasce
  ≥55px de qualquer obstáculo e fora da zona livre central
  (`|x−192|≥72 OU |y−134|≥64`); se o sorteio não achar vaga, a vila
  encolhe (menos peças) e nunca viola a distância.
- **T5**: merge da vila DEPOIS dos itens de chunk (o `obst[0]` da
  seção 20 e as buscas por `rochas[0]` continuam em chunk).
- **T7**: script novo exige editar `index.html` (`carga.js` lê a
  lista de lá); `js/` em ES5 puro.
- **T6/T8**: RNG de novo cenário segue a regra do mosquetão do topo
  da fumaça (nada de RNG novo de gameplay sem stub no harness).
- **T12**: gate único `node testes/todos.js` (5 arquivos — nenhum
  arquivo novo entra no gate; `prepara-cenario.js` é manual).
