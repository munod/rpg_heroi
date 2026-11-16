# Auditoria técnica — RPG Herói

**Data:** 2026-11-16
**Versão auditada:** v0.7.0 (HEAD `c3c6b91`)
**Escopo:** todo o repositório (`index.html`, `style.css`, `js/`, `testes/`, `.specs/`, `.github/`)
**Modo:** somente leitura (nenhum arquivo de código foi alterado durante a auditoria)

---

## 1. Veredito

A base é sólida e disciplinada: gate único funcionando, zero dependências, pixel art
procedural determinística, persistência defensiva e documentação de decisões muito acima
da média. O gate (`node testes/todos.js`) está **verde** e todos os arquivos passam no
`node --check`.

Ainda assim, a auditoria encontrou:

- **1 bug funcional sério** deixado pela refatoração do mapa infinito (teleporte do mago
  e do clérigo preso ao mundo antigo de 384×268);
- **1 lacuna de processo** (o CI publica no GitHub Pages sem rodar o gate);
- **fragilidades de integridade** no ranking e na assinatura do save;
- **divergências entre UI/documentação e código** — inclusive na matemática dos atributos
  e em um keystone que perde o efeito no meio da campanha;
- **resíduos de estado** de eventos aleatórios após a morte;
- dívidas de performance pontuais e documentação desatualizada.

Prioridade de correção: **P1 (blink) → CI → tooltips/keystone → eventos no rollback →
ranking/save → performance → docs**.

### 1.1 Status das correções (aplicado em 2026-11-16)

| Item | Status |
|---|---|
| 3.1 blink no mundo infinito | **corrigido** + teste (seção 53) |
| 3.2 CI roda o gate antes do deploy | **corrigido** (`deploy.yml`, `needs: test`) |
| 3.4 aviso de save rejeitado na seleção | **corrigido**; exigir `_s` no import ficou **aberto** (decisão de produto) |
| 3.5 tooltips/keystone/velocidade | **corrigido** + testes (seções 30/40) |
| 3.6 `MAX_UP` no tooltip | **corrigido** |
| 3.7 Enxame/Gatuno no rollback | **corrigido** + teste (seção 29) |
| 3.8 cache do `Salvar.listar()` na seleção | **corrigido** (`Salvar.versao()`) + teste (8b) |
| 3.13 relâmpago do chefe no mundo infinito | **corrigido** |
| 3.14 documentação/comentários | **corrigido** (README, `.specs`, AGENTS) |
| 3.15 API morta | `Input.isDown` removido; `gatEmCampo` agora é usado |
| 3.16 `prefers-reduced-motion` | **corrigido** (default sem shake/flash) |
| 3.18 re-roll do lendário | **corrigido** + teste (seção 24) |
| 3.3 ranking (auth/App Check) | **aberto** — decisão de produto/infra |
| 3.9–3.12, 3.17, 3.19 | **aberto** — anotados como próximos passos |

O gate (`node testes/todos.js`) está verde após as mudanças: **755 asserções**
da fumaça (772 com as 17 de pixel) e seções 53–54 novas.

### 1.2 Segunda passada — fuzz de propriedades (2026-11-16)

Método: harness determinístico (PRNG com seed, 4 seeds × ~111 mil
propriedades puras + 43 mil frames de arena/UI por seed) exercitando
`Personagem`, `Itens`, `Skills`, `Mapas`, `Ranking`, `Assinatura`,
`Salvar`, `IA`, `Batalha` e as cenas/UI (cliques, teclas, toque e roda
aleatórios). Os achados abaixo **não** apareciam na leitura
estática nem no gate original; cada um virou regressão na **seção 54**:

