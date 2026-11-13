# Spec: Árvore de skills maior — 8 skills, ramos e loadout escalonado

Status: **concluída** (gate verde 3× = 615 confs, sanidade 2×2400min
na faixa: mapa 36 · nv 3247) · Data: 2026-11-12 · Iniciativa: série de
implementações (5ª leva — ROADMAP `Árvore de skills maior`).

Pedido do mantenedor: *"árvore de skills maior — o jogador escolhe
quais usar (amplia o loadout de 3)"*. Escopo confirmado com o
mantenedor (duas frentes + formato do teto): **(1)** mais skills por
classe + loadout maior, **(2)** **árvore literal com ramos** (variantes
por skill) e **(3)** teto de ativas que **escala com o nível**.

## Contexto (estado atual medido)

- **5 skills por classe**, desbloqueio em **5/15/25/35/45** — tudo
  liberado em ~20min de jogo; depois disso **zero novidade de skill
  durante as ~220h de campanha**.
- **`Skills.LIMITE = 3`** fixo: `carregadas(p)` = desbloqueadas ∩
  `p.loadout` (automático = as 3 mais avançadas); UI na aba Classe
  (toggle por skill, mín 1, máx 3).
- A batalha lê os **campos** das skills de `skillsVigentes` (vem de
  `carregadas` a cada frame em `atualizaHeroi`) — gatilhos por `tipo`
  (`area` conta golpes em `golpeia`, `nuke/cura` em `skillsPeriodicas`,
  `mobilidade/medo` em `skillsPosicionamento`, `veneno` em
  `aplicaVeneno`) — **nenhum gatilho precisa mudar** para esta leva.
- **Painel da Classe**: `UI.panel(408,36,352,300)` — skills em
  **coluna única** `y = 178 + i*25` (5 linhas acabam em 302) e keystone
  em 306. **8 skills não cabem em 1 coluna** (mínimo de toque 24px) —
  a grade precisa virar **2 colunas**.
- **Baseline medido**: o `ritmo.js` usa o automático (`p.loadout`
  nulo) — se o automático crescer, a progressão medida (222,5h; faixa
  dos 4 runs de 2400min: mapa 29-36, nv 2600-3300) corre risco.

## Riscos (por que medir)

1. **Baseline**: o automático segue o teto — teto 3→5 acelera o
   `ritmo.js` direto. Mitigação de projeto: **nv < 50 o jogo é
   IDÊNTICO ao medido** (teto 3, 5 skills antigas, ramos na base) — o
   crescimento todo acontece depois do 1º quarto de hora.
2. **Ramos como power creep**: ramo é **sidegrade obrigatório** (todo
   ramo mistura buff e nerf — asserção de dados na seção 43).
3. **`aCada` é inteiro** (o gatilho `area` usa `%`) — mods fracionários
   arredondam para ≥1 ou o proc nunca dispara.
4. **Espelhos**: `personagem.js` não pode depender de `skills.js`
   (`normalizaLoadout` espelha o teto) — o espelho vira o teto
   **absoluto 5**, e a fatia por nível fica só em `Skills`.

## Requisitos

- **R-ARB-1 (árvore maior: 8 skills/classe)** — 3 skills novas por
  classe (12 no total), **reusando os 6 tipos existentes** (nenhuma
  mecânica nova na arena), desbloqueio em **60, 150 e 400** (além de
  5/15/25/35/45). Os 12:

  | classe | nv | tipo | id | nome | base |
  |---|---|---|---|---|---|
  | guerreiro | 60 | cura | `impeto-vital` | Ímpeto Vital | intervalo 7 · pct 0,05 |
  | guerreiro | 150 | nuke | `estocada` | Estocada Brutal | intervalo 9 · mult 3,4 |
  | guerreiro | 400 | medo | `grito-guerra` | Grito de Guerra | gatilho 52 · alcance 60 · dur 3 · intervalo 11 |
  | mago | 60 | veneno | `toxina-arcano` | Toxina Arcana | chance 0,25 · dps 0,6 · dur 5 |
  | mago | 150 | medo | `horror-abissal` | Horror Abissal | gatilho 60 · alcance 64 · dur 4 · intervalo 12 |
  | mago | 400 | cura | `escudo-arcano` | Escudo Arcano | intervalo 9 · pct 0,05 |
  | ladino | 60 | cura | `bandagem` | Bandagem Rápida | intervalo 6 · pct 0,05 |
  | ladino | 150 | medo | `sombra-pavor` | Sombra Pavorosa | gatilho 44 · alcance 56 · dur 2,8 · intervalo 9 |
  | ladino | 400 | nuke | `adaga-perfurante` | Adaga Perfurante | intervalo 8 · mult 3,6 |
  | clérigo | 60 | mobilidade | `passo-sagrado` | Passo Sagrado | modo blink · gatilho 44 · distancia 80 · intervalo 9 |
  | clérigo | 150 | veneno | `peste-divina` | Peste Divina | chance 0,3 · dps 0,7 · dur 6 |
  | clérigo | 400 | nuke | `ira-celestial` | Ira Celestial | intervalo 10 · mult 4,0 |

  Cobertura de tipos por classe após a leva: guerreiro area×3/nuke×2/
  mov/medo/cura · mago nuke×2/area×2/mov/veneno/medo/cura · ladino
  nuke×2/veneno×2/mov/area/cura/medo · clérigo cura×2/nuke×2/medo/
  area/mov/veneno. `proxima(45)` passa de `null` para a nv 60.

