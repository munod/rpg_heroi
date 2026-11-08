# Spec: Mapas temáticos, chefe por mapa e equilíbrio contínuo (backfill)

Status: **Entregue** — v0.1.0 · Commits: `48b4ed4`, `590fae7`

## Objetivo
Trocar o ciclo infinito de ondas por **3 mapas temáticos de 100 ondas** com
chefe no fim, drops e monstros próprios, e corrigir o bug em que a dificuldade
resetava a cada mapa (as primeiras ondas dos mapas seguintes eram papel
picado para o herói de fim de mapa anterior).

## Requisitos
- **R-MAP-1**: Ciclo de `FIM_MAPA` (100) ondas por mapa: a onda 100 é o
  chefe; vencido, `passaMapa()` avança para o próximo e volta à onda 1 —
  commit `48b4ed4`.
- **R-MAP-2**: 3 mapas + modo infinito (tema do último com força crescente) e
  novo `js/mapas.js` com a tabela `MAPAS[]` (chão, obstáculos, inimigos,
  chefe) e `Mapas.forca(n)` multiplicando vida/dano/XP — commit `48b4ed4`.
- **R-MAP-3**: Novos monstros morcego e aranha (sprite + caches) e inimigos
  que nascem com cor/escala/forma do mapa via `spawn(def)` — commit
  `48b4ed4`.
- **R-MAP-4**: Estado salvo passa a guardar `mapa`; `Salvar.lerEstado` migra
  saves legados **na leitura** (onda 250 → mapa 3, onda 50) sem rewrite —
  commit `48b4ed4`.
- **R-MAP-5**: UI do mapa: título `MAPA N`, banner `MAPA N — nome` no avanço e
  aviso do chefe com o nome dele (`BOSS! <nome>`) — commit `48b4ed4`.
- **R-MAP-6**: Escala de ondas **contínua** por `ondaTotal()` =
  `(mapa-1)×100 + (onda-1)` aplicada a vida, dano, velocidade da onda,
  contagem de inimigos, limiar do raro e XP (`4 + (total+1)×2 + xpExtra`) —
  commit `590fae7`.
- **R-MAP-7**: `Mapas.forca` sai da equação de combate e fica só nos drops de
  item; o mapa 1 permanece byte-idêntico (`total = onda-1`) — commit
  `590fae7`.

## Verificação
- Gate `node testes/todos.js` (193 asserções no total hoje; 155 na época de
  `590fae7`).
- `testes/fumaca.js` **seção 12) chefe do fim de mapa e avanço de mapa**:
  modo infinito reutiliza tema e escala, onda 100 nasce com chefe, vencer
  avança para o mapa 2 (recomeça na onda 1, chefe não fica preso, banner
  `MAPA 2`) e o mapa 2 tem chefe próprio; **seção 14)** migração de save
  legado (onda 250 → mapa 3, onda 50) e rejeição de save corrompido.
- `testes/cena.js` gera `tela-mapa2.png` (e `tela-boss.png`) para QA visual.
- `testes/ritmo.js` — medições do commit `48b4ed4`: mapa 1 fecha em
  **~28min** (alvo 25–35) e 60min chega ao mapa 3; de `590fae7`: 15min =
  1º nível **44,4s**, **nv 33 / onda 54**; 60min = chefe do mapa 1 em
  **28,5min**, mapa 1 fechado em **29,3min**, mapa 2 onda 10 em **+135s**
  após o troco, 45min = mapa 2 onda 67, 60min = mapa 3 onda 15 (linha
  `mapa 2: onda 10 em +Ns` criada nesse commit).
