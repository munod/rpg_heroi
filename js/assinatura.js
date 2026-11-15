// Assinatura dos saves (spec save-assinado) — HMAC-SHA256 em JS puro.
//
// Por que em JS puro e não crypto.subtle: o jogo abre por `file://`
// (contexto inseguro — subtle não é confiável lá) e o sandbox dos
// testes roda com whitelist de globals; qualquer API nova de navegador
// quebraria os dois (regra do AGENTS).
//
// LIMITE HONESTO (registrado na spec/STATE): a CHAVE vai dentro do
// bundle — quem lê o fonte extrai. Isto é BARREIRA p/ edição casual
// (mexer no JSON no DevTools e ver o efeito) + detecção de corrupção,
// não segredo. O placar é protegido pelas rules do servidor
// (spec ranking-antitrampa), não por aqui.
//
// Sem sal por aparelho de propósito: HMAC com sal local quebraria
// transferir o export entre máquinas (assinatura da origem não bate
// com o destino) — o pepper + payload resolvem o caso de uso real.
var Assinatura = (function () {

  var CHAVE = 'rpg-heroi|save-v1|4f2a1c|assinar';

  var HEX = '0123456789abcdef';
  function hexDe(bytes) {
    var s = '';
    for (var i = 0; i < bytes.length; i++) {
      s += HEX[(bytes[i] >> 4) & 15] + HEX[bytes[i] & 15];
    }
    return s;
  }

  // string -> bytes UTF-8 (estável: a mesma string JS sempre vira os
  // mesmos bytes; é isso que o HMAC assina)
  function utf8(s) {
    var out = [];
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      if (c < 0x80) {
        out.push(c);
      } else if (c < 0x800) {
        out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
      } else if (c >= 0xd800 && c <= 0xdbff && i + 1 < s.length) {
        var c2 = s.charCodeAt(++i);
        var cp = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
        out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f),
          0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
      } else {
        out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
      }
    }
    return out;
  }

  function rotr(x, n) { return (x >>> n) | (x << (32 - n)); }

  var K64 = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
    0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
    0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
    0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
    0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
    0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  // SHA-256 (FIPS 180-4) sobre bytes -> 32 bytes
  function sha256Bytes(bytes) {
    var l = bytes.length;
    var resto = (l + 9) % 64;
    var zeros = resto ? 64 - resto : 0;
    var buf = new Uint8Array(l + 1 + zeros + 8);
    for (var i = 0; i < l; i++) buf[i] = bytes[i];
    buf[l] = 0x80;
    // comprimento em bits (64 bits, big-endian) — payloads < 2^29 bytes
    var bitsHi = Math.floor(l / 536870912);
    var bitsLo = (l * 8) >>> 0;
    var n = buf.length;
    buf[n - 8] = (bitsHi >>> 24) & 255;
    buf[n - 7] = (bitsHi >>> 16) & 255;
    buf[n - 6] = (bitsHi >>> 8) & 255;
    buf[n - 5] = bitsHi & 255;
    buf[n - 4] = (bitsLo >>> 24) & 255;
    buf[n - 3] = (bitsLo >>> 16) & 255;
    buf[n - 2] = (bitsLo >>> 8) & 255;
    buf[n - 1] = bitsLo & 255;

    var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
      0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    var w = new Int32Array(64);

    for (var off = 0; off < buf.length; off += 64) {
      var i;
      for (i = 0; i < 16; i++) {
        w[i] = (buf[off + i * 4] << 24) | (buf[off + i * 4 + 1] << 16) |
          (buf[off + i * 4 + 2] << 8) | buf[off + i * 4 + 3];
      }
      for (i = 16; i < 64; i++) {
        var x = w[i - 15], y = w[i - 2];
        var s0 = (rotr(x, 7) ^ rotr(x, 18) ^ (x >>> 3));
        var s1 = (rotr(y, 17) ^ rotr(y, 19) ^ (y >>> 10));
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }
      var a = H[0], b = H[1], c = H[2], d = H[3];
      var e = H[4], f = H[5], g = H[6], h = H[7];
      for (i = 0; i < 64; i++) {
        var S1 = (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25));
        var ch = (e & f) ^ (~e & g);
        var t1 = (h + S1 + ch + K64[i] + w[i]) | 0;
        var S0 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22));
        var mj = (a & b) ^ (a & c) ^ (b & c);
        var t2 = (S0 + mj) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0;
        d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0;
      H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
      H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0;
      H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    var out = [];
    for (var k = 0; k < 8; k++) {
      out.push((H[k] >>> 24) & 255, (H[k] >>> 16) & 255,
        (H[k] >>> 8) & 255, H[k] & 255);
    }
    return out;
  }

  function concat(a, b) {
    var out = a.slice(0);
    for (var i = 0; i < b.length; i++) out.push(b[i]);
    return out;
  }

  function sha256(texto) {
    return hexDe(sha256Bytes(utf8(String(texto))));
  }

  // HMAC-SHA256 (RFC 2104) -> hex; estável: mesmos bytes => mesma assinatura
  function hmac(texto, chave) {
    var km = utf8(String(chave));
    if (km.length > 64) km = sha256Bytes(km);
    var inner = [], outer = [];
    for (var i = 0; i < 64; i++) {
      var k = i < km.length ? km[i] : 0;
      inner.push(k ^ 0x36);
      outer.push(k ^ 0x5c);
    }
    var passo = sha256Bytes(concat(inner, utf8(String(texto))));
    return hexDe(sha256Bytes(concat(outer, passo)));
  }

  return { CHAVE: CHAVE, sha256: sha256, hmac: hmac };
})();
