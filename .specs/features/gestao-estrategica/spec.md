# Spec: Gestão estratégica — itens, economia, skills (umbrella)

Status: **em execução** — Levas A (`itens-afixos`) e B (`economia-ouro`) concluídas; C/D planejadas
· Data: 2026-11-08 · Versão alvo: 0.2.0 (em 4 levas)
Decisões do usuário: afixos + mods negativos + UI de deltas (sem slots novos
na 1ª leva) · skills = loadout + keystone · economia com ouro em leva própria ·
lendários na leva final, após equilíbrio.

## Contexto

A gestão hoje é quase sem decisão: 2 slots com lista fixa, 4 chaves
positivas, auto-equip automático, 5 skills fixas por nível todas ativas e
nenhuma economia (item indesejado = lixo). Pesquisa online (Valiant,
Diablo/PoE, Last Epoch, Melvor, Scope RPG, Game Design Lab) consolidou os
princípios: pool de afixos enxuto (armadilha do *affix bloat*), mods
negativos criam a decisão que o auto-equip sozinho não dá, keystone com
tradeoff > árvore gigante, respec barato + permanência em gear, e todo drop
com valor mínimo (loop econômico).

## Restrições herdadas (inegociáveis)

- Combate **100% automático** — gestão estrategicamente ativa, luta nunca.
- `js/` ES5, zero dependências, rasterizador de `cena.js` só primitivas
  básicas, save com migração (`chave _v2` + `normalizar`), ritmo medido com
  `node testes/ritmo.js` antes de virar commit, gate `todos.js` verde.

## Requisitos por leva

### Leva A — `itens-afixos` (R-GES-1) ✅ (ver spec própria)
- **R-GES-1.1**: sistema de afixos — raridade define quantos modificadores
  rollam (comum 0 · incomum 1 · raro 2), pool enxuto (~14) de afixos com
  prefixo/sufixo simplificados, valores em faixa (tier por raridade).
- **R-GES-1.2**: **mods negativos** em rolagem (item forte exige
  tradeoff: ex. +dano −hp) — peso combinado limitado por raridade.
- **R-GES-1.3**: **smart-loot** — pesos por classe/build do herói (classe
  não recebe afixo de builds que nunca usa).
- **R-GES-1.4**: UI de **deltas por stat** na comparação (↑/↓ por chave)
  na aba Itens; auto-equip passa a considerar score com tradeoffs
  (configurável: continuar automático ou pedir confirmação de troca).
- **R-GES-1.5**: save `_v2` com migração de itens legados
  (`Personagem.normalizar`), sem quebrar save antigo.

### Leva B — `economia-ouro` (R-GES-2) ✅ (ver spec própria)
- **R-GES-2.1**: ouro cai dos inimigos (escala com onda/mapa) e vira
  atributo de gestão (mostra no painel).
- **R-GES-2.2**: **venda** (25% do valor, com delta claro) e **salvagem**
  (materiais/ouro garantido) — todo drop tem valor mínimo.
- **R-GES-2.3**: sinks: **aprimoramento** de item (+ por nível do item,
  custo crescente) e **re-roll** de 1 afixo; orçamento cria a decisão
  "melhorar o atual ou caçar o próximo".
- **R-GES-2.4**: persistência do ouro/investimento em item com migração.

### Leva C — `skills-estrategicas` (R-GES-3)
- **R-GES-3.1**: **loadout** — escolher quais skills estão ativas entre as
  desbloqueadas (limite por classe, ex. 3 de 5); o combate segue automático
  só executando o carregado.
- **R-GES-3.2**: **1 keystone por classe** com tradeoff forte (muda regra,
  não só número), desbloqueável e com custo/respec.
- **R-GES-3.3**: **respec barato** (ouro) de loadout/keystone — padrão
  mercado: flexível na árvore, permanência em gear.
- **R-GES-3.4**: IA/`Batalha` leem só o loadout ativo; testes de skills
  atualizados (gatilhos não mudam, só quem está elegível).

### Leva D — `lendarios-equilibrio` (R-GES-4)
- **R-GES-4.1**: 4-6 **itens lendários** com efeito que muda mecânica
  (filosofia Last Epoch: tradeoff + identidade), pool por mapa.
- **R-GES-4.2**: re-**medição completa** do ritmo (afixos + ouro + keystone
  mudam poder) — `ritmo.js` na faixa alvo antes do commit.
- **R-GES-4.3**: docs/specs/CHANGELOG atualizados; release 0.2.0 pelo
  checklist de `VERSIONING.md` (com aval).

## Fora de escopo

- Slots novos (amuleto/anel), sets, árvore de passivas tipo PoE,
  backend/ranking, qualquer dependência.

## Critérios de aceite do umbrella

1. 4 levas entregues, cada uma com spec própria em
   `.specs/features/<nome>/` (spec acima vira índice).
2. Gate verde e ritmo na faixa ao fim de cada leva de poder.
3. Nenhum save quebrado (migração testada); CHANGELOG/STATE/ROADMAP
   atualizados a cada leva.
