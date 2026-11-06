// Game loop: requestAnimationFrame com dt limitado.
var Loop = (function () {
  var last = 0;

  function start() {
    last = performance.now();
    requestAnimationFrame(frame);
  }

  function frame(t) {
    var dt = (t - last) / 1000;
    last = t;
    if (dt < 0) dt = 0;
    if (dt > 0.05) dt = 0.05;

    Game.update(dt);
    Game.render();
    Input.endFrame();

    requestAnimationFrame(frame);
  }

  return { start: start };
})();
