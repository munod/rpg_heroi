// Mede o ritmo de progressão E a qualidade do tempo de jogo —
// ferramenta manual para ajustar a curva (Personagem.custoProximo /
// CUSTO_BASE), a cota da onda (ONDA_SEG/BEAT da spec onda-timer) e a
// esponja de dano (TTK). Fica fora do todos.js.
// Uso: node testes/ritmo.js [minutos] [mundo|mapa] [k] [semente]
//   minutos = duração da sim (padrão 15; 60 p/ ver o boss; 13500 p/ a
//             campanha inteira de 100 mapas ≈ 200h)
//   modo/k  = variante da escala de monstros (A/B da spec mundos, T8);
//             sem args mantém o default do jogo
//   semente  = seed do Math.random (padrão 1). O run é DETERMINÍSTICO:
//             mesma semente ⇒ mesmos spawns/crít/drops/eventos, então
//             o A/B antes/depois é limpo. Varia a semente p/ estimar
//             variância de RNG (≥4 seeds por decisão de balance).
// Os eventos aleatórios (Açougueiro/Gatuno/Enxame/Cofre) ficam ATIVOS —
// só o RNG é semeado (decisão do mantenedor; determinístico junto).
// Investe os pontos em Força a cada 10s de jogo para referência estável.
// Saídas: console (marcos + métricas) e resultados/ritmo.json (gitignored)
// com config/marcos/níveis/métricas/commit p/ comparar versões.
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { carregar } = require('./carga');

const minutos = parseFloat(process.argv[2] || '15');
const modoArg = process.argv[3];   // 'mundo' | 'mapa' (A/B da escala)
const kArg = process.argv[4];      // monstros extras por mundo
const sementeArg = parseInt(process.argv[5] === undefined ? '1' : process.argv[5], 10);
const semente = Number.isFinite(sementeArg) && sementeArg >= 0 ? sementeArg : 1;
const FPS_MS = 16.7;               // o harness avança 16,7ms por frame
const RAIZ = path.join(__dirname, '..');

