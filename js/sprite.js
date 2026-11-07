// Geração procedural de pixel art.
// Grade de pixels -> canvas pequeno, escalado depois com imageSmoothing desligado.
var Sprite = (function () {

  function shade(hex, f) {
    var n = parseInt(hex.slice(1), 16);
    var r = Math.min(255, Math.max(0, Math.round(((n >> 16) & 255) * f)));
    var g = Math.min(255, Math.max(0, Math.round(((n >> 8) & 255) * f)));
    var b = Math.min(255, Math.max(0, Math.round((n & 255) * f)));
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }

  // ---- paleta do herói -------------------------------------------------
  // 0 vazio | 1 contorno | 2 pele | 3 pele sombra | 4 cabelo | 5 cabelo sombra
  // 6 roupa | 7 roupa sombra | 8 detalhe (cinto/bota) | 9 metal | 10 metal sombra
  // 11 madeira | 12 olho branco | 13 pupila | 14 dourado
  function heroPalette(look) {
    return [
      null,
      '#1b1424',
      look.skin,
      shade(look.skin, 0.76),
      look.hair,
      shade(look.hair, 0.70),
      look.cloth,
      shade(look.cloth, 0.72),
      shade(look.cloth, 0.45),
      '#a8b8cc',
      '#78889c',
      '#8a5a2e',
      '#ffffff',
      '#20182a',
      '#d9a62a'
    ];
  }

  // ---- primitivas --------------------------------------------------------
  // Todas recebem um "pintor" (x, y, valor) pra poder registrar os pixels
  // desenhados (usado pelo contorno dos elementos finos).

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
        if (borda) g[i] = 1;
      }
    }
  }

  // Pinta de contorno os vizinhos vazios de um pixel (elementos finos, como
  // a arma, ganham contorno sem ter a própria cor substituída).
  function contornaDestaque(g, W, H, destaque) {
    for (var k = 0; k < destaque.length; k++) {
      var i = destaque[k];
      var x = i % W, y = (i / W) | 0;
      if (x > 0 && g[i - 1] === 0) g[i - 1] = 1;
      if (x < W - 1 && g[i + 1] === 0) g[i + 1] = 1;
      if (y > 0 && g[i - W] === 0) g[i - W] = 1;
      if (y < H - 1 && g[i + W] === 0) g[i + W] = 1;
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

  // ---- armas ------------------------------------------------------------
  // Desenha a arma a partir da mão (hx, hy) em direção à ponta (tx, ty).
  function armaDesenhar(pintor, type, hx, hy, tx, ty) {
    var dx = tx - hx, dy = ty - hy;
    var d = Math.sqrt(dx * dx + dy * dy) || 1;
    var len = type === 'cajado' ? d + 1
            : type === 'adaga' ? Math.max(3, d - 2)
            : d;
    var ex = hx + (dx / d) * len;
    var ey = hy + (dy / d) * len;
    var pts = linhaPts(hx, hy, Math.round(ex), Math.round(ey));
    var i, j;

    if (type === 'cajado') {
      for (i = 0; i < pts.length; i++) pintor(pts[i][0], pts[i][1], 11);
      var topo = pts[pts.length - 1];
      elipse(pintor, topo[0], topo[1], 1.6, 1.6, 14);
      pintor(topo[0], topo[1] - 1, 12);
      return;
    }

    if (type === 'martelo') {
      for (i = 0; i < pts.length; i++) pintor(pts[i][0], pts[i][1], 11);
      var ponta = pts[pts.length - 1];
      var antes = pts[Math.max(0, pts.length - 2)];
      var dhx = Math.abs(ponta[0] - antes[0]);
      var dhy = Math.abs(ponta[1] - antes[1]);
      var bx, by, bw, bh;
      if (dhx >= dhy) { bx = ponta[0] - 1; by = ponta[1] - 2; bw = 3; bh = 5; }
      else { bx = ponta[0] - 2; by = ponta[1] - 1; bw = 5; bh = 3; }
      for (j = 0; j < bh; j++) {
        for (i = 0; i < bw; i++) pintor(bx + i, by + j, 9);
      }
      for (i = 0; i < bw; i++) pintor(bx + i, by, 10);
      return;
    }

    // espada / adaga: lâmina + guarda perto da mão
    for (i = 0; i < pts.length; i++) pintor(pts[i][0], pts[i][1], 9);
    var guarda = pts[Math.min(1, pts.length - 1)];
    var perpx = Math.round(-dy / d), perpy = Math.round(dx / d);
    pintor(guarda[0], guarda[1], 14);
    pintor(guarda[0] + perpx, guarda[1] + perpy, 14);
    pintor(guarda[0] - perpx, guarda[1] - perpy, 14);
    var pontaEsp = pts[pts.length - 1];
    pintor(pontaEsp[0], pontaEsp[1], 10);
  }

  // ---- herói -------------------------------------------------------------
  // Corpo centrado em x=8, pés em y=19/20. Grade sempre 20 de largura: as
  // colunas extras à direita dão espaço para a arma no golpe.
  function heroGrid(look, anim, frame) {
    var W = 20, H = 20;
    var g = new Uint8Array(W * H);
    var pal = heroPalette(look);
    var px = pintorDireto(g, W, H);

    var SKIN = 2, SKINS = 3, HAIR = 4, HAIRS = 5;
    var CLOTH = 6, CLOTHS = 7, ACC = 8;
    var EYEW = 12, EYED = 13;

    var bob = 0, legF = 0, legB = 0, pose = 'rest';
    if (anim === 'idle') {
      bob = frame % 2;
    } else if (anim === 'walk') {
      legF = [0, 1, 0, 0][frame] || 0;   // perna da frente avança
      legB = [0, 0, 0, -1][frame] || 0;  // perna de trás recua
      bob = frame % 2;
    } else if (anim === 'attack') {
      pose = ['wind', 'slash', 'recover'][frame] || 'slash';
      bob = pose === 'slash' ? 1 : 0;
    }

    // pernas (no chão, sem bob); a da frente é 4px pra compensar o contorno
    retangulo(px, 5 + legB, 14, 3, 5, CLOTHS);
    retangulo(px, 8 + legF, 14, 4, 5, CLOTH);
    retangulo(px, 5 + legB, 19, 3, 1, ACC);
    retangulo(px, 8 + legF, 19, 4, 1, ACC);
    // em pé parado as pernas se tocam: uma linha de contorno separa
    if (legF === 0 && legB === 0) {
      for (var py2 = 14; py2 <= 19; py2++) px(8, py2, 1);
    }

    // torso
    retangulo(px, 5, 8 + bob, 7, 5, CLOTH);
    retangulo(px, 4, 9 + bob, 9, 3, CLOTH);   // ombros
    retangulo(px, 5, 12 + bob, 7, 1, ACC);    // cinto
    retangulo(px, 5, 13 + bob, 7, 1, CLOTHS);

    // braço de trás
    if (pose === 'rest') retangulo(px, 4, 9 + bob, 1, 4, CLOTHS);

    // pescoço e cabeça
    retangulo(px, 7, 7 + bob, 2, 1, SKINS);
    elipse(px, 7.5, 4 + bob, 4.5, 3.5, SKIN);

    // cabelo (estilos)
    var estilo = look.estilo || 'curto';
    if (estilo === 'curto') {
      elipse(px, 7.5, 3.1 + bob, 4.6, 2.9, HAIR);
    } else if (estilo === 'longo') {
      elipse(px, 7.5, 3.1 + bob, 4.6, 2.9, HAIR);
      retangulo(px, 3, 4 + bob, 2, 6, HAIR);
      retangulo(px, 3, 9 + bob, 2, 1, HAIRS);
    } else if (estilo === 'rabo') {
      elipse(px, 7.5, 3.1 + bob, 4.6, 2.9, HAIR);
      retangulo(px, 2, 4 + bob, 2, 3, HAIR);
      px(1, 6 + bob, HAIR);
      px(1, 7 + bob, HAIRS);
    } else if (estilo === 'moicana') {
      retangulo(px, 6, 0 + bob, 3, 3, HAIR);
      px(6, 3 + bob, HAIRS);
      px(8, 3 + bob, HAIRS);
    } else if (estilo === 'careca') {
      retangulo(px, 3, 3 + bob, 9, 1, ACC); // bandana
    }

    // rosto (frente = direita)
    elipse(px, 8.6, 5.4 + bob, 3.1, 2.1, SKIN);

    // sobrancelha, olhos e boca
    px(9, 3 + bob, HAIRS);
    px(9, 4 + bob, EYEW);
    px(10, 4 + bob, EYED);
    px(10, 6 + bob, 1);

    // braço da frente (repouso)
    if (pose === 'rest') retangulo(px, 12, 9 + bob, 1, 4, CLOTHS);

    // contorno do corpo
    contorna(g, W, H);

    // --- por cima do contorno: braço do golpe, mãos e arma
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
    if (pose === 'wind') {
      linha(pinta, 10, 10 + bob, 12, 8 + bob, CLOTH);
      armaDesenhar(pinta, arma, 13, 8 + bob, 17, 3 + bob);
      pinta(12, 8 + bob, SKIN);
    } else if (pose === 'slash') {
      for (var ax = 10; ax <= 13; ax++) {
        pinta(ax, 10, CLOTH);
        pinta(ax, 11, CLOTH);
      }
      armaDesenhar(pinta, arma, 15, 11, 19, 11);
      pinta(14, 11, SKIN);
    } else if (pose === 'recover') {
      linha(pinta, 10, 10, 13, 13, CLOTH);
      armaDesenhar(pinta, arma, 14, 13, 18, 16);
      pinta(13, 13, SKIN);
    } else {
      pinta(12, 13 + bob, SKIN); // mão
      armaDesenhar(pinta, arma, 13, 14 + bob, 17, 18 + bob);
    }

    // contorno próprio dos elementos destacados
    contornaDestaque(g, W, H, destaque);

    return { grid: g, W: W, H: H, palette: pal };
  }

  function heroCanvas(look, anim, frame) {
    var r = heroGrid(look, anim, frame);
    return paraCanvas(r.grid, r.W, r.H, r.palette);
  }

  // ---- inimigos ----------------------------------------------------------
  // 0 vazio | 1 contorno | 2 corpo | 3 corpo sombra | 4 brilho | 5 olho branco | 6 pupila
  function slimeCanvas(cor, frame) {
    var W = 14, H = 12;
    var g = new Uint8Array(W * H);
    var pal = [null, '#1b1424', cor, shade(cor, 0.68), shade(cor, 1.35), '#ffffff', '#20182a'];
    var px = pintorDireto(g, W, H);

    var sq = frame === 1;
    var cy = sq ? 7.6 : 7;
    var rx = sq ? 6.5 : 5.8;
    var ry = sq ? 3.6 : 4.4;

    elipse(px, 7, cy, rx, ry, 2);
    elipse(px, 5, cy - 1.6, 2, 1.2, 4);
    elipse(px, 7, cy + ry - 1.3, rx - 1, 1.2, 3);
    contorna(g, W, H);

    // rosto por cima do contorno
    var olhoY = Math.round(cy - 1);
    px(4, olhoY, 5);
    px(5, olhoY, 6);
    px(9, olhoY, 5);
    px(10, olhoY, 6);
    px(7, Math.round(cy + 1), 6);
    px(6, Math.round(cy + 1), 6);

    return paraCanvas(g, W, H, pal);
  }

  // Morcego: corpo em pé, asas para cima (frame1) ou abertas (frame0).
  function morcegoCanvas(cor, frame) {
    var W = 14, H = 12;
    var g = new Uint8Array(W * H);
    var pal = [null, '#1b1424', cor, shade(cor, 0.68), shade(cor, 1.35), '#ffffff', '#20182a'];
    var px = pintorDireto(g, W, H);

    var asaCima = frame === 1;
    // corpo e cabeça
    elipse(px, 7, 7, 2.2, 2.6, 2);
    elipse(px, 7, 9.6, 1.6, 1.4, 3);
    // orelhas
    px(5, 3, 2); px(8, 3, 2);
    px(5, 4, 3); px(8, 4, 3);
    // asas
    if (asaCima) {
      retangulo(px, 1, 3, 4, 2, 2);
      retangulo(px, 9, 3, 4, 2, 2);
      retangulo(px, 1, 5, 3, 1, 3);
      retangulo(px, 10, 5, 3, 1, 3);
    } else {
      retangulo(px, 1, 6, 4, 2, 2);
      retangulo(px, 9, 6, 4, 2, 2);
      retangulo(px, 2, 8, 3, 1, 3);
      retangulo(px, 9, 8, 3, 1, 3);
    }
    contorna(g, W, H);

    // rosto por cima do contorno
    px(6, 6, 5); px(8, 6, 5);      // olhos
    px(6, 7, 6); px(8, 7, 6);      // pupilas
    px(7, 9, 5);                   // focinho
    return paraCanvas(g, W, H, pal);
  }

  // Aranha: abdômen à esquerda, cabeça à direita, 8 pernas.
  function aranhaCanvas(cor, frame) {
    var W = 14, H = 12;
    var g = new Uint8Array(W * H);
    var pal = [null, '#1b1424', cor, shade(cor, 0.68), shade(cor, 1.35), '#ffffff', '#20182a'];
    var px = pintorDireto(g, W, H);

    var sobe = frame === 1;
    // abdômen + cabeça
    elipse(px, 4.5, 6, 3, 2.6, 2);
    elipse(px, 4.5, 6, 1.6, 1.4, 3);
    elipse(px, 9.5, 6.5, 2, 1.8, 2);
    // pernas (4 pares; frame alterna a altura)
    var d = sobe ? -1 : 0;
    linha(px, 7, 5, 10, 2 + d, 2);
    linha(px, 6, 5, 8, 1 + d, 2);
    linha(px, 5, 4, 6, 1 + d, 2);
    linha(px, 4, 4, 3, 1 + d, 2);
    linha(px, 7, 8, 10, 10 - d, 2);
    linha(px, 6, 8, 8, 11 - d, 2);
    linha(px, 5, 8, 5, 11 - d, 2);
    linha(px, 3, 8, 2, 10 - d, 2);
    contorna(g, W, H);

    // olhos na cabeça, por cima do contorno
    px(10, 6, 5); px(11, 6, 6);
    px(10, 7, 6);
    return paraCanvas(g, W, H, pal);
  }

  // ---- cenário -----------------------------------------------------------
  function treeCanvas() {
    var W = 20, H = 26;
    var g = new Uint8Array(W * H);
    var pal = [null, '#1b1424', '#2f6a3c', '#3f8a4a', '#6b4a2e', '#54391f', '#7fae55'];
    var px = pintorDireto(g, W, H);

    retangulo(px, 8, 16, 4, 9, 4);
    retangulo(px, 11, 17, 1, 7, 5);
    elipse(px, 10, 8, 8, 7, 2);
    elipse(px, 10, 6, 6, 4, 6);
    elipse(px, 12, 5, 3, 2, 6);
    contorna(g, W, H);
    retangulo(px, 9, 18, 1, 6, 5);
    return paraCanvas(g, W, H, pal);
  }

  function rockCanvas() {
    var W = 14, H = 11;
    var g = new Uint8Array(W * H);
    var pal = [null, '#1b1424', '#7a7a86', '#9494a2', '#5e5e6a'];
    var px = pintorDireto(g, W, H);

    elipse(px, 7, 6.5, 6, 4, 2);
    elipse(px, 5.5, 4.5, 3, 1.6, 3);
    contorna(g, W, H);
    retangulo(px, 3, 8, 8, 1, 4);
    return paraCanvas(g, W, H, pal);
  }

  return {
    shade: shade,
    heroCanvas: heroCanvas,
    slimeCanvas: slimeCanvas,
    morcegoCanvas: morcegoCanvas,
    aranhaCanvas: aranhaCanvas,
    treeCanvas: treeCanvas,
    rockCanvas: rockCanvas
  };
})();
