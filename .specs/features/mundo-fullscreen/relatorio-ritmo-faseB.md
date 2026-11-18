# Relatório de drift de ritmo — Fase B (anel de spawn full screen)

Data: 2026-11-18 · Método: `testes/ritmo.js` A/B determinístico,
**4 seeds × 15min + 4 seeds × 240min por lado**, mesma máquina,
eventos ATIVOS, default do jogo (k=0,75).

- **Baseline (anel antigo 110-132px)**: commit `c983d2e` (fase A)
- **Novo (anel ≈460px, `raioSpawn()`)**: commit `4d19057` (fase B)
- Artefatos: `resultados/a15_s*.json`, `a240_s*.json` (worktree
  `/tmp/opencode/ritmo-a`) e `b15_s*`, `b240_s*` (`ritmo-b`)

## Sanidade do método

O baseline **reproduz os alvos documentados no AGENTS** (leva
`onda-timer`): nv10 3,0min (docs 3,5) · nv30 8,0min (8,6) · keystone
8,4min (9,2) · @15min nv 64 / onda 80 (60/75) · @240min mapa 12,5 /
nv 1.099 / atrasoPct 0 (12 / 1.050 / 0) ✓ A/B interno é confiável.

## Resultados (média de 4 seeds)

| Métrica | Antigo (110-132px) | Novo (≈460px) | Drift |
|---|---|---|---|
| nv10 | 3,0min | 6,1min | **+103%** |
| nv30 | 8,0min | 14,6min | +83% |
| keystone (nv30) | 8,4min | 15,1min | +80% |
| onda 75 alcançada | 15min | 30min | +100% |
| mapa 1 fechado | 30min | 45min | +50% |
| @15min nv / onda | 64 / 80 | 30 / 44 | −53% / −45% |
| @240min mapa | 12,5 (11-14) | **7,3 (7-8)** | −42% |
| @240min nível | 1.099 | 612 | −44% |
| kpm (abates/min) | 26,3 | 14,8 | −44% |
| clear médio / p95 | 9,9s / 14,6s | **19,1s / 25,3s** | +93% / +73% |
| espera% (BEAT) | 17,6% | 9,8% | −44% |
| atrasoPct (cota 30s) | 0,0% | 0,2% (até 1,2% @15min) | novo, raro |
| mortes | 0 | 0 | sem mudança de letalidade |
| uptime | 100% | 100% | — |

Variância entre seeds: baixa (mapa @240: 11-14 antigo, 7-8 novo;
nv10: ±0,2min). **O efeito é muito maior que o ruído de RNG.**

## Mecanismo

Cada onda paga **~+9,7s de aproximação** (anel 110→460: primeiro
contato sai de ~1,3s para ~5-9s, incluindo zigue-zague em obstáculo).
O ciclo onda (clear + BEAT 2s) praticamente **dobra** → kills/minuto
caem ~44% → renda de XP/ouro por minuto cai ~44% → progressão cai
pela metade. **Nem o BEAT nem a escala de monstros mudou** — quem
controla a duração é o **clear**, exatamente como previsto no AGENTS
("a alavanca de duração da campanha é o clear").

Efeitos colaterais observados:
- `espera%` cai de 17,6% para 9,8% — o jogo fica *menos ocioso*, mas
  também *mata metade*; sensação de ritmo muda (mais luta contínua,
  menos abates/loot por minuto).
- `atrasoPct` sai de 0 para ~0,2% — a cota de 30s raramente estoura
  (p95 de clear 25s < 30s), mas estoura: reforços pontuais.
- Letalidade intacta (0 mortes nos dois lados — herói gerido do
  `ritmo.js` sobrevive; o perigo não foi o que mudou).

## Estimativa de campanha

Sim completa documentada: **44,0h** (anel antigo). Pelo fator de
~1,9× nos marcos: **~80-85h** com o anel novo (medição completa
`ritmo.js 13500` pendente — ~4h de parede por run; pode ser pedida).

## Opções de reequilíbrio (decisão do mantenedor — NÃO aplicado)

1. **Aceitar** — mundo maior = ondas mais longas; campanha ~80h.
2. **Reduzir o anel** para ~320-350px: nasce fora da área visível em
   QUALQUER direção (a direita já é coberta pela janela da Gestão —
   margem calculada no relatório), recupera ~metade do drift.
   *Não é "fora da tela em qualquer direção" no sentido estrito
   (ultrawide/sem painel), mas invisível no layout atual.*
3. **Compensar a renda**: `Batalha.xpAbate` (+~1,8×) e/ou ouro —
   mantém o anel grande e devolve o pace documentado.
4. **Reduzir o BEAT** (2s → menor) — alavanca secundária (só ~2s do
   ciclo de ~21s; eficiência baixa).

Levers documentados no AGENTS (`ESC_HP/ESC_DMG`, `xpAbate`,
`ONDA_SEG/BEAT`, `custoProximo`); qualquer escolha exige novo A/B
com ≥4 seeds + gate verde.
