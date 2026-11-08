# Spec: Estatísticas do jogador (p.stats + aba Stats) (backfill)

Status: **Entregue** — v0.1.0 · Commits: `530ba88`

## Objetivo
Dar ao jogador histórico do que ele fez (abates, dano, tempo jogado) gravado
no save e visível numa aba própria, sem que `personagem.js` passe a depender
de `batalha.js`.

## Requisitos
- **R-STAT-1**: `Personagem.stats` com **8 chaves** — `abates`, `mortes`,
  `danoCausado`, `danoRecebido`, `ondas`, `bosses`, `itens`, `tempo` —
  gravadas no save e completas na leitura por `normalizaStats` (save antigo
  ganha zeradas; `floor` por serem inteiros — o tempo ao vivo soma `dt`
  fracionário; teto 1e9 para storage corrompido) — commit `530ba88`.
- **R-STAT-2**: Chaves espelhadas em `Personagem.STATS` (mesmo espelho de
  `BONUS_ITENS`): `personagem.js` não depende de `batalha.js` — commit
  `530ba88`.
- **R-STAT-3**: `Batalha.stat(chave, n?)` centraliza os incrementos: dano
  causado nos 5 pontos de aplicação (corpo a corpo, projétil na chegada,
  varredura, nuke e tick de veneno), dano recebido + mortes em `danoHeroi`,
  abates/bosses em `mataInimigo`, itens em `soltaItens` e ondas em
  `proximaOnda` (a 1ª onda não conta; a onda 100 conta no ramo do chefe) —
  commit `530ba88`.
- **R-STAT-4**: `tempo` só corre em `atualizar(dt, true)` — o `true` vem só
  do update de `jogo.js`: simulação offline e pausa **não** contam como tempo
  jogado — commit `530ba88`.
- **R-STAT-5**: 5ª aba **Stats** do painel, grade nova de abas (botões de
  66px com passo 70, centros 445/515/585/655/725 em y=54), com as 8 linhas
  e cliques das abas atualizados em `fumaca`/`cena` — commit `530ba88`.
- **R-STAT-6**: Formatação própria em pt-BR: milhar (`milhar`) e tempo humano
  (`tempoHumano`: `45s`/`12min`/`2h13min`), sem locale do ambiente — commit
  `530ba88`.

## Verificação
- Gate `node testes/todos.js` (193 asserções no total hoje; 174 na época do
  commit = 161 de fumaça + 13 da grade).
- `testes/fumaca.js` **seção 21) estatísticas do jogador (Personagem.stats)**
  (+9 confs): 8 chaves numéricas, round-trip do save preservando stats
  (descontando o `floor` do tempo), save antigo ganha os campos zerados,
  contagem ao vivo de abates/ondas/dano/tempo, dano recebido quando o inimigo
  acerta, pausa não acumula tempo, morte incrementa `mortes` e aba Stats
  clicável na 5ª coluna (`clique(412 + 4*70 + 33, 54)` → texto `Abates`).
- `testes/cena.js` ganhou o capture **`tela-stats.png`** para QA visual.
