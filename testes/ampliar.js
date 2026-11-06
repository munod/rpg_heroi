// Amplia um PNG (vizinho mais próximo) — pra ler screenshots maiores.
// Uso: node testes/ampliar.js arquivo.png fator
'use strict';
const fs = require('fs');
const path = require('path');
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

function lerPNG(buf) {
  let off = 8;
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const tipo = buf.toString('ascii', off + 4, off + 8);
    if (tipo === 'IDAT') idat.push(buf.slice(off + 8, off + 8 + len));
    off += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bpp = 3, stride = w * bpp;
  const px = Buffer.alloc(w * h * 3);
  let pos = 0;
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[pos++];
    const line = raw.slice(pos, pos + stride);
    pos += stride;
    const cur = Buffer.alloc(stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0;
      const b = prev[i];
      const c = i >= bpp ? prev[i - bpp] : 0;
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
    cur.copy(px, y * stride);
    prev = cur;
  }
  return { w, h, px };
}

const arquivo = process.argv[2];
const fator = parseInt(process.argv[3] || '2', 10);
const img = lerPNG(fs.readFileSync(arquivo));
const W = img.w * fator, H = img.h * fator;
const saida = Buffer.alloc(W * H * 3);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const sx = Math.floor(x / fator), sy = Math.floor(y / fator);
    const s = (sy * img.w + sx) * 3;
    const d = (y * W + x) * 3;
    saida[d] = img.px[s];
    saida[d + 1] = img.px[s + 1];
    saida[d + 2] = img.px[s + 2];
  }
}

const cru = Buffer.alloc(H * (1 + W * 3));
for (let y = 0; y < H; y++) {
  cru[y * (1 + W * 3)] = 0;
  saida.copy(cru, y * (1 + W * 3) + 1, y * W * 3, (y + 1) * W * 3);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8;
ihdr[9] = 2;
const out = arquivo.replace(/\.png$/, '') + '-x' + fator + '.png';
fs.writeFileSync(out, Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(cru)),
  chunk('IEND', Buffer.alloc(0))
]));
console.log('gerado: ' + out + ' (' + W + 'x' + H + ')');
