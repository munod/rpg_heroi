# Spec: Lendários e equilíbrio final (Leva D)

Status: **concluída** (gate verde 3×, ritmo final na faixa)
· Data: 2026-11-08 · Feature pai:
`gestao-estrategica` (R-GES-4) · Versão alvo: **0.2.0** (release no fim,
com aval)

## Contexto

Fecha o plano da gestão estratégica: a cereja — itens lendários com
efeitos que **mudam mecânica** (filosofia Last Epoch: efeito > número,
sempre com tradeoff) e a re-medição completa do ritmo com todo o poder
novo (afixos + ouro + aprimoramento + keystone + loadout + lendários).

## Requisitos

- **R-LEG-1**: **raridade 4 (lendário)** em `js/itens.js` —
  `PESO_RAR = [0,65; 0,92; 0,99]` (1% dos drops) + chefe com **15% de
  elevar** qualquer drop a lendário; cor `#ff9d4d`; **exatamente 1 afixo
  negativo + 1 positivo** por lendário (o preço do poder — negativo é
  forçado no 1º slot).
- **R-LEG-2**: **6 lendários** (`LEGENDARIOS`), **2 por tema de mapa**
  (clamp `Math.min(mapa, 3)` espelhando `Mapas.info`), cada um com
  `efeito` único e `efeitoTxt` curto exibido na linha da UI (`★`):
  - `sangue-frio` (arma T1) **vampirismo 4%** do dano vira vida;
    `veu-fenix` (armadura T1) **2ª vida 1×/onda** ( revive com 50%);
    `lamina-espectral` (arma T2) **fúria**: com HP < 30%, dano +50%;
    `manto-mercador` (armadura T2) **ouro +50%**;
    `cetro-tempestade` (arma T3) **ondas renovam as skills** (timers
    zeram ao passar de onda); `egide-santificada` (armadura T3)
    **cura fere**: o que a cura restaurar respinga nos inimigos
    próximos (mesmo valor).
- **R-LEG-3**: **matemática dos efeitos em `js/itens.js`** (testável,
  sem vazar lógica): `temEfeito(p, id)` (valida id contra a tabela —
  save corrompido não vira efeito), `multDano(p, fracHp)` (fúria),
  `multOuro(p)`, `pctVamp(p)` — e **gatilhos comportamentais** (2ª
  vida, ondas renovam, cura fere) em `js/batalha.js` com 1 hook cada
  (mortes em `danoHeroi`, reset em `proximaOnda`, cura em
  `skillsPeriodicas`). O `★` no drop e na linha da UI via `rar === 4`.
- **R-LEG-4**: migração (`normalizaItem` aceita `rar ≤ 4` e sanitiza
  `efeito` por formato; id desconhecido = inerte) e `info().dano`
  (dano do herói em combate — permite testar a fúria ao vivo).
- **R-LEG-5**: **re-medição completa** com `ritmo.js 35` — todos os
  alvos na faixa (1º nível ~42s · 15min nv30-35/onda40-60 · mapa 1 em
  25-35min); se fora: reduzir `PESO_RAR[3]`/bônus lendários **antes**
  de mexer na curva base. Gate 3×.

## Fora de escopo

- Sets, lendários de bosses específicos por mapa, efeitos em skills
  (só os 6 acima), UI de comparação nova, troca de raridade 1-3.

## Verificação

- Seção 26 da fumaça: estrutura (rar4, exatamente 1 neg + 1 pos, efeito
  válido), tema/clamp (mapa 1/2/3/4), roll do chefe (stub 0 → lendário),
  `temEfeito`/`multDano`/`multOuro`/`pctVamp` puros, migração `rar 4` +
  `efeito`, fúria ao vivo via `info().dano` (HP < 30% ⇒ dano × 1,5) e
  ouro × 1,5 ao vivo (RNG zerado, fórmula determinística).
- `ritmo.js 35` + `todos.js` 3×; screenshots regenerados.
- Release 0.2.0: checklist de `.specs/project/VERSIONING.md` **com aval**.
