// Prepara os assets do herói gerados no SpriteCook para o jogo
// (spec visual-heroi-spritecook):
//  - fatia as folhas de animação em frames individuais e reduz ÷2
//    (nearest) → assets/herois/guerreiro-{anim}-{i}.png
//  - reduz as armas ÷4 e gera as 4 variantes de raridade (recolor do
//    marcador magenta → cor da raridade, rampas do sprite.js)
//  - detecta o punho por frame (componente de pele fora da cabeça)
//    e emite a folha QA em /tmp com arma compostas p/ conferência
//
// Uso: node testes/prepara-assets.js [--sem-final]
//   --sem-final: só diagnostics + QA (não grava assets/)
'use strict';
const fs = require('fs');
const path = require('path');

const { lerPNG, escreverPNG } = require('./png');
const { carregar } = require('./carga');
const { sandbox } = carregar({ scripts: ['js/sprite.js'] });
const Sprite = sandbox.Sprite;

const RAIZ = path.join(__dirname, '..');
const FONTE = path.join(RAIZ, 'assets', 'fonte');
const DIR_HEROI = path.join(RAIZ, 'assets', 'herois');
const DIR_ARMA = path.join(RAIZ, 'assets', 'armas');
const final = !process.argv.includes('--sem-final');

const FATOR_H = 2;      // herói: 86 → 43
const FATOR_A = 4;      // armas: escala fina p/ caber na mão
const ANIMS = ['idle', 'walk', 'ataque'];   // arquivos da fonte
// âncoras corrigidas à mão (o detector erra quando a mão some atrás do
// corpo) — valores em coord do frame final (43px), verificados no QA
const OVERRIDE = { 'walk-5': [27, 27] };
const ARMS = ['espada', 'adaga', 'cajado', 'martelo'];
const ANGULOS = ['meio', 'cima', 'baixo'];
const RARS = [1, 2, 3, 4];

// offset do punho ao longo do eixo da arma (em px do asset FINAL):
// onde a mão segura, contada a partir da "ponta de trás" da arma
const OFFSET_PEGAR = { espada: 3, adaga: 2, cajado: 4, martelo: 2 };

// fragmentos de lâmina que o modelo materializou apesar do prompt
// "invisible sword" (spec visual-heroi-spritecook): caixas em coord da
// fonte (86px) onde SÓ pode haver lâmina — dentro delas, apaga tudo
// que não for pele (o punho sobrevive; contorno da lâmina morre junto)
const RECORTES_ATAQUE = [
  { fi: 2, x0: 8, y0: 40, x1: 20, y1: 56 },   // lâmina pendurada na mão esq
  { fi: 4, x0: 54, y0: 15, x1: 78, y1: 32 },   // lâmina saindo do punho erguido
  { fi: 5, x0: 74, y0: 24, x1: 86, y1: 42 }    // lâmina do golpe p/ frente
];

function limpaFragments(sheet) {
  for (const c of RECORTES_ATAQUE) {
    for (let y = c.y0; y <= c.y1; y++) {
      for (let x = c.x0; x <= c.x1; x++) {
        const i = y * sheet.w + c.fi * 86 + x;
        if (!sheet.al[i]) continue;
        const o = i * 3;
        if (pele(sheet.px[o], sheet.px[o + 1], sheet.px[o + 2])) continue;
        sheet.al[i] = 0;
      }
    }
  }
  return sheet;
}

// ------------------------------------------------------------- utilidades
function carrega(caminho) {
  const img = lerPNG(fs.readFileSync(caminho));
  return img;
}

// redução por vizinho mais próximo com mapeamento proporcional
// (cobre fator não inteiro: 73→18 mantém a distribuição)
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

// é pele? (r>g>b com folga; ouro/couro escuro ficam de fora pelo
// g-b alto — o corte r-g só afastava pele na SOMBRA, que é mais
// vermelha, e sumia com a mão direita em alguns frames de walk)
function pele(r, g, b) {
  return r > 150 && g >= 90 && g < 215 && b < 175 &&
    r >= g && g >= b && (r - b) > 35 && (g - b) < 95;
}

