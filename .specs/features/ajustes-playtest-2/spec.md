# Spec: Ajustes playtest 2 — recarga com piso, cooldown na Stats,
# teto de nível 1000 e observabilidade do ranking

Status: **concluída** (gate 3× · 471 confs · seções 36/37 · ritmo 4 runs
média 43,5min · sim 600min: nv 949 → teto em ~10-11h) · Data: 2026-11-09 · Iniciativa: playtest
(pedido: "não ficou bom a recarga sem piso · valor de cooldown das
skills · teto de nível 1000 · e o ranking não está salvando").
Decisões do usuário: **piso 0,08s** (teto 12,5 g/s — "rápido demais:
bagunça/DPS") · **cooldowns na aba Stats com barra de rolagem** ·
**teto nível 1000** · **prosseguir com o plano A-D**.

## Contexto (diagnóstico já feito)

- **Ranking não salvou**: deploy verificado correto (config `ativo: true`
  no Pages, scripts no ar); **sonda REST de escrita válida = HTTP 200**
  (regras OK — H1 descartada); coleção vazia. Sobram causas do cliente
  (file://, bloqueador, erro de console) — e o `submete` **engolia tudo
  em silêncio** (rejeição do `set` ignorada). Falta observabilidade.
- **Recarga sem piso**: playtest sentiu "rápido demais: bagunça/DPS"
  (DES 500 = 44 g/s). Piso novo 0,08s.
- **Cooldown das skills**: hoje só no tooltip, com valor **base** — o
  combate usa `intervalo × (1,3 − 0,45×agudeza)` (INT) e as de área
  contam golpes. Usuário pediu os valores **na aba Stats** (com rolagem).
- **Nível 36 mil**: progresso offline já tem teto de 1h
  (`AUSENCIA_MAX`) — o 36k vem da aceleração da curva (custo linear ×
  rendimento por mapa). Teto resolve; pesquisa (Idle Heroes Saga,
  Fangclash) confirma 1000 como cap de gênero; XP no cap é **descartado**
  (não acumula buffer invisível).

## Requisitos

- **R-AJ2-1 (recarga com piso 0,08)**: `status().recarga =
  Math.max(0.08, 35/vel)` — teto 12,5 golpes/s. Referências: DES 8 →
  0,500s intacto · DES 100 → 0,101s (9,9 g/s) · DES 300 → 0,080 (12,5) ·
  DES 500 → 0,080 (12,5). Emenda na spec `velocidade-curva`.
- **R-AJ2-2 (observabilidade do ranking)**: `Ranking.submete()` nunca
  é silencioso — grava `ultimoEnvio() = {ok, motivo, quando, score,
  detalhe}` com motivo distinguível: `sem-apelido` (dica **uma vez** por
  sessão) · `arquivo-local` (detecção `location.protocol === 'file:'`,
  dica uma vez) · `nao-melhor` (silencioso, não é erro) · `desativado` ·
  `sdk` (falha ao baixar/iniciar) · `regras` (permission-denied) ·
  `rede` (demais erros) · `enviado` (confirmação do `set`). Toast na
  jogatina (`Gravacao.msg`) em tentativa real com falha + no sucesso;
  a cena Ranking mostra **linha de status** "último envio: ...". Rejeição
  do `set` deixa de ser ignorada (guarda o motivo). `top()` também
  detecta `file://` (estado de erro explicando).
- **R-AJ2-3 (cooldown na aba Stats + rolagem)**: bloco "Skills —
  cooldown" na aba Stats com as 5 skills da classe: tipos com timer
  (nuke/cura/mobilidade/medo) mostram **base e efetivo com a INT atual**
  (`intervalo × (1,3 − 0,45×agudeza)`); área = `a cada N golpes ≈ Xs`
  com a recarga atual; veneno = chance/duração. Skills bloqueadas em
  cinza com "nv X". A aba Stats ganha **barra de rolagem** (wheel +
  arrasto do thumb + arrasto na coluna no toque; conteúdo desenhado só
  na faixa visível — sem `clip`, só pula linhas fora da área). `Input`
  passa a expor o acumulado de wheel (fim de frame).
- **R-AJ2-4 (teto de nível 1000)**: `Personagem.NIVEL_MAX = 1000`
  (fonte única). `Batalha.ganhaXP` no teto **descarta o XP** (early
  return + zera xp ao chegar); loop de níveis para no cap. Cabeçalho da
  jogatina: barra cheia + **"MÁXIMO"** no lugar de `xp/xpProx`.
  `Personagem.normalizar` **clampa `nivel ≤ 1000`** na leitura (save de
  36k → 1000, atributos preservados; xp zerado no cap; sem bump de
  chave — migração na leitura). Score do ranking já capa em 999 →
  inalterado. `Batalha.ganhaXP` exportado (teste, como `passaMapa`).
- **R-AJ2-5 (medição)**: relatório de tempo estimado até nv 1000
  (sim longa via `ritmo.js` com horizonte grande) — só relatório, sem
  mexer na curva. **RESULTADO (sim 600min, baseline gerenciado)**:
  nv 949 em **10h** (mapa 5, onda 22, 682 mortes) → teto 1000 em
  **~10-11h** de jogo. Marcos: nv38@15min · 77@30 · 114@45 · 155@60 ·
  246@90 · 294@120 · 949@600 (≈1,4 níveis/min no topo). A renda linear
  × parede exponencial de HP (1,30/onda) faz a taxa decair — custo
  linear não impede a deceleração. Obs.: runs longos exigiram limpar
  `_textos` no `ritmo.js` (acumulação estourava o Array).

## Fora de escopo

- Ajuste da curva de XP/nível, HUD de cooldown na arena, mudanças nas
  regras do Firestore (sonda provou que estão certas).

## Verificação

- Seções 36 (recarga + Stats/cooldown/rolagem + teto) e 37 (feedback
  do ranking) da fumaça:
  1. recarga: fórmula `max(0,08; 35/vel)` exata em DES 8/100/500 e
     teto 12,5 g/s;
  2. teto: `ganhaXP` 999→1000 e trava (XP descartado); `normalizar`
     clampa save `nivel: 36000`; cabeçalho mostra "MÁXIMO";
  3. cooldown: marcador exclusivo do bloco na aba Stats com valor
     efetivo da fixture (INT fixa → fator conhecido);
  4. rolagem: bloco de skills fora da dobra inicial; wheel revela;
     arrasto do thumb muda o offset; wheel gigante trava no limite;
  5. ranking: sem apelido → motivo `sem-apelido` + dica única; stub
     `file://` → `arquivo-local`; `set` rejeitado → motivo com detalhe;
     sucesso → `enviado` + toast; cena mostra a linha de status.
- `todos.js` 3× · `ritmo.js` 4 runs (piso muda DPS em DES alta) na
  faixa 40-55min · sim longa p/ tempo até nv1000 · docs · commit
  (push com aval).
