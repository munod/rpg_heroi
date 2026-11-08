// Gravação compartilhada pelas telas: toast, autosave e save do personagem.
// Instância única: o enter de cada tela zera o estado via entrar().
var Gravacao = (function () {
  var toast = null;        // { txt, t }
  var saveT = 0;           // cronômetro do autosave
  var ultimoJson = '';     // última cópia gravada (detecta mudança)
  var INTERVALO = 3;       // autosave a cada 3s

  // Marca a cópia atual como gravada (chamar após qualquer gravação ou
  // troca de personagem em foco, senão o autosave regrava à toa).
  function sincronizar(p) {
    ultimoJson = p ? JSON.stringify(p) : '';
  }

  // Zera toast/autosave e sincroniza o personagem em foco.
  function entrar(p) {
    toast = null;
    saveT = 0;
    sincronizar(p);
  }

  function msg(txt) {
    toast = { txt: txt, t: 3 };
  }

  // Grava o personagem (aviso de sucesso opcional); erro sempre avisa.
  function salvarPersonagem(p, comAviso) {
    if (!p) return false;
    if (!p.nome.trim()) p.nome = 'Herói';
    try {
      if (!Salvar.salvar(p)) {
        msg('Sem espaço no navegador para salvar.');
        return false;
      }
      sincronizar(p);
      if (comAviso) msg('Personagem salvo!');
      return true;
    } catch (e) {
      msg('Erro ao salvar: ' + e.message);
      return false;
    }
  }

  // Consome tempo do toast e do autosave (a cada 3s, só se mudou).
  // gravar é opcional: sem ele, grava só o personagem (seleção);
  // a jogatina passa salvarTudo para gravar também o estado da batalha.
  function update(dt, p, gravar) {
    if (toast) {
      toast.t -= dt;
      if (toast.t <= 0) toast = null;
    }
    saveT += dt;
    if (saveT < INTERVALO) return;
    saveT = 0;
    if (p && JSON.stringify(p) !== ultimoJson) {
      if (gravar) gravar();
      else salvarPersonagem(p, false);
    }
  }

  // Mensagem (ou dica padrão) na base da tela.
  function desenharAviso(ctx, dica) {
    var txt = toast ? toast.txt : dica;
    if (!txt) return;
    // mini-painel atrás do aviso: 16px monospace ≈ 9.6px por caractere
    var cx = Math.round(Game.W / 2);   // centrado na largura dinâmica
    var larg = Math.min(Game.W - 8, Math.ceil(txt.length * 9.6) + 28);
    var x = Math.round(cx - larg / 2);
    ctx.fillStyle = 'rgba(16, 12, 24, 0.94)';
    ctx.fillRect(x, 405, larg, 26);
    ctx.strokeStyle = toast ? '#4c8a5a' : '#5a4f78';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, 405.5, larg - 1, 25);
    UI.text(txt, cx, 418, {
      align: 'center', color: toast ? '#8ce08c' : '#9a90b8'
    });
  }

  return {
    entrar: entrar,
    msg: msg,
    salvarPersonagem: salvarPersonagem,
    update: update,
    desenharAviso: desenharAviso,
    sincronizar: sincronizar
  };
})();
