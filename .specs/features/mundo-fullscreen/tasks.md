# Tasks: Mundo full screen + UI flutuante

Status: ⬜ pendente / ✅ feito · `[P]` paralelo

| # | Task | Dep | Status |
|---|------|-----|--------|
| T1 | Spec + tasks | — | ✅ |
| T2 | **Fase A**: `batalha.js` k=1 (VW/VH dinâmico, `janelaOK`, área livre, região ativa 5×5, HUD na área livre, aviso 30%, poeira 150) | T1 | ✅ |
| T3 | **Fase A**: `jogo.js` mundo vira fundo + título no canto · `efeitos.js` fonte `big` 10→20px | T2 | ✅ |
| T4 | **Fase A**: teste seção 17 (janela-livre 408×432 / mundo 1920×1340) + fix de determinismo (`garanteCenario` sem early-return + `info()` auto-sincroniza a lista ativa) | T3 | ✅ |
| T5 | **Fase B**: anel de spawn dinâmico (`raioSpawn()`, ≈460 em 16:9) + limite de fuga do Gatuno = anel+120 + geometria do gatuno/cofre + `ritmo.js` ≥4 seeds (A/B vs `c983d2e`) + **relatório de drift ao mantenedor** | T4 | ✅ (relatório em `relatorio-ritmo-faseB.md`; reequilíbrio = decisão do mantenedor, ⬜) |
| T6 | **Fase C**: `UI.janela`/`UI.barra` · `Gestao` flutuante (título=X, botão X, estado `aberta`) + `Gestao.barra`/`abasGeom` · barra de abas no rodapé · card flutuante no lugar da faixaTopo · Opções no canto (W−72,8) · toast topo-centro · `linhaStatus` com fundo | T5 | ✅ |
| T7 | **Fase C**: remapear ~56+10 cliques de aba (barra centrada, dx/2 em wide) + conf X fecha/reabre | T6 | ✅ |
| T8 | **Fase D**: QA visual (cena/ampliar/previa-assets), `CHANGELOG [Unreleased]`, `STATE`, `AGENTS` (contrato das abas, janela 192×134, anel 110-132), `README` | T7 | ⬜ |
| T9 | Gate `todos.js` verde ao fim de CADA fase | T2-T8 | ✅ (A) ⬜ (B-D) |
| T10 | Push (só com aval do mantenedor) | T9 | ⬜ |

## Verificação por task

- **T2**: `info().janela` = `{livre, 432}` (área `Game.W−360`) — os testes
  de câmera (`cam = herói − janela.w/2`) valem com o literal trocado;
  `info().mundo` = `(2·ncx+1)×(2·ncy+1)` chunks com raio derivado da
  janela + `raioSpawn()`.
- **T4**: a seção 20 falhou na primeira rodada por DOIS gatilhos do
  tamanho novo: (a) lista ativa stale (raio da seção 19, lida sem
  frame) → `info()` chama `atualizaObstAtivos()`; (b) `obstChunk`
  gerado com o ruído ambiente errado (semente 7 do teste de Perlin
  logo acima) → `garanteCenario` reseedeia e reconstrói SEMPRE
  (removido o `if (cenarioMapa === mapa) return`).
- **T5**: anel NOVO é alvo de ritmo — gate `todos.js` NÃO cobre
  `ritmo.js`; drift reportado ao mantenedor ANTES de qualquer
  reequilíbrio (rebalance = decisão separada).
- **T5**: fixture do cofre trocou `restaurarOnda(1)` (onda nascia no
  frame 1 e o herói passava a janela toda perseguindo monstros a
  ~460px — FALHA medida: 7 frames de subida) por `iniciar()`
  (~1s de campo vazio, herói na clareira central do chunk); a
  caminhada com WALK é a mesma intenção. Cena: luta/boss/mapa2
  ganharam frames de aproximação (~5-6s do anel novo).
- **T7**: barra centrada em W — em wide-screen desloca **dx/2** (hoje
  os cliques usam `+dxL`); usar `Gestao.abasGeom()` onde derivar for
  frágil. Opções `(584,15)` → `(W−40,20)`.
- **T7**: a barra é desenhada ANTES da janela (jogo e seleção) — o
  clique troca a aba e o conteúdo do MESMO frame já sai na aba nova
  (mesmo frame único das abas antigas dentro do painel).
- **T7**: dicas persistente/topo precisam de posição própria:
  `Gravacao.desenharAviso(ctx, dica, y, minX)` — jogo usa
  `(…, 4, 408)` (pill à direita do card; texto ≤33ch p/ caber antes
  do Opções) e seleção usa `(…, 340)` (faixa livre acima do rodapé).
- **T7**: flakes de fixture medidos e corrigidos nesta fase (4/4
  verdes): (a) cota de 30s do teste de rollback — `restaurarOnda(90)`
  (≤ FIM_MAPA; acima cai em `passaMapa`) p/ morte antes da cota;
  (b) caminhada do cofre a −54px (dentro da clareira — a −100 saía
  da clareira e grudava em árvore); (c) ondas 120 do `restaurarOnda`
  viram `passaMapa` e rejeitavam o spawn (cascadeava 3 confs).
