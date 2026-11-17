// Prepara os assets do herói gerados no SpriteCook para o jogo
// (spec visual-heroi-spritecook — emenda: arma EMBUTIDA na arte):
//  - fatia as folhas de animação em frames individuais e reduz ÷2
//    (nearest) → assets/herois/guerreiro-{anim}-{i}.png
//  - emite diagnostics (caixa/pés por frame) e a folha QA em /tmp
//
// A composição de arma e a detecção de punho saíram junto com a
// "arma separada" (veredito: composição não resolvia grip nem salva
// de mão). Os RECORTES_ATAQUE também: a geração com a espada VISÍVEL
// não materializa mais lâminas fantasmas.
//
// Uso: node testes/prepara-assets.js [--sem-final]
//   --sem-final: só diagnostics + QA (não grava assets/)
'use strict';
const fs = require('fs');
const path = require('path');

const { lerPNG, escreverPNG } = require('./png');

const RAIZ = path.join(__dirname, '..');
const FONTE = path.join(RAIZ, 'assets', 'fonte');
const DIR_HEROI = path.join(RAIZ, 'assets', 'herois');
const final = !process.argv.includes('--sem-final');

const FATOR_H = 2;      // herói: 86 → 43
const ANIMS = ['idle', 'walk', 'ataque'];   // arquivos da fonte

// ------------------------------------------------------------- utilidades
function carrega(caminho) {
  return lerPNG(fs.readFileSync(caminho));
}

// redução por vizinho mais próximo
function reduz(img, alvoW, alvoH) {
  const px = Buffer.alloc(alvoW * alvoH * 3);
  const al = Buffer.alloc(alvoW * alvoH, 255);
  for (let y = 0; y < alvoH; y++) {
    const sy = Math.min(img.h - 1, Math.floor(y * img.h / alvoH));
    for (let x = 0; x < alvoW; x++) {
      const sx = Math.min(img.w - 1, Math.floor(x * img.w / alvoW));
      const s = (sy * img.w + sx) * 3, d = (y * alvoW + x) * 3;
      px[d] = img.px[s]; px[d + 1] = img.px[s + 1]; px[d + 2] = img.px[s + 2];
      al[y * alvoW + x] = img.al[sy * img.w + sx];
    }
  }
  return { w: alvoW, h: alvoH, px, al };
}

function fatia(sheet, n) {
  const fw = Math.floor(sheet.w / n), out = [];
  for (let i = 0; i < n; i++) {
    const px = Buffer.alloc(fw * sheet.h * 3);
    const al = Buffer.alloc(fw * sheet.h, 255);
    for (let y = 0; y < sheet.h; y++) {
      for (let x = 0; x < fw; x++) {
        const sx = i * fw + x, s = (y * sheet.w + sx) * 3;
        const d = (y * fw + x) * 3;
        px[d] = sheet.px[s]; px[d + 1] = sheet.px[s + 1];
        px[d + 2] = sheet.px[s + 2];
        al[y * fw + x] = sheet.al[y * sheet.w + sx];
      }
    }
    out.push({ w: fw, h: sheet.h, px, al });
  }
  return out;
}

function caixa(img) {
  let minx = 1e9, miny = 1e9, maxx = -1, maxy = -1, n = 0;
  for (let y = 0; y < img.h; y++) {
    for (let x = 0; x < img.w; x++) {
      if (!img.al[y * img.w + x]) continue;
      n++;
      if (x < minx) minx = x;
      if (x > maxx) maxx = x;
      if (y < miny) miny = y;
      if (y > maxy) maxy = y;
    }
  }
  return { minx, miny, maxx, maxy, n };
}

// --------------------------------------------------------------- montagem
if (final) fs.mkdirSync(DIR_HEROI, { recursive: true });

const relatorio = { herois: {} };
const framesFinais = {};   // anim → [img] (em memória, p/ QA)

for (const anim of ANIMS) {
  const sheet = carrega(path.join(FONTE, 'guerreiro-' + anim + '.png'));
  const frames = fatia(sheet, 8);
  relatorio.herois[anim] = [];
  framesFinais[anim] = [];
  frames.forEach((fr, i) => {
    const red = reduz(fr, Math.round(fr.w / FATOR_H), Math.round(fr.h / FATOR_H));
    relatorio.herois[anim].push({ i, caixa: caixa(red), tam: red.w + 'x' + red.h });
    framesFinais[anim].push(red);
    if (final) {
      escreverPNG(path.join(DIR_HEROI, 'guerreiro-' + anim + '-' + i + '.png'),
        red.w, red.h, red.px, red.al);
    }
  });
}

console.log(JSON.stringify(relatorio, null, 1));

// ------------------------------------------------------------------- QA
// folha: 3 linhas (anim) × 8 frames ×4 — p/ conferir pose, mão da
// arma e alinhamento dos pés
const ESC = 4, MARG = 6;
const ALT = 43;
const CEL = (ALT + MARG) * ESC;
const W = 8 * CEL, H = ANIMS.length * CEL;
const out = Buffer.alloc(W * H * 3);
const BG = [[46, 40, 64], [38, 33, 54]];
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const d = (y * W + x) * 3, b = BG[((x >> 5) + (y >> 5)) % 2];
    out[d] = b[0]; out[d + 1] = b[1]; out[d + 2] = b[2];
  }
}
function cola(img, ox, oy) {
  for (let y = 0; y < img.h; y++) {
    for (let x = 0; x < img.w; x++) {
      const i = y * img.w + x;
      if (img.al && !img.al[i]) continue;
      const s = i * 3;
      for (let j = 0; j < ESC; j++) {
        for (let k = 0; k < ESC; k++) {
          const px = ox + x * ESC + k, py = oy + y * ESC + j;
          if (px < 0 || py < 0 || px >= W || py >= H) continue;
          const d = (py * W + px) * 3;
          out[d] = img.px[s]; out[d + 1] = img.px[s + 1];
          out[d + 2] = img.px[s + 2];
        }
      }
    }
  }
}
ANIMS.forEach((anim, li) => {
  framesFinais[anim].forEach((fr, i) => {
    cola(fr, i * CEL + MARG * ESC, li * CEL + MARG * ESC);
  });
});
escreverPNG('/tmp/qa-heroi.png', W, H, out);
console.log('QA: /tmp/qa-heroi.png (' + W + 'x' + H + ')');
