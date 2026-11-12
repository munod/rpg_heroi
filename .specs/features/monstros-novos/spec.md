# Spec: Monstros novos — espécies com skill própria, ataques à distância e eventos

Status: **em execução** · Data: 2026-11-11 · Iniciativa: série de
implementações (2ª leva — ROADMAP `monstros novos`).

Pedido do mantenedor: *"novos monstros, com skills próprias, ataques a
distância e mais eventos"*.

## Contexto (estado atual medido)

- **4 espécies** em `Batalha.TIPOS` (slime, visgo, morcego, aranha) —
  todas **corpo a corpo**; a IA só tem esquiva/cerco/antecipação (tática
  de posição, não skill de espécie).
- **Nenhum inimigo à distância** — está no backlog desde a leva
  `mapas-e-equilibrio` ("inimigos à distância em mapas profundos, exige
  re-medir ritmo").
- **2 eventos** (Açougueiro = pressão/gordo, Gatuno = contrajogada) —
  falta um evento de **pressão em lote** e um de **recompensa pura**.
- 3 formas de sprite (`slime`/`morcego`/`aranha`) + cor/escala — as
  espécies novas as **reusam com identidade mecânica** (mesmo padrão dos
  10 mundos: recolor + mecânica, sem sprite novo).
- O projétil do herói (`Efeitos.missil(origem, alvo, cor, esc, cb)`) já
  resolve o dano **na chegada** com callback — é o caminho pronto p/
  inimigo atirador.

## Riscos de balanceamento (por que medir)

Toda espécie nova que dá **mais dano recebido** pode virar estol — foi
o que `k=1` fez no mundo 3 (2/2 runs) e o que a compensação de pontos
evitou nesta leva. Regras da casa valem: **sanidade medida antes de
concluir**, comparando com a referência da leva anterior.

## Requisitos

- **R-MON-1 (3 espécies novas, mecânica própria)** — em `TIPOS`,
  reusando as 3 formas com cor/escala:
  1. **`atirador`** (forma `morcego`, cor fria) — **skill: ataque à
     distância** (R-MON-2).
  2. **`regenerador`** (forma `slime`, cor verde acinzentada) —
     **skill: regen** — cura `hpMax × 3%/s` quando não apanha há **2s**
     (espelho do `inv` do herói; pressão para o herói não deixar ele
     vivo parado).
  3. **`drenador`** (forma `slime`, cor roxo pálido) — **skill: roubo de
     vida** — **30% do dano** que dá vira HP dele (fica tanque contra
     build de dano lento; castiga DPS baixo).
  - Cada um com `hp/dano/vel/xpExtra` **próprios** e **menores** que o
    raro atual (a mecânica já é a ameaça — não dobrar o número).
- **R-MON-2 (ataque à distância do `atirador`)**:
  - **Alcance 90px** (mundo tem 384×268 — fica fora do alcance do
    guerreiro de 26) e **cooldown 2,2s** (mais lento que o golpe corpo a
    corpo de 1,4s, para dar janela de reação).
  - Abaixo do alcance ele **se aproxima** (mesma IA), acima **atira** —
    `Efeitos.missil` com o dano aplicado **na chegada** (padrão do
    herói, inclui a resolução do `resolve()` no impacto).
  - **Não atira com herói caído** (não farmsa cadáver).
- **R-MON-3 (distribuição — não mexe no balanço dos 10 temas)**: as
  espécies novas entram como **`raro` de mundos específicos** (nunca
  substituindo o `comum`), escolhidos para variar a ameaça:
  atirador nos mundos de distância (6, 8), regenerador nos tanques (5,
  7), drenador nos de pressão (9, 10). O `comum` de todos os mundos
  **continua o mesmo** — a progressão medida (222h) não muda de forma.
- **R-MON-4.1 ajustado por medição (R-MON-5)**: os **10% originais do
  Enxame** viraram esteira — medição 1200min: **27 mortes / mapa 21**
  vs *13 / mapa 23* da referência. **Isolamento** com `ENX_BASE=0` deu
  **mapa 24 / 1 morte** (ate melhor que a referência) → causa isolada.
  Ajuste final: **1,5% + pity 0,5% + carência 6** (mesmo patamar do
  Açougueiro) — medido em 7 runs: 3% → média 72 mortes e progressão
  projetada ~253h (fora do alvo 200h ±20% = 240h); 0% → média 30 e
  ~195h. **1,5%** fica no meio. NOTA: a variância entre runs é
  1..112 mortes — a decisão foi por progressão projetada.
- **R-MON-4 (2 eventos novos)** em `js/eventos.js` (rolagem pura, a
  arena em `batalha.js` — mesmo desenho dos atuais):
  1. **Enxame** — 10% por onda desde a 15 (pity +1%/onda, teto 30%),
     **2× inimigos** na onda e **XP/ouro ×1,5** nela; carência de 4
     ondas. É o evento de **pressão com recompensa** (o Açougueiro é 1
     inimigo forte; isso é multidão).
  2. **Cofre Abandonado** — 8% por onda desde a 10 (pity +1%, teto 25%),
     nasce **no cenário** e o herói precisa **chegar até ele** (não é
     automático): `+ouro = forca × 25` e um **drop garantido** de rar ≥2.
     Evento de **recompensa pura** (não existe hoje).
- **R-MON-5 (sanidade medida)**: rodar `ritmo.js 2400` e comparar com a
  **referência da leva anterior** (mapa 36 · nv 3224 · 20 mortes ·
  ouro 72,7M). Critério: **mesmo mapa ±2, mortes ≤ 2× (eventos), nv
  ±5%**. Se o ranged/Enxame estolar → ajustar (alcance/cooldown/chance)
  e re-medir. **≥4 runs se houver empate.**
- **R-MON-6 (testes)**: seção 41 da fumaça cobrindo — espécies novas em
  `TIPOS` com `xpExtra`/stats próprios; o `atirador` **não se aproxima
  e atira** (projétil sai, dano cai **na chegada**, janela de reação);
  **não atira com herói caído**; `regenerador` cura só após 2s sem levar
  dano (e para de curar ao apanhar); `drenador` cura 30% do dano; as
  espécies novas estão nos `raro` dos temas certos **e o `comum` não
  mudou**; `Enxame` rola/nasce com 2× e paga ×1,5 (e não sobrepuja o
  Açougueiro); `Cofre` exige aproximação, paga e some.

## Fora de escopo

- Sprites novos (reusa as 3 formas) · árvore de skills do herói ·
  cutscenes/mapa do universo (leva seguinte) · IA com BT/influence map
  (levas 5 e 6 do ROADMAP) · trocar o `comum` dos 10 mundos ·
  balanceamento de `k`/`esperaOnda` (medidos na leva `mundos`) ·
  efeitos de status novos no herói além dos já existentes.

## Verificação

- **Seção 41** (nº a definir) + reparo do que quebrar.
- `node testes/todos.js` **3×** · **medição de sanidade** (R-MON-5) ·
  docs (CHANGELOG, AGENTS, STATE, ROADMAP) · commit.
