# Spec: Ritmo punitivo — pontos 3, morte com custo (Leva 1)

Status: **concluída** (gate 4×, ritmo medido em 6 runs)
· Data: 2026-11-08 · Iniciativa: sistema punitivo
(→ release 0.3.0) · Decisões do usuário: −5 ondas + −10% ouro por morte ·
3 pontos por nível · mapa 1 ≈ 50min · mesmas regras offline.

## Contexto

A morte hoje custa 3 segundos (zero peso) e cada nível dá +5 pontos — a
progressão é rápida e a gestão não tem consequência. Com a 0.2.0 pronta
(itens/ouro/skills/lendários), punição dá **valor** às decisões. Pesquisa
(D2, Zen of Design): penalidade = D2-style, **recuperável, visível e sem
espiral** (piso duro); a boa penalidade recompensa por viver.

## Requisitos

- **R-PUN-1 (pontos)**: `p.pontos += 5` → **3** em `Batalha.ganhaXP`;
  texto da UI `+3 pontos`; herói novo continua nascendo com 0.
- **R-PUN-2 (morte)**: na morte (`danoHeroi`, após a regra da 2ª vida —
  **Véu da Fênix evita a penalidade inteira**):
  - **ouro**: `−max(1, floor(10%))` quando `ouro > 0` (piso de 1 para
    pools pequenos; 0 → 0);
  - **ondas**: `onda = max(1, onda − 5)` (**piso: onda 1 do mapa atual**,
    nunca sai do mapa) e a onda atual é **desfeita** (inimigos limpos) —
    ao reviver, a onda reduzida nasce **fresca** via extração de
    `spawnaOnda()` de `proximaOnda` (sem incremento e **sem** contar
    `stats.ondas` — não foi limpa, foi perdida);
  - flag `rollbackPend` consumida no renascimento (`revT <= 0`);
  - preparação para o **dobro** quando a morte for do Açougueiro (Leva 2):
    `penalizaMorte(mult)` com mult 1 hoje.
- **R-PUN-3 (offline)**: **mesmas regras** — a simulação offline roda o
  mesmo `atualizar`, então nada de código novo; conferir que a
  ausência longa não quebra (piso de onda segura o pior caso).
- **R-PUN-4 (ritmo novo)**: alvos **medidos e aprovados** com
  `ritmo.js 50` (6 runs): 1º nível ≈ 35-45s · **15min ≈ nv 40-48 /
  onda 40-55** · **mapa 1 fechado em 40-55min (média ~45)** · mortes
  ~30-40 aos 50min. **XP intacto** (aprovação do usuário: a
  desaceleração real vem dos 3 pontos — orçamento de atributos −40%) e
  **`ritmo.js` gasta ouro** (keystone nv30 + aprimoramento do slot mais
  barato — baseline = jogador que gerencia). Alvos antigos
  (AGENTS/PROJECT/README) **substituídos**.
- **R-PUN-5 (re-equilíbrio aprovado com dados)**: a progressão com só a
  curva de pontos estagnou (67 mortes/50min; −5/morte = esteira; mapa 1
  >100min) — experimentos isolados falharam (só dano 53, só HP 68, só
  regen 52 mortes) e o **combo medido** venceu: **ESC_HP 1,85→1,30**,
  **ESC_DMG 0,18→0,10** + **regeneração 4%/s sem apanhar há 0,5s**
  (sobre a regen constante prévia de 2hp/s). Resultado: ~35 mortes/50min
  e mapa 1 ~45min. (XP não mexido.)

## Fora de escopo

- Eventos (Açougueiro/Gatuno = Leva 2), penalidade por XP/nível perdido,
  mudanças na revivência (3s) ou na regra de offline.

## Verificação

- Fumaça: nível dá **+3** (ajuste do teste existente), texto `+3 pontos`,
  morte determinística (con1/for1) com snapshot de `ouro`/`onda`:
  −10% com piso, `onda = max(1, −5)`, inimigos limpos, renascimento
  recria a onda certa sem contar `stats.ondas`; Véu da Fênix **não**
  paga penalidade; morte com onda ≤ 5 nunca sai do mapa.
- `ritmo.js 50` nos alvos novos · `todos.js` 3× · offline: cenário de
  ausência existente continua verde.
