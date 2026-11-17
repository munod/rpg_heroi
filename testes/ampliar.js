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
// compõe sobre um xadrez suave (sprite com fundo transparente não
// apareceria — RGBA entrou no lerPNG pela spec visual-heroi-spritecook)
const temAlfa = img.al && img.al.some(a => a !== 255);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const sx = Math.floor(x / fator), sy = Math.floor(y / fator);
    const s = (sy * img.w + sx) * 3;
    const d = (y * W + x) * 3;
    if (temAlfa) {
      const a = img.al[sy * img.w + sx];
      const quad = ((sx >> 3) + (sy >> 3)) % 2;
      const fr = quad ? 46 : 38, fg = quad ? 40 : 33, fb = quad ? 64 : 54;
      saida[d] = Math.round((img.px[s] * a + fr * (255 - a)) / 255);
      saida[d + 1] = Math.round((img.px[s + 1] * a + fg * (255 - a)) / 255);
      saida[d + 2] = Math.round((img.px[s + 2] * a + fb * (255 - a)) / 255);
    } else {
      saida[d] = img.px[s];
      saida[d + 1] = img.px[s + 1];
      saida[d + 2] = img.px[s + 2];
    }
  }
}

const out = arquivo.replace(/\.png$/, '') + '-x' + fator + '.png';
escreverPNG(out, W, H, saida);
console.log('gerado: ' + out + ' (' + W + 'x' + H + ')');
