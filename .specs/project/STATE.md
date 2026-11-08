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
- **Economia de moeda única (ouro)** — sem materiais/loja nesta leva:
  venda 25% × sucata com piso cria a decisão (item bom vende, ruim
  sucateia); bolsa cheia sucateia automático (todo drop tem valor).
- **Aprimoramento no ITEM, com vaga defendida** — auto-equip compara
  `pontuarEfet` (soma × (1+0,08×up)), senão o próximo drop comeria o
  investimento em silêncio; `APR`/`MAX_UP` espelhados em `personagem.js`
  (regra dos espelhos: ele não depende de `itens.js`).
- **Re-roll assimétrico** — sair de maldição (rol positivo garantido) é
  seguro; mexer em afixo positivo é aposta (pode virar neg): custo
  escala com tentativas p/ conter spam.
- **Combo de balanço medido (ESC_HP 1,30 · ESC_DMG 0,10 · regen 4%/s)** —
  com 3 pontos/nível a luta na fronteira era mais longa que a
  sobrevivência (~1 morte/min) e o −5/morte virou esteira (67 mortes/
  50min, mapa 1 >100min). Experimentos isolados não bastavam (só dano:
  53 mortes; só HP: 68; só regen: 52) — só o combo devolveu ~45min e
  ~35 mortes. **Morte frequente anula a própria punição** (lição D2:
  morte = evento). Aprovado pelo usuário com a tabela de dados.
- **O `ritmo.js` gasta ouro** (keystone nv30 + aprimoramento do slot mais
  barato) — o baseline medido é o do jogador que GERENCIA; sem gestão o
  jogo tropeça na fronteira de propósito (é a tese da leva).
- **XP intacto** — a desaceleração real já vem dos 3 pontos (orçamento de
  atributos −40%); alvo de nv redefinido empiricamente (40-48 @15min).
  Pendência original do plano: abrir o `AGENTS` quando mexer em alvos.
- **Loadout com teto 3 e automático = 3 mais avançadas** — decisão só
  cria dilema com escassez (pesquisa: points ≪ nodes); o automático
  preserva saves antigos e os gatilhos (seção 16 intacta). Medido:
  ritmo na faixa mesmo com o teto — fallback LIMITE 4 não foi preciso.
- **Keystone mora em `personagem.js`, não em `skills.js`** — é
  matemática de status derivado e `Personagem.status` é fonte única
  (UI de status, batalha e testes leem ela); assim o efeito não precisa
  de espelho. `skills.js` fica só com o que dispara em combate.
- **Respec: loadout livre, keystone 10 de ouro** — cobrar por trocar de
  ideia sem ponto investido seria freio (padrão D4: respec barato); o
  custo simbólico honra a decisão aprovada e o sink real é o
  desbloqueio (200).
- **Aba Classe em grade 2×2** — 5 abas são contrato de teste (grade de
  cliques); o espaço de uma linha por classe virou 2 colunas p/ caber
  loadout + keystone dentro do painel de 300px (clique do Mago
  atualizado: 673,102).
- **Lendário = 1 negativo forçado + 1 positivo + efeito** — regra
  única e testável (o tradeoff mora na estrutura, não em texto);
  pool de 2 por tema espelhando o CLAMP de `Mapas.info` (mapa 4+ = tema
  3, igual ao cenário); efeitos com matemática pura em `itens.js`
  (testável sem arena) e gatilhos comportamentais em `batalha.js`
  (1 hook cada — padrão keystone/efeito).
- **Teste de efeito ao vivo precisa ler o status AO VIVO** — congelar
  `stBase` quebra com nivelamento/drop de armadura no meio; e o frame do
  hit tem lag de 1 (stats calculados antes do dano do inimigo) — só
  confirmar no frame seguinte (lição da seção 26).
- **Fixtures de morte/HP-baixo exigem `restaurarOnda` de pressão** — com
  sustento + ondas fracas herdadas o herói não morre nem cai de HP:
  seções 12/16(×2)/17/21/22/27/veneno agora forçam onda alta ou calma
  explicitamente; asserts de onda/ouro na morte são **relativos ao frame
  anterior** (pathing livre dá kills e limpa ondas antes do contato).
- **Ritmo varia ±7min entre runs** (RNG/drops/mortes) — alvo de ritmo só
  pela média de ≥4 runs; e guarda velho tipo `rar <= 3` vira flake de 1%
  quando nasce raridade nova (lendário) — revisar guards a cada raridade.
- **`p.nivel`/`p.classe` alterados numa fixture vazam p/ seções
  seguintes** — restaurar o valor logo após o teste (precedente: 17 →
  `p.nivel = 25`).


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
- **Fixture de luta precisa fixar a agudeza**: a seção 21 flakava ~1 em
  6 porque herdava INT 50 → estados `kite/recuar` do cérebro e, sem
  regeneração, o herói fraco fugia sem atacar (1 abate/67s — trace
  diagnosticou). Luta de teste = INT 8 (burro agressivo). Achado
  correlato registrado no ROADMAP (impasse potencial de build gênia
  fraca: `recuar` não ataca e não cura).
- Coordenadas de UI viram contrato de teste (grade de abas, ×2 do
  harness): mudar layout exige atualizar `fumaca.js`/`cena.js` juntos.
- Âncoras de texto em scripts de edição de docs quebram por quebra de
  linha — conferir com `grep` antes de substituir em lote.
