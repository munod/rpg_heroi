# Spec: Arena com câmera, mundo 2× e renascimento aleatório (backfill)

Status: **Entregue** — v0.1.0 · Commits: `18ea9e3`

## Objetivo
Dobrar o mundo do jogo (384×268) sem quebrar o layout nem o ritmo: câmera
acompanha o herói, o cenário deixa de ser a janela inteira e a morte passa a
renascêr em local sorteado em vez do centro fixo.

## Requisitos
- **R-CAM-1**: Dimensões separadas em `batalha.js` — `VW/VH` (192×134, janela
  do painel, layout e coordenadas de clique intocados) × `MW/MH` (384×268,
  mundo) — commit `18ea9e3`.
- **R-CAM-2**: Câmera `cam` com lerp (`dt*12`) presa nos limites do mundo,
  roda até pausada (é apresentação), trava em teleporte > 96px e o desenho
  passa por `ctx.translate(vx - cam.x, vy - cam.y)`; `aviso()` ancora os
  banners no centro da janela atual — commit `18ea9e3`.
- **R-CAM-3**: Inimigos nascem em anel de **110–132px** do herói (fora da
  janela), com rejeição de obstáculo/muito perto e canto oposto como
  fallback — preserva o ritmo das ondas no mundo grande — commit `18ea9e3`.
- **R-CAM-4**: Renascimento aleatório por `posicaoAleatoriaSegura()` (longe de
  obstáculos e inimigos, fallback no centro) e, enquanto morto, os inimigos se
  agrupam no **local da morte**; a câmera acompanha o teleporte — commit
  `18ea9e3`.
- **R-CAM-5**: `constroiChao` em `MW×MH`, obstáculos escalados da base
  192×134 (dados de `mapas.js` intactos) e `info()` expondo
  `janela/mundo/cam/heroi` para os testes — commit `18ea9e3`.
- **R-CAM-6**: Remedição medida com `ritmo.js` (câmera/spawn/caminhadas
  atrasavam): anel 121–151 → 110–132, `CUSTO_INICIAL` 150 → 125 e `CUSTO_BASE`
  25 → 21 — commit `18ea9e3`.

## Verificação
- Gate `node testes/todos.js` (193 asserções no total hoje; 129 na época do
  commit).
- `testes/fumaca.js` **seção 17) câmera, mundo maior e renascimento
  aleatório**: janela 192×134 intacta com mundo 384×268, câmera sempre presa
  nos limites, câmera assentada/centrada no herói (tolerância 2px, via pausa
  determinística), 3 ciclos de morte com renascimentos distintos dentro dos
  limites e câmera acompanhando o renascimento.
- `testes/ritmo.js` — medições do commit `18ea9e3`: 1º nível **~42s**, 15min =
  **nv 30–35 / onda 40–60**, mapa 1 fechado em **30,4min** (alvos na faixa do
  `AGENTS.md`).
- `testes/cena.js`: screenshots regenerados com QA visual da câmera; fumaça
  3× estável.
