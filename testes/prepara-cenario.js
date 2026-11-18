// Prepara os assets de CENÁRIO gerados no SpriteCook (spec mundos-vivos):
// fatia as grades por alfa CONECTADO — fusão só de fragmentos minúsculos
// (<12 px, ex.: chamas soltas da fogueira entram na peça dona) — recorta
// no bbox e grava as peças individuais em assets/cenario/.
//
// Sem redução: a folhagem nasce no tamanho nativo (12-22px, densidade do
// herói) e as casas são desenhadas ×ESC_CENARIO=2 no jogo (como a árvore
// 20×26 → 40×52), mesma convenção do batalha.js.
//
// Uso: node testes/prepara-cenario.js [--sem-final]
//   --sem-final: só diagnostics + QA (não grava assets/cenario/)
'use strict';
const fs = require('fs');
const path = require('path');

const { lerPNG, escreverPNG } = require('./png');

const RAIZ = path.join(__dirname, '..');
const FONTE = path.join(RAIZ, 'assets', 'fonte');
const BASE = path.join(RAIZ, 'assets');
const final = !process.argv.includes('--sem-final');

const FRAG_MIN = 12;   // componente <12 px é fragmento: funde com o vizinho
const VIZ_MIN = 8;     // raio de fusão (gap de bbox) do fragmento com a dona

function faixa(prefixo, n) {
  const a = [];
  for (let i = 0; i < n; i++) a.push(prefixo + i);
  return a;
}

// fontes → peças (ordem = índice; a ordem da grade é linha→coluna).
// `dir` = subpasta de assets/ · `pega` = índices da grade a gravar
// (os demais ficam só na folha-fonte, que é o arquivo)
const FONTES = [
  { dir: 'cenario', arq: 'folhagem-verde-sheet.png',
    nomes: faixa('folhagem-verde-', 9) },
  { dir: 'cenario', arq: 'folhagem-frio-sheet.png',
    nomes: faixa('folhagem-frio-', 9) },
  { dir: 'cenario', arq: 'folhagem-quente-sheet.png',
    nomes: faixa('folhagem-quente-', 9) },
  { dir: 'cenario', arq: 'vila-sheet.png',
    nomes: ['casa-0', 'casa-1', 'casa-2', 'fogueira'] },
  { dir: 'npcs', arq: 'npcs-sheet.png', nomes: faixa('npc-', 25) },
  // animais: a grade vem 4 linhas × 4 perspectivas (lateral/frente/
  // costas) — leva a lateral de cada espécie (índices 0,4,8,12) p/ o
  // jogo; o resto fica na folha-fonte (arquivo)
  { dir: 'animais', arq: 'animais-sheet.png',
    pega: [0, 4, 8, 12], nomes: faixa('animal-', 4) }
];

// ------------------------------------------------------------- componentes
function componentes(img) {
  const w = img.w, h = img.h, al = img.al;
  const visto = new Uint8Array(w * h);
  const out = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i0 = y * w + x;
      if (!al[i0] || visto[i0]) continue;
      const st = [i0]; visto[i0] = 1;
      let minx = x, maxx = x, miny = y, maxy = y, n = 0;
      while (st.length) {
        const i = st.pop();
        const px = i % w, py = (i / w) | 0;
        n++;
        if (px < minx) minx = px;
        if (px > maxx) maxx = px;
        if (py < miny) miny = py;
        if (py > maxy) maxy = py;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = px + dx, ny = py + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            const j = ny * w + nx;
            if (al[j] && !visto[j]) { visto[j] = 1; st.push(j); }
          }
        }
      }
      out.push({ minx: minx, miny: miny, maxx: maxx, maxy: maxy, n: n });
    }
  }
  return out;
}

// fusão de fragmentos: bbox do fragmento (n < FRAG_MIN) colado (gap ≤
// VIZ_MIN) na peça dona → some dentro dela (chamas/estilhaços)
function funde(frags) {
  let mudou = true;
  while (mudou) {
    mudou = false;
    for (let i = 0; i < frags.length; i++) {
      const f = frags[i];
      if (!f || f.n >= FRAG_MIN) continue;
      let dono = -1, melhor = 1e9;
      for (let j = 0; j < frags.length; j++) {
        if (i === j || !frags[j]) continue;
        const g = frags[j];
        const gx = Math.max(0, Math.max(f.minx - g.maxx, g.minx - f.maxx));
        const gy = Math.max(0, Math.max(f.miny - g.maxy, g.miny - f.maxy));
        if (gx > VIZ_MIN || gy > VIZ_MIN) continue;
        const d = gx + gy;
        if (d < melhor) { melhor = d; dono = j; }
      }
      if (dono >= 0) {
        const g = frags[dono];
        g.minx = Math.min(g.minx, f.minx); g.maxx = Math.max(g.maxx, f.maxx);
        g.miny = Math.min(g.miny, f.miny); g.maxy = Math.max(g.maxy, f.maxy);
        g.n += f.n; frags[i] = null; mudou = true;
      }
    }
  }
  return frags.filter(Boolean);
}