| Achado | Causa raiz | Correção |
|---|---|---|
| Save corrompido derrubava o boot | `nome` array/espaço → `String().trim()` vazio → `validar` lançava "nome ausente" e `listar` propagava no `Game.init` | fallback `Herói`; `listar` isola (try/catch) e `gravar` preserva a entrada ilegível |
| `xp === xpProx` em nível alto | `xpProx − 1` não é representável acima de ~2^53 (nv ~500) | clamp com epsilon relativo (`xp < xpProx` sempre) |
| `xpAbate` = `Infinity` no infinito | `1,064^tot` estoura 1e308 em tot ~11.433 (mapa ~115) | renda finita limitada a 1e300 |
| Bônus de item sumia no infinito profundo | `normalizaItem` descartava bônus >99.999 e congelava `escala` em 999 | tetos 1e9 (bônus/afixo) e 1e6 (escala) |
| Σpartes ≠ status no piso | clamps `dano ≥ 1` / `HP ≥ 10` não entravam no detalhamento | linhas `piso 1` / `piso 10` |
| `normalizar` não idempotente | `ceil(-0,5)` = `-0` virava chave que sumia no 2º passe | zero não é gravado no bônus |
| Sonda do fuzz para `hp` | `info().hp` é `ceil` e o status pode ficar 1 frame atrás do auto-equip | `info().heroi.hpMax` exposto |

O que o fuzz **não** encontrou: violações em `Skills` (ramos/loadout),
`Mapas` (1..10.000), `Ranking.scoreDe/slug`, `Assinatura` (SHA/HMAC
conferem com o `crypto` do Node em centenas de strings, incluindo as
bordas de padding 55/56/63/64/65), pathfinding (waypoints intermediários
livres), `Itens` (bônus acompanha o re-roll), as faixas de `status` e a
camada de UI/cenas (10 mil frames de cliques/teclas/toque/roda aleatórios
nas telas de seleção e jogo, sem exceção nem estado inválido).

---

## 2. Snapshot medido

| Item | Resultado |
|---|---|
| Gate `node testes/todos.js` | **verde** (4 arquivos, exit 0) |
| `node --check` em `js/*.js` e `testes/*.js` | sem erros |
| `node testes/ritmo.js 2` | funciona (seed 1, determinístico) e grava `resultados/ritmo.json` |
| Scripts carregados pelo `index.html` | **25** |
| Linhas em `js/` | **11.030** |
| Linhas em `testes/` | **7.310** |
| Fumaça | **53 seções** (1–52 + 8b) e **~723 asserções** (`conf(`, 724 ocorrências contando a definição) |
| Maior arquivo | `js/batalha.js` — **2.208 linhas** |
| Git | árvore limpa; tag `v0.7.0` no HEAD |

### Como a revisão foi feita

1. Leitura integral dos documentos de arquitetura, convenções, estado e specs.
2. Leitura dirigida de todos os módulos de `js/` (com foco em estado, saves, combate,
   IA, eventos, UI e persistência).
3. Execução do gate e de `ritmo.js`.
4. Sondas no harness real (`testes/carga.js`) para confirmar comportamentos suspeitos
   (bug do blink, tooltips, keystone, custo por frame, chamadas de ranking no offline).
5. Cruzamento entre o que a documentação afirma e o que o código faz.

---

## 3. Achados

### P1 — Funcional

#### 3.1 Teleporte/blink ainda é clampado ao mundo antigo (384×268)

**Arquivo:** `js/batalha.js:1378-1379`

```js
heroi.x = Math.max(8, Math.min(MW - 8, heroi.x + ux * sk.distancia));
heroi.y = Math.max(10, Math.min(MH - 8, heroi.y + uy * sk.distancia));
```

`MW`/`MH` são 384×268 — o mundo **finito** removido na spec `mapa-infinito`. O restante do
arquivo já opera sem bordas (`resolve`, `spawn`, câmera e `IA.clampFuga` foram corrigidos;
este trecho ficou para trás).

**Quem é afetado:** mago (`teleporte`) e clérigo (`passo-sagrado`), ambos `modo: 'blink'`
(`js/skills.js:98-100` e `260-262`).

**Efeito:** quando o herói já andou além de `x=376` ou `y=260`, o blink o arranca de volta
para o canto do mapa original. O salto pode ter milhares de pixels e a câmera "trava"
(regra de teleporte >96 px), produzindo um piscar visual e perda de posição.

