# Spec: Eventos aleatórios — Açougueiro e Gatuno (Leva 2)

Status: **concluída** (gate 3×, ritmo re-medido na faixa)
· Data: 2026-11-08 · Iniciativa: sistema punitivo
(→ v0.3.0) · Decisões do usuário: eventos estilo Açougueiro do Diablo
(inclusive o nome), roubo de ouro contrariável.

## Contexto

A Leva 1 deu peso à morte; esta leva dá **eventos** — o sonho/depoimento
aleatório (pesquisa: D1/D4 — spawn inesperado, injusto de propósito, uma
chance, recompensa gorda, *arc within an arc*: surpresa → derrota →
crescer → vingança) e o **roubo de ouro** (Gatuno fugitivo = contrajogada
pura: build rápido = defesa). Novo `js/eventos.js` (não infla mais o
`batalha.js` que já tem 1500+ linhas): **decisões/estado** moram nele;
**arena** (spawn, movimento, morte) continua em `batalha.js`.

## Requisitos

- **R-EVE-1 (Açougueiro)**: rolagem por onda em `spawnaOnda` a partir da
  **onda 30** (medido: desde a 10 chegava ~min5 e destroçava o ritmo),
  1,5% + **0,5%/onda sem aparecer** (teto 25%). Aviso **"AÇOUGUEIRO —
  CARNE FRESCA!"**. Entidade especial: **hp ×3 da onda, dano ×1,35**
  (medido: ×5/×1,6 = parede inquebrável), **1 chance** — timeout de
  **30s** ou morte do herói = despawn (e o herói que morre com ele em
  campo paga `penalizaMorte(2)` = −20% ouro, −10 ondas). **Derrotou**:
  lendário garantido + **ouro ×10** + XP ×4 + stat `acougueiros`.
- **R-EVE-2 (Gatuno)**: rolagem por onda (**1,5%** — medido: 2,5% +
  perseguição universal custava ondas, só com `ouro > 0`, cooldown de 3
  ondas entre aparições; a IA o persegue com prioridade plana). Ao nascer **rouba 15% do ouro**
  (aviso "GATUNO ROUBOU X OURO!") e **foge para a borda mais próxima** —
  não ataca. **Matado a tempo**: devolve **roubo ×1,2** (+ stat
  `gatunos`); **chegou na borda**: some e o ouro fica perdido.
- **R-EVE-3 (integração)**: `js/eventos.js` carregado no `index.html`
  antes de `batalha.js` (estado/rolagens/pity/timers puros; `batalha`
  chama em `spawnaOnda`, `atualizaInimigos` (fuga do gatuno),
  `mataInimigo` (recompensas), `penalizaMorte` (mult 2) e revivência
  (despawns)). `info()` ganha `acougueiro`/`gatuno` (bools) p/ testes e
  UI. Stats: `gatunos`/`acougueiros` espelhados em `Personagem.STATS`
  (migração automática). Aba Stats: +2 linhas (layout 10×22px).
- **R-EVE-4 (offline/mesmas regras)**: eventos rodam na simulação
  offline como no online (mesmo loop, sem código extra).

## Fora de escopo

- Áudio, skins próprias do Açougueiro (usa sprite de chefe com cor
  própria), mais tipos de evento, UI nova de evento.

## Verificação

- Fumaça seções 28 (Açougueiro) e 29 (Gatuno): rolagens determinísticas
  com `Math.random` stubado (pity/limite/ouro-zero/cooldown), spawn ao
  vivo (`info().acougueiro` + aviso), golpe do herói fraco paga **×2**
  (relativa ao frame) + despawn no renascimento, morte do Açougueiro =
  stat + ouro ×10 (relativo) + lendário no drop, fuga do gatuno
  (roubo mantido) e resgate (roubo×1,2), timeout por unidade
  (`Eventos`), linhas novas na aba Stats.
- `ritmo.js 50` re-medido (eventos ativos) — alvos da Leva 1 continuam
  na faixa · gate 3× · docs/specs.
