// Tela de jogo (modo idle): arena automática à esquerda, gestão (atributos,
// aparência, classe) à direita, progressão no cabeçalho e botões embaixo.
// A criação/seleção de personagem vive em outra tela (Selecao): daqui só
// se troca de herói saindo explicitamente para a tela de seleção.
var Jogo = (function () {
  var blinkT = 0;
  var eventosLigados = false;

  // Ausência: o rAF não roda com a aba oculta, então o tempo longe do jogo
  // é creditado de volta simulando a batalha no mesmo ritmo de sempre.
  var AUSENCIA_MIN = 30;     // menos que isso é refresh, não ausência
  var AUSENCIA_MAX = 3600;   // teto de 1h por ausência
  var PASSO = 0.1;           // dt da simulação offline

  function enter() {
    Batalha.iniciar();
    ligarEventos();
    Gravacao.entrar(Game.personagem);
    var ausente = voltaAusencia(true);
    if (ausente) Gravacao.msg(ausente);
  }

  // Salva ao fechar/ocultar a aba e credit a ausência ao voltar.
  function ligarEventos() {
    if (eventosLigados) return;
    eventosLigados = true;
    window.addEventListener('beforeunload', function () { salvarTudo(); });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) salvarTudo();
      // fora da jogatina a batalha não roda: sem simulação de ausência
      // (o estado em memória também pode nem ser do personagem em foco)
      else if (Game.cena === 'jogo') voltaAusencia(false);
    });
  }

  // Grava personagem + estado da batalha sem exibir nada (autosave/unload).
  // O estado é sempre do DONO da batalha em memória (Batalha.dono()): na
  // seleção o personagem em foco pode ser outro herói, e gravar a onda
  // dele sob o id errado corromperia o save (bug de contaminação).
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
      var dono = Batalha.dono();
      if (dono) {
        var inf = Batalha.info();
        Salvar.salvarEstado(dono, inf.onda, Date.now(), inf.pausada, inf.mapa);
      }
      Gravacao.sincronizar(p);
      return true;
    } catch (e) {
      return false;
    }
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
      Batalha.restaurarMapa(est.mapa);
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
        Gravacao.msg('Erro: ' + err.message);
        return;
      }
      Game.personagem = personagem;
      Batalha.reiniciar();
      salvarTudo();
      Gravacao.msg('"' + personagem.nome + '" importado!');
    });
  }

  // -------------------------------------------------------------- update
  function update(dt) {
    blinkT += dt;

    // A batalha roda sempre (idle).
    Batalha.atualizar(dt);

    // o progresso nunca depende do Enter: toast + autosave
    Gravacao.update(dt, Game.personagem, salvarTudo);

    // painel: clique/segurar nos +/− de atributos
    Gestao.update(dt, Game.personagem);

    if (Input.pressed('Enter')) Gravacao.salvarPersonagem(Game.personagem, true);
  }

  // -------------------------------------------------------------- render
  function render(ctx) {
    desenhaFundo(ctx);
    Gravacao.desenharAviso(ctx,
      'Combate 100% automático — gerencie seus atributos');
  }

  function desenhaFundo(ctx) {
    var p = Game.personagem;
    var W = Game.W;           // largura dinâmica (768 em 16:9)

    ctx.fillStyle = '#141020';
    ctx.fillRect(0, 0, W, 432);

    // ---------------- cabeçalho: nível, XP (centrado) e pontos (direita)
    ctx.fillStyle = '#191326';
    ctx.fillRect(0, 0, W, 30);
    UI.text('HERÓI IDLE', 6, 16, { color: '#e8c86a', font: 'bold 16px monospace' });
    UI.text('Nv ' + p.nivel, 152, 16, { color: '#f2eef8' });
    var cx = Math.round(W / 2);
    UI.bar(cx - 168, 10, 168, 14, p.xp / p.xpProx, '#e8c86a');
    UI.text(p.xp + '/' + p.xpProx, cx + 12, 16, { color: '#c9c2dd' });
    UI.text('Pontos: ' + p.pontos, W - 12, 16, {
      align: 'right',
      color: p.pontos > 0 ? '#8ce08c' : '#9a90b8'
    });

    // ---------------- arena automática (esquerda)
    var cursor = Math.floor(blinkT * 2) % 2 === 0 ? '_' : ' ';
    UI.panel(8, 36, 392, 300, p.nome + cursor + ' — MAPA ' +
      Batalha.info().mapa);
    Batalha.desenhar(ctx, 12, 64, 384, 268);

    // ---------------- gestão (direita)
    Gestao.desenhar(ctx, p);

    desenhaRodape(ctx, p);
  }

  function desenhaRodape(ctx, p) {
    var W = Game.W;           // âncoras: esquerda fixa, direita em W-k
    UI.linhaStatus(Personagem.status(p));

    if (UI.button(8, 372, 128, 32, 'Salvar')) {
      Gravacao.salvarPersonagem(Game.personagem, true);
    }
    if (UI.button(144, 372, 184, 32, 'Trocar herói')) {
      // a troca acontece fora da jogatina: salva e sai para a seleção
      salvarTudo();
      Game.setScene('selecao');
    }
    if (UI.button(W - 428, 372, 112, 32, 'Exportar')) {
      Salvar.exportar(p);
      Gravacao.msg('Arquivo .json exportado!');
    }
    if (UI.button(W - 304, 372, 112, 32, 'Importar')) importar();
    if (UI.button(W - 180, 372, 112, 32,
      Batalha.info().pausada ? 'Continuar' : 'Pausar')) {
      var pausou = Batalha.alternarPausa();
      Gravacao.msg(pausou ? 'Batalha pausada.' : 'Batalha retomada!');
    }
  }

  return { enter: enter, update: update, render: render };
})();
