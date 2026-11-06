// Converte um screenshot em mapa ASCII legível (depuração de layout).
// Uso: node testes/mapa.js arquivo.png [celula]
'use strict';
const fs = require('fs');

const { lerPNG } = require('./png');

// classifica uma cor em símbolo
function simbolo(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  const sat = mx - mn;
  if (r > 190 && g > 140 && g < 210 && b > 90 && b < 170) return 's'; // pele
  if (r > 230 && g > 230 && b > 230) return 'W';                     // branco
  if (r > 200 && g > 160 && b < 120) return '*';                     // dourado
  if (r > 150 && g < 110 && b < 110) return 'R';                     // vermelho
  if (g > r + 15 && g > b + 15) return ',';                          // verde (grama)
  if (r > 90 && r > g + 30 && r > b + 40) return 't';                // terra/madeira
  if (b > r + 20 && b > g + 10) return mx > 140 ? 'b' : 'B';         // azul
  if (sat < 25 && mx > 170) return '#';                              // texto claro
  if (sat < 25 && mx > 90) return ':';                               // cinza médio
  if (mx < 45) return '.';                                           // fundo escuro
  if (r > 100 && b > 120 && g < 100) return 'P';                     // roxo
  return '?';
}

const arquivo = process.argv[2];
const cel = parseInt(process.argv[3] || '4', 10);
const img = lerPNG(fs.readFileSync(arquivo));
console.log(arquivo + ' — ' + img.w + 'x' + img.h + ', célula ' + cel + 'px');
let cabecalho = '    ';
for (let x = 0; x < img.w; x += cel) {
  cabecalho += ((x / cel) % 10 === 0) ? String((x / cel / 10) % 10) : '.';
}
console.log(cabecalho);
for (let y = 0; y < img.h; y += cel) {
  let linha = '';
  for (let x = 0; x < img.w; x += cel) {
    // cor média da célula
    let r = 0, g = 0, b = 0, n = 0;
    for (let j = 0; j < cel && y + j < img.h; j++) {
      for (let i = 0; i < cel && x + i < img.w; i++) {
        const o = ((y + j) * img.w + x + i) * 3;
        r += img.px[o]; g += img.px[o + 1]; b += img.px[o + 2]; n++;
      }
    }
    linha += simbolo(Math.round(r / n), Math.round(g / n), Math.round(b / n));
  }
  console.log(String(y).padStart(3) + ' ' + linha);
}
