// Persistência: localStorage + export/import de JSON.
var Salvar = (function () {
  var KEY = 'rpg_personagens_v1';
  var KEY_ULTIMO = 'rpg_ultimo_id';
  var KEY_ESTADO = 'rpg_estado_v1';   // onda + instante do último save

  function listar() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      return arr.map(function (p) { return Personagem.normalizar(p); });
    } catch (e) {
      return [];
    }
  }

  function gravar(lista) {
    try {
      localStorage.setItem(KEY, JSON.stringify(lista));
      return true;
    } catch (e) {
      return false;
    }
  }

  function salvar(p) {
    Personagem.validar(p);
    var lista = listar();
    var i = -1;
    for (var k = 0; k < lista.length; k++) {
      if (lista[k].id === p.id) { i = k; break; }
    }
    if (i >= 0) lista[i] = p; else lista.push(p);
    if (!gravar(lista)) return false;
    try { localStorage.setItem(KEY_ULTIMO, p.id); } catch (e) { /* sem suporte */ }
    return true;
  }

  // ------------------------------------------------- estado da batalha
  // Mapa por personagem: { "<id>": { onda, ts, pausada } }. É daqui que
  // sai a onda retomada e o progresso offline.
  function mapaEstado() {
    try {
      var raw = localStorage.getItem(KEY_ESTADO);
      var o = raw ? JSON.parse(raw) : null;
      return (o && typeof o === 'object' && !Array.isArray(o)) ? o : {};
    } catch (e) {
      return {};
    }
  }

  function salvarEstado(id, onda, ts, pausada) {
    if (!id) return false;
    try {
      var m = mapaEstado();
      m[id] = {
        onda: onda,
        ts: typeof ts === 'number' ? ts : Date.now(),
        pausada: !!pausada
      };
      localStorage.setItem(KEY_ESTADO, JSON.stringify(m));
      return true;
    } catch (e) {
      return false;
    }
  }

  function lerEstado(id) {
    var e = mapaEstado()[id];
    if (!e) return null;
    if (typeof e.onda !== 'number' || !isFinite(e.onda) || e.onda < 0) return null;
    if (typeof e.ts !== 'number' || !isFinite(e.ts)) return null;
    return { onda: Math.floor(e.onda), ts: e.ts, pausada: !!e.pausada };
  }

  function apagar(id) {
    return gravar(listar().filter(function (p) { return p.id !== id; }));
  }

  function exportar(p, sufixo) {
    var blob = new Blob([Personagem.exportarJSON(p)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    // sem acento, sem pontuação: "Herói" vira "Heroi" (não "Her")
    var nome = (p.nome || 'personagem')
      .normalize('NFD')                   // separa o acento da letra
      .replace(/[̀-ͯ]/g, '')    // remove o acento
      .replace(/[^\w\- ]+/g, '')          // fora o que não é letra/número
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
          cb(null, Personagem.importarJSON(String(r.result)));
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
    ultimo: ultimo
  };
})();
