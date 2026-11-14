# RPG Herói — idle no navegador

Um RPG de navegador em **JavaScript puro** (sem build, sem npm, sem dependências)
no estilo **idle**: o herói luta sozinho numa arena automática e você só administra
os atributos, a classe e a aparência dele.

## Como jogar

Baste abrir o `index.html` em qualquer navegador (duplo clique):

```
index.html
```

Nada de servidor, nada de instalar. Tudo fica salvo no `localStorage`.

### O que é automático

- O herói **mira, anda e ataca sozinho** nos inimigos mais próximos.
- Inimigos chegam em **ondas** cada vez maiores (visgos a partir da onda 3,
  com vida e dano escalando) — e o **chão, os monstros e o chefe mudam a
  cada mapa**.
- Cada mapa tem **100 ondas**; a onda 100 é o **chefe** do mapa: um monstro
  gigante com **4x de vida** e **1.5x de dano** sobre a escala da própria
  onda, junto de 2 minions. Ele não regenera vida — com o herói revivendo
  sozinho, a vitória é garantida (só exige mais tempo); derrotá-lo dá **XP
  de várias ondas de uma vez** e o jogo avisa **"BOSS! \<nome\>"** — e então
  o herói **avança para o próximo mapa** (onda 1 de novo, monstros novos)
  e a **dificuldade continua de onde parou** — a onda 1 de cada mapa nasce
  no mesmo patamar da onda 100 anterior (escala contínua de ondas), sem o
  "reset" que deixava as primeiras ondas dos mapas seguintes fáceis demais
  (a recompensa de XP segue a mesma curva).
  A campanha tem **10 mundos × 10 mapas × 100 ondas** (Planície Verdejante,
  Cripta Congelada, Ninho Rubro, Deserto Escaldante, Pântano Venenoso,
  Floresta Noturna, Forja Abissal, Ruínas Celestiais, Vazio Abissal e
  Trono do Caos — **cada mundo tem chão, obstáculos, monstros e chefe
  próprios**), alvo de **~200h de jogo**. Derrubar o chefe do **mundo 10**
  abre a tela de **CAMPANHA CONCLUÍDA** e libera o **modo infinito**
  (os mundos voltam ao início em loop, com a dificuldade seguindo a
  escala). Saves de antes dos mapas migram sozinhos (onda 250 → mapa 3,
  onda 50).
- **Mapas procedurais** — o chão (manchas orgânicas e cachos de flores) e
  a **posição dos obstáculos** de cada mapa saem de um **Perlin Noise com
  semente do número do mapa**: mesmo mapa = mesmo layout, mapa novo =
  layout novo (também no modo infinito), sempre com o centro livre para o
  herói nascer/reviver.
- Ao morrer ele **revive sozinho** em 3s — em **local aleatório do mapa**
  (longe de obstáculos e inimigos) — e a luta continua; os inimigos se
  agrupam onde ele caiu e a câmera acompanha o renascimento. **A morte
  cobra preço**: **−10% do ouro** e **volta de 5 ondas** (piso: onda 1 do
  mapa) — a onda perdida renasce ao reviver (o lendário Véu da Fênix
  escapa da penalidade).
- Ele **regenera vida**: **2 por segundo** sempre e **4% do máximo por
  segundo** enquanto não apanha — segurar a fronteira é questão de
  build e gestão.
- **Skills automáticas** — cada classe tem **8 skills** que desbloqueiam
  nos níveis **5, 15, 25, 35, 45, 60, 150 e 400** e disparam sozinhas,
  sem botão. O **loadout escala com o nível** (3 ativas → **4 no nv
  50** → **5 no nv 150**) e cada skill tem **2 ramos** para escolher
  (variantes com tradeoff — sem escolha fica a base neutra):
  varredura do guerreiro (a cada N golpes), bola de fogo/nova arcana do
  mago, veneno contínuo do ladino, bênção/castigo sagrado do clérigo — e
  **skills de fuga**, disparadas quando os inimigos se fecham:
  **Empurrão** (guerreiro afasta o bando), **Teleporte** (mago some para
  longe), **Esquiva** (ladino corre) e **Amedronta** (os inimigos fogem
  por segundos). A aba **Classe** mostra a próxima skill e o nível avisa
  **"\<skill\> desbloqueada!"**. Cada skill tem **efeito visual próprio**:
  projétil teleguiado com rastro e explosão em anel, arco de corte
  luminoso, respingos + ícone de veneno no inimigo, motes de cura subindo
  e marcador de medo (capturados em `testes/tela-skill*.png`).
