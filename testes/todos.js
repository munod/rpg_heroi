// Roda todos os testes do projeto em sequência (um só comando).
// Uso: node testes/todos.js
'use strict';

const { spawnSync } = require('child_process');
const path = require('path');

// fumaca e grade têm asserções; previa e cena geram imagens e saem com
// código diferente de zero se algo quebrar no meio do caminho
const TESTES = ['fumaca.js', 'grade.js', 'previa.js', 'cena.js'];

let falhas = 0;
for (const arquivo of TESTES) {
  console.log('\n=== ' + arquivo + ' ===');
  const r = spawnSync(process.execPath, [path.join(__dirname, arquivo)], {
    stdio: 'inherit'
  });
  if (r.status !== 0) {
    falhas++;
    console.log('FALHOU: ' + arquivo + ' (exit ' + r.status + ')');
  }
}

console.log('');
if (falhas) {
  console.log(falhas + ' arquivo(s) de teste falharam');
  process.exit(1);
}
console.log('TODOS OS TESTES PASSARAM (' + TESTES.length + ' arquivos)');
