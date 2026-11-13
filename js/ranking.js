// Ranking global (Firebase/Firestore) — spec .specs/features/ranking.
// Camada 100% OPCIONAL: sem RankingConfig.ativo ou sem rede/SDK, tudo
// degrada (cena mostra "não configurado", submete/top viram no-op) e o
// jogo nunca bloqueia em rede. O SDK só é puxado (lazy-load por
// <script> injetado) quando a cena abre pela primeira vez.
//
// Identidade: apelido livre (1-20 chars, gravado em rpg_rank_nick_v1).
// Doc ID = slug do apelido; só a MELHOR marca persiste — o cliente só
// envia quando o score sobe e as regras do servidor rejeitam score
// menor (update exige score > anterior).
var Ranking = (function () {
  var NICK_K = 'rpg_rank_nick_v1';    // apelido lembrado (chave versionada)
  var CACHE_K = 'rpg_rank_cache_v1';  // último top-10 (leitura sem rede)
  var ULT_K = 'rpg_rank_ultimo_v1';   // meu melhor envio (doc completo)
  var COLECAO = 'rank';
  var SDK = [
    'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js'
  ];

  var db = null;             // Firestore inicializado (só depois do SDK)
  var injetando = false;     // lazy-load em curso
  var pendentes = [];        // callbacks aguardando o SDK
  var estado = 'desativado'; // desativado | carregando | ok | erro
  var lista = [];            // último top-10 em memória
  var deCache = false;       // a lista atual veio do cache local
  var enviado = null;        // último doc aceito (teste/depuração)
  var ultimoEnvio = null;    // {ok, motivo, quando, score, detalhe}
  var dicaNick = false;      // dica "defina apelido" já mostrada (sessão)
  var dicaFile = false;      // dica "file://" já mostrada (sessão)

  // Rótulos curtos do status (cena) e textos de toast (jogatina).
  // NUNCA silencioso: todo fim de envio vira um motivo aqui (R-AJ2-2).
  var MOTIVO = {
    'enviado': 'enviado ✓',
    'sem-apelido': 'sem apelido',
    'arquivo-local': 'arquivo local (file://)',
    'nao-melhor': 'sem melhoria',
    'desativado': 'desativado',
    'sdk': 'falha no SDK',
    'regras': 'servidor recusou',
    'rede': 'sem rede',
    'sem-personagem': 'sem personagem'
  };
  var TOAST = {
    'enviado': 'Resultado enviado ao ranking ✓',
    'sem-apelido':
      'Ranking: defina um apelido na tela Ranking para pontuar',
    'arquivo-local':
      'Ranking indisponível em arquivo local (file://) — use o site publicado',
    'sdk': 'Ranking: falha ao carregar o SDK — envio não saiu',
    'regras': 'Ranking: o servidor recusou o envio',
    'rede': 'Ranking: sem rede — envio não saiu'
  };

  function marcaEnvio(ok, motivo, res, detalhe) {
    ultimoEnvio = { ok: ok, motivo: motivo, quando: Date.now(),
                    score: res ? res.score : null,
                    detalhe: detalhe || '' };
  }

  function avisa(motivo) {
    var t = TOAST[motivo];
    if (t && typeof Gravacao !== 'undefined' && Gravacao) Gravacao.msg(t);
  }

  // file:// não tem CORS p/ o Firestore (origem null) — detectado antes
  // de tentar qualquer coisa p/ dar motivo claro em vez de erro de rede
  function eArquivoLocal() {
    return typeof location !== 'undefined' && location &&
      location.protocol === 'file:';
  }

  // ------------------------------------------------------- persistência
  function leChave(k) {
    try { return localStorage.getItem(k); } catch (e) { return null; }
  }
  function gravaChave(k, v) {
    try { localStorage.setItem(k, v); } catch (e) { /* sem espaço: segue */ }
  }
  function leJson(k) {
    var s = leChave(k);
    if (!s) return null;
    try { return JSON.parse(s); } catch (e) { return null; }
  }

  // ------------------------------------------------------- utilitários
  function ativo() {
    return !!(typeof RankingConfig !== 'undefined' && RankingConfig &&
              RankingConfig.ativo);
  }

  function nick() { return leChave(NICK_K) || ''; }
  function setNick(v) {
    gravaChave(NICK_K, String(v == null ? '' : v).slice(0, 20));
  }

  // 'José da Silva' → 'jose-da-silva' (ID do doc no Firestore)
  function slug(n) {
    var s = String(n == null ? '' : n).toLowerCase();
    if (s.normalize) s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return s.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  function nickValido(v) {
    var s = String(v == null ? '' : v).trim();
    return s.length >= 1 && s.length <= 20;
  }

  // score = mapa×100000 + onda×1000 + min(nível,999). Guardas de ordem:
  // onda ∈ [1,100] — (mapa M, onda 100) < (mapa M+1, onda 1) sempre;
  // onda 0 (recém-passou de mapa) conta como 1; o nível nunca empurra
  // a onda (teto 999 < multiplicador 1000).
  function scoreDe(res) {
    var mapa = Math.max(1, Math.floor(res.mapa || 1));
    var onda = Math.min(100, Math.max(1, Math.floor(res.onda || 1)));
    var nivel = Math.min(999, Math.max(0, Math.floor(res.nivel || 0)));
    return mapa * 100000 + onda * 1000 + nivel;
  }

  // Progresso atual (personagem em foco + estado da batalha em memória).
  function resultadoAtual() {
    var p = Game.personagem;
    if (!p) return null;
    var i = (typeof Batalha !== 'undefined' && Batalha) ? Batalha.info() : null;
    var res = {
      nick: nick(),
      mapa: i ? Math.max(1, Math.floor(i.mapa)) : 1,
      onda: i ? Math.min(100, Math.max(1, Math.floor(i.onda))) : 1,
      nivel: Math.max(0, Math.min(999999, Math.floor(p.nivel) || 0)),
      classe: p.classe,
      at: Date.now()
    };
    res.score = scoreDe(res);
    return res;
  }

  function docDe(res) {
    return {
      id: slug(res.nick),
      dados: {
        nick: String(res.nick == null ? '' : res.nick).trim(),
        score: typeof res.score === 'number' ? res.score : scoreDe(res),
        mapa: res.mapa,
        onda: res.onda,
        nivel: res.nivel,
        classe: String(res.classe == null ? '' : res.classe),
        at: res.at
      }
    };
  }

  // ---------------------------------------------------- SDK (lazy-load)
  // Sem SDK: injeta os <script> do CDN em cadeia (app antes do
  // firestore) e só então inicializa. Com SDK já presente (teste com
  // stub): sincrono.
  function carregaSdk(cb) {
    if (typeof firebase !== 'undefined' && firebase.firestore) {
      if (!db) {
        try {
          firebase.initializeApp(RankingConfig.firebase);
          db = firebase.firestore();
        } catch (e) { cb(e); return; }
      }
      cb(null);
      return;
    }
    if (injetando) { pendentes.push(cb); return; }
    injetando = true;
    pendentes.push(cb);
    var i = 0;
    function falha(msg) {
      injetando = false;
      estado = 'erro';
      var fns = pendentes;
      pendentes = [];
      for (var j = 0; j < fns.length; j++) fns[j](new Error(msg));
    }
    function prox() {
      if (i >= SDK.length) {
        if (typeof firebase === 'undefined') { falha('SDK não carregou'); return; }
        injetando = false;
        var fns = pendentes;
        pendentes = [];
        carregaSdk(function (e) {
          for (var j = 0; j < fns.length; j++) fns[j](e);
        });
        return;
      }
      var s = document.createElement('script');
      s.src = SDK[i++];
      s.onload = prox;
      s.onerror = function () { falha('falha ao baixar o SDK'); };
      (document.body || document.documentElement).appendChild(s);
    }
    prox();
  }

  // ----------------------------------------------------------- envio
  // Gatilhos: fecho de mapa (passaMapa) e morte. NUNCA silencioso:
  // marca ultimoEnvio com o motivo e (para falha real / sucesso) avisa
  // no toast da jogatina. false = não enviado; true = mandado ao SDK
  // (a confirmação chega no callback do set).
  function submete() {
    if (!ativo()) { marcaEnvio(false, 'desativado'); return false; }
    var res = resultadoAtual();
    if (!res) { marcaEnvio(false, 'sem-personagem'); return false; }
    if (!nickValido(res.nick)) {
      marcaEnvio(false, 'sem-apelido', res);
      if (!dicaNick) { dicaNick = true; avisa('sem-apelido'); } // 1×/sessão
      return false;
    }
    if (eArquivoLocal()) {
      marcaEnvio(false, 'arquivo-local', res);
      if (!dicaFile) { dicaFile = true; avisa('arquivo-local'); }
      return false;
    }
    var d = docDe(res);
    if (!d.id) {
      // apelido sem caracteres válidos p/ o slug (impossível pela cena,
      // mas defensivo: doc('') lançaria no SDK)
      marcaEnvio(false, 'sem-apelido', res, 'slug vazio');
      if (!dicaNick) { dicaNick = true; avisa('sem-apelido'); }
      return false;
    }
    var ult = leJson(ULT_K);
    if (ult && slug(ult.nick) === d.id && ult.score >= d.dados.score) {
      marcaEnvio(false, 'nao-melhor', res);   // silencioso: não é falha
      return false;
    }
    carregaSdk(function (erro) {
      if (erro) {
        var m0 = eArquivoLocal() ? 'arquivo-local' : 'sdk';
        marcaEnvio(false, m0, res, erro.message);
        avisa(m0);
        return;
      }
      var p = db.collection(COLECAO).doc(d.id).set(d.dados);
      if (p && typeof p.then === 'function') {
        p.then(function () {
          enviado = d.dados;
          gravaChave(ULT_K, JSON.stringify(d.dados));
          marcaEnvio(true, 'enviado', res);
          avisa('enviado');
        }, function (e) {
          // rejeição do SERVIDOR não é mais engolida: guarda motivo
          var msg = String((e && e.message) || e);
          var m1 = /permission|insufficient/i.test(msg) ? 'regras' : 'rede';
          marcaEnvio(false, m1, res, msg);
          avisa(m1);
        });
      } else {
        marcaEnvio(false, 'sdk', res, 'set sem retorno');
        avisa('sdk');
      }
    });
    return true;
  }

  // ------------------------------------------------------------ leitura
  function top(cb) {
    cb = cb || function () {};
    if (!ativo()) {
      estado = 'desativado';
      cb(new Error('ranking não configurado'), null, false);
      return;
    }
    if (eArquivoLocal()) {
      estado = 'erro';
      cb(new Error('arquivo local (file://): Firebase indisponível'),
        null, false);
      return;
    }
    estado = 'carregando';
    deCache = false;
    carregaSdk(function (erro) {
      if (erro) { serveCache(cb, erro); return; }
      var p = db.collection(COLECAO).orderBy('score', 'desc').limit(10).get();
      if (!p || typeof p.then !== 'function') {
        serveCache(cb, new Error('leitura indisponível'));
        return;
      }
      p.then(function (snap) {
        lista = [];
        var docs = (snap && snap.docs) || [];
        for (var i = 0; i < docs.length; i++) {
          var v = docs[i].data ? docs[i].data() : docs[i];
          if (v && typeof v.score === 'number') lista.push(v);
        }
        estado = 'ok';
        deCache = false;
        gravaChave(CACHE_K, JSON.stringify({ em: Date.now(), lista: lista }));
        cb(null, lista, false);
      }, function (e) { serveCache(cb, e || new Error('falha na leitura')); });
    });
  }

  // Sem rede mas com cache local: serve o cache (cena avisa). Sem cache
  // nenhum: estado de erro.
  function serveCache(cb, erro) {
    var c = leJson(CACHE_K);
    if (c && c.lista && c.lista.length) {
      lista = c.lista;
      deCache = true;
      estado = 'ok';
      cb(null, lista, true);
    } else {
      estado = 'erro';
      cb(erro, null, false);
    }
  }

  // -------------------------------------------------------------- cena
  var cT = 0;              // cursor do apelido (pisca)
  var cLista = [];
  var cCache = false;
  var cAviso = '';

  function atualiza() {
    top(function (erro, l, deC) {
      cLista = l || [];
      cCache = !!deC;
      cAviso = estado === 'erro' ? 'Falha ao carregar — sem rede?' : '';
    });
  }

  function cenaEnter() {
    cT = 0;
    cAviso = '';
    cLista = [];
    cCache = false;
    atualiza();
  }

  function cenaUpdate(dt) {
    cT += dt;
    if (Input.pressed('Backspace')) setNick(nick().slice(0, -1));
    for (var i = 0; i < Input.typed.length; i++) {
      var ch = Input.typed[i];
      if (!/[A-Za-z0-9 \-_]/.test(ch)) continue;
      if (nick().length < 20) setNick(nick() + ch);
    }
    if (Input.pressed('Enter')) atualiza();
  }

  function prog(v) {
    return 'M' + v.mapa + ' O' + Math.max(1, v.onda | 0) + ' N' + (v.nivel | 0);
  }

  function dataBR(ts) {
    var d = new Date(ts || 0);
    return ('0' + d.getDate()).slice(-2) + '/' +
      ('0' + (d.getMonth() + 1)).slice(-2);
  }

  function desenhaLinhas() {
    var meu = slug(nick());
    for (var i = 0; i < cLista.length && i < 10; i++) {
      var v = cLista[i];
      var y = 76 + i * 24;
      var cor = (meu && slug(v.nick) === meu) ? '#e8c86a' : '#f2eef8';
      UI.text((i + 1) + 'º', 20, y, { color: '#9a90b8' });
      UI.text(String(v.nick || '?').slice(0, 20), 48, y,
        { color: cor, font: '13px monospace' });
      UI.text(prog(v), 208, y, { color: '#c9c2dd', font: '13px monospace' });
      UI.text(String(v.classe || ''), 320, y,
        { color: '#9a90b8', font: '13px monospace' });
      UI.text(dataBR(v.at), 478, y,
        { align: 'right', color: '#6f678a', font: '13px monospace' });
    }
  }

  function cenaRender(ctx) {
    var W = Game.W;
    var rd = W - 768;      // âncora direita (tela larga)
    UI.fundo(ctx);
    UI.faixaTopo(ctx, 30);
    UI.text('RANKING GLOBAL', 6, 16,
      { color: '#e8c86a', font: 'bold 16px monospace' });
    UI.text('progresso: mapa · onda · nível', 168, 16, { color: '#9a90b8' });

    // ---------------- top 10 (esquerda, largura fixa)
    UI.panel(8, 36, 480, 300, 'TOP 10');
    if (estado === 'desativado') {
      UI.text('Ranking não configurado.', 24, 92, { color: '#ffd866' });
      UI.text('Preencha js/ranking-config.js com a config', 24, 124,
        { color: '#9a90b8', font: '13px monospace' });
      UI.text('do seu projeto Firebase e use ativo: true.', 24, 146,
        { color: '#9a90b8', font: '13px monospace' });
    } else if (estado === 'carregando') {
      UI.text('Carregando ranking...', 24, 92, { color: '#9a90b8' });
    } else if (estado === 'erro') {
      UI.text('Falha ao carregar o ranking.', 24, 92, { color: '#ff8a8a' });
      UI.text('Sem rede? Clique em ATUALIZAR.', 24, 124,
        { color: '#9a90b8', font: '13px monospace' });
    } else if (!cLista.length) {
      UI.text('Nenhum resultado ainda —', 24, 92, { color: '#9a90b8' });
      UI.text('feche um mapa ou morra com apelido', 24, 124,
        { color: '#6f678a', font: '13px monospace' });
      UI.text('definido para entrar na lista.', 24, 146,
        { color: '#6f678a', font: '13px monospace' });
    } else {
      desenhaLinhas();
    }

    // ---------------- apelido + meu melhor (direita, ancorado)
    UI.panel(500 + rd, 36, 260, 116, 'SEU APELIDO');
    var cur = Math.floor(cT * 2) % 2 === 0 ? '_' : ' ';
    UI.text(nick() + cur, 512 + rd, 80, { color: '#f2eef8' });
    UI.text('digite para trocar (até 20)', 512 + rd, 108,
      { color: '#6f678a', font: '13px monospace' });
    // status do último envio (observabilidade — nunca silencioso)
    if (ultimoEnvio) {
      UI.text('último envio: ' +
        (ultimoEnvio.ok ? MOTIVO['enviado'] : MOTIVO[ultimoEnvio.motivo]),
        512 + rd, 132, { color: ultimoEnvio.ok ? '#8ce08c' : '#ff8a8a',
          font: '13px monospace' });
    }

    UI.panel(500 + rd, 164, 260, 172, 'MEU MELHOR');
    var me = leJson(ULT_K);
    if (me && typeof me.score === 'number') {
      UI.text('score ' + me.score, 512 + rd, 200, { color: '#ffd866' });
      UI.text(prog(me), 512 + rd, 230, { color: '#c9c2dd' });
      UI.text('registrado no ranking', 512 + rd, 262,
        { color: '#6f678a', font: '13px monospace' });
    } else {
      UI.text('ainda nenhum envio.', 512 + rd, 200, { color: '#9a90b8' });
      UI.text('O ranking aceita só a SUA', 512 + rd, 230,
        { color: '#6f678a', font: '13px monospace' });
      UI.text('melhor marca por apelido.', 512 + rd, 252,
        { color: '#6f678a', font: '13px monospace' });
    }

    // ---------------- rodapé
    if (UI.button(8, 372, 120, 32, 'VOLTAR')) {
      Game.setScene('selecao');
      return;
    }
    if (UI.button(W - 128, 372, 120, 32, 'ATUALIZAR')) atualiza();
    if (cCache) {
      UI.text('mostrando cache local (sem rede)', W / 2, 388,
        { align: 'center', color: '#ffd866' });
    } else if (cAviso) {
      UI.text(cAviso, W / 2, 388, { align: 'center', color: '#ff8a8a' });
    }
    UI.desenhaTooltip();
  }

  return {
    slug: slug,
    nickValido: nickValido,
    scoreDe: scoreDe,
    docDe: docDe,
    resultadoAtual: resultadoAtual,
    nick: function (v) { if (v !== undefined) setNick(v); return nick(); },
    submete: submete,
    top: top,
    estado: function () { return estado; },
    enviado: function () { return enviado; },
    ultimoEnvio: function () { return ultimoEnvio; },
    ehCache: function () { return deCache; },
    // só teste: zera o estado em memória (não toca no localStorage)
    _reseta: function () {
      db = null;
      injetando = false;
      pendentes = [];
      estado = 'desativado';
      lista = [];
      deCache = false;
      enviado = null;
      ultimoEnvio = null;
      dicaNick = false;
      dicaFile = false;
    },
    cena: { enter: cenaEnter, update: cenaUpdate, render: cenaRender }
  };
})();
