// Sonda de FIM DE JOGO — teste rápido de projeção matemática (o A/B
// não precisa de sim completa p/ decisões de BUILD): monta o herói JÁ
// na reta final (nv pela trajetória medida nv ≈ 0,9169×ondas − 35,6,
// gear sintetizado dos drops do próprio mapa + teto de aprimoramento,
// keystone comprado, loadout automático, base neutra de ramos) e corre
// as ondas finais até a parede — que é onde a via skill do A/B estolou
// (a projeção de taxa do ritmo.js é cega pra lá).
//
// Veredito: VENCEU (mapa 101) ou NÃO VENCEU (com taxa/mortes).
// Validação de ferramenta: `def` tem que vencer e `skill` tem que
// falhar — os MESMOS desfechos das simulações completas (ground truth:
// def venceu 57,2h · skill estolou no mapa 100 com 6.707 mortes).
//
// Uso: node testes/sonda-fim.js [minutos=600] [mapa=100] [build] [semente]
//   build def  = todos os pontos em FOR (a referência que venceu)
//   build skill = FOR no ATRIB_LIM + excedente em níveis (estolou)
//   build sem  = nenhum ponto distribuído (diagnóstico L2)
// Saídas: console (marcos de 60min + veredito) e
// resultados/sonda-fim-<build>.json
'use strict';
const fs = require('fs');
const path = require('path');
const { carregar } = require('./carga');

const minutos = parseFloat(process.argv[2] || '600');
const mapaIni = parseInt(process.argv[3] || '100', 10);
const build = process.argv[4] || 'def';
const sementeArg = parseInt(process.argv[5] === undefined ? '1' : process.argv[5], 10);
const semente = Number.isFinite(sementeArg) && sementeArg >= 0 ? sementeArg : 1;
const FPS_MS = 16.7;
const RAIZ = path.join(__dirname, '..');
if (['def', 'skill', 'sem'].indexOf(build) < 0) {
  console.error('build inválido: ' + build + ' (def|skill|sem)');
  process.exit(1);
}

