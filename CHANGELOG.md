# Changelog

Todas as mudanças notáveis deste projeto são documentadas aqui.
Formato [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) ·
Versionamento [Semantic Versioning](https://semver.org/lang/pt-BR/) em
**0.x** — política completa em `.specs/project/VERSIONING.md`.

As linhas citam os commits (`sha`) e a rastreabilidade requisito→commit
vive em `.specs/features/`.

## [Unreleased]

## [0.1.0] — 2026-11-08

Primeira versão: jogo idle completo no navegador, suíte de 193 asserções
e deploy no GitHub Pages.

### Added

- **Núcleo idle**: criação/seleção de herói, combate 100% automático,
  save/autosave/progresso offline (`0256b59`); herói novo nasce com 0
  pontos, só +5 por nível (`876b0ff`); segurar botão para repetir e
  seletor ×1/×5 de gasto (`a8e6472`); curva de progressão e ritmo das
  ondas em constantes nomeadas, medidos por `testes/ritmo.js` (`1b674a2`).
- **Mapas, monstros e chefe**: 3 mapas temáticos com 100 ondas cada
  (chefe na onda 100), modo infinito e migração de saves legados
  (`48b4ed4`).
- **Equipamento**: drops de arma/armadura em 3 raridades, auto-equip por
  pontuação, bolsa (teto 10) e aba Itens com paginação (`e939927`).
- **Skills automáticas por classe** (procs sem botão — promessa do
  combate automático) (`642c638`) e **efeitos visuais próprios** restritos
  às primitivas do rasterizador de testes (`9018ef5`).
- **Câmera e arena**: mundo 2× (384×268) com janela 192×134, câmera com
  lerp e trava, renascimento aleatório seguro e inimigos mirando o local
  da morte (`18ea9e3`).
- **Responsivo e celular**: base 768×432 com escala fracionária + DPR,
  toque completo (clique/arrasto/soltura por dedo), alvos de 24px e
  banner de retrato (`4291092`); **largura lógica adaptativa**
  (W = clamp(432×aspecto, 768, 1728)) com layout ancorado nas bordas —
  tela cheia sem barra lateral em telas largas (`4c249e4`).
- **Skills v2**: rename `magias`→`skills`, 5 skills por classe
  (5/15/25/35/45), tipos mobilidade/medo (Empurrão, Teleporte, Esquiva,
  Amedronta) e **ataques à distância** para mago/ladino/clérigo (`f300542`).
- **Mapas procedurais**: Perlin Noise com semente = número do mapa —
  chão (manchas/flores) e posições de obstáculos determinísticos
  (`ad65530`).
- **Estatísticas do jogador**: 8 chaves em `p.stats`, contagem central,
  aba Stats (5ª aba) e tempo de jogo só na jogatina (`530ba88`).
- **Deploy no GitHub Pages** via Actions, estático sem build —
  https://munod.github.io/rpg_heroi/ (`e4c49de`).
- **IA tática**: cérebro do herói por Inteligência (agudeza, alvo
  prioritário, kite, recuo, ruído para INT baixa) + A* sob demanda
  (`2f4948c`); NPCs com astúcia por espécie+mapa — cerco em slots,
  antecipação de fuga e esquiva com falha de golpe "ESQUIVOU!"
  (`2eb26a2`); INT também modula raio/cooldown das skills (`3ec4ab8`).
- **Documentação de engenharia**: `AGENTS.md`, `README.md`, suíte de
  testes com harness (193 asserções) e ferramentas manuais
  (`0256b59`, `66109f2`, e ao longo de todas as levas).
- **Rastreabilidade**: estrutura `.specs/` (project, codebase e backfill
  de specs por feature), este CHANGELOG e política SemVer 0.x +
  Conventional Commits (`docs-rastreabilidade`).

### Changed

- `magias` renomeado a `skills` em código, UI e testes (`f300542`).
- Abas do painel de gestão: de 4 para 5 (grade 66px/passo 70,
  centros 445/515/585/655/725) (`530ba88`).
- `Mapas.forca` saiu da equação de combate e ficou só nos drops (`590fae7`).

### Fixed

- **Contaminação de save entre heróis** e gravação unificada das telas
  (`f70bb21`).
- **Primeiras ondas dos mapas seguintes muito fáceis**: escala de
  dificuldade/XP agora é contínua entre mapas (`ondaTotal`) (`590fae7`).
- **Barras laterais no celular**: layout passou a seguir o aspecto da
  viewport (bug reportado por print) (`4c249e4`).

[Unreleased]: https://github.com/munod/rpg_heroi/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/munod/rpg_heroi/releases/tag/v0.1.0
