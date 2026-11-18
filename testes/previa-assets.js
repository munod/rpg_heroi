// Folha de prévia dos assets GERADOS (spec visual-heroi-spritecook +
// mundos-vivos): 12 linhas do herói (idle/walk/ataque × 4 classes) +
// 4 linhas de cenário (folhagem por paleta + vila) — lê o manifesto do
// js/assets.js (não duplica geometria) e serve de QA visual do pipeline
// (arquivo + pose + mão da arma embutida + alinhamento + corte das
// peças de cenário).
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
const W_HERO = COLS * CEL;
const H_HERO = LINHAS.length * CEL;

// --------------------------------------------------- linhas de cenário
// [chave, i] por peça — folhagem 3×9 + vila (3 casas + fogueira)
function faixa(chave, n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push([chave, i]);
  return out;
}
const LINHAS_CEN = [
  faixa('folhagem-verde', 9),
  faixa('folhagem-frio', 9),
  faixa('folhagem-quente', 9),
  [['casa', 0], ['casa', 1], ['casa', 2], ['fogueira', 0]]
];
const cenLinhas = LINHAS_CEN.map(linha => {
  const imgs = linha.map(([ch, i]) => {
    const im = Assets.cena(ch, i);
    if (!im) {
      throw new Error('previa-assets: sem peça de cenário ' + ch + '|' + i +
        ' (roda o prepara-cenario)');
    }
    return im;
  });
  const larg = imgs.reduce((s, im) => s + (im.width + MARG * 2) * ESC, 0);
  const alt = (Math.max(...imgs.map(im => im.height)) + MARG * 2) * ESC;
  return { imgs, larg, alt };
});
const W_CEN = Math.max(...cenLinhas.map(l => l.larg));
const H_CEN = cenLinhas.reduce((s, l) => s + l.alt, 0);

const W = Math.max(W_HERO, W_CEN);
const H = H_HERO + H_CEN;
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

// ---------------------------------------------------------- herói (12)
LINHAS.forEach(([cl, anim], li) => {
  for (let i = 0; i < 8; i++) {
    const c = Assets.hero(cl, anim, i);
    if (!c) throw new Error('sem frame ' + cl + '/' + anim + '/' + i);
    cola(c.canvas, i * CEL + MARG * ESC, li * CEL + MARG * ESC);
  }
});

// ------------------------------------------------- cenário (4 linhas)
let oy = H_HERO;
cenLinhas.forEach(l => {
  let ox = 0;
  l.imgs.forEach(im => {
    cola(im, ox + MARG * ESC, oy + MARG * ESC);
    ox += (im.width + MARG * 2) * ESC;
  });
  oy += l.alt;
});

const saida = path.join(__dirname, 'previa-assets.png');
escreverPNG(saida, W, H, folha);
console.log('gerado: ' + saida + ' (' + W + 'x' + H + ')');
console.log('linhas: ' + CLASSES.join(', ') + ' × ' + ANIMS.join('/') +
  ' — 8 frames cada · cenário: 3 paletas × 9 + vila 4');
