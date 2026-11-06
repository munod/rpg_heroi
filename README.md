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
- Inimigos chegam em **ondas** cada vez maiores (slimes e, da onda 3, visgos
  sombrios, com vida e dano escalando).
- A cada **100 ondas** (100, 200, 300...) aparece um **boss**: um slime
  dourado gigante com **4x de vida** e **1.5x de dano** sobre a escala da
  própria onda, junto de 2 minions. Ele não regenera vida — com o herói
  revivendo sozinho, a vitória é garantida (só exige mais tempo); derrotá-lo
  dá **XP de várias ondas de uma vez** e o jogo avisa "BOSS! ONDA X".
- Ao morrer ele **revive sozinho** em 3s e a luta continua.
- Ele **regenera vida** constantemente.
- `Pausar`/`Continuar` (botão embaixo) congela a batalha se quiser.
- **Autosave** a cada 3s (e ao fechar a aba): o progresso nunca depende de
  `Enter`, e o navegador avisa se faltar espaço pra salvar.
- **Progresso offline** — o tempo fora é creditado simulando a batalha (teto
  de 1h por ausência); ao voltar o jogo diz quanto tempo você ficou fora e
  quantos níveis subiu.

### O que você administra

- **Atributos** — Força, Destreza, Constituição, Inteligência e Carisma;
  cada ponto muda o dano, a vida, a **velocidade** e o crítico **em tempo real**
  (a Velocidade também **acelera o ataque**, e o Carisma aumenta o **XP ganho
  por abate**).
- **Progressão** — cada inimigo derrubado dá **XP**; ao subir de **nível**
  você ganha **+5 pontos** para distribuir e **+4 de vida** (o XP e o nível
  ficam no cabeçalho).
- **Classe** — Guerreiro, Mago, Ladino ou Clérigo, com bônus e arma próprios;
  trocar no meio da luta altera o herói na hora.
- **Aparência** — pele, cabelo, estilo (curto, longo, cavalo, moicana, bandana)
  e cor de roupa; aparece no herói que está lutando.

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
  input.js          teclado e mouse (estado por frame)
  sprite.js         geração procedural de pixel art (herói, inimigos, cenário)
  anim.js           cache de frames animados
  personagem.js     classes, atributos, status derivados, validação, níveis
  salvar.js         localStorage + export/import JSON
  gravacao.js       toast, autosave e save do personagem (compartilhado)
  ui.js             botões, painéis, barras e texto no canvas
  batalha.js        combate automático: IA do herói, ondas, XP, morte/revivescimento
  gestao.js         painel de gestão (atributos/aparência/classe) compartilhado
  selecao.js        tela de criação e seleção de personagem (fora da jogatina)
  jogo.js           tela de jogo: arena + gestão + cabeçalho + botões
  loop.js           game loop (requestAnimationFrame)
  main.js           bootstrap e troca de cenas
testes/             ferramentas de verificação (ver abaixo)
```

Resolução interna de **384×216** escalada por inteiro. A arena é uma janela de
192×134 com o mundo inteiro visível (sem câmera); os sprites são grades de
pixels desenhadas por código e escaladas com `imageSmoothing` desligado.

## Testes

Tudo roda no Node, sem navegador:

```bash
node testes/todos.js      # roda todos os testes de uma vez (exit 1 se falhar)
node testes/fumaca.js     # 70 asserções: sprites, status, UI, idle completo
node testes/grade.js      # grade do sprite em ASCII + 13 asserções de pixel
node testes/previa.js     # gera folhas PNG com todos os sprites
node testes/cena.js       # rasteriza e salva screenshots das telas
node testes/mapa.js X.png # converte screenshot em mapa ASCII (layout)
node testes/ampliar.js X.png 4 # amplia um screenshot (vizinho mais próximo)
```

São **83 asserções** no total. Todos os testes que abrem o jogo compartilham
o mesmo harness — `testes/carga.js` — com DOM, `localStorage` e canvas
falsificados, mais o carregamento dos scripts na ordem do `index.html`; é o
que permite rodar o jogo inteiro dentro do Node.

O teste de fumaça cobre desde a geração dos 180 frames de sprite até o loop
completo do idle: abrir na **tela de seleção**, entrar na jogatina pelo
**JOGAR**, limpar a onda 1 sozinho, subir de nível com +5 pontos, trocar de
classe/aparência, pausar, cair e reviver, **trocar de tela** (a batalha fica
parada fora da arena), autosave, exportação sem manglear acento, progresso
offline, a **velocidade acelerando o ataque**, a **barra de HP dos inimigos**
sem contorno que a tapava, o **boss a cada 100 ondas** (nasce, só passa a
onda depois de derrubá-lo e não trava), e a lista de personagens na seleção
com paginação, novo herói e exclusão em duas etapas.