// componentes de pele → candidato ao punho (mais à direita). Roda na
// resolução CHEIA (a ÷2 fragmentava a mão em blobs <4px) e exclui o
// componente da cara = o que contém o pixel de pele mais alto.
// Dois modos: 'estrito' (ataque — o relaxado funde o punho erguido com
// a cara e a mão some) e 'relaxado' (idle/walk — a mão na sombra pede
// o corte r-g solto + merge de blobs; o estrito fragmentava ela).
function punho(img, modo) {
  const estrito = modo === 'estrito';
  function teste(r, g, b) {
    if (!(r > 150 && g >= 90 && g < 215 && b < 175 &&
      r >= g && g >= b && (r - b) > 35 && (g - b) < 95)) return false;
    if (estrito && (r - g) >= 95) return false;
    return true;
  }
  const mask = new Uint8Array(img.w * img.h);
  for (let y = 0; y < img.h; y++) {
    for (let x = 0; x < img.w; x++) {
      const i = y * img.w + x;
      if (!img.al[i]) continue;
      const o = i * 3;
      if (teste(img.px[o], img.px[o + 1], img.px[o + 2])) mask[i] = 1;
    }
  }
  // componentes por flood fill (4 vizinhos)
  const comp = new Int32Array(img.w * img.h).fill(-1);
  const comps = [];
  const fila = [];
  for (let s = 0; s < mask.length; s++) {
    if (!mask[s] || comp[s] >= 0) continue;
    const id = comps.length;
    const pts = [];
    fila.length = 0; fila.push(s); comp[s] = id;
    while (fila.length) {
      const i = fila.pop();
      pts.push(i);
      const x = i % img.w, y = (i / img.w) | 0;
      const viz = [];
      if (x > 0) viz.push(i - 1);
      if (x < img.w - 1) viz.push(i + 1);
      if (y > 0) viz.push(i - img.w);
      if (y < img.h - 1) viz.push(i + img.w);
      for (const v of viz) if (mask[v] && comp[v] < 0) { comp[v] = id; fila.push(v); }
    }
    comps.push(pts);
  }
  if (!comps.length) return null;
  // a cara = componente do pixel de pele mais alto (testa/charco)
  let cara = 0, topo = 1e9;
  comps.forEach((pts, id) => {
    for (const i of pts) {
      const y = (i / img.w) | 0;
      if (y < topo) { topo = y; cara = id; }
    }
  });
  // a mão se fragmenta em blobs (contorno interno do desenho quebra a
  // conectividade: 2px + 5px) — merge por proximidade de caixa (≤2px)
  // depois de tirar a cara, e aí filtra por área (só no modo relaxado:
  // no estrito o merge funde o punho com a cara)
  const caixas = comps.map(pts => {
    let minx = 1e9, miny = 1e9, maxx = -1, maxy = -1;
    for (const i of pts) {
      const x = i % img.w, y = (i / img.w) | 0;
      if (x < minx) minx = x;
      if (x > maxx) maxx = x;
      if (y < miny) miny = y;
      if (y > maxy) maxy = y;
    }
    return { minx, miny, maxx, maxy, pts };
  });
  const grupos = [];
  caixas.forEach((c, id) => {
    if (id === cara) return;
    const perto = estrito ? [] : grupos.filter(g =>
      !(c.minx > g.maxx + 2 || c.maxx < g.minx - 2 ||
        c.miny > g.maxy + 2 || c.maxy < g.miny - 2));
    if (perto.length) {
      const alvo = perto[0];
      alvo.pts = alvo.pts.concat(c.pts);
      alvo.minx = Math.min(alvo.minx, c.minx);
      alvo.maxx = Math.max(alvo.maxx, c.maxx);
      alvo.miny = Math.min(alvo.miny, c.miny);
      alvo.maxy = Math.max(alvo.maxy, c.maxy);
      for (let k = 1; k < perto.length; k++) {
        alvo.pts = alvo.pts.concat(perto[k].pts);
        alvo.minx = Math.min(alvo.minx, perto[k].minx);
        alvo.maxx = Math.max(alvo.maxx, perto[k].maxx);
        alvo.miny = Math.min(alvo.miny, perto[k].miny);
        alvo.maxy = Math.max(alvo.maxy, perto[k].maxy);
        grupos.splice(grupos.indexOf(perto[k]), 1);
      }
    } else {
      grupos.push({ minx: c.minx, miny: c.miny, maxx: c.maxx, maxy: c.maxy, pts: c.pts });
    }
  });
  const minPts = estrito ? 6 : 4;
  let melhor = null;
  grupos.forEach(g => {
    if (g.pts.length < minPts) return;
    let sx = 0, sy = 0;
    for (const i of g.pts) { sx += i % img.w; sy += (i / img.w) | 0; }
    const cx = sx / g.pts.length, cy = sy / g.pts.length;
    if (!melhor || cx > melhor.cx) melhor = { cx, cy };
  });
  if (!melhor) return null;
  // devolve em coordenadas do frame FINAL (÷2)
  return { x: Math.round(melhor.cx / 2), y: Math.round(melhor.cy / 2) };
}

