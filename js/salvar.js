// Persistência: localStorage + export/import de JSON.
//
// Integridade (spec save-assinado): cada entrada sai ASSINADA —
// `_s = HMAC-SHA256(JSON.stringify sem _s)` (js/assinatura.js) — e é
// VERIFICADA na leitura. Com o marcador do storage ativo, entrada sem
// `_s` ou com `_s` divergente é REJEITADA (não entra no jogo), mas o
// dado rejeitado NUNCA é destruído: fica no storage como estava e
// todo `gravar`/`salvar` preserva as entradas alheias (falso
// positivo não apaga save de ninguém).
//
// Migração sem janela: sem marcador (1ª vez neste aparelho) tudo é
// aceito e RE-ESCREVE assinado na hora — se aceitássemos sem
// reescrever, o boot seguinte (já com marcador) rejeitaria o save do
// próprio jogador. O marcador também nasce em qualquer escrita nossa.
//
// Limite honesto: a chave do HMAC está no bundle (extraível) —
// barreira p/ edição casual, não segredo. O placar não depende daqui:
// ele é validado no servidor (spec ranking-antitrampa).
var Salvar = (function () {
  var KEY = 'rpg_personagens_v1';
  var KEY_ULTIMO = 'rpg_ultimo_id';
  var KEY_ESTADO = 'rpg_estado_v1';   // onda + instante do último save
  // marcador por storage: "a assinatura já está ativa aqui" (é o que
  // separa migração de rejeição — sem ele, todo save antigo cairia)
  var KEY_MARC_P = 'rpg_assinatura_v1';
  var KEY_MARC_E = 'rpg_assinatura_estado_v1';
  // Sanidade do estado: save legítimo nunca chega perto disso; valores
  // maiores vêm de storage corrompido e são rejeitados na leitura.
  var ONDA_MAX = 99999;
  var rejeitados = 0;   // entradas rejeitadas desde o boot (teste/UI)

  // ---------------------------------------------------- assinatura
  function assina(valor) {
    var copia = JSON.parse(JSON.stringify(valor));
    delete copia._s;
    copia._s = Assinatura.hmac(JSON.stringify(copia), Assinatura.CHAVE);
    return copia;
  }

  // mesma string da gravação: JSON do objeto SEM _s (ordem de chaves
  // igual porque sai do próprio parse do que foi gravado)
  function confere(valor) {
    if (!valor || typeof valor !== 'object' || typeof valor._s !== 'string') {
      return false;
    }
    var copia = JSON.parse(JSON.stringify(valor));
    delete copia._s;
    return Assinatura.hmac(JSON.stringify(copia), Assinatura.CHAVE) === valor._s;
  }

  function marcador(chave) {
    try { return !!localStorage.getItem(chave); } catch (e) { return false; }
  }

  function marca(chave) {
    try { localStorage.setItem(chave, '1'); } catch (e) { /* sem suporte */ }
  }

  function avisa(msg) {
    if (typeof console !== 'undefined' && console.warn) console.warn(msg);
  }

  // ------------------------------------------------------- leitura
  function lerBruto() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function temEntradas(mapa) {
    for (var k in mapa) {
      if (Object.prototype.hasOwnProperty.call(mapa, k)) return true;
    }
    return false;
  }

  // 1ª vez neste aparelho: assina tudo e reescreve NA HORA (a janela
  // entre "aceitou sem assinar" e "marcador criado" seria uma tela em
  // que o próprio save do jogador viraria rejeitado no boot seguinte)
  function migraPessoa(bruto) {
    var saida = [];
    for (var i = 0; i < bruto.length; i++) {
      var e = bruto[i];
      saida.push(e && typeof e === 'object' ? assina(e) : e);
    }
    try {
      localStorage.setItem(KEY, JSON.stringify(saida));
      marca(KEY_MARC_P);
      return saida;
    } catch (e2) {
      return bruto;   // sem storage gravável: segue como estava
    }
  }

  function listar() {
    var bruto = lerBruto();
    if (!marcador(KEY_MARC_P) && bruto.length) bruto = migraPessoa(bruto);
    var ativa = marcador(KEY_MARC_P);
    rejeitados = 0;
    var validos = [];
    for (var i = 0; i < bruto.length; i++) {
      var e = bruto[i];
      if (!e || typeof e !== 'object') continue;
      if (ativa && !confere(e)) {
        rejeitados++;
        avisa('save rejeitado (assinatura não bate): ' +
          (e.nome || e.id || '(sem nome)'));
        continue;   // fica no storage intacto — nada é apagado
      }
      validos.push(Personagem.normalizar(e));
    }
    return validos;
  }

  function rejeitadosQtd() { return rejeitados; }

  // ------------------------------------------------------ escrita
  // Grava a lista de jogos VÁLIDAS (assina cada entrada) e preserva do
  // storage as entradas que NÃO passaram na verificação — re-assinar
  // dado rejeitado seria aceitar a trapaça na marra, e apagá-lo seria
  // perda de dado. Entradas VÁLIDAS fora da lista foram apagadas de
  // propósito (apagar()) e saem mesmo.
  function gravaBruto(saida) {
    try {
      localStorage.setItem(KEY, JSON.stringify(saida));
      marca(KEY_MARC_P);
      return true;
    } catch (e) {
      return false;
    }
  }

  function gravar(lista) {
    var bruto = lerBruto();
    if (!marcador(KEY_MARC_P) && bruto.length) bruto = migraPessoa(bruto);
    var saida = [];
    var i, j, e;
    for (i = 0; i < lista.length; i++) {
      if (lista[i]) saida.push(assina(lista[i]));
    }
    for (i = 0; i < bruto.length; i++) {
      e = bruto[i];
      if (!e || typeof e !== 'object') continue;
      var naLista = false;
      for (j = 0; j < lista.length; j++) {
        if (lista[j] && lista[j].id === e.id) { naLista = true; break; }
      }
      if (!naLista && marcador(KEY_MARC_P) && !confere(e)) saida.push(e);
    }
    return gravaBruto(saida);
  }

  function salvar(p) {
    Personagem.validar(p);
    var bruto = lerBruto();
    if (!marcador(KEY_MARC_P) && bruto.length) bruto = migraPessoa(bruto);
    var novo = assina(p);
    var saida = [], achou = false;
    for (var i = 0; i < bruto.length; i++) {
      var e = bruto[i];
      if (e && typeof e === 'object' && e.id === p.id) {
        saida.push(novo);      // substitui o MESMO id (assinado de novo)
        achou = true;
      } else {
        saida.push(e);         // todo o resto segue como estava
      }
    }
    if (!achou) saida.push(novo);
    if (!gravaBruto(saida)) return false;
    try { localStorage.setItem(KEY_ULTIMO, p.id); } catch (e2) { /* sem suporte */ }
    return true;
  }

  function apagar(id) {
    // válido e apagado de propósito sai; rejeitado continua lá
    return gravar(listar().filter(function (p) { return p.id !== id; }));
  }

  // ------------------------------------------------- estado da batalha
  // Mapa por personagem: { "<id>": { onda, ts, pausada, mapa, _s } }.
  // É daqui que sai a onda retomada e o progresso offline — e é daqui
  // que nasce o mapa/onda do placar, então leva a MESMA assinatura.
  function lerEstadoBruto() {
    try {
      var raw = localStorage.getItem(KEY_ESTADO);
      var o = raw ? JSON.parse(raw) : null;
      return (o && typeof o === 'object' && !Array.isArray(o)) ? o : {};
    } catch (e) {
      return {};
    }
  }

  function migraEstado(bruto) {
    var saida = {};
    for (var id in bruto) {
      if (!Object.prototype.hasOwnProperty.call(bruto, id)) continue;
      var e = bruto[id];
      saida[id] = e && typeof e === 'object' ? assina(e) : e;
    }
    try {
      localStorage.setItem(KEY_ESTADO, JSON.stringify(saida));
      marca(KEY_MARC_E);
      return saida;
    } catch (e2) {
      return bruto;
    }
  }

  function mapaEstado() {
    var bruto = lerEstadoBruto();
    if (!marcador(KEY_MARC_E) && temEntradas(bruto)) {
      bruto = migraEstado(bruto);
    }
    var ativa = marcador(KEY_MARC_E);
    var out = {};
    for (var id in bruto) {
      if (!Object.prototype.hasOwnProperty.call(bruto, id)) continue;
      var e = bruto[id];
      if (!e || typeof e !== 'object') continue;
      if (ativa && !confere(e)) {
        rejeitados++;
        avisa('estado rejeitado (assinatura não bate): ' + id);
        continue;
      }
      out[id] = e;
    }
    return out;
  }

  function salvarEstado(id, onda, ts, pausada, mapa) {
    if (!id) return false;
    var bruto = lerEstadoBruto();
    if (!marcador(KEY_MARC_E) && temEntradas(bruto)) {
      bruto = migraEstado(bruto);
    }
    bruto[id] = assina({
      onda: onda,
      ts: typeof ts === 'number' ? ts : Date.now(),
      pausada: !!pausada,
      // chamadas antigas sem mapa gravam 1 (formato legado continua válido)
      mapa: (typeof mapa === 'number' && mapa >= 1) ? Math.floor(mapa) : 1
    });
    try {
      localStorage.setItem(KEY_ESTADO, JSON.stringify(bruto));
      marca(KEY_MARC_E);
      return true;
    } catch (e) {
      return false;
    }
  }

  function lerEstado(id) {
    var e = mapaEstado()[id];
    if (!e) return null;
    if (typeof e.onda !== 'number' || !isFinite(e.onda) || e.onda < 0) return null;
    if (e.onda > ONDA_MAX) return null;   // storage corrompido
    if (typeof e.ts !== 'number' || !isFinite(e.ts)) return null;
    var mapa = (typeof e.mapa === 'number' && e.mapa >= 1 && isFinite(e.mapa))
      ? Math.floor(e.mapa) : 1;
    // save legado de antes dos mapas (ondas 101+): vira mapa/onda
    // equivalentes sem perder progresso (250 -> mapa 3, onda 50)
    var extra = e.onda > 100 ? Math.floor((e.onda - 1) / 100) : 0;
    return {
      onda: Math.floor(e.onda) - extra * 100,
      ts: e.ts,
      pausada: !!e.pausada,
      mapa: mapa + extra
    };
  }

  // ---------------------------------------------------- export/import
  function exportar(p, sufixo) {
    // exporta ASSINADO: transferência entre aparelhos valida (mesma
    // chave em todos — sem sal por aparelho de propósito)
    var blob = new Blob([Personagem.exportarJSON(assina(p))],
      { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    // sem acento, sem pontuação: "Herói" vira "Heroi" (não "Her")
    var nome = (p.nome || 'personagem')
      .normalize('NFD')                   // separa o acento da letra
      .replace(/[̀-ͯ]/g, '')    // remove o acento
      .replace(/[^\w\- ]+/g, '')          // fora o que é letra/número
      .replace(/\s+/g, '_');              // espaço vira _
    a.download = (nome || 'personagem') + (sufixo || '') + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  // Lê um arquivo .json escolhido pelo usuário. Callback(err, personagem).
  function importarArquivo(cb) {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = function () {
      var f = input.files && input.files[0];
      if (!f) { cb(new Error('nenhum arquivo escolhido')); return; }
      var r = new FileReader();
      r.onload = function () {
        try {
          var texto = String(r.result);
          var obj = null;
          try { obj = JSON.parse(texto); } catch (e) { obj = null; }
          if (obj && typeof obj === 'object') {
            if (obj._s !== undefined) {
              if (!confere(obj)) {
                cb(new Error('assinatura do arquivo não bate (arquivo alterado?)'));
                return;
              }
            } else {
              // backup antigo (antes da assinatura): aceita — quem
              // controla o arquivo consegue re-assinar de qualquer
              // forma; quebrar backups antigos custaria mais
              avisa('importando JSON sem assinatura (backup antigo) — será assinado ao salvar');
            }
          }
          cb(null, Personagem.importarJSON(texto));
        } catch (e) {
          cb(e);
        }
      };
      r.onerror = function () { cb(new Error('falha ao ler o arquivo')); };
      r.readAsText(f);
    };
    // no DOM antes do click: Firefox ignora input solto
    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  }

  // Personagem usado por último (é de lá que o jogo reabre).
  function ultimo() {
    var lista = listar();
    try {
      var id = localStorage.getItem(KEY_ULTIMO);
      if (id) {
        for (var i = 0; i < lista.length; i++) {
          if (lista[i].id === id) return lista[i];
        }
      }
    } catch (e) { /* sem suporte */ }
    return lista.length ? lista[lista.length - 1] : null;
  }

  return {
    listar: listar,
    salvar: salvar,
    apagar: apagar,
    exportar: exportar,
    importarArquivo: importarArquivo,
    salvarEstado: salvarEstado,
    lerEstado: lerEstado,
    ultimo: ultimo,
    rejeitados: rejeitadosQtd
  };
})();
