// PNG mínimo (RGB 8 bits) dos testes: grava e lê sem dependência externa.
// Uso: const { escreverPNG, lerPNG } = require('./png');
'use strict';
const fs = require('fs');
const zlib = require('zlib');

const CRC_TABELA = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABELA[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC_TABELA[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function chunk(tipo, dados) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(dados.length, 0);
  const td = Buffer.concat([Buffer.from(tipo, 'ascii'), dados]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}

// Grava buffer RGB (3 bytes/pixel) como PNG 8-bit. Se `al` for passado
// (1 byte/pixel), grava RGBA (color type 6) — assets do jogo têm fundo
// transparente (spec visual-heroi-spritecook).
function escreverPNG(arquivo, larg, alt, rgb, al) {
  const ncan = al ? 4 : 3;
  const cru = Buffer.alloc(alt * (1 + larg * ncan));
  for (let y = 0; y < alt; y++) {
    const linha = y * (1 + larg * ncan);
    cru[linha] = 0;
    if (al) {
      for (let i = 0; i < larg; i++) {
        const s = (y * larg + i) * 3, d = linha + 1 + i * 4;
        cru[d] = rgb[s]; cru[d + 1] = rgb[s + 1];
        cru[d + 2] = rgb[s + 2]; cru[d + 3] = al[y * larg + i];
      }
    } else {
      rgb.copy(cru, linha + 1, y * larg * 3, (y + 1) * larg * 3);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(larg, 0);
  ihdr.writeUInt32BE(alt, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = al ? 6 : 2;
  fs.writeFileSync(arquivo, Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(cru)),
    chunk('IEND', Buffer.alloc(0))
  ]));
}

// Lê PNG 8 bits (RGB/RGBA/paleta, filtros 0-4) devolvendo
// { w, h, px, al } — px = RGB com 3 bytes/pixel (formato antigo,
// compatível com mapa.js/ampliar.js) e al = canal alfa (255 cheio
// quando o arquivo não tem alfa). RGBA/paleta existem por causa dos
// assets do jogo (spec visual-heroi-spritecook): sprites com fundo
// transparente não sobreviviam a um leitor RGB.
function lerPNG(buf) {
  let off = 8;
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
  const prof = buf[24];                 // bit depth (só 8 aceito)
  const tipo = buf[25];                 // 2=RGB 3=paleta 6=RGBA
  const interlace = buf[28];
  if (prof !== 8 || interlace !== 0 || (tipo !== 2 && tipo !== 3 && tipo !== 6)) {
    throw new Error('lerPNG: PNG não suportado (bit depth ' + prof +
      ', tipo ' + tipo + ', interlace ' + interlace + ')');
  }
  const ncan = tipo === 6 ? 4 : tipo === 3 ? 1 : 3;
  const idat = [];
  let plte = null, trns = null;
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const t = buf.toString('ascii', off + 4, off + 8);
    if (t === 'IDAT') idat.push(buf.slice(off + 8, off + 8 + len));
    else if (t === 'PLTE') plte = buf.slice(off + 8, off + 8 + len);
    else if (t === 'tRNS') trns = buf.slice(off + 8, off + 8 + len);
    off += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * ncan;
  const cru = Buffer.alloc(h * stride);
  let pos = 0;
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[pos++];
    const line = raw.slice(pos, pos + stride);
    pos += stride;
    const cur = Buffer.alloc(stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= ncan ? cur[i - ncan] : 0;
      const b = prev[i];
      const c = i >= ncan ? prev[i - ncan] : 0;
      let v = line[i];
      if (f === 1) v = (v + a) & 255;
      else if (f === 2) v = (v + b) & 255;
      else if (f === 3) v = (v + ((a + b) >> 1)) & 255;
      else if (f === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255;
      }
      cur[i] = v;
    }
    cur.copy(cru, y * stride);
    prev = cur;
  }
  const px = Buffer.alloc(w * h * 3);
  const al = Buffer.alloc(w * h, 255);
  if (tipo === 6) {
    for (let i = 0, j = 0; i < w * h; i++, j += 4) {
      px[i * 3] = cru[j]; px[i * 3 + 1] = cru[j + 1];
      px[i * 3 + 2] = cru[j + 2]; al[i] = cru[j + 3];
    }
  } else if (tipo === 3) {
    if (!plte) throw new Error('lerPNG: paleta sem PLTE');
    for (let i = 0; i < w * h; i++) {
      const idx = cru[i];
      px[i * 3] = plte[idx * 3]; px[i * 3 + 1] = plte[idx * 3 + 1];
      px[i * 3 + 2] = plte[idx * 3 + 2];
      if (trns && idx < trns.length) al[i] = trns[idx];
    }
  } else {
    cru.copy(px);
  }
  return { w, h, px, al };
}

module.exports = { escreverPNG, lerPNG };
