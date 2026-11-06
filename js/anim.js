// Cache de frames animados (evita regenerar sprite a cada frame).
var Anim = (function () {
  var heroCache = {};
  var slimeCache = {};
  var treeCache = null;
  var rockCache = null;

  function hero(look, anim, frame) {
    var k = [look.skin, look.hair, look.estilo, look.cloth, look.weapon, anim, frame].join('|');
    if (!heroCache[k]) heroCache[k] = Sprite.heroCanvas(look, anim, frame);
    return heroCache[k];
  }

  function slime(cor, frame) {
    var k = cor + '|' + frame;
    if (!slimeCache[k]) slimeCache[k] = Sprite.slimeCanvas(cor, frame);
    return slimeCache[k];
  }

  function tree() {
    if (!treeCache) treeCache = Sprite.treeCanvas();
    return treeCache;
  }

  function rock() {
    if (!rockCache) rockCache = Sprite.rockCanvas();
    return rockCache;
  }

  return { hero: hero, slime: slime, tree: tree, rock: rock };
})();
