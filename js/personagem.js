// Regras de personagem: classes, atributos, status derivados, validação.
var Personagem = (function () {

  var ATRIBUTOS = [
    { id: 'for', nome: 'Força',         desc: 'Aumenta o dano corpo a corpo' },
    { id: 'des', nome: 'Destreza',      desc: 'Aumenta velocidade e crítico' },
    { id: 'con', nome: 'Constituição',  desc: 'Aumenta os pontos de vida' },
    { id: 'int', nome: 'Inteligência',
      desc: 'Aumenta o dano mágico e a qualidade da IA em combate' },
    { id: 'car', nome: 'Carisma',       desc: 'Aumenta o XP ganho por abate' }
  ];

  var CLASSES = {
    guerreiro: {
      id: 'guerreiro', nome: 'Guerreiro', arma: 'espada', armaNome: 'Espada',
      danoMod: 'for', danoBase: 5, hpBase: 18, alcance: 26,
      bonus: { for: 3, con: 2, des: 0, int: -2, car: 0 },
      desc: 'Forte e resistente. Dano alto no corpo a corpo.',
      cor: '#a03c3c'
    },
    mago: {
      id: 'mago', nome: 'Mago', arma: 'cajado', armaNome: 'Cajado',
      danoMod: 'int', danoBase: 4, hpBase: 8, alcance: 72,
      distancia: true, corProj: '#9a8bff',
      bonus: { for: -2, des: 0, con: -1, int: 4, car: 1 },
      desc: 'Frágil, mas conjura projéteis arcanos à distância.',
      cor: '#5a4ac0'
    },
    ladino: {
      id: 'ladino', nome: 'Ladino', arma: 'adaga', armaNome: 'Adaga',
      danoMod: 'des', danoBase: 4, hpBase: 12, alcance: 56,
      distancia: true, corProj: '#7ed957',
      bonus: { for: 0, des: 4, con: 0, int: 1, car: -1 },
      desc: 'Ágil e letal. Joga adagas à distância e critica muito.',
      cor: '#3a7a4a'
    },
    clerigo: {
      id: 'clerigo', nome: 'Clérigo', arma: 'martelo', armaNome: 'Martelo',
      // Carisma é a fonte de dano do clérigo (spec gestao-atributos:
      // fé converte em poder sagrado); FOR deixa de valer pra ele
      danoMod: 'car', danoBase: 4, hpBase: 16, alcance: 52,
      distancia: true, corProj: '#ffe89a',
      bonus: { for: 0, des: 0, con: 3, int: 1, car: 4 },
      desc: 'Equilibrado e resistente. Martelo sagrado à distância.',
      cor: '#b8913a'
    }
  };

  var CORES_PELE = ['#f2c9a1', '#e0a878', '#c98a5e', '#9c6239', '#6e4429', '#f7dcc0'];
  var CORES_CABELO = ['#2b2118', '#5a3a1e', '#a8681f', '#e8c86a', '#b83a3a', '#3a5a8c', '#6b4a8c', '#d8d8d8'];
  var CORES_ROUPA = ['#3a5a8c', '#8c3a3a', '#3a8c5a', '#6b4a8c', '#b8763a', '#4a4a5a', '#2a7a8c', '#8c3a6b'];
  var ESTILOS = [
    { id: 'curto',   nome: 'Curto' },
    { id: 'longo',   nome: 'Longo' },
    { id: 'rabo',    nome: 'Cavalo' },
    { id: 'moicana', nome: 'Moicana' },
    { id: 'careca',  nome: 'Bandana' }
  ];

  function uid() {
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  // Custo do próximo nível — fonte única da curva de progressão.
  // EXPONENCIAL PURA (spec progressao-exponencial, padrão de indústria):
  //   custo(nv) = CUSTO_BASE × CUSTO_G^(nv−1)
  // A razão constante G casa com a renda exponencial (XP_H^onda) e
  // mantém o tempo/nível ESTÁVEL — a curva linear antiga deixava o
  // custo (×nível) subir mais rápido que a renda (×onda): tempo/nível
  // crescia, o HP do herói parava de acompanhar o dano inimigo →
  // espiral de mortes e estol (medido: 2,8 → 1,4 níveis/min, 682
  // mortes/10h, mapa 3 estolado; e flood inicial nv47@15min).
  // CUSTO_BASE = custo do nível 1 (1º nível ~35-45s, medido com ritmo);
  // CUSTO_G calibrado no loop de medição (ritmo ≥4 runs por iteração).
  // RE-BASE (spec mundos): G 1,11 → 1,07 com H 1,064 em batalha.js —
  // o ratio ln(H)/ln(G) = 0,9166 ≈ 0,9133 antigo (trajetória de nível
  // praticamente idêntica), mas os números absolutos ficam menores:
  // com G 1,11 o CUSTO estourava 1e308 no nv 6.775 e a renda estourava
  // na onda 7.411 (mapa ~75) — qualquer teto ≤ 6.800 morria ANTES do
  // fim da campanha de 100 mapas. Com 1,07: custo(9500) ≈ 10^281 e
  // renda(9999) ≈ 10^270, ambos finitos com 30+ ordens de folga.
  var CUSTO_BASE = 146;
  var CUSTO_G = 1.07;
  function custoProximo(nivel) {
    var nv = (typeof nivel === 'number' && nivel >= 1) ? Math.floor(nivel) : 1;
    // SEM round: a razão precisa ser exata p/ o teste de exponencial
    return CUSTO_BASE * Math.pow(CUSTO_G, nv - 1);
  }

  // Teto de nível do personagem (fonte única — usado por Batalha.ganhaXP,
  // normalizar e o cabeçalho da jogatina). No teto o XP é DESCARTADO
  // (não acumula buffer invisível). 9500 = spec mundos: a campanha de
  // 100 mapas (10.000 ondas) termina em nv ≈ 9.150 (nv ≈ 0,9166 ×
  // ondas), então o teto fica ACIMA do fim de jogo — níveis vivos os
  // 200h inteiros — e ainda é o primeiro a ser atingido antes de
  // qualquer overflow de float (renda/custo estouram em onda 11.433 /
  // nv 10.441). Score do ranking capa em 999 por fórmula.
  var NIVEL_MAX = 9500;
  // Tetos de salvamento (safeguards — spec progressao-exponencial): tudo
  // bem abaixo de 2^53 (integer-safe) p/ cortar save editado/overflow.
  // Legítimo: ouro ~1e5-1e7 em runs longos; pontos ≤ 3×9500 = 28.500;
  // atributo ≤ ~28.500 — os tetos ficam com folga p/ nunca alcançar o
  // legítimo (e continuam < 2^53).
  var OURO_MAX = 1e12;      // ouro total (fonte única — mataInimigo)
  // HP concedido por nível — FONTE ÚNICA (status + statusDetalhado):
  // era literal ×4 nos dois lugares e o espelho quebrou quando a leva
  // progressao-exponencial subiu o slope p/ ×6
  var HP_POR_NIVEL = 6;
  var PONTOS_MAX = 100000;  // pontos de atributo acumulados
  // ---- curva da velocidade (spec gestao-atributos) ------------------
  // ANTES: 46 + DES×3 (LINEAR SEM TETO) — mono-stat virava Flash no
  // nv 30 (331 px/s) e batia 357 sub-passos/frame no teto (bug de FPS).
  // Agora: potência SATURANTE — parte de 70 em DES 8 (início intacto)
  // e chega a ~241 em DES 3.174 (fim da campanha mono-stat), com
  // CLAMP FINAL de 250 aplicado DEPOIS de item+keystone (o afixo
  // "Veloz" daria +1.968 no mapa 100 e contornaria o teto).
  // 250 = 3,6× o início, mundo (384px) em 1,54s, 7,1 g/s (abaixo do
  // piso 12,5), 2 sub-passos/frame e 17% abaixo dos 331 do "Flash".
  var VEL_BASE = 24;         // ganho sobre a base (46) em DES 8
  var VEL_DES_REF = 8;       // onde o ganho vale VEL_BASE (início)
  var VEL_EXP = 0.35;        // expoente saturante (<1 = achatado)
  var VEL_MAX = 250;         // teto FINAL (atributo + item + keystone)
  // multiplicador de ouro do Carisma — LOGARÍTMICO (cresce rápido e
  // satura; o linear antigo do XP chegava a 855× e quebrava a curva
  // calibrada): 1× em car 8 · 2× em ~100 · 2,77× no fim da campanha
  var OURO_CAR_K = 0.22;
  // ---- ritmo dos pontos (spec gestao-atributos) ----------------------
  // ANTES: +3 por nível = 6 decisões por minuto no early valendo ~1%
  // cada → o jogador distribuía no automático (relato: "nem ligam pra
  // quantidade de pontos"). Depois: +1 a cada 3 níveis (0,7 decisões/
  // min, ~6% de peso por ponto no nv 30) — e a leva dopamina (spec
  // balance-dopamina R-BAL-2, V1 NEUTRO) voltou para 1 ponto POR
  // NÍVEL (3× mais decisões, como o card por nível do gênero) com o
  // mult caindo junto para manter o poder MEDIDO idêntico.
  var PONTOS_CADA = 1;      // níveis entre um ponto e outro
  var PONTOS_NIVEL = 1;     // pontos dados nessa cadência
  // ---- compensação do valor por ponto (era 9×, hoje 3×) ---------------
  // Com 1 ponto a cada 3 níveis o jogador tinha 9× MENOS pontos que os
  // 3/nível antigos (0,33 vs 3,0 por nível); sem compensar, a medição
  // mediu ESTOL (1200min: mapa 3, 223 mortes, +0,1 nv/min vs referência
  // no mapa 4 em 120min com 0 mortes). A régua é: pontos × mult =
  // constante (3× pontos ⇒ mult ÷ 3 = 3×) — só o INVESTIDO escala (a
  // base 8 é fixa, então o EARLY fica idêntico ao medido: nv1 = 9 de
  // dano, 50 de HP em qualquer build).
  var PONTO_MULT = 3;
  var ATRIB_MAX = 1000000;  // pontos em cada atributo

  function novo() {
    return {
      id: uid(),
      nome: 'Herói',
      classe: 'guerreiro',
      atributos: { for: 8, des: 8, con: 8, int: 8, car: 8 },
      pontos: 0,            // sem pontos na criação: só +5 por nível
      nivel: 1,
      xp: 0,
      xpProx: custoProximo(1),
      equip: { arma: null, armadura: null },
      bolsa: [],
      ouro: 0,              // moeda: abates, venda e sucata de itens
      loadout: null,        // skills escolhidas (null = automático)
      ramos: null,          // ramos escolhidos {skillId: ramoId} (null = base neutra)
      trava: { arma: false, armadura: false },  // slot fixado (não auto-troca)
      autoApr: false,       // auto-aprimorar (A+) itens equipados
      keystoneLib: false,   // keystone desbloqueado (compra única)
      keystoneOn: false,    // keystone ativo (aplica o tradeoff)
      vitoria: false,       // venceu a campanha (mundo 10) — spec mundos
      look: {
        skin: CORES_PELE[1],
        hair: CORES_CABELO[0],
        estilo: 'curto',
        cloth: CORES_ROUPA[0]
      },
      // estatísticas de vida inteira (incrementos em Batalha.stat)
      stats: normalizaStats(null)
    };
  }

  // Atributos com bônus de classe aplicados.
  function efetivos(p) {
    var c = CLASSES[p.classe] || CLASSES.guerreiro;
    var a = p.atributos;
    var out = {};
    ATRIBUTOS.forEach(function (at) {
      var base = typeof a[at.id] === 'number' ? a[at.id] : 8;
      out[at.id] = Math.max(1, Math.round(base + (c.bonus[at.id] || 0)));
    });
    return out;
  }

  // Soma dos bônus dos itens equipados (arma + armadura), já com o
  // multiplicador de aprimoramento: round(bonus × (1 + 0,08 × up)).
  function bonusEquipamento(p) {
    var out = { dano: 0, hp: 0, vel: 0, crit: 0 };
    if (!p || !p.equip) return out;
    var lista = [p.equip.arma, p.equip.armadura];
    for (var i = 0; i < lista.length; i++) {
      var it = lista[i];
      if (!it || !it.bonus) continue;
      var up = (typeof it.up === 'number' && it.up > 0) ? it.up : 0;
      var f = 1 + APR * up;
      out.dano += Math.round((it.bonus.dano || 0) * f);
      out.hp += Math.round((it.bonus.hp || 0) * f);
      out.vel += Math.round((it.bonus.vel || 0) * f);
      out.crit += Math.round((it.bonus.crit || 0) * f);
    }
    return out;
  }

  // ---- keystone da classe (gestão estratégica) ------------------------
  // 1 por classe com tradeoff forte (pesquisa: keystone com custo >
  // árvore gigante). Libera no KEY_NIVEL por KEY_CUSTO de ouro e já
  // ativa na compra; alternar custa KEY_RESPEC (respec barato). Moram
  // aqui — e não em skills.js — porque são matemática pura de status
  // derivado: Personagem.status é a fonte única (sem espelho).
  var KEY_NIVEL = 30;
  var KEY_CUSTO = 200;
  var KEY_RESPEC = 10;
  var KEYSTONES = [
    { id: 'furia', classe: 'guerreiro', nome: 'Fúria Incontida',
      efeito: '+35%D/-20%HP', dano: 1.35, hpMax: 0.8 },
    { id: 'peso', classe: 'mago', nome: 'Peso do Poder',
      efeito: '+50%D/-25V', dano: 1.5, vel: -25 },
    { id: 'falcao', classe: 'ladino', nome: 'Olhos de Falcão',
      efeito: '+18C/-10%D', dano: 0.9, crit: 18 },
    { id: 'voto', classe: 'clerigo', nome: 'Voto de Pobreza',
      efeito: '+30HP/-20%D', dano: 0.8, hpMax: 1.3 }
  ];

  function keystoneDe(classe) {
    for (var i = 0; i < KEYSTONES.length; i++) {
      if (KEYSTONES[i].classe === classe) return KEYSTONES[i];
    }
    return null;
  }

  // desbloqueio (uma vez, já ativo) — false se sem nível/ouro
  function comprarKeystone(p) {
    if (!keystoneDe(p.classe) || p.keystoneLib || p.nivel < KEY_NIVEL) {
      return false;
    }
    if ((p.ouro || 0) < KEY_CUSTO) return false;
    p.ouro -= KEY_CUSTO;
    if (p.stats) {
      p.stats.ouroGasto = (p.stats.ouroGasto || 0) + KEY_CUSTO;
    }
    p.keystoneLib = true;
    p.keystoneOn = true;
    return true;
  }

  // respec barato: ligar/desligar custa KEY_RESPEC de ouro
  function alternarKeystone(p) {
    if (!p.keystoneLib || (p.ouro || 0) < KEY_RESPEC) return false;
    p.ouro -= KEY_RESPEC;
    if (p.stats) {
      p.stats.ouroGasto = (p.stats.ouroGasto || 0) + KEY_RESPEC;
    }
    p.keystoneOn = !p.keystoneOn;
    return true;
  }

  // Ganho de um atributo no status (spec gestao-atributos):
  //  · até a BASE do personagem (8 + bônus de classe) vale o linear
  //    antigo — atributo baixo PAGA a penalidade (fixture de "vidro"
  //    continua de vidro: con 1 = 12 de HP, não 40);
  //  · ACIMA da base cada ponto vale PONTO_MULT (9×) — é a
  //    compensação dos pontos escassos (1 a cada 3 níveis = 9× menos
  //    pontos que os 3/nível antigos), e é o que faz a decisão importar.
  function ganhoAtributo(at, at0, porPonto) {
    return Math.min(at, at0) * porPonto +
      Math.max(0, at - at0) * porPonto * PONTO_MULT;
  }

  // Multiplicador de Ouro do Carisma (spec gestao-atributos) —
  // LOGARÍTMICO: cresce rápido no início e satura. Nunca explode como
  // o xpMult linear antigo (855× no teto = progressão calibrada quebrada).
  // car 8 → 1,00 · car 100 → 2,00 · car 3174 (fim) → 2,77
  function multOuroCar(car) {
    var c = (typeof car === 'number' && isFinite(car)) ? car : 8;
    return 1 + OURO_CAR_K * Math.log(1 + Math.max(0, c - 8));
  }

  function status(p) {
    var c = CLASSES[p.classe] || CLASSES.guerreiro;
    var a = efetivos(p);
    var b = bonusEquipamento(p);
    var nv = (typeof p.nivel === 'number' && p.nivel >= 1)
      ? Math.floor(p.nivel) : 1;
    // soft cap saturante (spec gestao-atributos — ver VEL_* acima)
    var vel = 46 + VEL_BASE * Math.pow(a.des / VEL_DES_REF, VEL_EXP) +
      b.vel;
    // +6/nível (era 4): a fronteira exige que o HP do herói acompanhe
    // o dano inimigo linear — na leva progressao-exponencial os níveis
    // são mais escassos, então cada um puxa mais sobrevivência
    // HP: ganhoAtributo (CON linear até a base, 9× acima) + o HP por
    // nível (inalterado) mantêm a frente e o early
    var con0 = 8 + (c.bonus.con || 0);
    var hpMax = c.hpBase + Math.floor(ganhoAtributo(a.con, con0, 4)) +
      (nv - 1) * HP_POR_NIVEL + b.hp;
    // dano: ganhoAtributo (base linear +9× acima dela — ver helper)
    var at0 = 8 + (c.bonus[c.danoMod] || 0);
    var dano = c.danoBase +
      Math.floor(ganhoAtributo(a[c.danoMod], at0, 0.5)) + b.dano;
    // crítico: ganhoAtributo (DES linear até a base, 9× acima) — o
    // clamp 45 existente continua valendo por cima (o espelho desconta)
    var des0 = 8 + (c.bonus.des || 0);
    var critCalc = 4 + Math.floor(ganhoAtributo(a.des, des0, 1.3)) + b.crit;
    var crit = Math.min(45, Math.max(0, critCalc));
    // keystone ativo: tradeoff aplicado antes dos clamps finais
    var k = (p.keystoneLib && p.keystoneOn) ? keystoneDe(p.classe) : null;
    if (k) {
      if (k.dano) dano = Math.round(dano * k.dano);
      if (k.hpMax) hpMax = Math.round(hpMax * k.hpMax);
      if (k.vel) vel += k.vel;
      if (k.crit) crit += k.crit;
    }
    // clamps finais: afixo negativo/keystone nunca zera status, e o
    // TETO da velocidade vale p/ atributo+item+keystone somados (spec
    // gestao-atributos — sem ele o afixo contornaria os 250)
    vel = Math.max(10, Math.min(VEL_MAX, vel));
    hpMax = Math.max(10, hpMax);
    dano = Math.max(1, dano);
    crit = Math.max(0, Math.min(45, crit));
    return {
      // +4 de vida por nível (0 no nível 1, preservando o custo inicial)
      hpMax: hpMax,
      dano: dano,
      vel: vel,
      // Velocidade também acelera o ataque: recarga do golpe em segundos
      // (vel 70 = 0,50s base). PISO 0,08s = teto de 12,5 golpes/s —
      // playtest: sem piso a DES alta virava metralhadora caótica
      // (44 g/s). Antes do piso novo: sem piso nenhum; antes disso: 0,15.
      recarga: Math.max(0.08, 35 / vel),
      crit: crit,
      alcance: c.alcance,
      arma: c.armaNome,
      // Carisma NÃO mexe mais em XP (spec gestao-atributos: a curva
      // calibrada 12×1,064^onda voltou a ser a real — o multiplicador
      // de build era a "progressão errada" relatada). Agora ele dá
      // OURO (batalha.mataInimigo), de forma saturante.
      atributos: a
    };
  }

  // ---- detalhamento por fonte (Leva 3: tooltips do rodapé) ----------
  // Cada stat com suas partes NUMÉRICAS — o UI monta as linhas e o teste
  // confere a soma. Os efeitos lendários são lidos dos campos dos itens
  // (efeito/up) direto: sem depender de itens.js (mesma regra dos espelhos).
  var NOMES_EFEITOS = {
    furia: 'Lâmina Espectral: +50% dano c/ HP<30% (só no combate)',
    fenix: 'Véu da Fênix: 1ª letalidade não paga a morte',
    mercador: 'Manto do Mercador: ouro ×1,5',
    vampiro: 'Sangue Frio: 4% do dano vira vida',
    tempestade: 'Cetro da Tempestade: ondas renovam as skills',
    santificado: 'Égide Santificada: cura respinga dano nos próximos'
  };

  function statusDetalhado(p) {
    var c = CLASSES[p.classe] || CLASSES.guerreiro;
    var a = efetivos(p);
    var b = bonusEquipamento(p);
    var s = status(p);
    var k = (p.keystoneLib && p.keystoneOn) ? keystoneDe(p.classe) : null;
    var nv = (typeof p.nivel === 'number' && p.nivel >= 1)
      ? Math.floor(p.nivel) : 1;
    var eq = [p.equip && p.equip.arma, p.equip && p.equip.armadura];
    var apr = false, notas = [], i, ef;
    for (i = 0; i < eq.length; i++) {
      if (eq[i] && eq[i].up > 0) apr = true;
      ef = eq[i] && eq[i].efeito;
      if (ef && NOMES_EFEITOS[ef]) notas.push(NOMES_EFEITOS[ef]);
    }
    var itRot = 'itens' + (apr ? ' (c/ aprimoramento)' : '');
    var kd = k ? k.nome + ' (keystone)' : '';
    function multKeystone(v) {
      return (k && v) ? { v: v, rot: kd } : null;
    }
    function parteKeystone(v) {
      return (k && v) ? { v: v, rot: kd } : null;
    }
    // espelhos das fórmulas compensadas (PONTO_MULT) — Σpartes tem que
    // fechar com o status (seções 38/40 conferem)
    var at0D = 8 + (c.bonus[c.danoMod] || 0);
    var con0D = 8 + (c.bonus.con || 0);
    var des0D = 8 + (c.bonus.des || 0);
    // espelho da mesma partição de ganhoAtributo (Σpartes = status)
    var danoBase = Math.min(a[c.danoMod], at0D) * 0.5;
    var danoInv = Math.max(0, a[c.danoMod] - at0D) * 0.5 * PONTO_MULT;
    var hpBase = Math.min(a.con, con0D) * 4;
    var hpInv = Math.max(0, a.con - con0D) * 4 * PONTO_MULT;
    var partesDano = [
      { v: c.danoBase, rot: 'base ' + c.nome },
      { v: Math.floor(danoBase + danoInv),
        rot: c.danoMod.toUpperCase() + ' ' + a[c.danoMod] + (danoInv > 0
          ? ' (base linear + 9× no investido)' : '') },
      { v: b.dano, rot: itRot }
    ];
    var partesHp = [
      { v: c.hpBase, rot: 'base ' + c.nome },
      { v: Math.floor(hpBase + hpInv),
        rot: 'CON ' + a.con + (hpInv > 0 ? ' (base linear + 9×)' : '') },
      { v: (nv - 1) * HP_POR_NIVEL,
        rot: 'nível ' + nv + ' × ' + HP_POR_NIVEL },
      { v: b.hp, rot: itRot }
    ];
    var ganhoVel = VEL_BASE * Math.pow(a.des / VEL_DES_REF, VEL_EXP);
    var partesVel = [
      { v: 46, rot: 'base' },
      { v: ganhoVel, rot: 'DES ' + a.des + ' (curva saturante)' },
      { v: b.vel, rot: itRot }
    ];
    var kv = parteKeystone(k && k.vel ? k.vel : null);
    if (kv) partesVel.push(kv);
    var partesCrit = [
      { v: 4, rot: 'base' },
      { v: Math.floor(ganhoAtributo(a.des, des0D, 1.3)),
        rot: 'DES ' + a.des + ' (linear até a base, 9× acima)' },
      { v: b.crit, rot: itRot }
    ];
    // desconto do clamp 45% (sem ele Σpartes não fecha com o status)
    var critBruto = partesCrit.reduce(function (q, x) { return q + x.v; }, 0);
    if (critBruto > 45) {
      partesCrit.push({ v: 45 - critBruto, rot: 'limite 45%' });
    }
    var kc = parteKeystone(k && k.crit ? k.crit : null);
    if (kc) partesCrit.push(kc);
    // base = SEM itens e SEM keystone (padrão D3/D4 p/ o bloco da aba
    // Stats: '46→120' mostra o que os modificadores estão fazendo)
    var baseHp = c.hpBase + Math.floor(hpBase + hpInv) +
      (nv - 1) * HP_POR_NIVEL;
    var baseDano = c.danoBase + Math.floor(danoBase + danoInv);
    var baseVel = 46 + VEL_BASE * Math.pow(a.des / VEL_DES_REF, VEL_EXP);
    var baseCrit = Math.min(45, 4 +
      Math.floor(ganhoAtributo(a.des, des0D, 1.3)));
    return {
      hp: { total: s.hpMax, base: baseHp, partes: partesHp,
            mult: multKeystone(k && k.hpMax) },
      dano: { total: s.dano, base: baseDano, partes: partesDano,
              mult: multKeystone(k && k.dano),
              notas: notas },
      vel: { total: s.vel, base: baseVel, partes: partesVel },
      crit: { total: s.crit, base: baseCrit, partes: partesCrit },
      alcance: { total: s.alcance,
                 partes: [{ v: s.alcance, rot: 'da classe' }] },
      dps: { total: s.recarga > 0
              ? Math.round(s.dano * (1 + s.crit / 100) / s.recarga) : 0,
             partes: [{ v: s.dano, rot: 'dano' },
                      { v: s.crit, rot: 'crít % (esperado ×1,18 se 18%)' },
                      { v: s.recarga, rot: 'recarga (s)' }],
             formula: 'dano × (1 + crít ÷ 100) ÷ recarga',
             notas: notas }
    };
  }

  // Look pronto pra desenhar (arma equipada sobrepõe a da classe).
  // `classe` e `rar` são DERIVADOS (só pro desenho — o save não muda:
  // p.look segue com skin/hair/estilo/cloth).
  function lookDe(p) {
    var c = CLASSES[p.classe] || CLASSES.guerreiro;
    var armaEq = p.equip && p.equip.arma && p.equip.arma.arma;
    return {
      skin: p.look.skin,
      hair: p.look.hair,
      estilo: p.look.estilo,
      cloth: p.look.cloth,
      classe: CLASSES[p.classe] ? p.classe : 'guerreiro',
      rar: (p.equip && p.equip.arma && p.equip.arma.rar) || 1,
      weapon: armaEq || c.arma
    };
  }

  function validar(p) {
    if (!p || typeof p !== 'object') throw new Error('JSON inválido');
    if (typeof p.nome !== 'string' || !p.nome.trim()) throw new Error('nome ausente');
    if (!CLASSES[p.classe]) throw new Error('classe desconhecida');
    if (!p.atributos || typeof p.atributos !== 'object') throw new Error('atributos ausentes');
    ATRIBUTOS.forEach(function (at) {
      var v = p.atributos[at.id];
      if (typeof v !== 'number' || !isFinite(v) || v < 1) {
        throw new Error('atributo inválido: ' + at.id);
      }
    });
    if (!p.look || typeof p.look !== 'object') throw new Error('aparência ausente');
    ['skin', 'hair', 'cloth'].forEach(function (k) {
      if (typeof p.look[k] !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(p.look[k])) {
        throw new Error('cor inválida: ' + k);
      }
    });
    if (!ESTILOS.some(function (e) { return e.id === p.look.estilo; })) {
      throw new Error('estilo inválido');
    }
    // progressão: sem esses guardas um save corrompido trava o loop de XP
    if (typeof p.nivel !== 'number' || !isFinite(p.nivel) || p.nivel < 1) {
      throw new Error('nível inválido');
    }
    if (typeof p.xp !== 'number' || !isFinite(p.xp) || p.xp < 0) {
      throw new Error('xp inválido');
    }
    if (typeof p.xpProx !== 'number' || !isFinite(p.xpProx) || p.xpProx <= 0) {
      throw new Error('xpProx inválido');
    }
    if (typeof p.pontos !== 'number' || !isFinite(p.pontos) || p.pontos < 0) {
      throw new Error('pontos inválidos');
    }
    return p;
  }

  function corOu(v, padrao) {
    return (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v)) ? v : padrao;
  }

  // Chaves de bônus de item — espelho de Itens (personagem.js não pode
  // depender de itens.js: testes como grade carregam só sprite+personagem).
  var BONUS_ITENS = ['dano', 'hp', 'vel', 'crit'];

  // Espelhos da economia (mesma razão do acima): +8% por nível de
  // aprimoramento e o teto de níveis por item, iguais aos de Itens.
  var APR = 0.08;
  var MAX_UP_ITENS = 8;

  // Chaves das estatísticas — espelho de Batalha.stat (mesma razão do
  // espelho acima: grade/previa carregam só sprite+personagem)
  var STATS = ['abates', 'mortes', 'danoCausado', 'danoRecebido',
               'ondas', 'bosses', 'itens', 'tempo',
               'gatunos', 'acougueiros',
               // economia (Leva 4) — normalizaStats zera saves antigos
               'ouroGanho', 'ouroGasto', 'vendidos', 'sucateados',
               'aprimoramentos', 'rerolls', 'lendarios'];

  // Preenche as 8 chaves: valor válido do save, ou 0 (save antigo que não
  // tinha stats). Teto defensivo igual ao do xp p/ storage corrompido, e
  // floor nos valores (o tempo ao vivo é fracionário — soma de dt).
  function normalizaStats(s) {
    var out = {};
    for (var i = 0; i < STATS.length; i++) {
      var v = s ? s[STATS[i]] : null;
      out[STATS[i]] = (typeof v === 'number' && isFinite(v) && v >= 0)
        ? Math.min(Math.floor(v), 1e9) : 0;
    }
    return out;
  }
  var BOLSA_LIMITE = 10;   // espelho de Itens.BOLSA_MAX

  // Item vindo de save/export antigo ou corrompido: valida e completa.
  // Toda leitura passa por aqui (listar/importar), então validar() não
  // refaz esse trabalho.
  function normalizaItem(it, slotEsperado) {
    if (!it || typeof it !== 'object') return null;
    if (typeof it.nome !== 'string' || !it.nome.trim()) return null;
    var slot = (it.slot === 'arma' || it.slot === 'armadura')
      ? it.slot : slotEsperado;
    if (!slot) return null;
    var out = {
      // 40 chars: nome com prefixo/sufixo de afixo (itens antigos ≤ 24)
      nome: it.nome.slice(0, 40),
      slot: slot,
      rar: (typeof it.rar === 'number' && it.rar >= 1 && it.rar <= 4)
        ? Math.floor(it.rar) : 1,          // 4 = lendário
      bonus: {},
      afixos: [],
      // economia (Leva B) — defaults p/ saves anteriores
      up: Math.min(num(it.up, 0, 0), MAX_UP_ITENS),
      rerolls: num(it.rerolls, 0, 0),
      escala: Math.min(num(it.escala, 1, 1), 999)
    };
    if (typeof it.base === 'string' && it.base) out.base = it.base.slice(0, 24);
    // efeito lendário: só formato (a validação de id é de Itens — id
    // desconhecido fica inerte em temEfeito)
    if (typeof it.efeito === 'string' && /^[a-z][a-z0-9-]{0,15}$/.test(it.efeito)) {
      out.efeito = it.efeito;
    }
    if (typeof it.arma === 'string' && it.arma) out.arma = it.arma.slice(0, 12);
    for (var i = 0; i < BONUS_ITENS.length; i++) {
      var k = BONUS_ITENS[i];
      var v = it.bonus ? it.bonus[k] : null;
      // aceita negativo (afixo amaldiçoado); teto defensivo de magnitude
      if (typeof v === 'number' && isFinite(v) && v !== 0 &&
          Math.abs(v) <= 99999) {
        out.bonus[k] = v < 0 ? Math.ceil(v) : Math.floor(v);
      }
    }
    // afixos rollados (itens legados não têm — fica [])
    if (Array.isArray(it.afixos)) {
      for (var j = 0; j < it.afixos.length && out.afixos.length < 4; j++) {
        var af = it.afixos[j];
        if (!af || typeof af !== 'object') continue;
        if (typeof af.nome !== 'string' || !af.nome.trim()) continue;
        var idx = BONUS_ITENS.indexOf(af.chave);
        var val = af.valor;
        if (idx < 0 || typeof val !== 'number' || !isFinite(val) ||
            val <= 0 || val > 99999) continue;
        var neg = !!af.neg || af.tipo === 'neg';
        out.afixos.push({
          nome: af.nome.slice(0, 16),
          tipo: neg ? 'neg' : (af.tipo === 'suf' ? 'suf' : 'pre'),
          chave: BONUS_ITENS[idx],
          neg: neg,
          valor: Math.floor(val)
        });
      }
    }
    return out;
  }

  function normalizaBolsa(b) {
    if (!Array.isArray(b)) return [];
    var out = [];
    for (var i = 0; i < b.length && out.length < BOLSA_LIMITE; i++) {
      var it = normalizaItem(b[i], null);   // da bolsa o item precisa trazer slot
      if (it) out.push(it);
    }
    return out;
  }

  // loadout: até Skills.LIMITE ids (espelho do 5 — skills.js não é
  // carregado pelos testes de sprite; a FATIA POR NÍVEL 3/4/5 fica em
  // Skills.limite); lixo/ids alheios viram null (automático) e o
  // fallback por classe está em Skills.carregadas.
  function normalizaLoadout(l) {
    if (!Array.isArray(l)) return null;
    var out = [];
    for (var i = 0; i < l.length && out.length < 5; i++) {
      if (typeof l[i] === 'string' && l[i]) out.push(l[i].slice(0, 24));
    }
    return out.length ? out : null;
  }

  // ramos escolhidos {skillId: ramoId} (spec arvore-skills): só strings
  // válidas (a validação de pertencer à árvore é de Skills.carregadas,
  // como o loadout); lixo vira null = base neutra. Teto de 32 entradas
  // p/ save editado não virar bolha.
  function normalizaRamos(r) {
    if (!r || typeof r !== 'object') return null;
    var out = null, n = 0;
    for (var k in r) {
      if (!Object.prototype.hasOwnProperty.call(r, k)) continue;
      if (n >= 32) break;
      if (typeof k === 'string' && k && typeof r[k] === 'string' && r[k]) {
        if (!out) out = {};
        out[k.slice(0, 24)] = r[k].slice(0, 24);
        n++;
      }
    }
    return out;
  }

  function num(v, min, padrao) {
    return (typeof v === 'number' && isFinite(v) && v >= min) ? Math.floor(v) : padrao;
  }

  // Preenche o que faltar (personagens de versões antigas, etc).
  function normalizar(p) {
    p = (p && typeof p === 'object') ? p : {};
    var base = novo();
    // teto de nível na LEITURA: save legado acima do cap (já houve nv
    // 36 mil em produção) vira NIVEL_MAX — atributos investidos ficam
    // intocados; XP do cap é zerado (regra do teto)
    var nivel = Math.min(num(p.nivel, 1, 1), NIVEL_MAX);
    var noTeto = nivel >= NIVEL_MAX;
    // SAFEGUARDS (spec progressao-exponencial): xpProx SEMPRE da fonte
    // única — o valor salvo é ignorado (editá-lo não salta mais nível,
    // fecha o bug dos 83k) — e xp clampado em xpProx−1 (save legítimo
    // sempre tem xp < xpProx; excesso é descartado, como no teto)
    var xpProx = custoProximo(nivel);
    var out = {
      id: typeof p.id === 'string' && p.id ? p.id : base.id,
      nome: String(p.nome || base.nome).slice(0, 14),
      classe: CLASSES[p.classe] ? p.classe : base.classe,
      atributos: {},
      pontos: Math.min(num(p.pontos, 0, base.pontos), PONTOS_MAX),
      nivel: nivel,
      xp: noTeto ? 0 : Math.min(num(p.xp, 0, 0), xpProx - 1),
      xpProx: xpProx,
      equip: {
        arma: normalizaItem(p.equip && p.equip.arma, 'arma'),
        armadura: normalizaItem(p.equip && p.equip.armadura, 'armadura')
      },
      bolsa: normalizaBolsa(p.bolsa),
      ouro: Math.min(num(p.ouro, 0, 0), OURO_MAX),
      loadout: normalizaLoadout(p.loadout),
      ramos: normalizaRamos(p.ramos),
      trava: {
        arma: !!(p.trava && p.trava.arma),
        armadura: !!(p.trava && p.trava.armadura)
      },
      autoApr: p.autoApr === true,
      // venceu a campanha (mundo 10) — o overlay de vitória só aparece
      // a primeira vez (spec mundos R-MUN-5); default false em saves
      // antigos, sem bump de chave
      vitoria: p.vitoria === true,
      keystoneLib: p.keystoneLib === true,
      keystoneOn: p.keystoneOn === true,
      look: {
        skin: corOu(p.look && p.look.skin, base.look.skin),
        hair: corOu(p.look && p.look.hair, base.look.hair),
        estilo: (p.look && p.look.estilo) || base.look.estilo,
        cloth: corOu(p.look && p.look.cloth, base.look.cloth)
      },
      stats: normalizaStats(p.stats)
    };
    ATRIBUTOS.forEach(function (at) {
      var v = p.atributos ? p.atributos[at.id] : null;
      out.atributos[at.id] = (typeof v === 'number' && isFinite(v))
        ? Math.min(Math.max(1, Math.round(v)), ATRIB_MAX)
        : 8;
    });
    if (!ESTILOS.some(function (e) { return e.id === out.look.estilo; })) out.look.estilo = 'curto';
    return validar(out);
  }

  function exportarJSON(p) {
    return JSON.stringify(p, null, 2);
  }

  function importarJSON(texto) {
    var obj;
    try {
      obj = JSON.parse(texto);
    } catch (e) {
      throw new Error('arquivo não é um JSON válido');
    }
    return normalizar(obj);
  }

  return {
    ATRIBUTOS: ATRIBUTOS,
    STATS: STATS,
    CLASSES: CLASSES,
    CORES_PELE: CORES_PELE,
    CORES_CABELO: CORES_CABELO,
    CORES_ROUPA: CORES_ROUPA,
    ESTILOS: ESTILOS,
    KEYSTONES: KEYSTONES,
    KEY_NIVEL: KEY_NIVEL,
    KEY_CUSTO: KEY_CUSTO,
    KEY_RESPEC: KEY_RESPEC,
    NIVEL_MAX: NIVEL_MAX,
    VEL_MAX: VEL_MAX,
    OURO_CAR_K: OURO_CAR_K,
    PONTOS_CADA: PONTOS_CADA,
    PONTOS_NIVEL: PONTOS_NIVEL,
    multOuroCar: multOuroCar,
    OURO_MAX: OURO_MAX,
    PONTOS_MAX: PONTOS_MAX,
    ATRIB_MAX: ATRIB_MAX,
    keystoneDe: keystoneDe,
    comprarKeystone: comprarKeystone,
    alternarKeystone: alternarKeystone,
    novo: novo,
    custoProximo: custoProximo,
    status: status,
    statusDetalhado: statusDetalhado,
    lookDe: lookDe,
    validar: validar,
    normalizar: normalizar,
    exportarJSON: exportarJSON,
    importarJSON: importarJSON
  };
})();
