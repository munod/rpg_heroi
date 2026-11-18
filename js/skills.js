// Skills automáticas por classe — procs/passivas, sem botão: o combate
// continua 100% automático (promessa do README). Cada classe tem 8
// skills que desbloqueiam por nível (5, 15, 25, 35, 45, 60, 150 e 400)
// e disparam sozinhas nos gatilhos de Batalha: 'area' conta golpes,
// 'nuke'/'cura' rodam em timer, 'veneno' aplica dano contínuo por
// acerto, 'mobilidade' reposiciona o herói (ou afasta o bando) quando
// os inimigos se fecham e 'medo' faz os inimigos fugirem por alguns
// segundos. ÁRVORE COM RAMOS (spec arvore-skills): toda skill tem 2
// ramos com mods numéricos — o jogador escolhe; sem escolha vale a
// BASE NEUTRA (valores originais intactos).
var Skills = (function () {
  var LISTA = [
    // guerreiro — varredura contando golpes + controle de espaço
    { id: 'golpe-bravo', classe: 'guerreiro', nivel: 5, tipo: 'area',
      nome: 'Golpe Embravecido', cor: '#ff8a5a', aCada: 7, mult: 1.2,
      ramos: [
        { id: 'largada', nome: 'Largada', efeito: 'varredura forte, rara',
          mods: { aCada: 1.4, mult: 1.35 } },
        { id: 'pressa', nome: 'Pressa', efeito: 'varredura seguida, fraca',
          mods: { aCada: 0.7, mult: 0.8 } }
      ] },
    { id: 'terremoto', classe: 'guerreiro', nivel: 15, tipo: 'area',
      nome: 'Terremoto', cor: '#ffd866', aCada: 8, mult: 2.0,
      ramos: [
        { id: 'abrisso', nome: 'Abrisso', efeito: 'devastador, a cada 12',
          mods: { aCada: 1.5, mult: 1.4 } },
        { id: 'tremor', nome: 'Tremor', efeito: 'constante, mais leve',
          mods: { aCada: 0.75, mult: 0.75 } }
      ] },
    { id: 'empurrao', classe: 'guerreiro', nivel: 25, tipo: 'mobilidade',
      nome: 'Empurrão', cor: '#ffb066', modo: 'empurra',
      gatilho: 44, alcance: 64, impulso: 300, dur: 0.22, intervalo: 7,
      ramos: [
        { id: 'bastiao', nome: 'Bastião', efeito: 'afasta mais longe, espera mais',
          mods: { intervalo: 1.4, alcance: 1.4 } },
        { id: 'ruptura', nome: 'Ruptura', efeito: 'empurra forte, janela curta',
          mods: { impulso: 1.5, dur: 0.6 } }
      ] },
    { id: 'golpe-fulminante', classe: 'guerreiro', nivel: 35, tipo: 'nuke',
      nome: 'Golpe Fulminante', cor: '#ff6b3a', intervalo: 6, mult: 2.6,
      ramos: [
        { id: 'impacto', nome: 'Impacto', efeito: 'golpe pesado, espera mais',
          mods: { intervalo: 1.4, mult: 1.4 } },
        { id: 'fulgur', nome: 'Fulgur', efeito: 'golpe rápido, mais leve',
          mods: { intervalo: 0.7, mult: 0.75 } }
      ] },
    { id: 'furia-guerreira', classe: 'guerreiro', nivel: 45, tipo: 'area',
      nome: 'Fúria Guerreira', cor: '#ff5a3a', aCada: 5, mult: 1.6,
      ramos: [
        { id: 'tita', nome: 'Titã', efeito: 'varredura brutal, espaçada',
          mods: { aCada: 1.6, mult: 1.45 } },
        { id: 'frenesi', nome: 'Frenesi', efeito: 'golpes colados, mais fracos',
          mods: { aCada: 0.6, mult: 0.8 } }
      ] },
    // guerreiro — árvore maior (spec arvore-skills): sustain, burst e controle
    { id: 'impeto-vital', classe: 'guerreiro', nivel: 60, tipo: 'cura',
      nome: 'Ímpeto Vital', cor: '#8ce08c', intervalo: 7, pct: 0.05,
      ramos: [
        { id: 'vigor', nome: 'Vigor', efeito: 'cura grande, espera mais',
          mods: { intervalo: 1.4, pct: 1.5 } },
        { id: 'folego', nome: 'Fôlego', efeito: 'cura frequente, miúda',
          mods: { intervalo: 0.7, pct: 0.75 } }
      ] },
    { id: 'estocada', classe: 'guerreiro', nivel: 150, tipo: 'nuke',
      nome: 'Estocada Brutal', cor: '#ff6b3a', intervalo: 9, mult: 3.4,
      ramos: [
        { id: 'bruto', nome: 'Bruto', efeito: 'fura tudo, devagar',
          mods: { intervalo: 1.4, mult: 1.35 } },
        { id: 'raso', nome: 'Raso', efeito: 'estocadas leves, seguidas',
          mods: { intervalo: 0.65, mult: 0.75 } }
      ] },
    { id: 'grito-guerra', classe: 'guerreiro', nivel: 400, tipo: 'medo',
      nome: 'Grito de Guerra', cor: '#ffb066',
      gatilho: 52, alcance: 60, dur: 3, intervalo: 11,
      ramos: [
        { id: 'pavor', nome: 'Pavor', efeito: 'afasta por muito tempo, raro',
          mods: { dur: 1.5, intervalo: 1.4 } },
        { id: 'eco', nome: 'Eco', efeito: 'eco frequente, medo breve',
          mods: { intervalo: 0.7, dur: 0.7 } }
      ] },
    // mago — projéteis e explosões à distância
    { id: 'bola-fogo', classe: 'mago', nivel: 5, tipo: 'nuke',
      nome: 'Bola de Fogo', cor: '#ff6b3a', intervalo: 4.5, mult: 1.8,
      ramos: [
        { id: 'chama', nome: 'Chama', efeito: 'chama intensa, mais lenta',
          mods: { intervalo: 1.35, mult: 1.5 } },
        { id: 'veloz', nome: 'Veloz', efeito: 'rajada rápida, fraca',
          mods: { intervalo: 0.7, mult: 0.75 } }
      ] },
    { id: 'nova-arcano', classe: 'mago', nivel: 15, tipo: 'area',
      nome: 'Nova Arcana', cor: '#8a6bff', aCada: 6, mult: 1.5,
      ramos: [
        { id: 'eclipse', nome: 'Eclipse', efeito: 'nova devastadora, rara',
          mods: { aCada: 1.5, mult: 1.4 } },
        { id: 'fenda', nome: 'Fenda', efeito: 'estilhaços seguidos, leves',
          mods: { aCada: 0.67, mult: 0.8 } }
      ] },
    { id: 'teleporte', classe: 'mago', nivel: 25, tipo: 'mobilidade',
      nome: 'Teleporte', cor: '#8a6bff', modo: 'blink',
      gatilho: 44, distancia: 96, intervalo: 8,
      ramos: [
        { id: 'salto', nome: 'Salto', efeito: 'teleporte longo, espera mais',
          mods: { intervalo: 1.4, distancia: 1.4 } },
        { id: 'reflexo', nome: 'Reflexo', efeito: 'blink curto, frequente',
          mods: { intervalo: 0.7, distancia: 0.7 } }
      ] },
    { id: 'meteoro', classe: 'mago', nivel: 35, tipo: 'nuke',
      nome: 'Meteoro', cor: '#ffb066', intervalo: 7, mult: 3.0,
      ramos: [
        { id: 'colisao', nome: 'Colisão', efeito: 'impacto colossal, demorado',
          mods: { intervalo: 1.4, mult: 1.4 } },
        { id: 'brasa', nome: 'Brasa', efeito: 'brasa frequente, miúda',
          mods: { intervalo: 0.7, mult: 0.78 } }
      ] },
    { id: 'rajada-arcana', classe: 'mago', nivel: 45, tipo: 'area',
      nome: 'Rajada Arcana', cor: '#9a8bff', aCada: 5, mult: 1.8,
      ramos: [
        { id: 'ciclone', nome: 'Ciclone', efeito: 'rajada diluvial, espaçada',
          mods: { aCada: 1.5, mult: 1.4 } },
        { id: 'fagulha', nome: 'Fagulha', efeito: 'fagulhas seguidas, leves',
          mods: { aCada: 0.6, mult: 0.8 } }
      ] },
    // mago — árvore maior: veneno arcano, controle e sustain
    { id: 'toxina-arcano', classe: 'mago', nivel: 60, tipo: 'veneno',
      nome: 'Toxina Arcana', cor: '#7ed957', chance: 0.25, dps: 0.6, dur: 5,
      ramos: [
        { id: 'necrose', nome: 'Necrose', efeito: 'aplica fácil, tick fraco',
          mods: { chance: 1.4, dps: 0.75 } },
        { id: 'agonia', nome: 'Agônia', efeito: 'difícil de aplicar, drena forte',
          mods: { chance: 0.7, dps: 1.5 } }
      ] },
    { id: 'horror-abissal', classe: 'mago', nivel: 150, tipo: 'medo',
      nome: 'Horror Abissal', cor: '#8a6bff',
      gatilho: 60, alcance: 64, dur: 4, intervalo: 12,
      ramos: [
        { id: 'tenebra', nome: 'Tenebra', efeito: 'pesadelo longo, demorado',
          mods: { dur: 1.5, intervalo: 1.35 } },
        { id: 'vulto', nome: 'Vulto', efeito: 'vulto frequente, breve',
          mods: { intervalo: 0.7, dur: 0.7 } }
      ] },
    { id: 'escudo-arcano', classe: 'mago', nivel: 400, tipo: 'cura',
      nome: 'Escudo Arcano', cor: '#8a6bff', intervalo: 9, pct: 0.05,
      ramos: [
        { id: 'egide', nome: 'Égide', efeito: 'escudo grosso, demora a recarregar',
          mods: { intervalo: 1.4, pct: 1.5 } },
        { id: 'pulso', nome: 'Pulso', efeito: 'pulsos segidos, miúdos',
          mods: { intervalo: 0.7, pct: 0.75 } }
      ] },
    // ladino — adagas à distância e esquiva
    { id: 'veneno', classe: 'ladino', nivel: 5, tipo: 'veneno',
      nome: 'Veneno', cor: '#7ed957', chance: 0.3, dps: 0.8, dur: 5,
      ramos: [
        { id: 'letal', nome: 'Letal', efeito: 'veneno forte, evapora rápido',
          mods: { dps: 1.5, dur: 0.7 } },
        { id: 'toxico', nome: 'Tóxico', efeito: 'prende em quase todo golpe, tick fraco',
          mods: { chance: 1.6, dps: 0.65 } }
      ] },
    { id: 'adaga-sombria', classe: 'ladino', nivel: 15, tipo: 'nuke',
      nome: 'Adaga Sombria', cor: '#b06bff', intervalo: 3.5, mult: 2.4,
      ramos: [
        { id: 'sombrio', nome: 'Sombrio', efeito: 'golpe demorado e certeiro',
          mods: { intervalo: 1.4, mult: 1.4 } },
        { id: 'ritmo', nome: 'Ritmo', efeito: 'adagas leves, sem parar',
          mods: { intervalo: 0.7, mult: 0.78 } }
      ] },
    { id: 'esquiva', classe: 'ladino', nivel: 25, tipo: 'mobilidade',
      nome: 'Esquiva', cor: '#7ed957', modo: 'esquiva',
      gatilho: 40, distancia: 64, intervalo: 6,
      ramos: [
        { id: 'planar', nome: 'Planar', efeito: 'desliza longe, espera mais',
          mods: { intervalo: 1.4, distancia: 1.4 } },
        { id: 'agil', nome: 'Ágil', efeito: 'deslize curto, frequente',
          mods: { intervalo: 0.7, distancia: 0.7 } }
      ] },
    { id: 'chuva-adagas', classe: 'ladino', nivel: 35, tipo: 'area',
      nome: 'Chuva de Adagas', cor: '#d8d8f0', aCada: 5, mult: 1.4,
      ramos: [
        { id: 'saraiva', nome: 'Saraiva', efeito: 'chuva pesada, espaçada',
          mods: { aCada: 1.5, mult: 1.4 } },
        { id: 'leve', nome: 'Leve', efeito: 'fio leve, sem parar',
          mods: { aCada: 0.6, mult: 0.8 } }
      ] },
    { id: 'adaga-gemea', classe: 'ladino', nivel: 45, tipo: 'nuke',
      nome: 'Adaga Gêmea', cor: '#b06bff', intervalo: 2.6, mult: 1.8,
      ramos: [
        { id: 'espelho', nome: 'Espelho', efeito: 'par de lâminas pesadas',
          mods: { intervalo: 1.4, mult: 1.4 } },
        { id: 'breve', nome: 'Breve', efeito: 'lâminas leves, sem parar',
          mods: { intervalo: 0.7, mult: 0.78 } }
      ] },
    // ladino — árvore maior: sustain, medo e dano executável
    { id: 'bandagem', classe: 'ladino', nivel: 60, tipo: 'cura',
      nome: 'Bandagem Rápida', cor: '#8ce08c', intervalo: 6, pct: 0.05,
      ramos: [
        { id: 'sutura', nome: 'Sutura', efeito: 'cura grande, demora a refazer',
          mods: { intervalo: 1.4, pct: 1.5 } },
        { id: 'firme', nome: 'Firme', efeito: 'reaperta sempre, miúdo',
          mods: { intervalo: 0.7, pct: 0.75 } }
      ] },
    { id: 'sombra-pavor', classe: 'ladino', nivel: 150, tipo: 'medo',
      nome: 'Sombra Pavorosa', cor: '#b06bff',
      gatilho: 44, alcance: 56, dur: 2.8, intervalo: 9,
      ramos: [
        { id: 'horror', nome: 'Horror', efeito: 'sombra demorada, rara',
          mods: { dur: 1.5, intervalo: 1.4 } },
        { id: 'vaga', nome: 'Vaga', efeito: 'vaga frequente, curta',
          mods: { intervalo: 0.7, dur: 0.7 } }
      ] },
    { id: 'adaga-perfurante', classe: 'ladino', nivel: 400, tipo: 'nuke',
      nome: 'Adaga Perfurante', cor: '#d8d8f0', intervalo: 8, mult: 3.6,
      ramos: [
        { id: 'furo', nome: 'Furo', efeito: 'perfuração única e brutal',
          mods: { intervalo: 1.4, mult: 1.35 } },
        { id: 'fluxo', nome: 'Fluxo', efeito: 'fluxo de lâminas, mais leve',
          mods: { intervalo: 0.65, mult: 0.75 } }
      ] },
    // clérigo — cura, castigo e medo
    { id: 'bencao', classe: 'clerigo', nivel: 5, tipo: 'cura',
      nome: 'Bênção', cor: '#8ce08c', intervalo: 5, pct: 0.06,
      ramos: [
        { id: 'graca', nome: 'Graça', efeito: 'bênção forte, demorada',
          mods: { intervalo: 1.4, pct: 1.45 } },
        { id: 'fervor', nome: 'Fervor', efeito: 'fervor constante, miúdo',
          mods: { intervalo: 0.7, pct: 0.78 } }
      ] },
    { id: 'castigo', classe: 'clerigo', nivel: 15, tipo: 'nuke',
      nome: 'Castigo Sagrado', cor: '#ffe89a', intervalo: 4.5, mult: 2.2,
      ramos: [
        { id: 'censura', nome: 'Censura', efeito: 'censura pesada, demorada',
          mods: { intervalo: 1.4, mult: 1.4 } },
        { id: 'toque', nome: 'Toque', efeito: 'toque leve, frequente',
          mods: { intervalo: 0.7, mult: 0.78 } }
      ] },
    { id: 'amedronta', classe: 'clerigo', nivel: 25, tipo: 'medo',
      nome: 'Amedronta', cor: '#c9a0ff',
      gatilho: 56, alcance: 56, dur: 3.5, intervalo: 9,
      ramos: [
        { id: 'terror', nome: 'Terror', efeito: 'terror longo, demorado',
          mods: { dur: 1.5, intervalo: 1.4 } },
        { id: 'sopro', nome: 'Sopro', efeito: 'sopro frequente, breve',
          mods: { intervalo: 0.7, dur: 0.7 } }
      ] },
    { id: 'oracao', classe: 'clerigo', nivel: 35, tipo: 'cura',
      nome: 'Oração Santificada', cor: '#8ce08c', intervalo: 4, pct: 0.10,
      ramos: [
        { id: 'hino', nome: 'Hino', efeito: 'hino potente, demorado',
          mods: { intervalo: 1.4, pct: 1.4 } },
        { id: 'louvor', nome: 'Louvor', efeito: 'louvor contínuo, mais leve',
          mods: { intervalo: 0.7, pct: 0.8 } }
      ] },
    { id: 'julgamento', classe: 'clerigo', nivel: 45, tipo: 'area',
      nome: 'Julgamento Divino', cor: '#ffe89a', aCada: 6, mult: 2.0,
      ramos: [
        { id: 'pena', nome: 'Pena', efeito: 'veredito devastador, raro',
          mods: { aCada: 1.5, mult: 1.4 } },
        { id: 'brado', nome: 'Brado', efeito: 'brado seguido, leve',
          mods: { aCada: 0.67, mult: 0.8 } }
      ] },
    // clérigo — árvore maior: mobilidade sagrada, praga e nuke celestial
    { id: 'passo-sagrado', classe: 'clerigo', nivel: 60, tipo: 'mobilidade',
      nome: 'Passo Sagrado', cor: '#ffe89a', modo: 'blink',
      gatilho: 44, distancia: 80, intervalo: 9,
      ramos: [
        { id: 'extase', nome: 'Éxtase', efeito: 'passo longo, demorado',
          mods: { intervalo: 1.4, distancia: 1.4 } },
        { id: 'voo', nome: 'Voo', efeito: 'passo curto, frequente',
          mods: { intervalo: 0.7, distancia: 0.7 } }
      ] },
    { id: 'peste-divina', classe: 'clerigo', nivel: 150, tipo: 'veneno',
      nome: 'Peste Divina', cor: '#b8e86a', chance: 0.3, dps: 0.7, dur: 6,
      ramos: [
        { id: 'praga', nome: 'Praga', efeito: 'praga forte, apaga rápido',
          mods: { dps: 1.5, dur: 0.7 } },
        { id: 'lenta', nome: 'Lenta', efeito: 'pega em quase tudo, tick fraco',
          mods: { chance: 1.6, dps: 0.7 } }
      ] },
    { id: 'ira-celestial', classe: 'clerigo', nivel: 400, tipo: 'nuke',
      nome: 'Ira Celestial', cor: '#ffe89a', intervalo: 10, mult: 4.0,
      ramos: [
        { id: 'colera', nome: 'Cólera', efeito: 'ira total, demora a virar',
          mods: { intervalo: 1.4, mult: 1.35 } },
        { id: 'raio', nome: 'Raio', efeito: 'raiões leves, sem parar',
          mods: { intervalo: 0.65, mult: 0.75 } }
      ] }
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

  // ---- ramos (spec arvore-skills) --------------------------------------
  // Mods NUMÉRICOS: fatores multiplicativos sobre os campos base. A
  // tabela de SENTIDO define o que é buff/nerf p/ a asserção de
  // sidegrade (seção 43): sentindo +1 = aumentar ajuda; -1 = aumentar
  // atrapalha. `gatilho` é proibido nos mods (polaridade ambígua:
  // fugir antes é seguro porém tira uptime).
  var SENTIDO = {
    mult: 1, pct: 1, chance: 1, dps: 1, dur: 1,
    distancia: 1, impulso: 1, alcance: 1,
    intervalo: -1, aCada: -1
  };

  // qual ramo está escolhido p/ esta skill (null = base neutra)
  function ramoDe(p, sk) {
    var r = p && p.ramos;
    return (r && typeof r === 'object' && typeof r[sk.id] === 'string')
      ? r[sk.id] : null;
  }

  // cópia da skill COM o ramo aplicado (fator × campo base). Sem ramo
  // válido = a própria skill (base neutra — os valores originais
  // intactos, p/ quem nunca mexeu: baseline medido não muda).
  // Fonte única do merge: carregadas repassa e a batalha continua
  // lendo CAMPOS (nenhum gatilho muda).
  function comRamo(sk, ramoId) {
    if (!Array.isArray(sk.ramos) || !sk.ramos.length) return sk;
    var r = null;
    for (var i = 0; i < sk.ramos.length; i++) {
      if (sk.ramos[i].id === ramoId) { r = sk.ramos[i]; break; }
    }
    if (!r || !r.mods) return sk;
    var out = {};
    for (var k in sk) {
      if (Object.prototype.hasOwnProperty.call(sk, k)) out[k] = sk[k];
    }
    for (var m in r.mods) {
      if (!Object.prototype.hasOwnProperty.call(r.mods, m)) continue;
      if (typeof out[m] !== 'number') continue;
      out[m] = out[m] * r.mods[m];
    }
    // aCada é INTEIRO (o gatilho area usa %) — arredonda p/ >= 1 ou o
    // proc fracionário nunca dispara
    if (typeof out.aCada === 'number') {
      out.aCada = Math.max(1, Math.round(out.aCada));
    }
    out.ramo = r.id;         // ramo aplicado (UI/testes)
    return out;
  }

  // ciclo puro do ramo: base → A → B → base (escolha do jogador;
  // libera o p.ramos; sem escolha = base neutra)
  function cicloRamo(p, sk) {
    if (!p || !Array.isArray(sk.ramos) || sk.ramos.length < 2) return null;
    var atual = ramoDe(p, sk);
    var prox = null;
    if (!atual) prox = sk.ramos[0].id;
    else if (atual === sk.ramos[0].id) prox = sk.ramos[1].id;
    if (!p.ramos || typeof p.ramos !== 'object') p.ramos = {};
    if (prox) p.ramos[sk.id] = prox;
    else delete p.ramos[sk.id];
    var vazio = true;
    for (var k in p.ramos) {
      if (Object.prototype.hasOwnProperty.call(p.ramos, k)) { vazio = false; break; }
    }
    if (vazio) p.ramos = null;
    return prox;
  }

  // ---- loadout (gestão estratégica) -----------------------------------
  // Teto de skills ativas POR NÍVEL (spec arvore-skills): 3 → 4 (nv 50)
  // → 5 (nv 150). LIMITE = teto ABSOLUTO (espelho do normalizaLoadout).
  // O loadout é seleção pura do jogador (p.loadout = ids); sem seleção
  // válida — automático — valem as `limite(nivel)` mais avançadas
  // desbloqueadas. Mínimo 1 é garantido pela UI.
  var LIMITE = 5;

  // ---- nível de skill (spec economia-de-pontos R-EDP-3) --------------
  // Investir PONTOS DE ATRIBUTO pra subir o nível de uma skill — o
  // segundo poço de gasto (custo de oportunidade: força vs skill).
  // SKILL_NV_MAX = espelho comentado de Personagem.SKILL_NV_MAX (o
  // save normaliza lá; fumaca confere que os dois batem).
  var SKILL_NV_MAX = 10;
  var SKILL_CUSTO_BASE = 10;    // custo do 1º nível (0 → 1)
  var SKILL_CUSTO_FATOR = 1.5;  // crescente: escolha profundo vs largo
  var SKILL_NV_PCT = 0.08;      // +8% de PODER por nível
  // campos de PODER escalam com o nível; frequência/gatilho NUNCA
  // (aCada/intervalo/chance/gatilho = o ritmo medido da skill)
  var CAMPOS_PODER = ['mult', 'pct', 'dps', 'impulso', 'dur', 'alcance'];

  function limite(nivel) {
    var nv = (typeof nivel === 'number' && nivel >= 1) ? Math.floor(nivel) : 1;
    if (nv >= 150) return 5;
    if (nv >= 50) return 4;
    return 3;
  }

  // custo para ir de nv → nv+1: round(10 × 1,5^nv) — 10, 15, 23, 34,
  // 51, 76, 114, 171, 256, 384 (zerar uma skill = 1.138 pontos ≈ 12%
  // da campanha; as 8 = quase todos os pontos — escolha real)
  function custoNivel(nv) {
    var n = (typeof nv === 'number' && nv >= 0) ? Math.floor(nv) : 0;
    return Math.round(SKILL_CUSTO_BASE * Math.pow(SKILL_CUSTO_FATOR, n));
  }

  // nível investido de uma skill (0 = nenhuma)
  function nvSkill(p, id) {
    var s = p && p.skillNv;
    return (s && typeof s === 'object' && typeof s[id] === 'number')
      ? s[id] : 0;
  }

  // compra até n níveis (Infinity = MAX): guarda desbloqueio, teto e
  // pontos — compra PARCIAL (para quando o saldo acaba, mesmo
  // espírito das guardas de Gestao.aplicar). Devolve os níveis subidos.
  function sobe(p, id, n) {
    if (!p) return 0;
    var sk = null;
    for (var i = 0; i < LISTA.length; i++) {
      if (LISTA[i].id === id) { sk = LISTA[i]; break; }
    }
    var nvP = (typeof p.nivel === 'number' && p.nivel >= 1) ? p.nivel : 1;
    if (!sk || sk.nivel > nvP) return 0;          // existe + desbloqueada
    if (!p.skillNv || typeof p.skillNv !== 'object') p.skillNv = {};
    var qtd = (n === Infinity) ? Infinity
      : ((typeof n === 'number' && n >= 1) ? Math.floor(n) : 1);
    var subiu = 0;
    while (subiu < qtd) {
      var nv = (typeof p.skillNv[id] === 'number') ? p.skillNv[id] : 0;
      if (nv >= SKILL_NV_MAX) break;
      var custo = custoNivel(nv);
      if ((p.pontos || 0) < custo) break;
      p.pontos -= custo;
      p.skillNv[id] = nv + 1;
      subiu++;
    }
    return subiu;
  }

  // cópia da skill COM o nível investido: campos de PODER × (1 + 8%×nv).
  // IDENTIDADE quando nv = 0 — quem não investe joga exatamente a
  // baseline medida (padrão "base neutra" do ramo).
  function aplicaNivel(sk, nv) {
    var n = (typeof nv === 'number' && nv > 0) ? Math.floor(nv) : 0;
    if (!n) return sk;
    var f = 1 + SKILL_NV_PCT * n;
    var out = {};
    for (var k in sk) {
      if (Object.prototype.hasOwnProperty.call(sk, k)) out[k] = sk[k];
    }
    for (var i = 0; i < CAMPOS_PODER.length; i++) {
      var c = CAMPOS_PODER[i];
      if (typeof out[c] === 'number') out[c] = out[c] * f;
    }
    out.nvSkill = n;               // sonda p/ UI e testes
    return out;
  }

  function automaticas(desb, lim) {
    return desb.slice(Math.max(0, desb.length - lim));
  }

  // skills que o combate vai executar para o personagem — COM o ramo
  // escolhido mergeado e o nível investido aplicado (fonte única: a
  // batalha lê campos e não sabe que skillNv existe)
  function carregadas(p) {
    var nv = p ? p.nivel : 1;
    var desb = ativas(p ? p.classe : null, nv);
    var lim = limite(nv);
    var sel = p && p.loadout;
    if (Array.isArray(sel) && sel.length) {
      var out = [];
      for (var i = 0; i < desb.length; i++) {
        if (sel.indexOf(desb[i].id) >= 0) {
          out.push(aplicaNivel(
            comRamo(desb[i], ramoDe(p, desb[i])),
            nvSkill(p, desb[i].id)));
        }
      }
      // seleção da classe antiga (troca direta): volta pro automático
      if (out.length) return out.slice(0, lim);
    }
    var auto = automaticas(desb, lim);
    for (var j = 0; j < auto.length; j++) {
      auto[j] = aplicaNivel(
        comRamo(auto[j], ramoDe(p, auto[j])), nvSkill(p, auto[j].id));
    }
    return auto;
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

  // ---- tooltip da skill (Leva 3): identidade + o que ela faz, com os
  // números dos próprios campos (sem texto solto em asserção de valor)
  var TIPO_TXT = {
    area: 'área', nuke: 'impacto', cura: 'cura', veneno: 'veneno',
    mobilidade: 'mobilidade', medo: 'medo'
  };

  // 1 casa decimal p/ os campos com mods (7×1.4 = 9.799999... → 9.8)
  function n1(v) { return Math.round(v * 10) / 10; }

  function efeitoLinha(sk) {
    if (sk.tipo === 'area') {
      return 'a cada ' + sk.aCada + ' golpes: varredura ×' + n1(sk.mult) +
        ' dano em tudo';
    }
    if (sk.tipo === 'nuke') {
      return 'a cada ' + n1(sk.intervalo) + 's: impacto ×' + n1(sk.mult) +
        ' dano no alvo';
    }
    if (sk.tipo === 'cura') {
      return 'a cada ' + n1(sk.intervalo) + 's: cura ' +
        Math.round(sk.pct * 100) + '% da vida máxima';
    }
    if (sk.tipo === 'veneno') {
      return Math.round(sk.chance * 100) +
        '% por golpe: veneno por ' + n1(sk.dur) + 's (dano contínuo)';
    }
    if (sk.tipo === 'mobilidade') {
      return 'foge/quando o bando chega a ' + n1(sk.gatilho) +
        'px (intervalo ' + n1(sk.intervalo) + 's)';
    }
    if (sk.tipo === 'medo') {
      return 'afasta os inimigos por ' + n1(sk.dur) + 's quando chegam a ' +
        n1(sk.gatilho) + 'px';
    }
    return '';
  }

  // tooltip: skill com os NÚMEROS DO ESTADO ATUAL (ramo aplicado) +
  // as linhas dos dois ramos e qual está ativo (árvore literal)
  function dicas(sk, ramoId, nvInvestido) {
    var atual = comRamo(sk, ramoId);
    var out = [[atual.nome, atual.cor]];
    out.push(['Nível ' + sk.nivel + ' · ' + (TIPO_TXT[sk.tipo] || sk.tipo),
      '#9a90b8']);
    // nível investido (R-EDP-3): quanto o investimento rende hoje
    if (typeof nvInvestido === 'number' && nvInvestido > 0) {
      out.splice(2, 0, ['Investido: nível ' + nvInvestido + ' (+' +
        Math.round(SKILL_NV_PCT * nvInvestido * 100) + '% de poder)',
        '#8ce08c']);
    }
    var f = efeitoLinha(atual);
    if (f) out.push([f, '#f2eef8']);
    if (Array.isArray(sk.ramos) && sk.ramos.length) {
      for (var i = 0; i < sk.ramos.length; i++) {
        var r = sk.ramos[i];
        var on = ramoId === r.id;
        out.push([r.nome + ': ' + r.efeito + (on ? '  [ATIVO]' : ''),
          on ? '#e8c86a' : '#9a90b8']);
      }
      if (!ramoId) out.push(['Base neutra (sem escolha de ramo)', '#6f678a']);
    }
    out.push(['Dispara sozinha — sem botão (100% automático)', '#6f678a']);
    return out;
  }

  return {
    LISTA: LISTA,
    dicas: dicas,
    LIMITE: LIMITE,
    limite: limite,
    SENTIDO: SENTIDO,
    daClasse: daClasse,
    ativas: ativas,
    carregadas: carregadas,
    desbloqueada: desbloqueada,
    proxima: proxima,
    comRamo: comRamo,
    ramoDe: ramoDe,
    cicloRamo: cicloRamo,
    SKILL_NV_MAX: SKILL_NV_MAX,
    SKILL_NV_PCT: SKILL_NV_PCT,
    custoNivel: custoNivel,
    nvSkill: nvSkill,
    sobe: sobe,
    aplicaNivel: aplicaNivel
  };
})();
