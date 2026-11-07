# AGENTS.md

## O projeto

- RPG idle em **JavaScript puro**: sem build, sem npm, sem dependências, sem
  linter/typecheck. Abra `index.html` direto no navegador (não há servidor).
- **Código, comentários e textos de UI em português (pt-BR)** — mantenha o
  padrão em tudo que escrever.
- `README.md` documenta jogo, estrutura de arquivos e testes em detalhe.
- Repositório Git com remote `origin` =
  `git@github.com:munod/rpg_heroi.git`, branch `main`. Identidade de commit
  configurada apenas localmente no clone (`Munod <thiagodss@hotmail.com>`).
- `.gitignore` exclui `testes/*.png` — esses PNGs são regenerados pelos
  testes (`previa.js`, `cena.js`) e não são versionados.

## Comandos

- `node testes/todos.js` — roda **tudo** (exit 1 se falhar). É o único
  gate de verificação; rode após qualquer mudança.
- `node testes/fumaca.js` — teste de fumaça principal (jogo completo no Node).
- `node testes/grade.js` — asserções de pixel em coordenadas exatas do sprite.
- `node testes/previa.js` / `node testes/cena.js` — regeneram os PNGs em
  `testes/` (folhas de sprite e screenshots das telas).
- Ferramentas manuais: `node testes/mapa.js X.png` (layout em ASCII),
  `node testes/ampliar.js X.png 4` (zoom por vizinho mais próximo).

## Arquitetura

- **Sem módulos**: cada arquivo de `js/` é um script clássico que expõe um
  global via IIFE (`var Foo = (function () { ... })();`), carregado por
  `<script>` na ordem de `index.html`. Dependências resolvem-se pela posição,
  não por imports.
- Adicionar/renomear arquivo em `js/` **exige** atualizar `index.html`;
  `testes/carga.js` lê a lista de scripts do próprio `index.html`, então os
  testes acompanham a mudança automaticamente.
- `js/` é deliberadamente **ES5** (`var`, `function`, sem `const`/arrow/class/
  import). Mantenha o estilo. Já `testes/` usa JS moderno (roda só no Node).
- Cenas: `js/main.js` (`Game`) inicia no `load` da janela, cena inicial
  `selecao` e depois `jogo`. Loop em `js/loop.js` (rAF, `dt` limitado a 0.05s).
- Save/toast/autosave das telas vive em `js/gravacao.js` (instância única;
  o `enter()` de cada tela zera com `Gravacao.entrar(p)`) — mudanças de
  gravação vão para lá, não duplicadas nas telas.
- Botões de atributo (`+`/`−`) aplicam em `Gestao.update(dt, p)` (clique na
  hora + segurar-repetir + seletor ×1/×5); os demais botões do jogo agem no
  render, pelo retorno de `UI.button`.
- O estado da batalha (onda/ts) é gravado pelo **dono** da batalha em
  memória (`Batalha.dono()`), nunca pelo personagem em foco — na seleção
  os dois podem ser heróis diferentes e gravar pelo focado corrompia o save.
- Curva de progressão com fonte única em `Personagem.custoProximo`
  (`CUSTO_INICIAL` + `CUSTO_BASE × nível`); ritmo das ondas em constantes
  de `Batalha` (`ESC_HP`, `ESPERA_ONDA`). Mudou algum? Meça com
  `node testes/ritmo.js [min]` (fica fora do `todos.js`) antes de achar
  que está bom.
- Mapas: ciclo de `FIM_MAPA` (100) ondas — a onda 100 é o chefe; vencido,
  `passaMapa()` faz `mapa++` e volta a onda 1. Dados em `js/mapas.js`
  (`Mapas.info(n)` p/ tema e `Mapas.forca(n)` p/ dificuldade+XP); cenário
  reconstruído por `garanteCenario()`. O estado salvo guarda `mapa` e
  `Salvar.lerEstado` migra saves legados (onda >100 → mapa/onda equivalentes)
  — a migração é na leitura, sem rewrite.

## Testes — peculiaridades

- Os testes executam o jogo inteiro no Node via `testes/carga.js`: DOM,
  canvas e `localStorage` falsificados, scripts rodando num sandbox `vm` com
  **whitelist de globals**.
- Se o código do jogo passar a usar uma API de navegador que não está stubada
  ali (`setInterval`, `Image`, `crypto`...), os testes quebram com
  `ReferenceError` — adicione o stub no sandbox de `carga.js`.
- No sandbox, `setTimeout` executa o callback **sincronamente** (sem atraso),
  o rAF é acionado manualmente com `frame(n)` e `performance.now()` só avança
  via `frame()`.
- `grade.js` valida coordenadas de pixel exatas do herói: mover um pixel do
  sprite quebra essas asserções de propósito.
- O clique nos testes usa coordenadas do jogo **×2** (harness assume canvas
  exibido em escala 2); mudar o stub `getBoundingClientRect` quebra os cliques.

## Persistência

- Chaves do `localStorage` são versionadas: `rpg_personagens_v1`,
  `rpg_ultimo_id`, `rpg_estado_v1`. Ao alterar o formato do save, suba o
  sufixo `_v1` e/ou normalize na leitura (`Personagem.normalizar`) — não
  quebre saves antigos em silêncio.
