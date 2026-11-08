# Spec: Documentação, versionamento e rastreabilidade

Status: **em execução** · Data: 2026-11-08 · Versão alvo: **v0.1.0**
Decisões do usuário: SemVer 0.x (primeira v0.1.0) · brownfield completo +
backfill de specs · Keep a Changelog + Conventional Commits · tag + GitHub
Release + push nesta leva.

## Contexto

O projeto cresceu de "commit inicial" para 21 commits, 193 asserções, deploy
no Pages e 3 levas aprovadas em sequência — sem tag, sem CHANGELOG, sem
estrutura de specs. Rastreabilidade hoje depende da memória da conversa.

## Requisitos

### Versionamento (R-VER)
- **R-VER-1**: `Semantic Versioning` em 0.x — MAJOR=0, MINOR=leva de
  features/entregas, PATCH=fix/docs/ajustes; quebra de formato de save
  também é MINOR (com nota de migração — `Personagem.normalizar`).
- **R-VER-2**: política documentada em `.specs/project/VERSIONING.md`,
  incluindo o fluxo de release (gate → CHANGELOG → commit release → tag →
  `gh release` → push).

### Commits e changelog (R-CL)
- **R-CL-1**: `CHANGELOG.md` na raiz, formato *Keep a Changelog* (pt-BR),
  seção `[Unreleased]` sempre presente, primeira entrada **0.1.0 — 2026-11-08**
  com **todo o histórico backfilled** (21 commits agrupados em
  Added/Changed/Fixed).
- **R-CL-2**: mensagens de commit passam a seguir *Conventional Commits*
  (`feat:`, `fix:`, `docs:`, `test:`, `chore:`…), em pt-BR no corpo.
- **R-CL-3**: política registrada em `AGENTS.md` (fluxo futuro) e link
  `(CHANGELOG.md)` no `README.md`.

### Estrutura de specs (R-SP)
- **R-SP-1**: `.specs/project/` com `PROJECT.md` (visão/objetivos),
  `ROADMAP.md` (entregues + próximos), `STATE.md` (memória persistente:
  decisões, adiados, preferências) e `VERSIONING.md`.
- **R-SP-2**: `.specs/codebase/` com os 7 docs brownfield:
  `STACK`, `ARCHITECTURE`, `CONVENTIONS`, `STRUCTURE`, `TESTING`,
  `INTEGRATIONS`, `CONCERNS` — derivados do código e do `AGENTS.md`,
  sem invenção.
- **R-SP-3**: backfill de `spec.md` por feature já entregue em
  `.specs/features/` (10 features, cada uma com IDs de requisito
  rastreando **requisito → commit**):
  `core-idle`, `arena-camera`, `mapas-e-equilibrio`, `equipamento`,
  `skills`, `responsivo-celular`, `mapas-procedurais`, `estatisticas`,
  `deploy-pages`, `ia-tatica`.
- **R-SP-4**: `README.md` e `AGENTS.md` passam a referenciar a estrutura
  (`.specs/`, CHANGELOG, fluxo de release) — nada quebrado no conteúdo
  existente.

### Release (R-REL)
- **R-REL-1**: tag `v0.1.0` + `gh release create` com notas geradas da
  seção 0.1.0 do CHANGELOG, após push dos 3 commits de IA pendentes.
- **R-REL-2**: gate `node testes/todos.js` verde antes do push.

## Fora de escopo

- Ferramentas geradoras de changelog (dependência externa — repo é zero-deps).
- Reescrever mensagens antigas de commit (histórico intacto).
- Specs para o futuro adiado (ranking) além de `ROADMAP.md`.

## Critérios de aceite

1. 22 arquivos novos (1 CHANGELOG + 4 project + 7 codebase + 10 features)
   + spec/tasks desta leva = 24, todos em pt-BR.
2. Cada spec backfillada mapeia requisitos → commits (sem commit órfão
   relevante fora do CHANGELOG).
3. Gate verde · push com os commits pendentes · tag e release v0.1.0 no
   GitHub.
