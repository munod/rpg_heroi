// Gera uma folha de prévia (PNG) dos sprites gerados pelo jogo.
// Uso: node testes/previa.js   ->  testes/previa.png
'use strict';

const path = require('path');

const { carregar, novoCtxCaptura } = require('./carga');
const { escreverPNG } = require('./png');

// ------------------------------------------------- sprites via harness
// só sprite + personagem, com o capturador RGB de pixels
const { sandbox } = carregar({
  novoCtx: novoCtxCaptura,
  scripts: ['js/sprite.js', 'js/personagem.js']
});

const Sprite = sandbox.Sprite;
const PersonagemMod = sandbox.Personagem;

// ------------------------------------------------------------- montagem
const ESC = 4;
const CEL = 84;            // 80 + 4 de folga
const COLS = 15;           // 5 estilos x 3 animações
const LINHAS = 5;          // 4 classes + cenário
const larg = COLS * CEL;
const alt = LINHAS * CEL;
const folha = Buffer.alloc(larg * alt * 3);

// fundo xadrez suave pra enxergar o contorno
for (let y = 0; y < alt; y++) {
  for (let x = 0; x < larg; x++) {
    const quad = ((x >> 4) + (y >> 4)) % 2;
    const o = (y * larg + x) * 3;
    folha[o] = quad ? 46 : 38;
    folha[o + 1] = quad ? 40 : 33;
    folha[o + 2] = quad ? 64 : 54;
  }
}

function colar(cv, celX, celY, esc) {
  if (!cv || !cv._data) return;
  const origem = cv._data;
  for (let y = 0; y < cv.height; y++) {
    for (let x = 0; x < cv.width; x++) {
      const s = (y * cv.width + x) * 3;
      // pixels vazios do sprite: pinta de cinza escuro pra marcar a grade
      const vazio = origem[s] === 0 && origem[s + 1] === 0 && origem[s + 2] === 0;
      const r = vazio ? 24 : origem[s];
      const g = vazio ? 20 : origem[s + 1];
      const b = vazio ? 34 : origem[s + 2];
      for (let j = 0; j < esc; j++) {
        for (let i = 0; i < esc; i++) {
          const px = celX * CEL + 2 + x * esc + i;
          const py = celY * CEL + 2 + y * esc + j;
          if (px >= larg || py >= alt) continue;
          const d = (py * larg + px) * 3;
          folha[d] = r; folha[d + 1] = g; folha[d + 2] = b;
        }
      }
    }
  }
}

const classes = ['guerreiro', 'mago', 'ladino', 'clerigo'];
const estilos = ['curto', 'longo', 'rabo', 'moicana', 'careca'];
const anims = [['idle', 0], ['walk', 1], ['attack', 1]];

classes.forEach((cl, li) => {
  const p = PersonagemMod.novo();
  p.classe = cl;
  const look = PersonagemMod.lookDe(p);
  estilos.forEach((est, ei) => {
    look.estilo = est;
    anims.forEach((an, ai) => {
      const c = Sprite.heroCanvas(look, an[0], an[1]);
      colar(c.canvas, ei * 3 + ai, li, ESC);
    });
  });
});

// linha do cenário
colar(Sprite.slimeCanvas('#4aa03a', 0).canvas, 0, 4, ESC);
colar(Sprite.slimeCanvas('#4aa03a', 1).canvas, 1, 4, ESC);
colar(Sprite.slimeCanvas('#7a4ac0', 0).canvas, 2, 4, ESC);
colar(Sprite.slimeCanvas('#7a4ac0', 1).canvas, 3, 4, ESC);
colar(Sprite.treeCanvas().canvas, 5, 4, ESC);
colar(Sprite.rockCanvas().canvas, 7, 4, ESC);

const saida = path.join(__dirname, 'previa.png');
escreverPNG(saida, larg, alt, folha);
console.log('gerado: ' + saida + ' (' + larg + 'x' + alt + ')');
console.log('linhas: ' + classes.join(', ') + ', cenario');
console.log('colunas por linha: ' + estilos.map(e =>
  e + ' (idle/andar/atacar)').join(' | '));

// ---------------------------------------------------- folha ampliada (x10)
const ESCZ = 10;
const CELZ = 20 * ESCZ + 8;   // sprite de 20 px + folga
const COLSZ = 4;              // guerreiro curto | guerreiro moicana | mago longo | ladino rabo
const LINHASZ = 4;            // idle | andar | atacar 0 | atacar 1
const largZ = COLSZ * CELZ;
const altZ = LINHASZ * CELZ;
const folhaZ = Buffer.alloc(largZ * altZ * 3);
for (let y = 0; y < altZ; y++) {
  for (let x = 0; x < largZ; x++) {
    const quad = ((x >> 5) + (y >> 5)) % 2;
    const o = (y * largZ + x) * 3;
    folhaZ[o] = quad ? 74 : 62;
    folhaZ[o + 1] = quad ? 66 : 55;
    folhaZ[o + 2] = quad ? 100 : 86;
  }
}
function colarZ(cv, celX, celY) {
  if (!cv || !cv._data) return;
  const origem = cv._data;
  for (let y = 0; y < cv.height; y++) {
    for (let x = 0; x < cv.width; x++) {
      const s = (y * cv.width + x) * 3;
      const vazio = origem[s] === 0 && origem[s + 1] === 0 && origem[s + 2] === 0;
      const r = vazio ? 30 : origem[s];
      const g2 = vazio ? 26 : origem[s + 1];
      const b = vazio ? 44 : origem[s + 2];
      for (let j = 0; j < ESCZ; j++) {
        for (let i = 0; i < ESCZ; i++) {
          const px = celX * CELZ + 4 + x * ESCZ + i;
          const py = celY * CELZ + 4 + y * ESCZ + j;
          if (px >= largZ || py >= altZ) continue;
          const d = (py * largZ + px) * 3;
          folhaZ[d] = r; folhaZ[d + 1] = g2; folhaZ[d + 2] = b;
        }
      }
    }
  }
}
const combos = [
  { classe: 'guerreiro', estilo: 'curto' },
  { classe: 'guerreiro', estilo: 'moicana' },
  { classe: 'mago', estilo: 'longo' },
  { classe: 'ladino', estilo: 'rabo' }
];
const animZ = [['idle', 0], ['walk', 1], ['attack', 0], ['attack', 1]];
combos.forEach((cb, ci) => {
  const p = PersonagemMod.novo();
  p.classe = cb.classe;
  const look = PersonagemMod.lookDe(p);
  look.estilo = cb.estilo;
  animZ.forEach((an, ai) => {
    colarZ(Sprite.heroCanvas(look, an[0], an[1]).canvas, ci, ai);
  });
});
const saidaZ = path.join(__dirname, 'previa-zoom.png');
escreverPNG(saidaZ, largZ, altZ, folhaZ);
console.log('gerado: ' + saidaZ + ' (' + largZ + 'x' + altZ + ')');
console.log('colunas: ' + combos.map(c => c.classe + '/' + c.estilo).join(' | '));
console.log('linhas: idle | andar | atacar(levanta) | atacar(golpe)');
