# Spec: Cutscenes entre mundos — mapa do universo, narração e eventos

Status: **concluída** (gate verde 3× = 585 confs, ritmo 60min na
faixa: mapa 1 em 31,5min) · Data: 2026-11-11 · Iniciativa: série de
implementações (4ª leva — ROADMAP `Cutscenes entre mundos`).

Pedido do mantenedor: *"cutscenes entre mundos — mapa do universo com os
10 mundos + cutscene de eventos"*. Escopo confirmado com o mantenedor
(três frentes): **(1)** cutscene ao cruzar de mundo, **(2)** cutscene
também nos eventos aleatórios, **(3)** mapa do universo como tela
própria acessível a qualquer momento.

## Contexto (estado atual medido)

- **Cenas**: `selecao`, `jogo`, `ranking` (registradas em `main.js`).
  Padrão de overlay já existe: o **overlay de vitória** em `jogo.js`
  (`vitPendente` → `desenhaVitoria`) desenha por cima de tudo, bloqueia
  a gestão via `UI.bloqueia` + pulando `Gestao.update`, e **não pausa a
  batalha** (roda por baixo). É o precedente perfeito para cutscene.
- **Transição de mundo**: `Batalha.passaMapa()` incrementa `mapa` e
  avisa "MAPA N — nome". Não há detecção de fronteira de mundo nem
  momento narrativo. A 100→101 é coberta pelo overlay de vitória.
- **Eventos aleatórios** (Açougueiro/Gatuno/Enxame/Cofre): nascem com
  `aviso()` + `numero()` na arena — informational, sem narração.
- **Sem "mapa do universo"**: o progresso da campanha (10 mundos) só
  aparece como número do mapa no cabeçalho. Não há visão dos 10 mundos.
- **Rasterizador de testes**: só `fillRect`, `strokeRect`,
  `ellipse+fill`, `globalAlpha`, `translate/scale`, `drawImage` e
  `fillText` — `arc`/`stroke()`/gradiente **quebram o screenshot**.

## Riscos (por que o design importa)

1. **Idle é sagrado**: uma cutscene que PAUSA a batalha ou fica
   esperando clique para sempre com o jogador AFK **trava o progresso**
   (o jogo perde a propriedade idle). Regra: a batalha **nunca pausa**
   — a cutscene é um overlay por cima (padrão vitória) e os eventos têm
   **auto-dismiss**.
2. **Frequência**: Cofre é 8% por onda — cutscene bloqueante a cada
   cofre seria intrusiva. Regra: cutscene de evento dura **~3s e some
   sozinha**, e **só entra se não houver nenhuma no ar** (teto 1, nunca
   acumula nem reinicia timer).
3. **Fronteira errada**: 100→101 é a vitória (overlay próprio) e o
   modo infinito cicla mundos — cutscene lá seria spam. Regra: cutscene
   de mundo **só na campanha** (`mundo destino ≤ 10`).
4. **Simulação offline**: `voltaAusencia` roda centenas de ondas —
   eventos disparariam em massa. Regra: **silenciar eventos durante a
   simulação de ausência** (cutscene de mundo continua valer — é o
   resumo do que aconteceu enquanto esteve fora).

## Requisitos

- **R-CUT-1 (cutscene ao cruzar de mundo)** — em `passaMapa()`,
  detectar fronteira (`Mapas.mundo` mudou, destino ≤ 10) e disparar
  `Cutscene.mundo(de, para)`. Overlay com: título **"MUNDO N — nome"**,
  **mapa do universo** (10 nós com estado conquistado/atual/trancado),
  **narração** (2-3 linhas do que você venceu + o que espera, com o
  chefe do novo mundo) e botão **"Entrar no Mundo N"**. 9 cutscenes na
  campanha (mundos 2..10). 100→101 **não** dispara (vitória assume).
- **R-CUT-2 (não quebra o idle)** — a batalha **continua rodando por
  baixo** do overlay (como a vitória); a gestão fica bloqueada enquanto
  a cutscene está no ar (clique em `+` não responde); `Enter` ou o
  botão fecha. Cutscene de mundo substitui qualquer cutscene anterior
  (a mais recente vence); nunca há duas no ar.
- **R-CUT-3 (cutscene nos eventos aleatórios)** — `Cutscene.evento`
  disparado nos 4 eventos (Açougueiro, Gatuno, Enxame, Cofre) com
  narração própria de 2 linhas + botão "Continuar". **Auto-dismiss
  ~3s** (eventos são frequentes). **Teto 1**: se já há cutscene no ar,
  o novo evento **não** interrompe (nem reinicia o timer). Cutscene de
  **mundo** substitui a de evento (prioridade). **Silenciado** durante
  `voltaAusencia` (simulação offline).
- **R-CUT-4 (mapa do universo como tela própria)** — cena `universo`
  registrada em `main.js`, aberta por botão **"Universo"** na tela de
  seleção (linha do Ranking). Mostra os **10 mundos** com estado
  (conquistado = cor cheia, atual = destaque, trancado = apagado),
  nome/chefe do mundo atual, progresso (`mapa X/10` dentro do mundo) e
  botão **"Voltar"**. O mapa atual vem de `Salvar.lerEstado(p.id)`
  (funciona fora da jogatina).
- **R-CUT-5 (visual sem quebrar o rasterizador)** — o mapa do universo
  usa **só** primitivas suportadas: nós = `fillRect` (retângulos com a
  cor do tema), ligação = `fillRect` fino, destaque = `strokeRect` +
  `globalAlpha`. Nomes dos 10 mundos via `Mapas.LISTA` (fonte única).
  Narração dos mundos e dos eventos em `cutscene.js` (dados puros).
- **R-CUT-6 (testes)** — seção 42 da fumaça cobrindo: gatilho na
  fronteira (10→11 dispara, 3→4 não, 100→101 não), prioridade mundo >
  evento, teto 1 dos eventos, auto-dismiss, bloqueio da gestão durante a
  cutscene + desbloqueio ao fechar, cena `universo` (abre, mostra os 10
  mundos, estado correto para o mapa do save, volta) e botão da
  seleção. Screenshots em `cena.js` (`tela-cutscene.png`,
  `tela-universo.png`).

## Fora de escopo

- Pausar a batalha durante cutscene (violaria idle) · cutscene no modo
  infinito (mundos ciclam — spam) · cutscene no fim de cada MAPA (só
  fronteiras de mundo) · persistir cutscene entre sessões (é momento,
  não estado — fechar no meio perde a narração, o progresso não) ·
  trilha sonora/animação de fala · cutscene de vitória (já existe
  overlay próprio) · rework do `aviso()` da arena (continua).

## Verificação

- **Seção 42** (nº a definir) + reparo do que quebrar.
- `node testes/todos.js` **3×** · gate = 549 confs atuais + seção 42.
- **Sanidade de ritmo**: a cutscene não mexe em combate/curvas — o
  gate basta; rodar `ritmo.js 60` só como confirmação de que
  `passaMapa` modificado não quebrou a progressão.
- Docs (CHANGELOG, AGENTS, STATE, ROADMAP, README) · commit.
