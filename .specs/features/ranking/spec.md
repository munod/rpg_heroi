# Spec: Ranking global (Firebase/Firestore)

Status: **concluída** (gate 3× · seção 35 = 46 confs · 441 confs no
total) · Data: 2026-11-09 · Iniciativa: playtest
(pedido: "vamos trabalhar o ranking; pensei no Firebase"). Decisões do
usuário: **progresso composto** (mapa/onda/nível) · **apelido livre,
melhor por apelido** · **botão na tela de seleção → nova cena** ·
**envio no fecho de mapa + na morte**.

## Contexto

O jogo é 100% cliente (localStorage) e publicado estático no GitHub
Pages — não há servidor para guardar resultados entre jogadores. O
Firestore (plano Spark gratuito: 1GB / 50k leituras / 20k escritas por
dia) cobre o porte com folga e o SDK *compat* carrega por CDN como
`<script>` global, casando com o padrão IIFE/ES5 do projeto **sem build,
sem npm**.

Fora de escopo (MVP): login/auth, histórico de runs, paginação,
App Check/anti-cheat. Sem autenticação o resultado é falsificável —
aceito para jogo casual; as **regras do Firestore** impedem spam barato
(documento com forma validada + só aceita `score` crescente).

## Requisitos

- **R-RAN-1 (score composto)**:
  `score = mapa × 100000 + onda × 1000 + min(nível, 999)`.
  Ordenação por `score` desc, desempate por `at` asc. Guardas: onda ∈
  [1,100] nunca colide com o patamar do próximo mapa (mapa 1 onda 100 =
  200.000 < mapa 2 onda 1 = 201.000); nível capado em 999 nunca empurra
  a onda. Doc guarda `nick/score/mapa/onda/nivel/classe/at`.
- **R-RAN-2 (identidade por apelido)**: apelido 1-20 chars, lembrado em
  `rpg_rank_nick_v1` (chave versionada, padrão de persistência do
  AGENTS). Doc ID = slug do apelido (minúsculo, sem acento, só
  [a-z0-9-]). Upsert: **só persiste melhoria** — imposta pelas regras do
  servidor (`update` exige `score > anterior`); o cliente só envia quando
  o score do save melhora (poucas escritas/run).
- **R-RAN-3 (SDK lazy-load)**: o SDK Firebase (`firebase-app-compat` +
  `firebase-firestore-compat` via CDN) só é carregado quando o jogador
  abre a cena `ranking` (injeção dinâmica de `<script>`). Sem
  rede/SDK/config → tudo degrada: `Ranking.submete()`/`top()` viram
  no-op e a cena mostra "indisponível" — o jogo NUNCA bloqueia em rede.
- **R-RAN-4 (gatilhos)**: `passaMapa()` e a morte do herói chamam
  `Ranking.submete()` com o resultado atual. Early-return se sem
  apelido/SDK. O `ritmo.js` e a simulação offline não tocam rede.
- **R-RAN-5 (cena)**: botão **Ranking** na tela de seleção → cena
  `ranking` (volta para `selecao`). Render no canvas no padrão de
  `selecao.js`: top 10 (pos · nick · mapa/onda/nível · classe · data),
  bloco **meu melhor** destacado, estados carregando/vazio/erro com
  cache local (`rpg_rank_cache_v1`) do último top-10. Apelido editável
  na própria cena (digitos filtrados pelo mesmo `Input.typed` de
  `selecao.js`, 1-20 chars).
- **R-RAN-6 (config)**: `js/ranking-config.js` expõe
  `RankingConfig = { firebase: {...}, ativo: false }` — placeholder com
  instruções; usuário cola a config do console. Enquanto `ativo ===
  false` a cena roda em modo "não configurado" (sem injeção de SDK).

## Verificação

- Seção 35 da fumaça:
  1. fórmula do score exata (casos: mapa/onda/nível nas bordas: onda
     100 vs mapa seguinte, nível > 999 capado);
  2. slug (acentos, caixa, caracteres inválidos) e validação do apelido;
  3. "só submete melhoria" (lógica do cliente) e formato do doc;
  4. sem SDK/config (sandbox): `submete`/`top` seguros, cena renderiza
     "não configurado/indisponível" sem lançar;
  5. com SDK stubado: cena renderiza top-10 e meu melhor;
  6. gatilhos: morte e `passaMapa` chamam `Ranking.submete` (spy) —
     e a seção existente do passaMapa continua verde.
- `todos.js` 3× · `ritmo.js` sem mudança (sem rede na simulação) ·
  docs (CHANGELOG, STATE, AGENTS, README, ROADMAP) · commit.
- Setup manual do usuário (console Firebase + regras + config) fora do
  gate — a tela nasce em modo "não configurado" até ele colar a config.