**Evidência (sonda no harness, mago nv 300, 3,3 h simuladas):** 31 saltos >150 px, todos
terminando exatamente em `x === 376`, `y === 260`, `x === 8` ou `y === 10`. Exemplo:
herói em `x = -2437` teleporta para `x = 8`.

**Correção sugerida:** remover o `Math.max/Math.min` e manter apenas `resolve(heroi, 6)`.

**Teste de regressão sugerido:** posicionar o herói em `x > 1000`, disparar o blink e
afirmar que o deslocamento é ≤ `distancia × 1,4` e que a posição não "volta" para a origem.

---

### P2 — Risco alto/médio

#### 3.2 CI publica sem rodar o único gate

**Arquivo:** `.github/workflows/deploy.yml`

O workflow só faz checkout → `configure-pages` → `upload-pages-artifact` → `deploy-pages`.
`node testes/todos.js`, documentado como **o único gate** de verificação, **nunca roda no
CI**. Qualquer commit com gate vermelho vai para o Pages.

**Sugestão:** job `test` (Node 20, `node testes/todos.js` + `node --check` em `js/` e
`testes/`) e `needs: test` no job de deploy.

#### 3.3 Ranking: integridade depende só de regras abertas

**Arquivos:** `.specs/features/ranking/regras-firestore.rules`, `js/ranking-config.js`,
`js/ranking.js`

- `allow create/update` **sem `request.auth`** e sem Firebase App Check: qualquer cliente
  pode escrever em `/rank` (o `apiKey` do Firebase é público por natureza e está no bundle).
- O "teto absoluto" `mapa <= 30 + minutos/100` (desde 2026-11-01) permite **≈246 mapas
  hoje**. O recorde legítimo medido é mapa 100 em 44 h; um bot pode postar M246 e dominar
  o topo.
- O score é recalculado no servidor, mas `mapa`, `onda` e `nivel` continuam escolhidos pelo
  cliente. A regra impede score incoerente, não progresso inventado.
- O doc ID é o **slug** do apelido: "José" e "Jose" colidem, e é possível "assumir" a
  entrada de outro jogador enviando score maior (impersonation).

**Sugestão:** App Check + autenticação anônima; trava de criação por documento (ou Cloud
Function com validação temporal real); reserva de apelido único. Enquanto isso não existir,
deixar explícito no README que o ranking é "melhor esforço" e não competitivo.

#### 3.4 A assinatura do save é contornável por um campo

**Arquivo:** `js/salvar.js:312-322`

No import, JSON **sem `_s` é aceito** ("backup antigo"). Basta remover o campo `_s` do
export e reimportar com nível/atributos/ouro editados.

Além disso, apagar a chave `rpg_assinatura_v1` faz `listar()` **re-assinar tudo**
(`js/salvar.js:100-118`): a "migração" é, na prática, o bypass.

O código documenta honestamente "barreira para edição casual, não segredo"; a crítica é
que a barreira casual não exige nem re-assinar — deletar um campo basta.

**Problema secundário de UX:** um save rejeitado **desaparece sem aviso** na UI (só
`console.warn`). `Salvar.rejeitados()` está exportado "para teste/UI" e não é usado em
lugar nenhum — o jogador pode achar que perdeu o personagem.

**Sugestão:** exigir `_s` no import (com caminho explícito de confirmação para legado) e
mostrar na tela quando houver entrada rejeitada.

#### 3.5 Tooltips ensinam a matemática errada (e dois bugs de detalhamento)

Evidências obtidas executando `Personagem.statusDetalhado` no harness:

**(a) "9×" hardcoded, mas o multiplicador é 3.**
`PONTO_MULT = 3` (`js/personagem.js:145`), porém os textos do rodapé dizem 9×
(`js/personagem.js:396, 402, 418`):

```
+ 68 FOR 53 (base linear + 9× no investido)
+ 424 CON 42 (base linear + 9×)
+ 57 DES 20 (linear até a base, 9× acima)
```