- **IA tática** — o herói decide sozinho com **Inteligência de verdade**:
  a cada 0,2s avalia os alvos e os estados por peso — prioriza o inimigo
  perigoso e fraco, faz **kite** (classes à distância mantêm a distância
  e atiram em retirada) e **recua** quando o HP fica crítico — tudo numa
  **Behavior Tree de camadas** onde a **INT controla a profundidade**
  (burro avalia só o básico, gênio alcança as camadas táticas) e a fuga
  usa **evasão de cerco** (direção escolhida por células livres — não
  corre para rocha nem para dentro da matilha). **INT baixa
  é burra de verdade** (escolhas ruidosas, vai no mais perto, nunca
  recua); **INT alta** ganha cooldown de skill menor e raio de gatilho
  maior. Os monstros têm **astúcia por espécie + mapa**: nos mapas fundos
  eles **cercoam** o herói em slots ao redor, **antecipam** Esquiva e
  Teleporte (miram na fuga para cortar) e o astuto **esquiva** golpes —
  o dano erra com "ESQUIVOU!". Rotas desviam de obstáculos por **A* sob
  demanda** (só quando a reta está bloqueada e a entidade é esperta).
- `Pausar`/`Continuar` (botão embaixo) congela a batalha se quiser.
- **Autosave** a cada 3s (e ao fechar a aba): o progresso nunca depende de
  `Enter`, e o navegador avisa se faltar espaço pra salvar.
- **Progresso offline** — o tempo fora é creditado simulando a batalha (teto
  de 1h por ausência); ao voltar o jogo diz quanto tempo você ficou fora e
  quantos níveis subiu.

### O que você administra

- **Atributos** — Força, Destreza, Constituição, Inteligência e Carisma;
  cada ponto muda o dano, a vida, a **velocidade** e o crítico **em tempo real**
  (a Velocidade também **acelera o ataque**, o Carisma aumenta o **XP ganho
  por abate** e a Inteligência **refina a IA do herói** em combate). Clique em `+`/`−` para mudar 1 ponto ou **segure** o botão
  para repetir; o seletor `×1`/`×5` muda quantos pontos cada ação gasta.
- **Progressão** — cada inimigo derrubado dá **XP**; ao subir de **nível**
  você ganha **+3 pontos** para distribuir e **+4 de vida** (o XP e o nível
  ficam no cabeçalho). Heróis novos nascem com **0 pontos** (atributos base
  em 8) — os primeiros +3 vêm já no primeiro nível.
- **Classe** — Guerreiro, Mago, Ladino ou Clérigo, com bônus e arma próprios;
  trocar no meio da luta altera o herói na hora. O guerreiro briga no
  **corpo a corpo**; mago, ladino e clérigo atacam **à distância** com
  projéteis (alcance próprio por arma).
- **Aparência** — pele, cabelo, estilo (curto, longo, cavalo, moicana, bandana)
  e cor de roupa; aparece no herói que está lutando.
- **Estatísticas** — aba **Stats** no painel: abates, chefes derrotados,
  açougueiros/gatunos, ondas limpas, dano causado e recebido, mortes, itens
  dropados, **tempo de jogo** (só a jogatina conta; o crédito offline não)
  e o bloco **`Base → total`**: o que atributos, itens, aprimoramento e
  keystone estão acrescentando, visível sem hover (`Dano 31→93` — o
  detalhe por fonte continua no hover do rodapé). Tudo é gravado no save —
  saves antigos ganham os campos zerados.
- **Equipamento** — inimigos **dropam** armas e armaduras (3 raridades) a
  cada abate; o item melhor que o equipado é **usado na hora** e o resto vai
  para a **bolsa** (até 10). A aba **Itens** mostra os 2 slots e a bolsa —
  clique numa linha para equipar (o anterior volta para a bolsa). Cada slot
  tem um **checkbox `[x]` de fixar**: marcado, o auto-equip **não troca**
  aquele item por um drop melhor (a troca manual continua livre); e o
  **`Auto A+`** aprimora sozinho o slot mais barato quando você marca
  (padrão desligado — gasta ouro com teto e saldo respeitados). A arma
  equipada aparece no herói (sem equipamento, vale a da classe) e o bônus
  entra no dano, vida, velocidade e crítico. O chefe do mapa sempre dropa 2
  itens raros.

### A tela de seleção é separada do jogo

