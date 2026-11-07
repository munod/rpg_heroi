// Mapas do jogo: tema visual, inimigos e chefe de cada um.
// Ciclo de 100 ondas por mapa (FIM_MAPA em batalha.js) — a onda 100 é o
// chefe; vencendo, o jogo avança para o próximo mapa (onda 1 de novo).
// Coordenadas de obstáculos na arena 192×134 (mesma convenção de Batalha).
var Mapas = (function () {
  var LISTA = [
    {
      nome: 'Planície Verdejante',
      chao: {
        base: '#33703f', par: '#387a44', imp: '#2f6a3c',
        mancha: ['rgba(74,146,84,0.30)', 'rgba(34,86,48,0.30)'],
        flores: ['#e8d060', '#e88a9a', '#d8d8f0'],
        borda: '#5a4a2e', borda2: '#6b5a38'
      },
      obst: [
        { x: 18, y: 26, r: 7, tipo: 'tree', cx: 18, cy: 20 },
        { x: 174, y: 26, r: 7, tipo: 'tree', cx: 174, cy: 20 },
        { x: 16, y: 122, r: 5, tipo: 'rock', cx: 16, cy: 118 },
        { x: 176, y: 120, r: 5, tipo: 'rock', cx: 176, cy: 116 }
      ],
      inimigos: {
        comum: { tipo: 'slime', cor: '#4aa03a' },
        raro: { tipo: 'visgo', cor: '#7a4ac0' }
      },
      boss: { tipo: 'boss', nome: 'Slime Dourado', cor: '#d8a020', escala: 2.6 }
    },
    {
      nome: 'Cripta Congelada',
      chao: {
        base: '#2a3a52', par: '#31445e', imp: '#243247',
        mancha: ['rgba(90,120,170,0.28)', 'rgba(30,44,70,0.35)'],
        flores: ['#cfe4f4', '#9ec6e8', '#e8f2fa'],
        borda: '#3a4a66', borda2: '#4c6084'
      },
      obst: [
        { x: 30, y: 24, r: 6, tipo: 'rock', cx: 30, cy: 20 },
        { x: 162, y: 24, r: 6, tipo: 'rock', cx: 162, cy: 20 },
        { x: 96, y: 16, r: 6, tipo: 'rock', cx: 96, cy: 12 },
        { x: 16, y: 120, r: 5, tipo: 'rock', cx: 16, cy: 116 },
        { x: 176, y: 120, r: 5, tipo: 'rock', cx: 176, cy: 116 }
      ],
      inimigos: {
        comum: { tipo: 'slime', cor: '#5ac8e8' },      // gelema glacial
        raro: { tipo: 'morcego', cor: '#7a5aa8' }
      },
      boss: { tipo: 'boss', nome: 'Morcego Ancião', cor: '#8a3a5a',
              escala: 2.4, forma: 'morcego' }
    },
    {
      nome: 'Ninho Rubro',
      chao: {
        base: '#4a2028', par: '#562630', imp: '#3e1a22',
        mancha: ['rgba(140,60,50,0.30)', 'rgba(50,20,26,0.40)'],
        flores: ['#e87a3a', '#d8b04a', '#c84a2a'],
        borda: '#2e1418', borda2: '#5a3038'
      },
      obst: [
        { x: 30, y: 26, r: 6, tipo: 'rock', cx: 30, cy: 22 },
        { x: 162, y: 26, r: 6, tipo: 'rock', cx: 162, cy: 22 },
        { x: 96, y: 118, r: 5, tipo: 'rock', cx: 96, cy: 114 },
        { x: 16, y: 122, r: 5, tipo: 'rock', cx: 16, cy: 118 },
        { x: 176, y: 122, r: 5, tipo: 'rock', cx: 176, cy: 118 }
      ],
      inimigos: {
        comum: { tipo: 'aranha', cor: '#c84a3a' },
        raro: { tipo: 'visgo', cor: '#9a4ac0' }
      },
      boss: { tipo: 'boss', nome: 'Aranha Matriarca', cor: '#e85a2a',
              escala: 2.6, forma: 'aranha' }
    }
  ];

  // Tema do mapa n — mapas além da lista reutilizam o último (modo infinito).
  function info(n) {
    var m = (typeof n === 'number' && n >= 1 && isFinite(n)) ? Math.floor(n) : 1;
    return LISTA[Math.min(m, LISTA.length) - 1];
  }

  // Dificuldade (vida/dano) e recompensa (XP) do mapa n. Medir com
  // testes/ritmo.js antes de mexer — mapa 1 = 1 (a Config A vale sem troco).
  function forca(n) {
    var m = (typeof n === 'number' && n >= 1 && isFinite(n)) ? Math.floor(n) : 1;
    return 1 + (m - 1) * 0.75;
  }

  return { LISTA: LISTA, info: info, forca: forca };
})();