**(b) O teto de velocidade (250) não aparece no detalhamento.**
`status()` clampa `vel` (`js/personagem.js:321`), mas `statusDetalhado` não adiciona a
linha de desconto (o padrão existe para o crítico). Medido:

| Cenário | `status.vel` | Σ partes |
|---|---|---|
| DES 3.200 + 80 de itens | 250 | **321** |
| DES 100.000 (teto de atributo) | 250 | **778** |

A UI mostra uma soma que não fecha com o total.

**(c) O keystone do ladino perde o efeito no meio do jogo.**
`Olhos de Falcão: +18C / −10%D` (`js/personagem.js:224-225`) entra **depois** do clamp
`crit ≤ 45` e é clampado de novo. Medido com nv 100 / DES 20:

| | dano | crítico |
|---|---|---|
| com keystone | **25** | 45 |
| sem keystone | **28** | 45 |

Ou seja, o tradeoff vira **somente o custo**. O detalhamento também soma 63 contra total 45
(o desconto do clamp é calculado antes do keystone).

**(d) Textos de atributo desatualizados** (`js/gestao.js:100-102`):

- "DES: velocidade (×3)" — hoje é curva saturante `46 + 24×(DES/8)^0,35`;
- "CON: vida máxima (+4 por ponto)" — acima da base vale +12 por ponto;
- "FOR: +1 a cada 2 pontos efetivos" — acima da base vale +1,5 por ponto.

São justamente os tooltips da aba Atributos.

**Sugestão:** montar os rótulos a partir das constantes (`'+' + PONTO_MULT + '×'`,
`VEL_MAX`), adicionar as linhas de clamp ao detalhamento (velocidade e keystone de crítico),
corrigir os textos de `dicasAtributo` e criar fixture de late game nos testes — o teste 30
usa guerreiro (keystone sem crítico), por isso (c) passa verde.

#### 3.6 Tooltip de item imprime o nome da constante

**Arquivo:** `js/itens.js:531`

Saída real de `Itens.dicas`:

```
Aprimoramento 3/MAX_UP (+24% nos bônus)
```

Trocar o literal `MAX_UP` por `Itens.MAX_UP`.

#### 3.7 Eventos sobrevivem ao rollback de morte

**Arquivo:** `js/batalha.js:1760-1766`

O renascimento limpa `inimigos` e chama `spawnaOnda()` direto, sem passar por
`proximaOnda()`:

- **Enxame:** `Eventos.encerraEnxame()` só existe em `proximaOnda` (`js/batalha.js:570`).
  Morrer durante o Enxame mantém `enxAtivo = true` — o XP/ouro **×1,5 continua** na onda
  renascida.
- **Gatuno:** o objeto é removido pelo `inimigos.length = 0`, mas `Eventos.gatRoubo`
  continua > 0. Resultado: 30 s depois aparece **"GATUNO DESISTIU DA FUGA!"**
  (`js/batalha.js:1776-1783`) sem gatuno em campo, e o ouro roubado nunca é resolvido.

**Sugestão:** criar `Eventos.reiniciaOnda()` (encerra enxame + resolve gatuno) e chamá-lo
em `spawnaOnda`; adicionar testes de morte durante os dois eventos.

---

### P3 — Performance, higiene e documentação

#### 3.8 `Salvar.listar()` a cada frame na tela de seleção

**Arquivo:** `js/selecao.js:145`

`desenhaLista` chama `Salvar.listar()` dentro do `render`. Cada chamada faz `JSON.parse`,
verifica **HMAC de cada save** e normaliza todos os personagens. Medido: **0,76 ms/frame**
com 20 heróis (14,5 KB de storage). Além disso, cada entrada rejeitada gera um
`console.warn` por frame (~60/s).

**Sugestão:** cachear a lista em `enter` e invalidar após salvar/excluir/importar.

#### 3.9 Gradientes criados por frame

**Arquivo:** `js/ui.js:45-51` (usado por `fundo`, `faixaTopo`, `panel`, `button`, `bar`)

