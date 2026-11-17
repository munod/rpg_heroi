// Desenha a grade do sprite como texto (depuração).
// Uso: node testes/grade.js
'use strict';
const { carregar, novoCtxCaptura } = require('./carga');

// só sprite + personagem: o resto do jogo não entra aqui
const { sandbox } = carregar({
  novoCtx: novoCtxCaptura,
  scripts: ['js/sprite.js', 'js/assets.js', 'js/personagem.js']
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

// ---- assets gerados (spec visual-heroi-spritecook) ----------------
// O guerreiro vem de PNGs (grau de liberdade novo); as outras classes
// seguem procedurais até a leva 2 — o fallback é contrato.
console.log('\n== assets do guerreiro ==');
const Assets = sandbox.Assets;
let cargaOk = false;
Assets.carga(function () { cargaOk = true; });
const inf = Assets.info();
checa('carga encerra síncrona no harness', cargaOk, true);
['guerreiro', 'mago', 'ladino', 'clerigo'].forEach(cl => {
  checa(cl + ' carregado', inf.carregado[cl], true);
});
checa('pendentes zerados', inf.pendentes, 0);
// fallback procedural (R-VHS-13): classe sem manifesto cai nos
// contadores de sempre (4/2/3) e sem sprite
checa('classe inexistente sem sprite',
  Assets.temHeroi('xena', 'idle'), false);
checa('fallback: walk procedural = 4', Assets.qtd('xena', 'walk'), 4);
checa('fallback: ataque procedural = 3', Assets.qtd('xena', 'attack'), 3);

const frA = Assets.hero('guerreiro', 'idle', 0);
checa('frame 43×43', frA ? frA.w + 'x' + frA.h : 'null', '43x43');
const dA = frA.canvas._data;   // RGBA (convenção do cena.js)
const pxA = (x, y) => {
  const o = (y * frA.h + x) * 4;
  return [dA[o], dA[o + 1], dA[o + 2], dA[o + 3]];
};
checa('canto sup-esq transparente', pxA(0, 0)[3], 0);
checa('canto inf-dir transparente', pxA(frA.w - 1, frA.h - 1)[3], 0);
let pe42 = false;
for (let x = 0; x < frA.w; x++) if (pxA(x, 42)[3] > 0) pe42 = true;
checa('fileira 42 tem conteúdo (pés)', pe42, true);
let opacos = 0, temPele = false, temContorno = false;
for (let i = 0; i < frA.w * frA.h; i++) {
  if (dA[i * 4 + 3] === 0) continue;
  opacos++;
  const r = dA[i * 4], g = dA[i * 4 + 1], b = dA[i * 4 + 2];
  if (r > 150 && g >= 90 && r >= g && g >= b && (r - b) > 35) temPele = true;
  if (r < 45 && g < 40 && b < 55) temContorno = true;
}
checa('corpo opaco (mín 400 px)', opacos >= 400, true);
checa('tem pele', temPele, true);
checa('tem contorno escuro', temContorno, true);

// a arma da classe está EMBUTIDA na arte (emenda do veredito):
// contagem de pixels de lâmina (metal frio, mais azulado que a
// pele/dourado) — presente em idle e maior no golpe
function contaLamina(img) {
  const d = img.canvas._data;
  let n = 0;
  for (let i = 0; i < img.w * img.h; i++) {
    if (d[i * 4 + 3] === 0) continue;
    const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
    if (r > 140 && g > 150 && b > 160 && b >= r) n++;
  }
  return n;
}
const lamIdle = contaLamina(Assets.hero('guerreiro', 'idle', 0));
const lamGolpe = contaLamina(Assets.hero('guerreiro', 'attack', 5));
checa('lâmina embutida no idle (>30 px)', lamIdle > 30, true);
checa('golpe estica a lâmina (> idle)', lamGolpe > lamIdle, true);

// mapeamento de frames: asset = manifesto (com `inicios` POR CLASSE —
// R-VHS-14), procedural = o de sempre
checa('qtd walk do guerreiro (asset)', Assets.qtd('guerreiro', 'walk'), 8);
checa('qtd walk do mago (asset)', Assets.qtd('mago', 'walk'), 8);
checa('ataque guerreiro p=0,5 → frame do golpe (5)',
  Assets.frameAtaque('guerreiro', 0.5), 5);
checa('ataque mago p=0,5 → golpe em f6 (tabela própria)',
  Assets.frameAtaque('mago', 0.5), 6);
checa('ataque ladino p=0,5 → golpe em f5 (tabela padrão)',
  Assets.frameAtaque('ladino', 0.5), 5);
checa('ataque clérigo p=0,5 → golpe em f6 (tabela própria)',
  Assets.frameAtaque('clerigo', 0.5), 6);
