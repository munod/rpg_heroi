# Tasks — visual-heroi-spritecook

Spec: `spec.md` · piloto = guerreiro completo antes de replicar.
**Status: piloto + emenda concluídos** (gate verde —5 arquivos).

## Emenda do veredito (2026-11-17)
- [x] E1. Spec emenda (veredito +3 causas + R-VHS-6/7/10/11)
- [x] E2. Nova base do guerreiro **com espada** (referência = base
      canônica) +3 animações custom ("espada na mão direita sempre",
      "braço firme") — QA: sem troca de mão, sem lâmina duplicada
- [x] E3. Prep simplificado (corte ÷2 + folha QA; saíram composição,
      detecção de punho e recortes)
- [x] E4. Código: `assets.js` sem ARMAS/punho/ângulos, `Anim.hero`
      sem composição, `desenhaHeroi` camada única, **`ESC_CENARIO=2`**
      (árvore 40×52, pedra 28×22 — args do drawImage capturados e
      conferidos)
- [x] E5. Testes: grade sem punho/raridade (+ lâmina embutida),
      previa-assets simplificado, `assets/armas/` (48) e
      `fonte/armas/` (13) apagados, manifesto de IDs atualizado
- [x] E6. Gate verde + QA visual (proporção árvore>herói>pedra,
      ataque sem troca de mão)
- [x] E7. Docs (CHANGELOG/STATE/AGENTS/ROADMAP) + commit

## Leva 2 — as3 classes restantes (2026-11-17)
- [x] L1. Spec R-VHS-12/13/14 (pipeline por classe, fallback
      mantido, `inicios` por classe)
- [x] L2. Bases do mago/ladino/clerigo com a arma da classe
      (referência = guerreiro com espada) — cores canônicas
      conferidas por histograma (roxo/verde/ocre ✓)
- [x] L3.9 animações custom (3 por classe, "arma na mão direita
      sempre" + "braço firme" no walk)
- [x] L4. Prep estendido p/4 classes →96 frames (4×3×8)
- [x] L5. `inicios` medido por classe (max-x por frame: guerreiro e
      ladino = golpe em f5; mago e clérigo = golpe em f6)
- [x] L6. Testes: grade cobre as4 classes + tabelas por classe +
      fallback por classe inexistente; previa-assets =12 linhas
- [x] L7. QA programático (paleta, presença/continuidade da arma,
      pés na fileira42, extensões do golpe) — visual final pendente
      (display de imagem da sessão travado)
- [x] L8. Gate verde (5 arquivos) + docs + commit

## Fase A — base de referência
- [x] A1. `get_credit_balance` (preflight —920 créditos)
- [x] A2. Folha de referência dos sprites atuais (`previa-zoom.png`)
- [x] A3. Upload → `spritecook-assets.json` (asset_id/sha12/label)

## Fase B — geração (SpriteCook)
- [x] B1. Guerreiro base (rota B: `generate_game_art` + referência —
      3/4 olhando à direita preservado)
- [x] B2. Animações idle/walk/attack — walk e ataque viraram
      **custom** (preset: braço balançava / punho na cara);
      fragmentos de lâmina recortados (`RECORTES_ATAQUE`)
- [x] B3. 4 armas na horizontal com acento magenta, fatiadas
      (`auto_slice_asset`) e rotacionadas (`rotate_sprite`, grátis)
- [x] B4. Download + `assets/fonte/` (fonte commitada p/ reprocesso)

## Fase C — pipeline local
- [x] C1. Redução (nearest) do guerreiro p/ 43×43 (÷2 — conferido)
- [x] C2. Variantes de ângulo da arma (RotSprite) + recolor ×4
      raridades → `assets/armas/` (48 arquivos)
- [x] C3. Âncora do punho por frame (detecção de pele + override
      manual + conferência no QA) → manifesto

## Fase D — infra no jogo
- [x] D1. `lerPNG` RGBA (+PLTE/tRNS) e `escreverPNG` com alfa
- [x] D2. Stub de `Image` síncrono em `testes/carga.js` (_data RGBA)
- [x] D3. `js/assets.js` (manifesto embutido + carga + bake) +
      `index.html`
- [x] D4. Boot do `main.js` espera `Assets.carga` (fallback)
- [x] D5. `Anim.hero` com fallback procedural + chaves novas
- [x] D6. Frames dirigidos pelo manifesto (`batalha.js`,
      `previaFrame` da gestão — ciclo idêntico ao procedural)
- [x] D7. `desenhaHeroi`/`desenhaPrevia` com dimensões do manifesto
      (sombra proporcional, caixa da prévia 216/116)
- [x] D8. Composite herói+arma + recolor de raridade + espelho
      (`Assets.desenha`, follow-through espelhado no frame6)

## Fase E — Apar simplificada
- [x] E1. `desenhaAparencia` sem as 4 linhas (classe + descrição +
      prévia); `ciclo`/`cicloTras` mortos removidos

## Fase F — testes
- [x] F1. `fumaca.js`: contrato da Apar remapeado (clique antigo é
      neutro) + instrumentação do assert de fuga (classifica
      destino NOVO×antigo — flake nunca reproduziu em 24 runs)
- [x] F2. `grade.js`: seção nova do asset (43×43, pés, pele,
      contorno, punho=pele,4 raridades, qtd/frameAtaque)
- [x] F3. `previa-assets.js` + registro no `todos.js`
- [x] F4. `cena.js` regenerado e olhado (arena ✓, Apar ✓ — a tool de
      leitura serviu imagem errada; verificado por recorte Python)
- [x] F5. Gate `node testes/todos.js` verde (5 arquivos)

## Fase G — docs/commit
- [x] G1. `STATE.md` (reversão + lições), `CHANGELOG [Unreleased]`
- [x] G2. Tasks concluídas, commit Conventional Commits pt-BR
