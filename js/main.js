// Bootstrap: canvas, cenas, personagem atual.
var Game = (function () {
  var W = 384, H = 216;
  var canvas = null;
  var ctx = null;
  var scenes = {};
  var current = null;
  var atual = '';
  var personagem = null;

  function init() {
    canvas = document.getElementById('game');
    ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    Input.init(canvas);
    UI.setContext(ctx);

    personagem = Salvar.ultimo() || Personagem.novo();

    // a criação/seleção é a tela inicial; o jogo só abre por JOGAR
    scenes.selecao = Selecao;
    scenes.jogo = Jogo;

    resize();
    window.addEventListener('resize', resize);

    setScene('selecao');
    Loop.start();
  }

  function resize() {
    var s = Math.max(1, Math.min(
      Math.floor(window.innerWidth / W),
      Math.floor(window.innerHeight / H)
    ));
    canvas.style.width = (W * s) + 'px';
    canvas.style.height = (H * s) + 'px';
  }

  function setScene(name, params) {
    var s = scenes[name];
    if (!s) return;
    current = s;
    atual = name;
    if (s.enter) s.enter(params || {});
  }

  function update(dt) {
    if (current && current.update) current.update(dt);
  }

  function render() {
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    if (current && current.render) current.render(ctx);
  }

  return {
    W: W,
    H: H,
    init: init,
    update: update,
    render: render,
    setScene: setScene,
    get cena() { return atual; },
    get personagem() { return personagem; },
    set personagem(v) { personagem = v; }
  };
})();

window.addEventListener('load', Game.init);