- **R-ARB-2 (ramos — a árvore literal)** — **todas as 32 skills** têm
  `ramos: [A, B]` — cada um `{id, nome (≤6 chars p/ o botão), efeito
  (1 linha), mods}`:
  - **`mods` = fatores multiplicativos** sobre os campos base
    (ex.: `{mult: 1.45, intervalo: 1.3}`); aplicados em
    **`Skills.comRamo(sk, ramoId)`** (copia + merge) e usados por
    `carregadas` → a batalha **não muda** (a arena lê campos).
  - Campos modáveis: `mult, intervalo, aCada, pct, chance, dps, dur,
    distancia, impulso, alcance` — **`gatilho` é proibido** (polaridade
    ambígua: fugir antes é seguro porém tira uptime).
  - **`aCada` arredonda para inteiro ≥1** após o mod (o proc `area`
    usa `%`).
  - **Sidegrade obrigatório**: todo ramo tem **≥1 buff e ≥1 nerf**
    segundo a tabela de sentido (`+1`: mult/pct/chance/dps/dur/
    distancia/impulso/alcance · `−1`: intervalo/aCada) — asserção de
    dados na seção 43; **nenhum ramo é buff puro**.
  - Estado: **`p.ramos = {skillId: ramoId}`** — **ausente = base
    neutra** (os valores atuais, intocados → o baseline medido não
    muda para quem não mexe, incluindo o `ritmo.js`). Ciclo no UI:
    **base → A → B → base**.
  - Normalização em `Personagem.normalizar` (sem depender de
    `skills.js`: só valida strings, como `normalizaLoadout`) — default
    `null`.
  - **Tooltip**: mostra a skill com os **números do estado atual**
    (`comRamo`) + as duas linhas dos ramos e qual está ativo.

- **R-ARB-3 (loadout escala com o nível)** — `Skills.limite(nivel)`:
  **3** (nv < 50) → **4** (nv ≥ 50) → **5** (nv ≥ 150);
  `Skills.LIMITE = 5` vira o **teto absoluto** (espelho do
  `normalizaLoadout`, que sobe de 3 para 5). `carregadas` (automático
  **e** seleção) fatia para o limite **atual**; UI, `alternarSkill` e
  toasts usam `limite(p.nivel)` (contador `x/y`). **Aviso no level-up**
  quando o teto sobe (nv 50/150), junto do aviso de skill desbloqueada.
  nv < 50 permanece **idêntico ao medido** (teto 3).

- **R-ARB-4 (UI da aba Classe)** — grade **2 colunas × 4 linhas**
  (`x = 416 + (i%2)*174`, `y = 178 + floor(i/2)*29`, ordem por nível):
  coluna de 166px = **toggle 118×24** (nome, fonte 10px) + **botão de
  ramo 44×24** (cicla base→A→B; desabilitado se bloqueada; tooltip
  descreve os dois). Keystone continua em 306. Alvo de toque ≥24px
  preservado. Só primitivas do rasterizador.

- **R-ARB-5 (testes)** — **seção 43**: `limite(nv)` nos marcos (3/4/5)
  e `LIMITE = 5`; `carregadas` auto nv45 = 3 (seção 25 intacta) e
  nv200 = 5; seleção explícita fatiada pelo limite atual; 8
  skills/classe e níveis 5..400; `proxima(45).nivel === 60`; ramos —
  toda skill tem 2, `comRamo` aplica os fatores, `aCada` ≥1
  arredondado, base neutra por padrão, ciclo A/B, **lado a lado:
  ≥1 buff e ≥1 nerf em todo ramo**; `p.ramos` normaliza; UI — 8
  linhas + botões de ramo funcionam. **Atualizações legítimas**:
  seção 16 (`daClasse === 5` → 8, `proxima(45) === null` → nv 60) e
  seção 25 (migração: teto 5). Screenshots da aba Classe em `cena.js`.

- **R-ARB-6 (sanidade de ritmo)** — `ritmo.js 2400` ≥2 runs vs
  faixa de referência (4 runs da leva anterior: **mapa 29-36 · nv
  2600-3300**; mortes não discriminam — variância 1..112). Fora da
  faixa para cima de forma sistemática = estolou → ajustar: marcos de
  loadout mais tardios (75/250) ou skills novas mais fracas. O
  `ritmo.js` continua **suspenso como decisor de gosto**.

## Fora de escopo

- Novos tipos/gatilhos de skill (a arena não muda) · árvore com
  investimento de pontos (sem skill points — o ponto é de atributo) ·
  ramos com efeitos comportamentais novos (só mods numéricos) ·
  rebalancear as 5 skills antigas ou seus níveis · keystone novo ·
  arrastar/reordenar o loadout · salvar/esconder ramos por preset.

## Verificação

- **Seção 43** (nº a definir) + reparo do que quebrar (16/25).
- `node testes/todos.js` **3×** · **sanidade `ritmo.js 2400` ≥2
  runs** (R-ARB-6) · screenshots da aba Classe.
- Docs (CHANGELOG, AGENTS, STATE, ROADMAP, README) · commit.
