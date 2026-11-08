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

  var desdeAco = 0, cooldownGat = 0;
  var acoVivo = false, acoT = 0;
  var gatRoubo = 0, gatT = 0;

  // zera o estado da sessão (chamado por Batalha.iniciar)
  function limpa() {
    desdeAco = 0;
    cooldownGat = 0;
    acoVivo = false;
    acoT = 0;
    gatRoubo = 0;
    gatT = 0;
  }

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
    MULT_OURO_ACO: 10,     // ouro ×10 na vitória
    MULT_XP_ACO: 4,        // XP ×4 na vitória
    TEMPO_ACO: ACO_TEMPO,
    TEMPO_GAT: GAT_TEMPO
  };
})();
