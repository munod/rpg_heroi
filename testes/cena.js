// Captura screenshots reais das telas do jogo usando um canvas falsificado
// que rasteriza de verdade (fillRect, drawImage, elipse, texto, translate).
// Uso: node testes/cena.js   ->  tela-selecao.png, tela-jogo.png, ...
'use strict';

const path = require('path');

const { carregar } = require('./carga');
const { escreverPNG } = require('./png');

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
clique(270, 25);
frame(4);
salvar('tela-aparencia.png');

// gestão: aba classe
clique(314, 25);
frame(4);
salvar('tela-classe.png');

// boss da onda 100
sandbox.Batalha.restaurarOnda(100);
for (let i = 0; i < 60 && sandbox.Batalha.info().onda < 100; i++) frame(1);
for (let i = 0; i < 30; i++) frame(1);
salvar('tela-boss.png');
console.log('boss: ' + JSON.stringify(sandbox.Batalha.info()));

// mapa 2: cripta com chão e monstros próprios
sandbox.Batalha.restaurarMapa(2);
sandbox.Batalha.restaurarOnda(6);
for (let i = 0; i < 60 && sandbox.Batalha.info().inimigos === 0; i++) frame(1);
for (let i = 0; i < 40; i++) frame(1);
salvar('tela-mapa2.png');
console.log('mapa 2: ' + JSON.stringify(sandbox.Batalha.info()));

// magias em ação: um screenshot por tipo de efeito (herói nivel 6 =
// exatamente 1 magia por classe → efeito determinístico)
function capturaMagia(classe, arquivo) {
  sandbox.Game.personagem.classe = classe;
  sandbox.Game.personagem.nivel = Math.max(6, sandbox.Game.personagem.nivel);
  sandbox.Efeitos.limpar();
  let espera = 0;
  while (sandbox.Efeitos.qtd() === 0 && espera < 1800) {
    frame(1);
    espera++;
  }
  for (let i = 0; i < 5; i++) frame(1);
  salvar(arquivo);
  console.log('magia/' + classe + ': ' +
    (espera < 1800 ? 'efeito ok em ' + espera + ' frames' : 'NÃO DISPAROU') +
    ' -> ' + arquivo);
}
capturaMagia('mago', 'tela-magia.png');            // missil + explosão
capturaMagia('guerreiro', 'tela-magia-corte.png');  // arco de corte
capturaMagia('ladino', 'tela-magia-veneno.png');    // veneno: ícone + sombra
// clérigo precisa estar ferido para a Bênção mostrar os motes
sandbox.Game.personagem.classe = 'clerigo';
sandbox.Game.personagem.atributos.con = 1;
let ferido = false;
for (let i = 0; i < 1800 && !ferido; i++) {
  frame(1);
  if (!sandbox.Batalha.info().morto) {
    ferido = sandbox.Batalha.info().hp <
      sandbox.Personagem.status(sandbox.Game.personagem).hpMax - 10;
  }
}
capturaMagia('clerigo', 'tela-magia-cura.png');    // motes + anel de cura

console.log('cena atual: ' + sandbox.Game.cena);
console.log('batalha: ' + JSON.stringify(sandbox.Batalha.info()));
