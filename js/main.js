// Bootstrap: canvas, cenas, personagem atual.
var Game = (function () {
  var W = 768, H = 432;      // espaço do jogo (coordenadas de UI e mundo)
  var esc = 1;               // escala do backing store (nítida em retina)
  var canvas = null;
  var ctx = null;
  var scenes = {};
  var current = null;
  var atual = '';
  var personagem = null;

  function init() {
    canvas = document.getElementById('game');
    // resize ANTES do getContext: o buffer precisa nascer no tamanho final
    // (o rasterizador de testes aloca na primeira chamada)
    resize();
    ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    Input.init(canvas, W, H);
    UI.setContext(ctx);

    personagem = Salvar.ultimo() || Personagem.novo();

    // a criação/seleção é a tela inicial; o jogo só abre por JOGAR
    scenes.selecao = Selecao;
    scenes.jogo = Jogo;

    window.addEventListener('resize', resize);

    setScene('selecao');
    Loop.start();
  }

  // Escala responsiva em duas camadas:
  //  - CSS: escala fracionária que PREENCHE a tela (paisagem no celular
  //    aproveita tudo; antes só escala inteira e o jogo ficava miúdo);
  //  - backing: pixels inteiros (floor de escala × devicePixelRatio) para
  //    o pixel art e o texto nascerem nítidos, sem reamostragem.
  // O retângulo real vem do getBoundingClientRect no Input, então qualquer
  // divergência entre CSS e backing continua mapeando clique certinho.
  function resize() {
    var dpr = window.devicePixelRatio || 1;
    // a #tela respeita o safe-area do celular; sem ela (harness), a janela
    var tel = document.getElementById('tela');
    var pw = (tel && tel.clientWidth) || window.innerWidth;
    var ph = (tel && tel.clientHeight) || window.innerHeight;
    var escala = Math.min(pw / W, ph / H);
    if (!(escala > 0)) escala = 1;
    esc = Math.max(1, Math.floor(escala * dpr));
    canvas.style.width = Math.round(W * escala) + 'px';
    canvas.style.height = Math.round(H * escala) + 'px';
    var bw = W * esc, bh = H * esc;
    if (canvas.width !== bw) canvas.width = bw;
    if (canvas.height !== bh) canvas.height = bh;
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
    // todas as cenas desenham em coordenadas de jogo (W×H); o transform
    // leva isso para os pixels do backing (esc) — setTransform por frame
    // também reancora depois de um resize (que zera o contexto)
    ctx.setTransform(esc, 0, 0, esc, 0, 0);
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