// mulberry32 (espelho de js/perlin.js): PRNG curtinho e reproduzível
function mulberry32(a) {
  return function () {
    a = a + 0x6D2B79F5 | 0;
    var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
// Semeia ANTES de carregar o jogo: o sandbox compartilha o Math do
// hospedeiro (carga.js), então o jogo inteiro (spawn, crít, drops,
// eventos) roda determinístico. Perlin.sorteio é independente (semente
// = nº do mapa) e continua intocado.
Math.random = mulberry32(semente);

const h = carregar();
(h.ouvintesJanela.load || []).forEach(fn => fn({}));
h.frame(5);
const Game = h.sandbox.Game;
const Batalha = h.sandbox.Batalha;
const Personagem = h.sandbox.Personagem;
const Itens = h.sandbox.Itens;
Game.setScene('jogo');
const p = Game.personagem;
console.log('RNG: semente ' + semente + ' (run determinístico; eventos ATIVOS)');
// A/B da escala de monstros (spec mundos T8) — sem args, default
const temEscala = modoArg === 'mundo' || modoArg === 'mapa' ||
  (kArg !== undefined && kArg !== '' && isFinite(parseFloat(kArg)));
if (temEscala) {
  const cfg = Batalha.escalaMonstros(modoArg,
    kArg !== undefined && kArg !== '' ? parseFloat(kArg) : undefined);
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

// ------------------------------------------------------------ sondas
// Acumuladores por frame (Leva 1): tempo de vida/espera, perigo e
// marcos de nível. "espera" = mesma condição do contador de tOnda
// (inimigos === 0 && herói vivo) — é o respiro que o jogador SENTE.
const amo = {
  frames: 0, vivo: 0, morto: 0,
  esp: 0, espRun: 0, espSoma: 0, espQtd: 0, espMax: 0,
  inimSoma: 0, inimMax: 0, hpMin: null,
  nv10: null, nv20: null, nv30: null, keystone: null,
  // duração de clear por onda (spec onda-timer R-TIM-6a): do spawn
  // (campo 0→vivo) ao clear (vivo→0) — daí sai o X da cota
  campoAnt: 0, ultSpawn: 0, ultBoss: false, clears: [], atrasos: 0
};
function agora() { return total * FPS_MS / 1000; }
function amostra(f) {
  amo.frames++;
  const esp = f.inimigos === 0 && !f.morto;
  if (f.morto) amo.morto++;
  else {
    amo.vivo++;
    // menor HP estando VIVO = pico de perigo sentido (morto conta 0
    // e viraria o mínimo eterno — não é o que queremos medir)
    if (amo.hpMin === null || f.hp < amo.hpMin) amo.hpMin = f.hp;
  }
  if (esp) { amo.esp++; amo.espRun++; }
  else if (amo.espRun > 0) {
    amo.espSoma += amo.espRun; amo.espQtd++;
    if (amo.espRun > amo.espMax) amo.espMax = amo.espRun;
    amo.espRun = 0;
  }
  amo.inimSoma += f.inimigos;
  if (f.inimigos > amo.inimMax) amo.inimMax = f.inimigos;
  // transições de campo p/ a métrica de clear (chefe separado: a cota
  // da onda-timer é isenta p/ ele)
  if (f.inimigos > 0 && amo.campoAnt === 0) {
    amo.ultSpawn = amo.frames;
    amo.ultBoss = (f.onda === 100);
  } else if (f.inimigos === 0 && amo.campoAnt > 0 && !amo.ultBoss) {
    const dur = (amo.frames - amo.ultSpawn) * FPS_MS / 1000;
    amo.clears.push(dur);
    // ondas que ESTOURARIAM/estouraram a cota (spec onda-timer R-TIM-6b)
    if (dur > Batalha.ONDA_SEG) amo.atrasos++;
  }
  amo.campoAnt = f.inimigos;
  if (amo.nv10 === null && p.nivel >= 10) amo.nv10 = agora();
  if (amo.nv20 === null && p.nivel >= 20) amo.nv20 = agora();
  if (amo.nv30 === null && p.nivel >= 30) amo.nv30 = agora();
  if (amo.keystone === null && p.keystoneLib) amo.keystone = agora();
}

// tempo até o 1º nível (referência do começo de jogo)
while (p.nivel < 2 && total < 60 * 60 * 1000 / FPS_MS) {
  run(1);
  amostra(Batalha.info());
}
console.log('1º nível: ' + (total * FPS_MS / 1000).toFixed(1) + 's');
gastar();

const marcos = [...new Set([1, 5, 15, 30, 45, 60, 90, 120, 180, 240,
  360, 480, 600, 900, 1200, 1500, 1800, 2400, 3000, 3600, 4200, 4800,
  5400, 6000, 7200, 8400, 9600, 10800, 12000, 13500, minutos])]
  .filter(m => m <= minutos).sort((a, b) => a - b);
let nvAnt = null, minAnt = null;
let onda100 = null, mapa2 = null, onda10m2 = null, vitoria = null;
const marcosJson = [];
let espAnt = 0, framesAnt = 0;   // delta de espera por marco

for (const m of marcos) {
  const alvo = Math.round(m * 60 * 1000 / FPS_MS);
  while (total < alvo && vitoria === null) {
    run(1);
    const f = Batalha.info();
    amostra(f);
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
  // % do tempo desde o marco anterior em respiro (a queixa do "dorme
  // entre as ondas" vista por trecho — o agregado sai no bloco final)
  const espPct = 100 * (amo.esp - espAnt) /
    Math.max(1, amo.frames - framesAnt);
  espAnt = amo.esp; framesAnt = amo.frames;
  const linha = {
    minuto: m, mapa: inf.mapa, onda: inf.onda, nv: p.nivel,
    xp: p.xp, xpProx: p.xpProx,
    mortes: p.stats.mortes || 0, ouro: Math.round(p.ouro || 0),
    dnv: dnv === null ? null : +dnv.toFixed(1),
    esperaPct: +espPct.toFixed(1)
  };
  marcosJson.push(linha);
  console.log(m + 'min: mapa ' + inf.mapa + ', onda ' + inf.onda +
    ', nv ' + p.nivel + ', xp ' + h.sandbox.UI.abrev(p.xp) + '/' +
    h.sandbox.UI.abrev(p.xpProx) +
    ' | mortes ' + linha.mortes +
    ' | ouro ' + linha.ouro +
    ' | espera ' + linha.esperaPct + '%' +
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

// ------------------------------------------------------- métricas finais
// Fonte única: p.stats (abates/dano/ouro/mortes) + sondas por frame.
// Tempo = frames simulados (o stats.tempo espelha o mesmo dt da jogatina).
function xpAcumulado() {
  let s = 0;
  for (let i = 1; i < p.nivel; i++) s += Personagem.custoProximo(i);
  return s + (p.xp || 0);   // Σ custos anteriores + parcial atual
}
// fecha a rajada de espera pendente (sim terminou no meio do respiro)
if (amo.espRun > 0) {
  amo.espSoma += amo.espRun; amo.espQtd++;
  if (amo.espRun > amo.espMax) amo.espMax = amo.espRun;
  amo.espRun = 0;
}
const tempoSeg = total * FPS_MS / 1000;
const st = p.stats || {};
const abates = st.abates || 0;
const danoC = st.danoCausado || 0;
const ouroG = st.ouroGanho || 0;
const ouroSp = st.ouroGasto || 0;
const mortesF = st.mortes || 0;
const xpTot = xpAcumulado();
const segEsp = amo.esp * FPS_MS / 1000;
const minutosSim = tempoSeg / 60;
const metricas = {
  tempoSimS: +tempoSeg.toFixed(1),
  kpm: +(abates / minutosSim).toFixed(2),
  dpsEfetivo: +(danoC / tempoSeg).toFixed(2),
  danoRecebido: st.danoRecebido || 0,
  gpm: +(ouroG / minutosSim).toFixed(2),
  ouroGasto: ouroSp,
  eficienciaOuro: +(danoC / Math.max(1, ouroSp)).toFixed(1),
  xpTotal: xpTot,
  xpm: +(xpTot / minutosSim).toFixed(1),
  uptime: +(amo.vivo / Math.max(1, amo.vivo + amo.morto)).toFixed(4),
  mortesHora: +(mortesF / (tempoSeg / 3600)).toFixed(2),
  hpMin: amo.hpMin,
  esperaPct: +(100 * amo.esp / Math.max(1, amo.frames)).toFixed(1),
  esperaMediaS: amo.espQtd > 0
    ? +(amo.espSoma * FPS_MS / 1000 / amo.espQtd).toFixed(1) : 0,
  esperaMaxS: +(amo.espMax * FPS_MS / 1000).toFixed(1),
  ttkMedio: abates > 0 ? +((tempoSeg - segEsp) / abates).toFixed(2) : null,
  inimigosMedio: +(amo.inimSoma / Math.max(1, amo.frames)).toFixed(2),
  inimigosMax: amo.inimMax,
  // clear por onda (spec onda-timer R-TIM-6a) — daí sai o X da cota
  clearMedio: +(amo.clears.reduce((a, b) => a + b, 0) /
    Math.max(1, amo.clears.length)).toFixed(2),
  clearP95: amo.clears.length
    ? +amo.clears.slice().sort((a, b) => a - b)[
        Math.floor(amo.clears.length * 0.95)].toFixed(2) : null,
  clearMax: amo.clears.length
    ? +Math.max.apply(null, amo.clears).toFixed(2) : null,
  clears: amo.clears.length,
  atrasoPct: +(100 * amo.atrasos / Math.max(1, amo.clears.length))
    .toFixed(2)
};
console.log('--- métricas (' + tempoSeg.toFixed(0) + 's simulados) ---');
console.log('combate: kpm ' + metricas.kpm + ' · dps efetivo ' +
  metricas.dpsEfetivo + ' · ttk médio ' +
  (metricas.ttkMedio === null ? '—' : metricas.ttkMedio + 's') +
  ' · inimigos ' + metricas.inimigosMedio + ' (máx ' + metricas.inimigosMax + ')');
console.log('clear/onda: médio ' + metricas.clearMedio + 's · p95 ' +
  metricas.clearP95 + 's · máx ' + metricas.clearMax + 's (' +
  metricas.clears + ' clears — base do X da onda-timer)');
console.log('tempo: espera ' + metricas.esperaPct + '% (média ' +
  metricas.esperaMediaS + 's · máx ' + metricas.esperaMaxS + 's) · uptime ' +
  (100 * metricas.uptime).toFixed(1) + '% · menor HP vivo ' + metricas.hpMin);
console.log('economia: xpm ' + metricas.xpm + ' · gpm ' + metricas.gpm +
  ' · ouro gasto ' + metricas.ouroGasto + ' · dano/ouro ' +
  metricas.eficienciaOuro + ' · mortes/h ' + metricas.mortesHora);
console.log('níveis: nv10 ' + fmt(amo.nv10) + ' · nv20 ' + fmt(amo.nv20) +
  ' · nv30 ' + fmt(amo.nv30) + ' · keystone ' + fmt(amo.keystone));
function fmt(s) { return s === null ? '—' : s.toFixed(1) + 's'; }

// -------------------------------------------------------------- JSON
function commitAtual() {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: RAIZ })
      .toString().trim();
  } catch (e) { return null; }   // fora de repo: segue sem o campo
}
const saida = {
  config: {
    minutos: minutos, modo: modoArg || null,
    k: (kArg !== undefined && kArg !== '') ? kArg : null,
    semente: semente, fpsMs: FPS_MS
  },
  geradoEm: new Date().toISOString(),
  commit: commitAtual(),
  marcos: marcosJson,
  niveis: {
    nv10: amo.nv10, nv20: amo.nv20, nv30: amo.nv30, keystone: amo.keystone
  },
  metricas: metricas,
  fim: {
    vitoria: vitoria, onda100: onda100, mapa2: mapa2, onda10m2: onda10m2,
    mapa: inf_final().mapa, onda: inf_final().onda,
    nvFinal: p.nivel, mortes: mortesF, ouro: Math.round(p.ouro || 0)
  }
};
function inf_final() { return Batalha.info(); }
try {
  const dir = path.join(RAIZ, 'resultados');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'ritmo.json'),
    JSON.stringify(saida, null, 2) + '\n');
  console.log('json: resultados/ritmo.json' +
    (saida.commit ? ' (commit ' + saida.commit + ')' : ''));
} catch (e) {
  console.log('json não gravado: ' + e.message);
}
