// Painel de gestão do personagem (atributos, aparência, classe).
// Compartilhado pela tela de seleção/criação e pela tela de jogo, para
// as duas telas terem exatamente o mesmo comportamento.
var Gestao = (function () {
  var aba = 'atributos';   // atributos | aparencia | classe | itens
  var paginaBolsa = 0;     // página da lista da bolsa (5 por página)
  var passo = 1;           // quantos pontos por ação (toggle ×1/×5)
  var repT = 0;            // tempo segurando um botão +/−
  var repI = 0;            // tempo desde a última repetição
  var REP_ATRASO = 0.25;   // segurar antes de começar a repetir
  var REP_PASSO = 0.1;     // cadência da repetição (~10/s)
  var RECT_TOGGLE = { x: 684, y: 224, w: 55, h: 26 };

  function ciclo(arr, atual) {
    var i = arr.indexOf(atual);
    return arr[(i + 1) % arr.length];
  }

  function cicloTras(arr, atual) {
    var i = arr.indexOf(atual);
    if (i < 0) i = 0;
    return arr[(i - 1 + arr.length) % arr.length];
  }

  function quebra(texto, max) {
    var palavras = texto.split(' ');
    var linhas = [], atual = '';
    for (var i = 0; i < palavras.length; i++) {
      var teste = atual ? atual + ' ' + palavras[i] : palavras[i];
      if (teste.length > max && atual) {
        linhas.push(atual);
        atual = palavras[i];
      } else {
        atual = teste;
      }
    }
    if (atual) linhas.push(atual);
    return linhas;
  }

  function dentro(m, r) {
    return m.x >= r.x && m.x < r.x + r.w && m.y >= r.y && m.y < r.y + r.h;
  }

  // Linhas dos atributos com retângulos dos botões +/− — fonte única de
  // geometria: o update aplica as ações e o render só desenha por cima.
  // Alvos de toque: 11 -> 24px no dobro da resolução (dedo no celular).
  function linhasAtributos() {
    return Personagem.ATRIBUTOS.map(function (at, i) {
      var y = 96 + i * 28;
      return {
        at: at.id,
        nome: at.nome,
        y: y,
        menos: { x: 684, y: y - 12, w: 24, h: 24 },
        mais:  { x: 716, y: y - 12, w: 24, h: 24 }
      };
    });
  }

  // Move `passo` pontos no sentido dir, com as guardas em cada unidade
  // (não gasta mais do que tem, não leva atributo abaixo de 1).
  function aplicar(p, at, dir) {
    for (var i = 0; i < passo; i++) {
      if (dir > 0) {
        if (p.pontos <= 0) return;
        p.atributos[at] += 1;
        p.pontos -= 1;
      } else {
        if (p.atributos[at] <= 1) return;
        p.atributos[at] -= 1;
        p.pontos += 1;
      }
    }
  }

  // As ações do painel acontecem aqui (fora do render): o clique aplica
  // na hora e, segurado, repete depois do arranque — em vez de um ponto
  // por clique, só.
  function update(dt, p) {
    if (!p || aba !== 'atributos') { repT = 0; repI = 0; return; }
    // em tela larga o painel ancora à direita: os retângulos são locais
    // e o ponteiro é deslocado para o espaço do painel (dx = W - 768)
    var dx = Game.W - 768;
    var m = { x: Input.mouse.x - dx, y: Input.mouse.y,
              clicked: Input.mouse.clicked, down: Input.mouse.down };
    var linhas = linhasAtributos();
    var alvo = null, dir = 0;
    for (var i = 0; i < linhas.length; i++) {
      if (dentro(m, linhas[i].menos)) { alvo = linhas[i].at; dir = -1; break; }
      if (dentro(m, linhas[i].mais)) { alvo = linhas[i].at; dir = 1; break; }
    }

    if (alvo && m.clicked) aplicar(p, alvo, dir);

    if (alvo && m.down) {
      repT += dt;
      if (repT >= REP_ATRASO) {
        repI += dt;
        while (repI >= REP_PASSO) {
          repI -= REP_PASSO;
          aplicar(p, alvo, dir);
        }
      }
    } else {
      repT = 0;
      repI = 0;
    }

    if (m.clicked && dentro(m, RECT_TOGGLE)) passo = passo === 1 ? 5 : 1;
  }

  function desenhaAbas() {
    // 5 abas encurtadas: o painel tem 352px — 66px de largura com passo 70
    var lista = [
      ['atributos', 'Atrib'],
      ['aparencia', 'Apar'],
      ['classe', 'Classe'],
      ['itens', 'Itens'],
      ['stats', 'Stats']
    ];
    lista.forEach(function (a, i) {
      var x = 412 + i * 70;
      if (UI.button(x, 40, 66, 28, a[1], {
        ativo: aba === a[0],
        color: aba === a[0] ? '#e8c86a' : '#9a90b8',
        font: 'bold 16px monospace'
      })) {
        aba = a[0];
      }
    });
  }

  function desenhaAtributos(ctx, p) {
    linhasAtributos().forEach(function (linha) {
      var v = p.atributos[linha.at];
      UI.text(linha.nome, 416, linha.y, {});
      UI.text(String(v), 664, linha.y, { align: 'right', color: '#e8c86a' });
      // visual apenas: clicar/segurar aplica em Gestao.update
      UI.button(linha.menos.x, linha.menos.y, 24, 24, '-',
        { disabled: v <= 1 });
      UI.button(linha.mais.x, linha.mais.y, 24, 24, '+',
        { disabled: p.pontos <= 0 });
    });

    // toggle de quantos pontos cada clique/segurar gasta
    UI.button(RECT_TOGGLE.x, RECT_TOGGLE.y, RECT_TOGGLE.w, RECT_TOGGLE.h,
      '×' + passo, {
        ativo: passo === 5,
        color: passo === 5 ? '#e8c86a' : undefined
      });

    var cl = Personagem.CLASSES[p.classe];
    var bonus = Personagem.ATRIBUTOS.filter(function (at) {
      return cl.bonus[at.id];
    }).map(function (at) {
      var b = cl.bonus[at.id];
      return (b > 0 ? '+' : '') + b + ' ' + at.nome;
    }).join(', ');
    UI.text('Classe: ' + cl.nome, 416, 240, { color: cl.cor });
    // em 16px cabem 35 caracteres nos 343px do painel; 36 estoura
    var linhas = quebra(bonus || 'sem bônus', 35);
    linhas.forEach(function (linha, i) {
      UI.text(linha, 416, 268 + i * 24, { color: '#9a90b8' });
    });
    UI.text('Cada nível: +5 pontos', 416, 268 + linhas.length * 24 + 12,
      { color: '#6f678a' });
  }

  function desenhaAparencia(ctx, p, o) {
    var estiloIds = Personagem.ESTILOS.map(function (e) { return e.id; });
    var estiloNomes = {};
    Personagem.ESTILOS.forEach(function (e) { estiloNomes[e.id] = e.nome; });

    var linhas = [
      {
        rot: 'Pele', swatch: true,
        get: function () { return p.look.skin; },
        muda: function (d) {
          p.look.skin = d > 0
            ? ciclo(Personagem.CORES_PELE, p.look.skin)
            : cicloTras(Personagem.CORES_PELE, p.look.skin);
        }
      },
      {
        rot: 'Cabelo', swatch: true,
        get: function () { return p.look.hair; },
        muda: function (d) {
          p.look.hair = d > 0
            ? ciclo(Personagem.CORES_CABELO, p.look.hair)
            : cicloTras(Personagem.CORES_CABELO, p.look.hair);
        }
      },
      {
        rot: 'Estilo', swatch: false,
        nome: function () { return estiloNomes[p.look.estilo] || '?'; },
        muda: function (d) {
          p.look.estilo = d > 0
            ? ciclo(estiloIds, p.look.estilo)
            : cicloTras(estiloIds, p.look.estilo);
        }
      },
      {
        rot: 'Roupa', swatch: true,
        get: function () { return p.look.cloth; },
        muda: function (d) {
          p.look.cloth = d > 0
            ? ciclo(Personagem.CORES_ROUPA, p.look.cloth)
            : cicloTras(Personagem.CORES_ROUPA, p.look.cloth);
        }
      }
    ];

    linhas.forEach(function (lin, i) {
      var y = 104 + i * 32;
      UI.text(lin.rot, 416, y, {});
      if (UI.button(508, y - 14, 24, 28, '<')) lin.muda(-1);
      if (lin.swatch) {
        UI.swatch(544, y - 14, 140, 28, lin.get());
      } else {
        UI.swatch(544, y - 14, 140, 28, '#241f33');
        UI.text(lin.nome(), 614, y, { align: 'center', color: '#c9c2dd' });
      }
      if (UI.button(692, y - 14, 24, 28, '>')) lin.muda(1);
    });

    UI.text('Muda na arena em tempo real', 416, 248, { color: '#9a90b8' });
    if (o && o.criacao) {
      // na tela de seleção o nome se digita no cabeçalho
      UI.text('Nome: digite qualquer tecla no topo', 416, 280, { color: '#6f678a' });
      UI.text('Enter entra na arena', 416, 308, { color: '#6f678a' });
    } else {
      UI.text('Enter salva a qualquer momento', 416, 280, { color: '#6f678a' });
    }
  }

  // Ações de investimento num slot (A+ aprimora · R+ re-rola), com o
  // custo no rótulo; desativadas sem item/ouro/teto/afixos.
  function slotAcoes(p, item, y) {
    var ca = item ? Itens.custoAprim(item) : -1;
    var cr = item ? Itens.custoReroll(item) : -1;
    if (UI.button(676, y, 38, 24, 'A+' + (ca >= 0 ? ca : '—'), {
      disabled: !item || ca < 0 || (p.ouro || 0) < ca,
      font: '11px monospace'
    })) {
      if (Itens.aprimorar(p, item)) {
        Gravacao.msg(item.nome + ' aprimorado (+' + item.up + ')');
      }
    }
    if (UI.button(718, y, 38, 24, 'R+' + (cr >= 0 ? cr : '—'), {
      disabled: !item || cr < 0 || (p.ouro || 0) < cr,
      font: '11px monospace'
    })) {
      if (Itens.reroll(p, item)) Gravacao.msg('Re-roll: ' + item.nome);
    }
  }

  // Aba Itens: 2 slots equipados (nome + bônus, com A+/R+), ouro e bolsa
  // paginada. Linha da bolsa = equipar | V (vende 25%) | S (sucata, piso
  // garantido) — o delta por chave aparece contra o equipado (item com
  // afixo negativo aparece com '-'). Linhas em 13px.
  function desenhaItens(ctx, p) {
    var arma = p.equip.arma, arm = p.equip.armadura;
    UI.text('Arma: ' + (arma ? Itens.linha(arma, null, 26) : '—'), 416, 96,
      { color: arma ? Itens.corRar(arma.rar) : '#6f678a', font: '13px monospace' });
    slotAcoes(p, arma, 84);
    UI.text('Armadura: ' + (arm ? Itens.linha(arm, null, 22) : '—'), 416, 124,
      { color: arm ? Itens.corRar(arm.rar) : '#6f678a', font: '13px monospace' });
    slotAcoes(p, arm, 112);

    UI.text('Ouro ' + milhar(p.ouro || 0) + ' · Bolsa ' +
      p.bolsa.length + '/' + Itens.BOLSA_MAX,
      416, 152, { color: '#e8c86a' });
    UI.text('V venda · S sucata · A+ apr. · R+ rer.', 416, 168,
      { color: '#6f678a', font: '11px monospace' });
    var paginas = Math.max(1, Math.ceil(p.bolsa.length / 5));
    if (paginaBolsa > paginas - 1) paginaBolsa = paginas - 1;
    if (UI.button(684, 144, 28, 28, '<', { disabled: paginaBolsa === 0 })) {
      paginaBolsa--;
    }
    if (UI.button(720, 144, 28, 28, '>',
      { disabled: paginaBolsa >= paginas - 1 })) {
      paginaBolsa++;
    }

    if (!p.bolsa.length) {
      UI.text('Derrotar monstros dropa equipamento', 416, 192,
        { color: '#6f678a' });
      return;
    }

    p.bolsa.slice(paginaBolsa * 5, paginaBolsa * 5 + 5)
      .forEach(function (item, i) {
        var y = 176 + i * 30;
        if (UI.button(416, y, 272, 26,
          Itens.linha(item, p.equip[item.slot], 33), {
            align: 'left', color: Itens.corRar(item.rar),
            font: '13px monospace'
          })) {
          Itens.equipar(p, item);
        }
        if (UI.button(692, y, 30, 26, 'V', {
          color: '#8ce08c', font: '13px monospace'
        })) {
          var gv = Itens.vender(p, item);
          if (gv) Gravacao.msg('+' + gv + ' ouro (vendido)');
        }
        if (UI.button(726, y, 30, 26, 'S', {
          color: '#c9c2dd', font: '13px monospace'
        })) {
          var gs = Itens.sucatear(p, item);
          if (gs) Gravacao.msg('+' + gs + ' ouro (sucata)');
        }
      });
  }

  function desenhaClasse(ctx, p) {
    var ordem = ['guerreiro', 'mago', 'ladino', 'clerigo'];
    ordem.forEach(function (id, i) {
      var cl = Personagem.CLASSES[id];
      var sel = p.classe === id;
      if (UI.button(416, 96 + i * 36, 336, 32, (sel ? '> ' : '  ') + cl.nome, {
        color: sel ? '#e8c86a' : '#f2eef8'
      })) {
        p.classe = id;
      }
    });

    var cl = Personagem.CLASSES[p.classe];
    // 35 caracteres = 336px cabem nos 343px do painel (16px)
    var linhas = quebra(cl.desc, 35);
    linhas.forEach(function (linha, i) {
      UI.text(linha, 416, 252 + i * 24, { color: '#9a90b8' });
    });
    // próxima skill da classe (a arma já aparece no rodapé e na aba Itens)
    var prox = Skills.proxima(p.classe, p.nivel);
    UI.text(prox ? 'Próxima: ' + prox.nome + ' (nv ' + prox.nivel + ')'
                 : 'Todas as skills desbloqueadas',
      416, 316, { color: prox ? prox.cor : '#8ce08c' });
  }

  // milhar em pt-BR sem depender do locale do ambiente: 1234567 -> 1.234.567
  function milhar(n) {
    var s = String(Math.max(0, Math.floor(n || 0)));
    return s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  // segundos -> '45s' | '12min' | '2h13min'
  function tempoHumano(seg) {
    var s = Math.max(0, Math.floor(seg || 0));
    if (s < 60) return s + 's';
    var min = Math.floor(s / 60);
    if (min < 60) return min + 'min';
    return Math.floor(min / 60) + 'h' + (min % 60) + 'min';
  }

  // Aba Stats: estatísticas de vida inteira do herói (Personagem.stats)
  function desenhaStats(ctx, p) {
    var s = p.stats || {};
    UI.text('Estatísticas', 416, 96, { color: '#e8c86a' });
    var linhas = [
      ['Abates', milhar(s.abates)],
      ['Chefes derrotados', milhar(s.bosses)],
      ['Ondas limpas', milhar(s.ondas)],
      ['Dano causado', milhar(s.danoCausado)],
      ['Dano recebido', milhar(s.danoRecebido)],
      ['Mortes', milhar(s.mortes)],
      ['Itens dropados', milhar(s.itens)],
      ['Tempo de jogo', tempoHumano(s.tempo)]
    ];
    linhas.forEach(function (l, i) {
      var y = 128 + i * 26;
      UI.text(l[0], 416, y, { color: '#c9c2dd' });
      UI.text(l[1], 752, y, { align: 'right', color: '#e8c86a' });
    });
  }

  // Desenha o painel direito completo (painel + abas + conteúdo).
  // o.criacao ajusta as dicas de texto para a tela de seleção.
  function desenhar(ctx, p, o) {
    // âncora direita em tela larga: o grupo inteiro desloca por dx
    // (desenho via translate; hit-test via UI.deslocar e o m - dx do
    // update). Em 16:9, dx = 0 e nada muda.
    var dx = Game.W - 768;
    ctx.save();
    ctx.translate(dx, 0);
    UI.deslocar(dx);
    UI.panel(408, 36, 352, 300);
    desenhaAbas();
    if (aba === 'atributos') desenhaAtributos(ctx, p);
    else if (aba === 'aparencia') desenhaAparencia(ctx, p, o);
    else if (aba === 'itens') desenhaItens(ctx, p);
    else if (aba === 'stats') desenhaStats(ctx, p);
    else desenhaClasse(ctx, p);
    UI.deslocar(0);
    ctx.restore();
  }

  return {
    desenhar: desenhar,
    update: update,
    quebra: quebra
  };
})();