- O jogo **abre numa tela de criação/seleção**: lista de heróis paginada,
  **Novo**, **Apagar** (confirmação em dois cliques), **Exportar/Importar** e o
  campo de **Nome** (digite qualquer tecla) — tudo fora da jogatina.
- Só se entra na arena pelo botão **JOGAR** (`Enter` também entra). A batalha
  **não roda** na tela de seleção.
- Dentro da jogatina **não há como trocar de herói por baixo**: o botão
  **Trocar herói** salva e leva de volta para a seleção (a troca acontece
  fora da luta, nunca durante).

## Estrutura

```
index.html          carrega os scripts na ordem
style.css           canvas centralizado, pixel art nítida
js/
  input.js          teclado, mouse e toque (estado por frame)
  sprite.js         geração procedural de pixel art (herói, inimigos, cenário)
  anim.js           cache de frames animados
  personagem.js     classes, atributos, status derivados, validação, níveis
  salvar.js         localStorage + export/import JSON
  gravacao.js       toast, autosave e save do personagem (compartilhado)
  mapas.js          cada mundo: tema do chão, obstáculos, monstros e chefe
                    (mundo()/noMundo() — 10×10, ciclo no infinito)
  perlin.js         Perlin Noise com semente do mapa (cenários procedurais)
  itens.js          drops: armas/armaduras, bolsa e auto-equip
  skills.js         skills por classe (procs, ramos e loadout escalonado)
  efeitos.js        efeitos visuais das skills (missis, cortes, motes)
  ia.js             IA tática: Behavior Tree do herói, flocking/influence map + A*
  eventos.js        eventos aleatórios (Açougueiro, gatuno) — rolagens puras
  ranking-config.js config pública do Firebase (preenchida pelo mantenedor)
  ranking.js        ranking global: score, apelido, SDK lazy-load + cena
  cutscene.js       cutscenes: mapa do universo, narração e cena "Universo"
  ui.js             UI visual: paleta/gradientes/cantos arredondados — botões, painéis, barras
  batalha.js        combate automático: IA do herói, ondas, XP, morte/revivescimento
  gestao.js         painel de gestão (atributos/aparência/classe) compartilhado
  selecao.js        tela de criação e seleção de personagem (fora da jogatina)
  jogo.js           tela de jogo: arena + gestão + cabeçalho + botões
  loop.js           game loop (requestAnimationFrame)
  main.js           bootstrap e troca de cenas
.specs/             specs: projeto, codebase e features (rastreabilidade)
CHANGELOG.md        o que mudou, por versão (Keep a Changelog)
AGENTS.md           convenções e armadilhas para quem mexe no código
testes/             ferramentas de verificação (ver abaixo)
```

Resolução interna de **768×432 de base com largura adaptativa**: a
altura é fixa e a **largura lógica segue o aspecto da tela** (768 a
1728) — em telas mais largas que 16:9 (celular em paisagem, com as
barras do navegador a viewport fica ~3:1) o layout se expande e o jogo
**preenche a tela sem barra lateral**. O CSS preenche a janela com
escala **fracionária** e o backing store usa pixels inteiros (DPR)
para texto e pixel art nascerem nítidos.

O layout é **ancorado**: cabeçalho/rodapé/status/toast ocupam a largura
toda (XP centrado, "Pontos" e o trio de botões à direita), a arena fica
à esquerda e o painel de gestão à direita. Em 16:9 a largura é 768 e
tudo cai exatamente nas coordenadas de referência. A arena é uma **janela de 192×134 (unidades de mundo,
ampliadas ×2 na tela) deslizando sobre um mundo de 384×268** — uma
câmera suave segue o herói (com trava nas bordas) — e os sprites são
grades de pixels desenhadas por código e escaladas com `imageSmoothing`
desligado.

**Celular**: toque funciona como o mouse (`touchstart` = clique, com
`preventDefault` contra rolagem/zoom), alvos de toque de 24px nos
atributos, `touch-action: none` e viewport travado; em retrato aparece
a dica **"Gire o celular para jogar"** (o layout é paisagem).

## Versão, changelog e specs

- **Versão atual: 0.1.0** — publicada em
  https://munod.github.io/rpg_heroi/ (deploy automático a cada push na
  `main`, via Actions).
- **[CHANGELOG.md](CHANGELOG.md)** — o que mudou em cada versão, no
  formato *Keep a Changelog*, em pt-BR.
- **[.specs/](.specs/project/PROJECT.md)** — visão/roadmap/memória
  (`project/`), documentação brownfield (`codebase/`) e **uma spec por
  feature** com IDs de requisito rastreando **requisito → commit**
  (`features/`).
