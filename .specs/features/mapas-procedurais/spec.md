# Spec: Cenário procedural com Perlin Noise (backfill)

Status: **Entregue** — v0.1.0 · Commits: `ad65530`

## Objetivo
Substituir o chão aleatório e os obstáculos de coordenadas fixas por um
cenário **gerado proceduralmente e determinístico**: mesmo mapa = mesmo layout
em qualquer sessão, sem que os testes e screenshots dependem de aleatoriedade.

## Requisitos
- **R-PROC-1**: Novo `js/perlin.js`: ruído de Perlin melhorado 2D sobre tabela
  de permutação embaralhada com `mulberry32`, API
  `definirSemente/sorteio/ruido/valor` — commit `ad65530`.
- **R-PROC-2**: **A semente é o número do mapa** — mesmo mapa reproduz o
  layout exato em qualquer sessão (testes e screenshots dependem disso); mapa
  novo (inclusive modo infinito) = layout novo — commit `ad65530`.
- **R-PROC-3**: `constroiChao` passa a amostrar manchas orgânicas do campo
  (duas faixas do ruído para os 2 tons do tema, células de 4px) no lugar de
  36 elipses aleatórias, com flores em cachos (banda estreita do ruído) e
  cascalho por sorteio com semente — commit `ad65530`.
- **R-PROC-4**: `constroiObst` gera posições por sorteio **filtradas** pelo
  ruído: só em clareira, centro livre (spawn/renascimento) ≥ 36×32 base,
  ≥ 30 de base entre vizinhos, densidade e tipos vêm do tema — commit
  `ad65530`.
- **R-PROC-5**: O sorteio de obstáculos é **independente** da semente do
  ruído (trocar o chão não mexe nos obstáculos) — commit `ad65530`.
- **R-PROC-6**: `Batalha.garanteCenario()` semeia o Perlin antes de
  construir; `mapas.js` vira `obst = {tipos, qtd}` (coordenadas fixas viraram
  dados mortos) e `info().obst` expõe o layout para os testes — commit
  `ad65530`.

## Verificação
- Gate `node testes/todos.js` (193 asserções no total hoje; 165 na época do
  commit = 152 de fumaça + 13 da grade).
- `testes/fumaca.js` **seção 20) cenário procedural: Perlin Noise com semente
  do mapa** (+10 confs): mesma semente reproduz exatamente o mesmo campo,
  semente diferente gera outro campo, `ruido(0,0)` na faixa `[-1, 1]`,
  `sorteio(s)` devolve a mesma sequência, mapa 1 com obstáculos procedurais
  (≥ 4, tipos do tema `tree`/`rock`), área central livre para
  spawn/renascimento, obstáculos afastados (≥ 55px de mundo), mapa 2 com
  layout próprio e **volta ao mapa 1 reproduzindo o mesmo layout**.
- `testes/cena.js` + `testes/previa.js` regeneram os PNGs com QA visual do
  chão (manchas orgânicas, centro limpo) — os PNGs ficam fora do
  versionamento (`.gitignore`).
