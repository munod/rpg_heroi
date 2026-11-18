# Tasks: Economia de pontos — respec pago, retornos decrescentes e nível de skill

Status: ⬜ pendente / ✅ feito · `[P]` paralelo

| # | Task | Dep | Status |
|---|------|-----|--------|
| T1 | Spec + tasks | — | ✅ |
| T2 | **Fase D**: `RESPEC_PCT`/`RESPEC_PISO` em `personagem.js` + `aplicar(dir<0)` cobra ouro (custo fixo por chamada, guarda sem saldo, `ouroGasto`) + dica do `−` | T1 | ⬜ |
| T3 | **Fase D**: fumaça — cobra/decrementa · sem ouro → ponto intacto · piso · MAX nunca negativo · gate | T2 | ⬜ |
| T4 | **Fase A**: `ATRIB_LIM` + `valorInvestido` (fonte única) em `ganhoAtributo` + espelho `statusDetalhado` (`danoInv`/`hpInv`) + aviso na dica | T3 | ⬜ |
| T5 | **Fase A**: fumaça — ≤LIM idêntico · >LIM menor que linear · Σpartes fecha com atributo alto · fixture con 1 = 12 HP · gate | T4 | ⬜ |
| T6 | **Fase S**: `skillNv` + `normalizaSkillNv` (personagem) + `SKILL_NV_MAX` espelhado · `custoNivel`/`sobe`/`aplicaNivel` (skills) aplicado no `carregadas` + `dicas(nvSkill)` | T5 | ⬜ |
| T7 | **Fase S**: UI aba Classe — segmentado [Ramo][Nível], 3º botão `+custo` com guardas, `Gravacao.msg`, cabeçalho com contagem | T6 | ⬜ |
| T8 | **Fase S**: fumaça seção 55 — normaliza (lixo/teto) · sobe gasta/custo crescente · `aplicaNivel` identidade nv0 ×1,08 nv1 · frequência intacta · UI modo padrão ramo intacto + clique nível · gate | T7 | ⬜ |
| T9 | **R-EDP-4**: `RITMO_SKILL=1` no `ritmo.js` (respeita limiar → excedente em skills) + A/B ≥4 seeds (240min) + sim completa vs referência | T8 | ⬜ |
| T10 | QA visual aba Classe (`JANELA=1280x400`) + docs (CHANGELOG, AGENTS emenda, STATE, ROADMAP) + spec/tasks concluídos | T9 | ⬜ |
| T11 | Gate `todos.js` verde ao fim de CADA fase · Push (só com aval do mantenedor) | T10 | ⬜ |

## Verificação por task

- **T2/T4/T6**: constantes novas em `personagem.js` (fonte única,
  exportadas) — `personagem.js` continua sem depender de `skills.js`
  (grade/previa carregam só sprite+personagem); `SKILL_NV_MAX` é espelho
  comentado nos dois (padrão `normalizaLoadout`/`LIMITE`).
- **T4**: `valorInvestido` é a ÚNICA fonte da fórmula — `ganhoAtributo`
  e os espelhos de `statusDetalhado` (`danoInv`/`hpInv`; crítico já chama
  `ganhoAtributo`) usam ela; Σpartes do rodapé é contrato (seções
  38/40/43).
- **T6**: aplicação do nível em `carregadas` DEPOIS do `comRamo`;
  `aplicaNivel(nv=0)` é identidade (baseline medida intacta); campos de
  frequência (`aCada/intervalo/chance/gatilho`) NUNCA escalados.
- **T7**: modo padrão `'ramo'` → nenhum clique de teste existente muda;
  cabeçalho mantém o substring `máx 5` (contrato seção 43); geometria
  nova: segmentado em (640,154,56,20) e (700,154,56,20).
- **T9**: `ritmo.js` default intocado (referência estável = pior caso do
  soft cap); `RITMO_SKILL` é env nova; ≥4 seeds por decisão (regra do
  AGENTS).
- **T11**: gate único `node testes/todos.js` (5 arquivos); ES5 em `js/`;
  push só com aval.
