// Perlin Noise determinístico — base dos mapas procedurais.
// A semente é o NÚMERO DO MAPA: mesmo mapa => mesmo terreno e mesmos
// obstáculos, em qualquer máquina e sessão (os testes e os screenshots
// dependem disso). Ruído clássico "melhorado" em 2D (~[-1, 1]) sobre
// uma tabela de permutação embaralhada com PRNG mulberry32.
var Perlin = (function () {
  var perm = null;              // tabela de permutação (512 entradas)

  // mulberry32: PRNG curtinho, rápido e reproduzível
  function mulberry32(a) {
    return function () {
      a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function embaralha(rng) {
    var base = [];
    for (var i = 0; i < 256; i++) base[i] = i;
    for (i = 255; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var tmp = base[i]; base[i] = base[j]; base[j] = tmp;
    }
    perm = new Uint8Array(512);
    for (i = 0; i < 512; i++) perm[i] = base[i & 255];
  }

  // Define a semente ativa (chamada por Batalha.garanteCenario, 1× por
  // reconstrução de cenário)
  function definirSemente(n) {
    var s = (typeof n === 'number' && isFinite(n)) ? Math.floor(n) : 1;
    embaralha(mulberry32(s * 2654435761 + 12345));
  }

  // Gerador independente com semente própria — sorteios pontuais (flores,
  // obstáculos) não podem depender do número de amostras das outras
  // camadas, senão trocar o chão mexeria nos obstáculos.
  function sorteio(n) {
    var s = (typeof n === 'number' && isFinite(n)) ? Math.floor(n) : 1;
    return mulberry32(s * 40503 + 1);
  }

  function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function grad(h, x, y) {
    switch (h & 7) {
      case 0: return  x + y;
      case 1: return  x - y;
      case 2: return -x + y;
      case 3: return -x - y;
      case 4: return  x;
      case 5: return -x;
      case 6: return  y;
      default: return -y;
    }
  }

  // Ruído de Perlin melhorado em 2D — ~[-1, 1]
  function ruido(x, y) {
    if (!perm) definirSemente(1);
    var xi = Math.floor(x) & 255, yi = Math.floor(y) & 255;
    var xf = x - Math.floor(x), yf = y - Math.floor(y);
    var u = fade(xf), v = fade(yf);
    var aa = perm[perm[xi] + yi];
    var ab = perm[perm[xi] + yi + 1];
    var ba = perm[perm[xi + 1] + yi];
    var bb = perm[perm[xi + 1] + yi + 1];
    var x1 = lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u);
    var x2 = lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u);
    return lerp(x1, x2, v);
  }

  // Conveniência 0..1 (limiares de terreno: altas/baixas do campo)
  function valor(x, y) { return (ruido(x, y) + 1) / 2; }

  return {
    definirSemente: definirSemente,
    sorteio: sorteio,
    ruido: ruido,
    valor: valor
  };
})();
