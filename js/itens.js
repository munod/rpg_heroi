// Itens: armas e armaduras dropadas dos monstros (fase 2).
// Regras: bônus chato e flat (dano/hp/vel/crit), já multiplicado por
// Mapas.forca no drop; auto-equip se o item for melhor que o equipado;
// o resto vai para a bolsa (teto BOLSA_MAX). Itens são autocontidos —
// export/import do personagem carrega tudo sem referências externas.
var Itens = (function () {
  var BOLSA_MAX = 10;
  var CHANCE = 0.25;      // chance de drop por abate (chefes: sempre)
  var PESO_RAR = [0.65, 0.92];  // <0.65 comum; <0.92 incomum; senão raro

  // modelos — o campo `arma` define o visual (sprite) quando equipada
  var ARMAS = [
    // raridade 1 (comum)
    { nome: 'Adaga Velha', arma: 'adaga', rar: 1, bonus: { dano: 2 } },
    { nome: 'Espada Enferrujada', arma: 'espada', rar: 1, bonus: { dano: 1, vel: 4 } },
    { nome: 'Cajado Rachado', arma: 'cajado', rar: 1, bonus: { crit: 4 } },
    { nome: 'Marreta Pesada', arma: 'martelo', rar: 1, bonus: { dano: 1, hp: 6 } },
    // raridade 2 (incomum)
    { nome: 'Adaga Fina', arma: 'adaga', rar: 2, bonus: { dano: 3, crit: 4 } },
    { nome: 'Espada de Aço', arma: 'espada', rar: 2, bonus: { dano: 3, vel: 6 } },
    { nome: 'Cajado do Arcano', arma: 'cajado', rar: 2, bonus: { dano: 2, crit: 6 } },
    { nome: 'Machado de Guerra', arma: 'martelo', rar: 2, bonus: { dano: 4, hp: 10 } },
    // raridade 3 (raro)
    { nome: 'Adaga Sombria', arma: 'adaga', rar: 3, bonus: { dano: 5, crit: 8 } },
    { nome: 'Lâmina Lendária', arma: 'espada', rar: 3, bonus: { dano: 6, vel: 10 } },
    { nome: 'Cajado dos Ventos', arma: 'cajado', rar: 3, bonus: { dano: 4, crit: 10, vel: 5 } },
    { nome: 'Martelo Trovão', arma: 'martelo', rar: 3, bonus: { dano: 5, hp: 18 } }
  ];

  var ARMADURAS = [
    { nome: 'Trapos Gastos', rar: 1, bonus: { hp: 8 } },
    { nome: 'Couro Curado', rar: 1, bonus: { hp: 6, vel: 3 } },
    { nome: 'Cota de Malha', rar: 2, bonus: { hp: 16, dano: 1 } },
    { nome: 'Armadura de Peles', rar: 2, bonus: { hp: 12, vel: 5 } },
    { nome: 'Placas do Herói', rar: 3, bonus: { hp: 30, dano: 2 } },
    { nome: 'Manto do Arcano', rar: 3, bonus: { hp: 18, crit: 6 } }
  ];

  var ARMAS_OK = ['espada', 'adaga', 'cajado', 'martelo'];
  var CHAVES = ['dano', 'hp', 'vel', 'crit'];
  var SIGLAS = { dano: 'D', hp: 'HP', vel: 'V', crit: 'C' };
  var CORES = { 1: '#c9c2dd', 2: '#8ce08c', 3: '#e8c86a' };

  function corRar(rar) { return CORES[rar] || CORES[1]; }

  // soma dos bônus — usado p/ comparar itens e p/ status do personagem
  function pontuar(item) {
    if (!item || !item.bonus) return 0;
    var s = 0;
    for (var k in item.bonus) {
      if (Object.prototype.hasOwnProperty.call(item.bonus, k)) s += item.bonus[k];
    }
    return s;
  }

  // resumo compacto p/ a lista da bolsa: '+3D +6V'
  function resumo(item) {
    var out = '';
    for (var i = 0; i < CHAVES.length; i++) {
      var k = CHAVES[i];
      if (item.bonus && item.bonus[k]) out += ' +' + item.bonus[k] + SIGLAS[k];
    }
    return out;
  }

  function sorteiaRaridade() {
    var r = Math.random();
    return r < PESO_RAR[0] ? 1 : (r < PESO_RAR[1] ? 2 : 3);
  }

  function geraItem(rar, mapa) {
    var slot = Math.random() < 0.5 ? 'arma' : 'armadura';
    var fonte = slot === 'arma' ? ARMAS : ARMADURAS;
    var pool = [];
    for (var i = 0; i < fonte.length; i++) {
      if (fonte[i].rar === rar) pool.push(fonte[i]);
    }
    var modelo = pool[Math.floor(Math.random() * pool.length)];
    var mult = Math.round(Mapas.forca(mapa));   // item já nasce escalado
    var bonus = {};
    for (var k in modelo.bonus) {
      if (Object.prototype.hasOwnProperty.call(modelo.bonus, k)) {
        bonus[k] = modelo.bonus[k] * mult;
      }
    }
    var out = { nome: modelo.nome, slot: slot, rar: rar, bonus: bonus };
    if (modelo.arma) out.arma = modelo.arma;
    return out;
  }

  // Sorteio de um abate: [] sem drop; chefe sempre dropa 2 (rar >= 2).
  function sorteiaDrop(mapa, ehChefe) {
    if (!ehChefe && Math.random() >= CHANCE) return [];
    var qtd = ehChefe ? 2 : 1;
    var out = [];
    for (var i = 0; i < qtd; i++) {
      var rar = sorteiaRaridade();
      if (ehChefe && rar < 2) rar = 2;
      out.push(geraItem(rar, mapa));
    }
    return out;
  }

  function guardar(p, item) {
    p.bolsa.push(item);
    while (p.bolsa.length > BOLSA_MAX) p.bolsa.shift();  // mais antigo sai
    return true;
  }

  // Auto-equip: só troca se for estritamente melhor (soma dos bônus);
  // o item equipado anterior volta para a bolsa.
  function equiparSeMelhor(p, item) {
    var atual = p.equip[item.slot];
    if (atual && pontuar(item) <= pontuar(atual)) return false;
    p.equip[item.slot] = item;
    if (atual) guardar(p, atual);
    return true;
  }

  // Troca manual pela UI: item da bolsa <-> slot (o velho vai pra bolsa).
  function equipar(p, item) {
    var i = p.bolsa.indexOf(item);
    if (i < 0) return false;
    var velho = p.equip[item.slot];
    p.equip[item.slot] = item;
    p.bolsa.splice(i, 1);
    if (velho) p.bolsa.push(velho);
    return true;
  }

  return {
    ARMAS: ARMAS,
    ARMADURAS: ARMADURAS,
    BOLSA_MAX: BOLSA_MAX,
    CHANCE: CHANCE,
    corRar: corRar,
    pontuar: pontuar,
    resumo: resumo,
    sorteiaDrop: sorteiaDrop,
    guardar: guardar,
    equiparSeMelhor: equiparSeMelhor,
    equipar: equipar
  };
})();
