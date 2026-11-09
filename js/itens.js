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
  var PESO_RAR = [0.65, 0.92, 0.99];  // <.65 comum; <.92 incomum;
                             // <.99 raro; senão lendário (1% dos drops)
  var QTD_AFIXOS = [0, 1, 2, 2];  // afixos por raridade (índice rar - 1)
  var LEG_CHEFE = 0.15;   // chance de o drop do chefe virar lendário
  var CHANCE_NEG = 0.3;   // por rolagem de afixo (rar >= 2)
  var MULT_NEG = 1.5;     // magnitude do negativo (o tradeoff compensa)
  var PESO_CLASSE = 0.7;  // chance de afixo positivo sair na chave da classe
  var APR = 0.08;         // +8% por nível de aprimoramento (espelhado em
                          // personagem.js — ele não pode depender daqui)
  var MAX_UP = 8;         // teto de aprimoramentos por item (espelhado lá)

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
  var CORES = { 1: '#c9c2dd', 2: '#8ce08c', 3: '#e8c86a', 4: '#ff9d4d' };

  // Lendários: 2 por tema de mapa (o clamp do tema espelha Mapas.info,
  // que para em 3). Efeito > número (filosofia Last Epoch) — cada um
  // muda uma mecânica com identidade própria; a matemática dos efeitos
  // é `temEfeito/multDano/multOuro/pctVamp` lá embaixo, e os gatilhos
  // comportamentais (2ª vida, ondas renovam, cura fere) moram em
  // batalha.js. Todo lendário rola exatamente 1 neg + 1 pos: o preço.
  var LEGENDARIOS = [
    { id: 'sangue-frio', tema: 1, slot: 'arma', nome: 'Sangue Frio',
      arma: 'espada', bonus: { dano: 8 },
      efeito: 'vampiro', efeitoTxt: 'vampirismo 4%' },
    { id: 'veu-fenix', tema: 1, slot: 'armadura', nome: 'Véu da Fênix',
      bonus: { hp: 24 },
      efeito: 'fenix', efeitoTxt: '2ª vida por onda' },
    { id: 'lamina-espectral', tema: 2, slot: 'arma', nome: 'Lâmina Espectral',
      arma: 'adaga', bonus: { dano: 7, crit: 8 },
      efeito: 'furia', efeitoTxt: 'fúria <30% HP' },
    { id: 'manto-mercador', tema: 2, slot: 'armadura', nome: 'Manto do Mercador',
      bonus: { hp: 20, vel: 6 },
      efeito: 'mercador', efeitoTxt: 'ouro +50%' },
    { id: 'cetro-tempestade', tema: 3, slot: 'arma', nome: 'Cetro da Tempestade',
      arma: 'cajado', bonus: { dano: 6, crit: 10 },
      efeito: 'tempestade', efeitoTxt: 'ondas renovam' },
    { id: 'egide-santificada', tema: 3, slot: 'armadura', nome: 'Égide Santificada',
      bonus: { hp: 26, dano: 2 },
      efeito: 'santificado', efeitoTxt: 'cura fere' }
  ];

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
    // lendário: o efeito é a identidade — entra na linha com ★
    if (item.efeito) d += (d ? ' ' : '') + '★' + efeitoTxt(item.efeito);
    var nome = item.nome || '';
    var corte = (max || 40) - d.length - (d ? 2 : 0);
    if (nome.length > corte) nome = nome.slice(0, Math.max(3, corte - 1)) + '…';
    return nome + (d ? '  ' + d : '');
  }

  function sorteiaRaridade() {
    var r = Math.random();
    if (r < PESO_RAR[0]) return 1;
    if (r < PESO_RAR[1]) return 2;
    if (r < PESO_RAR[2]) return 3;
    return 4;
  }

  // tema do mapa: mesmo clamp de Mapas.info (LISTA com 3 temas)
  function temaDe(mapa) {
    var m = (typeof mapa === 'number' && mapa >= 1 && isFinite(mapa))
      ? Math.floor(mapa) : 1;
    return m > 3 ? 3 : m;
  }

  function sorteiaLendario(mapa) {
    var t = temaDe(mapa);
    var pool = [];
    for (var i = 0; i < LEGENDARIOS.length; i++) {
      if (LEGENDARIOS[i].tema === t) pool.push(LEGENDARIOS[i]);
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function efeitoTxt(id) {
    for (var i = 0; i < LEGENDARIOS.length; i++) {
      if (LEGENDARIOS[i].efeito === id) return LEGENDARIOS[i].efeitoTxt;
    }
    return 'lendário';
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
      // lendário: o 1º afixo é SEMPRE negativo — o preço do poder
      var forcar = rar >= 4 && i === 0;
      var ehNeg = negs < 1 && (forcar || Math.random() < CHANCE_NEG);
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
    var modelo, slot;
    if (rar >= 4) {
      // lendário: modelo autorado do tema do mapa (não vem das listas)
      modelo = sorteiaLendario(mapa);
      slot = modelo.slot;
    } else {
      slot = Math.random() < 0.5 ? 'arma' : 'armadura';
      var fonte = slot === 'arma' ? ARMAS : ARMADURAS;
      var pool = [];
      for (var i = 0; i < fonte.length; i++) {
        if (fonte[i].rar === rar) pool.push(fonte[i]);
      }
      modelo = pool[Math.floor(Math.random() * pool.length)];
    }
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
      slot: slot, rar: rar, bonus: bonus, afixos: afixos,
      base: modelo.nome,   // nome do modelo: recompõe o nome no re-roll
      escala: mult         // mult. de Mapas.forca: faixas de afixo/re-roll
    };
    if (modelo.arma) out.arma = modelo.arma;
    if (modelo.efeito) out.efeito = modelo.efeito;
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
      if (ehChefe) {
        // 15% de o drop do chefe virar lendário; senão, piso rar 2
        rar = Math.random() < LEG_CHEFE ? 4 : (rar < 2 ? 2 : rar);
      }
      out.push(geraItem(rar, mapa, classe));
    }
    return out;
  }

  // ---- economia (Leva B) ----------------------------------------------
  // valor de mercado: soma assinada com piso 1 — todo drop vale algo
  function valor(item) {
    return Math.max(1, pontuar(item)) * 6;
  }
  function precoVenda(item) {           // 25% — vale p/ item bom
    return Math.max(1, Math.round(valor(item) * 0.25));
  }
  function precoSucata(item) {          // piso por raridade/escala — item ruim
    return Math.max(3, Math.round(2 * item.rar * (item.escala || 1)));
  }
  function custoAprim(item) {
    var up = item.up || 0;
    if (up >= MAX_UP) return -1;
    return 25 * (up + 1) * (up + 1);   // convexo: fica caro rápido
  }
  function custoReroll(item) {
    if (!item.afixos || !item.afixos.length) return -1;
    return Math.round(10 * item.rar * (item.escala || 1) *
      (1 + 0.5 * (item.rerolls || 0)));
  }

  // soma efetiva p/ o auto-equip: aprimoramento defende a vaga (senão o
  // próximo drop comeria o investimento em silêncio)
  function pontuarEfet(item) {
    return pontuar(item) * (1 + APR * ((item && item.up) || 0));
  }

  // contagem de economia p/ a aba Stats (Leva 4) — espelho direto em
  // p.stats (normalizaStats já cuida das chaves de saves antigos)
  function conta(p, chave, n) {
    if (!p || !p.stats) return;
    p.stats[chave] = (p.stats[chave] || 0) + (n === undefined ? 1 : n);
  }

  // remoção da bolsa paga ouro; null se o item não está na bolsa
  function vender(p, item) {
    var i = p.bolsa.indexOf(item);
    if (i < 0) return null;
    p.bolsa.splice(i, 1);
    var g = precoVenda(item);
    p.ouro = (p.ouro || 0) + g;
    conta(p, 'vendidos');
    conta(p, 'ouroGanho', g);
    return g;
  }
  function sucatear(p, item) {
    var i = p.bolsa.indexOf(item);
    if (i < 0) return null;
    p.bolsa.splice(i, 1);
    var g = precoSucata(item);
    p.ouro = (p.ouro || 0) + g;
    conta(p, 'sucateados');
    conta(p, 'ouroGanho', g);
    return g;
  }

  function aprimorar(p, item) {
    var c = custoAprim(item);
    if (c < 0 || (p.ouro || 0) < c) return false;
    p.ouro -= c;
    item.up = (item.up || 0) + 1;
    conta(p, 'aprimoramentos');
    conta(p, 'ouroGasto', c);
    return true;
  }

  // nome = prefixo? + base + sufixo? a partir dos afixos atuais
  function montaNome(base, lista) {
    var pre = '', suf = '';
    for (var i = 0; i < lista.length; i++) {
      var af = lista[i];
      if (af.neg) continue;
      if (af.tipo === 'pre') pre = af.nome;
      else suf = af.nome;
    }
    return (pre ? pre + ' ' : '') + base + (suf ? ' ' + suf : '');
  }

  // itens da Leva A não têm `base`: deriva removendo os afixos atuais
  function baseDe(item) {
    var nome = item.nome;
    for (var i = 0; i < item.afixos.length; i++) {
      var af = item.afixos[i];
      if (af.neg) continue;
      if (af.tipo === 'pre') nome = nome.replace(af.nome + ' ', '');
      else nome = nome.replace(' ' + af.nome, '');
    }
    return nome;
  }

  // Re-roll de UM afixo: o negativo se houver (rol novo só positivo —
  // saída de maldição garantida), senão um aleatório (rol comum, pode
  // sair neg: aposta). Respeita teto de 1 neg, tipos pre/suf livres e
  // smart-loot; nome recompõe de `base`.
  function reroll(p, item) {
    var c = custoReroll(item);
    if (c < 0 || (p.ouro || 0) < c) return false;
    var lista = item.afixos;
    var alvo = -1;
    for (var i = 0; i < lista.length; i++) {
      if (lista[i].neg) { alvo = i; break; }
    }
    if (alvo < 0) alvo = Math.floor(Math.random() * lista.length);
    var velho = lista[alvo];
    var saidaDeMaldicao = velho.neg;
    var base = item.base || baseDe(item);   // antes de trocar (fallback)
    var tipos = {}, negs = 0;
    for (var j = 0; j < lista.length; j++) {
      if (j === alvo) continue;
      if (lista[j].neg) negs++;
      else tipos[lista[j].tipo] = true;
    }
    var ehNeg = !saidaDeMaldicao && negs < 1 && Math.random() < CHANCE_NEG;
    var pool = ehNeg ? poolNeg() : poolPos(tipos, p.classe);
    if (!pool.length) return false;
    var novo = pool[Math.floor(Math.random() * pool.length)];
    var v = novo.faixa[0] + Math.random() * (novo.faixa[1] - novo.faixa[0]);
    var escala = item.escala || 1;
    var valorNovo = Math.max(1,
      Math.round(v * escala * (ehNeg ? MULT_NEG : 1)));
    // sai a contribuição antiga, entra a nova
    item.bonus[velho.chave] =
      (item.bonus[velho.chave] || 0) - (velho.neg ? -velho.valor : velho.valor);
    item.bonus[novo.chave] =
      (item.bonus[novo.chave] || 0) + (ehNeg ? -valorNovo : valorNovo);
    lista[alvo] = {
      nome: novo.nome, tipo: ehNeg ? 'neg' : novo.tipo,
      chave: novo.chave, neg: ehNeg, valor: valorNovo
    };
    item.rerolls = (item.rerolls || 0) + 1;
    item.nome = montaNome(base, lista);
    p.ouro -= c;
    conta(p, 'rerolls');
    conta(p, 'ouroGasto', c);
    return true;
  }

  function guardar(p, item) {
    p.bolsa.push(item);
    var pago = 0;
    var sucateados = 0;
    while (p.bolsa.length > BOLSA_MAX) {
      // o mais antigo sai — vira ouro (sucata), nunca lixo silencioso
      pago += precoSucata(p.bolsa.shift());
      sucateados++;
    }
    if (pago) {
      p.ouro = (p.ouro || 0) + pago;
      conta(p, 'sucateados', sucateados);
      conta(p, 'ouroGanho', pago);
    }
    return true;
  }

  // Auto-equip: só troca se for estritamente melhor (soma efetiva
  // assinada — negativo conta contra e aprimoramento segura a vaga);
  // o item equipado volta para a bolsa.
  function equiparSeMelhor(p, item) {
    // slot fixado (checkbox na aba Itens): não troca por melhor — o drop
    // vai pra bolsa como sempre. Troca MANUAL (clique) continua livre.
    if (p.trava && p.trava[item.slot]) return false;
    var atual = p.equip[item.slot];
    if (atual && pontuarEfet(item) <= pontuarEfet(atual)) return false;
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

  // ---- tooltip do item (Leva 3): linhas prontas p/ UI.dica — nome e
  // raridade, bônus por chave (ordem fixa), afixos 1 a 1 (negativo em
  // vermelho), efeito lendário, aprimoramento, deltas vs equipado,
  // venda/sucata e custos de investimento.
  var ROT_RAR = { 1: 'Comum', 2: 'Incomum', 3: 'Raro', 4: 'Lendário' };
  var ROT_CHAVE = { dano: 'dano', hp: 'hp', vel: 'velocidade', crit: 'crítico' };

  function dicas(p, item) {
    if (!item) return [];
    var out = [[item.nome, corRar(item.rar)]];
    var i, k, v, linha = '';
    out.push([(ROT_RAR[item.rar] || 'Comum') + ' · ' +
      (item.slot === 'arma' ? 'arma' : 'armadura'), '#9a90b8']);
    for (i = 0; i < CHAVES.length; i++) {
      k = CHAVES[i];
      v = item.bonus ? item.bonus[k] : 0;
      if (v) linha += ' ' + (v > 0 ? '+' : '') + v + ' ' + (ROT_CHAVE[k] || k);
    }
    if (linha) out.push([linha.trim(), '#f2eef8']);
    var afs = item.afixos || [];
    for (i = 0; i < afs.length; i++) {
      out.push(['✦ ' + afs[i].nome + ': ' + (afs[i].neg ? '-' : '+') +
        afs[i].valor + ' ' + (ROT_CHAVE[afs[i].chave] || afs[i].chave),
        afs[i].neg ? '#ff8a8a' : '#8ce08c']);
    }
    if (item.efeito) {
      var txt = item.efeito;
      for (i = 0; i < LEGENDARIOS.length; i++) {
        if (LEGENDARIOS[i].efeito === item.efeito) txt = LEGENDARIOS[i].efeitoTxt;
      }
      out.push(['★ ' + txt, '#ff9d4d']);
    }
    if (item.up > 0) {
      out.push(['Aprimoramento ' + item.up + '/MAX_UP (+' +
        Math.round(item.up * APR * 100) + '% nos bônus)', '#c9c2dd']);
    }
    var atual = p && p.equip ? p.equip[item.slot] : null;
    var d = deltas(item, atual);
    if (d) out.push(['vs equipado:' + d, '#9a90b8']);
    out.push(['Vende ' + precoVenda(item) + ' · Sucata ' +
      precoSucata(item), '#e8c86a']);
    var ca = custoAprim(item), cr = custoReroll(item);
    out.push(['A+ custa ' + (ca >= 0 ? ca : '—') + ' · R+ custa ' +
      (cr >= 0 ? cr : '—'), '#9a90b8']);
    return out;
  }

  // ---- efeitos lendários: a MATEMÁTICA mora aqui (pura e testável);
  // os gatilhos comportamentais estão em batalha.js (1 hook cada)
  function temEfeito(p, id) {
    if (!p || !p.equip || !id) return false;
    var valido = false;
    for (var j = 0; j < LEGENDARIOS.length; j++) {
      if (LEGENDARIOS[j].efeito === id) { valido = true; break; }
    }
    if (!valido) return false;              // id de save corrompido é inerte
    var lista = [p.equip.arma, p.equip.armadura];
    for (var i = 0; i < lista.length; i++) {
      if (lista[i] && lista[i].efeito === id) return true;
    }
    return false;
  }
  function multDano(p, fracHp) {  // lâmina espectral: fúria abaixo de 30%
    return (temEfeito(p, 'furia') && fracHp < 0.3) ? 1.5 : 1;
  }
  function multOuro(p) {          // manto do mercador
    return temEfeito(p, 'mercador') ? 1.5 : 1;
  }
  function pctVamp(p) {           // sangue frio: 4% do dano vira vida
    return temEfeito(p, 'vampiro') ? 0.04 : 0;
  }

  return {
    ARMAS: ARMAS,
    ARMADURAS: ARMADURAS,
    LEGENDARIOS: LEGENDARIOS,
    temEfeito: temEfeito,
    multDano: multDano,
    multOuro: multOuro,
    pctVamp: pctVamp,
    AFIXOS: AFIXOS,
    AFINS: AFINS,
    QTD_AFIXOS: QTD_AFIXOS,
    APR: APR,
    MAX_UP: MAX_UP,
    BOLSA_MAX: BOLSA_MAX,
    CHANCE: CHANCE,
    corRar: corRar,
    pontuar: pontuar,
    pontuarEfet: pontuarEfet,
    resumo: resumo,
    deltas: deltas,
    linha: linha,
    geraItem: geraItem,
    sorteiaDrop: sorteiaDrop,
    valor: valor,
    dicas: dicas,
    precoVenda: precoVenda,
    precoSucata: precoSucata,
    custoAprim: custoAprim,
    custoReroll: custoReroll,
    aprimorar: aprimorar,
    reroll: reroll,
    vender: vender,
    sucatear: sucatear,
    guardar: guardar,
    equiparSeMelhor: equiparSeMelhor,
    equipar: equipar
  };
})();
