// Efeitos visuais das magias — pixel art por cima da arena.
// Restrição importante: SÓ primitivas que o rasterizador de testes/cena.js
// implementa (fillRect, ellipse + fill, globalAlpha) — arc/stroke/gradiente
// quebram o screenshot. Lógica de dano NÃO mora aqui: o missil recebe um
// callback e quem faz o estrago é a Batalha.
var Efeitos = (function () {
  var MAX = 300;             // teto da lista (simulação offline roda muitos)
  var lista = [];

  function push(e) {
    if (lista.length >= MAX) lista.shift();
    lista.push(e);
  }

  function easeOut(k) { return 1 - (1 - k) * (1 - k); }

  // ------------------------------------------------------------- gatilhos

  // Pontinhos com velocidade, gravidade e fade — a base de tudo.
  function brasas(x, y, cor, n, grav, forca) {
    for (var i = 0; i < n; i++) {
      var ang = Math.random() * Math.PI * 2;
      var vel = (forca || 60) * (0.4 + Math.random() * 0.8);
      push({
        tipo: 'brasas', x: x, y: y,
        vx: Math.cos(ang) * vel, vy: Math.sin(ang) * vel - 18,
        grav: grav === undefined ? 130 : grav,
        dur: 0.35 + Math.random() * 0.3, t: 0,
        tam: Math.random() < 0.3 ? 2 : 1,
        cor: cor
      });
    }
  }

  // Impacto: halo que cresce + anel de pontos expandindo + estilhaços.
  function explosao(x, y, cor, escala) {
    var e = escala || 1;
    push({ tipo: 'pulso', x: x, y: y, r0: 3 * e, r1: 15 * e,
           dur: 0.3, t: 0, cor: cor });
    push({ tipo: 'anel', x: x, y: y, r0: 4 * e, r1: 17 * e, pontos: 16,
           ang: Math.random() * Math.PI, tam: 2, dur: 0.45, t: 0, cor: cor });
    brasas(x, y, cor, Math.round(9 * e), 170, 75);
  }

  // Arco/crescente luminoso ao redor do herói (varreduras).
  function corte(x, y, cor, escala) {
    var e = escala || 1;
    push({ tipo: 'corte', x: x, y: y, raio: 24 * e,
           a0: Math.random() * Math.PI * 2, sweep: Math.PI * 1.4,
           pontos: 12, dur: 0.3, t: 0, cor: cor });
    brasas(x, y, cor, 6, 150, 55);
  }

  // Motes subindo (cura/bênção): brilho pulsante que flutua pra cima.
  function cura(x, y, cor) {
    push({ tipo: 'pulso', x: x, y: y + 6, r0: 4, r1: 16,
           dur: 0.5, t: 0, cor: cor });
    for (var i = 0; i < 7; i++) {
      push({
        tipo: 'mote', x: x - 10 + Math.random() * 20,
        y: y + 4 - Math.random() * 8,
        vy: -(26 + Math.random() * 24), fase: Math.random() * 6,
        dur: 0.8 + Math.random() * 0.4, t: 0, cor: cor,
        tam: Math.random() < 0.4 ? 2 : 1
      });
    }
  }

  // Projétil teleguiado com rastro: na chegada explode e chama aoChegar()
  // (o Batalha faz o dano por lá — o Efeitos só cuida do visual).
  function missil(de, para, cor, escala, aoChegar) {
    var dx = para.x - de.x, dy = para.y - de.y;
    var d = Math.sqrt(dx * dx + dy * dy) || 1;
    push({
      tipo: 'missil', x: de.x, y: de.y, x0: de.x, y0: de.y,
      para: para,
      nx: -dy / d, ny: dx / d,          // normal p/ a curva do voo
      curva: (Math.random() - 0.5) * 16,
      dur: Math.max(0.18, Math.min(0.32, d / 340)), t: 0,
      cor: cor, escala: escala || 1, aoChegar: aoChegar
    });
  }

  // ------------------------------------------------------------ ciclo
  function atualizar(dt) {
    for (var i = lista.length - 1; i >= 0; i--) {
      var e = lista[i];
      e.t += dt;
      if (e.tipo === 'brasas') {
        e.vy += e.grav * dt;
        e.x += e.vx * dt;
        e.y += e.vy * dt;
      } else if (e.tipo === 'mote') {
        e.y += e.vy * dt;
        e.x += Math.sin((e.t + e.fase) * 12) * 16 * dt;
      } else if (e.tipo === 'missil') {
        var k = Math.min(1, e.t / e.dur);
        var ax = e.para ? e.para.x : e.x;
        var ay = e.para ? e.para.y : e.y;
        var px = e.x0 + (ax - e.x0) * k;
        var py = e.y0 + (ay - e.y0) * k;
        var off = Math.sin(k * Math.PI) * e.curva;
        e.x = px + e.nx * off;
        e.y = py + e.ny * off;
        // rastro: uma brasa por frame perto do projétil
        if (Math.random() < 0.9) {
          push({ tipo: 'brasas', x: e.x, y: e.y,
                 vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20,
                 grav: 40, dur: 0.25, t: 0, tam: 1, cor: e.cor });
        }
      }
      if (e.t >= e.dur) {
        if (e.tipo === 'missil') {
          var fx = e.para ? e.para.x : e.x;
          var fy = e.para ? e.para.y : e.y;
          explosao(fx, fy, e.cor, e.escala);
          if (e.aoChegar) e.aoChegar();
        }
        lista.splice(i, 1);
      }
    }
  }

  // ------------------------------------------------------------ desenho
  function desenhar(ctx) {
    for (var i = 0; i < lista.length; i++) {
      var e = lista[i];
      var k = Math.min(1, e.t / e.dur);
      if (e.tipo === 'brasas') {
        ctx.globalAlpha = Math.max(0, 1 - k);
        ctx.fillStyle = e.cor;
        ctx.fillRect(Math.round(e.x), Math.round(e.y), e.tam, e.tam);
      } else if (e.tipo === 'mote') {
        var brilho = 0.5 + 0.5 * Math.sin(k * 8 + e.fase);
        ctx.globalAlpha = Math.max(0, (1 - k) * (0.4 + 0.6 * brilho));
        ctx.fillStyle = e.cor;
        ctx.fillRect(Math.round(e.x), Math.round(e.y), e.tam, e.tam);
      } else if (e.tipo === 'pulso') {
        var r = e.r0 + (e.r1 - e.r0) * easeOut(k);
        ctx.globalAlpha = 0.5 * (1 - k);
        ctx.fillStyle = e.cor;
        ctx.beginPath();
        ctx.ellipse(e.x, e.y, Math.max(0.5, r), Math.max(0.4, r * 0.6),
          0, 0, Math.PI * 2);
        ctx.fill();
      } else if (e.tipo === 'anel') {
        var ra = e.r0 + (e.r1 - e.r0) * easeOut(k);
        ctx.globalAlpha = Math.max(0, 1 - k);
        ctx.fillStyle = e.cor;
        for (var j = 0; j < e.pontos; j++) {
          var ang = e.ang + (j / e.pontos) * Math.PI * 2;
          ctx.fillRect(Math.round(e.x + Math.cos(ang) * ra),
            Math.round(e.y + Math.sin(ang) * ra * 0.75), e.tam, e.tam);
        }
      } else if (e.tipo === 'corte') {
        var p = easeOut(k);
        ctx.fillStyle = e.cor;
        for (var c = 0; c < e.pontos; c++) {
          var a = e.a0 + e.sweep * p - c * 0.24;
          ctx.globalAlpha = Math.max(0, (1 - k) *
            (c === 0 ? 1 : 1 - c / e.pontos));
          var tam = c === 0 ? 2 : 1;
          ctx.fillRect(Math.round(e.x + Math.cos(a) * e.raio),
            Math.round(e.y + Math.sin(a) * e.raio * 0.8), tam, tam);
        }
      } else if (e.tipo === 'missil') {
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = e.cor;
        ctx.beginPath();
        ctx.ellipse(e.x, e.y, 4, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = e.cor;
        ctx.fillRect(Math.round(e.x) - 1, Math.round(e.y) - 1, 3, 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(Math.round(e.x), Math.round(e.y), 1, 1);
      }
    }
    ctx.globalAlpha = 1;
  }

  function limpar() { lista.length = 0; }
  function qtd() { return lista.length; }

  return {
    brasas: brasas,
    explosao: explosao,
    corte: corte,
    cura: cura,
    missil: missil,
    atualizar: atualizar,
    desenhar: desenhar,
    limpar: limpar,
    qtd: qtd
  };
})();
