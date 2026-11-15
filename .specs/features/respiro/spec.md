# Spec: Respiro entre ondas — contagem visível, recompensa no clear e fim do delay duplo

Status: **em implementação** (Leva 2 da leva "dopamina/viciante") · Data: 2026-11-15 ·
Iniciativa: mantenedor (reclamação de tédio: "o personagem dorme entre as ondas").

## Contexto

- Reclamações do playtest: **falta de dopamina** nas pausas entre ondas; o
  **delay só sobe com o mapa** (`esperaOnda()` = `2 + (mapa−1)×1,1`, sem
  teto → 111s no mapa 100 vs ~15s de clear ≈ **79% do tempo morto**) e
  **piora no troco de mapa**: a morte do chefe seta
  `tOnda = ESPERA_TRANSICAO` (8s) **e** o `passaMapa()` seta **outro** 8s →
  **16s de campo vazio** em todo mapa novo (`batalha.js` linhas ~979 e ~482).
- O HUD só mostra `Onda 45 (0)` durante a espera — **sem contagem**, a
  espera parece infinita. XP/points param no respiro (sem kills), então o
  único beat é distribuir pontos, sem nenhum lembrete.
- Referência de gênero (D2 Survivors / survivors-like): nunca deixar a
  tela sem informação; o "momento" do clear é decisão/recompensa.
- **Fora de escopo aqui** (vem na Leva 3, medido com o `ritmo.js` novo):
  teto do rampa (`ESPERA_TETO`) e qualquer mudança de balance.

## Requisitos

- **R-RES-1 (contagem no HUD)** — enquanto `inimigos === 0 && tOnda > 0 &&
  herói vivo`, o HUD da arena mostra `PRÓXIMA ONDA EM Xs` alinhado à
  direita, logo abaixo da linha `Onda N (k)` (mesmo x, `vy + 17*k`).
  `Batalha.info()` passa a expor **`espera: tOnda`** (sonda p/ teste).
- **R-RES-2 (recompensa no clear)** — quando o último inimigo morre
  (`inimigos === 0` logo após o splice em `mataInimigo`) e **não** é o
  chefe da onda 100 e o herói está vivo, dispara
  `aviso('ONDA LIMPA · Xs · +N PONTOS', '#8ce08c')` — o `+N PONTOS`
  aparece só se `p.pontos > 0` (usa `UI.abrev`, nunca estoura a janela).
  O clear vira beat de decisão: **quanto falta pra próxima + o que já
  dá pra distribuir**. Aviso do chefe (`BOSS DERROTADO!`) e do mapa
  (`MAPA N`) seguem intactos.
- **R-RES-3 (fim do delay duplo)** — morte na onda 100 seta
  `tOnda = 0` (era `ESPERA_TRANSICAO`): o `passaMapa()` é o **único** a
  contar os `ESPERA_TRANSICAO` 8s → transição 16s → **8s**, com banner e
  cutscene **já no kill** (recompensa imediata). A onda 1 do mapa novo
  continua nascendo após esses 8s (`tOnda` do `passaMapa`).
- **R-RES-4 (testes)** — fumaça: (a) `info().espera > 0` durante o
  respiro e o texto `PRÓXIMA ONDA` aparece no frame; (b) texto
  `ONDA LIMPA` aparece no clear e **não** aparece na morte do chefe;
  (c) do kill do chefe ao `mapa ≥ 2` passam **< 200 frames** (~3,3s;
  eram ≥ 479 só pro primeiro 8s). As seções 12/39 (chefe/vitória)
  existentes intactas.

## Verificação

`node testes/todos.js` · `node testes/ritmo.js 15` (o JSON ganha a
métrica de espera — sanity: `esperaPct` coerente com a duração dos
respiros) · QA manual: morrer o chefe do mapa 1 vendo banner+cutscene
imediatos e contagem de 8s na onda 1 do mapa 2.
