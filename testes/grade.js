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

// nomes por índice (fonte das cores = Sprite.heroPaleta, chars = txtPaleta)
const NOMES = [
  'vazio', 'contorno', 'pele', 'pele luz', 'pele sombra', 'pele sombra2',
  'cabelo', 'cabelo luz', 'cabelo sombra', 'cabelo sombra2',
  'tecido', 'tecido luz', 'tecido sombra', 'tecido sombra2',
  'couro', 'couro luz', 'couro sombra',
  'metal', 'metal luz', 'metal sombra',
  'ouro', 'ouro luz', 'ouro sombra',
  'olho', 'pupila', 'madeira', 'madeira sombra',
  'acento', 'acento luz', 'acento sombra'
];

// desenha a grade do sprite como texto lendo os pixels capturados no stub
function mostrar(rotulo, look, anim, frame) {
  const c = Sprite.heroCanvas(look, anim, frame);
  const W = c.w, H = c.h;
  const data = c.canvas._data;
  const pal = Sprite.heroPaleta(look);
  const chars = Sprite.txtPaleta();
  console.log('\n== ' + rotulo + ' (' + W + 'x' + H + ') ==');
  // régua de colunas: dígito das dezenas
  let reguaX = '    ';
  for (let x = 0; x < W; x++) reguaX += (x % 10 === 0) ? String(Math.floor(x / 10) % 10) : '.';
  console.log(reguaX);
  for (let y = 0; y < H; y++) {
    let linha = '';
    for (let x = 0; x < W; x++) {
      const o = (y * W + x) * 3;
      if (!data) { linha += '?'; continue; }
      const hex = '#' + [data[o], data[o + 1], data[o + 2]]
        .map(v => v.toString(16).padStart(2, '0')).join('');
      if (hex === '#000000') { linha += ' '; continue; }
      let idx = -1;
      for (let i = 1; i < pal.length; i++) if (pal[i] === hex) { idx = i; break; }
      linha += idx >= 0 ? chars[idx] : '?';
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
console.log('legenda (char = índice = material):');
console.log('  ' + Sprite.txtPaleta().map((ch, i) =>
  (ch === '.' ? 'vazio' : ch + '=' + NOMES[i])).join('  '));
mostrar('guerreiro/curto idle f0', look, 'idle', 0);
mostrar('guerreiro/curto walk f1', look, 'walk', 1);
mostrar('guerreiro/curto attack f0 (wind)', look, 'attack', 0);
mostrar('guerreiro/curto attack f1 (slash)', look, 'attack', 1);

// ---- asserções de posição (falham se o desenho mudar de lugar) ----
console.log('\n== asserções ==');
const idle = Sprite.heroCanvas(look, 'idle', 0);
const slash = Sprite.heroCanvas(look, 'attack', 1);
const couro = Sprite.rampa(Sprite.cores.couro);
const tecido = Sprite.rampa(look.cloth);
const checa = (rot, obtido, esperado) => {
  const ok = obtido === esperado;
  console.log((ok ? '  ok  ' : '  FALHA ') + rot + ': ' + obtido + ' (esperado ' + esperado + ')');
  if (!ok) process.exitCode = 1;
};
// rosto/mão (contrato desde a versão original)
checa('olho branco (9,4)', cor(idle, 9, 4), '#ffffff');
checa('pupila (10,4)', cor(idle, 10, 4), '#20182a');
checa('mão (12,13)', cor(idle, 12, 13), look.skin);
// cinto/botas/pernas
checa('fivela dourada (8,12)', cor(idle, 8, 12), Sprite.cores.ouro);
checa('bota esquerda (6,19)', cor(idle, 6, 19), couro.som);
checa('perna dianteira (9,14)', cor(idle, 9, 14), look.cloth);
// arma em repouso: punho, guarda e lâmina
checa('guarda dourada (14,14)', cor(idle, 14, 14), Sprite.cores.ouro);
checa('lâmina (16,17)', cor(idle, 16, 17), Sprite.cores.metal);
checa('fio da lâmina (17,17)', cor(idle, 17, 17), Sprite.rampa(Sprite.cores.metal).luz);
// golpe
checa('braço esticado (12,10)', cor(slash, 12, 10), look.cloth);
checa('guarda golpe (16,11)', cor(slash, 16, 11), Sprite.cores.ouro);
checa('lâmina golpe (17,11)', cor(slash, 17, 11), Sprite.cores.metal);

const wind = Sprite.heroCanvas(look, 'attack', 0);
checa('wind: perna traseira (6,14)', cor(wind, 6, 14), tecido.som);
checa('wind: perna dianteira (9,14)', cor(wind, 9, 14), look.cloth);
checa('wind: bota dianteira (10,18)', cor(wind, 10, 18), couro.base);
checa('wind: cinto (6,12)', cor(wind, 6, 12), Sprite.cores.couro);
checa('idle: perna dianteira (9,14)', cor(idle, 9, 14), look.cloth);
