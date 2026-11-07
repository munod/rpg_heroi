// Harness comum dos testes: DOM falsificado + carregamento dos scripts.
// Todos os testes que "abrem o jogo" no Node passam por aqui.
//
// Uso:
//   const { carregar } = require('./carga');
//   const h = carregar();                       // jogo completo, ctx contador
//   const h = carregar({ novoCtx: meuCtx,       // contexto 2d sob medida
//                        scripts: ['js/sprite.js'] });
//
// carregar() devolve:
//   sandbox, jogoCanvas, ouvintesJanela, ouvintesDocumento, clicados,
//   localStorage (stub), storage (objeto cru),
//   frame(n), tecla(tipo, code, key), clique(xJogo, yJogo),
//   pressionar(xJogo, yJogo) sem soltar (para testar segurar o botão),
//   soltar() (soltura o mouse)
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const RAIZ = path.join(__dirname, '..');

// ------------------------------------------------------------ contextos

// Padrão: só conta o que foi desenhado (rápido, sem rasterizar).
// - _pixels  : retângulos de 1x1 (pixels de sprite)
// - _draws   : drawImage
// - _textos  : textos passados por fillText (assertivas de UI)
// - _chamadas: total de chamadas (mede se algo foi renderizado)
function novoCtxContador(canvas) {
  return new Proxy({}, {
    get(alvo, prop) {
      if (typeof prop === 'symbol') return undefined;
      return function (...args) {
        if (prop === 'fillRect' && args[2] === 1 && args[3] === 1) {
          canvas._pixels = (canvas._pixels || 0) + 1;
        }
        if (prop === 'drawImage') {
          canvas._draws = (canvas._draws || 0) + 1;
        }
        if (prop === 'fillText') {
          (canvas._textos = canvas._textos || []).push(String(args[0]));
        }
        canvas._chamadas = (canvas._chamadas || 0) + 1;
      };
    },
    set() { return true; }
  });
}

// Capturador RGB (3 bytes/pixel): grade.js e previa.js leem os pixels
// desenhados direto do canvas (cv._data).
function novoCtxCaptura(cv) {
  const estado = { fillStyle: '#000000' };
  return new Proxy({}, {
    get(alvo, prop) {
      if (prop === 'fillStyle') return estado.fillStyle;
      return function (...args) {
        if (prop !== 'fillRect') return;
        const [x, y, w, h] = args;
        if (!cv._data) cv._data = Buffer.alloc(cv.width * cv.height * 3);
        const cor = estado.fillStyle;
        const r = parseInt(cor.slice(1, 3), 16);
        const g = parseInt(cor.slice(3, 5), 16);
        const b = parseInt(cor.slice(5, 7), 16);
        for (let j = 0; j < h; j++) {
          for (let i = 0; i < w; i++) {
            const px = x + i, py = y + j;
            if (px < 0 || py < 0 || px >= cv.width || py >= cv.height) continue;
            const o = (py * cv.width + px) * 3;
            cv._data[o] = r; cv._data[o + 1] = g; cv._data[o + 2] = b;
          }
        }
      };
    },
    set(alvo, prop, v) {
      if (prop === 'fillStyle') estado.fillStyle = v;
      return true;
    }
  });
}

// --------------------------------------------------------------- carga

