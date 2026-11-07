// Batalha automática (idle): o herói mira, anda e ataca sozinho.
// O jogador não controla nada aqui — só assiste e administra o personagem.
var Batalha = (function () {
  var W = 192, H = 134;          // mundo = viewport (sem câmera)

  var chao = null;
  var obst = [];
  var heroi = null;
  var inimigos = [];
  var nums = [];
  var parts = [];
  var onda = 0;
  var tOnda = 1.0;                // espera até a próxima onda
  var tFlash = 0;                 // flash de "NÍVEL X!"
  var nivelFlash = 0;
  var shake = 0;
  var pausada = false;
  var donoId = null;         // personagem dono da batalha em memória
  var mapa = 1;              // mapa atual (ciclo de FIM_MAPA ondas)
  var cenarioMapa = 0;       // mapa para o qual chao/obst já foram construídos
  var magiasVigentes = [];   // magias ativas do herói (recomputadas por frame)
  var magiasEstado = {};     // contadores/timers por magia (zerado em iniciar)

  // stats/visual por espécie — cor/escala/forma vêm do mapa (Mapas.info)
  var TIPOS = {
    slime:   { hp: 16, dmg: 4, vel: 34, xpExtra: 0, forma: 'slime',
               cor: '#4aa03a' },
    visgo:   { hp: 28, dmg: 6, vel: 28, xpExtra: 3, forma: 'slime',
               cor: '#7a4ac0' },
    morcego: { hp: 22, dmg: 5, vel: 44, xpExtra: 3, forma: 'morcego',
               cor: '#7a5aa8', raio: 5 },
    aranha:  { hp: 34, dmg: 7, vel: 30, xpExtra: 4, forma: 'aranha',
               cor: '#c84a3a' },
    // chefe do fim de mapa — cor/escala/forma específicas por mapa
    boss:    { hp: 20, dmg: 5, vel: 30, xpExtra: 0, boss: true, escala: 2.6,
               raio: 11, forma: 'slime', cor: '#d8a020' }
  };

  var FIM_MAPA = 100;        // ondas por mapa; a100 é o chefe

  // Escala por onda — alavanca do ritmo das ondas (boss incluído).
  // Medir com testes/ritmo.js antes de mexer.
  var ESC_HP = 1.85;       // vida do inimigo por onda
  var ESC_DMG = 0.18;     // dano do inimigo por onda
  var ESPERA_ONDA = 2.0;  // respiro depois de limpar a onda (segundos)

  // ------------------------------------------------------------ cenário
  function constroiChao(tema) {
    chao = document.createElement('canvas');
    chao.width = W;
    chao.height = H;
    var c = chao.getContext('2d');

    c.fillStyle = tema.chao.base;
    c.fillRect(0, 0, W, H);

    var T = 16;
    for (var y = 0; y < H; y += T) {
      for (var x = 0; x < W; x += T) {
        c.fillStyle = ((x / T + y / T) % 2 === 0) ? tema.chao.par : tema.chao.imp;
        c.fillRect(x, y, T, T);
      }
    }

    for (var i = 0; i < 24; i++) {
      c.fillStyle = tema.chao.mancha[i % 2];
      c.beginPath();
      c.ellipse(Math.random() * W, Math.random() * H,
        8 + Math.random() * 14, 5 + Math.random() * 7, 0, 0, Math.PI * 2);
      c.fill();
    }

    var flores = tema.chao.flores;
    for (i = 0; flores.length && i < 18; i++) {
      c.fillStyle = flores[i % flores.length];
      c.fillRect((Math.random() * W) | 0, (Math.random() * H) | 0, 2, 2);
    }

    c.strokeStyle = tema.chao.borda;
    c.lineWidth = 8;
    c.strokeRect(4, 4, W - 8, H - 8);
    c.strokeStyle = tema.chao.borda2;
    c.lineWidth = 2;
    c.strokeRect(4, 4, W - 8, H - 8);
  }

  function constroiObst(tema) {
    obst = tema.obst.slice();
  }

  // (re)constrói chão e obstáculos quando o mapa muda
  function garanteCenario() {
    if (cenarioMapa === mapa) return;
    var tem = Mapas.info(mapa);
    constroiChao(tem);
    constroiObst(tem);
    cenarioMapa = mapa;
  }

  function colideObst(x, y, raio) {
    for (var i = 0; i < obst.length; i++) {
      var o = obst[i];
      var dx = x - o.cx, dy = y - o.cy;
      var min = o.r + raio;
      if (dx * dx + dy * dy < min * min) return true;
    }
    return false;
  }

  function resolve(ent, raio) {
    if (ent.x < 8) ent.x = 8;
    if (ent.x > W - 8) ent.x = W - 8;
    if (ent.y < 10) ent.y = 10;
    if (ent.y > H - 8) ent.y = H - 8;

    for (var i = 0; i < obst.length; i++) {
      var o = obst[i];
      var dx = ent.x - o.cx, dy = ent.y - o.cy;
      var min = o.r + raio;
      var d2 = dx * dx + dy * dy;
      if (d2 < min * min) {
        var d = Math.sqrt(d2) || 0.001;
        ent.x = o.cx + (dx / d) * min;
        ent.y = o.cy + (dy / d) * min;
        if (ent.x < 8) ent.x = 8;
        if (ent.x > W - 8) ent.x = W - 8;
        if (ent.y < 10) ent.y = 10;
        if (ent.y > H - 8) ent.y = H - 8;
      }
    }
  }

  function mover(ent, ddx, ddy, raio) {
    ent.x += ddx;
    resolve(ent, raio);
    ent.y += ddy;
    resolve(ent, raio);
  }

  // ------------------------------------------------------------- setup
  function iniciar() {
    mapa = 1;
    garanteCenario();

    // a batalha em memória pertence a este personagem: o estado gravado no
    // save é sempre o dele (evita misturar ondas de heróis diferentes)
    donoId = Game.personagem ? Game.personagem.id : null;

    var s = Personagem.status(Game.personagem);
    heroi = {
      x: W / 2, y: H / 2, facing: 1,
      anim: 'idle', frame: 0, frameT: 0,
      hp: s.hpMax, hpMax: s.hpMax, stats: s,
      atkT: 0, atkCd: 0, hitDone: true, inv: 1,
      morto: false, revT: 0
    };
    inimigos = [];
    nums = [];
    parts = [];
    magiasEstado = {};
    magiasVigentes = [];
    onda = 0;
    tOnda = 1.0;
    tFlash = 0;
    shake = 0;
    pausada = false;
  }

  function reiniciar() { iniciar(); }

  // Personagem dono da batalha em memória (null antes da primeira entrada
  // na jogatina). O save de estado é gravado por ele, não pelo personagem
  // em foco — na seleção os dois podem ser diferentes.
  function dono() { return donoId; }

  function alternarPausa() { pausada = !pausada; return pausada; }

  // Retoma a onda gravada no save (reabertura/progresso offline).
  // Sem teto aqui: valor absurdo vem de storage corrompido e é rejeitado
  // em Salvar.lerEstado (ONDA_MAX); onda legítima nunca chega perto disso.
  function restaurarOnda(n) {
    if (typeof n !== 'number' || !isFinite(n) || n < 1) return;
    onda = Math.max(0, Math.floor(n) - 1);
    tOnda = 0;
    inimigos = [];
    nums = [];
    parts = [];
  }

  // Retoma o mapa gravado no save (reabertura/progresso offline).
  function restaurarMapa(n) {
    if (typeof n !== 'number' || !isFinite(n) || n < 1) return;
    mapa = Math.floor(n);
    garanteCenario();
  }

  // Chefe do mapa derrubado: avança para o próximo (onda 1 de novo).
  function passaMapa() {
    mapa++;
    onda = 0;
    garanteCenario();
    tOnda = ESPERA_ONDA;
    numero(W / 2, 34, 'MAPA ' + mapa + ' — ' + Mapas.info(mapa).nome.toUpperCase(),
      '#8ce08c', true);
  }

  // Zera números/partículas depois de uma simulação offline.
  function limparEfeitos() {
    nums.length = 0;
    parts.length = 0;
    shake = 0;
    tFlash = 0;
  }

  // ----------------------------------------------------------- ondas
  // a onda FIM_MAPA de cada mapa é o chefe — vencido, passa de mapa
  function ehBoss(n) {
    return n === FIM_MAPA;
  }

  function proximaOnda() {
    if (onda >= FIM_MAPA) { passaMapa(); return; }   // limpo a onda 100
    onda++;
    var tem = Mapas.info(mapa);
    if (ehBoss(onda)) {
      // chefe + 2 minions do próprio mapa: a onda não espera um alvo só
      spawn(tem.boss);
      spawn(tem.inimigos.comum);
      spawn(tem.inimigos.raro);
      numero(W / 2, 34, 'BOSS! ' + tem.boss.nome, '#ff6b6b', true);
    } else {
      var n = Math.min(3 + Math.floor((onda - 1) / 2), 5);
      for (var k = 0; k < n; k++) {
        spawn((onda >= 3 && k % 3 === 2) ? tem.inimigos.raro : tem.inimigos.comum);
      }
      numero(W / 2, 34, 'ONDA ' + onda, '#e8c86a', true);
    }
  }

  // def: { tipo, cor?, escala?, forma? } — vindo de Mapas.info(mapa)
  function spawn(def) {
    var t = TIPOS[def.tipo] || TIPOS.slime;
    var raio = t.raio || 6;
    var x = W / 2, y = 10, tent = 0;
    do {
      var lado = Math.floor(Math.random() * 4);
      if (lado === 0) { x = 12 + Math.random() * (W - 24); y = 12; }
      else if (lado === 1) { x = 12 + Math.random() * (W - 24); y = H - 10; }
      else if (lado === 2) { x = 10; y = 12 + Math.random() * (H - 24); }
      else { x = W - 10; y = 12 + Math.random() * (H - 24); }
      tent++;
    } while (tent < 30 && colideObst(x, y, raio));

    // dificuldade escala por onda e por mapa (Mapas.forca) — a escala do
    // herói (+4 HP/nível +5 pontos/nível) é mais suave, senão vira loop
    var forca = Mapas.forca(mapa);
    var escHp = forca * (1 + (onda - 1) * ESC_HP);
    var escDmg = forca * (1 + (onda - 1) * ESC_DMG);
    // chefe: hp x4 e dano x1.5 sobre a escala da própria onda — desafiador,
    // mas derrotável (ele não regenera e o herói revive com vida cheia)
    var hp = Math.round(t.hp * escHp * (t.boss ? 4 : 1));
    inimigos.push({
      x: x, y: y, tipo: t,
      cor: def.cor || t.cor,
      escala: def.escala || t.escala || 1,
      forma: def.forma || t.forma || 'slime',
      hp: hp, hpMax: hp,
      dmg: Math.max(2, Math.round(t.dmg * escDmg * (t.boss ? 1.5 : 1))),
      // o chefe é pesado: não ganha a corrida de velocidade da onda
      vel: t.boss ? t.vel : t.vel + Math.min(12, onda),
      raio: raio,
      frame: 0, frameT: 0,
      atkCd: 0.5 + Math.random() * 0.8,
      hitFlash: 0, lunge: 0
    });
  }

  // -------------------------------------------------------- progressão
  function ganhaXP(qtd) {
    var p = Game.personagem;
    // guarda contra save corrompido (xpProx <= 0 travaria a aba em loop)
    if (!(p.xpProx > 0)) {
      p.xpProx = Personagem.custoProximo(Math.max(1, Math.floor(p.nivel) || 1));
    }
    // Carisma aumenta o XP ganho ("sorte nas recompensas")
    var mult = Personagem.status(p).xpMult || 1;
    p.xp += Math.max(1, Math.round(qtd * mult));
    while (p.xp >= p.xpProx) {
      p.xp -= p.xpProx;
      p.nivel++;
      p.pontos += 5;
      p.xpProx = Personagem.custoProximo(p.nivel);
      tFlash = 1.6;
      nivelFlash = p.nivel;
      if (heroi && !heroi.morto) heroi.hp = heroi.hpMax;
      numero(heroi ? heroi.x : W / 2, (heroi ? heroi.y : H / 2) - 34,
        'NIVEL ' + p.nivel + '!', '#ffd866', true);
      var nova = Magias.desbloqueada(p.classe, p.nivel);
      if (nova) {
        numero(heroi ? heroi.x : W / 2, (heroi ? heroi.y : H / 2) - 46,
          nova.nome + ' desbloqueada!', nova.cor, true);
      }
    }
  }

  // ----------------------------------------------------------- efeitos
  function numero(x, y, txt, cor, big) {
    nums.push({ x: x, y: y, txt: txt, color: cor, big: !!big, t: big ? 1.4 : 0.9 });
  }

  function faísca(x, y, cor, n) {
    for (var i = 0; i < n; i++) {
      parts.push({
        x: x, y: y,
        vx: (Math.random() - 0.5) * 90,
        vy: (Math.random() - 0.7) * 90,
        t: 0.3 + Math.random() * 0.2,
        color: cor
      });
    }
  }

  function danoHeroi(dmg) {
    if (heroi.morto) return;
    heroi.hp -= dmg;
    heroi.inv = 0.5;
    shake = 0.15;
    numero(heroi.x, heroi.y - 26, '-' + dmg, '#ff6b6b', false);
    if (heroi.hp <= 0) {
      heroi.hp = 0;
      heroi.morto = true;
      heroi.revT = 3;
      heroi.anim = 'idle';
      faísca(heroi.x, heroi.y - 10, '#ff6b6b', 14);
      numero(heroi.x, heroi.y - 36, 'CAIU...', '#ff6b6b', true);
    }
  }

  function mataInimigo(i, en) {
    faísca(en.x, en.y - 6, en.cor, 10);
    inimigos.splice(i, 1);
    // XP escala com o mapa: a onda volta a 1 a cada mapa, sem o multiplicador
    // a recompensa despenca e o nível trava
    var ganho = Math.round((4 + onda * 2 + en.tipo.xpExtra) * Mapas.forca(mapa));
    if (en.tipo.boss) {
      // recompensa de chefe: XP de várias ondas de uma vez
      ganho = Math.round(ganho * 5);
      numero(en.x, en.y - 40, 'BOSS DERROTADO!', '#ffd866', true);
    }
    numero(en.x, en.y - 24, '+' + ganho + ' XP', '#ffd866', false);
    ganhaXP(ganho);
    soltaItens(en);
    tOnda = ESPERA_ONDA;
  }

  // Drop do abate: equipa automaticamente se for melhor que o equipado;
  // senão vai para a bolsa (a mais antiga sai quando enche).
  function soltaItens(en) {
    var p = Game.personagem;
    if (!p || !p.equip || !p.bolsa) return;
    var drops = Itens.sorteiaDrop(mapa, !!en.tipo.boss);
    for (var i = 0; i < drops.length; i++) {
      var it = drops[i];
      var equipou = Itens.equiparSeMelhor(p, it);
      if (!equipou) Itens.guardar(p, it);
      numero(en.x, en.y - 34,
        equipou ? it.nome + '!' : '+' + it.nome,
        Itens.corRar(it.rar), false);
    }
  }

  function golpeia() {
    var st = heroi.stats;
    for (var i = inimigos.length - 1; i >= 0; i--) {
      var en = inimigos[i];
      var dx = en.x - heroi.x, dy = en.y - heroi.y;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d > st.alcance + 6) continue;

      var crit = Math.random() * 100 < st.crit;
      var dmg = st.dano + Math.floor(Math.random() * 3);
      if (crit) dmg *= 2;

      en.hp -= dmg;
      en.hitFlash = 0.12;
      if (d > 0.01) {
        en.x += (dx / d) * 4;
        en.y += (dy / d) * 4;
        resolve(en, en.raio || 6);
      }
      numero(en.x, en.y - 18, String(dmg), crit ? '#ffd866' : '#ffffff', crit);
      faísca(en.x, en.y - 6, crit ? '#ffd866' : '#ffffff', crit ? 8 : 4);

      if (en.hp > 0) aplicaVeneno(en, st);
      if (en.hp <= 0) mataInimigo(i, en);
    }

    // contadores das magias 'area': a cada N golpes, varredura em tudo
    for (var m = 0; m < magiasVigentes.length; m++) {
      var mg = magiasVigentes[m];
      if (mg.tipo !== 'area') continue;
      var est = estadoMagia(mg.id);
      est.cont++;
      if (est.cont % mg.aCada === 0) varredura(mg);
    }
  }

  // ----------------------------------------------------------- magias
  // Estado por magia (contador de golpes / timer). Criação preguiçosa:
  // trocar de classe no meio da luta reconta do zero.
  function estadoMagia(id) {
    if (!magiasEstado[id]) magiasEstado[id] = { cont: 0, t: 0 };
    return magiasEstado[id];
  }

  // Nuke/cura periódicos (rodando a cada frame com alvo em mãos).
  function magiasPeriodicas(dt, alvo) {
    for (var i = 0; i < magiasVigentes.length; i++) {
      var mg = magiasVigentes[i];
      if (mg.tipo !== 'nuke' && mg.tipo !== 'cura') continue;
      var st = estadoMagia(mg.id);
      st.t -= dt;
      if (st.t > 0) continue;
      st.t = mg.intervalo;
      if (mg.tipo === 'nuke') {
        if (!alvo) continue;
        var dmg = Math.max(1, Math.round(heroi.stats.dano * mg.mult) +
          Math.floor(Math.random() * 3));
        alvo.hp -= dmg;
        alvo.hitFlash = 0.15;
        numero(alvo.x, alvo.y - 30, mg.nome, mg.cor, true);
        numero(alvo.x, alvo.y - 18, String(dmg), '#ffffff', false);
        faísca(alvo.x, alvo.y - 6, mg.cor, 8);
        var idx = inimigos.indexOf(alvo);
        if (alvo.hp <= 0 && idx >= 0) mataInimigo(idx, alvo);
      } else if (!heroi.morto && heroi.hp < heroi.hpMax) {
        // cura só anuncia quando realmente cura
        var cura = Math.max(1, Math.round(heroi.hpMax * mg.pct));
        var antes = heroi.hp;
        heroi.hp = Math.min(heroi.hpMax, heroi.hp + cura);
        var ganho = Math.round(heroi.hp - antes);
        if (ganho > 0) {
          numero(heroi.x, heroi.y - 34, '+' + ganho, mg.cor, false);
          numero(heroi.x, heroi.y - 44, mg.nome, mg.cor, true);
        }
      }
    }
  }

  // Varredura da magia 'area': acerta todos os inimigos.
  function varredura(mg) {
    var st = heroi.stats;
    numero(heroi.x, heroi.y - 44, mg.nome, mg.cor, true);
    for (var i = inimigos.length - 1; i >= 0; i--) {
      var en = inimigos[i];
      var dmg = Math.max(1, Math.round(st.dano * mg.mult) +
        Math.floor(Math.random() * 3));
      en.hp -= dmg;
      en.hitFlash = 0.12;
      numero(en.x, en.y - 18, String(dmg), mg.cor, false);
      faísca(en.x, en.y - 6, mg.cor, 6);
      if (en.hp <= 0) mataInimigo(i, en);
    }
  }

  // Veneno (magia do ladino): chance por acerto aplica dano contínuo.
  // Recolocar o veneno renova a duração (dps congelado no valor do hit).
  function aplicaVeneno(en, st) {
    for (var i = 0; i < magiasVigentes.length; i++) {
      var mg = magiasVigentes[i];
      if (mg.tipo !== 'veneno') continue;
      if (Math.random() >= mg.chance) continue;
      en.veneno = {
        t: mg.dur,
        dps: Math.max(1, Math.round(st.dano * mg.dps)),
        acc: 0,
        cor: mg.cor
      };
      numero(en.x, en.y - 30, mg.nome, mg.cor, false);
    }
  }

  // ----------------------------------------------------------- update
  function anima(ent, anim, dt) {
    ent.anim = anim;
    ent.frameT += dt;
    if (anim === 'walk') {
      if (ent.frameT > 0.12) { ent.frameT = 0; ent.frame = (ent.frame + 1) % 4; }
    } else {
      if (ent.frameT > 0.35) { ent.frameT = 0; ent.frame = (ent.frame + 1) % 2; }
    }
  }

  function atualizaHeroi(dt) {
    var h = heroi;

    // stats vivos: classe e atributos podem mudar durante a luta
    var s = Personagem.status(Game.personagem);
    h.stats = s;
    if (s.hpMax !== h.hpMax) {
      h.hpMax = s.hpMax;
      if (h.hp > h.hpMax) h.hp = h.hpMax;
    }
    // magias ativas (classe/nível podem mudar em combate)
    magiasVigentes = Magias.ativas(Game.personagem.classe, Game.personagem.nivel);

    if (h.atkCd > 0) h.atkCd -= dt;
    if (h.inv > 0) h.inv -= dt;

    // alvo: inimigo vivo mais próximo
    var alvo = null, melhor = Infinity;
    for (var i = 0; i < inimigos.length; i++) {
      var e = inimigos[i];
      var dx = e.x - h.x, dy = e.y - h.y;
      var d2 = dx * dx + dy * dy;
      if (d2 < melhor) { melhor = d2; alvo = e; }
    }

    // magias com timer (nuke/cura) — antes do ciclo de ataque
    magiasPeriodicas(dt, alvo);

    var atacando = h.atkT > 0;
    if (atacando) {
      h.atkT -= dt;
      var e2 = 0.36 - Math.max(0, h.atkT);
      h.anim = 'attack';
      h.frame = Math.max(0, Math.min(2, Math.floor(e2 / 0.12)));
      if (!h.hitDone && e2 >= 0.10) { h.hitDone = true; golpeia(); }
      if (h.atkT <= 0) h.atkT = 0;
    }

    if (!atacando) {
      if (alvo) {
        var dx2 = alvo.x - h.x, dy2 = alvo.y - h.y;
        var dist = Math.sqrt(melhor) || 1;
        var alc = h.stats.alcance;
        if (Math.abs(dx2) > 2) h.facing = dx2 > 0 ? 1 : -1;

        if (dist > alc * 0.75) {
          // fora de alcance: só se aproxima — nunca golpeia o ar
          var passo = h.stats.vel * dt;
          mover(h, (dx2 / dist) * passo, (dy2 / dist) * passo, 6);
          anima(h, 'walk', dt);
        } else {
          anima(h, 'idle', dt);
          if (h.atkCd <= 0) {
            h.atkT = 0.36;
            // a Velocidade do herói também acelera o golpe
            h.atkCd = h.stats.recarga;
            h.hitDone = false;
          }
        }
      } else {
        anima(h, 'idle', dt);
      }
    }

    // regeneração constante (espírito idle)
    h.hp = Math.min(h.hpMax, h.hp + 2 * dt);
  }

  function atualizaInimigos(dt) {
    // de trás pra frente: o veneno pode matar e remover no meio do laço
    for (var i = inimigos.length - 1; i >= 0; i--) {
      var en = inimigos[i];
      en.frameT += dt;
      if (en.frameT > 0.3) { en.frameT = 0; en.frame = en.frame ? 0 : 1; }
      if (en.hitFlash > 0) en.hitFlash -= dt;
      if (en.atkCd > 0) en.atkCd -= dt;
      if (en.lunge > 0) en.lunge -= dt;

      // dano contínuo do veneno (magia do ladino)
      if (en.veneno) {
        en.veneno.t -= dt;
        en.veneno.acc += en.veneno.dps * dt;
        if (en.veneno.acc >= 1) {
          var v = Math.floor(en.veneno.acc);
          en.veneno.acc -= v;
          en.hp -= v;
          en.hitFlash = 0.1;
          numero(en.x, en.y - 14, String(v), en.veneno.cor, false);
          if (en.hp <= 0) {
            mataInimigo(i, en);
            continue;
          }
        }
        if (en.veneno.t <= 0) en.veneno = null;
      }

      var alvoX, alvoY;
      if (heroi.morto) {
        alvoX = W / 2; alvoY = H / 2;  // herói caído: inimigos voltam ao centro
      } else {
        alvoX = heroi.x; alvoY = heroi.y;
      }
      var vx = alvoX - en.x, vy = alvoY - en.y;
      var dist = Math.sqrt(vx * vx + vy * vy) || 1;

      if (heroi.morto) {
        if (dist > 20) mover(en, (vx / dist) * en.vel * 0.5 * dt,
          (vy / dist) * en.vel * 0.5 * dt, en.raio || 6);
      } else if (dist > 13) {
        mover(en, (vx / dist) * en.vel * dt,
          (vy / dist) * en.vel * dt, en.raio || 6);
      } else if (en.atkCd <= 0) {
        en.atkCd = 1.4;
        en.lunge = 0.18;
        if (heroi.inv <= 0) danoHeroi(en.dmg);
      }
    }
  }

  function atualizar(dt) {
    if (pausada || !heroi) return;

    if (shake > 0) shake -= dt;
    if (tFlash > 0) tFlash -= dt;

    if (heroi.morto) {
      heroi.revT -= dt;
      heroi.anim = 'idle';
      if (heroi.revT <= 0) {
        heroi.morto = false;
        heroi.hp = heroi.hpMax;
        heroi.x = W / 2;
        heroi.y = H / 2;
        heroi.inv = 1.2;
        numero(heroi.x, heroi.y - 26, 'DE VOLTA!', '#8ce08c', true);
      }
    } else {
      atualizaHeroi(dt);
    }

    atualizaInimigos(dt);

    // ondas
    if (inimigos.length === 0 && !heroi.morto) {
      tOnda -= dt;
      if (tOnda <= 0) proximaOnda();
    }

    for (var i = parts.length - 1; i >= 0; i--) {
      var pa = parts[i];
      pa.x += pa.vx * dt;
      pa.y += pa.vy * dt;
      pa.vy += 200 * dt;
      pa.t -= dt;
      if (pa.t <= 0) parts.splice(i, 1);
    }
    for (i = nums.length - 1; i >= 0; i--) {
      nums[i].y -= 24 * dt;
      nums[i].t -= dt;
      if (nums[i].t <= 0) nums.splice(i, 1);
    }
  }

  // ----------------------------------------------------------- desenho
  function desenhaObst(ctx, o) {
    if (o.tipo === 'tree') {
      var t = Anim.tree();
      ctx.drawImage(t.canvas, Math.round(o.x - 10), Math.round(o.y - 26), 20, 26);
    } else {
      var r = Anim.rock();
      ctx.drawImage(r.canvas, Math.round(o.x - 7), Math.round(o.y - 11), 14, 11);
    }
  }

  function sombra(ctx, x, y, rx) {
    ctx.fillStyle = 'rgba(0,0,0,0.26)';
    ctx.beginPath();
    ctx.ellipse(x, y, rx, rx * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function desenhaHeroi(ctx) {
    var look = Personagem.lookDe(Game.personagem);
    var c = Anim.hero(look, heroi.anim, heroi.frame);
    sombra(ctx, heroi.x, heroi.y - 1, 8);
    if (heroi.morto) return;
    if (heroi.inv > 0 && Math.floor(heroi.inv * 16) % 2 === 0) ctx.globalAlpha = 0.45;
    ctx.drawImage(c.canvas, Math.round(heroi.x - 8), Math.round(heroi.y - 20), c.w, c.h);
    ctx.globalAlpha = 1;
  }

  function spriteInimigo(en) {
    if (en.forma === 'morcego') return Anim.morcego(en.cor, en.frame);
    if (en.forma === 'aranha') return Anim.aranha(en.cor, en.frame);
    return Anim.slime(en.cor, en.frame);
  }

  function desenhaInimigo(ctx, en) {
    var esc = en.escala;
    var c = spriteInimigo(en);
    sombra(ctx, en.x, en.y - 1, 9 * esc);
    var pulso = en.lunge > 0 ? 1.15 : 1;
    if (en.hitFlash > 0 && Math.floor(en.hitFlash * 40) % 2 === 0) ctx.globalAlpha = 0.45;
    var w = Math.round(14 * esc), h = Math.round(12 * esc * pulso);
    ctx.drawImage(c.canvas, Math.round(en.x - w / 2),
      Math.round(en.y - h - (pulso - 1) * 8), w, h);
    ctx.globalAlpha = 1;
    if (en.hp < en.hpMax) {
      // 3px: o contorno de 1px (quando existe) não pode cobrir a barra toda
      var bw = Math.round(16 * esc);
      UI.bar(Math.round(en.x - bw / 2), Math.round(en.y - 18 * esc), bw, 3,
        en.hp / en.hpMax, '#d84a4a');
    }
  }

  // desenha a arena dentro do retângulo (vx, vy, vw, vh) da tela
  function desenhar(ctx, vx, vy, vw, vh) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(vx, vy, vw, vh);
    ctx.clip();
    ctx.fillStyle = '#0d0b14';
    ctx.fillRect(vx, vy, vw, vh);
    ctx.translate(vx, vy);

    if (shake > 0) {
      ctx.translate((Math.random() * 3 - 1.5) | 0, (Math.random() * 3 - 1.5) | 0);
    }

    ctx.drawImage(chao, 0, 0);

    // profundidade: obstáculos e entidades ordenados pelos pés
    var cena = [];
    var i;
    for (i = 0; i < obst.length; i++) cena.push({ y: obst[i].y, t: 1, o: obst[i] });
    for (i = 0; i < inimigos.length; i++) cena.push({ y: inimigos[i].y, t: 2, e: inimigos[i] });
    cena.push({ y: heroi.y, t: 3 });
    cena.sort(function (a, b) { return a.y - b.y; });

    for (i = 0; i < cena.length; i++) {
      var it = cena[i];
      if (it.t === 1) desenhaObst(ctx, it.o);
      else if (it.t === 2) desenhaInimigo(ctx, it.e);
      else desenhaHeroi(ctx);
    }

    for (i = 0; i < parts.length; i++) {
      var pa = parts[i];
      ctx.fillStyle = pa.color;
      ctx.fillRect(Math.round(pa.x), Math.round(pa.y), 2, 2);
    }

    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (i = 0; i < nums.length; i++) {
      var n = nums[i];
      ctx.fillStyle = '#1b1424';
      ctx.fillText(n.txt, Math.round(n.x) + 1, Math.round(n.y) + 1);
      ctx.fillStyle = n.color;
      ctx.fillText(n.txt, Math.round(n.x), Math.round(n.y));
    }

    ctx.restore();

    // ---- HUD do herói (espaço de tela, por cima da arena)
    UI.bar(vx + 4, vy + 4, 54, 6, heroi.hp / heroi.hpMax, '#d84a4a');
    UI.text(Math.ceil(heroi.hp) + '/' + heroi.hpMax, vx + 62, vy + 7, {
      color: '#ffffff', font: 'bold 8px monospace'
    });
    UI.text('Onda ' + onda + ' (' + inimigos.length + ')',
      vx + vw - 4, vy + 7, { align: 'right', color: '#e8c86a' });

    if (heroi.morto) {
      ctx.fillStyle = 'rgba(5,3,10,0.5)';
      ctx.fillRect(vx, vy + vh / 2 - 12, vw, 24);
      UI.text('CAIU — revivendo em ' + Math.max(1, Math.ceil(heroi.revT)) + 's',
        vx + vw / 2, vy + vh / 2, { align: 'center', color: '#ff6b6b' });
    }

    if (tFlash > 0) {
      ctx.globalAlpha = Math.min(1, tFlash);
      UI.text('NIVEL ' + nivelFlash + '!', vx + vw / 2, vy + vh / 2 - 4, {
        align: 'center', color: '#ffd866', font: 'bold 8px monospace'
      });
      ctx.globalAlpha = 1;
    }

    if (pausada) {
      ctx.fillStyle = 'rgba(5,3,10,0.55)';
      ctx.fillRect(vx, vy, vw, vh);
      UI.text('PAUSADO', vx + vw / 2, vy + vh / 2, {
        align: 'center', color: '#e8c86a', font: 'bold 8px monospace'
      });
    }
  }

  function info() {
    var p = Game.personagem;
    var boss = false;
    for (var i = 0; i < inimigos.length; i++) {
      if (inimigos[i].tipo.boss) { boss = true; break; }
    }
    return {
      mapa: mapa,
      onda: onda,
      inimigos: inimigos.length,
      boss: boss,
      pausada: pausada,
      morto: heroi ? heroi.morto : false,
      hp: heroi ? Math.ceil(heroi.hp) : 0,
      xp: p.xp,
      nivel: p.nivel,
      pontos: p.pontos
    };
  }

  return {
    iniciar: iniciar,
    reiniciar: reiniciar,
    dono: dono,
    atualizar: atualizar,
    desenhar: desenhar,
    alternarPausa: alternarPausa,
    restaurarMapa: restaurarMapa,
    restaurarOnda: restaurarOnda,
    limparEfeitos: limparEfeitos,
    info: info
  };
})();
