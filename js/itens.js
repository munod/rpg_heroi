// Itens: armas e armaduras dropadas com afixos (gestão estratégica).
// Regras: a raridade define quantos afixos rollam (comum 0, incomum 1,
// raro 2); afixo tem nome (prefixo/sufixo), chave, valor em faixa e pode
// ser negativo (teto de 1 por item, magnitude 1,5× — tradeoff que o
// auto-equip, pela soma assinada, pesa sozinho). Smart-loot pesa as
// chaves da classe (70%). Bônus já chega escalado por Mapas.forca no
// drop. Itens são autocontidos — export/import do personagem carrega
// tudo sem referências externas.
var Itens = (function () {
  var BOLSA_MAX = 10;
  var CHANCE = 0.25;      // chance de drop por abate (chefes: sempre)
  var PESO_RAR = [0.65, 0.92];  // <0.65 comum; <0.92 incomum; senão raro
  var QTD_AFIXOS = [0, 1, 2];   // afixos por raridade (índice rar - 1)
  var CHANCE_NEG = 0.3;   // por rolagem de afixo (rar >= 2)
  var MULT_NEG = 1.5;     // magnitude do negativo (o tradeoff compensa)
  var PESO_CLASSE = 0.7;  // chance de afixo positivo sair na chave da classe

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

  // smart-loot: chaves que a classe quer (os outros 30% fogem do viés
  // para o drop não virar monótono)
  var AFINS = {
    guerreiro: { dano: 1, hp: 1 },
    mago: { dano: 1, crit: 1 },
    ladino: { vel: 1, crit: 1 },
    clerigo: { hp: 1, dano: 1 }
  };

  // pool de afixos — enxuto de propósito (a armadilha clássica é affix
  // bloat: pool grande demais transforma item em planilha). `tipo` pre/suf
  // vira prefixo/sufixo do nome; neg não muda o nome (aparece nos status
  // e nos deltas da UI).
  var AFIXOS = [
    { nome: 'Poderoso', tipo: 'pre', chave: 'dano', faixa: [2, 4] },
    { nome: 'Robusto', tipo: 'pre', chave: 'hp', faixa: [3, 6] },
    { nome: 'Veloz', tipo: 'pre', chave: 'vel', faixa: [3, 6] },
    { nome: 'Preciso', tipo: 'pre', chave: 'crit', faixa: [2, 5] },
    { nome: 'do Trovão', tipo: 'suf', chave: 'dano', faixa: [2, 4] },
    { nome: 'do Gigante', tipo: 'suf', chave: 'hp', faixa: [3, 6] },
    { nome: 'do Fantasma', tipo: 'suf', chave: 'vel', faixa: [3, 6] },
    { nome: 'da Agulha', tipo: 'suf', chave: 'crit', faixa: [2, 5] },
    { nome: 'Quebrado', tipo: 'neg', chave: 'dano', faixa: [2, 4] },
    { nome: 'Frágil', tipo: 'neg', chave: 'hp', faixa: [3, 6] },
    { nome: 'Lento', tipo: 'neg', chave: 'vel', faixa: [3, 6] },
    { nome: 'Torto', tipo: 'neg', chave: 'crit', faixa: [2, 5] }
  ];

  function corRar(rar) { return CORES[rar] || CORES[1]; }

  // soma dos bônus — usada p/ comparar itens e p/ auto-equip; valores
  // negativos contam contra (item amaldiçoado não equipa sozinho)
  function pontuar(item) {
    if (!item || !item.bonus) return 0;
    var s = 0;
    for (var k in item.bonus) {
      if (Object.prototype.hasOwnProperty.call(item.bonus, k)) s += item.bonus[k];
    }
    return s;
  }

  // resumo compacto p/ quem quer o item absoluto: '+3D +6V'
  function resumo(item) {
    var out = '';
    for (var i = 0; i < CHAVES.length; i++) {
      var k = CHAVES[i];
      if (item.bonus && item.bonus[k]) out += ' +' + item.bonus[k] + SIGLAS[k];
    }
    return out;
  }

  // delta por chave contra o equipado (item - atual): '+5D -12HP +3V'.
  // Sem atual, é o resumo assinado do próprio item.
  function deltas(item, atual) {
    var out = '';
    for (var i = 0; i < CHAVES.length; i++) {
      var k = CHAVES[i];
      var v = ((item && item.bonus && item.bonus[k]) || 0) -
        ((atual && atual.bonus && atual.bonus[k]) || 0);
      if (v > 0) out += ' +' + v + SIGLAS[k];
      else if (v < 0) out += ' ' + v + SIGLAS[k];
    }
    return out;
  }

  // linha da lista (nome com afixos + deltas) cortada p/ caber no botão
  function linha(item, atual, max) {
    var d = deltas(item, atual);
    var nome = item.nome || '';
    var corte = (max || 40) - d.length - (d ? 2 : 0);
    if (nome.length > corte) nome = nome.slice(0, Math.max(3, corte - 1)) + '…';
    return nome + (d ? '  ' + d : '');
  }

  function sorteiaRaridade() {
    var r = Math.random();
    return r < PESO_RAR[0] ? 1 : (r < PESO_RAR[1] ? 2 : 3);
  }

  // pool de afixos positivos com o tipo (pre/suf) ainda livre, com
  // smart-loot: 70% de vir das chaves da classe
  function poolPos(tipos, classe) {
    var afins = AFINS[classe];
    var geral = [], certos = [];
    for (var i = 0; i < AFIXOS.length; i++) {
      var af = AFIXOS[i];
      if (af.tipo === 'neg' || tipos[af.tipo]) continue;
      geral.push(af);
      if (afins && afins[af.chave]) certos.push(af);
    }
    if (certos.length && geral.length && Math.random() < PESO_CLASSE) {
      return certos;
    }
    return geral;
  }

  function poolNeg() {
    var out = [];
    for (var i = 0; i < AFIXOS.length; i++) {
      if (AFIXOS[i].tipo === 'neg') out.push(AFIXOS[i]);
    }
    return out;
  }

  // rolagem de afixos do item: qtd pela raridade, no máximo 1 negativo,
  // no máximo 1 prefixo e 1 sufixo (o neg não ocupa tipo)
  function sorteiaAfixos(rar, classe, mult) {
    var out = [];
    if (rar < 2) return out;
    var tipos = {}, negs = 0;
    for (var i = 0; i < QTD_AFIXOS[rar - 1]; i++) {
      var ehNeg = negs < 1 && Math.random() < CHANCE_NEG;
      var pool = ehNeg ? poolNeg() : poolPos(tipos, classe);
      if (!pool.length) continue;
      var af = pool[Math.floor(Math.random() * pool.length)];
      var neg = ehNeg;
      if (!neg) tipos[af.tipo] = true;
      else negs++;
      var v = af.faixa[0] + Math.random() * (af.faixa[1] - af.faixa[0]);
      var valor = Math.max(1, Math.round(v * mult * (neg ? MULT_NEG : 1)));
      out.push({
        nome: af.nome, tipo: neg ? 'neg' : af.tipo,
        chave: af.chave, neg: neg, valor: valor
      });
    }
    return out;
  }

  function geraItem(rar, mapa, classe) {
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
    var afixos = sorteiaAfixos(rar, classe, mult);
    var pre = '', suf = '';
    for (var a = 0; a < afixos.length; a++) {
      var af = afixos[a];
      bonus[af.chave] = (bonus[af.chave] || 0) + (af.neg ? -af.valor : af.valor);
      if (!af.neg) {
        if (af.tipo === 'pre') pre = af.nome;
        else suf = af.nome;
      }
    }
    var out = {
      nome: (pre ? pre + ' ' : '') + modelo.nome + (suf ? ' ' + suf : ''),
      slot: slot, rar: rar, bonus: bonus, afixos: afixos
    };
    if (modelo.arma) out.arma = modelo.arma;
    return out;
  }

  // Sorteio de um abate: [] sem drop; chefe sempre dropa 2 (rar >= 2).
  // `classe` alimenta o smart-loot (sem classe = peso uniforme).
  function sorteiaDrop(mapa, ehChefe, classe) {
    if (!ehChefe && Math.random() >= CHANCE) return [];
    var qtd = ehChefe ? 2 : 1;
    var out = [];
    for (var i = 0; i < qtd; i++) {
      var rar = sorteiaRaridade();
      if (ehChefe && rar < 2) rar = 2;
      out.push(geraItem(rar, mapa, classe));
    }
    return out;
  }

  function guardar(p, item) {
    p.bolsa.push(item);
    while (p.bolsa.length > BOLSA_MAX) p.bolsa.shift();  // mais antigo sai
    return true;
  }

  // Auto-equip: só troca se for estritamente melhor (soma assinada dos
  // bônus — negativo pesa contra); o item equipado volta para a bolsa.
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
    AFIXOS: AFIXOS,
    AFINS: AFINS,
    QTD_AFIXOS: QTD_AFIXOS,
    BOLSA_MAX: BOLSA_MAX,
    CHANCE: CHANCE,
    corRar: corRar,
    pontuar: pontuar,
    resumo: resumo,
    deltas: deltas,
    linha: linha,
    geraItem: geraItem,
    sorteiaDrop: sorteiaDrop,
    guardar: guardar,
    equiparSeMelhor: equiparSeMelhor,
    equipar: equipar
  };
})();
