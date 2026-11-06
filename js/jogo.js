// Tela de jogo (modo idle): arena automática à esquerda, gestão (atributos,
// aparência, classe) à direita, progressão no cabeçalho e botões embaixo.
// A criação/seleção de personagem vive em outra tela (Selecao): daqui só
// se troca de herói saindo explicitamente para a tela de seleção.
var Jogo = (function () {
  var toast = null;        // { txt, t }
  var blinkT = 0;
  var saveT = 0;           // cronômetro do autosave
  var ultimoJson = '';     // última cópia gravada (detecta mudança)
  var eventosLigados = false;

  // Ausência: o rAF não roda com a aba oculta, então o tempo longe do jogo
  // é creditado de volta simulando a batalha no mesmo ritmo de sempre.
  var AUSENCIA_MIN = 30;     // menos que isso é refresh, não ausência
  var AUSENCIA_MAX = 3600;   // teto de 1h por ausência
  var PASSO = 0.1;           // dt da simulação offline

  function enter() {
    toast = null;
    Batalha.iniciar();
    ligarEventos();
    ultimoJson = JSON.stringify(Game.personagem);
    var ausente = voltaAusencia(true);
    if (ausente) msg(ausente);
  }

  // Salva ao fechar/ocultar a aba e credit a ausência ao voltar.
  function ligarEventos() {
    if (eventosLigados) return;
    eventosLigados = true;
    window.addEventListener('beforeunload', function () { salvarTudo(); });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) salvarTudo();
      else voltaAusencia(false);
    });
  }

  function msg(txt) {
    toast = { txt: txt, t: 3 };
  }

  function salvar() {
    var p = Game.personagem;
    if (!p.nome.trim()) p.nome = 'Herói';
    try {
      if (Salvar.salvar(p)) msg('Personagem salvo!');
      else msg('Sem espaço no navegador para salvar.');
    } catch (e) {
      msg('Erro ao salvar: ' + e.message);
    }
  }

  // Grava personagem + estado da batalha sem exibir nada (autosave/unload).
  function salvarTudo() {
    var p = Game.personagem;
    if (!p) return false;
    try {
      var paraGravar = p;
      if (!p.nome.trim()) {
        // nome em branco: grava com o padrão sem pisar no que está digitando
        paraGravar = {};
        for (var k in p) {
          if (Object.prototype.hasOwnProperty.call(p, k)) paraGravar[k] = p[k];
        }
        paraGravar.nome = 'Herói';
      }
      if (!Salvar.salvar(paraGravar)) return false;
      Salvar.salvarEstado(p.id, Batalha.info().onda, Date.now(),
        Batalha.info().pausada);
      ultimoJson = JSON.stringify(p);
      return true;
    } catch (e) {
      return false;
    }
  }

  // Autosave a cada 3s, só quando o personagem mudou.
  function atualizaAutosave(dt) {
    saveT += dt;
    if (saveT < 3) return;
    saveT = 0;
    if (JSON.stringify(Game.personagem) !== ultimoJson) salvarTudo();
  }

  // Credit o tempo em que o jogo esteve fechado/aba oculta.
  // RestauraTudo = true quando a batalha acabou de ser criada (boot/Usar).
  // Devolve a mensagem da ausência (ou null) pra quem chamar decidir o toast.
  function voltaAusencia(restauraTudo) {
    var p = Game.personagem;
    if (!p) return null;
    var est = Salvar.lerEstado(p.id);
    if (!est) return null;

    if (restauraTudo) {
      Batalha.restaurarOnda(est.onda);
      if (est.pausada) Batalha.alternarPausa();
    }
    // pausado não acumula crédito: o tempo é do jogador decidir
    if (Batalha.info().pausada) { salvarTudo(); return null; }

    var seg = (Date.now() - est.ts) / 1000;
    if (!(seg > AUSENCIA_MIN)) return null;   // refresh rápido: sem crédito

    var nivel0 = p.nivel;
    var simulados = Math.min(seg, AUSENCIA_MAX);
    var passos = Math.floor(simulados / PASSO);
    for (var i = 0; i < passos; i++) Batalha.atualizar(PASSO);
    Batalha.limparEfeitos();

    var mins = Math.round(simulados / 60);
    var tempo = mins >= 60
      ? Math.floor(mins / 60) + 'h' + (mins % 60) + 'min'
      : mins + 'min';
    var nvs = p.nivel - nivel0;
    salvarTudo();
    return 'Você ficou ' + tempo + ' fora · ' +
      (nvs > 0 ? '+' + nvs + ' nível(is)!' : 'a batalha continuou');
  }

  function importar() {
    Salvar.importarArquivo(function (err, personagem) {
      if (err) {
        msg('Erro: ' + err.message);
        return;
      }
      Game.personagem = personagem;
      Batalha.reiniciar();
      salvarTudo();
      msg('"' + personagem.nome + '" importado!');
    });
  }

  // -------------------------------------------------------------- update
  function update(dt) {
    if (toast) {
      toast.t -= dt;
      if (toast.t <= 0) toast = null;
    }
    blinkT += dt;

    // A batalha roda sempre (idle).
    Batalha.atualizar(dt);

    // o progresso nunca depende do Enter
    atualizaAutosave(dt);

    if (Input.pressed('Enter')) salvar();
  }

  // -------------------------------------------------------------- render
  function render(ctx) {
    desenhaFundo(ctx);

    if (toast) {
      UI.text(toast.txt, 192, 206, { align: 'center', color: '#8ce08c' });
    }
  }

  function desenhaFundo(ctx) {
    var p = Game.personagem;

    ctx.fillStyle = '#141020';
    ctx.fillRect(0, 0, 384, 216);

    // ---------------- cabeçalho: nível, XP e pontos
    ctx.fillStyle = '#191326';
    ctx.fillRect(0, 0, 384, 15);
    UI.text('HERÓI IDLE', 6, 8, { color: '#e8c86a', font: 'bold 8px monospace' });
    UI.text('Nv ' + p.nivel, 76, 8, { color: '#f2eef8' });
    UI.bar(108, 5, 84, 7, p.xp / p.xpProx, '#e8c86a');
    UI.text(p.xp + '/' + p.xpProx, 198, 8, { color: '#c9c2dd' });
    UI.text('Pontos: ' + p.pontos, 378, 8, {
      align: 'right',
      color: p.pontos > 0 ? '#8ce08c' : '#9a90b8'
    });

    // ---------------- arena automática (esquerda)
    var cursor = Math.floor(blinkT * 2) % 2 === 0 ? '_' : ' ';
    UI.panel(4, 18, 196, 150, p.nome + cursor + ' — AUTO');
    Batalha.desenhar(ctx, 6, 32, 192, 134);

    // ---------------- gestão (direita)
    Gestao.desenhar(ctx, p);

    desenhaRodape(ctx, p);
  }

  function desenhaRodape(ctx, p) {
    var s = Personagem.status(p);

    // status derivado
    UI.text(
      'HP ' + s.hpMax + '  ·  Dano ' + s.dano + '  ·  Vel ' + s.vel +
      '  ·  Crítico ' + s.crit + '%  ·  Alcance ' + s.alcance +
      '  ·  ' + s.arma,
      192, 176, { align: 'center', color: '#c9c2dd' }
    );

    if (UI.button(4, 186, 64, 16, 'Salvar')) salvar();
    if (UI.button(72, 186, 92, 16, 'Trocar herói')) {
      // a troca acontece fora da jogatina: salva e sai para a seleção
      salvarTudo();
      Game.setScene('selecao');
    }
    if (UI.button(170, 186, 56, 16, 'Exportar')) {
      Salvar.exportar(p);
      msg('Arquivo .json exportado!');
    }
    if (UI.button(232, 186, 56, 16, 'Importar')) importar();
    if (UI.button(294, 186, 56, 16,
      Batalha.info().pausada ? 'Continuar' : 'Pausar')) {
      var pausou = Batalha.alternarPausa();
      msg(pausou ? 'Batalha pausada.' : 'Batalha retomada!');
    }

    if (!toast) {
      UI.text('Combate 100% automático — gerencie seus atributos',
        192, 206, { align: 'center', color: '#6f678a' });
    }
  }

  return { enter: enter, update: update, render: render };
})();