// recolor: pixels do marcador magenta → rampa da raridade
function recolor(img, cor) {
  const ramp = Sprite.rampa(cor);
  const px = Buffer.from(img.px);
  for (let i = 0; i < img.w * img.h; i++) {
    const o = i * 3;
    const r = img.px[o], g = img.px[o + 1], b = img.px[o + 2];
    if (!(r > 90 && b > 90 && g < Math.min(r, b) * 0.62)) continue;  // magenta
    const lum = 0.299 * r + 0.587 * g + 0.11 * b;
    const alvo = lum > 150 ? ramp.luz : lum > 95 ? ramp.base : ramp.som;
    const n = parseInt(alvo.slice(1), 16);
    px[o] = (n >> 16) & 255; px[o + 1] = (n >> 8) & 255; px[o + 2] = n & 255;
  }
  return { w: img.w, h: img.h, px, al: img.al };
}

// "ponta de trás" da arma por ângulo + offset ao longo do eixo
function pegar(img, angulo, off) {
  const pts = [];
  for (let y = 0; y < img.h; y++) {
    for (let x = 0; x < img.w; x++) if (img.al[y * img.w + x]) pts.push([x, y]);
  }
  if (!pts.length) return [0, 0];
  let base;
  if (angulo === 'meio') {
    const minX = Math.min(...pts.map(p => p[0]));
    const sel = pts.filter(p => p[0] <= minX + 1);
    base = [minX, Math.round(sel.reduce((s, p) => s + p[1], 0) / sel.length)];
    return [Math.min(img.w - 1, base[0] + off), base[1]];
  }
  if (angulo === 'cima') {          // aponta p/ cima-direita: trás = baixo-esq
    const maxY = Math.max(...pts.map(p => p[1]));
    const sel = pts.filter(p => p[1] >= maxY - 1);
    base = [Math.round(sel.reduce((s, p) => s + p[0], 0) / sel.length), maxY];
    // eixo (1,-1)/√2 → desloca p/ cima-direita... não: a mão fica ATRÁS,
    // então desloca no sentido contrário (baixo-esquerda) = (+off em x? não)
    return [Math.min(img.w - 1, Math.max(0, base[0] + Math.round(off * 0.7))),
      Math.max(0, base[1] - Math.round(off * 0.7))];
  }
  const minY = Math.min(...pts.map(p => p[1]));   // baixo: trás = topo-esq
  const sel = pts.filter(p => p[1] <= minY + 1);
  base = [Math.round(sel.reduce((s, p) => s + p[0], 0) / sel.length), minY];
  return [Math.min(img.w - 1, Math.max(0, base[0] + Math.round(off * 0.7))),
    Math.min(img.h - 1, base[1] + Math.round(off * 0.7))];
}

// --------------------------------------------------------------- montagem
if (final) {
  fs.mkdirSync(DIR_HEROI, { recursive: true });
  fs.mkdirSync(DIR_ARMA, { recursive: true });
}

const relatorio = { herois: {}, armas: {}, punhos: {} };
const framesFinais = {};   // anim → [img] (em memória, p/ QA)

// --- heróis: fatia ÷2 + diagnóstico de alinhamento -----------------------
for (const anim of ANIMS) {
  const sheet = carrega(path.join(FONTE, 'guerreiro-' + anim + '.png'));
  if (anim === 'ataque') limpaFragments(sheet);
  const frames = fatia(sheet, 8);
  relatorio.herois[anim] = [];
  framesFinais[anim] = [];
  frames.forEach((fr, i) => {
    const red = reduz(fr, Math.round(fr.w / FATOR_H), Math.round(fr.h / FATOR_H));
    const cx = caixa(red);
    // detecção na resolução cheia (devolve ÷2); modo por animação
    let pun = punho(fr, anim === 'ataque' ? 'estrito' : 'relaxado');
    const ov = OVERRIDE[anim + '-' + i];
    if (ov) pun = { x: ov[0], y: ov[1] };
    relatorio.herois[anim].push({
      i, caixa: cx, punho: pun,
      tam: red.w + 'x' + red.h
    });
    framesFinais[anim].push(red);
    if (final) {
      escreverPNG(path.join(DIR_HEROI, 'guerreiro-' + anim + '-' + i + '.png'),
        red.w, red.h, red.px, red.al);
    }
    if (!pun) console.log('  !! sem punho: ' + anim + ' frame ' + i);
  });
}

