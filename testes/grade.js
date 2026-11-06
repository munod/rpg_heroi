// Desenha a grade do sprite como texto (depuração).
// Uso: node testes/grade.js
'use strict';
const { carregar, novoCtxCaptura } = require('./carga');

// só sprite + personagem: o resto do jogo não entra aqui
const { sandbox } = carregar({
  novoCtx: novoCtxCaptura,
  scripts: ['js/sprite.js', 'js/personagem.js']
});

const Sprite = sandbox.Sprite;
const Personagem = sandbox.Personagem;

// reconstrói a grade capturando os pixels (mesma técnica da prévia)
function grade(look, anim, frame) {
  const cv = Sprite.heroCanvas(look, anim, frame);
  // paraCanvas não expõe a grade, então regeramos lendo o canvas:
  // o stub guarda os pixels em _data
  return cv;
}

// melhor: reimplementa lendo o canvas stub
function mostrar(rotulo, look, anim, frame) {
  const c = Sprite.heroCanvas(look, anim, frame);
  const W = c.w, H = c.h;
  const data = c.canvas._data;
  console.log('\n== ' + rotulo + ' (' + W + 'x' + H + ') ==');
  // régua de colunas: dígito das dezenas
  let reguaX = '    ';
  for (let x = 0; x < W; x++) reguaX += (x % 10 === 0) ? String(Math.floor(x / 10) % 10) : '.';
  console.log(reguaX);
  const pal = ['#000000', '#1b1424', look.skin, '', look.hair, '', look.cloth, '', '',
    '#a8b8cc', '#78889c', '#8a5a2e', '#ffffff', '#20182a', '#d9a62a'];
  const simbolos = ['.', '#', 'S', 's', 'h', 'H', 'c', 'C', 'a', 'm', 'M', 'w', 'e', 'p', 'g'];
  for (let y = 0; y < H; y++) {
    let linha = '';
    for (let x = 0; x < W; x++) {
      const o = (y * W + x) * 3;
      if (!data) { linha += '?'; continue; }
      const hex = '#' + [data[o], data[o + 1], data[o + 2]]
        .map(v => v.toString(16).padStart(2, '0')).join('');
      if (hex === '#000000') { linha += ' '; continue; }
      const idx = pal.findIndex((c2, i) => i > 0 && c2 === hex);
      linha += idx >= 0 ? simbolos[idx] : '?';
    }
    console.log(String(y).padStart(3) + ' ' + linha);
  }
}

function cor(c, x, y) {
  const o = (y * c.w + x) * 3;
  const d = c.canvas._data;
  if (!d) return null;
  return '#' + [d[o], d[o + 1], d[o + 2]].map(v => v.toString(16).padStart(2, '0')).join('');
}

const p = Personagem.novo();
p.classe = 'guerreiro';
const look = Personagem.lookDe(p);
console.log('legenda: S=pele s=pele_sombra h=cabelo H=cabelo_sombra c=roupa');
console.log('        C=roupa_sombra a=cinto m=metal M=metal_sombra w=madeira');
console.log('        e=olho p=pupila g=dourado #=contorno');
mostrar('guerreiro/curto idle f0', look, 'idle', 0);
mostrar('guerreiro/curto walk f1', look, 'walk', 1);
mostrar('guerreiro/curto attack f0 (wind)', look, 'attack', 0);
mostrar('guerreiro/curto attack f1 (slash)', look, 'attack', 1);

// ---- asserções de posição (falham se o desenho mudar de lugar) ----
console.log('\n== asserções ==');
const idle = Sprite.heroCanvas(look, 'idle', 0);
const slash = Sprite.heroCanvas(look, 'attack', 1);
const checa = (rot, obtido, esperado) => {
  const ok = obtido === esperado;
  console.log((ok ? '  ok  ' : '  FALHA ') + rot + ': ' + obtido + ' (esperado ' + esperado + ')');
  if (!ok) process.exitCode = 1;
};
checa('olho branco (9,4)', cor(idle, 9, 4), '#ffffff');
checa('pupila (10,4)', cor(idle, 10, 4), '#20182a');
checa('mão (12,13)', cor(idle, 12, 13), look.skin);
checa('lâmina (13,14)', cor(idle, 13, 14), '#a8b8cc');
checa('guarda dourada (15,14)', cor(idle, 15, 14), '#d9a62a');
checa('bota esquerda (6,19)', cor(idle, 6, 19), Sprite.shade(look.cloth, 0.45));
checa('braço esticado (13,11)', cor(slash, 13, 11), look.cloth);
checa('lâmina golpe (17,11)', cor(slash, 17, 11), '#a8b8cc');

const wind = Sprite.heroCanvas(look, 'attack', 0);
checa('wind: perna traseira (6,14)', cor(wind, 6, 14), Sprite.shade(look.cloth, 0.72));
checa('wind: perna dianteira (9,14)', cor(wind, 9, 14), look.cloth);
checa('wind: perna dianteira (10,18)', cor(wind, 10, 18), look.cloth);
checa('wind: cinto (6,12)', cor(wind, 6, 12), Sprite.shade(look.cloth, 0.45));
checa('idle: perna dianteira (9,14)', cor(idle, 9, 14), look.cloth);
