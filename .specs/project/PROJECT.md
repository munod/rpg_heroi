# PROJECT — RPG Herói

## Visão

RPG idle no navegador: o herói evolui **sozinho** (combate 100%
automático) e o jogador gere atributos, classe, aparência e equipamento.
"Sempre dá pra jogar": desktop ou celular, offline, sem instalação,
sem cadastro, sem servidor.

## Status (2026-11-16)

- Versão **0.7.0** — jogo completo publicado em
  https://munod.github.io/rpg_heroi/
- Suíte: **755 asserções** (`node testes/todos.js`); o CI roda o gate em
  push/PR e o deploy do Pages só acontece na `main` (`needs: test`).
- Ritmo vigente e metas medidas (campanha ~44h, nv10 ~3,5min, marcos):
  ver `AGENTS.md` > combate/ritmo e medir sempre com
  `node testes/ritmo.js [min] [mundo|mapa] [k] [semente]` (≥4 seeds por
  decisão; o ritmo gasta ouro: keystone + aprimoramentos).

## Objetivos

1. Progressão idle **legível e calibrada** — nada de mudanças de
   balanceamento sem medir com `ritmo.js`.
2. Rodar em **qualquer dispositivo** com pixel art nítida e toque
   confortável.
3. IA que **parece intencional** (herói com personalidade por INT,
   monstros mais espertos em mapas profundos).
4. Manter **zero dependências** no jogo (sem npm, sem build, sem
   framework).

## Princípios

- **pt-BR** em código, UI e documentação; `js/` deliberadamente ES5.
- **Teste é gate**: `node testes/todos.js` verde antes de qualquer commit.
- **Especificar antes de implementar** (skill tlc-spec-driven): specs com
  IDs de requisito rastreando **requisito → commit**.
- **Push e release com aval explícito** do mantenedor.
- Mudança de formato de save: subir chave e/ou normalizar
  (`Personagem.normalizar`) — nunca quebrar save em silêncio.

## Estrutura de documentação

| Onde | O quê |
|------|-------|
| `README.md` | jogo, estrutura e testes (ponto de partida) |
| `AGENTS.md` | convenções e armadilhas para quem mexe no código |
| `CHANGELOG.md` | o que mudou, por versão (Keep a Changelog) |
| `.specs/project/` | visão, roadmap, memória e versionamento |
| `.specs/codebase/` | docs brownfield (stack, arquitetura, testes…) |
| `.specs/features/` | spec por feature, requisitos → commits |
