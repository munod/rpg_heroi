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
      // itera em pixels de dispositivo: escala vira bloco nítido
      // (nearest); escala NEGATIVA espelha (virada do herói —
      // spec virada-ataque): origem na borda da extensão e índice
      // da fonte invertido por eixo
      const flipX = st.sx < 0, flipY = st.sy < 0;
      const DW = Math.max(1, Math.round(Math.abs(dw * st.sx)));
      const DH = Math.max(1, Math.round(Math.abs(dh * st.sy)));
      const X0 = st.tx + (flipX ? (dx + dw) * st.sx : dx * st.sx);
      const Y0 = st.ty + (flipY ? (dy + dh) * st.sy : dy * st.sy);
      for (let Y = 0; Y < DH; Y++) {
        for (let X = 0; X < DW; X++) {
          const ix = Math.min(sw - 1,
            Math.floor((flipX ? DW - 1 - X : X) * sw / DW));
          const iy = Math.min(sh - 1,
            Math.floor((flipY ? DH - 1 - Y : Y) * sh / DH));
          const so = (iy * sw + ix) * 4;
          const a = src._data[so + 3] / 255 * st.alpha;
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
      if (retPend) {
        // retângulo do caminho (UI.caminho — cantos arredondados caem
        // no rect no rasterizador): o fill() antes só tratava elipse e
        // os painéis/botões novos sumiam das screenshots
        const r = retPend;
        retPend = null;
        const [pr, pg, pb, pa0] = parseCor(st.fillStyle);
        const pa = pa0 * st.alpha;
        const X0 = Math.round(r.x);
        const Y0 = Math.round(r.y);
        const X1 = Math.round(r.x + r.w);
        const Y1 = Math.round(r.y + r.h);
        for (let Y = Y0; Y < Y1; Y++) {
          for (let X = X0; X < X1; X++) put(cv, X, Y, pr, pg, pb, pa);
        }
        return;
      }
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

// prévia do herói na CRIAÇÃO (spec preview-heroi): aba Apar na tela de
// seleção — e volta pra Atributos p/ não alterar o resto do roteiro
clique(312, 418);
frame(3);
salvar('tela-selecao-apar.png');
clique(240, 418);
frame(2);

// JOGAR entra na arena
clique(120, 388);
frame(4);
salvar('tela-jogo.png');

// deixa a batalha automática rodar até ter inimigos em campo e luta
// começada — o anel full screen (≈460px, R-MF-2) dá ~10s de
// aproximação: espera o CONTATO (inimigoPerto) p/ a foto mostrar a
// briga de verdade (teto p/ não prender o roteiro)
let info = sandbox.Batalha.info();
for (let i = 0; i < 3000 && info.inimigos < 2; i++) {
  frame(1);
  info = sandbox.Batalha.info();
}
for (let i = 0; i < 3000 && info.inimigoPerto > 40; i++) {
  frame(1);
  info = sandbox.Batalha.info();
}
for (let i = 0; i < 90; i++) frame(1);
salvar('tela-jogo-luta.png');
console.log('luta: ' + JSON.stringify(sandbox.Batalha.info()));

// cofre abandonado (evento) — prop do cenário redesenhado
// (spec visual-cenario); posiciona perto do herói e limpa em seguida
sandbox.Eventos.colocaCofre(
  Math.round(sandbox.Batalha.info().heroi.x) + 40,
  Math.round(sandbox.Batalha.info().heroi.y) + 8);
for (let i = 0; i < 3; i++) frame(1);
salvar('tela-cofre.png');
sandbox.Eventos.cofreColetado();

// gestao: aba aparência (âncora direita em tela larga)
clique(312 + dxL / 2, 418);   // aba Aparência
frame(4);
salvar('tela-aparencia.png');

// aba Itens (spec icones-itens): gera/equipa itens p/ os ÍCONES
// aparecerem na foto — e RESTAURA o estado em seguida (o resto do
// roteiro não pode herdar dano/ouro/bolsa de um teste de imagem)
{
  const It = sandbox.Itens;
  const pj = sandbox.Game.personagem;
  const eq0 = { arma: pj.equip.arma, armadura: pj.equip.armadura };
  const bolsa0 = pj.bolsa.slice();
  const ouro0 = pj.ouro;
  for (let k = 0; k < 12; k++) {
    It.guardar(pj, It.geraItem(1 + (k % 4), 1, pj.classe));
  }
  const semArma = pj.bolsa.filter(it => it.slot === 'arma');
  const semArmadura = pj.bolsa.filter(it => it.slot === 'armadura');
  if (!eq0.arma && semArma.length) It.equipar(pj, semArma[0]);
  if (!eq0.armadura && semArmadura.length) It.equipar(pj, semArmadura[0]);
  clique(456 + dxL / 2, 418);      // aba Itens
  frame(4);
  salvar('tela-itens.png');
  pj.equip.arma = eq0.arma;
  pj.equip.armadura = eq0.armadura;
  pj.bolsa = bolsa0;
  pj.ouro = ouro0;
  clique(240 + dxL / 2, 418);      // volta p/ Atributos
  frame(2);
}

// gestão: aba classe (âncora direita em tela larga)
clique(384 + dxL / 2, 418);   // aba Classe
frame(4);
salvar('tela-classe.png');

// modo Nível (spec economia-de-pontos R-EDP-3): o segmentado do
// cabeçalho troca o 3º botão da grade por '+custo' — foto dos dois
// estados p/ QA (pontos p/ o botão habilitado, nv ≥ 6 p/ skill aberta)
sandbox.Game.personagem.pontos =
  Math.max(50, sandbox.Game.personagem.pontos || 0);
sandbox.Game.personagem.nivel =
  Math.max(6, sandbox.Game.personagem.nivel || 1);
clique(728 + dxL, 165);       // segmento [Nível] (700,154,56,22)
frame(4);
salvar('tela-classe-nivel.png');

// boss da onda 100 (anel full screen: espera o contato p/ a foto)
sandbox.Batalha.restaurarOnda(100);
for (let i = 0; i < 60 && sandbox.Batalha.info().onda < 100; i++) frame(1);
info = sandbox.Batalha.info();
for (let i = 0; i < 3000 && info.inimigoPerto > 40; i++) {
  frame(1);
  info = sandbox.Batalha.info();
}
for (let i = 0; i < 60; i++) frame(1);
salvar('tela-boss.png');
console.log('boss: ' + JSON.stringify(sandbox.Batalha.info()));

// mapa 2: cripta com chão e monstros próprios (anel full screen:
// espera o contato p/ a foto)
sandbox.Batalha.restaurarMapa(2);
sandbox.Batalha.restaurarOnda(6);
for (let i = 0; i < 60 && sandbox.Batalha.info().inimigos === 0; i++) frame(1);
info = sandbox.Batalha.info();
for (let i = 0; i < 3000 && info.inimigoPerto > 40; i++) {
  frame(1);
  info = sandbox.Batalha.info();
}
for (let i = 0; i < 60; i++) frame(1);
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

// receitas novas da spec visual-skills: captura quando o POOL específico
// nasce (zona/onda/feixe vivem < 0,7s → salvar no MESMO frame em que
// nasce; o capturaSkill genérico não distingue qual receita disparou)
function capturaReceita(prepara, cond, arquivo) {
  prepara();
  sandbox.Efeitos.limpar();
  let espera = 0;
  while (!cond() && espera < 3600) {
    frame(1);
    espera++;
  }
  const ok = cond();               // pool ainda vivo no frame do save
  salvar(arquivo);
  console.log('receita/' + arquivo + ': ' +
    (ok ? 'ok em ' + espera + ' frames' : 'NÃO DISPAROU') +
    ' -> ' + arquivo);
}
// onda 360° da varredura (guerreiro · golpe-bravo a cada 7 golpes)
capturaReceita(function () {
  const p = sandbox.Game.personagem;
  p.classe = 'guerreiro';
  p.nivel = Math.max(6, p.nivel);
  p.loadout = ['golpe-bravo'];
}, function () { return sandbox.Efeitos.info().ondas > 0; },
'tela-skill-onda.png');
// zona no impacto do nuke (mago · Bola de Fogo — nasce na chegada)
capturaReceita(function () {
  const p = sandbox.Game.personagem;
  p.classe = 'mago';
  p.nivel = Math.max(6, p.nivel);
  p.loadout = ['bola-fogo'];
}, function () { return sandbox.Efeitos.info().zonas > 0; },
'tela-skill-zona.png');
// feixe da Bênção (clérigo · precisa estar ferido — re-ferido aqui,
// a Bênção anterior da captura de cima pode ter curado tudo)
capturaReceita(function () {
  const p = sandbox.Game.personagem;
  p.classe = 'clerigo';
  p.nivel = Math.max(6, p.nivel);
  p.loadout = ['bencao'];
  p.atributos.con = 1;             // pool de HP baixo: ferido em 1 hit
  for (let i = 0; i < 900; i++) {
    frame(1);
    const inf = sandbox.Batalha.info();
    if (!inf.morto &&
        inf.hp < sandbox.Personagem.status(p).hpMax - 5) break;
  }
}, function () { return sandbox.Efeitos.info().feixes > 0; },
'tela-skill-feixe.png');

// aba Stats: estatísticas do jogador (5ª aba da grade)
clique(528 + dxL / 2, 418);
frame(4);
salvar('tela-stats.png');

// cutscene de fronteira de mundo (spec cutscenes): mapa do universo +
// narração — o 2º mundo entra com 1 conquistado e o atual destacado
// 25 frames: letterbox completo (0,35s); avancar×3: as 2 linhas
// datilografadas reveladas (spec visual-cutscene — sem isso o PNG
// sairia com texto vazio e barras fechando)
sandbox.Cutscene.mundo(1, 2);
for (let i = 0; i < 25; i++) frame(1);
sandbox.Cutscene.avancar();
sandbox.Cutscene.avancar();
sandbox.Cutscene.avancar();
salvar('tela-cutscene.png');
sandbox.Cutscene.fecha();

// cutscene de evento (auto-dismiss ~3,5s — captura no ar)
sandbox.Cutscene.evento('acougueiro');
for (let i = 0; i < 25; i++) frame(1);
sandbox.Cutscene.avancar();
sandbox.Cutscene.avancar();
sandbox.Cutscene.avancar();
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

// árvore de skills: aba Classe com as 8 skills (grade 2×4) e um ramo
// escolhido — spec arvore-skills
sandbox.Game.personagem.classe = 'guerreiro';
sandbox.Game.personagem.nivel = 400;
sandbox.Game.personagem.loadout = null;
sandbox.Game.personagem.ramos = { 'golpe-bravo': 'largada' };
clique(384 + dxL / 2, 418);                  // aba Classe
frame(4);
salvar('tela-arvore.png');
sandbox.Game.personagem.ramos = null;

console.log('cena atual: ' + sandbox.Game.cena);
console.log('batalha: ' + JSON.stringify(sandbox.Batalha.info()));

// ---- auto-check do rasterizador: drawImage espelha com escala
// negativa (spec virada-ataque) — 4 cores distintas, pixel a pixel;
// THROW derruba o gate se a conta do espelho errar em 1px
{
  const fonte = { width: 4, height: 1, _data: Buffer.alloc(16) };
  [[255, 0, 0], [0, 255, 0], [0, 0, 255], [255, 255, 0]].forEach((c, i) => {
    fonte._data.set([c[0], c[1], c[2], 255], i * 4);
  });
  const alvo = { width: 6, height: 1, _data: Buffer.alloc(24) };
  const cx = novoCtxRGBA(alvo);
  cx.save();
  cx.translate(6, 0);
  cx.scale(-1, 1);
  cx.drawImage(fonte, 1, 0, 4, 1);
  cx.restore();
  // extensão espelhada da imagem em [1..5]: px1=Y, px2=B, px3=G, px4=R
  const esperado = [
    [0, 0, 0, 0], [255, 255, 0, 255], [0, 0, 255, 255],
    [0, 255, 0, 255], [255, 0, 0, 255], [0, 0, 0, 0]
  ];
  for (let i = 0; i < 6; i++) {
    const p = Array.from(alvo._data.slice(i * 4, i * 4 + 4));
    if (p.some((v, j) => v !== esperado[i][j])) {
      throw new Error('virada-ataque: px ' + i + ' = [' + p +
        '] esperado [' + esperado[i] + ']');
    }
  }
  console.log('  ok  drawImage espelha com escala negativa (auto-check)');
}