Cada chamada de `grad` cria um novo `createLinearGradient` + `addColorStop`. São ~25
objetos por frame. Cachear por retângulo/cores elimina o custo no navegador.

#### 3.10 `Batalha.info()` duas vezes por frame

**Arquivo:** `js/jogo.js:302` e `330`

Duas chamadas completas só para ler `mapa` e `pausada`. Medido: **6 µs/chamada** — não é
crítico, mas gera ~100 objetos/frame (arrays `bichos`, `obst`, IIFEs). Um getter barato
resolve.

#### 3.11 IA dos monstros recalcula o cerco todo frame

**Arquivo:** `js/ia.js:237-283` (chamado em `js/batalha.js:1630`)

O comentário da arquitetura fala em raciocínio em `TICK 0,2 s`, mas `decideInimigo` não
tem gate de tick. A partir do mapa ~3 quase toda espécie tem `astucia ≥ 0,35`, então
`destinoCerco` (12 candidatos × 9 células + 12 `colideObst`) roda por monstro, por frame.
Reintroduzir o gate por tick, medindo o efeito no ritmo.

#### 3.12 Hitch de geração de chunk

**Arquivo:** `js/batalha.js:205-273` (geração) e `1970-1978` (desenho)

Atravessar uma fronteira de chunk pode gerar até 4 canvas de 384×268 no mesmo frame
(~13 mil amostras de Perlin + centenas de `fillRect` cada). O cache é **zerado inteiro** ao
atingir 36 entradas (`js/batalha.js:270`), forçando a regeneração dos chunks visíveis.

**Sugestão:** LRU de verdade + orçamento de geração (1 chunk/frame) ou pré-geração.

#### 3.13 Raio do chefe desenhado no mundo antigo

**Arquivo:** `js/efeitos.js:330-342`, `481-488`, `824-825`

`raio()` e `desenhaRaios` usam y fixo em `[0, 268]` e `bossChegou` não passa o y. No mapa
infinito o relâmpago do chefe aparece fora da tela. É visual, mas é outro resíduo do mundo
finito (junto com o blink).

#### 3.14 Documentação desatualizada

Verificado contra o código:

| Documento | Diz | Real |
|---|---|---|
| `.specs/codebase/STRUCTURE.md:4,25,35` | 19 scripts; 1445 linhas; 180 confs, seções 1–23 | 25; 2.208; 723/53 |
| `.specs/codebase/ARCHITECTURE.md:20` | 1445 linhas | 2.208 |
| `.specs/codebase/CONCERNS.md:5` | 1445 linhas | 2.208 |
| `.specs/project/ROADMAP.md:320` | 1445 linhas | 2.208 |
| `.specs/codebase/TESTING.md:5-6` | 193 asserções, seções 1–23 | ~723, 53 seções |
| `.specs/project/PROJECT.md:14` | 193 asserções | ~723 |
| `README.md:203` | versão atual 0.1.0 | v0.7.0 |
| `README.md:222,231` | 732 / 750 asserções | ~723 |
| `README.md:183` | backing store em pixels inteiros | **fracionário** (spec `ajustes-playtest-3`) |
| `README.md:26` | cada mundo com chão/monstros próprios | tema **por mapa**, ciclando a cada 10 |
| `README.md` (lista de `js/`) | — | faltam `assinatura.js` e `opcoes.js` |

Comentários desatualizados no código:

- `js/eventos.js:7-9`: "desde a onda 10" e "45 s" — constantes são 30/30;
- `js/personagem.js:326`: "+4 de vida por nível" — `HP_POR_NIVEL = 6`;
- `js/batalha.js:673`: "+4 HP/nível +5 pontos/nível" — é 6 HP e 1 ponto;
- `js/itens.js:56-58`: diz que o tema dos lendários espelha `Mapas.info`, mas `temaDe`
  usa `Mapas.mundo()` (por mundo, não por mapa);
- `js/batalha.js:1360-1362`: "respeitando limites do mundo" (o mundo não tem limites).

#### 3.15 API morta

- `Input.isDown` (`js/input.js:132`) — não usado em `js/` nem em `testes/`;
- `Eventos.gatEmCampo` (`js/eventos.js:146`) — idem.

