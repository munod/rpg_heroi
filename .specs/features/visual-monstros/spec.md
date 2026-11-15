# Spec: Visual dos monstros — rampas e identidade por espécie

Status: **concluída** (gate verde = **704 confs** — 687 fumaça + 17
grade; arte olhada no PNG de `previa.js` + QA das 10 espécies e nas
screenshots da arena) · Data: 2026-11-14 · Iniciativa: mantenedor
(sequência **B1→B4** da continuação da série visual, após
`visual-heroi-arma`).

## Contexto

- As 3 formas de inimigo (`slime`, `morcego`, `aranha`) ainda usam o
  **`shade(cor, f)` legado** (`0,68`/`1,35`): escuros acinzentados e
  luz chapada — o mesmo problema diagnosticado no herói, agora com a
  **paleta nova à mão** (`Sprite.rampa`, luz única topo-esquerda).
- **10 espécies = 3 formas + cor** (`Batalha.TIPOS`): o jogador só
  distingue `regenerador` de `drenador` pelo hex. Nada impede detalhe
  por espécie — `en.chave` já existe no spawn (spec `monstros-novos`
  usa ele na sonda) e `spriteInimigo(en)` tem acesso a ele.
- `Anim.slime/cor` é a cache; qualquer parâmetro novo **precisa entrar
  na chave** (mesmo bug da cache do herói, corrigido em
  `visual-heroi-arma`).

## Requisitos

- **R-VM-1 (motor de cor)** — paleta dos monstros passa a sair de
  `rampa(cor)`: `2 corpo · 3 sombra · 4 luz` + `5 olho branco ·
  6 pupila` (índices 0-6 **inalterados**) e `7/8` = **detalhe da
  espécie** (base + luz). Contorno continua `#1b1424`.
- **R-VM-2 (assinatura compatível)** — `slimeCanvas(cor, frame,
  chave)`, `morcegoCanvas(...)`, `aranhaCanvas(...)` ganham um 3º
  parâmetro **opcional** (`undefined` = desenho base, igual ao de
  hoje): `fumaca.js` e `previa.js` continuam chamando com 2 args.
- **R-VM-3 (cache)** — `Anim.slime/morcego/aranha` incluem `chave` na
  cache key (senão a espécie trocada herdaria o sprite da anterior).
- **R-VM-4 (gatilho)** — `spriteInimigo(en)` passa `en.chave`.
- **R-VM-5 (identidade por espécie)** — detalhe desenhado POR CIMA do
  contorno (como o rosto), um por espécie:
  - `slime` — sorriso (base);
  - `visgo` — gota pendurada + boca curva;
  - `boss` — **coroa** dourada (escala 2,6 já amplia);
  - `acougueiro` — **mandíbula com 2 presas**;
  - `gatuno` — **máscara de ladrão** sobre os olhos;
  - `regenerador` — **broto** de 2 folhas no topo;
  - `drenador` — **2 presas** + olhos cerrados;
  - `morcego` — base (asas/orelhas);
  - `atirador` — **chifres** (forma de morcego);
  - `aranha` — **padrão no abdômen** (listra).
- **R-VM-6 (QA visual)** — `previa.js` ocupa as células livres da
  linha do cenário com morcego, aranha e as espécies de destaque (o
  PNG vira o loop de iteração, como na leva do herói).
- **R-VM-7 (testes/docs)** — `fumaca` intacta (limites por pixel:
  slime >50 · morcego/aranha >40), gate `todos.js`, CHANGELOG em
  `[Unreleased]`, ROADMAP/STATE.

## Fora de escopo

Nenhuma mudança de **balanceamento/IA/skill** (o `TIPOS` não mexe em
hp/dano/velocidade) · nenhuma forma nova (3 formas seguem) ·
`hitFlash`/veneno/envenenado continuam funcionando por cima (só o
desenho muda).

## Verificação

`node testes/todos.js` · `previa.png` com as 10 espécies olhado e
ajustado · `tela-jogo-luta.png`/`tela-boss.png` (chefe com coroa em
escala) · ES5 preservado em `js/`.
