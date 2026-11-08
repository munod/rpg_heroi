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
      danoMod: 'for', danoBase: 4, hpBase: 16, alcance: 52,
      distancia: true, corProj: '#ffe89a',
      bonus: { for: 1, des: 0, con: 3, int: 1, car: 2 },
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
  // O valor antigo (20 × nível) estava repetido em quatro lugares
  // (novo, normalizar e dois em Batalha.ganhaXP); mudava em um só.
  // CUSTO_INICIAL puxa o começo (1º nível não cai em segundos) e
  // CUSTO_BASE controla o ritmo sustentado (medir com testes/ritmo.js).
  var CUSTO_INICIAL = 125;
  var CUSTO_BASE = 21;
  function custoProximo(nivel) {
    var nv = (typeof nivel === 'number' && nivel >= 1) ? Math.floor(nivel) : 1;
    return CUSTO_INICIAL + CUSTO_BASE * nv;
  }

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

  // Soma dos bônus dos itens equipados (arma + armadura).
  function bonusEquipamento(p) {
    var out = { dano: 0, hp: 0, vel: 0, crit: 0 };
    if (!p || !p.equip) return out;
    var lista = [p.equip.arma, p.equip.armadura];
    for (var i = 0; i < lista.length; i++) {
      var it = lista[i];
      if (!it || !it.bonus) continue;
      out.dano += it.bonus.dano || 0;
      out.hp += it.bonus.hp || 0;
      out.vel += it.bonus.vel || 0;
      out.crit += it.bonus.crit || 0;
    }
    return out;
  }

  function status(p) {
    var c = CLASSES[p.classe] || CLASSES.guerreiro;
    var a = efetivos(p);
    var b = bonusEquipamento(p);
    var nv = (typeof p.nivel === 'number' && p.nivel >= 1)
      ? Math.floor(p.nivel) : 1;
    var vel = 46 + a.des * 3 + b.vel;
    return {
      // +4 de vida por nível (0 no nível 1, preservando o custo inicial)
      hpMax: c.hpBase + a.con * 4 + (nv - 1) * 4 + b.hp,
      dano: c.danoBase + Math.floor(a[c.danoMod] / 2) + b.dano,
      vel: vel,
      // Velocidade também acelera o ataque: recarga do golpe em segundos
      // (vel 70 = 0,50s base; piso de 0,15s para não virar metralhadora)
      recarga: Math.max(0.15, 35 / vel),
      crit: Math.min(45, 4 + Math.floor(a.des * 1.3) + b.crit),
      alcance: c.alcance,
      arma: c.armaNome,
      xpMult: 1 + (a.car - 8) * 0.03,
      atributos: a
    };
  }

  // Look pronto pra desenhar (arma equipada sobrepõe a da classe).
  function lookDe(p) {
    var c = CLASSES[p.classe] || CLASSES.guerreiro;
    var armaEq = p.equip && p.equip.arma && p.equip.arma.arma;
    return {
      skin: p.look.skin,
      hair: p.look.hair,
      estilo: p.look.estilo,
      cloth: p.look.cloth,
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

  // Chaves das estatísticas — espelho de Batalha.stat (mesma razão do
  // espelho acima: grade/previa carregam só sprite+personagem)
  var STATS = ['abates', 'mortes', 'danoCausado', 'danoRecebido',
               'ondas', 'bosses', 'itens', 'tempo'];

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
      nome: it.nome.slice(0, 24),
      slot: slot,
      rar: (typeof it.rar === 'number' && it.rar >= 1 && it.rar <= 3)
        ? Math.floor(it.rar) : 1,
      bonus: {}
    };
    if (typeof it.arma === 'string' && it.arma) out.arma = it.arma.slice(0, 12);
    for (var i = 0; i < BONUS_ITENS.length; i++) {
      var k = BONUS_ITENS[i];
      var v = it.bonus ? it.bonus[k] : null;
      if (typeof v === 'number' && isFinite(v) && v > 0) {
        out.bonus[k] = Math.floor(v);
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

  function num(v, min, padrao) {
    return (typeof v === 'number' && isFinite(v) && v >= min) ? Math.floor(v) : padrao;
  }

  // Preenche o que faltar (personagens de versões antigas, etc).
  function normalizar(p) {
    p = (p && typeof p === 'object') ? p : {};
    var base = novo();
    var nivel = num(p.nivel, 1, 1);
    var out = {
      id: typeof p.id === 'string' && p.id ? p.id : base.id,
      nome: String(p.nome || base.nome).slice(0, 14),
      classe: CLASSES[p.classe] ? p.classe : base.classe,
      atributos: {},
      pontos: num(p.pontos, 0, base.pontos),
      nivel: nivel,
      // teto defensivo: xp absurdo (save corrompido) travaria o loop de níveis
      xp: Math.min(num(p.xp, 0, 0), 1e9),
      xpProx: num(p.xpProx, 1, custoProximo(nivel)),
      equip: {
        arma: normalizaItem(p.equip && p.equip.arma, 'arma'),
        armadura: normalizaItem(p.equip && p.equip.armadura, 'armadura')
      },
      bolsa: normalizaBolsa(p.bolsa),
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
        ? Math.max(1, Math.round(v))
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
    novo: novo,
    custoProximo: custoProximo,
    status: status,
    lookDe: lookDe,
    validar: validar,
    normalizar: normalizar,
    exportarJSON: exportarJSON,
    importarJSON: importarJSON
  };
})();