- Versionamento **Semantic Versioning em 0.x** + **Conventional Commits**
  a partir da v0.1.0 — política e checklist de release em
  `.specs/project/VERSIONING.md`.

## Testes

Tudo roda no Node, sem navegador:

```bash
node testes/todos.js      # roda todos os testes de uma vez (exit 1 se falhar)
node testes/fumaca.js     # 687 asserções: sprites, status, UI visual, idle, toque, ranking, mundos, cutscenes, árvore, IA (monstros + herói)
node testes/grade.js      # grade do sprite em ASCII + 17 asserções de pixel
node testes/previa.js     # gera folhas PNG com todos os sprites
node testes/cena.js       # screenshots das telas (e um por skill: tela-skill*.png)
node testes/mapa.js X.png # converte screenshot em mapa ASCII (layout)
node testes/ampliar.js X.png 4 # amplia um screenshot (vizinho mais próximo)
node testes/ritmo.js [min] [mundo|mapa] [k] # mede o ritmo (tuning; padrão 15)
```

São **513 asserções** no total. Todos os testes que abrem o jogo compartilham
o mesmo harness — `testes/carga.js` — com DOM, `localStorage` e canvas
falsificados, mais o carregamento dos scripts na ordem do `index.html`; é o
que permite rodar o jogo inteiro dentro do Node.

O teste de fumaça cobre desde a geração dos 180 frames de sprite até o loop
completo do idle: abrir na **tela de seleção**, entrar na jogatina pelo
**JOGAR**, limpar a onda 1 sozinho, subir de nível com +3 pontos, trocar de
classe/aparência, pausar, cair e reviver (com a penalidade de ondas/ouro),
subir de nível com +3 pontos, **trocar de tela** (a batalha fica
parada fora da arena), autosave, exportação sem manglear acento, progresso
offline, a **velocidade acelerando o ataque**, a **barra de HP dos inimigos**
sem contorno que a tapava, o **chefe do fim de mapa** (nasce na onda 100, o
avanço muda de mapa e não trava), o **avance de mapa** com migração de save
legado, **drops com auto-equip/bolsa** e a **aba Itens** equipando no clique,
o **fixar slot** (`[x]` impede a troca automática) e o **Auto A+**
(aprimoramento automático opcional),
as **skills com os 6 tipos de proc** (área, nuke, veneno, cura, mobilidade
e medo) — **8 por classe**, com **ramos** (variantes por skill) e
**loadout escalonado** (3 → 5 com o nível), com aviso de desbloqueio, o **ataque à
distância** do mago/ladino/clérigo (projétil do golpe básico) e os
**gatilhos de fuga** (Empurrão, Teleporte, Esquiva e Amedronta quando o
bando se fecha) — tudo com **efeitos visuais** (projétil teleguiado, arco
de corte, anéis de impacto, **hit-stop com peso de golpe**, crítico com
tremor dourado, flash/vinheta de evento, respingos de veneno, motes de
cura e marcador de medo), a **IA tática** (**Behavior Tree do herói** com evasão de
cerco, **matilha com separação e influence map** — cerco/antecipação/
esquiva dos monstros — e rotas por A*), a **câmera sobre o
mundo 384×268** com o **renascimento em local aleatório**, o **toque no
celular** (clique, arrasto e soltura por dedo, com bloqueio de rolagem),
a **escala responsiva** e o **layout de largura adaptativa** (768–1728,
ancorado nas bordas, preenchendo a tela em paisagem), a lista de
personagens na seleção
com paginação, novo herói e exclusão em duas etapas, o **mapa do
universo** (botão "Universo": os 10 mundos com o progresso do save —
também o overlay das cutscenes de fronteira), o **ranking
global** (tela própria com top 10 e "meu melhor" por apelido — funciona
com o Firebase configurado; sem config/rede mostra o estado
"não configurado" e nada trava, e cada envio tem toast/status com o
motivo), o **teto de nível 9500** (barra "MÁXIMO", XP descartado no
cap — os níveis duram a campanha inteira), os **cooldowns efetivos das
skills na aba Stats** (com barra de rolagem), a **progressão
exponencial** (custo `146×1,07^nv`, renda `12×1,064^onda`) com
**safeguards de save** (xpProx recalculado, tetos de ouro/pontos/
atributo — fecha o bug dos níveis 83k) e a barra de XP com
**abreviação** (K/M/B/T/Qa… até 10⁶⁰, depois notação científica).
