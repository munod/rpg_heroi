# Convenções

- **pt-BR em tudo**: código, comentários, textos de UI e mensagens.
- **`js/` é ES5 deliberado**: `var`, `function`, sem `const`/arrow/class/
  import. **`testes/`** pode usar JS moderno (roda só no Node).
- **Um global IIFE por arquivo** (`var Foo = (function () { ... })();`);
  ordem de carga no `index.html` é a dependência — atualize o HTML ao
  adicionar/renomear arquivo em `js/`.
- **Espelhos de dados obrigatórios** (sincronizar manualmente ao mudar):
  chaves de bônus entre `personagem.js` e `itens.js`; `Personagem.STATS` e
  os incrementos de `Batalha.stat`. **`personagem.js` NÃO pode depender de
  `itens.js`/`skills.js`/`batalha.js`** (`grade.js`/`previa.js` carregam só
  sprite+personagem).
- **Constantes nomeadas** para números mágicos de balanceamento
  (`CUSTO_INICIAL`, `CUSTO_BASE`, `ESC_HP`, `ESPERA_ONDA`, `FIM_MAPA`…) —
  mudou curva/ritmo? meça com `node testes/ritmo.js [min]` antes de commit.
- **Só primitivas que o rasterizador de testes entende**: `fillRect`,
  `strokeRect` (com `strokeStyle`/`lineWidth`), `ellipse`+`fill`,
  `translate`/`scale`/`setTransform`, `globalAlpha`. `arc`, `stroke()` e
  gradiente **quebram o screenshot** (`testes/cena.js`).
- **Gate**: `node testes/todos.js` verde (exit 0) antes de qualquer commit.
- **Commits**: Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`,
  `chore:`…) com corpo em pt-BR — política nova a partir da **v0.1.0**
  (histórico anterior não segue o padrão; ver
  `.specs/features/docs-rastreabilidade/spec.md`).
