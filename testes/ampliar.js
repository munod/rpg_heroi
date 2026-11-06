// Amplia um PNG (vizinho mais próximo) — pra ler screenshots maiores.
// Uso: node testes/ampliar.js arquivo.png fator
'use strict';
const fs = require('fs');

const { escreverPNG, lerPNG } = require('./png');

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

const out = arquivo.replace(/\.png$/, '') + '-x' + fator + '.png';
escreverPNG(out, W, H, saida);
console.log('gerado: ' + out + ' (' + W + 'x' + H + ')');
