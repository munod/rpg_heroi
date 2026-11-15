# Spec: Ranking antitrampa — validação de progresso no servidor

Status: **código concluído** (gate verde = 709 confs); IMPLANTAÇÃO PENDENTE no console do Firebase — confirmar com `node testes/regras.js` · Data: 2026-11-15 · Iniciativa: mantenedor
(decisão **D+A** p/ proteger saves/placar; D primeiro).

## Contexto (auditoria medida)

- O repo era público e o config do Firebase é **publicado no jogo
  mesmo** (`js/ranking-config.js` dá 200 em
  `munod.github.io/rpg_heroi/`) — a key é pública **por design** de
  app client-side; proteção vem das **Rules**, não da privacidade do
  repo (repo privado inclusive quebra o Pages no plano gratuito).
- Varredura do histórico inteiro: **só** esse `AIza…` (nenhuma chave
  privada/token/senha). Leitura ao vivo do `rank`: **200** (placar é
  público por design). Storage: 404 (fechado).
- **Buraco real hoje**: as regras validam *forma* e `score > anterior`
  — mas **`score` é escolhido pelo cliente**: dá pra postar o score
  máximo sem jogar. E as regras **não têm relógio por jogador**
  (`resource` expõe só `data/id/__name__`, **sem `createTime`**).
- Por que o save não resolve isso: o placar não vem do save
  (`Ranking.submete()` monta o payload do estado ao vivo e pode ser
  chamado direto do console) — **criptografar o save não mexe no
  ranking** (daí o par D+A: esta leva cuida do placar, a `save-assinado`
  do save local).

## Requisitos

- **R-RA-1 (paridade de score)** — as regras **recalculam** o score a
  partir de `mapa/onda/nivel` com o **espelho exato** de
  `Ranking.scoreDe`. Sem `min()` nas rules (não existe em `math`):
  `x = score − (mapa·100000 + onda·1000)` e
  `(nivel ≤ 999 && x == nivel) || (nivel ≥ 999 && x == 999)` —
  idêntico a `mapa·100000 + onda·1000 + min(nivel,999)` (caso de
  borda `nivel == 999` cai nos dois ramos e dá o mesmo resultado).
- **R-RA-2 (teto de progressão por tempo do projeto)** —
  `mapa ≤ MAPAS_BASE + floor(minutosDesde(MAPA_EPOCA)/100)`,
  com `MAPA_EPOCA = 2026-11-01T00:00Z` e `MAPAS_BASE = 30`
  (constantes nomeadas no topo do arquivo, com a fórmula de
  recalibragem no comentário). Aplicado em **create e update** (teto
  absoluto — sem risco de "cascata de rejeição" que um limite por
  *delta* teria).
  - **Nunca trava legítimo** (medido com `ritmo.js`): campanha
    ≈ 196-222h ⇒ no fim o teto fica ~1,4× acima do possível; cedo o
    piso de 30 dá >10× de folga (60min = mapa 3 medido).
  - **O que ele NÃO faz** (documentado, sem ilusão): o teto cresce
    ~14,4 mapas/dia e o ritmo legítimo é ~10,8/dia — dá pra postar
    `mapa = teto` numa primeira marca (score limitado a dezenas de
    milhões em vez de 10¹⁰). **Relógio por jogador** exigiria
    identidade/campo de início confiável (a primeira marca de um
    apelido é idêntica pra um legítimo atrasado e pra um trapaceiro)
    → adiado; eliminar de vez = opção C (autoritativo no servidor).
- **R-RA-3 (at fresco)** — `|request.time.toMillis() − at| ≤ 24h` e
  `at` nunca no futuro (>5min): mata retrodatação (o limite antigo
  era `at > 0`).
- **R-RA-4 (campos alinhados ao jogo)** — `nivel ≤ 9500`
  (`Personagem.NIVEL_MAX`; era 999999) e `score ≤ 10000100999`
  (compatível com a paridade em `mapa = 100000`).
- **R-RA-5 (mantido)** — leitura livre · `update` exige
  `score > anterior` (a paridade + a ordem estrita já implicam `mapa`
  não-decrescente) · `delete: false` · `hasOnly` + faixas.
- **R-RA-6 (trava de deriva)** — conf na fumaca que trava a
  identidade: `scoreDe(r) == mapa·100000 + onda·1000 + min(nv,999)`
  num varredura de casos de borda (nv 0/998/999/1000/9500, onda 1/100,
  mapa 1/100000). Se um dia o `scoreDe` mudar, **esse teste avisa que
  as rules precisam mudar junto**.
- **R-RA-7 (sonda opcional)** — `node testes/regras.js` (**rede, fora
  do gate**): leitura → 200; P1 paridade violada em `rank/diagnostico`
  → **403** (inócuo: se falhar, sobra score 2 num doc de
  diagnóstico); P0 envio legítimo → **200**; `--teto` (opcional, com
  aviso: escreveria score ~10⁸ no doc diagnóstico) → 403.
- **R-RA-8 (implantação)** — as rules mudam SÓ no arquivo; a
  implantação é manual no console (editor valida sintaxe na hora) e a
  sonda R-RA-7 confirma depois. Nenhuma mudança de cliente/jogo.

## Fora de escopo

Autenticação/identidade · relógio por jogador (leva futura) ·
proxy do ranking · criptografia do save (leva `save-assinado`) ·
mudança de fórmula de score · leitura do placar (segue pública).

## Verificação

`node testes/todos.js` (gate, offline) · `node testes/regras.js`
(rede, opt-in) **após** o mantenedor publicar as rules · console do
Firebase (editor valida a sintaxe antes do Publish).
