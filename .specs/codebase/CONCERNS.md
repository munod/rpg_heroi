# Dívidas e fragilidades conhecidas

São dívidas conscientes e verificáveis, não bugs.

- **`js/batalha.js` crescente** — 2233 linhas: cérebro do herói, NPCs,
  gatilhos de skills e construção de cenário moram no mesmo arquivo;
  candidato a decomposição — registrado no backlog do `ROADMAP.md`.
- **CI roda o gate desde 2026-11-16** (`.github/workflows/deploy.yml`:
  job `test` com `node --check` + `node testes/todos.js`, e o deploy só
  acontece na `main` com `needs: test`) — antes o Pages publicava sem
  verificação.
- **Rasterizador próprio** (`testes/cena.js`) só implementa poucas
  primitivas — restringe o estilo de desenho do jogo inteiro (efeitos
  precisam seguir `fillRect`/`strokeRect`/`ellipse`+`fill`/transform/
  `globalAlpha`; `arc`/`stroke()`/gradiente quebram o screenshot).
- **`Math.random` em jogo e teste** (`efeitos`, `batalha`, `ia`, `itens`,
  `personagem`, `fumaca.js`) — flakes raros: houve 1 aparente durante a
  leva da IA (registrado em `.specs/project/STATE.md` > Lições; a fumaça
  está estável desde os commits de estabilização do gate). O `ritmo.js`
  tem seed; semear o RNG no harness eliminaria a classe inteira de flakes.
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
- **Assinatura de save é barreira casual, não segredo** — a chave HMAC
  está no bundle e o import aceita JSON **sem `_s`** (backup antigo);
  apagar o marcador `rpg_assinatura_v1` também re-assina tudo. Protege
  contra edição acidental, não contra quem lê o fonte. Um save rejeitado
  agora avisa na seleção, mas os dados continuam preservados no storage.
- **Ranking global sem identidade forte** — as regras do Firestore não
  exigem auth/App Check e o teto de progressão por tempo é global
  (`30 + minutos/100` mapas desde 2026-11-01), então progresso inventado
  dentro do teto é aceito. O placar é "melhor esforço"; sem Cloud
  Function/validação de servidor não dá para chamar de competitivo.
- **Balanceamento sensível**: curva (`Personagem.custoProximo`) e ritmo de
  ondas (`Batalha.ESC_HP`/`ESC_DMG`/`BEAT`/`ONDA_SEG`) afetam o tempo de
  jogo — medir com `node testes/ritmo.js` (fica **fora** do gate, não pega
  regressão sozinho).
