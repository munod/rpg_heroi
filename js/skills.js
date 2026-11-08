// Skills automáticas por classe — procs/passivas, sem botão: o combate
// continua 100% automático (promessa do README). Cada classe tem 5 skills
// que desbloqueiam por nível (5, 15, 25, 35 e 45) e disparam sozinhas nos
// gatilhos de Batalha: 'area' conta golpes, 'nuke'/'cura' rodam em timer,
// 'veneno' aplica dano contínuo por acerto, 'mobilidade' reposiciona o
// herói (ou afasta o bando) quando os inimigos se fecham e 'medo' faz os
// inimigos fugirem por alguns segundos.
var Skills = (function () {
  var LISTA = [
    // guerreiro — varredura contando golpes + controle de espaço
    { id: 'golpe-bravo', classe: 'guerreiro', nivel: 5, tipo: 'area',
      nome: 'Golpe Embravecido', cor: '#ff8a5a', aCada: 7, mult: 1.2 },
    { id: 'terremoto', classe: 'guerreiro', nivel: 15, tipo: 'area',
      nome: 'Terremoto', cor: '#ffd866', aCada: 8, mult: 2.0 },
    { id: 'empurrao', classe: 'guerreiro', nivel: 25, tipo: 'mobilidade',
      nome: 'Empurrão', cor: '#ffb066', modo: 'empurra',
      gatilho: 44, alcance: 64, impulso: 300, dur: 0.22, intervalo: 7 },
    { id: 'golpe-fulminante', classe: 'guerreiro', nivel: 35, tipo: 'nuke',
      nome: 'Golpe Fulminante', cor: '#ff6b3a', intervalo: 6, mult: 2.6 },
    { id: 'furia-guerreira', classe: 'guerreiro', nivel: 45, tipo: 'area',
      nome: 'Fúria Guerreira', cor: '#ff5a3a', aCada: 5, mult: 1.6 },
    // mago — projéteis e explosões à distância
    { id: 'bola-fogo', classe: 'mago', nivel: 5, tipo: 'nuke',
      nome: 'Bola de Fogo', cor: '#ff6b3a', intervalo: 4.5, mult: 1.8 },
    { id: 'nova-arcano', classe: 'mago', nivel: 15, tipo: 'area',
      nome: 'Nova Arcana', cor: '#8a6bff', aCada: 6, mult: 1.5 },
    { id: 'teleporte', classe: 'mago', nivel: 25, tipo: 'mobilidade',
      nome: 'Teleporte', cor: '#8a6bff', modo: 'blink',
      gatilho: 44, distancia: 96, intervalo: 8 },
    { id: 'meteoro', classe: 'mago', nivel: 35, tipo: 'nuke',
      nome: 'Meteoro', cor: '#ffb066', intervalo: 7, mult: 3.0 },
    { id: 'rajada-arcana', classe: 'mago', nivel: 45, tipo: 'area',
      nome: 'Rajada Arcana', cor: '#9a8bff', aCada: 5, mult: 1.8 },
    // ladino — adagas à distância e esquiva
    { id: 'veneno', classe: 'ladino', nivel: 5, tipo: 'veneno',
      nome: 'Veneno', cor: '#7ed957', chance: 0.3, dps: 0.8, dur: 5 },
    { id: 'adaga-sombria', classe: 'ladino', nivel: 15, tipo: 'nuke',
      nome: 'Adaga Sombria', cor: '#b06bff', intervalo: 3.5, mult: 2.4 },
    { id: 'esquiva', classe: 'ladino', nivel: 25, tipo: 'mobilidade',
      nome: 'Esquiva', cor: '#7ed957', modo: 'esquiva',
      gatilho: 40, distancia: 64, intervalo: 6 },
    { id: 'chuva-adagas', classe: 'ladino', nivel: 35, tipo: 'area',
      nome: 'Chuva de Adagas', cor: '#d8d8f0', aCada: 5, mult: 1.4 },
    { id: 'adaga-gemea', classe: 'ladino', nivel: 45, tipo: 'nuke',
      nome: 'Adaga Gêmea', cor: '#b06bff', intervalo: 2.6, mult: 1.8 },
    // clérigo — cura, castigo e medo
    { id: 'bencao', classe: 'clerigo', nivel: 5, tipo: 'cura',
      nome: 'Bênção', cor: '#8ce08c', intervalo: 5, pct: 0.06 },
    { id: 'castigo', classe: 'clerigo', nivel: 15, tipo: 'nuke',
      nome: 'Castigo Sagrado', cor: '#ffe89a', intervalo: 4.5, mult: 2.2 },
    { id: 'amedronta', classe: 'clerigo', nivel: 25, tipo: 'medo',
      nome: 'Amedronta', cor: '#c9a0ff',
      gatilho: 56, alcance: 56, dur: 3.5, intervalo: 9 },
    { id: 'oracao', classe: 'clerigo', nivel: 35, tipo: 'cura',
      nome: 'Oração Santificada', cor: '#8ce08c', intervalo: 4, pct: 0.10 },
    { id: 'julgamento', classe: 'clerigo', nivel: 45, tipo: 'area',
      nome: 'Julgamento Divino', cor: '#ffe89a', aCada: 6, mult: 2.0 }
  ];

  // skills de uma classe (todas, independente do nível)
  function daClasse(classe) {
    var out = [];
    for (var i = 0; i < LISTA.length; i++) {
      if (LISTA[i].classe === classe) out.push(LISTA[i]);
    }
    return out;
  }

  // skills já desbloqueadas (nivel >= requisito), da mais avançada
  function ativas(classe, nivel) {
    var nv = (typeof nivel === 'number' && nivel >= 1) ? Math.floor(nivel) : 1;
    var out = [];
    var todas = daClasse(classe);
    for (var i = 0; i < todas.length; i++) {
      if (todas[i].nivel <= nv) out.push(todas[i]);
    }
    return out;
  }

  // ---- loadout (gestão estratégica) -----------------------------------
  // Teto de skills ativas por vez. O loadout é seleção pura do jogador
  // (p.loadout = ids); sem seleção válida — automático — valem as
  // LIMITE mais avançadas desbloqueadas. Mínimo 1 é garantido pela UI.
  var LIMITE = 3;

  function automaticas(desb) {
    return desb.slice(Math.max(0, desb.length - LIMITE));
  }

  // skills que o combate vai executar para o personagem
  function carregadas(p) {
    var desb = ativas(p ? p.classe : null, p ? p.nivel : 1);
    var sel = p && p.loadout;
    if (Array.isArray(sel) && sel.length) {
      var out = [];
      for (var i = 0; i < desb.length; i++) {
        if (sel.indexOf(desb[i].id) >= 0) out.push(desb[i]);
      }
      // seleção da classe antiga (troca direta): volta pro automático
      if (out.length) return out.slice(0, LIMITE);
    }
    return automaticas(desb);
  }

  // skill desbloqueada EXATAMENTE neste nível (para o aviso) — ou null
  function desbloqueada(classe, nivel) {
    var todas = daClasse(classe);
    for (var i = 0; i < todas.length; i++) {
      if (todas[i].nivel === nivel) return todas[i];
    }
    return null;
  }

  // próxima skill a desbloquear (ainda não alcançada) — ou null quando
  // a classe já tem todas
  function proxima(classe, nivel) {
    var nv = (typeof nivel === 'number' && nivel >= 1) ? Math.floor(nivel) : 1;
    var todas = daClasse(classe);
    for (var i = 0; i < todas.length; i++) {
      if (todas[i].nivel > nv) return todas[i];
    }
    return null;
  }

  return {
    LISTA: LISTA,
    LIMITE: LIMITE,
    daClasse: daClasse,
    ativas: ativas,
    carregadas: carregadas,
    desbloqueada: desbloqueada,
    proxima: proxima
  };
})();
