// Painel de gestão do personagem (atributos, aparência, classe).
// Compartilhado pela tela de seleção/criação e pela tela de jogo, para
// as duas telas terem exatamente o mesmo comportamento.
var Gestao = (function () {
  var aba = 'atributos';   // atributos | aparencia | classe

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

  function desenhaAbas() {
    var lista = [
      ['atributos', 'Atributos'],
      ['aparencia', 'Aparência'],
      ['classe', 'Classe']
    ];
    lista.forEach(function (a, i) {
      var x = 205 + i * 58;
      if (UI.button(x, 19, 57, 13, a[1], {
        ativo: aba === a[0],
        color: aba === a[0] ? '#e8c86a' : '#9a90b8',
        font: 'bold 8px monospace'
      })) {
        aba = a[0];
      }
    });
  }

  function desenhaAtributos(ctx, p) {
    Personagem.ATRIBUTOS.forEach(function (at, i) {
      var y = 46 + i * 14;
      var v = p.atributos[at.id];
      UI.text(at.nome, 208, y, {});
      UI.text(String(v), 332, y, { align: 'right', color: '#e8c86a' });
      if (UI.button(342, y - 5, 11, 11, '-', { disabled: v <= 1 })) {
        p.atributos[at.id] -= 1;
        p.pontos += 1;
      }
      if (UI.button(356, y - 5, 11, 11, '+', { disabled: p.pontos <= 0 })) {
        p.atributos[at.id] += 1;
        p.pontos -= 1;
      }
    });

    var cl = Personagem.CLASSES[p.classe];
    var bonus = Personagem.ATRIBUTOS.filter(function (at) {
      return cl.bonus[at.id];
    }).map(function (at) {
      var b = cl.bonus[at.id];
      return (b > 0 ? '+' : '') + b + ' ' + at.nome;
    }).join(', ');
    UI.text('Classe: ' + cl.nome, 208, 118, { color: cl.cor });
    // o bônus passa de 30 caracteres: quebra em vez de estourar o painel
    var linhas = quebra(bonus || 'sem bônus', 30);
    linhas.forEach(function (linha, i) {
      UI.text(linha, 208, 130 + i * 12, { color: '#9a90b8' });
    });
    UI.text('Cada nível: +5 pontos', 208, 130 + linhas.length * 12 + 6,
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
      var y = 48 + i * 16;
      UI.text(lin.rot, 208, y, {});
      if (UI.button(258, y - 6, 11, 12, '<')) lin.muda(-1);
      if (lin.swatch) {
        UI.swatch(272, y - 6, 70, 12, lin.get());
      } else {
        UI.swatch(272, y - 6, 70, 12, '#241f33');
        UI.text(lin.nome(), 307, y, { align: 'center', color: '#c9c2dd' });
      }
      if (UI.button(348, y - 6, 11, 12, '>')) lin.muda(1);
    });

    UI.text('Muda na arena em tempo real', 208, 124, { color: '#9a90b8' });
    if (o && o.criacao) {
      // na tela de seleção o nome se digita no cabeçalho
      UI.text('Nome: digite qualquer tecla no topo', 208, 140, { color: '#6f678a' });
      UI.text('Enter entra na arena', 208, 152, { color: '#6f678a' });
    } else {
      UI.text('Enter salva a qualquer momento', 208, 140, { color: '#6f678a' });
    }
  }

  function desenhaClasse(ctx, p) {
    var ordem = ['guerreiro', 'mago', 'ladino', 'clerigo'];
    ordem.forEach(function (id, i) {
      var cl = Personagem.CLASSES[id];
      var sel = p.classe === id;
      if (UI.button(206, 46 + i * 16, 168, 14, (sel ? '> ' : '  ') + cl.nome, {
        color: sel ? '#e8c86a' : '#f2eef8'
      })) {
        p.classe = id;
      }
    });

    var cl = Personagem.CLASSES[p.classe];
    // 34 cabe nos 170px do painel; 36 passava da borda
    var linhas = quebra(cl.desc, 34);
    linhas.forEach(function (linha, i) {
      UI.text(linha, 208, 120 + i * 12, { color: '#9a90b8' });
    });
    UI.text('Arma: ' + cl.armaNome, 208, 156, { color: '#6f678a' });
  }

  // Desenha o painel direito completo (painel + abas + conteúdo).
  // o.criacao ajusta as dicas de texto para a tela de seleção.
  function desenhar(ctx, p, o) {
    UI.panel(204, 18, 176, 150);
    desenhaAbas();
    if (aba === 'atributos') desenhaAtributos(ctx, p);
    else if (aba === 'aparencia') desenhaAparencia(ctx, p, o);
    else desenhaClasse(ctx, p);
  }

  function setAba(a) { aba = a; }
  function atual() { return aba; }

  return {
    desenhar: desenhar,
    setAba: setAba,
    atual: atual,
    quebra: quebra
  };
})();
