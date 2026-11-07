// Magias automáticas por classe — procs/passivas, sem botão: o combate
// continua 100% automático (promessa do README). Cada classe tem 2 magias
// que desbloqueiam por nível (5 e 15) e disparam sozinhas nos gatilhos de
// Batalha: 'area' conta golpes, 'nuke'/'cura' rodam em timer e 'veneno'
// aplica dano contínuo por acerto.
var Magias = (function () {
  var LISTA = [
    // guerreiro — varredura contando golpes
    { id: 'golpe-bravo', classe: 'guerreiro', nivel: 5, tipo: 'area',
      nome: 'Golpe Embravecido', cor: '#ff8a5a', aCada: 7, mult: 1.2 },
    { id: 'terremoto', classe: 'guerreiro', nivel: 15, tipo: 'area',
      nome: 'Terremoto', cor: '#ffd866', aCada: 8, mult: 2.0 },
    // mago — nuke periódico + explosão arcana
    { id: 'bola-fogo', classe: 'mago', nivel: 5, tipo: 'nuke',
      nome: 'Bola de Fogo', cor: '#ff6b3a', intervalo: 4.5, mult: 1.8 },
    { id: 'nova-arcano', classe: 'mago', nivel: 15, tipo: 'area',
      nome: 'Nova Arcana', cor: '#8a6bff', aCada: 6, mult: 1.5 },
    // ladino — veneno contínuo + nuke
    { id: 'veneno', classe: 'ladino', nivel: 5, tipo: 'veneno',
      nome: 'Veneno', cor: '#7ed957', chance: 0.3, dps: 0.8, dur: 5 },
    { id: 'adaga-sombria', classe: 'ladino', nivel: 15, tipo: 'nuke',
      nome: 'Adaga Sombria', cor: '#b06bff', intervalo: 3.5, mult: 2.4 },
    // clérigo — cura periódica + castigo sagrado
    { id: 'bencao', classe: 'clerigo', nivel: 5, tipo: 'cura',
      nome: 'Bênção', cor: '#8ce08c', intervalo: 5, pct: 0.06 },
    { id: 'castigo', classe: 'clerigo', nivel: 15, tipo: 'nuke',
      nome: 'Castigo Sagrado', cor: '#ffe89a', intervalo: 4.5, mult: 2.2 }
  ];

  // magias de uma classe (todas, independente do nível)
  function magiasDe(classe) {
    var out = [];
    for (var i = 0; i < LISTA.length; i++) {
      if (LISTA[i].classe === classe) out.push(LISTA[i]);
    }
    return out;
  }

  // magias já desbloqueadas (nivel >= requisito), da mais avançada
  function ativas(classe, nivel) {
    var nv = (typeof nivel === 'number' && nivel >= 1) ? Math.floor(nivel) : 1;
    var out = [];
    var todas = magiasDe(classe);
    for (var i = 0; i < todas.length; i++) {
      if (todas[i].nivel <= nv) out.push(todas[i]);
    }
    return out;
  }

  // magia desbloqueada EXATAMENTE neste nível (para o aviso) — ou null
  function desbloqueada(classe, nivel) {
    var todas = magiasDe(classe);
    for (var i = 0; i < todas.length; i++) {
      if (todas[i].nivel === nivel) return todas[i];
    }
    return null;
  }

  return {
    LISTA: LISTA,
    magiasDe: magiasDe,
    ativas: ativas,
    desbloqueada: desbloqueada
  };
})();
