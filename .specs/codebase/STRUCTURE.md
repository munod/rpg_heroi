# Estrutura do repositório

```
index.html            carrega os 19 scripts de js/ na ordem (dependências = posição)
style.css             canvas centralizado, pixel art nítida, viewport travado
AGENTS.md             convenções/arquitetura reais do projeto (fonte primária)
README.md             jogo, estrutura e testes em detalhe
CHANGELOG.md          o que mudou por versão (Keep a Changelog, v0.1.0)
.gitignore            exclui PNGs/JPGs de teste regeneráveis

js/
  input.js            teclado, mouse e toque (estado "pressionado" por frame)
  sprite.js           geração procedural de pixel art (herói, inimigos, cenário)
  anim.js             cache de frames animados
  personagem.js       classes, atributos, status derivados, validação, níveis
  salvar.js           localStorage + export/import JSON (chaves versionadas)
  gravacao.js         toast, autosave e save do personagem (instância única)
  ui.js               botões, painéis, barras e texto direto no canvas
  mapas.js            tema do chão, obstáculos, monstros e chefe de cada mapa
  perlin.js           Perlin Noise com semente do mapa (cenários procedurais)
  itens.js            drops: armas/armaduras, bolsa e auto-equip
  skills.js           skills automáticas por classe (procs, sem botão)
  efeitos.js          efeitos visuais das skills (só primitivas do rasterizador)
  ia.js               IA tática: decisões por INT/astúcia + A* (antes de batalha.js)
  batalha.js          combate automático: ondas, inimigos, XP, morte/revivescimento (1445 linhas)
  gestao.js           painel de gestão (5 abas) compartilhado pelas telas
  selecao.js          tela de criação/seleção de personagem (fora da jogatina)
  jogo.js             tela de jogo: arena + gestão + cabeçalho + botões
  loop.js             game loop (rAF, dt limitado a 0,05s)
  main.js             bootstrap e troca de cenas (Game, resize, escala)

testes/
  carga.js            harness comum: DOM/localStorage/canvas falsos + vm + scripts na ordem do HTML
  todos.js            gate: roda fumaca/grade/previa/cena em sequência (exit 1 se falhar)
  fumaca.js           jogo completo no Node — 180 confs, seções 1–23
  grade.js            grade do sprite em ASCII + 13 asserções de pixel
  cena.js             screenshots rasterizados das telas (tela-skill*.png)
  previa.js           folha PNG com todos os sprites gerados
  png.js              PNG mínimo (RGB 8 bits) sem dependência externa
  ritmo.js            mede o ritmo de progressão (tuning; fica fora do gate)
  mapa.js             screenshot → mapa ASCII (layout em debug)
  ampliar.js          amplia um screenshot (vizinho mais próximo)

.github/workflows/
  deploy.yml          GitHub Pages: push na main → upload-pages-artifact → deploy-pages

.specs/
  codebase/           os 7 docs brownfield (estes: STACK, ARCHITECTURE,
                      CONVENTIONS, STRUCTURE, TESTING, INTEGRATIONS, CONCERNS)
  features/           spec+tasks por feature entregue (ex.: docs-rastreabilidade)
  project/            PROJECT/ROADMAP/STATE (memória) + VERSIONING (política)
  quick/              previsto pela skill tlc-spec-driven p/ tasks ad-hoc (sem uso ainda)
```
