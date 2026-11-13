# Spec: Visual UI — paleta, primitivas, gradientes e cantos arredondados

Status: **concluída** (gate verde 3× = 658 confs; sanidade: A/B
`git stash` prova variação de sessão no ritmo — 37,7/34,6min no
código antigo vs 34,1 no novo) · Data: 2026-11-13 · Iniciativa: série visual
(leva 7 de 9 — 1ª de 3 frentes visuais aprovadas pelo mantenedor).

Base visual: **`/home/thiago/Projetos/Docs/ui.md`** (guia de UI — alta
resolução + arredondado + gradientes + paleta). Escopo confirmado:
série de 3 levas (ui → efeitos → cutscene), **mantidos por decisão**
o esquema de resolução atual (768×432 + largura adaptativa — o §1 do
doc descreve um build antigo de 384×216) e os gatilhos de cutscene
atuais.

## Contexto (estado atual medido)

- **`js/ui.js` (283 linhas)**: `text/panel/button/bar/swatch` com
  `fillRect/strokeRect` **chapado**, sem cantos arredondados, sem
  sombra, sem degradê. **467 hex mágicos soltos** em `js/*`
  (`#e8c86a`×20 em gestao.js…). Não existe `PALETA` nem primitivas
  compartilhadas.
- **Fundos/cabeçalhos** repetidos em 4 cenas: `#141020` full-screen +
  `#191326` faixa de 30px (`jogo`, `selecao`, `ranking`, `cutscene`
  — cena `universo`).
- **`style.css`**: fundo chapado `#0d0b14`, `box-shadow` simples de
  4px, **sem** `border-radius` (o "monitor" é quadrado).
- **Harness de testes** (verificado):
  - `carga.js` contador: Proxy — `createLinearGradient`/`roundRect`
    "existem" mas **devolvem `undefined`** (fn genérica sem `return`);
  - `cena.js` rasterizador: **não tem** `roundRect` nem gradiente;
  - captura de PNG (`novoCtxCaptura`): só rasteriza `fillRect` com
    hex (`rgba(...)` vira preto — painéis de PNG são pretos HOJE).
  Consequência: os **fallbacks do próprio doc** resolvem tudo —
  `grad()` cai na 1ª cor sólida, `caminho()` cai em `rect` →
  **testes veem quadrado/chapado, navegador vê arredondado/gradiente**.
- **Contratos de teste a preservar**: geometria de clique intocada
  (abas em centros 445/515/…, cliques ×2); invariante `bar`
  (`strokeRect` só `h>=4` — já assertado na fumaça); asserções de
  texto usam `.some` (nenhuma contagem exata de `fillText` —
  verificado); `grade.js` = pixels do sprite (intocado); PNGs de
  `previa`/`cena` regeneram no gate.

## Riscos

1. **Visual novo quebrar legibilidade**: gradientes/rounded são
   sutilis; as cores novas do doc para fundo (`#1b1433→#0f0b1c`) e
   botão (hover roxo claro em vez de borda dourada) mudam a "cara" —
   QA humano no navegador é o aceite (o doc é a base aprovada).
2. **Hit-test**: qualquer troca de coordenada dentro de `button`
   quebra cliques de teste → só mexer no DESENHO, nunca no retângulo.
3. **`text()` com sombra dobra `fillText`**: seguro (sem contagens
   exatas), mas sombra é **opt-in** por flag (`o.sombra`) — texto
   existente não muda sem decisão explícita.
4. **Perf**: gradientes por caixa por frame é trivial (dezenas);

## Requisitos

- **R-UI-1 (PALETA)** — objeto `UI.PALETA` com os hex exatos do doc
  §2 (`bgTop/bgBot`, `topoTop/topoBot`, `painelTop/painelBot`,
  `borda`, `btnTop/btnBot`, `btnTopH/btnBotH`, `ativoTop/ativoBot`,
  `sombra`) + bloco de acentos (dourado `#e8c86a/#f0cd72/#c9a24a`,
  texto `#f2eef8`, suave `#9a90b8/#c9c2dd`, apagado `#6f678a`,
  verde `#8ce08c`, vermelho `#d84a4a`, perigo `#ff3b3b`). É a fonte
  única do **cromo**; cores semânticas de domínio (skills, dano,
  temas de `Mapas`) ficam onde estão nesta leva.
