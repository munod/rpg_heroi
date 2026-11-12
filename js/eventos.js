// Eventos aleatórios (Leva 2 do sistema punitivo): o QUE nasce, QUANDO e
// com que estado — a ARENA (spawn, fuga, morte, recompensas) fica em
// batalha.js, que consulta este módulo em runtime (sem dependência de
// ordem de carga). Tudo aqui é puro o bastante p/ teste sem arena.
//
// - Açougueiro (padrão Diablo 1/4): raro, injusto de propósito, UMA
//   chance — 1,5% por onda desde a 10, com pity +0,5%/onda sem aparecer
//   (teto 25%) p/ não passar a vida sem vê-lo. Tempo de campo limitado:
//   quem aguenta 45s ou derruba o herói ganha a cena.
// - Gatuno: rouba 15% do ouro e foge; matá-lo a tempo devolve o roubo
//   ×1,2 (contrajogada pura: build que bate rápido = defesa).
var Eventos = (function () {
  // Ajustes de pacing medidos (ritmo.js 50): com o Açougueiro desde a
  // onda10 ele chegava ~min5 (herói fraco → morte ×2 = −10 ondas e
  // estoico na fronteira: onda16@15min vs 40+ do alvo). Começo na 30
  // (herói já com keystone/gastado) e gatuno mais raro (perseguição
  // custa ondas) — reavaliar com ritmo.
  var ACO_MIN_ONDA = 30;
  var ACO_BASE = 0.015;    // 1,5% por onda
  var ACO_PITY = 0.005;    // +0,5% por onda sem aparecer
  var ACO_TETO = 0.25;
  var ACO_TEMPO = 30;      // s em campo antes de partir
  var GAT_TEMPO = 30;      // s p/ furar a fuga (emperrado em obstáculo)
  var GAT_CHANCE = 0.015;  // por onda elegível
  var GAT_COOLDOWN = 3;    // ondas de carência entre aparições
  var GAT_ROUBO = 0.15;    // fração do ouro roubada
  var GAT_RESGATE = 1.2;   // recompensa por matá-lo a tempo

  // ---- Enxame (spec monstros-novos R-MON-4.1): pressão em LOTE ----
  // O Açougueiro é 1 inimigo forte; o Enxame é multidão com paga boa.
  var ENX_MIN_ONDA = 15;
  // CALIBRADO POR MEDIÇÃO (spec monstros-novos R-MON-5): os 10% originais
  // davam ~100 enxames por campanha e viraram esteira — 1200min: 27 mortes
  // e mapa 21 (vs 13 mortes/mapa 23 da referência). Isolamento com
  // ENX_BASE=0 devolveu MAPA 24 / 1 MORTE — ou seja, a causa era o
  // Enxame. 3% + carência 6 ≈ 1 enxame a cada ~39 ondas (1 a cada
  // ~26min) = pressão visível mas não esteira (comparável ao Açougueiro,
  // que é 1,5% e só 1 inimigo forte).
  // 1,5% = mesmo patamar do Açougueiro (1,5% e só 1 inimigo forte —
  // aqui são 2× inimigos). Com 3% a progressão medida projetou ~253h
  // de campanha (fora do alvo 200h ±20% = 240h); com 0% ficou ~195h.
  // NOTA: a VARIÂNCIA ENTRE RUNS é 1..112 mortes (7 runs isolando as
  // variáveis) — 1 run não discrimina; a decisão foi por PROGRESSÃO
  // projetada, não por diferença de mortes.
  var ENX_BASE = 0.015;    // 1,5% por onda elegível
  var ENX_PITY = 0.005;    // +0,5% por onda sem aparecer
  var ENX_TETO = 0.10;
  var ENX_COOLDOWN = 6;    // ondas de carência entre enxames
  var ENX_MULT = 1.5;      // XP/ouro da onda do enxame

  // ---- Cofre Abandonado (R-MON-4.2): recompensa pura ---------------
  // 1º evento "bom" do jogo (só existiam pressão e contrajogada) — mas
  // não é automático: nasce NO CAMPO e só quem passar por ele coleta.
  var COF_MIN_ONDA = 10;
  var COF_BASE = 0.08;     // 8% por onda elegível
  var COF_PITY = 0.01;
  var COF_TETO = 0.25;

  var desdeAco = 0, cooldownGat = 0;
  var acoVivo = false, acoT = 0;
  var gatRoubo = 0, gatT = 0;
  var desdeEnx = 0, cooldownEnx = 0, enxAtivo = false;
  var desdeCof = 0, cofre = null;   // cofre = {x, y} no campo

  // zera o estado da sessão (chamado por Batalha.iniciar)
  function limpa() {
    desdeAco = 0;
    cooldownGat = 0;
    acoVivo = false;
    acoT = 0;
    gatRoubo = 0;
    gatT = 0;
    desdeEnx = 0;
    cooldownEnx = 0;
    enxAtivo = false;
    desdeCof = 0;
    cofre = null;
  }

  // ---- Enxame: rolagem pura (a arena dobra a onda e paga o bônus) --
  function nasceEnxame(onda) {
    if (cooldownEnx > 0) { cooldownEnx--; return false; }
    if (onda < ENX_MIN_ONDA) return false;
    if (Math.random() < Math.min(ENX_TETO, ENX_BASE + desdeEnx * ENX_PITY)) {
      desdeEnx = 0;
      cooldownEnx = ENX_COOLDOWN;
      enxAtivo = true;
      return true;
    }
    desdeEnx++;
    return false;
  }
  function enxameAtivo() { return enxAtivo; }
  function encerraEnxame() { enxAtivo = false; }   // chamado ao passar de onda
  function multEnxame() { return enxAtivo ? ENX_MULT : 1; }

  // ---- Cofre: rolagem pura (a arena colhe a posição e a recompensa)
  function nasceCofre(onda) {
    if (cofre || onda < COF_MIN_ONDA) return false;
    if (Math.random() < Math.min(COF_TETO, COF_BASE + desdeCof * COF_PITY)) {
      desdeCof = 0;
      return true;
    }
    desdeCof++;
    return false;
  }
  function posCofre() { return cofre; }
  function colocaCofre(x, y) { cofre = { x: x, y: y }; }
  function cofreColetado() { cofre = null; }

  // nasce o Açougueiro nesta onda? (rolagem pura, sem arena)
  function nasceAco(onda) {
    if (acoVivo || onda < ACO_MIN_ONDA) return false;
    if (Math.random() < Math.min(ACO_TETO, ACO_BASE + desdeAco * ACO_PITY)) {
      desdeAco = 0;
      acoVivo = true;
      acoT = 0;
      return true;
    }
    desdeAco++;
    return false;
  }

  function acoEmCampo() { return acoVivo; }
  function acoMorreu() { acoVivo = false; acoT = 0; }   // derrubou: pagou
  function acoPartiu() { acoVivo = false; acoT = 0; }   // timeout/morte do herói

  // true = estourou o tempo de campo (batalha despawna fora do laço)
  function atualizaAco(dt) {
    if (!acoVivo) return false;
    acoT += dt;
    return acoT >= ACO_TEMPO;
  }

  // nasce o Gatuno? devolve o valor roubado (0 = nada)
  function nasceGat(ouro) {
    if (cooldownGat > 0) { cooldownGat--; return 0; }
    if (!(ouro > 0)) return 0;
    if (Math.random() >= GAT_CHANCE) return 0;
    cooldownGat = GAT_COOLDOWN;
    gatRoubo = Math.max(1, Math.round(ouro * GAT_ROUBO));
    gatT = 0;
    return gatRoubo;
  }

  function gatEmCampo() { return gatRoubo > 0; }
  function gatAbatido() {              // resgate: roubo ×1,2
    var g = Math.round(gatRoubo * GAT_RESGATE);
    gatRoubo = 0;
    gatT = 0;
    return g;
  }
  function gatFugiu() { gatRoubo = 0; gatT = 0; }

  // true = o gatuno desistiu da fuga (emperrado além do tempo limite)
  function atualizaGat(dt) {
    if (gatRoubo <= 0) return false;
    gatT += dt;
    return gatT >= GAT_TEMPO;
  }

  return {
    limpa: limpa,
    nasceAco: nasceAco,
    acoEmCampo: acoEmCampo,
    acoMorreu: acoMorreu,
    acoPartiu: acoPartiu,
    atualizaAco: atualizaAco,
    nasceGat: nasceGat,
    gatEmCampo: gatEmCampo,
    gatAbatido: gatAbatido,
    gatFugiu: gatFugiu,
    atualizaGat: atualizaGat,
    nasceEnxame: nasceEnxame,
    enxameAtivo: enxameAtivo,
    encerraEnxame: encerraEnxame,
    multEnxame: multEnxame,
    nasceCofre: nasceCofre,
    posCofre: posCofre,
    colocaCofre: colocaCofre,
    cofreColetado: cofreColetado,
    MULT_OURO_ACO: 10,     // ouro ×10 na vitória
    MULT_XP_ACO: 4,        // XP ×4 na vitória
    TEMPO_ACO: ACO_TEMPO,
    TEMPO_GAT: GAT_TEMPO
  };
})();
