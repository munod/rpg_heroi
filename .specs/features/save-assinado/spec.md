# Spec: Save assinado — integridade do localStorage

Status: **concluída** (gate verde = 719 confs — 702 fumaca + 17 grade) · Data: 2026-11-15 · Iniciativa: mantenedor
(decisão **D+A**; D = `ranking-antitrampa`, esta é a A).

## Contexto (ameaça honesta)

- Hoje `rpg_personagens_v1`/`rpg_estado_v1` são JSON puro no
  `localStorage`: qualquer um edita ouro/nível/item no DevTools e o
  jogo aceita (só `Personagem.normalizar` limita forma/faixa).
- **O que dá pra prometer**: parar a edição **casual** (mexer no JSON
  e ver o efeito) e **detectar corrupção**. **O que NÃO dá**: esconder
  um segredo de quem lê o bundle — o `js/` é público e qualquer
  "chave" embutida é extraível. Isso é **barreira, não garantia**
  (registrado em spec e STATE).
- **O save não protege o ranking** — o placar é montado do estado ao
  vivo (`Ranking.submete()`), não do save; por isso o par D+A: as
  regras do servidor são a proteção do placar (leva
  `ranking-antitrampa`), esta leva protege o arquivo local.
- Restrições do projeto: **sem deps, sem build, ES5 em `js/`**, jogo
  abre por `file://` (⇒ **`crypto.subtle` não é confiável** e o sandbox
  dos testes tem whitelist de globals) → **HMAC-SHA256 em JS puro**.
- **Sem sal por aparelho**: HMAC com sal local quebraria transferir o
  export entre máquinas (assinatura da origem ≠ do destino). Fonte do
  MAC = pepper embutido no módulo + o próprio payload; o "segredo"
  é o pepper — extraível ✓ (barreira documentada).
- Só **UM** campo novo por entrada (`_s`): formato do save **não muda
  de chave** (`rpg_personagens_v1` segue) e a migração é na leitura
  (precedente: `normalizaStats`).

## Requisitos

- **R-SA-1 (módulo)** — `js/assinatura.js` (ES5, zero APIs novas de
  navegador): `Assinatura.sha256(hex)` + `Assinatura.hmac(texto,
  chave)` → hex; declarado no `index.html` **antes** de `salvar.js`
  (`carga.js` lê a lista do index ⇒ os testes acompanham sozinhos).
- **R-SA-2 (assinar ao gravar)** — cada entrada de personagem ganha
  `_s = HMAC(payload)`; payload = `JSON.stringify` **sem** `_s` (ordem
  de chaves estável: a do parse gravado). Idem para as entradas de
  `rpg_estado_v1` (onda/mapa também alimentam o placar ⇒ mesma
  proteção), com **marcador próprio** por storage.
- **R-SA-3 (verificar na leitura, sem destruir)** — entrada sem `_s`
  ou com `_s` divergente é **rejeitada** (não entra no jogo) **quando
  o marcador do storage existe**; o dado rejeitado **fica intacto no
  storage** e o próximo `Salvar.salvar` o **preserva** (nunca escreve
  por cima — sem perda de dado em caso de falso positivo).
- **R-SA-4 (migração sem janela)** — marcador ausente ⇒ **aceita tudo
  e reescreve já assinado na hora** (se aceitássemos sem reescrever,
  o boot seguinte rejeitaria o próprio save do jogador); o marcador é
  gravado junto de **qualquer** escrita assinada.
- **R-SA-5 (export/import)** — exporta **assinado** (transferência
  entre aparelhos valida, mesmo pepper); importa verificando e
  **aceitando JSON sem assinatura com aviso** (`console.warn`) —
  compatibilidade com backups antigos > proteção marginal (quem
  controla o arquivo consegue re-assinar de qualquer forma).
- **R-SA-6 (observabilidade)** — `Salvar.rejeitados()` (contador desde
  o boot) + `console.warn` por entrada rejeitada.
- **R-SA-7 (testes)** — fumaca: (a) o HMAC **bate com o `crypto` do
  Node** (prova a implementação); (b) save sai assinado e volta igual;
  (c) **adulteração** → rejeitado, os outros sobrevivem e o adulterado
  **permanece** no storage após outro `salvar`; (d) **migração** (sem
  marcador → re-assina na hora); (e) estado adulterado → `lerEstado`
  devolve `null`.
- **R-SA-8 (docs)** — CHANGELOG (`Security`), ROADMAP, STATE com o
  limite honesto (pepper extraível; save é single-player; o placar é
  protegido pela outra leva).

## Fora de escopo

Cifrar o conteúdo (o dono precisa ler o save) · servir save no
servidor (opção C, adiada) · UI de aviso de save rejeitado
(`rejeitados()` fica pronta p/ isso) · bump de chave do storage ·
qualquer mudança em `Personagem.normalizar`/formato salvo.

## Verificação

`node testes/todos.js` (gate) · teste manual: editar `ouro` no
DevTools → o herói **some da seleção**, some do console com aviso, e
**segue no localStorage** (nada é apagado); ao apagar o campo `_s` de
uma entrada com o marcador ativo → também rejeitada.
