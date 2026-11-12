// Captura screenshots reais das telas do jogo usando um canvas falsificado
// que rasteriza de verdade (fillRect, strokeRect, drawImage, elipse, texto,
// translate/scale/setTransform com clip). Uso: node testes/cena.js
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
    sx: 1, sy: 1,          // escala do transform (setTransform/scale)
    alpha: 1,
    fillStyle: '#000000',
    strokeStyle: null,     // null => usa fillStyle (quem não define)
    lw: 1,                 // lineWidth
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
    get strokeStyle() { return st.strokeStyle; },
    set strokeStyle(v) { st.strokeStyle = v; },
    get lineWidth() { return st.lw; },
    set lineWidth(v) { st.lw = v; },
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
      // itera em pixels de DISPOSITIVO: com escala (ex.: k=2 da arena)
      // cada retângulo preenche a área toda, sem buracos
      const X0 = Math.round(st.tx + x * st.sx);
      const Y0 = Math.round(st.ty + y * st.sy);
      const X1 = Math.round(st.tx + (x + w) * st.sx);
      const Y1 = Math.round(st.ty + (y + h) * st.sy);
      for (let Y = Y0; Y < Y1; Y++) {
        for (let X = X0; X < X1; X++) put(cv, X, Y, r, g, b, a);
      }
    },

    strokeRect(x, y, w, h) {
      // cor do traço: strokeStyle quando definido (o jogo sempre define
      // antes), senão fillStyle — antes a borda era pintada com a cor de
      // fundo e sumia nas screenshots
      const cor = st.strokeStyle != null ? st.strokeStyle : st.fillStyle;
      const [r, g, b, a0] = parseCor(cor);
      const a = a0 * st.alpha;
      const X0 = Math.round(st.tx + x * st.sx);
      const Y0 = Math.round(st.ty + y * st.sy);
      const X1 = Math.round(st.tx + (x + w) * st.sx);
      const Y1 = Math.round(st.ty + (y + h) * st.sy);
      const t = Math.max(1, Math.round(st.lw * Math.max(st.sx, st.sy)));
      // traço centrado no path (como o browser): lw=1 (UI) não muda,
      // lw=8 (borda do mundo) passa a cobrir os 4px de cada lado
      const off = t >> 1;
      for (let i = 0; i < t; i++) {
        for (let X = X0; X < X1; X++) {          // topo e base
          put(cv, X, Y0 - off + i, r, g, b, a);
          put(cv, X, Y1 - 1 - off + i, r, g, b, a);
        }
        for (let Y = Y0; Y < Y1; Y++) {          // laterais
          put(cv, X0 - off + i, Y, r, g, b, a);
          put(cv, X1 - 1 - off + i, Y, r, g, b, a);
        }
      }
    },

    fillText(str, x, y) {
      const texto = String(str);
      // métricas em espaço de jogo a partir do px real da fonte: 8px era
      // o caso fixo, 16px (UI nova) herda a proporção
      const px = parseFloat((st.font.match(/(\d+(?:\.\d+)?)px/) || [0, 8])[1]);
      const bold = st.font.includes('bold');
      const largo = px * (bold ? 0.625 : 0.6);
      const h = Math.round(px * 0.875);
      const bloco = Math.max(1, Math.round(largo - px / 4));
      const w = texto.length * largo;
      let x0 = x;
      if (st.textAlign === 'center') x0 = x - w / 2;
      else if (st.textAlign === 'right') x0 = x - w;
      let y0 = y - h / 2;
      if (st.textBaseline === 'top') y0 = y;
      else if (st.textBaseline === 'bottom') y0 = y - h;
      const [r, g, b, a0] = parseCor(st.fillStyle);
      const a = a0 * st.alpha;
      // glifo simulado em pixels de dispositivo (sem pular linha na escala)
      const X0 = st.tx + x0 * st.sx;
      const Y0 = st.ty + y0 * st.sy;
      const pitch = largo * st.sx;
      const altD = Math.max(1, Math.round((h - 1) * st.sy));
      const largD = Math.max(1, Math.round(bloco * st.sx));
      for (let i = 0; i < texto.length; i++) {
        if (texto[i] === ' ') continue;
        const lx = X0 + i * pitch;
        for (let j = 0; j < altD; j++) {
          for (let k = 0; k < largD; k++) put(cv, lx + k, Y0 + j, r, g, b, a);
        }
      }
    },

    measureText(str) {
      const px = parseFloat((st.font.match(/(\d+(?:\.\d+)?)px/) || [0, 8])[1]);
      return { width: String(str).length * px * 0.6 * st.sx };
    },

    drawImage(src, dx, dy, dw, dh) {
      if (!src || !src._data) return;
      if (dw === undefined) { dw = src.width; dh = src.height; }
      const sw = src.width, sh = src.height;
      // itera em pixels de dispositivo: escala vira bloco nítido (nearest)
      const DW = Math.max(1, Math.round(dw * st.sx));
      const DH = Math.max(1, Math.round(dh * st.sy));
      const X0 = st.tx + dx * st.sx;
      const Y0 = st.ty + dy * st.sy;
      for (let Y = 0; Y < DH; Y++) {
        for (let X = 0; X < DW; X++) {
          const ix = Math.min(sw - 1, Math.floor(X * sw / DW));
          const iy = Math.min(sh - 1, Math.floor(Y * sh / DH));
          const so = (iy * sw + ix) * 4;
          const a = src._data[so + 3] / 255;
          if (a <= 0) continue;
          put(cv, X0 + X, Y0 + Y,
            src._data[so], src._data[so + 1], src._data[so + 2], a);
        }
      }
    },

    beginPath() { elipsePend = null; retPend = null; },
    rect(x, y, w, h) {
      // em espaço de dispositivo (o clip é fixo no device, como no browser)
      retPend = { x: st.tx + x * st.sx, y: st.ty + y * st.sy,
                  w: w * st.sx, h: h * st.sy };
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
      // amostra em pixels de dispositivo e testa a elipse em espaço de
      // jogo — com escala não pula linha nem abre buraco
      const X0 = Math.floor(st.tx + (cx - rx) * st.sx);
      const X1 = Math.ceil(st.tx + (cx + rx) * st.sx);
      const Y0 = Math.floor(st.ty + (cy - ry) * st.sy);
      const Y1 = Math.ceil(st.ty + (cy + ry) * st.sy);
      for (let Y = Y0; Y <= Y1; Y++) {
        for (let X = X0; X <= X1; X++) {
          const dx = ((X - st.tx) / st.sx + 0.5 - cx) / rx;
          const dy = ((Y - st.ty) / st.sy + 0.5 - cy) / ry;
          if (dx * dx + dy * dy <= 1) put(cv, X, Y, r, g, b, a);
        }
      }
      elipsePend = null;
    },
    closePath() {},
    stroke() {
      // contorno do elipse: aproximamos com o fill já tratado acima
    },

    save() {
      pilha.push({ tx: st.tx, ty: st.ty, sx: st.sx, sy: st.sy,
                   alpha: st.alpha, clip: cv._clip });
    },
    restore() {
      const p = pilha.pop();
      if (p) {
        st.tx = p.tx; st.ty = p.ty; st.sx = p.sx; st.sy = p.sy;
        st.alpha = p.alpha; cv._clip = p.clip;
      }
    },
    translate(x, y) { st.tx += x * st.sx; st.ty += y * st.sy; },
    scale(sx, sy) { st.sx *= sx; st.sy *= sy; },
    setTransform(a, b, c, d, e, f) {
      // o jogo não usa rotação (b/c): só escala + translação
      st.sx = a; st.sy = d; st.tx = e; st.ty = f;
    },
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
// deslocamento do painel direito (0 em 16:9; JANELA larga => dx > 0)
const dxL = sandbox.Game.W - 768;

