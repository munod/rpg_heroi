// Geração procedural de pixel art.
// Grade de pixels -> canvas pequeno, escalado depois com imageSmoothing desligado.
//
// Herói (spec visual-heroi-arma): as poses são AUTORADAS em texto (faixas de
// linhas de 20 colunas, '.' = vazio) e compostas por partes — corpo, pernas,
// braços, cabelo (5 estilos) e classe (4) —, tudo sob uma única fonte de luz
// top-esquerda. A cor vem da paleta por material, em rampas HSL com hue-shift
// (sombra desloca o matiz pro azul e satura; luz desloca pro amarelo).
var Sprite = (function () {

  // ---- cor ------------------------------------------------------------
  // Escurecimento por multiplicação (legado — monstros/cenário e legenda
  // dos testes continuam usando).
  function shade(hex, f) {
    var n = parseInt(hex.slice(1), 16);
    var r = Math.min(255, Math.max(0, Math.round(((n >> 16) & 255) * f)));
    var g = Math.min(255, Math.max(0, Math.round(((n >> 8) & 255) * f)));
    var b = Math.min(255, Math.max(0, Math.round((n & 255) * f)));
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }

  function rgbDe(hex) {
    var n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  // [matiz 0..360, saturação 0..1, luminosidade 0..1]
  function hslDe(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var l = (max + min) / 2, h = 0, s = 0, d = max - min;
    if (d !== 0) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return [h, s, l];
  }

  function doisHexa(v) {
    var t = Math.round(v * 255);
    if (t < 0) t = 0;
    if (t > 255) t = 255;
    return (t < 16 ? '0' : '') + t.toString(16);
  }

  function hexDe(h, s, l) {
    h = ((h % 360) + 360) % 360;
    s = s < 0 ? 0 : s > 1 ? 1 : s;
    l = l < 0 ? 0 : l > 1 ? 1 : l;
    var c = (1 - Math.abs(2 * l - 1)) * s;
    var x = c * (1 - Math.abs((h / 60) % 2 - 1));
    var m = l - c / 2;
    var r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else { r = c; b = x; }
    return '#' + doisHexa(r + m) + doisHexa(g + m) + doisHexa(b + m);
  }

  // Rampas de 4 tons com hue-shift (Slynyrd nº 1 / nº 6): a sombra anda o
  // matiz pro azul e satura, a luz anda pro amarelo e clareia — sem isso os
  // escuros ficam acinzentados (o problema do `shade` puro).
  function rampa(base) {
    var c = rgbDe(base);
    var t = hslDe(c[0], c[1], c[2]);
    return {
      base: base,
      luz: hexDe(t[0] + 7, t[1] * 0.86 + 0.03, t[2] + 0.15),
      som: hexDe(t[0] - 11, t[1] * 1.12 + 0.04, t[2] - 0.13),
      som2: hexDe(t[0] - 17, t[1] * 1.2 + 0.06, t[2] - 0.25)
    };
  }

  // ---- índices da paleta do herói --------------------------------------
  var V = 0, LINHA = 1;
  var PELE = 2, PELE_L = 3, PELE_S = 4, PELE_S2 = 5;
  var CAB = 6, CAB_L = 7, CAB_S = 8, CAB_S2 = 9;
  var TEC = 10, TEC_L = 11, TEC_S = 12, TEC_S2 = 13;
  var COURO = 14, COURO_L = 15, COURO_S = 16;
  var META = 17, META_L = 18, META_S = 19;
  var OURO = 20, OURO_L = 21, OURO_S = 22;
  var OLHO = 23, PUPILA = 24;
  var MADE = 25, MADE_S = 26;
  var ACC = 27, ACC_L = 28, ACC_S = 29;

  // caractere -> índice (fonte única; a legenda do teste lê daqui)
  var PALETA_TXT = [
    ['.', V], ['#', LINHA],
    ['S', PELE], ['W', PELE_L], ['s', PELE_S], ['x', PELE_S2],
    ['h', CAB], ['i', CAB_L], ['H', CAB_S], ['j', CAB_S2],
    ['c', TEC], ['k', TEC_L], ['C', TEC_S], ['K', TEC_S2],
    ['b', COURO], ['n', COURO_L], ['B', COURO_S],
    ['m', META], ['M', META_L], ['N', META_S],
    ['g', OURO], ['G', OURO_L], ['q', OURO_S],
    ['e', OLHO], ['p', PUPILA],
    ['w', MADE], ['v', MADE_S],
    ['a', ACC], ['A', ACC_L], ['d', ACC_S]
  ];
  var CH = {};
  for (var ic = 0; ic < PALETA_TXT.length; ic++) CH[PALETA_TXT[ic][0]] = PALETA_TXT[ic][1];

  var COR_COURO = '#6b4a2e';
  var COR_METAL = '#a8b8cc';
  var COR_OURO = '#d9a62a';
  var COR_MADEIRA = '#8a5a2e';
  var COR_CONTORNO = '#1b1424';

  // cor do acento da arma por raridade do item equipado (1 = ouro, que
  // preserva o visual/clássico da espada de classe)
  function corArma(rar) {
    if (rar === 2) return '#4fc3ff';
    if (rar === 3) return '#b06bff';
    if (rar === 4) return '#ff5566';
    return COR_OURO;
  }

  // 0 vazio | 1 contorno | 2-5 pele | 6-9 cabelo | 10-13 tecido | 14-16 couro
  // 17-19 metal | 20-22 dourado | 23-24 olho | 25-26 madeira | 27-29 acento
  function heroPalette(look) {
    var pele = rampa(look.skin);
    var cabelo = rampa(look.hair);
    var tecido = rampa(look.cloth);
    var couro = rampa(COR_COURO);
    var metal = rampa(COR_METAL);
    var ouro = rampa(COR_OURO);
    var madeira = rampa(COR_MADEIRA);
    var acento = rampa(corArma(look && look.rar));
    var pal = [];
    pal[V] = null;
    pal[LINHA] = COR_CONTORNO;
    pal[PELE] = pele.base; pal[PELE_L] = pele.luz;
    pal[PELE_S] = pele.som; pal[PELE_S2] = pele.som2;
    pal[CAB] = cabelo.base; pal[CAB_L] = cabelo.luz;
    pal[CAB_S] = cabelo.som; pal[CAB_S2] = cabelo.som2;
    pal[TEC] = tecido.base; pal[TEC_L] = tecido.luz;
    pal[TEC_S] = tecido.som; pal[TEC_S2] = tecido.som2;
    pal[COURO] = couro.base; pal[COURO_L] = couro.luz; pal[COURO_S] = couro.som;
    pal[META] = metal.base; pal[META_L] = metal.luz; pal[META_S] = metal.som;
    pal[OURO] = ouro.base; pal[OURO_L] = ouro.luz; pal[OURO_S] = ouro.som;
    pal[OLHO] = '#ffffff';
    pal[PUPILA] = '#20182a';
    pal[MADE] = madeira.base; pal[MADE_S] = madeira.som;
    pal[ACC] = acento.base; pal[ACC_L] = acento.luz; pal[ACC_S] = acento.som;
    return pal;
  }

  function txtPaleta() {
    var out = [];
    for (var i = 0; i < PALETA_TXT.length; i++) out.push(PALETA_TXT[i][0]);
    return out;
  }

  // ---- primitivas --------------------------------------------------------
  function pintorDireto(g, W, H) {
    return function (x, y, v) {
      x = Math.round(x);
      y = Math.round(y);
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      g[y * W + x] = v;
    };
  }

  function retangulo(pintor, x, y, w, h, v) {
    for (var j = 0; j < h; j++) {
      for (var i = 0; i < w; i++) pintor(x + i, y + j, v);
    }
  }

  function elipse(pintor, cx, cy, rx, ry, v) {
    for (var y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (var x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        var dx = (x + 0.5 - cx) / rx;
        var dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) pintor(x, y, v);
      }
    }
  }

  function linhaPts(x0, y0, x1, y1) {
    var pts = [];
    var dx = x1 - x0, dy = y1 - y0;
    var passos = Math.max(Math.abs(dx), Math.abs(dy));
    if (passos === 0) return [[x0, y0]];
    passos = Math.ceil(passos);
    for (var i = 0; i <= passos; i++) {
      pts.push([Math.round(x0 + dx * i / passos), Math.round(y0 + dy * i / passos)]);
    }
    return pts;
  }

  function linha(pintor, x0, y0, x1, y1, v) {
    var pts = linhaPts(x0, y0, x1, y1);
    for (var i = 0; i < pts.length; i++) pintor(pts[i][0], pts[i][1], v);
  }

  // Contorna tudo que encosta no vazio (borda do sprite e falhas internas).
  // A borda externa do canvas NÃO conta como vazio: a fileira de baixo (botas)
  // precisa manter a cor, senão os pés viram contorno.
  function contorna(g, W, H) {
    var src = Uint8Array.from(g);
    for (var y = 0; y < H; y++) {
      for (var x = 0; x < W; x++) {
        var i = y * W + x;
        if (!src[i]) continue;
        var borda =
          (x > 0 && src[i - 1] === 0) ||
          (x < W - 1 && src[i + 1] === 0) ||
          (y > 0 && src[i - W] === 0) ||
          (y < H - 1 && src[i + W] === 0);
        if (borda) g[i] = LINHA;
      }
    }
  }

  // Pinta de contorno os vizinhos vazios de um pixel (elementos finos, como
  // a arma, ganham contorno sem ter a própria cor substituída).
  function contornaDestaque(g, W, H, destaque) {
    for (var k = 0; k < destaque.length; k++) {
      var i = destaque[k];
      var x = i % W, y = (i / W) | 0;
      if (x > 0 && g[i - 1] === 0) g[i - 1] = LINHA;
      if (x < W - 1 && g[i + 1] === 0) g[i + 1] = LINHA;
      if (y > 0 && g[i - W] === 0) g[i - W] = LINHA;
      if (y < H - 1 && g[i + W] === 0) g[i + W] = LINHA;
    }
  }

  function paraCanvas(g, W, H, palette) {
    var cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    var ctx = cv.getContext('2d');
    for (var y = 0; y < H; y++) {
      for (var x = 0; x < W; x++) {
        var c = palette[g[y * W + x]];
        if (!c) continue;
        ctx.fillStyle = c;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    return { canvas: cv, w: W, h: H };
  }

  // ---- autoria em texto ---------------------------------------------------
  // Desenha uma faixa de linhas (todas com W colunas) no grid, deslocada em
  // dy (o "bob" do frame). '.' = vazio = não toca no que já estava.
  function desenhaFaixa(g, W, H, linhas, y0, dy, nome, tabela) {
    var tab = tabela || CH;
    for (var i = 0; i < linhas.length; i++) {
      var linha = linhas[i];
      if (linha.length !== W) {
        throw new Error('sprite ' + nome + ': linha ' + i + ' com ' +
          linha.length + ' colunas (esperado ' + W + ')');
      }
      var y = y0 + i + dy;
      if (y < 0 || y >= H) continue;
      for (var x = 0; x < W; x++) {
        var ch = linha.charAt(x);
        if (ch === '.') continue;
        var v = tab[ch];
        if (v === undefined) {
          throw new Error('sprite ' + nome + ': caractere desconhecido "' + ch + '"');
        }
        g[y * W + x] = v;
      }
    }
  }

  // ---- herói: partes autoradas -------------------------------------------
  // Corpo (cabeça, rosto, pescoço, torso, cinto) — sem braços (vêm à parte).
  // A borda vira contorno sozinha: x4/x11 da face e o pescoço são silhueta.
  var CORPO = [
    '....................',
    '.....SSSSSS.........',
    '....SSSSSSSS........',
    '....SSSSShSS........',   // sobrancelha em (9,3)
    '....SSSSSepS........',   // olho branco (9,4) / pupila (10,4)
    '....ssSSSSSs........',   // orelha (5,5) + nariz (11,5)
    '.....SSSSsS.........',   // boca (9,6)
    '......ssss..........',   // pescoço
    '....ccccccccc.......',   // ombros
    '.....ccccccc........',
    '.....kcccccc........',   // peito pega a luz da esquerda
    '.....ccccccc........',
    '.....bbbgbbb........',   // cinto + fivela dourada (8,12)
    '.....CCCCCCC........'    // quadril na sombra
  ];

  var PERNAS = {
    // parado (e nos frames de ataque): pernas juntas, linha de contorno no meio
    parado: [
      '.....CCK#ccC........',
      '.....CCK#ccC........',
      '.....KKK#CCC........',
      '.....KKK#CCC........',
      '.....bbb#bbb........',
      '.....BBB#BBB........'
    ],
    // passo aberto (contato): traseira recua, dianteira avança
    A: [
      '....CCC...ccc.......',
      '....CCC...ccc.......',
      '....KKK...CCC.......',
      '....KKK...CCC.......',
      '....bbb...bbb.......',
      '....BBB...BBB.......'
    ],
    // passo aberto invertido: a perna da frente está atrás (troca de luz)
    B: [
      '....ccc...CCC.......',
      '....ccc...CCC.......',
      '....CCC...KKK.......',
      '....CCC...KKK.......',
      '....bbb...bbb.......',
      '....BBB...BBB.......'
    ]
  };

  // Braço traseiro (fileira 9..12) — some atrás de cabelo longo/capa.
  var BRACO_TRAS = {
    baixo: [
      '...CC...............',
      '...CC...............',
      '...CC...............',
      '...CC...............'
    ],
    tras: [
      '...CC...............',
      '..CC................',
      '..CC................',
      '..CC................'
    ],
    frente: [
      '...CC...............',
      '....CK..............',
      '....CK..............',
      '....CK..............'
    ]
  };

  // Braço dianteiro (fileira 8..13) — o da frente segura a arma.
  var BRACO_FRENTE = {
    baixo: [
      '....................',
      '............CC......',
      '............CC......',
      '............CC......',
      '............CC......',
      '....................'
    ],
    wind: [
      '............C.......',
      '...........C........',
      '..........C.........',
      '....................',
      '....................',
      '....................'
    ],
    slash: [
      '....................',
      '....................',
      '...........ccc......',
      '..........CCCC......',
      '....................',
      '....................'
    ],
    recover: [
      '....................',
      '....................',
      '..........C.........',
      '...........C........',
      '............C.......',
      '............C.......'
    ]
  };

  // Cabelos (fileira 0..) — âncora na cabeça, acompanha o bob. A franja
  // cobre x4..x8 e deixa x9/x10 livres: olho e pupila sobrevivem ao bob=1.
  var CABELOS = {
    curto: [
      '.....iiiiii.........',
      '....ihhhhhhh........',
      '....hhhhhhhH........',
      '....hhhhh...........',
      '....H...............',
      '....H...............'
    ],
    longo: [
      '.....iiiiii.........',
      '....ihhhhhhh........',
      '....hhhhhhhH........',
      '...hhhhhh...........',
      '..hhH...............',
      '..hhH...............',
      '..hhH...............',
      '..hHH...............',
      '..HH................',
      '..H.................'
    ],
    rabo: [
      '.....iiiiii.........',
      '....ihhhhhhh........',
      '....hhhhhhhH........',
      '....hhhhh...........',
      '....H...............',
      '.hHH................',
      '.hHH................',
      '..HH................'
    ],
    moicana: [
      '......iii...........',
      '......hhh...........',
      '.....hhhhH..........',
      '......H.H...........'
    ],
    careca: [
      '....................',
      '....................',
      '....bbbbbbbb........',
      '...bBbbbbbbb........'
    ]
  };

  // Classes (fileira 5..13) — faixa desenhada DEPOIS do braço traseiro
  // (capa/hood cobrem) e ANTES do dianteiro (nunca invade x12..13).
  var CLASSES = {
    guerreiro: [
      '....................',
      '....................',
      '....................',
      '.....mMcccmN........',   // ombreiras
      '.....mmcccmN........',
      '......mMmN..........',   // peitoral
      '......mmN...........',
      '....................',
      '....................'
    ],
    mago: [
      '....................',
      '..KCC...............',   // capuz atrás do pescoço (fileira 6)
      '..KCC...............',
      '..KCC.ggggg.........',   // capuz + gola dourada
      '........g...........',   // ornamento
      '........g...........',
      '.......gg...........',
      '....................',
      '....................'
    ],
    ladino: [
      '....................',
      '....................',
      '....................',
      '....BbbbbbbB........',   // colete
      '....BnbbbbbB........',
      '....BnbbbbbB........',
      '....BbbbbbbB........',
      '.......n............',   // fivela do cinto
      '....................'
    ],
    clerigo: [
      '....................',
      '....................',
      '....................',
      '..CC.ggggg..........',   // capa fina no ombro + gola dourada
      '.CCCK.g.............',   // capa em sombra (atrás do corpo) + estola
      '.CCCK.g.............',
      '.CCCK.g.............',
      '.CCCK.G.............',
      '.CCCK...............'
    ]
  };

  // Frames: bob desloca cabeça/torso/cabelo/classe; braços acompanham fora do
  // ataque (mesma lógica do código antigo). mao = punho, tipa = ponta da arma.
  function montaFrame(anim, frame) {
    if (anim === 'walk') {
      var w = [
        { pernas: 'A', braT: 'tras', bob: 0 },
        { pernas: 'parado', braT: 'baixo', bob: 1 },
        { pernas: 'B', braT: 'frente', bob: 0 },
        { pernas: 'parado', braT: 'baixo', bob: 1 }
      ][frame] || { pernas: 'parado', braT: 'baixo', bob: 0 };
      w.braF = 'baixo';
      w.mao = [12, 13 + w.bob];
      w.tipa = [17, 18];
      return w;
    }
    if (anim === 'attack') {
      var a = [
        { braF: 'wind', bob: 0, mao: [12, 8], tipa: [17, 3] },
        { braF: 'slash', bob: 1, mao: [14, 11], tipa: [19, 11] },
        { braF: 'recover', bob: 0, mao: [13, 13], tipa: [18, 16] }
      ][frame] || { braF: 'slash', bob: 1, mao: [14, 11], tipa: [19, 11] };
      a.pernas = 'parado';
      a.braT = 'baixo';
      return a;
    }
    var bob = frame % 2;
    return {
      pernas: 'parado', braT: 'baixo', braF: 'baixo', bob: bob,
      mao: [12, 13 + bob], tipa: [17, 18]
    };
  }

  // ---- armas ------------------------------------------------------------
  // Desenha a arma a partir do punho (hx, hy) em direção à ponta (tx, ty),
  // com largura: cabo, guarda perpendicular, lâmina de 2px (fio claro +
  // corpo) e ponta. `q` é a perpendicular apontando pra cima (luz de cima).
  function armaDesenhar(pintor, type, hx, hy, tx, ty) {
    var dx = tx - hx, dy = ty - hy;
    var d = Math.sqrt(dx * dx + dy * dy) || 1;
    var ux = dx / d, uy = dy / d;
    // perpendicular apontando pra cima (fonte de luz no topo-esquerda)
    var qx = -uy, qy = ux;
    if (qy > 0 || (qy === 0 && qx > 0)) { qx = -qx; qy = -qy; }
    // largura em passo INTEIRO: q arredondado em diagonal pula a diagonal
    // anti e deixa furo no meio do metal (o contorno pintaria de escuro)
    var ox = 0, oy = 0;
    if (Math.abs(qx) >= Math.abs(qy)) ox = qx >= 0 ? 1 : -1;
    else oy = qy >= 0 ? 1 : -1;

    // P = ao longo de q (float) — serve pras linhas (guarda)
    function P(k, o) {
      return [Math.round(hx + ux * k + qx * o), Math.round(hy + uy * k + qy * o)];
    }
    // W = ao longo do inteiro (ox, oy) — sólido, serve pras larguras
    function W(k, l) {
      return [Math.round(hx + ux * k + ox * l), Math.round(hy + uy * k + oy * l)];
    }
    function pintaP(k, o, v) {
      var p = P(k, o);
      pintor(p[0], p[1], v);
    }
    function pintaW(k, l, v) {
      var p = W(k, l);
      pintor(p[0], p[1], v);
    }

    if (type === 'adaga') d = Math.max(4, d - 1.5);   // lâmina curta

    if (type === 'cajado') {
      var kCabo = Math.max(1, Math.floor(d - 2));
      for (var kc = 0; kc <= kCabo; kc++) {
        pintaW(kc, 0, MADE);
        pintaW(kc, -1, MADE_S);
      }
      // cristal na ponta: 2 fileiras × 3 = gema sólida
      var kg0 = Math.max(2, kCabo + 1);
      for (var kg = kg0; kg <= Math.ceil(d); kg++) {
        pintaW(kg, 1, ACC_L);
        pintaW(kg, 0, ACC);
        pintaW(kg, -1, ACC_S);
      }
      pintaW(Math.ceil(d), 1, ACC_L);
      return;
    }

    if (type === 'martelo') {
      for (var km = 0; km <= Math.min(2, d - 1); km++) {
        pintaW(km, 0, MADE);
        pintaW(km, -1, MADE_S);
      }
      // cabeça: bloco perpendicular fixo em k=3..5, com faixa do acento
      // (a raridade do item aparece em TODA arma, não só na guarda)
      for (var a = 3; a <= 5; a++) {
        for (var o = -2; o <= 2; o++) {
          var v = META;
          if (o === 2) v = META_L;
          else if (o === -2) v = META_S;
          if (a === 5 && o >= 1) v = META_L;      // face de impacto na luz
          if (a === 3 && o <= -1) v = META_S;
          if (a === 4) v = o === 2 ? ACC_L : (o <= -1 ? ACC_S : ACC);
          pintaW(a, o, v);
        }
      }
      pintaW(5, 2, META_L);
      return;
    }

    // espada (e adaga): cabo, lâmina de 2px e guarda por ÚLTIMO (o ângulo
    // da lâmina pode invadir a guarda — a cruz tem que ficar completa)
    var guardaO = type === 'adaga' ? 1 : 2;
    for (var kc2 = 0; kc2 <= 1; kc2++) {
      pintaW(kc2, 0, COURO);
      pintaW(kc2, -1, COURO_S);
    }
    var fim = Math.max(3, d);
    for (var kb = 3; kb <= fim; kb++) {
      pintaW(kb, 0, META);
      pintaW(kb, 1, META_L);      // fio de cima pega a luz
    }
    pintaW(Math.round(fim), 0, META_L);
    pintaW(Math.round(fim), 1, META_L);
    for (var kgz = -guardaO; kgz <= guardaO; kgz++) {
      pintaP(2, kgz, kgz < 0 ? ACC_S : ACC);
    }
  }

  // ---- herói -------------------------------------------------------------
  // Corpo centrado em x=8, pés em y=19/20. Grade sempre 20 de largura: as
  // colunas extras à direita dão espaço para a arma no golpe.
  function heroGrid(look, anim, frame) {
    var W = 20, H = 20;
    var g = new Uint8Array(W * H);
    var pal = heroPalette(look);
    var fr = montaFrame(anim, frame);
    var bob = fr.bob || 0;
    var braB = (anim === 'attack') ? 0 : bob;

    desenhaFaixa(g, W, H, CORPO, 0, bob, 'corpo');
    desenhaFaixa(g, W, H, PERNAS[fr.pernas] || PERNAS.parado, 14, 0, 'pernas');
    desenhaFaixa(g, W, H, BRACO_TRAS[fr.braT] || BRACO_TRAS.baixo, 9, braB, 'braco traseiro');
    desenhaFaixa(g, W, H, CABELOS[look.estilo] || CABELOS.curto, 0, bob, 'cabelo');
    desenhaFaixa(g, W, H, CLASSES[look.classe] || CLASSES.guerreiro, 5, bob, 'classe');
    desenhaFaixa(g, W, H, BRACO_FRENTE[fr.braF] || BRACO_FRENTE.baixo, 8, braB, 'braco dianteiro');

    // contorno do corpo
    contorna(g, W, H);

    // --- por cima do contorno: mão e arma (contorno próprio dos destacados)
    var destaque = [];
    function pinta(x, y, v) {
      x = Math.round(x);
      y = Math.round(y);
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      var i = y * W + x;
      g[i] = v;
      destaque.push(i);
    }

    var arma = look.weapon || 'espada';
    armaDesenhar(pinta, arma, fr.mao[0], fr.mao[1], fr.tipa[0], fr.tipa[1]);
    pinta(fr.mao[0], fr.mao[1], PELE);            // punho por cima do cabo
    pinta(fr.mao[0], fr.mao[1] + 1, PELE_S);

    contornaDestaque(g, W, H, destaque);

    return { grid: g, W: W, H: H, palette: pal };
  }

  function heroCanvas(look, anim, frame) {
    var r = heroGrid(look, anim, frame);
    return paraCanvas(r.grid, r.W, r.H, r.palette);
  }

  // ---- ícones de item (spec icones-itens) -------------------------------
  // 16×16 na aba Itens, desenhados em ESCALA NATIVA (sem reamostrar).
  // A cor de acento (raridade) vem como HEX de fora — este módulo não
  // pode depender de itens.js (mesma regra do personagem.js).
  var PALETA_ICONE = [
    ['.', 0], ['#', 1], ['m', 2], ['M', 3], ['N', 4],   // metal
    ['w', 5], ['v', 6],                                  // madeira
    ['b', 7], ['B', 8],                                  // couro
    ['a', 9], ['A', 10], ['d', 11]                       // acento (raridade)
  ];
  var CH_ICONE = {};
  for (var ii = 0; ii < PALETA_ICONE.length; ii++) {
    CH_ICONE[PALETA_ICONE[ii][0]] = PALETA_ICONE[ii][1];
  }

  var ICONES = {
    // espada: lâmina de 3px, guarda larga, cabo e pomo
    espada: [
      '................',
      '.......Mm.......',
      '......MmN.......',
      '......MmN.......',
      '......MmN.......',
      '......MmN.......',
      '......MmN.......',
      '......MmN.......',
      '......MmN.......',
      '......MmN.......',
      '....Aaaaaad.....',
      '.......bB.......',
      '.......bB.......',
      '.......bB.......',
      '.......aa.......',
      '................'
    ],
    // adaga: lâmina curta e guarda estreita
    adaga: [
      '................',
      '................',
      '................',
      '................',
      '.......Mm.......',
      '......MmN.......',
      '......MmN.......',
      '......MmN.......',
      '......MmN.......',
      '......MmN.......',
      '.....Aaaad......',
      '.......bB.......',
      '.......bB.......',
      '.......bB.......',
      '.......aa.......',
      '................'
    ],
    // cajado: cristal em cima, anel e cabo de madeira
    cajado: [
      '................',
      '......AAAA......',
      '......Aaad......',
      '.......dd.......',
      '......aaaa......',
      '.......wv.......',
      '.......wv.......',
      '.......wv.......',
      '.......wv.......',
      '.......wv.......',
      '.......wv.......',
      '.......wv.......',
      '.......wv.......',
      '.......wv.......',
      '.......vv.......',
      '................'
    ],
    // martelo: cabeça com faixa do acento e cabo
    martelo: [
      '................',
      '................',
      '.....MMMMMM.....',
      '....mmmmmmmm....',
      '....aaaaaaaa....',
      '....NNNNNNNN....',
      '.......wv.......',
      '.......wv.......',
      '.......wv.......',
      '.......wv.......',
      '.......wv.......',
      '.......wv.......',
      '.......wv.......',
      '.......wv.......',
      '.......aa.......',
      '................'
    ],
    // armadura: peitoral (ombros largos, entalhe do pescoço, faixa do
    // acento e cintura afunilada — sem isso virava "copo")
    armadura: [
      '................',
      '................',
      '................',
      '...MMmm##mmNN...',
      '...mMmmmmmmNN...',
      '....mMMmmmmN....',
      '....mmmmmmmm....',
      '....maaaaadN....',
      '....mmmmmmmm....',
      '....mmmmmmmm....',
      '....mmmmmmmm....',
      '.....mmmmmm.....',
      '.....NNNNNN.....',
      '................',
      '................',
      '................'
    ]
  };

  function iconePaleta(corAcento) {
    var met = rampa(COR_METAL);
    var mad = rampa(COR_MADEIRA);
    var cou = rampa(COR_COURO);
    var acc = rampa(corAcento || COR_OURO);
    return [null, COR_CONTORNO, met.base, met.luz, met.som,
      mad.base, mad.som, cou.base, cou.som,
      acc.base, acc.luz, acc.som];
  }

  function iconeCanvas(tipo, corAcento) {
    var W = 16, H = 16;
    var g = new Uint8Array(W * H);
    desenhaFaixa(g, W, H, ICONES[tipo] || ICONES.armadura, 0, 0,
      'icone ' + tipo, CH_ICONE);
    // contorno só POR FORA: rodar contorna() aqui comeria a lâmina de
    // 2-3px (mesma pegadinha das asas do morcego)
    var destaque = [];
    for (var i = 0; i < g.length; i++) if (g[i]) destaque.push(i);
    contornaDestaque(g, W, H, destaque);
    return paraCanvas(g, W, H, iconePaleta(corAcento));
  }

  // ---- inimigos ----------------------------------------------------------
  // 0 vazio | 1 contorno | 2 corpo | 3 corpo sombra | 4 corpo luz |
  // 5 olho branco | 6 pupila | 7 detalhe | 8 detalhe luz
  // Mesma fonte de luz do herói (topo-esquerda) e mesmas rampas; índices
  // 0-6 iguais aos de sempre — `chave` (espécie) só ACRESCENTA desenho.
  var M_CORPO = 2, M_SOM = 3, M_LUZ = 4, M_OLHO = 5, M_PUPILA = 6,
    M_DET = 7, M_DET_L = 8;

  // cor do detalhe por espécie: o bicho fica reconhecível na arena sem
  // depender só do hex do corpo (10 espécies em 3 formas)
  var DETALHE_ESPECIE = {
    boss: '#e8c86a',          // coroa
    acougueiro: '#ffd9b0',    // mandíbula
    gatuno: '#231d30',        // máscara de ladrão
    regenerador: '#8ce07a',   // broto
    drenador: '#e6d2ff',      // presas
    visgo: '#d7c6ff',         // brilho viscoso
    atirador: '#e3ecf5'       // chifres
  };

  function monstroPaleta(cor, chave) {
    var r = rampa(cor);
    var d = rampa(DETALHE_ESPECIE[chave] || cor);
    return [null, COR_CONTORNO, r.base, r.som, r.luz,
      '#ffffff', '#20182a', d.base, d.luz];
  }

  // pixel que PODE saltar da silhueta (coroa, broto, chifre) — ganha
  // contorno próprio no fim, como a arma do herói
  function pintorDestaque(g, W, H, destaque) {
    return function (x, y, v) {
      x = Math.round(x);
      y = Math.round(y);
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      var i = y * W + x;
      g[i] = v;
      destaque.push(i);
    };
  }

  // Rosto + detalhe da espécie (por cima do contorno, como o do herói).
  function rostoSlime(px, pd, chave, olhoY, bocaY, topo) {
    // máscara do gatuno ANTES dos olhos (a banda fica atrás das pupulas)
    if (chave === 'gatuno') {
      for (var xm = 3; xm <= 11; xm++) px(xm, olhoY, M_DET);
      px(3, olhoY + 1, M_DET);
      px(11, olhoY + 1, M_DET);
    }
    // olhos
    px(4, olhoY, M_OLHO);
    px(5, olhoY, M_PUPILA);
    px(9, olhoY, M_OLHO);
    px(10, olhoY, M_PUPILA);
    // boca (2px; visgo torce, acougueiro abre)
    px(6, bocaY, M_PUPILA);
    px(7, bocaY, M_PUPILA);
    if (chave === 'visgo') px(5, bocaY, M_PUPILA);
    if (chave === 'acougueiro') px(8, bocaY, M_PUPILA);
    // presas
    if (chave === 'acougueiro') {
      px(5, bocaY + 1, M_OLHO);
      px(9, bocaY + 1, M_OLHO);
    }
    if (chave === 'drenador') {
      px(5, bocaY + 1, M_DET_L);
      px(9, bocaY + 1, M_DET_L);
    }
    // --- detalhes fora da silhueta (pd = destaque) ---
    if (chave === 'boss') {                 // coroa de 3 pontas
      pd(5, topo - 1, M_DET);
      pd(7, topo - 2, M_DET_L);
      pd(9, topo - 1, M_DET);
      pd(7, topo - 1, M_DET);
    }
    if (chave === 'regenerador') {          // broto
      pd(7, topo - 1, M_DET);
      pd(6, topo - 2, M_DET_L);
      pd(8, topo - 2, M_DET_L);
    }
    if (chave === 'visgo') {                // brilho de viscosidade
      px(9, olhoY + 2, M_DET_L);
      px(10, olhoY + 3, M_DET_L);
    }
  }

  function slimeCanvas(cor, frame, chave) {
    var W = 14, H = 12;
    var g = new Uint8Array(W * H);
    var pal = monstroPaleta(cor, chave);
    var px = pintorDireto(g, W, H);
    var destaque = [];
    var pd = pintorDestaque(g, W, H, destaque);

    var sq = frame === 1;
    var cy = sq ? 7.6 : 7;
    var rx = sq ? 6.5 : 5.8;
    var ry = sq ? 3.6 : 4.4;

    elipse(px, 7, cy, rx, ry, M_CORPO);
    elipse(px, 5, cy - 1.6, 2, 1.2, M_LUZ);
    elipse(px, 7, cy + ry - 1.3, rx - 1, 1.2, M_SOM);
    contorna(g, W, H);

    rostoSlime(px, pd, chave, Math.round(cy - 1), Math.round(cy + 1),
      Math.round(cy - ry));
    contornaDestaque(g, W, H, destaque);

    return paraCanvas(g, W, H, pal);
  }

  // Morcego: corpo em pé, asas para cima (frame1) ou abertas (frame0).
  function morcegoCanvas(cor, frame, chave) {
    var W = 14, H = 12;
    var g = new Uint8Array(W * H);
    var pal = monstroPaleta(cor, chave);
    var px = pintorDireto(g, W, H);
    var destaque = [];
    var pd = pintorDestaque(g, W, H, destaque);

    var asaCima = frame === 1;
    // corpo
    elipse(px, 7, 7, 2.2, 2.6, M_CORPO);
    elipse(px, 7, 9.6, 1.6, 1.4, M_SOM);
    contorna(g, W, H);

    // orelhas e asas DEPOIS do contorno: são partes de 1-2px e, se
    // entrassem antes, virariam todas contorno (bicho virava cruz preta)
    pd(5, 3, M_CORPO);
    pd(8, 3, M_CORPO);
    if (asaCima) {
      retangulo(pd, 1, 3, 4, 1, M_LUZ);
      retangulo(pd, 1, 4, 4, 1, M_CORPO);
      retangulo(pd, 1, 5, 3, 1, M_SOM);
      retangulo(pd, 9, 3, 4, 1, M_LUZ);
      retangulo(pd, 9, 4, 4, 1, M_CORPO);
      retangulo(pd, 10, 5, 3, 1, M_SOM);
    } else {
      retangulo(pd, 1, 6, 4, 1, M_LUZ);
      retangulo(pd, 1, 7, 4, 1, M_CORPO);
      retangulo(pd, 2, 8, 3, 1, M_SOM);
      retangulo(pd, 9, 6, 4, 1, M_LUZ);
      retangulo(pd, 9, 7, 4, 1, M_CORPO);
      retangulo(pd, 9, 8, 3, 1, M_SOM);
    }

    // rosto por cima do contorno
    px(6, 6, M_OLHO); px(8, 6, M_OLHO);      // olhos
    px(6, 7, M_PUPILA); px(8, 7, M_PUPILA);  // pupilas
    px(7, 9, M_OLHO);                        // focinho
    // chifres do atirador (fora da silhueta)
    if (chave === 'atirador') {
      pd(5, 2, M_DET_L);
      pd(8, 2, M_DET_L);
      pd(5, 1, M_DET);
      pd(8, 1, M_DET);
    }
    contornaDestaque(g, W, H, destaque);
    return paraCanvas(g, W, H, pal);
  }

  // Aranha: abdômen à esquerda, cabeça à direita, 8 pernas.
  function aranhaCanvas(cor, frame, chave) {
    var W = 14, H = 12;
    var g = new Uint8Array(W * H);
    var pal = monstroPaleta(cor, chave);
    var px = pintorDireto(g, W, H);
    var destaque = [];
    var pd = pintorDestaque(g, W, H, destaque);

    var sobe = frame === 1;
    // abdômen + cabeça
    elipse(px, 4.5, 6, 3, 2.6, M_CORPO);
    elipse(px, 4.5, 6, 1.6, 1.4, M_SOM);
    elipse(px, 9.5, 6.5, 2, 1.8, M_CORPO);
    contorna(g, W, H);

    // pernas DEPOIS do contorno (1px: antes virariam todas contorno);
    // as de cima pegam a luz, as de baixo ficam na sombra
    var d = sobe ? -1 : 0;
    linha(pd, 7, 5, 10, 2 + d, M_CORPO);
    linha(pd, 6, 5, 8, 1 + d, M_CORPO);
    linha(pd, 5, 4, 6, 1 + d, M_LUZ);
    linha(pd, 4, 4, 3, 1 + d, M_SOM);
    linha(pd, 7, 8, 10, 10 - d, M_SOM);
    linha(pd, 6, 8, 8, 11 - d, M_SOM);
    linha(pd, 5, 8, 5, 11 - d, M_CORPO);
    linha(pd, 3, 8, 2, 10 - d, M_SOM);

    // olhos na cabeça, por cima do contorno
    px(10, 6, M_OLHO); px(11, 6, M_PUPILA);
    px(10, 7, M_PUPILA);
    // listra no abdômen (a espécie inteira tem padrão)
    if (chave) {
      px(3, 5, M_DET);
      px(4, 5, M_DET_L);
      px(5, 5, M_DET);
      px(4, 7, M_DET);
    }
    contornaDestaque(g, W, H, destaque);
    return paraCanvas(g, W, H, pal);
  }

  // ---- cenário -----------------------------------------------------------
  // 0 vazio | 1 contorno | 2 folha base | 3 folha sombra | 4 folha luz |
  // 5 folha sombra2 | 6 tronco base | 7 tronco sombra | 8 tronco luz
  function treeCanvas() {
    var W = 20, H = 26;
    var g = new Uint8Array(W * H);
    var folha = rampa('#2f6a3c');
    var casca = rampa('#6b4a2e');
    var pal = [null, COR_CONTORNO, folha.base, folha.som, folha.luz,
      folha.som2, casca.base, casca.som, casca.luz];
    var px = pintorDireto(g, W, H);
    var F_BASE = 2, F_SOM = 3, F_LUZ = 4, F_SOM2 = 5;
    var T_BASE = 6, T_SOM = 7, T_LUZ = 8;

    // copa: corpo + bojos na borda (silhueta de folha, não círculo) +
    // ilhota iluminada no alto-esquerdo (fonte única)
    elipse(px, 10, 8, 7.5, 6.5, F_BASE);
    elipse(px, 3.5, 10, 3, 2.6, F_BASE);
    elipse(px, 16.5, 9, 3, 2.6, F_BASE);
    elipse(px, 10, 3, 4, 2.6, F_BASE);
    elipse(px, 6.5, 5, 4, 3, F_LUZ);
    elipse(px, 4.5, 4, 2.4, 1.6, F_LUZ);
    // sombra embaixo da copa (a árvore "pesa" no chão)
    elipse(px, 10, 13.5, 7, 2.6, F_SOM);
    elipse(px, 6, 12, 3, 1.6, F_SOM);
    elipse(px, 10, 14.6, 4, 1.6, F_SOM2);
    // tronco com lado claro (esquerda) e lado escuro (direita)
    retangulo(px, 8, 16, 4, 9, T_BASE);
    retangulo(px, 8, 17, 1, 7, T_LUZ);
    retangulo(px, 11, 17, 1, 7, T_SOM);
    // base enraizada
    retangulo(px, 7, 23, 6, 2, T_BASE);
    retangulo(px, 11, 23, 2, 2, T_SOM);
    contorna(g, W, H);
    // rachadura + raiz por cima do contorno
    retangulo(px, 9, 18, 1, 6, T_SOM);
    px(7, 24, T_SOM);
    return paraCanvas(g, W, H, pal);
  }

  // 0 vazio | 1 contorno | 2 pedra base | 3 pedra luz | 4 pedra sombra |
  // 5 pedra sombra2
  function rockCanvas() {
    var W = 14, H = 11;
    var g = new Uint8Array(W * H);
    var r = rampa('#7a7a86');
    var pal = [null, COR_CONTORNO, r.base, r.luz, r.som, r.som2];
    var px = pintorDireto(g, W, H);

    // silhueta facetada (pedra não é elipse): linhas com cantos cortados
    var forma = [
      [3, 5, 9], [4, 3, 11], [5, 2, 12], [6, 1, 12],
      [7, 1, 12], [8, 2, 12], [9, 3, 11]
    ];
    for (var i = 0; i < forma.length; i++) {
      retangulo(px, forma[i][1], forma[i][0],
        forma[i][2] - forma[i][1] + 1, 1, 2);
    }
    // face superior acesa: só o "cap" (topo + canto esquerdo)
    retangulo(px, 5, 3, 5, 1, 3);
    retangulo(px, 3, 4, 4, 1, 3);
    // sombra embaixo + base assentando no chão
    retangulo(px, 2, 8, 11, 1, 4);
    retangulo(px, 3, 9, 9, 1, 4);
    retangulo(px, 5, 9, 5, 1, 5);
    contorna(g, W, H);
    // fenda curta (interior — não passa pelo contorno)
    linha(px, 8, 5, 9, 7, 5);
    return paraCanvas(g, W, H, pal);
  }

  return {
    shade: shade,
    rampa: rampa,
    cores: {
      contorno: COR_CONTORNO, couro: COR_COURO, metal: COR_METAL,
      ouro: COR_OURO, madeira: COR_MADEIRA
    },
    heroPaleta: heroPalette,
    txtPaleta: txtPaleta,
    heroCanvas: heroCanvas,
    iconeCanvas: iconeCanvas,
    slimeCanvas: slimeCanvas,
    morcegoCanvas: morcegoCanvas,
    aranhaCanvas: aranhaCanvas,
    treeCanvas: treeCanvas,
    rockCanvas: rockCanvas
  };
})();
