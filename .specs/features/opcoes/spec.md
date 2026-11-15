# Spec: Opções do jogo (overlay com toggles de apresentação)

Status: **concluída** (gate = 725 confs, 14 delas na seção 52) · Data: 2026-11-15 ·
Iniciativa: mantenedor ("criar uma aba de opções... opção pra não tremer a tela e etc").

## Contexto

- Hoje `shake`, `flash`/`vinheta`, números flutuantes e poeira ambiente
  são **incondicionais** — reclamação explícita de "não tremer a tela"
  (fotosensibilidade/conforto). Não existe nenhuma tela de opções.
- Decisão do mantenedor: **overlay + botão** (não 6ª aba da Gestão — a
  grade de abas 445..725 é contrato de teste; não dentro da pausa).
- Defaults **= comportamento atual** (tudo ligado) → nenhum teste
  existente muda (fumaça seção 49 depende do shake ligado).

## Requisitos

- **R-OP-1 (módulo `js/opcoes.js`)** — `Opcoes.liga(chave)` /
  `Opcoes.alterna(chave)` / `Opcoes.estado()`; chaves:
  `shake · flash · num · poeira`. Persistência em
  **`rpg_opcoes_v1`** (`localStorage`, try/catch — espelho do padrão de
  `salvar.js`); leitura faz merge com o padrão (chave ausente = ligado).
  Declarado no `index.html` **antes de `efeitos.js`** (carga lê o
  index, `carga.js` não muda).
- **R-OP-2 (gates)** — em `efeitos.js`: `sacudir`/`shakeOffset` cedo se
  `!shake`; `flashTela`/`bordaTela` cedo se `!flash`; `perigo` força
  `perigoFrac = 1` se `!flash` (o vermelho de perigo é o mesmo tipo de
  estímulo); `nota` cedo se `!num` **e** estilo ≠ `'big'` (aviso/boss
 /big sempre ligado — é sinalização, não número de dano). Em
  `batalha.js`: o loop da poeira ambiente no `desenhar` some se
  `!poeira`.
- **R-OP-3 (overlay em `jogo.js`)** — botão **`Opções`** no cabeçalho
  (`UI.button(W-216, 3, 64, 24, font 13px)`, livre entre a barra de XP
  e `Pontos`) abre overlay: `UI.panel` centralizado (380×272) com
  título `OPÇÕES`, **4 botões-toggle** (`<nome> · LIG|DES`, estilo
  `ativo` quando ligado) e `Fechar`. Enquanto aberto: `UI.bloqueia`
  inclui o overlay **e** o `Gestao.update` é pulado (mesmo duplo
  nível do overlay de vitória). Fecha por `Fechar`, `Esc`
  (`Input.pressed('Escape')`) ou clique fora do painel.
  Prioridade de desenho: **vitória > cutscene > opções**.
- **R-OP-4 (testes)** — fumaça: defaults ligados (`Opcoes.liga` todos
  `true`); com `shake` desligado `Efeitos.sacudir(1)` não produz
  `shakeOffset` (e religar volta a produzir); alternação persiste no
  `localStorage` (`rpg_opcoes_v1`); clique no botão abre overlay
  (texto `OPÇÕES` no frame), clique num toggle vira `DES` e some o
  `shake`, `Fechar` fecha.
- **R-OP-5 (docs)** — chave nova na seção Persistência do `AGENTS.md`
  + CHANGELOG.

## Fora de escopo

Volume/áudio (não existe áudio) · opções de gameplay (velocidade,
auto-pause) · tela de opções na seleção · 6ª aba da Gestão ·
granularidade por efeito (um toggle por partícula).

## Verificação

`node testes/todos.js` · QA manual no navegador: desligar shake →
matar inimigos sem tremer; recarregar → opção mantida.
