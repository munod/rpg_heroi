// Entrada: teclado + mouse/toque, com estado "pressionado" (edge) por frame.
var Input = (function () {
  var down = {};
  var pressed = {};
  var typed = [];
  var wheelY = 0;           // deltaY acumulado do frame (rolagem)
  var mouse = { x: 0, y: 0, clicked: false, down: false };
  var canvas = null;
  // dimensões do JOGO (espaço lógico): o ponteiro é mapeado contra o
  // retângulo real na tela, independente do tamanho do backing store
  var larg = 768, alt = 432;

  var BLOQUEIA_SCROLL = {
    ArrowUp: 1, ArrowDown: 1, ArrowLeft: 1, ArrowRight: 1, Space: 1
  };

  function init(cv, jLarg, jAlt) {
    canvas = cv;
    if (jLarg) larg = jLarg;
    if (jAlt) alt = jAlt;

    window.addEventListener('keydown', function (e) {
      // repetição (segurar) só conta pro Backspace: apagar letra a letra
      if (!down[e.code] || (e.repeat && e.code === 'Backspace')) {
        pressed[e.code] = true;
      }
      down[e.code] = true;
      if (BLOQUEIA_SCROLL[e.code]) e.preventDefault();
      if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.length === 1) {
        typed.push(e.key);
      }
    });

    window.addEventListener('keyup', function (e) {
      down[e.code] = false;
    });

    // rolagem (wheel): acumula o deltaY do frame — consumido por quem
    // precisa (aba Stats) via Input.roda(); o endFrame zera todo frame
    window.addEventListener('wheel', function (e) {
      wheelY += e.deltaY;
    });

    window.addEventListener('blur', function () {
      down = {};
      pressed = {};
      mouse.down = false;
      dedo = null;
    });

    cv.addEventListener('mousemove', atualizaMouse);
    cv.addEventListener('mousedown', function (e) {
      atualizaMouse(e);
      mouse.down = true;
      mouse.clicked = true;
    });
    window.addEventListener('mouseup', function () {
      mouse.down = false;
    });

    // touch: {passive:false} porque touchstart/touchmove em window são
    // passive por padrão no Chrome e o preventDefault seria ignorado
    cv.addEventListener('touchstart', toqueComeca, { passive: false });
    cv.addEventListener('touchmove', toqueMove, { passive: false });
    window.addEventListener('touchend', toqueTermina, { passive: false });
    window.addEventListener('touchcancel', toqueTermina, { passive: false });
    cv.addEventListener('contextmenu', function (e) {
      e.preventDefault();
    });
  }

  function atualizaPonteiro(cx, cy) {
    var r = canvas.getBoundingClientRect();
    mouse.x = (cx - r.left) * (larg / r.width);
    mouse.y = (cy - r.top) * (alt / r.height);
  }

  function atualizaMouse(e) {
    atualizaPonteiro(e.clientX, e.clientY);
  }

  // A largura do jogo muda com o aspecto da tela (main.js resize); o
  // ponteiro é mapeado contra larg/alt, então precisa acompanhar.
  function ajusta(jLarg, jAlt) {
    larg = jLarg;
    alt = jAlt;
  }

  // ------------------------------------------------------------ toque
  // Touch -> mesmo ponteiro do mouse: touchstart = mousedown (down +
  // clicked), touchmove arrasta, touchend/touchcancel solta. O
  // preventDefault mata a rolagem/zoom do navegador E o mouse sintético
  // (que duplicaria o clique). Só o primeiro dedo controla; o dedo que
  // começou é o que vale até terminar (identifier).
  var dedo = null;

  function achaDedo(e) {
    for (var i = 0; i < e.touches.length; i++) {
      if (e.touches[i].identifier === dedo) return e.touches[i];
    }
    return null;
  }

  function toqueComeca(e) {
    if (dedo !== null || !e.touches.length) { e.preventDefault(); return; }
    var t = e.touches[0];
    dedo = t.identifier;
    atualizaPonteiro(t.clientX, t.clientY);
    mouse.down = true;
    mouse.clicked = true;
    e.preventDefault();
  }

  function toqueMove(e) {
    var t = achaDedo(e);
    if (t) atualizaPonteiro(t.clientX, t.clientY);
    e.preventDefault();
  }

  function toqueTermina(e) {
    if (dedo !== null && !achaDedo(e)) {
      // nosso dedo saiu da lista de toques ativos -> soltou
      dedo = null;
      mouse.down = false;
    }
    e.preventDefault();
  }

  return {
    init: init,
    ajusta: ajusta,
    pressed: function (code) { return !!pressed[code]; },
    typed: typed,
    // deltaY acumulado neste frame (zerado no endFrame — padrão typed)
    roda: function () { return wheelY; },
    mouse: mouse,
    endFrame: function () {
      pressed = {};
      typed.length = 0;
      wheelY = 0;
      mouse.clicked = false;
    }
  };
})();
