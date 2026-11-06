// Entrada: teclado + mouse, com estado "pressionado" (edge) por frame.
var Input = (function () {
  var down = {};
  var pressed = {};
  var typed = [];
  var mouse = { x: 0, y: 0, clicked: false, down: false };
  var canvas = null;

  var BLOQUEIA_SCROLL = {
    ArrowUp: 1, ArrowDown: 1, ArrowLeft: 1, ArrowRight: 1, Space: 1
  };

  function init(cv) {
    canvas = cv;

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

    window.addEventListener('blur', function () {
      down = {};
      pressed = {};
      mouse.down = false;
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
    cv.addEventListener('contextmenu', function (e) {
      e.preventDefault();
    });
  }

  function atualizaMouse(e) {
    var r = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
    mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
  }

  return {
    init: init,
    isDown: function (code) { return !!down[code]; },
    pressed: function (code) { return !!pressed[code]; },
    typed: typed,
    mouse: mouse,
    endFrame: function () {
      pressed = {};
      typed.length = 0;
      mouse.clicked = false;
    }
  };
})();
