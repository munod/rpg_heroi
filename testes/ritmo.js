// Mede o ritmo de progressão — ferramenta manual para ajustar a curva
// (Personagem.custoProximo / CUSTO_BASE) e o tempo de fechar o mapa 1.
// Fica fora do todos.js.
// Uso: node testes/ritmo.js [minutos]   (padrão 15; use 60 p/ ver o boss)
// Investe os pontos em Força a cada 10s de jogo para referência estável.
'use strict';
const { carregar } = require('./carga');

const minutos = parseFloat(process.argv[2] || '15');
const FPS_MS = 16.7;               // o harness avança 16,7ms por frame

const h = carregar();
(h.ouvintesJanela.load || []).forEach(fn => fn({}));
h.frame(5);
const Game = h.sandbox.Game;
const Batalha = h.sandbox.Batalha;
Game.setScene('jogo');
const p = Game.personagem;

let total = 0;
function gastar() {
  while (p.pontos > 0) { p.atributos.for++; p.pontos--; }
}
function run(n) {
  for (let i = 0; i < n; i++) {
    h.frame(1);
    total++;
    if (total % 600 === 0) gastar();   // a cada ~10s de jogo
  }
}

// tempo até o 1º nível (referência do começo de jogo)
while (p.nivel < 2 && total < 60 * 60 * 1000 / FPS_MS) run(1);
console.log('1º nível: ' + (total * FPS_MS / 1000).toFixed(1) + 's');
gastar();

const marcos = [...new Set([1, 5, 15, 30, 45, 60, 90, 120, minutos])]
  .filter(m => m <= minutos).sort((a, b) => a - b);
let onda100 = null, mapa2 = null, onda10m2 = null;

for (const m of marcos) {
  const alvo = Math.round(m * 60 * 1000 / FPS_MS);
  while (total < alvo) {
    run(1);
    const f = Batalha.info();
    if (onda100 === null && f.onda >= 100) {
      onda100 = total * FPS_MS / 1000;
    }
    if (mapa2 === null && f.mapa >= 2) {
      mapa2 = total * FPS_MS / 1000;   // chefe do mapa 1 derrubado
    }
    if (mapa2 !== null && onda10m2 === null &&
        f.mapa >= 2 && f.onda >= 10) {
      onda10m2 = total * FPS_MS / 1000 - mapa2;   // ritmo do 2º mapa
    }
  }
  gastar();
  const inf = Batalha.info();
  console.log(m + 'min: mapa ' + inf.mapa + ', onda ' + inf.onda +
    ', nv ' + p.nivel + ', xp ' + p.xp + '/' + p.xpProx +
    (inf.morto ? ' (caído)' : ''));
}
console.log(onda100 !== null
  ? 'chefe do mapa 1 em ' + (onda100 / 60).toFixed(1) + 'min'
  : 'chefe do mapa 1 não alcançado em ' + minutos + 'min');
console.log(mapa2 !== null
  ? 'mapa 1 fechado em ' + (mapa2 / 60).toFixed(1) + 'min'
  : 'mapa 1 não fechado em ' + minutos + 'min');
if (onda10m2 !== null) {
  console.log('mapa 2: onda 10 em +' + onda10m2.toFixed(0) + 's após o troco');
} else if (mapa2 !== null) {
  console.log('mapa 2 não chegou na onda 10 em ' + minutos + 'min');
}
