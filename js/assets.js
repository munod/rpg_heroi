// Assets gerados (spec visual-heroi-spritecook): manifesto + carga.
//
// O herói do guerreiro vem de PNGs gerados no SpriteCook (pixels fora
// do grid procedural); as outras classes continuam procedurais até a
// leva 2 — quem não tem asset NUNCA fica sem desenho (fallback por
// construção). A arma da classe é EMBUTIDA na arte (emenda do
// veredito: composição não resolvia grip nem salva de mão) — este
// módulo cuida só dos frames.
//
// O manifesto é EMBUTIDO (nunca fetch: o jogo abre em file://, onde
// fetch é bloqueado) e os caminhos são relativos. Contratos p/ os
// testes: imagem stub devolve _data RGBA (cena.js já lê assim); no
// harness a decodificação é síncrona, então `carga(cb)` chama cb de
// forma síncrona e o boot não atrasa.
var Assets = (function () {
  // canvas do herói novo: 43×43, corpo centrado em x=21, pés na
  // fileira 42 (y0 = heroi.y − ALT deixa os pés em heroi.y − 1, como
  // o sprite procedural de 20)
  var ALT = 43, CX = 21;

  // ciclo por animação (s) — o tempo de LOOP é o mesmo do procedural
  // (idle 2×0,35 · walk 4×0,12); com 8 frames o frame dura ciclo/qtd
  var CICLO = { idle: 0.7, walk: 0.48 };

  // frames por animação; `inicios` (só ataque) = fração do tempo em
  // que cada frame COMEÇA — o golpe cai em ~0,30 ≈ o momento do dano
  // (min(0,10; dur×0,5)/dur em dur 0,20-0,36 = 0,28-0,50): o número
  // sobe JUNTO com a lâmina. `inicios` é POR CLASSE (R-VHS-14: o
  // frame do golpe depende da pose gerada — medido no QA de cada
  // attack; a tabela abaixo é a do guerreiro, referência).
  var HEROIS = {
    guerreiro: {
      idle: { qtd: 8 },
      walk: { qtd: 8 },
      ataque: {
        qtd: 8,
        inicios: [0, 0.07, 0.13, 0.19, 0.25, 0.30, 0.55, 0.78]
      }
    },
    mago: {
      idle: { qtd: 8 },
      walk: { qtd: 8 },
      ataque: {
        qtd: 8,
        // medido no QA: wind-up f2-f5 (gema p/ trás) → GOLPE em f6
        // (gema p/ baixo-direita) → recuperação f7 — o golpe começa
        // em 0,28 ≈ o momento do dano (0,278 em dur 0,36)
        inicios: [0, 0.04, 0.08, 0.12, 0.16, 0.22, 0.28, 0.70]
      }
    },
    ladino: {
      idle: { qtd: 8 },
      walk: { qtd: 8 },
      ataque: {
        qtd: 8,
        inicios: [0, 0.07, 0.13, 0.19, 0.25, 0.30, 0.55, 0.78]
      }
    },
    clerigo: {
      idle: { qtd: 8 },
      walk: { qtd: 8 },
      ataque: {
        qtd: 8,
        // medido (max-x por frame): wind-up f2-f5 (martelo recuado,
        // f5 cai p/ 67) → GOLPE em f6 (extensão máxima 76)
        inicios: [0, 0.04, 0.08, 0.12, 0.16, 0.22, 0.28, 0.70]
      }
    }
  };

  var imgHeroi = {};    // 'guerreiro|idle|3' → Image (só depois do onload)
  var carregado = {};   // classe → true (TODOS os frames prontos)
  var iniciado = false, pendentes = 0, cbFinal = null;

  function chaveHeroi(c, a, i) { return c + '|' + a + '|' + i; }

  // o jogo fala 'attack' (chave do anim.js/batalha.js) e o arquivo é
  // guerreiro-ataque-N.png (pt-BR) — traduz só na fronteira
  function arq(a) { return a === 'attack' ? 'ataque' : a; }

  function caminhoHeroi(c, a, i) {
    return 'assets/herois/' + c + '-' + a + '-' + i + '.png';
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

  // Pré-carrega todos os frames das classes com manifesto. cb roda
  // quando TODOS os pedidos assentaram (sucesso ou falha — falha
  // deixa o fallback procedural ativo). Idempotente.
  function carga(cb) {
    if (iniciado) { if (cb) cb(); return; }
    iniciado = true;
    cbFinal = cb || null;
    var classes = [];
    for (var c in HEROIS) if (HEROIS.hasOwnProperty(c)) classes.push(c);
    var total = 0;
    classes.forEach(function (cl) { total += nTotal(cl); });
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
    var ciclo = (anim === 'walk') ? CICLO.walk : CICLO.idle;
    return ciclo / qtd(cl, anim);
  }

  // frame do ataque pelo progresso p (0..1): asset usa a tabela de
  // inicios; procedural mantém a fórmula de sempre (floor(p×3))
  function frameAtaque(cl, p) {
    var d = def(cl, 'attack');
    if (temHeroi(cl, 'attack') && d && d.inicios) {
      var f = 0;
      for (var i = 0; i < d.inicios.length; i++) if (p >= d.inicios[i]) f = i;
      return f;
    }
    return Math.max(0, Math.min(2, Math.floor(p * 3)));
  }

  // desenha o frame em (x0, y0) — o espelhamento do `facing` é
  // externo (uma camada só, como o sprite procedural)
  function desenha(ctx, x0, y0, c, esc) {
    esc = esc || 1;
    ctx.drawImage(c.canvas, x0, y0, c.w * esc, c.h * esc);
  }

  // sonda p/ teste
  function info() {
    var classes = [];
    for (var c in HEROIS) if (HEROIS.hasOwnProperty(c)) classes.push(c);
    return {
      iniciado: iniciado, pendentes: pendentes,
      classes: classes, alt: ALT, cx: CX,
      carregado: JSON.parse(JSON.stringify(carregado))
    };
  }

  return {
    ALT: ALT, CX: CX, CICLO: CICLO,
    carga: carga, hero: hero, desenha: desenha,
    qtd: qtd, durFrame: durFrame, frameAtaque: frameAtaque,
    temHeroi: temHeroi, info: info,
    caminhoHeroi: caminhoHeroi
  };
})();
