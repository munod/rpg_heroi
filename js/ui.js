// UI imediata desenhada direto no canvas (botões, painéis, barras, texto).
var UI = (function () {
  var ctx = null;
  // deslocamento horizontal do grupo em desenho (painel de gestão âncora
  // à direita em tela larga): o hit-test do button desconta a origem
  var deslocX = 0;

  function setContext(c) { ctx = c; }

  function deslocar(x) { deslocX = x || 0; }

  function text(str, x, y, o) {
    o = o || {};
    ctx.fillStyle = o.color || '#f2eef8';
    ctx.font = o.font || '16px monospace';
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(str), x, y);
  }

  function panel(x, y, w, h, title) {
    ctx.fillStyle = 'rgba(16, 12, 24, 0.94)';
    ctx.fillRect(x, y, w, h);
    if (title) {
      ctx.fillStyle = '#2a2340';
      ctx.fillRect(x + 1, y + 1, w - 2, 26);
      text(title, x + 10, y + 15, { color: '#e8c86a', font: 'bold 16px monospace' });
    }
    // realce interno de 1px: sensação de profundidade (só fillRect —
    // primitiva que o rasterizador de testes entende)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.fillRect(x + 1, y + (title ? 27 : 2), w - 2, 1);
    ctx.strokeStyle = '#5a4f78';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }

  function button(x, y, w, h, label, o) {
    o = o || {};
    var m = Input.mouse;
    var mx = m.x - deslocX;   // botão desenhado deslocado: testa na origem
    var hover = !o.disabled &&
      mx >= x && mx < x + w && m.y >= y && m.y < y + h;

    var ativo = !!o.ativo;
    // pressionado = dedo/mouse em cima: feedback visual no toque (antes
    // só existia hover, que não faz sentido sem mouse)
    var apertado = hover && m.down;
    ctx.fillStyle = o.disabled ? '#241f33'
      : (apertado ? '#241f33' : ((hover || ativo) ? '#4c4070' : '#322a4d'));
    ctx.fillRect(x, y, w, h);
    if (!o.disabled && h >= 20) {
      // faixa de luz no topo (profundidade) — 1px, fillRect puro
      ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
      ctx.fillRect(x + 2, y + 2, w - 4, 1);
    }
    ctx.strokeStyle = o.disabled ? '#3a3450'
      : ((apertado || hover || ativo) ? '#e8c86a' : '#6a5f90');
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    var tx = o.align === 'left' ? x + 8
      : (o.align === 'right' ? x + w - 8 : x + w / 2);
    text(label, tx, y + h / 2 + 2, {
      color: o.disabled ? '#6f678a' : (o.color || '#f2eef8'),
      align: o.align || 'center',
      font: o.font || '16px monospace'
    });
    return hover && m.clicked;
  }

  function bar(x, y, w, h, frac, color, bg) {
    if (frac < 0) frac = 0;
    if (frac > 1) frac = 1;
    ctx.fillStyle = bg || '#241f33';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = color || '#d84a4a';
    ctx.fillRect(x, y, Math.round(w * frac), h);
    // contorno só em barra alta: em 2-3px a linha de 1px cobriria o
    // preenchimento inteiro e a barra pareceria sempre vazia (barras de
    // inimigo vivem em espaço de mundo e seguem finas, sem contorno)
    if (h >= 4) {
      ctx.strokeStyle = '#0d0a14';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    }
  }

  function swatch(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#0d0a14';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }

  // Linha de status derivado dos rodapés das duas telas (HP/dano/vel/...).
  function linhaStatus(s) {
    var W = Game.W;           // largura dinâmica (main.js resize)
    // divisor entre painéis e rodapé (cromo, só fillRect)
    ctx.fillStyle = 'rgba(90, 79, 120, 0.45)';
    ctx.fillRect(8, 344, W - 16, 1);
    text(
      'HP ' + s.hpMax + '  ·  Dano ' + s.dano + '  ·  Vel ' + s.vel +
      '  ·  Crítico ' + s.crit + '%  ·  Alcance ' + s.alcance +
      '  ·  ' + s.arma,
      W / 2, 356, { align: 'center', color: '#c9c2dd' }
    );
  }

  return {
    setContext: setContext,
    deslocar: deslocar,
    text: text,
    panel: panel,
    button: button,
    bar: bar,
    swatch: swatch,
    linhaStatus: linhaStatus
  };
})();
