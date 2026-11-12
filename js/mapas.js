// Mapas do jogo: tema visual, inimigos e chefe de cada MUNDO.
// Estrutura de campanha (spec mundos): 10 mundos × 10 mapas × 100 ondas
// (FIM_MAPA em batalha.js) — a onda 100 de cada mapa é o chefe; vencido,
// o jogo avança para o próximo mapa (onda 1 de novo). O tema (chão,
// obstáculos, inimigos, chefe) é do MUNDO: info(n) resolve pelo nº do
// mundo, e no modo infinito (mapa 101+) os mundos CICLAM (mundo 11 =
// tema do mundo 1). Bug corrigido aqui: a lista antiga tinha 3 temas e
// clampa em Math.min(m, 3) — do mapa 4 em diante o chão nunca mudava.
// Obstáculos por tema: TIPOS + densidade — as posições vêm do gerador
// procedural (Perlin com semente do mapa, em batalha.js), na base
// 192×134 (mesma convenção de Batalha).
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
      obst: { tipos: ['tree', 'rock'], qtd: 4 },
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
      obst: { tipos: ['rock'], qtd: 5 },
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
      obst: { tipos: ['rock'], qtd: 5 },
      inimigos: {
        comum: { tipo: 'aranha', cor: '#c84a3a' },
        raro: { tipo: 'visgo', cor: '#9a4ac0' }
      },
      boss: { tipo: 'boss', nome: 'Aranha Matriarca', cor: '#e85a2a',
              escala: 2.6, forma: 'aranha' }
    },
    // ---- mundos 4-10 (novos — era aqui que o chão travava no tema 3)
    {
      nome: 'Deserto Escaldante',
      chao: {
        base: '#a8884a', par: '#b29254', imp: '#9c7c42',
        mancha: ['rgba(180,150,90,0.30)', 'rgba(140,110,60,0.35)'],
        flores: ['#e8d89a', '#d8c070', '#c8a850'],
        borda: '#7a6030', borda2: '#8f7440'
      },
      obst: { tipos: ['rock'], qtd: 5 },
      inimigos: {
        comum: { tipo: 'slime', cor: '#c8a860' },      // bola de areia
        raro: { tipo: 'aranha', cor: '#b08840' }       // escorpião
      },
      boss: { tipo: 'boss', nome: 'Escorpião Rei', cor: '#d8a840',
              escala: 2.8, forma: 'aranha' }
    },
    {
      nome: 'Pântano Venenoso',
      chao: {
        base: '#2f4a38', par: '#36543f', imp: '#294131',
        mancha: ['rgba(70,120,80,0.30)', 'rgba(30,60,45,0.40)'],
        flores: ['#9ad84a', '#7ec03a', '#c8e86a'],
        borda: '#1f3326', borda2: '#2c4536'
      },
      obst: { tipos: ['tree', 'rock'], qtd: 5 },
      inimigos: {
        comum: { tipo: 'slime', cor: '#5a9a4a' },   // intacto (R-MON-3)
        raro: { tipo: 'regenerador', cor: '#8ac040' }
      },
      boss: { tipo: 'boss', nome: 'Baba do Pântano', cor: '#6ab04a',
              escala: 3.0 }
    },
    {
      nome: 'Floresta Noturna',
      chao: {
        base: '#1e2a40', par: '#243249', imp: '#1a2438',
        mancha: ['rgba(40,70,110,0.30)', 'rgba(20,30,50,0.40)'],
        flores: ['#6ac0e8', '#4a9ac8', '#9ae0f4'],
        borda: '#141c2e', borda2: '#22304a'
      },
      obst: { tipos: ['tree'], qtd: 6 },
      inimigos: {
        comum: { tipo: 'morcego', cor: '#4a6a9a' },  // intacto (R-MON-3)
        raro: { tipo: 'atirador', cor: '#5a4a8a' }
      },
      boss: { tipo: 'boss', nome: 'Príncipe das Trevas', cor: '#7a3a9a',
              escala: 2.8, forma: 'morcego' }
    },
    {
      nome: 'Forja Abissal',
      chao: {
        base: '#4a2a20', par: '#543226', imp: '#42241a',
        mancha: ['rgba(200,90,30,0.30)', 'rgba(60,30,20,0.40)'],
        flores: ['#ff9a4a', '#e87a2a', '#ffc060'],
        borda: '#2e1a12', borda2: '#3e2618'
      },
      obst: { tipos: ['rock'], qtd: 6 },
      inimigos: {
        comum: { tipo: 'visgo', cor: '#e86a2a' },  // intacto (gota de lava)
        raro: { tipo: 'regenerador', cor: '#c84a3a' }
      },
      boss: { tipo: 'boss', nome: 'Golem de Brasa', cor: '#ff6a2a',
              escala: 3.2 }
    },
    {
      nome: 'Ruínas Celestiais',
      chao: {
        base: '#b8b0c8', par: '#c2bad2', imp: '#aea6c0',
        mancha: ['rgba(240,240,255,0.40)', 'rgba(170,160,200,0.35)'],
        flores: ['#ffe89a', '#f0e0b0', '#ffffff'],
        borda: '#8a80a8', borda2: '#9e94b8'
      },
      obst: { tipos: ['rock'], qtd: 4 },
      inimigos: {
        comum: { tipo: 'morcego', cor: '#e8d8f0' },   // intacto (R-MON-3)
        raro: { tipo: 'atirador', cor: '#c0a8e8' }
      },
      boss: { tipo: 'boss', nome: 'Seráfico Caído', cor: '#b090e0',
              escala: 2.6, forma: 'morcego' }
    },
    {
      nome: 'Vazio Abissal',
      chao: {
        base: '#241a38', par: '#2a2042', imp: '#1e1630',
        mancha: ['rgba(90,50,160,0.35)', 'rgba(30,20,50,0.45)'],
        flores: ['#a06aff', '#8a4aff', '#d0b0ff'],
        borda: '#120c20', borda2: '#1e1638'
      },
      obst: { tipos: ['rock'], qtd: 5 },
      inimigos: {
        comum: { tipo: 'visgo', cor: '#8a4aff' },     // intacto (R-MON-3)
        raro: { tipo: 'drenador', cor: '#b06aff' }
      },
      boss: { tipo: 'boss', nome: 'Leviatã do Vazio', cor: '#9a3aff',
              escala: 3.0, forma: 'aranha' }
    },
    {
      nome: 'Trono do Caos',
      chao: {
        base: '#2a1418', par: '#311a1e', imp: '#241014',
        mancha: ['rgba(140,30,40,0.35)', 'rgba(40,14,20,0.45)'],
        flores: ['#ff4a5a', '#d82a4a', '#ff8a9a'],
        borda: '#160a0e', borda2: '#241218'
      },
      obst: { tipos: ['rock'], qtd: 6 },
      inimigos: {
        comum: { tipo: 'aranha', cor: '#d83a5a' },    // intacto (R-MON-3)
        raro: { tipo: 'drenador', cor: '#a83a6a' }
      },
      boss: { tipo: 'boss', nome: 'Devorador de Mundos', cor: '#e82a5a',
              escala: 3.2, forma: 'aranha' }
    }
  ];

  var MAPAS_POR_MUNDO = 10;

  // nº validado do mapa (1, 2, 3…), como no info antigo
  function mapaValido(n) {
    return (typeof n === 'number' && n >= 1 && isFinite(n))
      ? Math.floor(n) : 1;
  }

  // Mundo do mapa n (1-10 na campanha; 11+ no modo infinito)
  function mundo(n) {
    return Math.ceil(mapaValido(n) / MAPAS_POR_MUNDO);
  }

  // Posição do mapa dentro do mundo (1-10)
  function noMundo(n) {
    return ((mapaValido(n) - 1) % MAPAS_POR_MUNDO) + 1;
  }

  // Tema do mapa n — por MUNDO, ciclando no modo infinito (mundo 11 →
  // tema do mundo 1). Cada mundo tem tema próprio (fix do chão do
  // mundo 4+: era travado no tema 3).
  function info(n) {
    var m = mundo(n);
    return LISTA[(m - 1) % LISTA.length];
  }

  // Multiplicador do mapa n — hoje só nos DROPs de item (itens.js). A
  // dificuldade/XP de combate vem da escala contínua de ondas (ondaTotal
  // em batalha.js). Medir com testes/ritmo.js antes de mexer em qualquer
  // das duas alavancas — mapa 1 = 1 (a Config A vale sem troco).
  function forca(n) {
    var m = mapaValido(n);
    return 1 + (m - 1) * 1.0;
  }

  return {
    LISTA: LISTA,
    MAPAS_POR_MUNDO: MAPAS_POR_MUNDO,
    info: info,
    forca: forca,
    mundo: mundo,
    noMundo: noMundo
  };
})();