// --- armas: ÷4 + raridades ----------------------------------------------
const armasFinais = {};   // 'espada' → 'meio' → { w, h, pegar }
const armasImgs = {};     // idem → img reduzida (p/ QA)
for (const arma of ARMS) {
  armasFinais[arma] = {};
  armasImgs[arma] = {};
  for (const ang of ANGULOS) {
    const fonte = carrega(path.join(FONTE, 'armas', arma + '-' + ang + '.png'));
    const red = reduz(fonte, Math.max(1, Math.round(fonte.w / FATOR_A)),
      Math.max(1, Math.round(fonte.h / FATOR_A)));
    const pg = pegar(red, ang, OFFSET_PEGAR[arma]);
    armasFinais[arma][ang] = { w: red.w, h: red.h, pegar: pg };
    armasImgs[arma][ang] = red;
    relatorio.armas[arma + '-' + ang] = { w: red.w, h: red.h, pegar: pg };
    for (const rar of RARS) {
      const cor = Sprite.corArma(rar);
      const rc = recolor(red, cor);
      if (final) {
        escreverPNG(path.join(DIR_ARMA, arma + '-' + ang + '-r' + rar + '.png'),
          rc.w, rc.h, rc.px, rc.al);
      }
    }
  }
}

console.log(JSON.stringify(relatorio, null, 1));

// ------------------------------------------------------------------- QA
// folha: 3 linhas (anim) × 8 frames, arma composta no punho detectado,
// marcador vermelho no punho — p/ conferir âncora e ângulo à mão
const ANG_ATAQUE = ['baixo', 'cima', 'cima', 'cima', 'cima', 'meio', 'meio', 'baixo'];
// frame em que a arma é espelhada (follow-through: punho cruzou p/ a
// esquerda do corpo, a lâmina aponta pra lá)
const ESP_ATAQUE = [false, false, false, false, false, false, true, false];
const ESC = 4, MARG = 6;
const fw = Math.round(43), fh = 43;
const celW = (fw + MARG) * ESC, celH = (fh + MARG + 14) * ESC;
const W = 8 * celW, H = 3 * celH;
const out = Buffer.alloc(W * H * 3);
const BG = [[46, 40, 64], [38, 33, 54]];
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const d = (y * W + x) * 3, b = BG[((x >> 5) + (y >> 5)) % 2];
    out[d] = b[0]; out[d + 1] = b[1]; out[d + 2] = b[2];
  }
}
function cola(img, cx, cy, esc, esp) {
  for (let y = 0; y < img.h; y++) {
    for (let x = 0; x < img.w; x++) {
      const sx = esp ? img.w - 1 - x : x;
      const i = y * img.w + sx;
      if (img.al && !img.al[i]) continue;
      const s = i * 3;
      for (let j = 0; j < esc; j++) {
        for (let k = 0; k < esc; k++) {
          const px = cx + x * esc + k, py = cy + y * esc + j;
          if (px < 0 || py < 0 || px >= W || py >= H) continue;
          const d = (py * W + px) * 3;
          out[d] = img.px[s]; out[d + 1] = img.px[s + 1];
          out[d + 2] = img.px[s + 2];
        }
      }
    }
  }
}
function marca(cx, cy) {   // cruz vermelha 3px
  for (let j = -3; j <= 3; j++) {
    for (let k = -3; k <= 3; k++) {
      if (Math.abs(j) > 1 && Math.abs(k) > 1) continue;
      const px = cx + k, py = cy + j;
      if (px < 0 || py < 0 || px >= W || py >= H) continue;
      const d = (py * W + px) * 3;
      out[d] = 255; out[d + 1] = 40; out[d + 2] = 60;
    }
  }
}
ANIMS.forEach((anim, li) => {
  const rel = relatorio.herois[anim];
  rel.forEach((info, i) => {
    const fr = framesFinais[anim][i];
    const ox = i * celW + MARG, oy = li * celH + MARG;
    cola(fr, ox, oy, ESC);
    if (info.punho) {
      const ang = anim === 'ataque' ? ANG_ATAQUE[i] : 'baixo';
      const esp = anim === 'ataque' && ESP_ATAQUE[i];
      const a = armasFinais.espada[ang];
      const wq = armasImgs.espada[ang];
      const gx = esp ? (a.w - 1 - a.pegar[0]) : a.pegar[0];
      cola(wq, ox + (info.punho.x - gx) * ESC,
        oy + (info.punho.y - a.pegar[1]) * ESC, ESC, esp);
      marca(ox + info.punho.x * ESC, oy + info.punho.y * ESC);
    }
  });
});
escreverPNG('/tmp/qa-composite.png', W, H, out);
console.log('QA: /tmp/qa-composite.png (' + W + 'x' + H + ')');
