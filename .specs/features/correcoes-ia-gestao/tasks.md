# Tasks: Correções de IA/combate + gestão (lote de bugs)

Status: ⬜ pendente / ✅ feito · `[P]` paralelo

| # | Task | Dep | Status |
|---|------|-----|--------|
| T1 | Spec + tasks (este diretório) | — | ✅ |
| T2 | `js/batalha.js`: `foge` não bloqueia golpe (R-COR-1) · clamp do destino de fuga + `recuar` ataca quando sem espaço (R-COR-2) · `atkT = min(0.36, recarga)` com frames/hit relativos (R-COR-3) · remover sondas `_dbg` e expor campos permanentes (`inimigoPerto`, `atacando`, `destinoFora`) | T1 | ✅ |
| T3 | `js/ia.js`: clamp do destino de `recuar`/`kite` aos limites do mundo (margem 16) | T2 | ✅ |
| T4 | `js/gestao.js`: `UI.dica` da linha de atributo até x<684 (R-COR-4) | T1 | ✅ |
| T5 | `js/itens.js` + `js/personagem.js`: flag `p.trava.{arma,armadura}` (normalizar default false) + `equiparSeMelhor` respeita | T1 | ✅ |
| T6 | `js/gestao.js`: botão `[x]` de fixar por slot · checkbox `Auto A+` + lógica no `Gestao.update` (menor custo, teto, saldo, padrão OFF) | T5 | ✅ |
| T7 | `js/personagem.js` + `js/gestao.js`: `statusDetalhado` ganha `base` numérico por stat · bloco `base -> total` na aba Stats (linhas 13px, layout cabe no painel) | T1 | ✅ |
| T8 | Testes: seções 32 (4 confs de bug) e 33 (fixar + auto-aprimorar + base→total) | T2-T7 | ✅ |
| T9 | Gate 3× + `ritmo.js 15` na faixa (DPS mudou com R-COR-3 — medir e documentar) | T8 | ✅ |
| T10 | Docs (CHANGELOG, STATE, ROADMAP, AGENTS, README se UI mudou, spec/tasks) + commit | T9 | ✅ |

## Verificação por task

- **T2**: ES5; `foge` vira só movimento — o caminho do golpe
  (`bate`) nunca depende de conseguir fugir; `atkT` novo mantém
  `hitDone` em ~0,10s proporcionais e o sprite continua em 3 frames.
  Campos novos de `info()` são permanentes (documentar no AGENTS).
- **T3**: clamp em `decideHeroi` com margem ≥ raio do herói (6) +
  folga; sem isso o `moverPara` anda reto p/ fora e `resolve` prende.
- **T6**: auto-aprimorar **só no update** (não no render), guarda de
  1 tentativa por ~0,5s, nunca joga ouro fora do teto.
- **T7**: `base` é Σ das partes SEM itens e SEM keystone; teste
  confere `base + Δitens = total` (com keystone desligado) e a soma
  com keystone = `status()`.
- **T9**: se o ritmo sair da faixa (DPS maior com DES? — o `ritmo.js`
  só bombeia FOR, então deve ficar estável), documentar; nunca
  reequilibrar por engano.
