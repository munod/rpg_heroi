// Captura screenshots reais das telas do jogo usando um canvas falsificado
// que rasteriza de verdade (fillRect, drawImage, elipse, texto, translate).
// Uso: node testes/cena.js   ->  tela-selecao.png, tela-jogo.png, ...
'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const { carregar } = require('./carga');

// ------------------------------------------------------------------ PNG
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
function escreverPNG(arquivo, larg, alt, rgb) {
  const cru = Buffer.alloc(alt * (1 + larg * 3));
  for (let y = 0; y < alt; y++) {
    cru[y * (1 + larg * 3)] = 0;
    rgb.copy(cru, y * (1 + larg * 3) + 1, y * larg * 3, (y + 1) * larg * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(larg, 0);
  ihdr.writeUInt32BE(alt, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  fs.writeFileSync(arquivo, Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(cru)),
    chunk('IEND', Buffer.alloc(0))
  ]));
}

// ------------------------------------------------------- cor / blending
function parseCor(s) {
  if (typeof s !== 'string') return [255, 0, 255, 1];
  if (s[0] === '#') {
    const n = parseInt(s.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
  }
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const p = m[1].split(',').map(v => parseFloat(v));
    return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
  }
  return [255, 0, 255, 1];
}

function put(cv, x, y, r, g, b, a) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= cv.width || y >= cv.height || a <= 0) return;
  if (cv._clip && (x < cv._clip.x || y < cv._clip.y ||
      x >= cv._clip.x + cv._clip.w || y >= cv._clip.y + cv._clip.h)) return;
  const o = (y * cv.width + x) * 4;
  const d = cv._data;
  const ia = 1 - a;
  d[o] = Math.min(255, Math.round(r * a + d[o] * ia));
  d[o + 1] = Math.min(255, Math.round(g * a + d[o + 1] * ia));
  d[o + 2] = Math.min(255, Math.round(b * a + d[o + 2] * ia));
  d[o + 3] = Math.min(255, Math.round(a * 255 + d[o + 3] * ia));
}

// ------------------------------------------------------ contexto RGBA
// o buffer da tela é alocado aqui, na primeira chamada (é quando o
// getContext do harness invoca esta fábrica)
function novoCtxRGBA(cv) {
  if (!cv._data || cv._data.length !== cv.width * cv.height * 4) {
    cv._data = Buffer.alloc(cv.width * cv.height * 4);
  }
  const st = {
    tx: 0, ty: 0,
    alpha: 1,
    fillStyle: '#000000',
    font: '8px monospace',
    textAlign: 'left',
    textBaseline: 'middle'
  };
  const pilha = [];
  let elipsePend = null;
  let retPend = null;

  const api = {
    get fillStyle() { return st.fillStyle; },
    set fillStyle(v) { st.fillStyle = v; },
    get font() { return st.font; },
    set font(v) { st.font = v; },
    get textAlign() { return st.textAlign; },
    set textAlign(v) { st.textAlign = v; },
    get textBaseline() { return st.textBaseline; },
    set textBaseline(v) { st.textBaseline = v; },
    get globalAlpha() { return st.alpha; },
    set globalAlpha(v) { st.alpha = v; },

    fillRect(x, y, w, h) {
      const [r, g, b, a0] = parseCor(st.fillStyle);
      const a = a0 * st.alpha;
      for (let j = 0; j < h; j++) {
        for (let i = 0; i < w; i++) put(cv, st.tx + x + i, st.ty + y + j, r, g, b, a);
      }
    },

    strokeRect(x, y, w, h) {
      const [r, g, b, a0] = parseCor(st.fillStyle);
      const a = a0 * st.alpha;
      for (let i = 0; i < w; i++) {
        put(cv, st.tx + x + i, st.ty + y, r, g, b, a);
        put(cv, st.tx + x + i, st.ty + y + h - 1, r, g, b, a);
      }
      for (let j = 0; j < h; j++) {
        put(cv, st.tx + x, st.ty + y + j, r, g, b, a);
        put(cv, st.tx + x + w - 1, st.ty + y + j, r, g, b, a);
      }
    },

    // strokeStyle é ignorado: o jogo sempre define fillStyle antes; para
    // stroke usamos strokeStyle quando existir
    _stroke: null,

    fillText(str, x, y) {
      const texto = String(str);
      const largo = st.font.includes('bold') ? 5.0 : 4.8;
      const w = texto.length * largo;
      const h = 7;
      let x0 = x;
      if (st.textAlign === 'center') x0 = x - w / 2;
      else if (st.textAlign === 'right') x0 = x - w;
      let y0 = y - h / 2;
      if (st.textBaseline === 'top') y0 = y;
      else if (st.textBaseline === 'bottom') y0 = y - h;
      const [r, g, b, a0] = parseCor(st.fillStyle);
      const a = a0 * st.alpha;
      // simula letras: um bloco por caractere com 1px de intervalo
      for (let i = 0; i < texto.length; i++) {
        if (texto[i] === ' ') continue;
        const lx = x0 + i * largo;
        for (let j = 0; j < h - 1; j++) {
          for (let k = 0; k < Math.max(1, Math.round(largo - 2)); k++) {
            put(cv, st.tx + lx + k, st.ty + y0 + j, r, g, b, a);
          }
        }
      }
    },

    measureText(str) {
      return { width: String(str).length * 4.8 };
    },

    drawImage(src, dx, dy, dw, dh) {
      if (!src || !src._data) return;
      if (dw === undefined) { dw = src.width; dh = src.height; }
      const sw = src.width, sh = src.height;
      for (let y = 0; y < dh; y++) {
        for (let x = 0; x < dw; x++) {
          const sx = Math.min(sw - 1, Math.floor(x * sw / dw));
          const sy = Math.min(sh - 1, Math.floor(y * sh / dh));
          const so = (sy * sw + sx) * 4;
          const a = src._data[so + 3] / 255;
          if (a <= 0) continue;
          put(cv, st.tx + dx + x, st.ty + dy + y,
            src._data[so], src._data[so + 1], src._data[so + 2], a);
        }
      }
    },

    beginPath() { elipsePend = null; retPend = null; },
    rect(x, y, w, h) {
      retPend = { x: st.tx + x, y: st.ty + y, w: w, h: h };
    },
    clip() {
      if (!retPend) return;
      const r = retPend;
      const atual = cv._clip;
      if (!atual) {
        cv._clip = { x: r.x, y: r.y, w: r.w, h: r.h };
      } else {
        const x0 = Math.max(atual.x, r.x);
        const y0 = Math.max(atual.y, r.y);
        const x1 = Math.min(atual.x + atual.w, r.x + r.w);
        const y1 = Math.min(atual.y + atual.h, r.y + r.h);
        cv._clip = { x: x0, y: y0, w: Math.max(0, x1 - x0), h: Math.max(0, y1 - y0) };
      }
      retPend = null;
    },
    ellipse(cx, cy, rx, ry) {
      elipsePend = { cx, cy, rx, ry };
    },
    fill() {
      if (!elipsePend) return;
      const { cx, cy, rx, ry } = elipsePend;
      const [r, g, b, a0] = parseCor(st.fillStyle);
      const a = a0 * st.alpha;
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
        for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
          const dx = (x + 0.5 - cx) / rx;
          const dy = (y + 0.5 - cy) / ry;
          if (dx * dx + dy * dy <= 1) put(cv, st.tx + x, st.ty + y, r, g, b, a);
        }
      }
      elipsePend = null;
    },
    closePath() {},
    stroke() {
      // contorno do elipse: aproximamos com o fill já tratado acima
    },

    save() {
      pilha.push({ tx: st.tx, ty: st.ty, alpha: st.alpha, clip: cv._clip });
    },
    restore() {
      const p = pilha.pop();
      if (p) { st.tx = p.tx; st.ty = p.ty; st.alpha = p.alpha; cv._clip = p.clip; }
    },
    translate(x, y) { st.tx += x; st.ty += y; },
    setTransform() {},
    clearRect() {}
  };
  return api;
}

