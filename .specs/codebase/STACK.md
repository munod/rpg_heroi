# Stack

- **Linguagem**: JavaScript puro, sem framework. `js/` é deliberadamente
  **ES5** (`var`/`function`, sem `const`/arrow/class/import); `testes/` usa
  JS moderno (roda só no Node).
- **Runtime**: navegador abrindo `index.html` direto (duplo clique — não há
  servidor). Canvas 2D (`<canvas id="game" width="768" height="432">`, com
  largura lógica adaptativa 768–1728 conforme o aspecto da tela).
- **Renderização**: pixel art **procedural** gerada por código em
  `js/sprite.js` (grade de pixels → canvas pequeno, escalado com
  `imageSmoothing` desligado); UI desenhada no próprio canvas em `js/ui.js`.
  Nenhuma imagem/asset externo.
- **Persistência**: `localStorage` com chaves versionadas
  `rpg_personagens_v1`, `rpg_ultimo_id`, `rpg_estado_v1`, mais
  export/import de JSON (`js/salvar.js`).
- **Testes**: Node puro, **sem framework de testes** — harness próprio
  `testes/carga.js` (DOM, canvas e `localStorage` falsificados, scripts em
  sandbox `vm`); gate único `node testes/todos.js`.
- **Deploy**: GitHub Pages via GitHub Actions
  (`.github/workflows/deploy.yml`) — a Actions sobe a raiz estática
  sem nenhum passo de build.
- **Zero dependências**: não existe `package.json`, npm, bundler, linter ou
  typecheck. `.gitignore` só exclui PNGs de teste regeneráveis
  (`testes/*.png`, `testes/*.jpg`).
