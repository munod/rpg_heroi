// UI imediata desenhada direto no canvas (botões, painéis, barras, texto).
var UI = (function () {
  var ctx = null;

  function setContext(c) { ctx = c; }

  function text(str, x, y, o) {
    o = o || {};
    ctx.fillStyle = o.color || '#f2eef8';
    ctx.font = o.font || '8px monospace';
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(str), x, y);
  }

  function panel(x, y, w, h, title) {
    ctx.fillStyle = 'rgba(16, 12, 24, 0.94)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#5a4f78';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    if (title) {
      ctx.fillStyle = '#2a2340';
      ctx.fillRect(x + 1, y + 1, w - 2, 13);
      text(title, x + 5, y + 8, { color: '#e8c86a', font: 'bold 8px monospace' });
    }
  }

  function button(x, y, w, h, label, o) {
    o = o || {};
    var m = Input.mouse;
    var hover = !o.disabled &&
      m.x >= x && m.x < x + w && m.y >= y && m.y < y + h;

    var ativo = !!o.ativo;
    ctx.fillStyle = o.disabled ? '#241f33' : ((hover || ativo) ? '#4c4070' : '#322a4d');
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = o.disabled ? '#3a3450' : ((hover || ativo) ? '#e8c86a' : '#6a5f90');
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    var tx = o.align === 'left' ? x + 4
      : (o.align === 'right' ? x + w - 4 : x + w / 2);
    text(label, tx, y + h / 2 + 1, {
      color: o.disabled ? '#6f678a' : (o.color || '#f2eef8'),
      align: o.align || 'center',
      font: o.font || '8px monospace'
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
    // preenchimento inteiro e a barra pareceria sempre vazia
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
    text(
      'HP ' + s.hpMax + '  ·  Dano ' + s.dano + '  ·  Vel ' + s.vel +
      '  ·  Crítico ' + s.crit + '%  ·  Alcance ' + s.alcance +
      '  ·  ' + s.arma,
      192, 176, { align: 'center', color: '#c9c2dd' }
    );
  }

  return {
    setContext: setContext,
    text: text,
    panel: panel,
    button: button,
    bar: bar,
    swatch: swatch,
    linhaStatus: linhaStatus
  };
})();
