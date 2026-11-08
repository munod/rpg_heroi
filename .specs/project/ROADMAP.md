# ROADMAP

Ordem é intenção, não compromisso. Cada linha entregue vira spec/link na
feature correspondente; cada linha futura nasce aqui antes de virar spec.

## Entregue

### v0.1.0 — 2026-11-08 (ver `CHANGELOG.md`)
- `core-idle` — núcleo idle, save/progresso, UX dos pontos, ritmo medido
- `arena-camera` — câmera, mundo 2×, renascimento aleatório
- `mapas-e-equilibrio` — 3 mapas + chefe + escala contínua de ondas
- `equipamento` — drops, auto-equip, bolsa, aba Itens
- `skills` — skills automáticas (5/classe), efeitos, mobilidade/medo,
  ataques à distância
- `responsivo-celular` — 768×432 adaptativa, toque, layout ancorado
- `mapas-procedurais` — Perlin Noise com semente do mapa
- `estatisticas` — `p.stats` + aba Stats
- `deploy-pages` — publicação automática no GitHub Pages
- `ia-tatica` — INT do herói, astúcia dos NPCs, A* sob demanda

## Próximo (candidatos a 0.2.0)

- **Gestão estratégica** (spec umbrella `gestao-estrategica`, 4 levas):
  ✅ **A `itens-afixos`** (afixos, negativos, smart-loot, deltas) ·
  ✅ **B `economia-ouro`** (ouro, venda/sucata, aprimoramento, re-roll) ·
  ⬜ C `skills-estrategicas` (loadout + keystone + respec) ·
  ⬜ D `lendarios-equilibrio` (lendários que mudam mecânica + re-medição,
  release 0.2.0).
- **Ranking de jogadores** — *adiado pelo mantenedor até as
  estatísticas existirem* (já entregues em `estatisticas`; base `p.stats`
  pronta: nível/mapa/ondas/abates/bosses). Escopo local (heróis do
  aparelho) — sem backend.
- **Nome do herói via teclado virtual no celular** — ideia anotada na
  leva responsiva (hoje digitação física).
- **Usar melhor o espaço central entre painéis** em telas largas — ideia
  da leva de largura adaptativa (hoje fica o fundo do jogo).
- **Specs contínuas** — toda feature nova começa com
  `.specs/features/<nome>/spec.md` antes do primeiro commit.

## Backlog de ideias (sem compromisso)

- Mais mapas/temas no ciclo infinito com mecânicas próprias.
- Novas skills por classe (ciclo de balanceamento medido).
- Inimigos à distância em mapas profundos (exige re-medir ritmo).
- Decompor `js/batalha.js` (1445 linhas) em módulos menores — dívida
  registrada em `.specs/codebase/CONCERNS.md`.
- Ajustes finos de IA (novos estados, memória maior de perseguição).
