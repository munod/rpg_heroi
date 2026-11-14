# Spec: Virada do herói — facing aplicado no desenho e no corte

Status: **concluída** (gate verde 3× = 699 confs; mapa 1 em
36,4min) · Data: 2026-11-14 · Iniciativa: feedback do
mantenedor pós-v0.4.0 — *"o personagem só bate pra um lado; quero
fazer ele virar para o lado que está batendo"*.

## Contexto (diagnóstico medido)

- **`h.facing` é um campo morto**: escrito em 3 lugares
  (`iniciar` = 1, caminhada do cofre, e o ramo do alvo em
  `atualizaHeroi` quando `|dx| > 2`) e **nunca lido** —
  `desenhaHeroi` faz `drawImage(c.canvas, …)` direto, sem espelhar.
  O sprite é desenhado olhando pra direita → o herói **sempre** bate
  e anda pra direita, independente do alvo.
- O **`Efeitos.corte`** já nasceu com `facing` (espelha o arco com
  `facing === -1`, spec `visual-efeitos`) mas **nenhum call site
  passa** → default 1, arco sempre pra direita.
- Contra-risco: o rasterizador `cena.js` clama
  `DW = max(1, round(dw * sx))` — com `scale(-1,1)` isso vira **1px**
  (o herói virado viraria uma coluna de 1px nas screenshots). O
  `drawImage` precisa entender **escala negativa** (espelhamento).
- `golpeCorpo`/dano são por distância (batem dos dois lados ✓) — o
  problema é puramente de DESENHO.

## Requisitos

- **R-VA-1 (espelhar no desenho)** — `desenhaHeroi`: quando
  `heroi.facing === -1`, desenha com `save → translate(x0 + c.w, y0)
  → scale(-1, 1) → drawImage(0, 0, c.w, c.h) → restore` (sombra
  antes do flip; `globalAlpha` do invulnerável inalterado). `facing`
  segue sendo decidido pelo ramo do alvo em `!atacando` (a volta pra
  `1` é automática quando o alvo está à direita).
- **R-VA-2 (rasterizador)** — `cena.js` `drawImage`: espelhar quando
  `st.sx/sy < 0` (`DW = round(|dw·sx|)`, origem
  `tx + (dx+dw)·sx` e índice da fonte invertido). Auto-check
  sintético no fim do `cena.js` (canvas 4×1 com 4 cores, `scale(-1)`
  → pixels espelhados; **throw** se errar → gate falha).
- **R-VA-3 (corte espelhado)** — as 3 chamadas de `Efeitos.corte`
  (varredura, empurrão, esquiva) passam `heroi.facing`.
- **R-VA-4 (sonda)** — `info().heroi.facing` (1/−1).
- **R-VA-5 (testes)** — **seção 50**: alvo à esquerda → `facing −1`
  (laço com teto); alvo à direita → `facing 1`; auto-check do
  rasterizador roda no gate. Seções 22/32/45 (fixtures do alvo)
  intactas — o flip é só desenho, a simulação não muda.
- **R-VA-6 (sanidade)** — `todos.js` **3×** + `ritmo 60` rápido.

## Fora de escopo

- Espelhar os monstros (formas semânticas — decisão futura) ·
  virada durante esquiva/blink (o ramo do alvo re-vira no frame
  seguinte) · qualquer mudança de hitbox/alcance (já bate dos dois
  lados).

## Verificação

Seção 50 + auto-check do flip · gate 3× · `ritmo 60` · QA humano
(herói ataca pra esquerda com o sprite espelhado, arco do corte
espelhado) · docs · commit (push com aval).
