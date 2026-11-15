// Sonda das rules do RANKING implantadas no Firebase (spec
// ranking-antitrampa). REDE — fica FORA do gate (todos.js) de propósito:
//   node testes/regras.js            # leitura + paridade + controle
//   node testes/regras.js --teto     # + prova do teto de progressão
//
// O que prova:
//   [1] leitura do placar segue aberta (é público por design)      -> 200
//   [2] P1 paridade VIOLADA em rank/diagnostico                   -> 403
//       (score que não bate com mapa/onda/nivel; se voltar 200 as
//        rules novas NÃO estão publicadas — no máximo o doc de
//        diagnóstico ganha score 2, inócuo)
//   [3] P0 envio legítimo (paridade + teto + `at` fresco)          -> 200
//       (prova que as regras novas NÃO rejeitam o jogo de verdade)
//   [4] --teto: mapa acima do teto por tempo                       -> 403
//       (opt-in: só roda se o [2] já provou as rules novas, senão
//        ele escreveria ~10^7-10^8 no doc diagnóstico e subiria no
//        placar público)
'use strict';

const fs = require('fs');
const path = require('path');

const cfg = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'ranking-config.js'), 'utf8');
const apiKey = (cfg.match(/apiKey:\s*'([^']+)'/) || [])[1];
const projeto = (cfg.match(/projectId:\s*'([^']+)'/) || [])[1];
if (!apiKey || !projeto) {
  console.error('config do Firebase não encontrada em js/ranking-config.js');
  process.exit(2);
}

const BASE = 'https://firestore.googleapis.com/v1/projects/' + projeto +
  '/databases/(default)/documents';
const DOC = 'rank/diagnostico';   // doc de lixo existente: falha é inócua
// época idem regras-firestore.rules (2026-11-01T00:00:00Z)
const EPOCA = 1793491200000;
const MAPAS_BASE = 30;
const MIN_POR_MAPA = 100;

function campos(d) {
  const f = {};
  Object.keys(d).forEach(k => {
    const v = d[k];
    f[k] = typeof v === 'string' ? { stringValue: v } : { integerValue: String(v) };
  });
  return { fields: f };
}

async function get(url) {
  const r = await fetch(url);
  return { status: r.status, corpo: (await r.text()).slice(0, 400) };
}

async function patch(dados) {
  const r = await fetch(`${BASE}/${DOC}?key=${apiKey}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(campos(dados))
  });
  return { status: r.status, corpo: (await r.text()).slice(0, 400) };
}

function base(mapa, onda, nivel) {
  return { mapa, onda, nivel };
}
function scoreDe(mapa, onda, nivel) {   // idem Ranking.scoreDe
  return mapa * 100000 + onda * 1000 + Math.min(999, Math.max(0, nivel));
}

async function main() {
  const agora = Date.now();
  const teto = MAPAS_BASE + Math.floor((agora - EPOCA) / 60000 / MIN_POR_MAPA);
  const falhas = [];

  console.log('sonda das rules · projeto ' + projeto + ' · teto atual: mapa ' +
    teto + ' (' + new Date(agora).toISOString() + ')');

  // [1] leitura
  const l = await get(`${BASE}/rank?pageSize=3&key=${apiKey}`);
  const leituraOk = l.status === 200;
  console.log(`  [1] leitura do placar          -> ${l.status} ` +
    (leituraOk ? '(público por design)' : 'INESPERADO'));
  if (!leituraOk) falhas.push('leitura');

  // [2] P1: paridade violada (score 2 não bate com M1/O1/N1)
  const p1 = await patch(Object.assign(base(1, 1, 1), {
    nick: 'Diagnóstico', classe: 'guerreiro', at: agora, score: 2
  }));
  const paridadeViva = p1.status === 403;
  console.log(`  [2] P1 paridade violada       -> ${p1.status} ` +
    (paridadeViva ? '(rules novas ativas ✓)'
      : 'AS RULES NOVAS NÃO ESTÃO PUBLICADAS (score do doc virou 2)'));
  if (!paridadeViva) falhas.push('paridade');

  // [3] P0: envio legítimo tem que passar (regra nova não pode travar o jogo)
  const s0 = scoreDe(1, 1, 1);
  const p0 = await patch(Object.assign(base(1, 1, 1), {
    nick: 'Diagnóstico', classe: 'guerreiro', at: agora, score: s0
  }));
  const controleOk = p0.status === 200;
  console.log(`  [3] P0 envio legítimo         -> ${p0.status} ` +
    (controleOk ? '(score ' + s0 + ' aceito ✓)'
      : 'REJEITADO — as rules novas estariam travando o jogo'));
  if (!controleOk) falhas.push('controle');

  // [4] teto (opt-in) — só faz sentido se a paridade está viva
  if (process.argv.indexOf('--teto') >= 0) {
    if (!paridadeViva) {
      console.log('  [4] --teto PULADO (sem rules novas, evita poluir o placar)');
    } else {
      const mapa = teto + 50;
      const p2 = await patch(Object.assign(base(mapa, 1, 1), {
        nick: 'Diagnóstico', classe: 'guerreiro', at: agora,
        score: scoreDe(mapa, 1, 1)
      }));
      const tetoVivo = p2.status === 403;
      console.log(`  [4] --teto mapa ${mapa}          -> ${p2.status} ` +
        (tetoVivo ? '(teto de progressão ativo ✓)'
          : 'TETO AUSENTE (doc diagnóstico ganhou score grande)'));
      if (!tetoVivo) falhas.push('teto');
    }
  }

  if (falhas.length) {
    console.log('RESULTADO: FALHOU (' + falhas.join(', ') + ')');
    process.exit(1);
  }
  console.log('RESULTADO: rules implantadas batem com o arquivo');
}

main().catch(e => { console.error('erro da sonda: ' + e.message); process.exit(2); });
