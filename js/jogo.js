// Tela de jogo (modo idle): mundo full screen ao fundo (k=1, spec
// mundo-fullscreen — sem zoom, HUD sobre o mundo), gestão (atributos,
// aparência, classe) à direita, progressão no cabeçalho e botões embaixo.
// A criação/seleção de personagem vive em outra tela (Selecao): daqui só
// se troca de herói saindo explicitamente para a tela de seleção.
var Jogo = (function () {
  var blinkT = 0;
  var eventosLigados = false;
  var opAberta = false;      // overlay de opções (spec opcoes R-OP-3)
  var opAbriuAgora = false;  // mesma-frame do clique que abriu: sem
                              // close-instântaneo por clique "fora"

  // Ausência: o rAF não roda com a aba oculta, então o tempo longe do jogo
  // é creditado de volta simulando a batalha no mesmo ritmo de sempre.
  var AUSENCIA_MIN = 30;     // menos que isso é refresh, não ausência
  var AUSENCIA_MAX = 3600;   // teto de 1h por ausência
  var PASSO = 0.1;           // dt da simulação offline

  function enter() {
    Batalha.iniciar();
    Cutscene.fecha();   // reentrada não herda cutscene de sessão anterior
    opAberta = false;
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
    // eventos NÃO viram cutscene na simulação offline (centenas de ondas
    // disparariam em massa); a de MUNDO continua — é o resumo da ausência
    Cutscene.silenciar(true);
    Efeitos.silenciar(true);   // offline sem spawns decorativos (doc)
    for (var i = 0; i < passos; i++) Batalha.atualizar(PASSO);
    Efeitos.silenciar(false);
    Cutscene.silenciar(false);
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

    // A batalha roda sempre (idle); com contaTempo, o tempo de jogo
    // da aba Stats só corre na jogatina real (não no crédito offline)
    Batalha.atualizar(dt, true);

    // o progresso nunca depende do Enter: toast + autosave
    Gravacao.update(dt, Game.personagem, salvarTudo);

    // cutscene: auto-dismiss dos eventos (a fronteira espera o jogador)
    Cutscene.update(dt);

    // painel: clique/segurar nos +/− de atributos. Com vitória/cutscene/
    // opções no ar, o painel de baixo NÃO recebe clique — os mesmos dois
    // níveis do overlay de vitória (bloqueio no desenho + pulo do update)
    if (!vitPendente() && !Cutscene.ativa() && !opAberta) {
      Gestao.update(dt, Game.personagem);
    }

    // opções: Esc fecha; vitória/cutscene têm prioridade e derrubam o
    // overlay por baixo (ele volta sozinho se reabrir depois)
    if (opAberta) {
      if (Input.pressed('Escape') || vitPendente() || Cutscene.ativa()) {
        opAberta = false;
      }
    }

    // Enter fecha a cutscene (o botão fecha no render); sem cutscene,
    // Enter continua salvando como sempre
    if (Cutscene.ativa() && Input.pressed('Enter')) Cutscene.fecha();
    // SEM botão na cutscene (ajuste do mantenedor — spec
    // cutscene-estetica): clique em QUALQUER ponto ou Espaço avança
    // a narração (3 estágios; o último encerra); Enter fecha direto
    if (Cutscene.ativa() &&
        (Input.mouse.clicked || Input.pressed('Space'))) {
      Cutscene.avancar();
    }

    if (Input.pressed('Enter')) Gravacao.salvarPersonagem(Game.personagem, true);
  }

  // ------------------------------------------------------- vitória
  // Vencer o chefe do mapa 100 (mundo 10) → overlay "CAMPANHA
  // CONCLUÍDA" por cima de tudo até o jogador clicar Continuar (aí
  // p.vitoria = true, normalizar mantém, e o overlay não reabre — nem
  // ao reentrar na cena). Enquanto pendente: UI de baixo bloqueada
  // (UI.bloqueia — botões desenham sem responder) e sem Gestao.update.
  // O modo infinito já começou por baixo (mapa 101+, mundos em loop).
  function vitPendente() {
    var p = Game.personagem;
    // mapa > fim da campanha (fonte única: Batalha.fimCampanha())
    return !!p && !p.vitoria &&
      Batalha.info().mapa > Batalha.fimCampanha();
  }

  function desenhaVitoria(ctx) {
    var p = Game.personagem;
    var W = Game.W;
    var pw = 420, ph = 210;
    var px = Math.round((W - pw) / 2), py = 100;
    // véu por cima do jogo inteiro (só fillRect — primitiva do rasterizador)
    ctx.fillStyle = 'rgba(8, 6, 16, 0.84)';
    ctx.fillRect(0, 0, W, 432);
    UI.panel(px, py, pw, ph, 'CAMPANHA CONCLUÍDA');
    UI.text('Você venceu os 10 mundos!', px + pw / 2, py + 54, {
      align: 'center', color: '#e8c86a', font: 'bold 18px monospace'
    });
    UI.text('O Caos recua — e os mundos voltam a girar.',
      px + pw / 2, py + 82, { align: 'center', color: '#c9c2dd' });
    UI.text('Modo infinito: dificuldade e drops seguem a escala.',
      px + pw / 2, py + 104, { align: 'center', color: '#9a90b8' });
    var s = p.stats;
    UI.text('Nv ' + p.nivel + ' · ' + s.abates + ' abates · ' +
      s.mortes + ' mortes · ' + s.bosses + ' chefes',
      px + pw / 2, py + 134, { align: 'center', color: '#8ce08c' });
    // botão desbloqueia o resto: some com o overlay e grava a flag
    if (UI.button(px + 90, py + ph - 52, 240, 36,
                  'Continuar — modo infinito')) {
      p.vitoria = true;
      salvarTudo();
      Gravacao.msg('Modo infinito liberado — os mundos seguem em loop!');
    }
  }

  // ------------------------------------------------------- opções
  // Overlay de toggles (spec opcoes R-OP-3): painel central com os 4
  // toggles + Fechar. Prioridade de desenho: vitória > cutscene >
  // opções (as duas primeiras derrubam o overlay no update).
  function desenhaOpcoes(ctx) {
    var W = Game.W;
    var pw = 380, ph = 272;
    var px = Math.round((W - pw) / 2), py = 80;
    // véu (mesmo padrão da vitória) — só fillRect
    ctx.fillStyle = 'rgba(8, 6, 16, 0.84)';
    ctx.fillRect(0, 0, W, 432);
    UI.panel(px, py, pw, ph, 'OPÇÕES');
    UI.text('Conforto visual — vale na hora, sem reiniciar.',
      px + pw / 2, py + 40, { align: 'center', color: '#9a90b8', font: '13px monospace' });
    var linhas = [
      ['shake', 'Sacudir a tela'],
      ['flash', 'Flash e vinheta'],
      ['num', 'Números de dano'],
      ['poeira', 'Poeira ambiente']
    ];
    for (var i = 0; i < linhas.length; i++) {
      var chave = linhas[i][0];
      var on = Opcoes.liga(chave);
      if (UI.button(px + 30, py + 52 + i * 42, pw - 60, 36,
                    linhas[i][1] + ' · ' + (on ? 'LIG' : 'DES'),
                    { ativo: on, font: '15px monospace' })) {
        Opcoes.alterna(chave);
      }
    }
    if (UI.button(px + 70, py + ph - 46, pw - 140, 36, 'Fechar')) {
      opAberta = false;
    }
    // clique fora do painel fecha — mas NÃO o clique do frame em que o
    // overlay abriu (senão o botão do cabeçalho fecharia na hora)
    if (!opAbriuAgora && Input.mouse.clicked) {
      var mx = Input.mouse.x, my = Input.mouse.y;
      if (mx < px || mx > px + pw || my < py || my > py + ph) opAberta = false;
    }
    opAbriuAgora = false;
  }

  // -------------------------------------------------------------- render
  function render(ctx) {
    var vit = vitPendente();
    var corte = Cutscene.ativa();
    // bloqueio em 2 níveis (mesmo padrão da vitória): os botões de
    // baixo desenham sem responder enquanto o overlay está no ar
    UI.bloqueia(vit || corte || opAberta);
    desenhaFundo(ctx);
    Gravacao.desenharAviso(ctx,
      'Combate 100% automático — gerencie seus atributos');
    UI.bloqueia(false);
    // prioridade: vitória > cutscene > opções (no 100→101 a cutscene já
    // é cortada em passaMapa; a ordem do desenho deixa a regra explícita)
    if (vit) desenhaVitoria(ctx);   // por cima de tudo, incl. o aviso
    else if (corte) Cutscene.desenhar(ctx);
    else if (opAberta) desenhaOpcoes(ctx);
  }

  function desenhaFundo(ctx) {
    var p = Game.personagem;
    var W = Game.W;           // largura dinâmica (768 em 16:9)

    UI.fundo(ctx);

    // ---------------- mundo full screen (fundo da cena — R-MF-1):
    // k=1, 1 un. de mundo = 1 px, sem zoom e sem distorção; o mundo
    // ocupa o canvas inteiro e os demais elementos flutuam por cima
    Batalha.desenhar(ctx, 0, 0, W, 432);

    // ---------------- cabeçalho: nível, XP (centrado) e pontos (direita)
    UI.faixaTopo(ctx, 30);
    UI.text('HERÓI IDLE', 6, 16, { color: '#e8c86a', font: 'bold 16px monospace' });
    UI.text('Nv ' + p.nivel, 152, 16, { color: '#f2eef8' });
    var cx = Math.round(W / 2);
    var noTeto = p.nivel >= Personagem.NIVEL_MAX;   // barra cheia + MÁXIMO
    UI.bar(cx - 168, 10, 168, 14, noTeto ? 1 : p.xp / p.xpProx, '#e8c86a');
    // XP exponencial: sem abreviação a barra viraria 46 dígitos
    UI.text(noTeto ? 'MÁXIMO'
      : (UI.abrev(p.xp) + '/' + UI.abrev(p.xpProx)), cx + 12, 16,
      { color: noTeto ? '#e8c86a' : '#c9c2dd' });
    UI.text('Pontos: ' + p.pontos, W - 12, 16, {
      align: 'right',
      color: p.pontos > 0 ? '#8ce08c' : '#9a90b8'
    });
    // opções (spec opcoes R-OP-3): toggle de conforto visual — vive no
    // cabeçalho p/ não mexer na grade de abas da Gestão (contrato)
    if (UI.button(W - 216, 3, 64, 24, 'Opções', { font: '13px monospace' })) {
      opAberta = true;
      opAbriuAgora = true;
    }

    // ---------------- título do herói/mapa (canto sup. esquerdo, sob o
    // cabeçalho — era a faixa de título do painel da arena, que saiu;
    // sombra p/ legibilidade sobre o terreno)
    var cursor = Math.floor(blinkT * 2) % 2 === 0 ? '_' : ' ';
    UI.text(p.nome + cursor + ' — MAPA ' + Batalha.info().mapa,
      8, 46, {
        color: '#e8c86a', font: 'bold 16px monospace', sombra: true
      });

    // ---------------- gestão (direita)
    Gestao.desenhar(ctx, p);

    desenhaRodape(ctx, p);
    UI.desenhaTooltip();   // por cima de tudo, sem hit-test
  }

  function desenhaRodape(ctx, p) {
    var W = Game.W;           // âncoras: esquerda fixa, direita em W-k
    UI.linhaStatus(Personagem.status(p), p);

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
