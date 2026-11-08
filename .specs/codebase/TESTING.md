# Testes

- **Gate**: `node testes/todos.js` — roda `fumaca.js`, `grade.js`,
  `previa.js` e `cena.js` em sequência; exit 1 se qualquer um falhar.
  É o único gate; rode após qualquer mudança. Total de **193 asserções**.
- **`fumaca.js`** — 180 confs, **seções 1–23** (nomes reais): 1 geração de
  sprites · 2 status por classe · 3 export/import JSON · 4 boot na seleção +
  entrada na jogatina · 5 exportação · 6 morte/revivescimento/troca de tela ·
  7 autosave/nome do arquivo/carisma · 8 seleção (novo, exclusão em 2 etapas,
  paginação) · 9 progresso offline · 10 falha de gravação comunicada ·
  11 barra de HP dos inimigos · 12 chefe do fim de mapa e avanço ·
  13 save não contamina outro personagem · 14 ausência creditada + limites do
  estado · 15 drops/equipamento/aba Itens · 16 skills automáticas ·
  17 câmera/mundo maior/renascimento · 18 toque, resolução e escala ·
  19 viewport larga ancorada · 20 cenário procedural (Perlin) ·
  21 estatísticas do jogador · 22 IA tática (herói) · 23 IA dos NPCs.
- **`grade.js`** — grade do sprite em ASCII + **13 asserções de pixel** em
  coordenadas exatas (mover 1 pixel do sprite quebra de propósito).
- **`cena.js`** — screenshots rasterizados das telas (inclui `tela-skill*.png`);
  **`previa.js`** — folhas de sprite em PNG. Os PNGs não são versionados.
- **Fora do gate**: `ritmo.js [min]` (tuning de curva/ondas);
  **manuais**: `mapa.js X.png` (layout ASCII), `ampliar.js X.png 4` (zoom).
- **Harness `testes/carga.js`**: DOM, `localStorage` e canvas falsificados,
  scripts num sandbox `vm` com whitelist de globals (API nova de navegador =
  stub lá, senão `ReferenceError`); `setTimeout` executa **sincronamente**,
  rAF disparado manualmente com `frame(n)`, `performance.now()` só avança
  via `frame()`. A lista de scripts vem do próprio `index.html`.
- **Peculiaridades**: cliques = coordenadas de jogo **×2**; env
  `JANELA=WxH` muda a janela falsa (padrão 1280×720, 16:9) — só afeta o
  `cena.js`; a **fumaça fixa 1280×720** antes do load; `getBoundingClientRect`
  dinâmico = `Game.W × 2`; `main.js resize()` precisa rodar antes do
  `getContext()` no init.