// mulberry32 (espelho de js/perlin.js e testes/ritmo.js) — mesma
// semente do ritmo p/ comparabilidade de spawn/crít/drops/eventos
function mulberry32(a) {
  return function () {
    a = a + 0x6D2B79F5 | 0;
    var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
Math.random = mulberry32(semente);

const h = carregar();
(h.ouvintesJanela.load || []).forEach(fn => fn({}));
h.frame(5);
const Game = h.sandbox.Game;
const Batalha = h.sandbox.Batalha;
const Personagem = h.sandbox.Personagem;
const Itens = h.sandbox.Itens;
const Skills = h.sandbox.Skills;
Game.setScene('jogo');
const p = Game.personagem;
console.log('sonda-fim: build=' + build + ' · mapa ' + mapaIni + ' · ' +
  minutos + 'min · semente ' + semente);

function ondasDe(mapa, onda) { return (mapa - 1) * 100 + onda; }

// ---------------------------------------------------------- monta o build
const CLASSE = 'guerreiro';
const waves0 = (mapaIni - 1) * 100;
// trajetória medida (levas mundos/fullscreen): nv ≈ 0,9169×ondas − 35,6
const nv0 = Math.max(30, Math.round(0.9169 * waves0 - 35.6));
p.classe = CLASSE;
p.nome = 'Sonda';
p.nivel = nv0;
p.xp = 0;
p.xpProx = Personagem.custoProximo(nv0);
p.loadout = null;                       // automático = 5 mais avançadas
p.ramos = null;                         // base neutra (o sim nunca escolhe)
p.skillNv = null;
p.autoApr = false;
p.trava = { arma: false, armadura: false };

// pontos: PONTOS_CADA = 1 (novo() começa em 0 → ~nv−1 level-ups)
const totalPts = nv0 - 1;
function investe(pontos, paraSkills) {
  // espelho EXATO do investidor do ritmo.js (def/skill) — p/ o build
  // corredor continuar investindo como os runs reais
  if (paraSkills) {
    if (!p.skillNv) p.skillNv = {};        // espelho do guarda do sobe
    let sobra = pontos;
    let g = 0;
    while (sobra > 0 && g++ < 5000) {
      let melhor = null, melhorC = Infinity;
      for (const sk of Skills.daClasse(CLASSE)) {
        const nv = Skills.nvSkill(p, sk.id);
        if (nv >= Skills.SKILL_NV_MAX) continue;
        const c = Skills.custoNivel(nv);
        if (c < melhorC) { melhorC = c; melhor = sk; }
      }
      if (!melhor || sobra < melhorC) break;
      sobra -= melhorC;
      p.skillNv[melhor.id] = Skills.nvSkill(p, melhor.id) + 1;
    }
    return sobra;
  }
  p.atributos.for += pontos;
  return 0;
}
if (build === 'def') {
  investe(totalPts, false);                      // mono-FOR (venceu)
} else if (build === 'skill') {
  p.atributos.for = 8 + Personagem.ATRIB_LIM;    // para no limiar
  investe(totalPts - Personagem.ATRIB_LIM, true);
}
// 'sem' = nenhum ponto distribuído (diagnóstico L2)

// keystone: comprado em todos os runs reais (nv ≥ 30)
p.ouro = 5e6;
if (!p.keystoneLib) Personagem.comprarKeystone(p);

// gear: melhor arma/armadura entre drops sintetizados do PRÓPRIO mapa
// (escala do mapa final — idêntico p/ todos os builds = justa)
function melhoresDrops(mapa) {
  const best = { arma: null, armadura: null };
  for (let i = 0; i < 400; i++) {
    const arr = Itens.sorteiaDrop(mapa, false, CLASSE);
    for (const it of arr) {
      if (!it || (it.slot !== 'arma' && it.slot !== 'armadura')) continue;
      if (!best[it.slot] || Itens.pontuar(it) > Itens.pontuar(best[it.slot])) {
        best[it.slot] = it;
      }
    }
  }
  return best;
}
const drops = melhoresDrops(mapaIni);
p.equip = { arma: drops.arma, armadura: drops.armadura };
// teto de aprimoramento (o sim real gasta ouro nisso — mesmo teto p/ todos)
p.ouro = 1e9;
for (const slot of ['arma', 'armadura']) {
  const it = p.equip[slot];
  if (!it) continue;
  let guarda = 0;
  while (guarda++ < 60) { if (!Itens.aprimorar(p, it)) break; }
}
p.ouro = 1e7;
if (!p.equip.arma || !p.equip.armadura) {
  console.error('FALHA: não consegui gear ' + JSON.stringify(p.equip && {
    arma: !!p.equip.arma, armadura: !!p.equip.armadura }));
  process.exit(1);
}
console.log('herói: nv ' + nv0 + ' · for ' + p.atributos.for +
  ' · dano ' + Personagem.status(p).dano +
  ' · skills ' + JSON.stringify(p.skillNv) +
  ' · arma ' + p.equip.arma.nome + ' +' + p.equip.arma.up +
  ' · armadura ' + p.equip.armadura.nome + ' +' + p.equip.armadura.up);

// -------------------------------------------------------------- corrida
Batalha.restaurarMapa(mapaIni);
Batalha.restaurarOnda(1);
const inf0 = Batalha.info();
const ondas0 = ondasDe(inf0.mapa, inf0.onda);
const mortes0 = p.stats.mortes || 0;
const nvIni = p.nivel;
let total = 0, vitoria = null, proxMarco = 60;

function run(n) {
  for (let i = 0; i < n; i++) {
    h.frame(1);
    total++;
    // novos pontos do corredor: mesmo espelho do investidor real
    if (total % 600 === 0 && p.pontos > 0) {
      const qtd = p.pontos;
      p.pontos = 0;
      investe(qtd, build === 'skill');
    }
    if (h.jogoCanvas._textos) h.jogoCanvas._textos.length = 0;
  }
}

const alvoFrames = Math.round(minutos * 60 * 1000 / FPS_MS);
while (total < alvoFrames && vitoria === null) {
  run(1);
  const f = Batalha.info();
  if (f.mapa > Batalha.fimCampanha()) {
    vitoria = total * FPS_MS / 1000;
    break;
  }
  const agoraMin = total * FPS_MS / 60000;
  if (agoraMin >= proxMarco) {
    console.log(proxMarco + 'min: mapa ' + f.mapa + ', onda ' + f.onda +
      ' (' + ondasDe(f.mapa, f.onda) + ' ondas) | mortes +' +
      ((p.stats.mortes || 0) - mortes0) + ' | nv ' + p.nivel +
      ' | dano ' + Personagem.status(p).dano);
    proxMarco += 60;
  }
}

// -------------------------------------------------------------- veredito
const f = Batalha.info();
const ondasFim = ondasDe(f.mapa, f.onda);
const mortes = (p.stats.mortes || 0) - mortes0;
const tempo = total * FPS_MS / 1000;
if (vitoria !== null) {
  console.log('SONDA [' + build + '] VENCEU em ' + (vitoria / 60).toFixed(1) +
    'min (mapa 100 limpo) | mortes ' + mortes + ' | nv ' + nvIni + '→' +
    p.nivel);
} else {
  console.log('SONDA [' + build + '] NÃO VENCEU em ' +
    (tempo / 60).toFixed(1) + 'min — ondas ' + ondas0 + '→' + ondasFim +
    ' (+' + (ondasFim - ondas0) + ') | mortes ' + mortes + ' | nv ' +
    nvIni + '→' + p.nivel + ' | dnv ' +
    ((p.nivel - nvIni) / Math.max(1, tempo / 60)).toFixed(2) + ' nv/min');
}

const saida = {
  build: build, mapaIni: mapaIni, minutos: minutos, semente: semente,
  trajetoriaNv: nv0,
  vitoria: vitoria,
  ondas: [ondas0, ondasFim],
  mortes: mortes,
  nv: [nvIni, p.nivel],
  danoFinal: Personagem.status(p).dano,
  skillNv: p.skillNv,
  atributos: p.atributos,
  equip: { arma: p.equip.arma.nome + '+' + p.equip.arma.up,
           armadura: p.equip.armadura.nome + '+' + p.equip.armadura.up }
};
try {
  const dir = path.join(RAIZ, 'resultados');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'sonda-fim-' + build + '.json'),
    JSON.stringify(saida, null, 2) + '\n');
  console.log('json: resultados/sonda-fim-' + build + '.json');
} catch (e) {
  console.log('json falhou: ' + e.message);
}
