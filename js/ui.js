// UI imediata desenhada direto no canvas (botões, painéis, barras, texto).
var UI = (function () {
  var ctx = null;
  // deslocamento horizontal do grupo em desenho (painel de gestão âncora
  // à direita em tela larga): o hit-test do button desconta a origem
  var deslocX = 0;
  // ---- tooltip (Leva 3): caixa única, desenhada por cima de tudo e SEM
  // hit-test (nunca rouba clique). Elementos registram com dica() durante
  // o render; desenhaTooltip() desenha e limpa (o próximo frame re-registra
  // só o que estiver sob o ponteiro).
  var dicaCand = null;      // {gx, gy, w, h, linhas, desde, chave}
  var dicaFixa = null;      // caixa retida (long-press) — fecha no clique
  var DICA_DELAY = 250;     // ms de hover p/ abrir (sem flicker)
  var DICA_PRENSA = 500;    // ms segurando p/ abrir no toque

  function setContext(c) { ctx = c; }

  function dica(ret, linhas, cor) {
    if (!linhas || !linhas.length) return;
    var m = Input.mouse;
    var gx = ret.x + deslocX, gy = ret.y;
    if (m.x < gx || m.x >= gx + ret.w || m.y < gy || m.y >= gy + ret.h) return;
    var agora = performance.now();
    var chave = gx + ',' + gy + ',' + linhas[0][0];
    if (!dicaCand || dicaCand.chave !== chave) {
      dicaCand = { gx: gx, gy: gy, w: ret.w, h: ret.h, linhas: linhas,
                   cor: cor, desde: agora, chave: chave, press: 0,
                   usada: false };
    } else {
      dicaCand.usada = false;   // vivo neste frame (o draw confere)
      // ponteiro parado sobre o mesmo alvo: acumula hover e prensa
      if (m.down) {
        if (!dicaCand.press) dicaCand.press = agora;
        if (!dicaFixa && agora - dicaCand.press >= DICA_PRENSA) {
          // long-press: caixa retida ACIMA do dedo
          var alt = alturaDica(dicaCand.linhas);
          dicaFixa = {
            x: Math.max(4, Math.min(Game.W - larguraDica(dicaCand.linhas) - 4,
                                    m.x - 6)),
            y: Math.max(4, m.y - alt - 14),
            linhas: dicaCand.linhas, cor: dicaCand.cor
          };
        }
      }
    }
  }

  function alturaDica(linhas) { return linhas.length * 17 + 10; }
  function larguraDica(linhas) {
    var maior = 0;
    for (var i = 0; i < linhas.length; i++) {
      var t = linhas[i][0];
      if (t.length > maior) maior = t.length;
    }
    return Math.max(80, maior * 7.8 + 16);   // 13px mono ≈ 7,8px/char
  }

  // última chamada do render: desenha a caixa e regrava o estado
  function desenhaTooltip() {
    // clique novo fecha a caixa retida (toque fora)
    if (dicaFixa && Input.mouse.clicked) dicaFixa = null;
    // candidato NÃO registrado neste frame = ponteiro saiu (some)
    if (dicaCand && dicaCand.usada) dicaCand = null;
    var alvo = dicaFixa;
    if (!alvo) {
      if (dicaCand && performance.now() - dicaCand.desde >= DICA_DELAY) {
        var m = Input.mouse;
        var w = larguraDica(dicaCand.linhas), h = alturaDica(dicaCand.linhas);
        alvo = {
          x: Math.max(4, Math.min(Game.W - w - 4, m.x + 14)),
          y: Math.max(4, Math.min(432 - h - 4, m.y + 14)),
          linhas: dicaCand.linhas, cor: dicaCand.cor
        };
      }
    }
    if (dicaCand) dicaCand.usada = true;   // consumido por este frame
    if (!alvo) return;
    var w2 = larguraDica(alvo.linhas), h2 = alturaDica(alvo.linhas);
    ctx.fillStyle = 'rgba(16, 12, 24, 0.96)';
    ctx.fillRect(alvo.x, alvo.y, w2, h2);
    ctx.strokeStyle = '#6a5f90';
    ctx.lineWidth = 1;
    ctx.strokeRect(alvo.x + 0.5, alvo.y + 0.5, w2 - 1, h2 - 1);
    for (var i = 0; i < alvo.linhas.length; i++) {
      var ln = alvo.linhas[i];
      text(ln[0], alvo.x + 8, alvo.y + 14 + i * 17, {
        color: ln[1] || alvo.cor || '#f2eef8', font: '13px monospace'
      });
    }
  }

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
  // linhas do tooltip a partir das partes numéricas de statusDetalhado
  // (ordem fixa, sinal explícito, negativo em vermelho)
  function detLinhas(d, titulo) {
    var out = [[titulo + ' = ' + (Math.round(d.total * 100) / 100),
      '#ffd866']];
    var i, pt;
    for (i = 0; i < d.partes.length; i++) {
      pt = d.partes[i];
      out.push(['  ' + (pt.v >= 0 ? '+' : '') +
        (Math.round(pt.v * 100) / 100) + ' ' + pt.rot,
        pt.v < 0 ? '#ff8a8a' : '#c9c2dd']);
    }
    if (d.mult) out.push(['  ×' + d.mult.v + ' ' + d.mult.rot, '#8ce08c']);
    if (d.formula) out.push(['  ' + d.formula, '#9a90b8']);
    if (d.notas) {
      for (i = 0; i < d.notas.length; i++) {
        out.push(['  ⚑ ' + d.notas[i], '#9a90b8']);
      }
    }
    return out;
  }

  // Rodapé segmentado: cada número abre o próprio breakdown (Lições D3/
  // PoE: resumo à mostra, conta no hover; ordem fixa; matemática
  // monoespaçada — o rasterizador de testes NÃO tem measureText).
  function linhaStatus(s, p) {
    var W = Game.W;
    var CHAR = 9.6;         // 16px monospace ≈ 0,6em
    ctx.fillStyle = 'rgba(90, 79, 120, 0.45)';
    ctx.fillRect(8, 344, W - 16, 1);
    var det = p ? Personagem.statusDetalhado(p) : null;
    // ordem fixa (lição D4): nunca reordenar por valor
    var segs = [
      ['HP ' + s.hpMax, 'hp', 'Vida máxima'],
      ['Dano ' + s.dano, 'dano', 'Dano por golpe'],
      ['DPS ' + (det ? det.dps.total : 0), 'dps',
        'DPS básico (sem skills)'],
      ['Vel ' + s.vel, 'vel', 'Velocidade'],
      ['Crít ' + s.crit + '%', 'crit', 'Chance de crítico (×2)'],
      ['Alc ' + s.alcance, 'alcance', 'Alcance do golpe'],
      ['XP×' + s.xpMult.toFixed(2), 'xp', 'Multiplicador de XP']
    ];
    var sep = ' · ';     // 16px mono: 7 segmentos + arma cabem em 768
    var larg = sep.length * CHAR * segs.length +
      (sep.length + s.arma.length) * CHAR;
    var i;
    for (i = 0; i < segs.length; i++) larg += segs[i][0].length * CHAR;
    var x = Math.max(8, (W - larg) / 2);
    for (i = 0; i < segs.length; i++) {
      var txt = segs[i][0];
      text(txt, x, 356, { color: '#c9c2dd' });
      if (det && det[segs[i][1]]) {
        dica({ x: x - 3, y: 347, w: txt.length * CHAR + 6, h: 20 },
          detLinhas(det[segs[i][1]], segs[i][2]));
      }
      x += txt.length * CHAR + sep.length * CHAR;
    }
    text(sep + s.arma, x, 356, { color: '#6f678a' });
  }

  return {
    setContext: setContext,
    deslocar: deslocar,
    dica: dica,
    desenhaTooltip: desenhaTooltip,
    text: text,
    panel: panel,
    button: button,
    bar: bar,
    swatch: swatch,
    linhaStatus: linhaStatus
  };
})();
