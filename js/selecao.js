// Tela de criação e seleção de personagem — separada da jogatina.
// Aqui você cria/ajusta um herói e só então entra na arena (botão JOGAR);
// não há batalha rodando nesta tela.
var Selecao = (function () {
  var pagina = 0;          // página da lista de heróis
  var apagando = null;     // { id, t } — apagar em duas etapas
  var blinkT = 0;
  var POR_PAGINA = 5;

  function enter() {
    pagina = 0;
    apagando = null;
    // foca o último herói usado (ou o que já está em memória / um novo)
    var p = Salvar.ultimo() || Game.personagem || Personagem.novo();
    Game.personagem = p;
    Gravacao.entrar(p);
  }

  function focar(p) {
    Gravacao.salvarPersonagem(Game.personagem, false);  // não perde a edição
    Game.personagem = p;
    apagando = null;
    Gravacao.sincronizar(p);
  }

  function novoPersonagem() {
    Gravacao.salvarPersonagem(Game.personagem, false);
    var p = Personagem.novo();
    Game.personagem = p;
    Gravacao.salvarPersonagem(p, false);   // já entra na lista
    apagando = null;
    pagina = 0;
    Gravacao.sincronizar(p);
    Gravacao.msg('Novo herói criado — dê um nome a ele!');
  }

  function importar() {
    Salvar.importarArquivo(function (err, personagem) {
      if (err) {
        Gravacao.msg('Erro: ' + err.message);
        return;
      }
      Gravacao.salvarPersonagem(Game.personagem, false);
      Game.personagem = personagem;
      apagando = null;
      pagina = 0;
      if (Gravacao.salvarPersonagem(personagem, false)) {
        Gravacao.msg('"' + personagem.nome + '" importado!');
      }
      Gravacao.sincronizar(personagem);
    });
  }

  function excluir(id) {
    Salvar.apagar(id);
    apagando = null;
    var lista = Salvar.listar();
    if (Game.personagem && Game.personagem.id === id) {
      if (lista.length) {
        Game.personagem = lista[0];
        Gravacao.msg('Personagem apagado.');
      } else {
        var p = Personagem.novo();
        Game.personagem = p;
        Gravacao.salvarPersonagem(p, false);
        Gravacao.msg('Apagado — criei um novo herói.');
      }
    } else {
      Gravacao.msg('Personagem apagado.');
    }
    var paginas = Math.max(1, Math.ceil(Salvar.listar().length / POR_PAGINA));
    if (pagina > paginas - 1) pagina = paginas - 1;
    Gravacao.sincronizar(Game.personagem);
  }

  // Entra na jogatina com o herói em foco.
  function jogar() {
    var p = Game.personagem;
    if (!p) return;
    Gravacao.salvarPersonagem(p, false);
    Game.setScene('jogo');
  }

  // -------------------------------------------------------------- update
  function update(dt) {
    blinkT += dt;

    if (apagando) {
      apagando.t -= dt;
      if (apagando.t <= 0) apagando = null;
    }

    // toast + autosave (só o personagem; sem estado de batalha aqui)
    Gravacao.update(dt, Game.personagem);

    // painel: clique/segurar nos +/− de atributos
    Gestao.update(dt, Game.personagem);

    // digitar o nome do herói em foco (qualquer tecla)
    var p = Game.personagem;
    if (p) {
      if (Input.pressed('Backspace')) p.nome = p.nome.slice(0, -1);
      for (var i = 0; i < Input.typed.length; i++) {
        var ch = Input.typed[i];
        if (!/[A-Za-zÀ-ÿ0-9 \-]/.test(ch)) continue;
        if (p.nome === 'Herói') p.nome = '';   // primeira tecla substitui o padrão
        if (p.nome.length < 14) p.nome += ch;  // mesmo teto do normalizar
      }
    }

    if (Input.pressed('Enter')) jogar();
  }

  // -------------------------------------------------------------- render
  function render(ctx) {
    var p = Game.personagem;

    ctx.fillStyle = '#141020';
    ctx.fillRect(0, 0, 384, 216);

    // ---------------- cabeçalho: título + nome digitável
    ctx.fillStyle = '#191326';
    ctx.fillRect(0, 0, 384, 15);
    UI.text('RPG HERÓI', 6, 8, { color: '#e8c86a', font: 'bold 8px monospace' });
    UI.text('crie ou escolha um herói', 76, 8, { color: '#9a90b8' });
    var cursor = Math.floor(blinkT * 2) % 2 === 0 ? '_' : ' ';
    UI.text('Nome: ' + (p ? p.nome : '') + cursor, 378, 8, {
      align: 'right', color: '#f2eef8'
    });

    // ---------------- lista de heróis (esquerda)
    UI.panel(4, 18, 196, 150, 'HERÓIS');
    desenhaLista(ctx);

    // ---------------- gestão do herói em foco (direita)
    Gestao.desenhar(ctx, p, { criacao: true });

    desenhaRodape(ctx, p);

    Gravacao.desenharAviso(ctx,
      'Ajuste o herói e clique em JOGAR — Enter também entra');
  }

  function desenhaLista(ctx) {
    var lista = Salvar.listar();
    var foco = Game.personagem;

    if (!lista.length) {
      UI.text('Nenhum herói salvo.', 102, 70, {
        align: 'center', color: '#9a90b8'
      });
      UI.text('Clique em "Novo" para criar.', 102, 84, {
        align: 'center', color: '#6f678a'
      });
    }

    // navegação por página
    var paginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
    if (pagina > paginas - 1) pagina = paginas - 1;
    if (paginas > 1) {
      if (UI.button(148, 34, 12, 12, '<', { disabled: pagina === 0 })) {
        pagina--;
      }
      UI.text((pagina + 1) + '/' + paginas, 171, 40,
        { align: 'center', color: '#c9c2dd' });
      if (UI.button(184, 34, 12, 12, '>', { disabled: pagina >= paginas - 1 })) {
        pagina++;
      }
    }

    lista.slice(pagina * POR_PAGINA, pagina * POR_PAGINA + POR_PAGINA)
      .forEach(function (item, i) {
        var y = 56 + i * 16;
        var sel = !!(foco && foco.id === item.id);
        var cl = Personagem.CLASSES[item.classe];
        var rotulo = item.nome + '  Nv' + item.nivel + ' · ' + (cl ? cl.nome : '?');
        if (UI.button(8, y - 8, 184, 16, rotulo, {
          ativo: sel, align: 'left',
          color: sel ? '#e8c86a' : undefined
        })) {
          focar(item);
        }
      });

    UI.text(lista.length + (lista.length === 1 ? ' salvo' : ' salvos'),
      12, 158, { color: '#6f678a' });

    if (UI.button(8, 136, 54, 16, 'Novo')) novoPersonagem();

    var marcado = !!(apagando && foco && apagando.id === foco.id);
    if (UI.button(66, 136, 60, 16, marcado ? 'Sim?' : 'Apagar', {
      disabled: !foco,
      color: marcado ? '#ff6b6b' : undefined
    })) {
      if (!marcado) {
        apagando = { id: foco.id, t: 4 };
        Gravacao.msg('Clique em "Sim?" para confirmar a exclusão.');
      } else {
        excluir(foco.id);
      }
    }

    if (UI.button(130, 136, 54, 16, 'Exp.', { disabled: !foco })) {
      Salvar.exportar(foco);
      Gravacao.msg('Arquivo .json exportado!');
    }
  }

  function desenhaRodape(ctx, p) {
    if (!p) return;
    UI.linhaStatus(Personagem.status(p));

    if (UI.button(4, 186, 110, 16, 'JOGAR', {
      color: '#8ce08c', font: 'bold 8px monospace'
    })) jogar();
    if (UI.button(120, 186, 66, 16, 'Importar')) importar();
    if (UI.button(192, 186, 66, 16, 'Exportar')) {
      Salvar.exportar(p);
      Gravacao.msg('Arquivo .json exportado!');
    }
    if (UI.button(264, 186, 116, 16, 'Salvar')) {
      Gravacao.salvarPersonagem(p, true);
    }
  }

  return { enter: enter, update: update, render: render };
})();
