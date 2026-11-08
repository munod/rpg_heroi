# Spec: Skills automáticas por classe com efeitos visuais (backfill)

Status: **Entregue** — v0.1.0 · Commits: `642c638`, `9018ef5`, `f300542`

## Objetivo
Dar identidade às classes sem quebrar a promessa de combate 100% automático:
procs que disparam sozinhos, com efeito visual próprio — e evoluir de 8
"magias" para **5 skills por classe** com mecânicas de fuga, medo e ataque à
distância.

## Requisitos
- **R-SKL-1**: Skills automáticas por classe em arquivo próprio (`magias.js`,
  depois `skills.js`): 4 tipos de proc iniciais — `area` (varredura contando
  golpes), `nuke` (dano periódico), `veneno` (DoT por acerto) e `cura` (só
  anuncia quando cura de verdade) — commit `642c638`.
- **R-SKL-2**: Gatilhos em `batalha.js`: `golpeia()` conta áreas e aplica
  veneno; `atualizaHeroi` roda os timers; o laço de inimigos virou de trás
  pra frente (veneno pode matar e remover no meio); estado por skill zerado
  em `iniciar()` e criado sob demanda (troca de classe em combate reconta) —
  commit `642c638`.
- **R-SKL-3**: Efeitos visuais próprios em `js/efeitos.js` (motor de
  partículas pixel-art): brasas, anel de impacto, arco de corte, motes de cura
  e missil teleguiado com dano no callback de chegada — commit `9018ef5`.
- **R-SKL-4**: Efeitos restritos às primitivas que `testes/cena.js` rasteriza
  (`fillRect`, `ellipse`+fill, `globalAlpha` — `stroke` é no-op), restrição
  documentada no `AGENTS.md`; `limparEfeitos()` limpa `Efeitos` (simulação
  offline segura, cap 300) — commit `9018ef5`.
- **R-SKL-5**: Rename `magias` → `skills` (`Skills.daClasse()`,
  `Skills.proxima()`) e **5 skills por classe** desbloqueando em
  **5/15/25/35/45** (antes 2 em 5/15), com a aba Classe mostrando a próxima —
  commit `f300542`.
- **R-SKL-6**: Tipos novos `mobilidade` (Empurrão do guerreiro via
  `en.empurra`, Teleporte do mago, Esquiva do ladino via `heroi.fuga`) e `medo`
  (Amedronta do clérigo via `en.medo`, fogem 3,5s sem atacar), tudo por
  gatilho de proximidade/cooldown e ainda automático — commit `f300542`.
- **R-SKL-7**: Ataque à distância: `distancia: true` em `personagem.js` para
  mago (alcance 72), ladino (56) e clérigo (52), mandando projétil por
  `golpeDistancia` com dano na chegada (crítico/veneno/empurrão iguais ao
  corpo a corpo); caminho do guerreiro intacto — commit `f300542`.

## Verificação
- Gate `node testes/todos.js` (193 asserções no total hoje; 119 → 123 → 155
  ao longo dos três commits).
- `testes/fumaca.js` **seção 16) skills automáticas (procs por classe)**:
  desbloqueio em 5/15/25/35/45, 5 skills em toda classe, cada classe com a
  skill de fuga ou de medo, `proxima()`, aviso "desbloqueada" ao subir de
  nível, os 4 procs (Bola de Fogo, varredura, veneno, Bênção) com
  `Efeitos.qtd() > 0`, ataque à distância do mago nv 4 **sem skills** e os 3
  gatilhos de fuga (Empurrão/Esquiva/Amedronta) conferidos via
  `info().empurra/fuga/medo`.
- `testes/cena.js`: um screenshot por tipo de efeito —
  `tela-skill-projetil.png`, `tela-skill-corte.png`, `tela-skill-veneno.png`,
  `tela-skill-cura.png` (capturas renomeadas em `f300542`).
- `testes/ritmo.js` — medições: `642c638` 1º nível **40s**, 15min =
  **nv 34 / onda 60**, mapa 1 em **27,1min**; `f300542` 1º nível **39,6s**,
  **nv 32 / onda 53** @15min (procs nerfados e `ESC_HP` 1,5 → 1,85).