- **R-UI-2 (primitivas com fallback — "teste nunca quebra")**:
  - `grad(x0, y0, x1, y1, cores)` — `cores = [[pos, '#hex'], …]`;
    **guard de tipo** (`typeof ctx.createLinearGradient !== 'function'`
    → 1ª cor) **e** guard de retorno (`!g || !g.addColorStop` → 1ª
    cor) — o contador devolve `undefined` e o rasterizador não tem o
    método;
  - `caminho(x, y, w, h, r)` — `roundRect` **por probe de assinatura**
    (`typeof === 'function' && length > 0` — o Proxy do harness tem
    `length 0`) com fallback `ctx.rect`; `r` aceita nº (todos) ou
    `[tl, tr, br, bl]`;
  - `caixa(x, y, w, h, r, cor)` = caminho + fill; `sombra(x, y, w, h,
    r)` = caixa translúcida 1px abaixo (`PALETA.sombra`);
  - `text(str, x, y, o)` ganha `o.sombra` (cópia `rgba(0,0,0,0,55)`
    em `y+1` antes do texto) — **opt-in**.
- **R-UI-3 (fundos e cabeçalho)** — `UI.fundo(ctx)` (gradiente
  vertical `bgTop→bgBot` em `0..432` × `Game.W`) e
  `UI.faixaTopo(ctx, h)` (gradiente `topoTop→topoBot` + **fio
  dourado** `rgba(232,200,106,0.30)` em `y=h`); as 4 cenas passam a
  chamá-las em vez dos `fillRect` soltos.
- **R-UI-4 (painel)** — `panel()` no padrão do doc: sombra +
  gradiente `painelTop→painelBot` + **borda dupla** (externa `borda`,
  interna `rgba(255,255,255,0.05)`) + cantos `r=8` + faixa de título
  **só em cima** `[8,8,0,0]` com gradiente próprio + fio dourado +
  título `bold 16px` `#f0cd72` **com sombra**; alturas/posições do
  título atuais (26px, `x+10, y+15`) mantidas.
- **R-UI-5 (botão)** — 4 estados com gradientes/bordas **exatos do
  doc** (normal `#3d3466→#292345`/`#5d5386`, hover `#584b8a→#3d3466`/
  `#8f82c4`, ativo `#5b4c33→#3b3120`/`#c9a24a`, disabled `#241f33`/
  `#3a3450`), cantos `r = min(6, floor(h/2))`, sombra (exceto
  disabled); **`apertado` (toque) mantém o feedback** (dourado
  escurecido — mesmo papel de hoje); rótulo com sombra quando ativo.
  **Hit-test linha-a-linha idêntico** (só o desenho muda).
- **R-UI-6 (barra)** — degradê `tom(color,0.35)→color` (novo helper
  `tom()` mistura hex com branco), brilho `rgba(255,255,255,0.20)` de
  1px **e** `strokeRect` **só `h>=4`** — invariante intacto.
- **R-UI-7 (tooltip)** — caixa do tooltip e `swatch` ganham cantos
  `r=4` via `caixa` (mesmas cores).
- **R-UI-8 (CSS)** — shell do doc §5 adaptado: `body` com
  radial-gradient roxo; canvas `border-radius: 10px` + moldura
  (fio dourado 1px + anel `#191330` 5px + halo roxo 42px + sombra);
  **mantidos** safe-area, `touch-action`, `cursor`, `pixelated`.
- **R-UI-9 (testes)** — **seção 46**: PALETA completa (chaves do doc,
  hex válidos); `grad` devolve a 1ª cor no harness; `caminho` roda
  via probe (harness sem `roundRect` real documentado); `caixa`/
  `panel`/`fund o`/`faixaTopo` desenham sem exceção (Δ`_chamadas`);
  `text` com `sombra` = 2 chamadas de fillText; título de painel
  continua em `_textos` (`.some`); invariante da barra **já coberto**
  (não duplicar). Seções existentes intactas (cliques/abas/`grade`).
- **R-UI-10 (sanidade)** — `node testes/todos.js` **3×** + `ritmo 60`
  rápido (sem mudança de gameplay esperada — só prova de que nada
  quebrou em execução longa).

## Fora de escopo

- Migração dos 467 hex por arquivo (só o cromo — `ui.js` + fundos —;
  os demais são cores de domínio com os mesmos hex, visual idêntico) ·
  esquema de resolução (mantido 768×432 adaptativo) · `sprite.js` /
  pixel art · geometria de clique · efeitos (leva 8) · cutscene
  (leva 9) · som/háptico.

## Verificação

- **Seção 46** + reparo do que quebrar · `todos.js` **3×** (inclui
  PNGs de `previa`/`cena`) · `ritmo 60`.
- QA humano no navegador (`Ctrl+Shift+R`) — aprovado pelo mantenedor
  antes da leva 8.
- Docs (CHANGELOG, AGENTS, STATE, ROADMAP, README) · commit · push
  só com aval.