// ordem da grade: bandas por centro-Y (as linhas da grade ficam ≥10px
// separadas em centro; dentro da banda, ordena por X)
function ordemGrade(frags) {
  const c = frags.map(function (f) { return (f.miny + f.maxy) / 2; });
  const idx = frags.map(function (f, i) { return i; })
    .sort(function (a, b) { return c[a] - c[b]; });
  const bandas = [];
  idx.forEach(function (i) {
    const b = bandas[bandas.length - 1];
    if (b && Math.abs(c[i] - c[b[0]]) <= 10) b.push(i);
    else bandas.push([i]);
  });
  const out = [];
  bandas.forEach(function (b) {
    b.sort(function (a, b2) { return frags[a].minx - frags[b2].minx; });
    b.forEach(function (i) { out.push(frags[i]); });
  });
  return out;
}

function recorta(img, f) {
  const w = f.maxx - f.minx + 1, h = f.maxy - f.miny + 1;
  const px = Buffer.alloc(w * h * 3), al = Buffer.alloc(w * h, 0);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const s = (f.miny + y) * img.w + f.minx + x;
      px[(y * w + x) * 3] = img.px[s * 3];
      px[(y * w + x) * 3 + 1] = img.px[s * 3 + 1];
      px[(y * w + x) * 3 + 2] = img.px[s * 3 + 2];
      al[y * w + x] = img.al[s];
    }
  }
  return { w: w, h: h, px: px, al: al };
}

// --------------------------------------------------------------- montagem
const relatorio = {};
const pecas = [];   // {nome, img} p/ QA

FONTES.forEach(function (fonte) {
  const sheet = lerPNG(fs.readFileSync(path.join(FONTE, fonte.arq)));
  const frags = ordemGrade(funde(componentes(sheet)));
  const usaPega = !!fonte.pega;
  if (usaPega) {
    // fonte com peça sobrando: só exige que o corte cubra os índices
    if (frags.length <= Math.max.apply(null, fonte.pega)) {
      throw new Error(fonte.arq + ': corte ' + frags.length +
        ' não cobre pega [' + fonte.pega.join(',') + ']');
    }
  } else if (frags.length !== fonte.nomes.length) {
    throw new Error(fonte.arq + ': esperava ' + fonte.nomes.length +
      ' peças, achei ' + frags.length + ' (revisar corte/QA)');
  }
  relatorio[fonte.arq] = [];
  // peça final: a lista `pega` (subconjunto, na ordem dela) ou o corte
  // inteiro na ordem da grade
  const alvo = usaPega ? fonte.pega
    : frags.map(function (f, i) { return i; });
  alvo.forEach(function (fi, k) {
    const f = frags[fi];
    const img = recorta(sheet, f);
    const nome = fonte.nomes[k];
    relatorio[fonte.arq].push({ nome: nome, tam: img.w + 'x' + img.h,
      px: f.n });
    pecas.push({ nome: nome, img: img });
    if (final) {
      const dir = path.join(BASE, fonte.dir);
      fs.mkdirSync(dir, { recursive: true });
      escreverPNG(path.join(dir, nome + '.png'), img.w, img.h, img.px, img.al);
    }
  });
});

console.log(JSON.stringify(relatorio, null, 1));

// ------------------------------------------------------------------- QA
// grade uniforme de TODAS as peças ×4 em fundo xadrez — conferir corte,
// escala e que nenhuma peça ficou pela metade
const ESC = 4, MARG = 6, COLS_QA = 8;
const maxW = Math.max.apply(null, pecas.map(p => p.img.w));
const maxH = Math.max.apply(null, pecas.map(p => p.img.h));
const cw = (maxW + MARG * 2) * ESC, ch = (maxH + MARG * 2) * ESC;
const nCol = Math.min(COLS_QA, pecas.length);
const nLin = Math.ceil(pecas.length / nCol);
const W = nCol * cw, H = nLin * ch;
const out = Buffer.alloc(W * H * 3);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const d = (y * W + x) * 3;
    const q = ((x >> 5) + (y >> 5)) % 2;
    out[d] = q ? 46 : 38; out[d + 1] = q ? 40 : 33; out[d + 2] = q ? 64 : 54;
  }
}
pecas.forEach(function (p, pi) {
  const img = p.img;
  const ox = (pi % nCol) * cw + Math.round((cw - img.w * ESC) / 2);
  const oy = Math.floor(pi / nCol) * ch + Math.round((ch - img.h * ESC) / 2);
  for (let y = 0; y < img.h; y++) {
    for (let x = 0; x < img.w; x++) {
      const i = y * img.w + x;
      if (!img.al[i]) continue;
      for (let j = 0; j < ESC; j++) {
        for (let k = 0; k < ESC; k++) {
          const d = ((oy + y * ESC + j) * W + ox + x * ESC + k) * 3;
          out[d] = img.px[i * 3]; out[d + 1] = img.px[i * 3 + 1];
          out[d + 2] = img.px[i * 3 + 2];
        }
      }
    }
  }
});
escreverPNG('/tmp/qa-cenario.png', W, H, out);
console.log('QA: /tmp/qa-cenario.png (' + W + 'x' + H + ') — ' +
  pecas.length + ' peças (' + nLin + ' linhas × ' + nCol + ')');