// a tela inicial é a seleção/criação (a jogatina é outra tela)
salvar('tela-selecao.png');

// JOGAR entra na arena
clique(120, 388);
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

// gestao: aba aparência (âncora direita em tela larga)
clique(515 + dxL, 50);   // aba Aparência
frame(4);
salvar('tela-aparencia.png');

// gestão: aba classe (âncora direita em tela larga)
clique(585 + dxL, 50);   // aba Classe
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

// skills em ação: um screenshot por tipo de efeito (herói nivel 6 =
// exatamente 1 skill por classe → efeito determinístico)
function capturaSkill(classe, arquivo) {
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
  console.log('skill/' + classe + ': ' +
    (espera < 1800 ? 'efeito ok em ' + espera + ' frames' : 'NÃO DISPAROU') +
    ' -> ' + arquivo);
}
capturaSkill('mago', 'tela-skill-projetil.png');   // projétil + explosão
capturaSkill('guerreiro', 'tela-skill-corte.png');  // arco de corte
capturaSkill('ladino', 'tela-skill-veneno.png');    // veneno: ícone + sombra
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
capturaSkill('clerigo', 'tela-skill-cura.png');    // motes + anel de cura

// aba Stats: estatísticas do jogador (5ª aba da grade)
clique(412 + 4 * 70 + 33 + dxL, 54);
frame(4);
salvar('tela-stats.png');

// cutscene de fronteira de mundo (spec cutscenes): mapa do universo +
// narração — o 2º mundo entra com 1 conquistado e o atual destacado
sandbox.Cutscene.mundo(1, 2);
for (let i = 0; i < 4; i++) frame(1);
salvar('tela-cutscene.png');
sandbox.Cutscene.fecha();

// cutscene de evento (auto-dismiss ~3,5s — captura no ar)
sandbox.Cutscene.evento('acougueiro');
for (let i = 0; i < 4; i++) frame(1);
salvar('tela-cutscene-evento.png');
sandbox.Cutscene.fecha();

// mapa do universo como cena própria (progresso do save: mundo 3)
sandbox.Salvar.salvarEstado(sandbox.Game.personagem.id, 25, Date.now(),
  false, 25);
sandbox.Game.setScene('universo');
frame(4);
salvar('tela-universo.png');
sandbox.Game.setScene('jogo');
frame(2);

console.log('cena atual: ' + sandbox.Game.cena);
console.log('batalha: ' + JSON.stringify(sandbox.Batalha.info()));
