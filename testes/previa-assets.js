// Folha de prévia dos assets GERADOS (spec visual-heroi-spritecook):
// 3 linhas (idle/walk/ataque) × 8 frames — lê o manifesto do
// js/assets.js (não duplica geometria) e serve de QA visual do
// pipeline (arquivo + pose + mão da arma embutida + alinhamento).
// Uso: node testes/previa-assets.js  ->  testes/previa-assets.png
'use strict';
const path = require('path');

const { carregar, novoCtxCaptura } = require('./carga');
const { escreverPNG } = require('./png');

const { sandbox } = carregar({
  novoCtx: novoCtxCaptura,
  scripts: ['js/assets.js']
});
const Assets = sandbox.Assets;

// carga síncrona no harness (Image stub decodifica na hora)
let pronto = false;
Assets.carga(() => { pronto = true; });
if (!pronto) throw new Error('previa-assets: carga não terminou');
const inf = Assets.info();
const faltando = ['guerreiro', 'mago', 'ladino', 'clerigo']
  .filter(cl => !inf.carregado[cl]);
if (faltando.length) {
  throw new Error('previa-assets: sem asset de ' + faltando.join(', ') +
    ' (roda o prepara-assets)');
}

const ESC = 4;
const MARG = 6;
const ALT = Assets.ALT;
const CEL = (ALT + MARG) * ESC;
const COLS = 8;
const CLASSES = ['guerreiro', 'mago', 'ladino', 'clerigo'];
const ANIMS = ['idle', 'walk', 'attack'];
const LINHAS = [];
CLASSES.forEach(cl => ANIMS.forEach(a => LINHAS.push([cl, a])));
const W = COLS * CEL;
const H = LINHAS.length * CEL;
const folha = Buffer.alloc(W * H * 3);

// fundo xadrez (mesmo tom do previa.js)
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const quad = ((x >> 4) + (y >> 4)) % 2;
    const o = (y * W + x) * 3;
    folha[o] = quad ? 46 : 38;
    folha[o + 1] = quad ? 40 : 33;
    folha[o + 2] = quad ? 64 : 54;
  }
}

function cola(img, ox, oy) {
  const d = img._data;
  if (!d) return;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const i = (y * img.width + x) * 4;
      if (d[i + 3] === 0) continue;
      for (let j = 0; j < ESC; j++) {
        for (let k = 0; k < ESC; k++) {
          const px = ox + x * ESC + k, py = oy + y * ESC + j;
          if (px < 0 || py < 0 || px >= W || py >= H) continue;
          const o = (py * W + px) * 3;
          folha[o] = d[i]; folha[o + 1] = d[i + 1]; folha[o + 2] = d[i + 2];
        }
      }
    }
  }
}

LINHAS.forEach(([cl, anim], li) => {
  for (let i = 0; i < 8; i++) {
    const c = Assets.hero(cl, anim, i);
    if (!c) throw new Error('sem frame ' + cl + '/' + anim + '/' + i);
    cola(c.canvas, i * CEL + MARG * ESC, li * CEL + MARG * ESC);
  }
});

const saida = path.join(__dirname, 'previa-assets.png');
escreverPNG(saida, W, H, folha);
console.log('gerado: ' + saida + ' (' + W + 'x' + H + ')');
console.log('linhas: ' + CLASSES.join(', ') + ' × ' + ANIMS.join('/') +
  ' — 8 frames cada');
