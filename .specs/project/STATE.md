# STATE — memória persistente

Atualizado a cada leva de trabalho (decisões, adiados, preferências,
lições). É daqui que uma sessão nova retoma o contexto de produto.

## Decisões (com porquê)

- **JS puro ES5 em `js/`, zero dependências, sem build** — o jogo abre
  com `index.html`; testes rodam no Node com harness próprio.
- **Combate 100% automático** (promessa do README) — skills/IA nunca
  ganham botão; o jogador só gere.
- **Layout ancorado com largura adaptativa** (W = clamp(432×aspecto,
  768, 1728)) — 16:9 de referência intacto (testes), telas largas
  preenchem sem barra lateral.
- **Escala de ondas contínua (`ondaTotal`)** — fim do "reset" de
  dificuldade a cada mapa; `Mapas.forca` ficou só nos drops.
- **Perlin com semente = número do mapa** — determinismo exigido por
  testes e screenshots; sorteios independentes do ruído (trocar o chão
  não mexe nos obstáculos).
- **IA utilitária + ruído ∝ (1−agudeza)**, não FSM rígida — INT vira
  atributo buildável em todas as classes; NPCs usam `astúcia(espécie,
  mapa)` (o herói não controla a IA dos monstros).
- **A* só sob demanda** (linha bloqueada + entidade esperta) — arena
  miúda, custo zero no frame comum; burros escorregam de propósito.
- **SemVer 0.x + Keep a Changelog + Conventional Commits** a partir da
  v0.1.0 (ver `VERSIONING.md`).
- **Afixos enxutos (12) em vez de pool grande** — pesquisa mostrou
  *affix bloat* como a armadilha clássica (item vira planilha); raridade
  = quantidade de afixos (0/1/2), no máx. 1 negativo por item.
- **Mods negativos com magnitude 1,5×** — o tradeoff é o que impede o
  auto-equip de decidir tudo; item "amaldiçoado" é recusado por soma
  assinada mas equipável à mão (decisão estratégica sem botão de luta).
- **Smart-loot 70/30 por classe** — drop relevante sem monótono (30%
  foge do viés); `sorteiaDrop` sem classe cai para uniforme (testes).
- **Save sem bump de chave na migração de itens** — `normalizaItem`
  aceita negativos/`afixos` e o corte de nome sobe para 40 (precedente:
  `normalizaStats`); bump de chave só quando a normalização não basta.

## Bloqueios

- Nenhum.

## Adiados (decisão do mantenedor)

- **Ranking de jogadores** — adiado até as estatísticas existirem
  (entregues); próximo candidato de 0.2.0, escopo local.
- Nome do herói com teclado virtual no celular.
- Uso do espaço central entre painéis em telas largas.

## Preferências de fluxo

- **Push/commit de release só com aval explícito** do mantenedor.
- Toda mudança de balanceamento é **medida com `node testes/ritmo.js`**
  antes de virar commit; gate sempre `node testes/todos.js`.
- Trabalho em **fases aprovadas** pelo mantenedor (aprovação por leva).
- Docs e commits em **pt-BR**; mensagens Conventional Commits (tipo em
  minúsculo + escopo opcional; corpo/descrição em pt-BR).

## Lições

- Testes usam `Math.random` real: flakes raros são possíveis (já houve1
  aparente em leva de IA) — repetir a fumaça 3× antes de concluir.
- Coordenadas de UI viram contrato de teste (grade de abas, ×2 do
  harness): mudar layout exige atualizar `fumaca.js`/`cena.js` juntos.
- Âncoras de texto em scripts de edição de docs quebram por quebra de
  linha — conferir com `grep` antes de substituir em lote.