// opcoes.novoCtx  : fábrica do contexto 2d (padrão: contador)
// opcoes.scripts  : caminhos relativos a RAIZ (padrão: ordem do index.html)
// opcoes.larg/alt : tamanho do canvas do jogo (padrão: 384x216)
function carregar(opcoes) {
  opcoes = opcoes || {};
  const fabricaCtx = opcoes.novoCtx || novoCtxContador;

  function novoCanvas() {
    const cv = {
      width: 0,
      height: 0,
      style: {},
      _pixels: 0,
      _draws: 0,
      _chamadas: 0,
      _textos: [],
      _listeners: {},
      getContext() {
        if (!cv._ctx) cv._ctx = fabricaCtx(cv);
        return cv._ctx;
      },
      addEventListener(ev, fn) {
        (cv._listeners[ev] = cv._listeners[ev] || []).push(fn);
      },
      getBoundingClientRect() {
        // escala 2: o canvas de 384x216 ocupa 768x432 na tela
        return { left: 0, top: 0, width: cv.width * 2, height: cv.height * 2 };
      }
    };
    return cv;
  }

  const jogoCanvas = novoCanvas();
  // o index.html define width="384" height="216"
  jogoCanvas.width = opcoes.larg || 384;
  jogoCanvas.height = opcoes.alt || 216;

  const ouvintesJanela = {};
  const windowStub = {
    innerWidth: 1280,
    innerHeight: 720,
    addEventListener(ev, fn) {
      (ouvintesJanela[ev] = ouvintesJanela[ev] || []).push(fn);
    },
    removeEventListener() {}
  };

  const storage = {};
  const localStorageStub = {
    getItem: k => (k in storage ? storage[k] : null),
    setItem: (k, v) => { storage[k] = String(v); },
    removeItem: k => { delete storage[k]; }
  };

  let rafCb = null;
  let relogio = 0;
  const clicados = [];
  const ouvintesDocumento = {};

  const documentStub = {
    // visibilidade da aba: o teste liga/desliga para disparar visibilitychange
    hidden: false,
    createElement(tag) {
      if (tag === 'canvas') return novoCanvas();
      return {
        style: {},
        href: '',
        download: '',
        click() { clicados.push(this.download || 'link'); },
        appendChild() {},
        removeChild() {},
        addEventListener() {}
      };
    },
    getElementById(id) { return id === 'game' ? jogoCanvas : null; },
    body: { appendChild() {}, removeChild() {} },
    addEventListener(ev, fn) {
      (ouvintesDocumento[ev] = ouvintesDocumento[ev] || []).push(fn);
    }
  };

  const sandbox = {
    window: windowStub,
    document: documentStub,
    localStorage: localStorageStub,
    performance: { now: () => relogio },
    requestAnimationFrame: cb => { rafCb = cb; return 1; },
    setTimeout: (fn) => { fn(); return 1; },
    Blob: function () {},
    URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} },
    FileReader: function () {},
    console,
    Math,
    Date,
    JSON,
    Uint8Array,
    String,
    Number,
    Boolean,
    Array,
    Object,
    isNaN,
    parseInt,
    parseFloat
  };
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  const contexto = vm.createContext(sandbox);

  // carrega os scripts na ordem do index.html (ou a lista pedida)
  let lista = opcoes.scripts;
  if (!lista) {
    const html = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
    lista = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
  }
  for (const arquivo of lista) {
    const codigo = fs.readFileSync(path.join(RAIZ, arquivo), 'utf8');
    vm.runInContext(codigo, contexto, { filename: arquivo });
  }

  // ---------------------------------------------------------- helpers
  function frame(n) {
    for (let i = 0; i < n; i++) {
      relogio += 16.7;
      const cb = rafCb;
      rafCb = null;
      if (!cb) throw new Error('rAF não foi registrado');
      cb(relogio);
    }
  }

  function tecla(tipo, code, key) {
    const ev = {
      code, key: key || code, preventDefault() {},
      ctrlKey: false, metaKey: false, altKey: false
    };
    (ouvintesJanela[tipo] || []).forEach(fn => fn(ev));
  }

  // o retângulo no teste é o dobro do canvas (escala 2 do harness)
  function pressionar(xJogo, yJogo) {
    const ev = { clientX: xJogo * 2, clientY: yJogo * 2, preventDefault() {} };
    (jogoCanvas._listeners.mousedown || []).forEach(fn => fn(ev));
  }
  function soltar() {
    (ouvintesJanela.mouseup || []).forEach(fn => fn({}));
  }
  function clique(xJogo, yJogo) {
    pressionar(xJogo, yJogo);
    soltar();
  }

  return {
    RAIZ,
    sandbox,
    jogoCanvas,
    ouvintesJanela,
    ouvintesDocumento,
    clicados,
    localStorage: localStorageStub,
    storage,
    frame,
    tecla,
    clique,
    pressionar,
    soltar
  };
}

module.exports = { RAIZ, carregar, novoCtxContador, novoCtxCaptura };
