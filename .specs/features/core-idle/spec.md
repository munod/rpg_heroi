# Spec: Núcleo idle — loop automático, herói, save e UX dos pontos (backfill)

Status: **Entregue** — v0.1.0 · Commits: `0256b59`, `876b0ff`, `a8e6472`, `1b674a2`, `f70bb21`

## Objetivo
Levar o jogo do zero ao loop idle completo em JavaScript puro (sem build, sem
servidor): herói luta sozinho, o jogador só administra atributos/classe e o
progresso sobrevive a fechar a aba — incluindo a correção do bug crítico de
contaminação de save entre heróis.

## Requisitos
- **R-CORE-1**: Jogo 100% estático (`index.html` + `js/` + `style.css`),
  aberto direto no navegador; harness `testes/carga.js` roda o jogo inteiro no
  Node (DOM/canvas/localStorage falsificados, sandbox `vm`) — commit `0256b59`.
- **R-CORE-2**: Loop idle automático: onda avança sozinha, XP por abate,
  autosave a cada ~3s, progresso offline creditado ao reabrir (teto de 1h) e
  aviso na tela — commit `0256b59`.
- **R-CORE-3**: Tela de criação/seleção separada da arena (lista paginada,
  Novo, Apagar em dois cliques, export/import, nome) e entrada só pelo
  **JOGAR**; herói novo nasce com **0 pontos** (só +5 por nível, saldo
  existente preservado na normalização) — commits `0256b59`, `876b0ff`.
- **R-CORE-4**: UX dos pontos em `Gestao.update(dt, p)`: clique aplica na
  hora, segurar repete após 0,25s (~10/s) e seletor ×1/×5 muda o passo com
  guardas; geometria dos botões numa fonte única (`linhasAtributos`) — commit
  `a8e6472`.
- **R-CORE-5**: Curva de progressão com fonte única `Personagem.custoProximo`
  (`CUSTO_INICIAL` + `CUSTO_BASE × nível`) substituindo o cálculo espalhado em
  4 lugares, e alavancas de onda nomeadas em `Batalha` (`ESC_HP`, `ESC_DMG`,
  `ESPERA_ONDA`) — commit `1b674a2`.
- **R-CORE-6**: Ferramenta `testes/ritmo.js` (fora do `todos.js`) mede 1º
  nível, marcos por minuto e chegada do chefe investindo pontos sozinha —
  commit `1b674a2`.
- **R-CORE-7**: Estado da batalha gravado pelo **dono** (`Batalha.dono()`) e
  simulação de ausência só na cena `jogo`: trocar de herói e fechar a aba não
  atribui onda/XP de um herói ao outro — commit `f70bb21`.
- **R-CORE-8**: Gravação unificada em `js/gravacao.js` (toast, autosave e save
  do personagem) compartilhada por `jogo.js` e `selecao.js`, eliminando o
  código duplicado — commit `f70bb21`.
- **R-CORE-9**: Limites defensivos do save: `lerEstado` rejeita onda > 99999,
  `restaurarOnda` não trunca em 999, XP teto em 1e9 e nome com os mesmos 14
  caracteres do normalizar; chaves versionadas (`rpg_personagens_v1`,
  `rpg_ultimo_id`, `rpg_estado_v1`) — commits `0256b59`, `f70bb21`.

## Verificação
- Gate `node testes/todos.js` (193 asserções no total hoje; 83 na época de
  `f70bb21`).
- `testes/fumaca.js`: seção **4)** boot na seleção + botão `+` (com saldo
  provvido, já que o herói nasce com 0), **5)** exportação, **7)** autosave e
  falha de gravação (**10)**), **8)** novo herói/exclusão/paginação, **9)**
  progresso offline, **3)** `custoProximo`/saldo zerado, **13)** não
  contaminação entre heróis (`Batalha.dono()`), **14)** ausência creditada na
  jogatina + onda 250 legada + save corrompido rejeitado.
- `testes/ritmo.js` (medições do commit `1b674a2`, Config A escolhida):
  1º nível **~34s** (era 8s), 15min = **nv 32 / onda 58** (era 79/110),
  chefe **~27min** (era ~13).
- `testes/grade.js`: 13 asserções de pixel do sprite garantem que nada do
  layout/UI mudou de lugar.
