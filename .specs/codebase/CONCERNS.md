# Dívidas e fragilidades conhecidas

São dívidas conscientes e verificáveis, não bugs.

- **`js/batalha.js` crescente** — 1445 linhas: cérebro do herói, NPCs,
  gatilhos de skills e construção de cenário moram no mesmo arquivo;
  candidato a decomposição — registrado no backlog do `ROADMAP.md`.
- **Rasterizador próprio** (`testes/cena.js`) só implementa poucas
  primitivas — restringe o estilo de desenho do jogo inteiro (efeitos
  precisam seguir `fillRect`/`strokeRect`/`ellipse`+`fill`/transform/
  `globalAlpha`; `arc`/`stroke()`/gradiente quebram o screenshot).
- **`Math.random` em jogo e teste** (`efeitos`, `batalha`, `ia`, `itens`,
  `personagem`, `fumaca.js`) — flakes raros: houve1 aparente durante a
  leva da IA (registrado em `.specs/project/STATE.md` > Lições — repetir
  a fumaça 3× antes de concluir).
- **Espelhos de dados manuais**: chaves de bônus `personagem.js`↔`itens.js`
  e `Personagem.STATS`↔`Batalha.stat` são duplicados sincronizados à mão —
  podem dessincronizar silenciosamente.
- **Testes acoplados a UI/coordenadas**: grade de abas (centros
  445/515/585/655/725 em y=54), cliques em coordenadas ×2, pixels exatos do
  sprite na `grade.js` — mexer no layout quebra asserções de propósito.
- **Sem linter/typecheck**: a conformidade (ES5 em `js/`, estilo, primitivas
  proibidas) depende de revisão humana; APIs de navegador novas quebram os
  testes com `ReferenceError` se não tiverem stub em `carga.js`.
- **ES5 deliberado** em `js/`: modernidade de linguagem é proibida por
  decisão, não por limitação — custa verbosidade.
- **Saves versionados exigem `normalizar()`** ao mudar o formato (hoje
  `p.stats` via `Personagem.normalizaStats`; migração de mapas em
  `Salvar.lerEstado`) — esquecer a normalização quebra saves antigos.
- **Balanceamento sensível**: curva (`Personagem.custoProximo`) e ritmo de
  ondas (`Batalha.ESC_HP`/`ESPERA_ONDA`) afetam o tempo de jogo — medir com
  `node testes/ritmo.js` (fica **fora** do gate, não pega regressão sozinho).
