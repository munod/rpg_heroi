// UI imediata desenhada direto no canvas (botões, painéis, barras, texto).
var UI = (function () {
  var ctx = null;

  // ---- PALETA (base visual: Docs/ui.md §2) — fonte única do cromo.
  // Cores semânticas de domínio (skills, dano, temas de Mapas) ficam
  // nos seus arquivos — aqui vive o chrome da interface.
  var PALETA = {
    bgTop: '#1b1433', bgBot: '#0f0b1c',        // fundo da tela
    topoTop: '#251e42', topoBot: '#191330',    // faixa do cabeçalho
    painelTop: '#241d3e', painelBot: '#16112c', // painéis
    borda: '#4d4370',                          // borda dos painéis
    btnTop: '#3d3466', btnBot: '#292345',      // botão normal
    btnTopH: '#584b8a', btnBotH: '#3d3466',    // botão hover
    ativoTop: '#5b4c33', ativoBot: '#3b3120',  // aba/lista ativa (dourado)
    sombra: 'rgba(0, 0, 0, 0.38)',
    // acentos
    ouro: '#e8c86a', ouroClaro: '#f0cd72', ouroEsc: '#c9a24a',
    texto: '#f2eef8', suave: '#9a90b8', suave2: '#c9c2dd',
    apagado: '#6f678a', verde: '#8ce08c', vermelho: '#d84a4a'
  };
  // deslocamento horizontal do grupo em desenho (painel de gestão âncora
  // à direita em tela larga): o hit-test do button desconta a origem
  var deslocX = 0;
  // ---- tooltip (Leva 3): caixa única, desenhada por cima de tudo e SEM
  // hit-test (nunca rouba clique). Elementos registram com dica() durante
  // o render; desenhaTooltip() desenha e limpa (o próximo frame re-registra
  // só o que estiver sob o ponteiro).
  var dicaCand = null;      // {gx, gy, w, h, linhas, desde, chave}
  var dicaFixa = null;      // caixa retida (long-press) — fecha no clique
  // Overlay de vitória (spec mundos): enquanto ligado, botões/dicas da
  // UI de baixo desenham normal mas NÃO respondem (sem atravessar).
  var bloqueado = false;
  var DICA_DELAY = 250;     // ms de hover p/ abrir (sem flicker)
  var DICA_PRENSA = 500;    // ms segurando p/ abrir no toque

  function setContext(c) { ctx = c; }

  // ---- primitivas com fallback (base visual: Docs/ui.md §3) —
  // "teste nunca quebra": o harness não tem gradiente nem roundRect
  // REAL, então testes veem cor sólida/quadrado e o navegador vê a
  // versão bonita.

  // degradê vertical/horizontal; sem suporte no ctx → 1ª cor sólida
  function grad(x0, y0, x1, y1, cores) {
    if (typeof ctx.createLinearGradient !== 'function') return cores[0][1];
    var g = ctx.createLinearGradient(x0, y0, x1, y1);
    if (!g || typeof g.addColorStop !== 'function') return cores[0][1];
    for (var i = 0; i < cores.length; i++) g.addColorStop(cores[i][0], cores[i][1]);
    return g;
  }

  // mistura um hex com branco (f: 0 = cor, 1 = branco) — topo das
  // barras e fios de luz (equivalente exato a rgba branco sobre a cor)
  function tom(hex, f) {
    if (typeof hex !== 'string' || hex.charAt(0) !== '#') return hex;
    function m(c) { return Math.round(c + (255 - c) * f); }
    function hx(c) { return (c < 16 ? '0' : '') + c.toString(16); }
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return hex;
    return '#' + hx(m(r)) + hx(m(g)) + hx(m(b));
  }

  // caminho de retângulo arredondado (r = nº = todos os cantos, ou
  // [tl, tr, br, bl]); probe de ASSINATURA: o Proxy do harness devolve
  // fn genérica com length 0 → cai no rect (rasterizador também não
  // tem roundRect)
  function caminho(x, y, w, h, r) {
    ctx.beginPath();
    if (r && typeof ctx.roundRect === 'function' && ctx.roundRect.length > 0) {
      ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.rect(x, y, w, h);
    }
  }

  function caixa(x, y, w, h, r, cor) {
    caminho(x, y, w, h, r);
    ctx.fillStyle = cor;
    ctx.fill();
  }

  // sombra 1px abaixo (doc: antes de cada caixa)
  function sombra(x, y, w, h, r) {
    caixa(x, y + 1, w, h, r, PALETA.sombra);
  }

  function dica(ret, linhas, cor) {
    if (bloqueado) return;    // overlay de vitória: sem tooltip de baixo
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
    caixa(alvo.x, alvo.y, w2, h2, 4, '#6a5f90');
    caixa(alvo.x + 1, alvo.y + 1, w2 - 2, h2 - 2, 3, 'rgba(16, 12, 24, 0.96)');
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
    ctx.font = o.font || '16px monospace';
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = 'middle';
    // sombra OPT-IN (cópia escura 1px abaixo) — nunca ligue sem
    // precisar: dobra fillText e muda contagens de texto nos testes
    if (o.sombra) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.fillText(String(str), x, y + 1);
    }
    ctx.fillStyle = o.color || '#f2eef8';
    ctx.fillText(String(str), x, y);
  }

  // fundo da tela + faixa do cabeçalho (base visual: Docs/ui.md §4) —
  // as cenas chamam em vez de fillRect solto; fio dourado separa
  function fundo(c) {
    c = c || ctx;
    c.fillStyle = grad(0, 0, 0, 432, [[0, PALETA.bgTop], [1, PALETA.bgBot]]);
    c.fillRect(0, 0, Game.W, 432);
  }
  function faixaTopo(c, h) {
    c = c || ctx;
    c.fillStyle = grad(0, 0, 0, h, [[0, PALETA.topoTop], [1, PALETA.topoBot]]);
    c.fillRect(0, 0, Game.W, h);
    c.fillStyle = 'rgba(232, 200, 106, 0.30)';
    c.fillRect(0, h, Game.W, 1);
  }

  function panel(x, y, w, h, title) {
    // padrão do doc ui.md §4: sombra + gradiente + borda dupla + cantos
    // arredondados. A borda é DUPLO PREENCHIMENTO (anel externo na cor
    // da borda): strokeRect não acompanha canto arredondado e o
    // stroke() do rasterizador de testes é no-op
    sombra(x, y, w, h, 8);
    caixa(x, y, w, h, 8, PALETA.borda);
    caixa(x + 1, y + 1, w - 2, h - 2, 7,
      grad(x, y + 1, x, y + h - 1,
        [[0, PALETA.painelTop], [1, PALETA.painelBot]]));
    if (title) {
      // faixa de título só em cima [8,8,0,0] + fio dourado embaixo
      caixa(x + 1, y + 1, w - 2, 26, [7, 7, 0, 0],
        grad(x, y + 1, x, y + 27, [[0, '#2f2752'], [1, '#241d42']]));
      ctx.fillStyle = 'rgba(232, 200, 106, 0.35)';
      ctx.fillRect(x + 1, y + 27, w - 2, 1);
      text(title, x + 10, y + 15,
        { color: PALETA.ouroClaro, font: 'bold 16px monospace', sombra: true });
    } else {
      // realce interno de 1px: sensação de profundidade
      ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.fillRect(x + 2, y + 2, w - 4, 1);
    }
  }

  function button(x, y, w, h, label, o) {
    o = o || {};
    var m = Input.mouse;
    var mx = m.x - deslocX;   // botão desenhado deslocado: testa na origem
    var hover = !bloqueado && !o.disabled &&
      mx >= x && mx < x + w && m.y >= y && m.y < y + h;

    var ativo = !!o.ativo;
    // pressionado = dedo/mouse em cima: feedback visual no toque (antes
    // só existia hover, que não faz sentido sem mouse)
    var apertado = hover && m.down;
    // 4 estados com gradiente/borda do doc ui.md §4; apertado mantém o
    // papel de sempre (preenchimento escuro no toque). SÓ o desenho
    // muda aqui — o retângulo de clique acima é contrato de teste
    var r = Math.min(6, Math.floor(h / 2));
    var topo, bot, borda;
    if (o.disabled) { topo = '#241f33'; bot = '#241f33'; borda = '#3a3450'; }
    else if (ativo) { topo = PALETA.ativoTop; bot = PALETA.ativoBot; borda = '#c9a24a'; }
    else if (apertado) { topo = PALETA.btnBot; bot = PALETA.btnBot; borda = '#8f82c4'; }
    else if (hover) { topo = PALETA.btnTopH; bot = PALETA.btnBotH; borda = '#8f82c4'; }
    else { topo = PALETA.btnTop; bot = PALETA.btnBot; borda = '#5d5386'; }
    if (!o.disabled) sombra(x, y, w, h, r);
    caixa(x, y, w, h, r, borda);          // borda acompanha o canto
    caixa(x + 1, y + 1, w - 2, h - 2, Math.max(0, r - 1),
      grad(x, y + 1, x, y + h - 1, [[0, topo], [1, bot]]));
    if (!o.disabled && h >= 20) {
      // faixa de luz no topo (profundidade) — 1px, fillRect puro
      ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
      ctx.fillRect(x + 3, y + 3, w - 6, 1);
    }
    var tx = o.align === 'left' ? x + 8
      : (o.align === 'right' ? x + w - 8 : x + w / 2);
    text(label, tx, y + h / 2 + 2, {
      color: o.disabled ? '#6f678a' : (o.color || '#f2eef8'),
      align: o.align || 'center',
      font: o.font || '16px monospace',
      sombra: ativo && !o.disabled
    });
    return hover && m.clicked;
  }

  function bar(x, y, w, h, frac, color, bg) {
    if (frac < 0) frac = 0;
    if (frac > 1) frac = 1;
    var cor = color || '#d84a4a';
    ctx.fillStyle = bg || '#241f33';
    ctx.fillRect(x, y, w, h);
    // degradê do doc: topo 35% mais claro (fallback devolve o claro)
    ctx.fillStyle = grad(x, y, x, y + h, [[0, tom(cor, 0.35)], [1, cor]]);
    ctx.fillRect(x, y, Math.round(w * frac), h);
    // contorno só em barra alta: em 2-3px a linha de 1px cobriria o
    // preenchimento inteiro e a barra pareceria sempre vazia (barras de
    // inimigo vivem em espaço de mundo e seguem finas, sem contorno)
    if (h >= 4) {
      // brilho de 1px no topo + contorno (invariante: NUNCA < 4)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.20)';
      ctx.fillRect(x + 1, y + 1, Math.max(0, Math.round(w * frac) - 2), 1);
      ctx.strokeStyle = '#0d0a14';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    }
  }

  function swatch(x, y, w, h, color) {
    caixa(x, y, w, h, 4, '#0d0a14');
    caixa(x + 1, y + 1, w - 2, h - 2, 3, color);
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
      ['Vel ' + Math.round(s.vel), 'vel', 'Velocidade'],
      ['Crít ' + s.crit + '%', 'crit', 'Chance de crítico (×2)'],
      ['Alc ' + s.alcance, 'alcance', 'Alcance do golpe']
    ];
    var sep = ' · ';     // 16px mono: 6 segmentos + arma cabem em 768
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

  // Abreviação de números grandes p/ barra de XP exponencial (padrão
  // de indústria: 1,5K · 2,3M · 4,5B … até 10^60). pt-BR: vírgula.
  var SUF = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No',
             'Dc', 'Ud', 'Dd', 'Td', 'Qad', 'Qid', 'Sxd', 'Spd', 'Ocd',
             'Nod'];
  function abrev(n) {
    n = Math.max(0, Math.floor(n || 0));
    if (n < 1000) return String(n);
    // +1e-9: Math.log perto de múltiplas de 3 flutua (10^45 podia cair
    // em 14.999… → "1000Td" em vez de "1Qad")
    var i = Math.floor(Math.log(n) / Math.LN10 / 3 + 1e-9);
    if (i > SUF.length - 1) {
      // além do último sufixo ("Nod" = 10^60, logo 10^63 — o XP/custo
      // do late game chega a ~10^281 com o teto 9500): notação
      // científica pt-BR ("1,5e281")
      var e = Math.floor(Math.log(n) / Math.LN10 + 1e-9);
      var m = Math.round((n / Math.pow(10, e)) * 10) / 10;
      if (m >= 10) { m = 1; e++; }          // 9,96e280 arredonda p/ 1e281
      return m.toString().replace('.', ',') + 'e' + e;
    }
    var v = n / Math.pow(10, i * 3);
    return (Math.round(v * 10) / 10).toString().replace('.', ',') + SUF[i];
  }

  // Liga/desliga o bloqueio de input da UI (overlay de vitória)
  function bloqueia(v) { bloqueado = !!v; }

  return {
    PALETA: PALETA,
    setContext: setContext,
    grad: grad,
    tom: tom,
    caminho: caminho,
    caixa: caixa,
    sombra: sombra,
    fundo: fundo,
    faixaTopo: faixaTopo,
    abrev: abrev,
    deslocar: deslocar,
    bloqueia: bloqueia,
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
