# Spec: Curvas de velocidade — recarga sem piso + sub-passos

Status: **concluída** (gate 3×, seção 34 com sensibilidade provada,
ritmo média 43,3min/4 runs) · Data: 2026-11-09 · Iniciativa: playtest
(pedido: "curva de velocidade de movimento e ataque precisam ser maiores,
bem maiores") · Decisões do usuário: **ataque sem piso** (`35/vel` puro)
· **movimento mantém a curva** (`46 + DES×3`) com **sub-passos** no
`mover()`.

## Contexto

Medição (DES 8/100/300/500/999, build sem itens):

- **Ataque estagnava em DES 62**: `recarga = max(0,15; 35/vel)` bate o
  piso de 0,15s a partir de vel 233 → DES 100, 300 e 500 davam **todos
  os mesmos 6,67 golpes/s**; toda DES acima de ~62 era desperdiçada no
  golpe. (A animação já acompanha a recarga desde a leva de correções —
  o piso era o último teto.)
- **Movimento explode sem freio físico**: DES 500 = 1546 px/s → passo de
  **25,8px/frame** com raio do herói 6 e obstáculos de **r=5-7** (raio
  de colisão cru) → salto de 25px > distância mínima 11 → `mover()`
  saltava por cima (atravessamento).

## Requisitos

- **R-VEL-1 (recarga sem piso)**: `status().recarga = 35 / vel` direto
  (remove `Math.max(0.15, …)`). Teto natural = o loop de frames
  (~60 golpes/s com dt 16,7ms) quando `recarga < dt`. `vel` continua
  com piso 10 → recarga ≤ 3,5s (sem divisão por zero). Referências:
  DES 8 → 0,500s · DES 100 → 0,101s · DES 300 → 0,037s · DES 500 →
  0,023s (≈44 g/s) · DES 999 → 0,012s (limitado pelo frame).
- **R-VEL-2 (sub-passos)**: `mover()` em `batalha.js` quebra qualquer
  deslocamento em frações de **≤4px** (4 < menor sobreposição do jogo =
  raio obst 5 + raio morcego 5 = 10) aplicando `resolve()` a cada fração — colisão vale em
  QUALQUER velocidade. Afeta todos os chamadores (herói, inimigos,
  empurrão, esquiva, gatuno). Custo: ceil(25,8/4) ≈ 7 iterações ×
  ~5 obstáculos = desprezível.
- **R-VEL-3 (curva de movimento intacta)**: `46 + DES×3 + itens` —
  NÃO muda.

## Fora de escopo

- Nova curva por NÍVEL (análise anterior; o pedido afinal era por DES),
  teto de velocidade de movimento, mudanças em inimigos/IA.

## Verificação

- Seção 34 da fumaça:
  1. recarga sem piso: DES 500 → `35/vel` (< 0,15) e DES 8 → 0,500
     intacto; fórmula exata conferida;
  2. sub-passos: herói a DES 500 (25,8px/frame) correndo pelo campo por
    milhares de frames **nunca atravessa um obstáculo** — propriedade
    geométrica: se o segmento do frame corta o miolo do obstáculo
    (dist centro→reta < r−4) e os DOIS extremos estão longes da borda
    (> r+3), houve atravessamento. Falhava com salto direto; passa com
    sub-passos (`info().obst` ganha `r`).
- `todos.js` 3× · `ritmo.js 50` re-medido (DES 8 = 0,500s inalterado;
  risco só via `vel` de itens > 233) · docs.
