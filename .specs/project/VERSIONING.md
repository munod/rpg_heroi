# VERSIONING — política de versão, commits e releases

## Semantic Versioning em 0.x

Tag sempre no formato `vMAJOR.MINOR.PATCH` (ex.: `v0.1.0`). Enquanto
MAJOR = 0, o jogo está em evolução ativa:

| Campo | Bump quando… | Exemplos |
|-------|--------------|----------|
| **MINOR** | entrega de feature/leva aprovada **ou** mudança de formato de save (com migração em `Personagem.normalizar`) | IA tática, ranking, aba nova |
| **PATCH** | correção de bug, ajuste de balanceamento, docs, testes, refatoração sem efeito visível | ondas fáceis, typo |
| **MAJOR** | (reservado) — só quando o mantenedor declarar o jogo estável/final | — |

Regra prática: **cada push aprovado costuma virar uma leva** → decide-se
na hora do release se foi MINOR ou PATCH. Nada de bump a cada commit.

## Conventional Commits (a partir da v0.1.0)

```
<tipo>(<escopo opcional>): <resumo curto em pt-BR>

<corpo opcional, em pt-BR, o porquê e o efeito>
```

Tipos usados neste projeto: `feat` (feature), `fix` (bug), `docs`
(documentação/specs), `test` (testes), `chore` (manutenção), `perf`,
`refactor`, `ci` (workflow). Exemplos reais da casa:

- `feat(ia): cérebro do herói por INT + A* sob demanda`
- `fix(ondas): escala contínua entre mapas (1ªs ondas não resetam)`
- `docs(specs): estrutura .specs/, backfill e CHANGELOG`

Histórico anterior à v0.1.0 fica como está (não reescrever).

## CHANGELOG (Keep a Changelog)

- `CHANGELOG.md` na raiz, em pt-BR, com `[Unreleased]` sempre no topo.
- Enquanto se trabalha, o que importa entra em `Unreleased`
  (Added/Changed/Fixed/Removed).
- **Toda leva nova que muda o jogo** atualiza o `Unreleased`.

## Fluxo de release (checklist)

1. `node testes/todos.js` **verde** (gate) — e `ritmo.js` se mexeu em
   balanceamento.
2. Mover as entradas de `[Unreleased]` para `## [X.Y.Z] — AAAA-MM-DD`
   no CHANGELOG; manter link de comparação no rodapé.
3. Commit: `chore(release): vX.Y.Z` (inclui CHANGELOG + ROADMAP/STATE
   atualizados).
4. Tag: `git tag -a vX.Y.Z -m "vX.Y.Z — título curto"`.
5. `git push` (commits + tag) — **só com aval do mantenedor**.
6. `gh release create vX.Y.Z --title "vX.Y.Z — …" --notes-file …`
   (notas = seção do CHANGELOG).
7. O push em `main` já re-deploya o GitHub Pages sozinho (workflow).

## Onde viver o quê

- Decisão de produto/roadmap → `.specs/project/` (STATE/ROADMAP).
- O que mudou → `CHANGELOG.md`.
- O que será → `.specs/features/<nome>/spec.md` **antes** do código
  (IDs de requisito), e o commit da entrega cita a feature.
- Convenções de código → `.specs/codebase/CONVENTIONS.md` + `AGENTS.md`.
