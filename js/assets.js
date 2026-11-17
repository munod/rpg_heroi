// Assets gerados (spec visual-heroi-spritecook): manifesto + carga.
//
// O herói do guerreiro vem de PNGs gerados no SpriteCook (pixels fora
// do grid procedural); as outras classes continuam procedurais até a
// leva 2 — quem não tem asset NUNCA fica sem desenho (fallback por
// construção). O manifesto é EMBUTIDO (nunca fetch: o jogo abre em
// file://, onde fetch é bloqueado) e os caminhos são relativos.
//
// Contratos p/ os testes: imagem stub devolve _data RGBA (cena.js já
// lê assim); no harness a decodificação é síncrona, então `carga(cb)`
// chama cb de forma síncrona e o boot não atrasa.
var Assets = (function () {
  // canvas do herói novo: 43×43, corpo centrado em x=21, pés na
  // fileira 42 (y0 = heroi.y − ALT deixa os pés em heroi.y − 1, como
  // o sprite procedural de 20)
  var ALT = 43, CX = 21;

  // ciclo por animação (s) — o tempo de LOOP é o mesmo do procedural
  // (idle 2×0,35 · walk 4×0,12); com 8 frames o frame dura ciclo/qtd
  var CICLO = { idle: 0.7, walk: 0.48 };

  // punho por frame (coord do canvas 43×43) — medido com o
  // testes/prepara-assets.js (detecção de pele + conferência no QA)
  var HEROIS = {
    guerreiro: {
      idle: {
        qtd: 8,
        punho: [[31, 26], [31, 26], [32, 26], [32, 26],
          [32, 26], [31, 26], [31, 26], [31, 26]],
        ang: ['baixo', 'baixo', 'baixo', 'baixo',
          'baixo', 'baixo', 'baixo', 'baixo']
      },
      walk: {
        qtd: 8,
        punho: [[31, 26], [30, 27], [28, 27], [27, 27],
          [26, 28], [27, 27], [27, 28], [28, 26]],
        ang: ['baixo', 'baixo', 'baixo', 'baixo',
          'baixo', 'baixo', 'baixo', 'baixo']
      },
      ataque: {
        qtd: 8,
        // fração do tempo em que cada frame COMEÇA — o golpe (frame 5)
        // cai em 0,30 ≈ o momento do dano (min(0,10; dur×0,5)/dur em
        // dur 0,20-0,36 = 0,28-0,50): o número sobe JUNTO com a lâmina
        inicios: [0, 0.07, 0.13, 0.19, 0.25, 0.30, 0.55, 0.78],
        punho: [[31, 27], [33, 16], [26, 12], [28, 12],
          [31, 12], [37, 17], [31, 24], [32, 26]],
        ang: ['baixo', 'cima', 'cima', 'cima',
          'cima', 'meio', 'meio', 'baixo'],
        // frame 6: o punho cruzou p/ a esquerda (follow-through) — a
        // arma é desenhada espelhada dentro do composite
        esp: [false, false, false, false, false, false, true, false]
      }
    }
  };

  // geometria das armas (assets finais ÷4 da fonte) + onde a mão
  // segura (px da própria imagem da arma)
  var ARMAS = {
    espada: {
      meio: { w: 18, h: 6, pegar: [3, 3] },
      cima: { w: 17, h: 17, pegar: [5, 13] },
      baixo: { w: 17, h: 17, pegar: [5, 4] }
    },
    adaga: {
      meio: { w: 10, h: 4, pegar: [3, 2] },
      cima: { w: 10, h: 10, pegar: [4, 7] },
      baixo: { w: 10, h: 10, pegar: [4, 3] }
    },
    cajado: {
      meio: { w: 15, h: 3, pegar: [6, 2] },
      cima: { w: 13, h: 13, pegar: [6, 8] },
      baixo: { w: 13, h: 13, pegar: [6, 5] }
    },
    martelo: {
      meio: { w: 12, h: 6, pegar: [3, 3] },
      cima: { w: 13, h: 13, pegar: [4, 10] },
      baixo: { w: 13, h: 13, pegar: [4, 3] }
    }
  };
  var ANGULOS = ['meio', 'cima', 'baixo'];
  var RARS = [1, 2, 3, 4];

  var imgHeroi = {};    // 'guerreiro|idle|3' → Image (só depois do onload)
  var imgArma = {};     // 'espada|cima|r2' → Image
  var carregado = {};   // classe → true (TODOS os frames prontos)
  var armaPronta = {};  // arma → { 'cima r2': true }
  var iniciado = false, pendentes = 0, cbFinal = null;

  function chaveHeroi(c, a, i) { return c + '|' + a + '|' + i; }
  function chaveArma(t, g, r) { return t + '|' + g + '|r' + r; }

  // o jogo fala 'attack' (chave do anim.js/batalha.js) e o arquivo é
  // guerreiro-ataque-N.png (pt-BR) — traduz só na fronteira
  function arq(a) { return a === 'attack' ? 'ataque' : a; }

  function caminhoHeroi(c, a, i) {
    return 'assets/herois/' + c + '-' + a + '-' + i + '.png';
  }
  function caminhoArma(t, g, r) {
    return 'assets/armas/' + t + '-' + g + '-r' + r + '.png';
  }

  function conta() {
    pendentes--;
    if (pendentes === 0 && cbFinal) {
      var cb = cbFinal;
      cbFinal = null;
      cb();
    }
  }

  // cria a Image e registra SÓ no onload (no harness o onload é
  // síncrono e dispara dentro do `src` — registrar antes quebraria a
  // ordem; registrar no erro deixaria uma imagem quebrada na chave)
  function pega(src, destino, chave, aoPronto) {
    var im = new Image();
    im.onload = function () {
      destino[chave] = im;
      if (aoPronto) aoPronto();
      conta();
    };
    im.onerror = function () {
      console.log('assets: falhou ' + src);
      conta();
    };
    im.src = src;
  }

  // Pré-carrega tudo (heróis com asset + as 4 armas × 3 ângulos × 4
  // raridades). cb roda quando TODOS os pedidos assentaram (sucesso ou
  // falha — falha deixa o fallback procedural ativo). Idempotente.
  function carga(cb) {
    if (iniciado) { if (cb) cb(); return; }
    iniciado = true;
    cbFinal = cb || null;
    var classes = [];
    for (var c in HEROIS) if (HEROIS.hasOwnProperty(c)) classes.push(c);
    var total = 0;
    classes.forEach(function (cl) { total += nTotal(cl); });
    for (var t in ARMAS) if (ARMAS.hasOwnProperty(t)) total += ANGULOS.length * RARS.length;
    pendentes = total;
    if (total === 0) { conta(); return; }

    classes.forEach(function (cl) {
      var esperados = nTotal(cl), ok = 0;
      var anims = [];
      for (var a in HEROIS[cl]) if (HEROIS[cl].hasOwnProperty(a)) anims.push(a);
      anims.forEach(function (anim) {
        for (var i = 0; i < HEROIS[cl][anim].qtd; i++) {
          pega(caminhoHeroi(cl, anim, i), imgHeroi, chaveHeroi(cl, anim, i),
            function () {
              ok++;
              if (ok === esperados) carregado[cl] = true;
            });
        }
      });
    });

    for (var t2 in ARMAS) if (ARMAS.hasOwnProperty(t2)) {
      (function (tipo) {
        ANGULOS.forEach(function (g) {
          RARS.forEach(function (r) {
            pega(caminhoArma(tipo, g, r), imgArma, chaveArma(tipo, g, r),
              function () {
                if (!armaPronta[tipo]) armaPronta[tipo] = {};
                armaPronta[tipo][g + '|r' + r] = true;
              });
          });
        });
      })(t2);
    }
  }

  function nTotal(cl) {
    var n = 0;
    for (var a in HEROIS[cl]) if (HEROIS[cl].hasOwnProperty(a)) n += HEROIS[cl][a].qtd;
    return n;
  }

  // ----------------------------------------------------------- consultas
  function temHeroi(cl, anim) {
    return !!(carregado[cl] && HEROIS[cl] && HEROIS[cl][arq(anim)]);
  }

  // frame do herói (Image) ou null (procedural)
  function hero(cl, anim, i) {
    if (!temHeroi(cl, anim)) return null;
    var im = imgHeroi[chaveHeroi(cl, arq(anim), i)];
    if (!im) return null;
    return { canvas: im, w: ALT, h: ALT, cx: CX, alt: ALT };
  }

  function def(cl, anim) {
    return (HEROIS[cl] && HEROIS[cl][arq(anim)]) || null;
  }

  // qtd de frames da animação (procedural = a de sempre: 4/2/3)
  function qtd(cl, anim) {
    var d = def(cl, anim);
    if (temHeroi(cl, anim) && d) return d.qtd;
    if (anim === 'walk') return 4;
    if (anim === 'attack') return 3;
    return 2;
  }

  // duração de cada frame respeitando o ciclo do procedural
  function durFrame(cl, anim) {
    var d = def(cl, anim);
    var ciclo = (anim === 'walk') ? CICLO.walk : CICLO.idle;
    return ciclo / qtd(cl, anim);
  }

  // frame do ataque pelo progresso p (0..1): asset usa a tabela de
  // inicios; procedural mantém a fórmula de sempre (floor(p×3))
  function frameAtaque(cl, p) {
    var d = def(cl, 'ataque');
    if (temHeroi(cl, 'ataque') && d && d.inicios) {
      var f = 0;
      for (var i = 0; i < d.inicios.length; i++) if (p >= d.inicios[i]) f = i;
      return f;
    }
    return Math.max(0, Math.min(2, Math.floor(p * 3)));
  }

  // arma composta: onde a imagem entra no canvas do herói, ou null
  function arma(cl, anim, i, tipo, rar) {
    if (!temHeroi(cl, anim)) return null;
    var d = def(cl, anim);
    if (!d || !d.punho || !d.ang) return null;
    var t = ARMAS[tipo];
    if (!t) return null;
    var g = d.ang[i] || 'baixo';
    var geo = t[g];
    if (!geo) return null;
    if (!armaPronta[tipo] || !armaPronta[tipo][g + '|r' + rar]) return null;
    var im = imgArma[chaveArma(tipo, g, rar)];
    if (!im) return null;
    var punho = d.punho[i];
    var esp = !!(d.esp && d.esp[i]);
    // o punho fica em cima do ponto "pegar" da arma (espelhado: o
    // ponto vira w−1−gx)
    var gx = esp ? (geo.w - 1 - geo.pegar[0]) : geo.pegar[0];
    return {
      canvas: im, w: geo.w, h: geo.h,
      dx: punho[0] - gx, dy: punho[1] - geo.pegar[1],
      esp: esp
    };
  }

  // desenha herói + arma em (x0, y0) — o espelhamento do `facing` é
  // externo (envolve as DUAS camadas, como o sprite procedural)
  function desenha(ctx, x0, y0, c, esc) {
    esc = esc || 1;
    ctx.drawImage(c.canvas, x0, y0, c.w * esc, c.h * esc);
    var a = c.arma;
    if (!a) return;
    var ax = x0 + a.dx * esc, ay = y0 + a.dy * esc;
    if (a.esp) {
      ctx.save();
      ctx.translate(ax + a.w * esc, ay);
      ctx.scale(-1, 1);
      ctx.drawImage(a.canvas, 0, 0, a.w * esc, a.h * esc);
      ctx.restore();
    } else {
      ctx.drawImage(a.canvas, ax, ay, a.w * esc, a.h * esc);
    }
  }

  // sonda p/ teste
  function info() {
    var classes = [];
    for (var c in HEROIS) if (HEROIS.hasOwnProperty(c)) classes.push(c);
    return {
      iniciado: iniciado, pendentes: pendentes,
      classes: classes, alt: ALT, cx: CX,
      carregado: JSON.parse(JSON.stringify(carregado)),
      armas: (function () {
        var out = [];
        for (var t in ARMAS) if (ARMAS.hasOwnProperty(t)) out.push(t);
        return out;
      })()
    };
  }

  return {
    ALT: ALT, CX: CX, CICLO: CICLO,
    carga: carga, hero: hero, arma: arma, desenha: desenha,
    qtd: qtd, durFrame: durFrame, frameAtaque: frameAtaque,
    temHeroi: temHeroi, info: info,
    // punho por frame (coord43) — sonda p/ teste de composição
    punho: function (cl, anim, i) {
      var d = def(cl, anim);
      return (d && d.punho && d.punho[i]) || null;
    },
    // p/ o teste montar as chaves sem duplicar o caminho
    caminhoHeroi: caminhoHeroi, caminhoArma: caminhoArma,
    _registra: function (chave, im, arma_) {
      if (arma_) imgArma[chave] = im; else imgHeroi[chave] = im;
    }
  };
})();
