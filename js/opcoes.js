// Opções do jogo (spec opcoes) — toggles de apresentação com
// persistência em localStorage (rpg_opcoes_v1). Defaults = o
// comportamento de SEMPRE (tudo ligado) → nenhum teste existente muda
// e quem nunca abriu a opção joga exatamente como antes.
// Leitura defensiva: chave ausente/corrompida = padrão; gravação em
// try/catch (mesmo padrão de salvar.js — sem localStorage, memória).
// Declarado no index.html ANTES de efeitos.js (efeitos/batalha leem
// Opcoes.liga em runtime; a ordem do index resolve o carregamento).
var Opcoes = (function () {
  var CHAVE = 'rpg_opcoes_v1';
  var PADRAO = { shake: true, flash: true, num: true, poeira: true };
  var ks = ['shake', 'flash', 'num', 'poeira'];
  var ops = null;   // cache em memória (lê o storage 1× por sessão)

  function copia(src) {
    var out = {};
    for (var i = 0; i < ks.length; i++) out[ks[i]] = !!src[ks[i]];
    return out;
  }

  function le() {
    if (ops) return ops;
    ops = copia(PADRAO);
    // acessibilidade: sem opção salva, respeita o sistema — quem pediu
    // menos movimento começa com shake/flash desligados (religável na
    // própria tela de opções; não sobrescreve escolha salva)
    try {
      if (typeof window !== 'undefined' && window.matchMedia &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        ops.shake = false;
        ops.flash = false;
      }
    } catch (e) { /* sem matchMedia: fica no padrão */ }
    try {
      var raw = localStorage.getItem(CHAVE);
      if (!raw) return ops;
      var j = JSON.parse(raw);
      if (j && typeof j === 'object') {
        for (var i = 0; i < ks.length; i++) {
          if (typeof j[ks[i]] === 'boolean') ops[ks[i]] = j[ks[i]];
        }
      }
    } catch (e) { /* sem storage/JSON corrompido: fica no padrão */ }
    return ops;
  }

  function grava() {
    try { localStorage.setItem(CHAVE, JSON.stringify(ops)); }
    catch (e) { /* sem suporte: vale a sessão */ }
  }

  function liga(chave) {
    if (ks.indexOf(chave) < 0) return true;   // chave desconhecida = padrão
    return le()[chave];
  }

  function alterna(chave) {
    if (ks.indexOf(chave) < 0) return true;
    var o = le();
    o[chave] = !o[chave];
    grava();
    return o[chave];
  }

  // sonda p/ teste/UI: {shake, flash, num, poeira}
  function estado() { return copia(le()); }

  return { liga: liga, alterna: alterna, estado: estado, CHAVE: CHAVE };
})();
