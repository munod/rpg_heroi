// Cutscenes (spec cutscenes): narração de fronteira de mundo com o mapa
// do universo, momentos dos eventos aleatórios e a tela própria do
// mapa. Overlay por cima da jogatina no MOLDE DO OVERLAY DE VITÓRIA:
// a batalha NUNCA pausa (idle sagrado) — só a gestão bloqueia (os dois
// níveis: UI.bloqueia no desenho + pulo do Gestao.update, em jogo.js).
// Fronteira de mundo: espera o jogador (9 na campanha). Evento:
// auto-dismiss ~3,5s (são frequentes) e teto 1 (nunca acumula nem
// reinicia timer). `silenciar` desliga eventos na simulação de ausência
// (voltaAusencia) — a cutscene de MUNDO continua valendo ali: é o
// resumo do que aconteceu enquanto o jogador esteve fora.
var Cutscene = (function () {
  var atual = null;      // {tipo:'mundo'|'evento', ...} ou null (nunca 2)
  var mudo = false;      // eventos silenciados (simulação offline)
  var AUTO_EVENTO = 3.5; // segundos até um evento sumir sozinho

  // geometria dos overlays (fonte única: desenhar + info().botao)
  var MUNDO_PW = 640, MUNDO_PH = 300, MUNDO_PY = 66;
  var EV_PW = 560, EV_PH = 210;

  // Narração das fronteiras (entra no mundo N) — 2 linhas; nome e chefe
  // do mundo saem de Mapas.LISTA (fonte única — não espelhar aqui).
  var FRONTEIRAS = {
    2: ['A Planície Verdejante está em paz — mas por pouco tempo.',
        'O gelo cobre tudo: a Cripta Congelada desperta.'],
    3: ['O frio da cripta derreteu sob os seus golpes.',
        'Fios vermelhos cruzam o chão: o Ninho Rubro está vivo.'],
    4: ['A teia se rompeu. Você segue para o sul.',
        'O sol não tem piedade no Deserto Escaldante.'],
    5: ['A areia queima, mas o lama prende mais.',
        'O Pântano Venenoso borbulha veneno em cada poça.'],
    6: ['Você escapa do lama — para as trevas densas.',
        'Na Floresta Noturna, nem a luz da lua atravessa.'],
    7: ['As árvores queimam atrás de você.',
        'Abaixo, o fogo ruge: a Forja Abissal nunca apaga.'],
    8: ['O fogo da forja esfria — mas o céu queima.',
        'As Ruínas Celestiais caíram do alto há eras.'],
    9: ['Nem pedra, nem luz, nem ar. Só o vazio.',
        'O Vazio Abissal engole até os seus passos.'],
    10: ['Você atravessou o nada.',
         'No Trono do Caos, o fim de tudo tem nome e coroa.']
  };

  // Eventos aleatórios → cutscene (título/cor/narração)
  var EVENTOS = {
    acougueiro: {
      titulo: 'AÇOUGUEIRO', cor: '#ff5a3a',
      linhas: ['Um predador raro fareja o seu rastro.',
               'Derrote-o em 30s: ouro ×10, XP ×4 e um lendário!']
    },
    gatuno: {
      titulo: 'GATUNO', cor: '#e8c86a',
      linhas: ['Um ladrão de bolso puxa a sua algibeira.',
               'Ele roubou 15% do seu ouro — persiga-o antes que fuja!']
    },
    enxame: {
      titulo: 'ENXAME', cor: '#8ac040',
      linhas: ['O chão treme: a praga chega em banda.',
               'A onda dobra — e paga XP e ouro ×1,5!']
    },
    cofre: {
      titulo: 'COFRE ABANDONADO', cor: '#e8c86a',
      linhas: ['Algo brilha entre os obstáculos.',
               'Um Cofre Abandonado — aproxime-se para coletar!']
    }
  };

  // ------------------------------------------------------------- estado

  // Fronteira de mundo (campanha): SUBSTITUI qualquer cutscene no ar
  // (mundo > evento — o marco é mais raro e mais importante).
  function mundo(de, para) {
    atual = { tipo: 'mundo', de: de, para: para };
  }

  // Evento aleatório: teto 1 — se já há cutscene no ar, não interrompe
  // (nem reinicia timer). Silenciado na simulação de ausência.
  function evento(chave) {
    if (mudo || atual) return;
    if (!EVENTOS[chave]) return;
    atual = { tipo: 'evento', chave: chave, t: AUTO_EVENTO };
  }

  function fecha() { atual = null; }
  function ativa() { return atual !== null; }
  function silenciar(v) { mudo = !!v; }

  // auto-dismiss só dos eventos (fronteira espera o jogador)
  function update(dt) {
    if (!atual || atual.tipo !== 'evento') return;
    atual.t -= dt;
    if (atual.t <= 0) atual = null;
  }

  // retângulo do botão do overlay (fonte única: desenhar + testes)
  function botao() {
    if (atual && atual.tipo === 'evento') {
      var px = Math.round((Game.W - EV_PW) / 2);
      var py = Math.round((432 - EV_PH) / 2);
      return { x: px + EV_PW / 2 - 90, y: py + 152, w: 180, h: 36 };
    }
    var mx = Math.round((Game.W - MUNDO_PW) / 2);
    return { x: mx + MUNDO_PW / 2 - 130, y: MUNDO_PY + 240, w: 260, h: 36 };
  }

  // sonda p/ testes (seção 42)
  function info() {
    if (!atual) return null;
    return {
      tipo: atual.tipo,
      de: atual.de, para: atual.para,           // undefined nos eventos
      chave: atual.chave,                       // undefined nas fronteiras
      restante: atual.tipo === 'evento'
        ? Math.round(atual.t * 100) / 100 : null,
      mudo: mudo,
      botao: botao()
    };
  }

  // --------------------------------------------------------------- mapa

  // Fileira dos 10 mundos: nó = retângulo com a cor do tema do mundo
  // (Mapas.LISTA) + número; estados por BORDA (verde conquistado, dourada
  // atual, apagado trancado). Só fillRect/strokeRect — primitivas que o
  // rasterizador de testes entende.
  function mapaUniverso(ctx, x, y, larg, atualMundo) {
    var n = 10, gap = 14;
    var nw = Math.round((larg - (n - 1) * gap) / n);
    var nh = nw;
    var i, nx, tema, est;
    // ligações primeiro (os nós cobrem as pontas)
    for (i = 0; i < n - 1; i++) {
      nx = x + i * (nw + gap) + nw;
      ctx.fillStyle = (i + 2 <= atualMundo) ? '#6a8a5a' : '#2a2340';
      ctx.fillRect(nx, y + Math.round(nh / 2) - 1, gap, 2);
    }
    for (i = 0; i < n; i++) {
      nx = x + i * (nw + gap);
      tema = Mapas.LISTA[i];
      est = (i + 1 < atualMundo) ? 'conquistado'
        : (i + 1 === atualMundo) ? 'atual' : 'trancado';
      if (est === 'trancado') ctx.globalAlpha = 0.3;
      ctx.fillStyle = tema.chao.base;
      ctx.fillRect(nx, y, nw, nh);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = est === 'conquistado' ? '#8ce08c'
        : est === 'atual' ? '#e8c86a' : '#3a3450';
      ctx.lineWidth = est === 'atual' ? 2 : 1;
      ctx.strokeRect(nx + 0.5, y + 0.5, nw - 1, nh - 1);
      UI.text(String(i + 1), nx + nw / 2, y + nh / 2 + 1, {
        align: 'center',
        color: est === 'trancado' ? '#6f678a'
          : est === 'atual' ? '#ffd866' : '#f2eef8',
        font: 'bold 14px monospace'
      });
    }
    ctx.lineWidth = 1;
  }

  // legenda dos estados (cores batem com as bordas do mapa)
  function legenda(ctx, x, y) {
    ctx.fillStyle = '#8ce08c';
    ctx.fillRect(x, y - 6, 10, 10);
    UI.text('conquistado', x + 14, y,
      { color: '#9a90b8', font: '12px monospace' });
    ctx.fillStyle = '#e8c86a';
    ctx.fillRect(x + 96, y - 6, 10, 10);
    UI.text('atual', x + 110, y,
      { color: '#9a90b8', font: '12px monospace' });
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#5a7a9a';
    ctx.fillRect(x + 160, y - 6, 10, 10);
    ctx.globalAlpha = 1;
    UI.text('trancado', x + 174, y,
      { color: '#9a90b8', font: '12px monospace' });
  }

  // ------------------------------------------------------------ overlays

  function desenhaMundo(ctx, W) {
    var para = atual.para;
    var tema = Mapas.LISTA[para - 1];
    var pw = MUNDO_PW, ph = MUNDO_PH;
    var px = Math.round((W - pw) / 2), py = MUNDO_PY;
    UI.panel(px, py, pw, ph, 'MUNDO ' + para + ' — ' + tema.nome);
    mapaUniverso(ctx, px + 28, py + 40, pw - 56, para);
    legenda(ctx, px + 28, py + 100);
    var linhas = FRONTEIRAS[para] || [];
    UI.text(linhas[0] || '', px + pw / 2, py + 136, {
      align: 'center', color: '#c9c2dd', font: '15px monospace'
    });
    UI.text(linhas[1] || '', px + pw / 2, py + 160, {
      align: 'center', color: '#c9c2dd', font: '15px monospace'
    });
    UI.text('Chefe: ' + tema.boss.nome, px + pw / 2, py + 196, {
      align: 'center', color: tema.boss.cor, font: 'bold 15px monospace'
    });
    var b = botao();
    if (UI.button(b.x, b.y, b.w, b.h, 'Entrar no Mundo ' + para)) fecha();
  }

  function desenhaEvento(ctx, W) {
    var e = EVENTOS[atual.chave];
    var pw = EV_PW, ph = EV_PH;
    var px = Math.round((W - pw) / 2), py = Math.round((432 - ph) / 2);
    UI.panel(px, py, pw, ph, e.titulo);
    // reescreve o título na cor do evento (o painel nasce dourado)
    UI.text(e.titulo, px + 10, py + 15,
      { color: e.cor, font: 'bold 16px monospace' });
    UI.text(e.linhas[0], px + pw / 2, py + 64, {
      align: 'center', color: '#c9c2dd', font: '15px monospace'
    });
    UI.text(e.linhas[1], px + pw / 2, py + 92, {
      align: 'center', color: '#c9c2dd', font: '15px monospace'
    });
    UI.text('some sozinho em instantes — ou clique para seguir',
      px + pw / 2, py + 128,
      { align: 'center', color: '#6f678a', font: '12px monospace' });
    var b = botao();
    if (UI.button(b.x, b.y, b.w, b.h, 'Continuar')) fecha();
  }

  function desenhar(ctx) {
    if (!atual) return;
    var W = Game.W;
    // véu por cima do jogo inteiro (só fillRect — primitiva do
    // rasterizador; mesmo rgba do overlay de vitória)
    ctx.fillStyle = 'rgba(8, 6, 16, 0.84)';
    ctx.fillRect(0, 0, W, 432);
    if (atual.tipo === 'mundo') desenhaMundo(ctx, W);
    else desenhaEvento(ctx, W);
    ctx.globalAlpha = 1;   // deixa o contexto limpo p/ o próximo frame
    ctx.lineWidth = 1;
  }

  // ------------------------------------------------- cena: mapa do universo

  // Tela própria (botão "Universo" na seleção): os 10 mundos com o
  // progresso do SAVE (funciona fora da jogatina —Salvar.lerEstado).
  function renderUniverso(ctx) {
    var W = Game.W;
    UI.fundo(ctx);
    UI.faixaTopo(ctx, 30);
    UI.text('MAPA DO UNIVERSO', 6, 16,
      { color: '#e8c86a', font: 'bold 16px monospace' });

    var p = Game.personagem;
    var est = p ? Salvar.lerEstado(p.id) : null;
    var mapa = est && est.mapa >= 1 ? Math.floor(est.mapa) : 1;
    var fim = Batalha.fimCampanha();
    var mundoAtual = Mapas.mundo(mapa);
    var tema = Mapas.info(mapa);          // cicla no infinito (fonte única)
    var infinito = mapa > fim;

    UI.text(infinito ? 'modo infinito · mapa ' + mapa
      : 'campanha · mapa ' + mapa + ' de ' + fim,
      W - 12, 16, { align: 'right', color: '#9a90b8' });

    var larg = Math.min(W - 64, 700);
    var x0 = Math.round((W - larg) / 2);
    mapaUniverso(ctx, x0, 52, larg, mundoAtual);
    legenda(ctx, x0, 132);

    var py = 160, ph = 128;
    UI.panel(x0, py, larg, ph, 'MUNDO ' + mundoAtual + ' — ' + tema.nome);
    UI.text('Chefe: ' + tema.boss.nome, x0 + 16, py + 52,
      { color: tema.boss.cor, font: 'bold 15px monospace' });
    UI.text('Dentro do mundo: mapa ' + Mapas.noMundo(mapa) + ' de 10',
      x0 + 16, py + 80, { color: '#c9c2dd' });
    UI.text(infinito
      ? 'Campanha vencida — os mundos voltam a girar.'
      : 'Progresso: ' + (mapa - 1) + ' de ' + fim + ' mapas vencidos',
      x0 + 16, py + 104, { color: '#9a90b8' });

    if (UI.button(Math.round(W / 2) - 70, 340, 140, 36, 'Voltar')) {
      Game.setScene('selecao');
    }
  }

  var Universo = {
    enter: function () {},
    update: function () {
      if (Input.pressed('Enter')) Game.setScene('selecao');
    },
    render: function (ctx) { renderUniverso(ctx); }
  };

  return {
    mundo: mundo,
    evento: evento,
    update: update,
    ativa: ativa,
    fecha: fecha,
    silenciar: silenciar,
    desenhar: desenhar,
    info: info,
    universo: Universo
  };
})();