#### 3.16 Acessibilidade e UX

- Não há respeito a `prefers-reduced-motion`; hoje os toggles de conforto
  (`js/opcoes.js`) começam todos ligados. Dá para desligar shake/flash por padrão quando o
  sistema pedir menos movimento.
- O jogo é canvas puro (sem texto alternativo/ARIA) — aceitável para o gênero, mas vale
  registrar.
- Save rejeitado sem aviso na UI (item 3.4).

#### 3.17 Determinismo do gate

`testes/fumaca.js` usa o `Math.random` real na maior parte das seções; o CHANGELOG registra
flakes e commits de estabilização. `testes/ritmo.js` já tem seed. Semear o RNG no harness
(`testes/carga.js`) elimina a classe inteira de flakes.

#### 3.18 Re-roll remove o preço do lendário

**Arquivo:** `js/itens.js:431`

`reroll` transforma o afixo negativo do lendário em positivo, quebrando o invariante
documentado "todo lendário rola exatamente 1 negativo + 1 positivo — o preço".

#### 3.19 Nota de consistência de save

`Salvar.salvarEstado` limita `onda` (`ONDA_MAX`, `js/salvar.js:29`) mas não `mapa`. Um
estado assinado corrompido poderia gravar mapa ~1e300 e `passaMapa` deixaria de incrementar
por precisão de float. Risco baixo, mas `lerEstado` já demonstra a intenção de sanidade.

---

## 4. Pontos fortes (preservar)

- Gate único realmente verde, rápido, sem dependências, com cobertura ampla.
- Perlin determinístico por mapa, com sorteios independentes do ruído (trocar o chão não
  mexe nos obstáculos).
- Persistência defensiva de verdade: tetos, floors, migração de stats/itens/loadout/ramos
  e normalização na leitura.
- Degradação graciosa do ranking e da assinatura; nenhum caminho depende de rede.
- Contrato do rasterizador respeitado (sem `arc`, `stroke()`, gradiente real nos efeitos).
- ES5 consistente em `js/`, testes em Node puro, textos/comentários em pt-BR.
- Nenhuma função interna morta (473 declarações verificadas) e nenhum
  `TODO/FIXME/console.log` em `js/`.

---

## 5. Plano de ação sugerido

| Ordem | Item | Esforço |
|---|---|---|
| 1 | Blink sem clamp + teste de regressão | 15 min |
| 2 | CI rodando o gate antes do deploy | 10 min |
| 3 | Tooltips/keystone (3.5 a–d) + `MAX_UP` + fixture de late game | 1–2 h |
| 4 | Eventos no rollback (Enxame/Gatuno) + testes | 1 h |
| 5 | Ranking/save (App Check/auth, exigir `_s` no import, aviso de rejeição) | decisão de produto + 2–4 h |
| 6 | Performance (cache do `listar`, TICK da IA, orçamento de chunk, gradientes) | incremental |
| 7 | Atualização de `.specs/codebase/*`, `PROJECT.md`, `README` e comentários | 1 h |

---

## 6. Anexo — métricas das sondas

Executadas no harness do próprio projeto (`testes/carga.js`), sem alterar arquivos:

- Blink (mago nv 300, 3,3 h simuladas): 31 saltos >150 px terminando em coordenada de
  clamp (`x=376`, `y=260`, `x=8`, `y=10`).
- `Salvar.listar()` com 20 heróis: 0,76 ms/chamada.
- `Batalha.info()`: 6,2 µs/chamada.
- `Personagem.statusDetalhado()`: 4,8 µs/chamada.
- Keystone `falcao` (nv 100 / DES 20): **antes da correção** com = dano 25/crit 45; sem = dano 28/crit 45 (o +18C era descartado); hoje o keystone rompe o teto (45 → 63).
- Velocidade com DES 3.200 + itens: status 250, Σpartes 321.
- `Ranking.submete` durante 1 h de simulação offline: 2 chamadas (baixo risco de spam).