// ------------------------------------------------------------ harness
// mesmo harness dos demais testes, só o contexto 2d que é diferente
const {
  sandbox, jogoCanvas, ouvintesJanela, frame, clique
} = carregar({ novoCtx: novoCtxRGBA });

function salvar(nome) {
  const W = jogoCanvas.width, H = jogoCanvas.height;
  const rgb = Buffer.alloc(W * H * 3);
  const d = jogoCanvas._data;
  for (let i = 0; i < W * H; i++) {
    const a = d[i * 4 + 3] / 255;
    rgb[i * 3] = Math.round(d[i * 4] * a + 13 * (1 - a));
    rgb[i * 3 + 1] = Math.round(d[i * 4 + 1] * a + 11 * (1 - a));
    rgb[i * 3 + 2] = Math.round(d[i * 4 + 2] * a + 20 * (1 - a));
  }
  const arquivo = path.join(__dirname, nome);
  escreverPNG(arquivo, W, H, rgb);
  console.log('gerado: ' + arquivo);
}

// ------------------------------------------------------------- roteiro
(ouvintesJanela.load || []).forEach(fn => fn({}));
frame(12);
// a tela inicial é a seleção/criação (a jogatina é outra tela)
salvar('tela-selecao.png');

// JOGAR entra na arena
clique(60, 194);
frame(4);
salvar('tela-jogo.png');

// deixa a batalha automática rodar até ter inimigos em campo e luta começada
let info = sandbox.Batalha.info();
for (let i = 0; i < 3000 && info.inimigos < 2; i++) {
  frame(1);
  info = sandbox.Batalha.info();
}
for (let i = 0; i < 150; i++) frame(1);
salvar('tela-jogo-luta.png');
console.log('luta: ' + JSON.stringify(sandbox.Batalha.info()));

// gestao: aba aparência
clique(291, 25);
frame(4);
salvar('tela-aparencia.png');

// gestão: aba classe
clique(349, 25);
frame(4);
salvar('tela-classe.png');

// boss da onda 100
sandbox.Batalha.restaurarOnda(100);
for (let i = 0; i < 60 && sandbox.Batalha.info().onda < 100; i++) frame(1);
for (let i = 0; i < 30; i++) frame(1);
salvar('tela-boss.png');
console.log('boss: ' + JSON.stringify(sandbox.Batalha.info()));

console.log('cena atual: ' + sandbox.Game.cena);
console.log('batalha: ' + JSON.stringify(sandbox.Batalha.info()));
