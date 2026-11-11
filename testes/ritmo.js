// Mede o ritmo de progressão — ferramenta manual para ajustar a curva
// (Personagem.custoProximo / CUSTO_BASE) e o tempo de fechar o mapa 1.
// Fica fora do todos.js.
// Uso: node testes/ritmo.js [minutos] [mundo|mapa] [k]
//   minutos = duração da sim (padrão 15; 60 p/ ver o boss; 12000 p/ a
//             campanha inteira de 100 mapas ≈ 200h)
//   modo/k  = variante da escala de monstros (A/B da spec mundos, T8);
//             sem args mantém o default do jogo
// Investe os pontos em Força a cada 10s de jogo para referência estável.
'use strict';
const { carregar } = require('./carga');

const minutos = parseFloat(process.argv[2] || '15');
const modoArg = process.argv[3];   // 'mundo' | 'mapa' (A/B da escala)
const kArg = process.argv[4];      // monstros extras por mundo
const FPS_MS = 16.7;               // o harness avança 16,7ms por frame

const h = carregar();
(h.ouvintesJanela.load || []).forEach(fn => fn({}));
h.frame(5);
const Game = h.sandbox.Game;
const Batalha = h.sandbox.Batalha;
const Personagem = h.sandbox.Personagem;
const Itens = h.sandbox.Itens;
Game.setScene('jogo');
const p = Game.personagem;
// A/B da escala de monstros (spec mundos T8) — sem args, default
if (modoArg || kArg) {
  const cfg = Batalha.escalaMonstros(modoArg,
    kArg !== undefined ? parseFloat(kArg) : undefined);
  console.log('escala de monstros: modo=' + cfg.modo + ' k=' + cfg.k);
}

let total = 0;
function gastar() {
  while (p.pontos > 0) { p.atributos.for++; p.pontos--; }
  // gestão de ouro (Leva 1): o baseline medido é o do jogador que GASTA —
  // sem gestão, a penalidade de morte (−5 ondas) cria uma esteira na
  // fronteira (morre/re-limpa sem progredir). Mesma cadência dos pontos.
  // 1) keystone no nv 30 (tradeoff da classe, 200 de ouro)
  if (p.nivel >= Personagem.KEY_NIVEL && !p.keystoneLib &&
      (p.ouro || 0) >= Personagem.KEY_CUSTO) {
    Personagem.comprarKeystone(p);
  }
  // 2) aprimoramento: sempre o slot de MENOR custo (custo sobe com o
  //    nível do item → os dois alternam sozinhos até o teto 8)
  let guarda = 0;
  while (guarda++ < 100) {
    let alvo = null, melhor = -1;
    for (const slot of ['arma', 'armadura']) {
      const it = p.equip[slot];
      if (!it) continue;
      const c = Itens.custoAprim(it);
      if (c > 0 && (p.ouro || 0) >= c && (melhor < 0 || c < melhor)) {
        alvo = it;
        melhor = c;
      }
    }
    if (!alvo || !Itens.aprimorar(p, alvo)) break;
  }
}
function run(n) {
  for (let i = 0; i < n; i++) {
    h.frame(1);
    // limpa os textos do frame: runs longos (600min+) estouravam o
    // _textos do contador (RangeError de acumulação — o fumaca zera a
    // cada asserção, o ritmo nunca precisava até a sim do teto de nível)
    if (h.jogoCanvas._textos) h.jogoCanvas._textos.length = 0;
    total++;
    if (total % 600 === 0) gastar();   // a cada ~10s de jogo
  }
}

// tempo até o 1º nível (referência do começo de jogo)
while (p.nivel < 2 && total < 60 * 60 * 1000 / FPS_MS) run(1);
console.log('1º nível: ' + (total * FPS_MS / 1000).toFixed(1) + 's');
gastar();

const marcos = [...new Set([1, 5, 15, 30, 45, 60, 90, 120, 180, 240,
  360, 480, 600, 900, 1200, 1500, 1800, 2400, 3000, 3600, 4200, 4800,
  5400, 6000, 7200, 8400, 9600, 10800, 12000, 13500, minutos])]
  .filter(m => m <= minutos).sort((a, b) => a - b);
let nvAnt = null, minAnt = null;
let onda100 = null, mapa2 = null, onda10m2 = null, vitoria = null;

for (const m of marcos) {
  const alvo = Math.round(m * 60 * 1000 / FPS_MS);
  while (total < alvo && vitoria === null) {
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
    if (vitoria === null && f.mapa > Batalha.fimCampanha()) {
      vitoria = total * FPS_MS / 1000;   // chefe do mundo 10 = fim de jogo
    }
  }
  gastar();
  const inf = Batalha.info();
  // tendência de níveis/min — com a curva exponencial deve ficar PLANA
  // (a linear decaía 2,8 → 1,4 e terminava em estol no mapa 3)
  const dnv = nvAnt === null ? null : (p.nivel - nvAnt) / (m - minAnt);
  console.log(m + 'min: mapa ' + inf.mapa + ', onda ' + inf.onda +
    ', nv ' + p.nivel + ', xp ' + h.sandbox.UI.abrev(p.xp) + '/' +
    h.sandbox.UI.abrev(p.xpProx) +
    ' | mortes ' + (p.stats.mortes || 0) +
    ' | ouro ' + Math.round(p.ouro || 0) +
    (dnv === null ? '' : ' | +' + dnv.toFixed(1) + ' nv/min') +
    (inf.morto ? ' (caído)' : ''));
  nvAnt = p.nivel; minAnt = m;
  if (vitoria !== null) break;      // campanha concluída: não segue
}
console.log(vitoria !== null
  ? 'VITÓRIA (mundo 10 vencido) em ' + (vitoria / 60).toFixed(1) + 'min = ' +
    (vitoria / 3600).toFixed(1) + 'h de jogo | mortes ' +
    (p.stats.mortes || 0) + ' | nv final ' + p.nivel +
    ' | onda ' + Batalha.info().onda + ' mapa ' + Batalha.info().mapa
  : 'vitória não alcançada em ' + minutos + 'min (mortes ' +
    (p.stats.mortes || 0) + ', nv ' + p.nivel + ')');
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
