# Spec: Skills estratégicas — loadout, keystone e respec (Leva C)

Status: **concluída** (gate verde 3×, ritmo na faixa com LIMITE 3)
· Data: 2026-11-08 · Feature pai:
`gestao-estrategica` (R-GES-3) · Versão alvo: 0.2.0

## Contexto

Hoje as 5 skills da classe disparam **todas** assim que desbloqueiam — o
jogador nunca escolhe nada (a única "build" é subir de nível). A
pesquisa (D3→D4: flexível na build, permanência no gear; Last Epoch e
Game Design Lab: keystone com tradeoff > árvore gigante; respec barato é
o padrão de mercado) fecha o trio: **limite de escolha**, **keystone que
muda regra com custo** e **troca de build barata**.

## Requisitos

- **R-SKL-1 (loadout)**: `Skills.LIMITE = 3` skills ativas por vez.
  `Skills.carregadas(p)` = desbloqueadas ∩ `p.loadout`, com **automático**
  (p loadout nulo/vazio ou de outra classe) = as **3 mais avançadas**
  desbloqueadas. Mínimo 1 skill no loadout. Troca de classe (aba Classe)
  zera para o automático da nova classe. `Skills.ativas` mantém a
  assinatura e o significado atuais (testes da seção 16 intactos).
- **R-SKL-2 (keystone)**: 1 keystone por classe com tradeoff forte, em
  `personagem.js` (dono do `status` — **sem espelho**): guerreiro
  *Fúria Incontida* +35% dano/−20% HP · mago *Peso do Poder* +50%
  dano/−25 vel (mexe em movimento e recarga) · ladino *Olhos de Falcão*
  +18 crít/−10% dano · clérigo *Voto de Pobreza* +30% HP/−20% dano.
  Libera no **nível 30** por **200 ouro** (`KEY_NIVEL`/`KEY_CUSTO`);
  efeitos aplicados dentro de `Personagem.status` (fonte única, com
  clamps finais), campos `p.keystoneLib`/`p.keystoneOn`.
- **R-SKL-3 (respec)**: trocar o **loadout é livre** (seleção pura — não
  há pontos investidos; cobrar seria freio, não decisão); **alternar o
  keystone custa 10 ouro** (`KEY_RESPEC` — respec barato com ouro, fiel à
  decisão aprovada). Desbloqueio é uma vez.
- **R-SKL-4 (integração)**: `Batalha` lê `Skills.carregadas(p)` no lugar
  de `ativas`; gatilhos, estado (`skillsEstado`) e avisos de desbloqueio
  não mudam. UI na aba Classe **reorganizada**: classe em grade 2×2
  (testes: clique do Mago passa para o novo centro), linhas das 5 skills
  (ativas/desativadas/indisponíveis com nível) e botão do keystone com
  efeito e custo no rótulo — sem descrição de classe/próxima skill
  (informação de nível já aparece na linha da skill; bônus seguem na aba
  Atributos). Saldo: `p.loadout`, `keystoneLib`, `keystoneOn` em
  `novo/normalizar` (migração sem bump de chave).

## Fora de escopo

- Árvore de passivas/nós, segundo keystone por classe, keystone de
  item, custo para trocar loadout, novas skills.

## Verificação

- Gate `node testes/todos.js` (seção 25 nova): `carregadas` (automático
  = 3 mais avançadas, seleção custom, fallback por classe trocada,
  mínimo 1), compra/toggle de keystone com ouro e efeito exato no
  `status` (dano×1,35 etc.), migração dos 3 campos, UI (toggle de skill,
  recusa no máximo, botão do keystone, clique do Mago na grade nova).
- Seção 16 (skills) deve passar **sem alteração** (nv≤25 ≤ LIMITE) — é a
  prova de retrocompatibilidade dos gatilhos.
- `node testes/ritmo.js 35` — o teto de 3 remove a skill de nv5+ do
  late game: se o mapa 1 sair da faixa (25-35min), primeiro tentar
  `LIMITE = 4`, depois ajustar faixas de skill — nunca a curva base.
