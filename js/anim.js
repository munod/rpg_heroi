// Cache de frames animados (evita regenerar sprite a cada frame).
var Anim = (function () {
  var heroCache = {};
  var slimeCache = {};
  var morcegoCache = {};
  var aranhaCache = {};
  var treeCache = null;
  var rockCache = null;
  var iconeCache = {};

  function hero(look, anim, frame) {
    // classe e rar entram na chave: sem elas, trocar de classe/equipar
    // item melhor deixaria o sprite velho no cache (spec visual-heroi-arma)
    var k = [look.skin, look.hair, look.estilo, look.cloth, look.classe,
      look.rar, look.weapon, anim, frame].join('|');
    if (!heroCache[k]) heroCache[k] = Sprite.heroCanvas(look, anim, frame);
    return heroCache[k];
  }

  function slime(cor, frame, chave) {
    var k = cor + '|' + frame + '|' + (chave || '');
    if (!slimeCache[k]) slimeCache[k] = Sprite.slimeCanvas(cor, frame, chave);
    return slimeCache[k];
  }

  function morcego(cor, frame, chave) {
    var k = cor + '|' + frame + '|' + (chave || '');
    if (!morcegoCache[k]) morcegoCache[k] = Sprite.morcegoCanvas(cor, frame, chave);
    return morcegoCache[k];
  }

  function aranha(cor, frame, chave) {
    var k = cor + '|' + frame + '|' + (chave || '');
    if (!aranhaCache[k]) aranhaCache[k] = Sprite.aranhaCanvas(cor, frame, chave);
    return aranhaCache[k];
  }

  function tree() {
    if (!treeCache) treeCache = Sprite.treeCanvas();
    return treeCache;
  }

  // Ícone de item (spec icones-itens): chave = tipo + cor do acento
  // (raridade) — trocar de raridade tem que trocar o sprite.
  function icone(tipo, cor) {
    var k = (tipo || '?') + '|' + (cor || '');
    if (!iconeCache[k]) iconeCache[k] = Sprite.iconeCanvas(tipo, cor);
    return iconeCache[k];
  }

  function rock() {
    if (!rockCache) rockCache = Sprite.rockCanvas();
    return rockCache;
  }

  return { hero: hero, slime: slime, morcego: morcego, aranha: aranha,
    tree: tree, rock: rock, icone: icone };
})();
