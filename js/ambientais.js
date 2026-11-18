// Vidas do mundo (spec mundos-vivos R-MV-4/5): NPCs na vila +
// animais por chunk. Camada de APRESENTAÇÃO alimentada pela batalha
// (sem dependência inversa — batalha chama reinicia/atualiza/todos/
// desenhar). ZERO impacto em combate: não entram em inimigos, não
// colidem com o herói, não dão XP, não tocam em stats.
//
// Determinismo: NPCs ancorados nas peças da vila (sorteio do mapa) e
// animais por chunk com semente mapa+chunk (padrão do obstChunk) —
// mesmo mapa = as mesmas vidas em qualquer sessão. ES5 puro.
var Ambientais = (function () {
  var npcs = [];          // NPCs da vila do mapa atual (ou vazio)
  var cacheAnimais = {};  // 'cx,cy' → [bichos do chunk] (limpo por mapa)
  var ativos = [];        // bichos na janela ativa (reconstruído/frame)
  var CAP = 12;           // teto de animais em cena (pool)
  var heroiX = 0, heroiY = 0;   // p/ a sonda de fuga (info)

  // ------------------------------------------------------------- vidas
  function reinicia(vila, n, livre) {
    npcs = [];
    cacheAnimais = {};
    ativos = [];
    if (!vila) return;
    var rng = Perlin.sorteio(n * 6151 + 13);
    var qtd = Math.min(4, vila.pecas.length);
    for (var i = 0; i < qtd; i++) {
      var p = vila.pecas[i];
      var sprite = Math.floor(rng() * 25);        // 25 NPCs possíveis
      // âncora na FRENTE da peça (chão, y+), validada contra colisão
      var ax = null, ay = null;
      for (var t = 0; t < 6 && !ax; t++) {
        var cx0 = p.x + (rng() - 0.5) * 44;
        var cy0 = p.y + 12 + rng() * 16;
        if (!livre || !livre(cx0, cy0, 7)) { ax = cx0; ay = cy0; }
      }
      if (!ax) continue;                          // sem vaga: sem NPC
      npcs.push({
        ax: ax, ay: ay, x: ax, y: ay, sprite: sprite,
        destino: null, espera: rng() * 2.5,
        vx: 0, flip: 1, fase: rng() * 6,
        rng: Perlin.sorteio(n * 6151 + 13 + i * 7 + 1)
      });
    }
  }

  // bichos do chunk (memo por mapa): ~42% dos chunks têm 1 — sorteio
  // independente da semente do ruído (padrão obstChunk)
  function garanteAnimais(cx, cy, cfg) {
    var chave = cx + ',' + cy;
    if (cacheAnimais[chave]) return cacheAnimais[chave];
    var base = cfg.mapa * 7919 + (cx + 64) * 131 + (cy + 64) + 90901;
    var rng = Perlin.sorteio(base);
    var lista = [];
    if (rng() < 0.42) {
      var px = 0, py = 0, ok = false, t = 0;
      while (t < 8 && !ok) {
        px = cx * cfg.mw + 30 + rng() * (cfg.mw - 60);
        py = cy * cfg.mh + 30 + rng() * (cfg.mh - 60);
        ok = !cfg.livre || !cfg.livre(px, py, 5);
        t++;
      }
      if (ok) {
        lista.push({
          x: px, y: py, bx: cx * cfg.mw, by: cy * cfg.mh,
          mw: cfg.mw, mh: cfg.mh,
          sp: Math.floor(rng() * 4), flip: rng() < 0.5 ? -1 : 1,
          vx: 0, vy: 0, t: rng() * 2, fuga: 0, fase: rng() * 6,
          rng: Perlin.sorteio(base + 1)
        });
      }
    }
    cacheAnimais[chave] = lista;
    return lista;
  }

  // ------------------------------------------------------------- update
  // lista ativa = janela de chunks da batalha (teto CAP, ordem dy→dx)
  function montaAtivos(cfg) {
    heroiX = cfg.hx; heroiY = cfg.hy;
    ativos = [];
    for (var dy = -cfg.ny; dy <= cfg.ny && ativos.length < CAP; dy++) {
      for (var dx = -cfg.nx; dx <= cfg.nx && ativos.length < CAP; dx++) {
        var l = garanteAnimais(cfg.cx + dx, cfg.cy + dy, cfg);
        for (var k = 0; k < l.length && ativos.length < CAP; k++) {
          ativos.push(l[k]);
        }
      }
    }
  }

  // o teste lê info().ambientais SEM rodar frame — mesma tratativa do
  // info().obst: monta a lista fiel na hora (sem simulação)
  function sincroniza(cfg) { montaAtivos(cfg); }

  function anda(alvo, vel, dt, livre, raio) {
    // move p/ o destino com colisão leve (bloqueio = destino novo)
    var dx = alvo.destino.x - alvo.x, dy = alvo.destino.y - alvo.y;
    var d = Math.sqrt(dx * dx + dy * dy);
    if (d < 2) return true;                        // chegou
    var nx = alvo.x + (dx / d) * vel * dt;
    var ny = alvo.y + (dy / d) * vel * dt;
    if (livre && livre(nx, ny, raio)) return true; // bloqueado
    alvo.x = nx; alvo.y = ny;
    if (Math.abs(dx) > 0.4) alvo.flip = dx > 0 ? 1 : -1;
    return false;
  }

  function atualizaNpc(n, dt, livre) {
    if (n.espera > 0) {
      n.espera -= dt; n.vx = 0;
      n.fase += dt * 2.2;                          // respira parado
      return;
    }
    if (!n.destino) {
      var a = n.rng() * Math.PI * 2, dd = 8 + n.rng() * 20;
      n.destino = { x: n.ax + Math.cos(a) * dd,
                    y: n.ay + Math.sin(a) * dd * 0.55 };
    }
    var antes = n.x;
    if (anda(n, 16, dt, livre, 7)) {
      n.destino = null;
      n.espera = 1 + n.rng() * 3;                  // pára e pensa
    }
    n.vx = n.x - antes;
    n.fase += dt * (Math.abs(n.vx) > 0.02 ? 9 : 2.2);
  }

  function atualizaAnimal(a, dt, hx, hy, livre) {
    var dxh = a.x - hx, dyh = a.y - hy;
    var dh = Math.sqrt(dxh * dxh + dyh * dyh);
    if (dh < 60) {
      // FUGA do herói (nunca colide — só corre)
      a.fuga = 0.8;
      var inv = 1 / (dh || 1);
      a.vx = dxh * inv * 46;
      a.vy = dyh * inv * 46;
    } else if (a.fuga > 0) {
      a.fuga -= dt;
    } else {
      a.t -= dt;
      if (a.t <= 0) {
        a.t = 0.8 + a.rng() * 1.6;
        var ang = a.rng() * Math.PI * 2;
        a.vx = Math.cos(ang) * 10;
        a.vy = Math.sin(ang) * 10;
      }
    }
    var nx = a.x + a.vx * dt, ny = a.y + a.vy * dt;
    // dentro do próprio chunk (o bicho não vaga p/ o mundo afora)
    if (nx < a.bx + 24 || nx > a.bx + a.mw - 24 ||
        ny < a.by + 24 || ny > a.by + a.mh - 24) {
      a.t = 0; a.fuga = Math.min(a.fuga, 0.15);    // morde a borda
    } else if (livre && livre(nx, ny, 5)) {
      a.x = nx; a.y = ny;
      if (Math.abs(a.vx) > 0.4) a.flip = a.vx > 0 ? 1 : -1;
    } else {
      a.t = 0;                                     // bateu: novo rumo
    }
    a.fase += dt * (Math.abs(a.vx) + Math.abs(a.vy) > 1 ? 10 : 3);
  }

  // janela = lista ativa de chunks (a mesma da batalha) — reconstruída
  // a cada frame; teto CAP por ordem determinística (dy, dx)
  function atualiza(dt, cfg) {
    var i;
    for (i = 0; i < npcs.length; i++) {
      atualizaNpc(npcs[i], dt, cfg.livre);
    }
    montaAtivos(cfg);
    for (i = 0; i < ativos.length; i++) {
      atualizaAnimal(ativos[i], dt, cfg.hx, cfg.hy, cfg.livre);
    }
  }

  // -------------------------------------------------------------- cena
  // entidades p/ a lista de profundidade da batalha (t = 5)
  function todos() {
    var out = npcs.slice();
    for (var i = 0; i < ativos.length; i++) out.push(ativos[i]);
    return out;
  }

  function sombraLocal(ctx, x, y, rx) {
    ctx.globalAlpha = 0.32;
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.ellipse(x, y - 1, rx, Math.max(2, Math.round(rx * 0.4)),
      0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function desenhar(ctx, e) {
    var animal = (typeof e.sp === 'number');
    var im = Assets.cena(animal ? 'animal' : 'npc',
      animal ? e.sp : e.sprite);
    if (!im) return;
    var w = im.width, h = im.height;
    var andando = Math.abs(e.vx) + Math.abs(e.vy || 0) > 0.5;
    var bob = Math.round(Math.sin(e.fase) * (andando ? 1.5 : 0.6));
    var x0 = Math.round(e.x - w / 2);
    var y0 = Math.round(e.y - h + bob);
    sombraLocal(ctx, e.x, e.y, Math.round(w * 0.32));
    if (e.flip < 0) {
      ctx.save();
      ctx.translate(x0 + w, y0);
      ctx.scale(-1, 1);
      ctx.drawImage(im, 0, 0);
      ctx.restore();
    } else {
      ctx.drawImage(im, x0, y0);
    }
  }

  // sonda p/ teste
  function info() {
    function perto3(lista) {
      var out = [];
      for (var i = 0; i < lista.length && out.length < 3; i++) {
        out.push({ x: Math.round(lista[i].x), y: Math.round(lista[i].y) });
      }
      return out;
    }
    // bicho mais próximo do herói (sonda da fuga — R-MV-5)
    var perto = -1;
    for (var i = 0; i < ativos.length; i++) {
      var dx = ativos[i].x - heroiX, dy = ativos[i].y - heroiY;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (perto < 0 || d < perto) perto = d;
    }
    return { npcs: npcs.length, animais: ativos.length,
             npcEx: perto3(npcs), animalEx: perto3(ativos),
             animalPerto: Math.round(perto) };
  }

  return { reinicia: reinicia, atualiza: atualiza, sincroniza: sincroniza,
           todos: todos, desenhar: desenhar, info: info };
})();
