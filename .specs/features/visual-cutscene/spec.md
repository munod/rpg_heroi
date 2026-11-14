# Spec: Visual cutscene — letterbox, datilografado e dica piscando

Status: **concluída** (gate verde 3× = 676 confs; mapa 1 em
34,3min) · Data: 2026-11-13 · Iniciativa: série visual
(leva 9 de 9 — 3ª e última frente aprovada).

Base visual: **`/home/thiago/Projetos/Docs/cutscenes.md`**. Escopo
confirmado com o mantenedor: **só visual — os gatilhos atuais
(mundo/evento) continuam intocados** (spec `cutscenes` da leva 3 é
contrato). A base do doc (gatilho a cada 10 ondas) foi rejeitada.

## Contexto (estado atual medido)

- **`js/cutscene.js` (300 linhas)**: overlay com **véu cheio**
  `rgba(8,6,16,0.84)` + `UI.panel` central (pós leva 7 já arredondado
  e dourado); textos **completos de uma vez**; `update(dt)` só tica o
  cronômetro dos **eventos** (mundo não tem tempo — espera o jogador);
  fechar = botão (`UI.button` no render) ou **Enter** (jogo.js:143).
  A dica do evento ("some sozinho… ou clique para seguir") é
  **estática** — e clique fora do botão **não** avança (a dica
  promete mais do que o código faz).
- **Doc**: letterbox com barras deslizando (0,35s, 26px em 216 de
  altura → **52px na nossa altura 432**, proporção ×2); datilografado
  **55 chars/s** por linha com **pausa 0,8s** entre linhas; título
  sempre completo; dica piscando (`floor(relogio*2)%2`); `avancar()`
  em **3 estágios** (linha → próxima → fecha).
- **Contrato da seção 42** (a preservar): gatilhos/prioridade/teto 1;
  título e botões renderizam no **1º frame**; **auto-dismiss 3,5s**;
  silenciar; bloqueio da gestão; **Enter fecha**; narração "na tela".
  ⚠️ Os asserts de **narração** usam `frame(1)` — com datilografado a
  linha ainda não existe; **espera explícita** nesses pontos (o
  título/botão continuam imediatos).

## Riscos

1. **Cliques**: o clique fora do botão passa a **avançar a
   narração** — tem que acontecer no `update` ANTES do render e só
   quando o ponto **não** está no retângulo do botão (`info().botao`),
   senão o botão "Continuar"/"Entrar" fecharia junto e o skip morreria.
2. **Auto-dismiss × datilografado**: evento = 2 linhas ≈ 45 chars
   (45/55 ≈ 0,8s) + pausa 0,8 + linha2 ≈ 2,4s < 3,5s ✓ cabe; textos
   maiores no futuro cortariam — o cronômetro continua mandando.
3. **Dica piscando some metade do tempo** — nenhum teste da seção 42
   a afirma (verificado) e a nova seção 48 afirma presença E ausência
   (prova do piscar).

## Requisitos

- **R-CS-1 (letterbox)** — em `desenhar()`, **antes** do painel:
  barras pretas `#000` (α0,92) no topo e na base com altura
  `round(52 × barras/ABERTURA)`; `atual.barras` avança no `update`
  (`ABERTURA = 0,35s`, cap). Véu continua (batalha nunca pausa — o
  véu ajuda a legibilidade do painel em cima de arena viva).
- **R-CS-2 (datilografado)** — estado em `atual`: `{linha, chars,
  pausa}`; `REVELA = 55` chars/s, `PAUSA = 0,8`; render desenha
  `txt.slice(0, chars)` nas **posições fixas de sempre** (linha 0 em
  py+136, linha 1 em py+160 no mundo; py+64/+92 no evento); **título
  e botões completos do 1º frame**. `update(dt)` passa a rodar para
  **ambos** os tipos (mundo ganha o tique; o cronômetro continua só
  de evento).
- **R-CS-3 (avancar em 3 estágios)** — `Cutscene.avancar()`
  (doc): completa a linha → próxima linha → `fecha()`. Chamado pelo
  `Jogo.update` em **clique fora do retângulo de `info().botao`**;
  botão e **Enter continuam fechando direto** (contrato da 42).
- **R-CS-4 (dicas piscando)** — dica existente do evento pisca com
  `floor(relogio*2)%2 === 0` (só desenhada na fase par; cor
  `#6f678a`); **nova dica** "clique para avançar" no overlay de
  mundo (posicionada acima do botão, mesmo piscar). `atual.relogio`
  acumula no `update`.
- **R-CS-5 (sonda)** — `info()` ganha `barras` (0..ABERTURA) e
  `revela: {linha, chars}`; campos existentes intactos.
- **R-CS-6 (testes)** — **seção 48**: avancar 3 estágios (fixture
  direta `Cutscene.mundo(1,2)`); typewriter progride e completa
  (sonda `revela`); letterbox sobe até o cap (`barras`); dica pisca
  (presença E ausência em 60 frames); botão/Enter seguem fechando
  (já cobertos na 42). **Seção 42**: só os 2 asserts de **narração**
  ganham espera (loop de frames até o texto aparecer, com teto);
  todo o resto intacto.
- **R-CS-7 (sanidade)** — `todos.js` **3×** + `ritmo 60`.

## Fora de escopo

- Gatilhos (mundo/evento) · auto-dismiss 3,5s · remover o véu ·
  pausar a batalha · sons · retratos/atores · JSON i18n do roteiro ·
  cena `universo` (tela própria — não é overlay).

## Verificação

- Seção 48 + seção 42 reparada · `todos.js` 3× · `ritmo 60` ·
  QA humano (Ctrl+Shift+R: barras deslizando, texto datilografado,
  dica piscando) · docs · commit · push com aval.
