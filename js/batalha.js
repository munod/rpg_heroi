// Batalha automática (idle): o herói mira, anda e ataca sozinho.
// O jogador não controla nada aqui — só assiste e administra o personagem.
var Batalha = (function () {
  var VW = 192, VH = 134;       // janela da arena no painel (não muda)
  var MW = 384, MH = 268;       // mundo 2×; a câmera desliza sobre ele
  var cam = { x: 0, y: 0 };     // posição da janela no mundo
  var morte = { x: 0, y: 0 };   // onde o herói caiu (inimigos miram aqui)

  var chao = null;
  var obst = [];
  var heroi = null;
  var inimigos = [];
  var nums = [];
  var parts = [];
  var poeira = [];       // pó ambiente da arena (visual só)
  var onda = 0;
  var tOnda = 1.0;                // espera até a próxima onda
  var tFlash = 0;                 // flash de "NÍVEL X!"
  var nivelFlash = 0;
  var shake = 0;
  var pausada = false;
  var donoId = null;         // personagem dono da batalha em memória
  var mapa = 1;              // mapa atual (ciclo de FIM_MAPA ondas)
  var cenarioMapa = 0;       // mapa para o qual chao/obst já foram construídos
  var skillsVigentes = [];    // skills ativas do herói (recomputadas por frame)
  var skillsEstado = {};      // contadores/timers por skill (zerado em iniciar)
  var ultimaSkill = null;     // última skill de posicionamento/medo disparada

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
    chao.width = MW;
    chao.height = MH;
    var c = chao.getContext('2d');

    c.fillStyle = tema.chao.base;
    c.fillRect(0, 0, MW, MH);

    var T = 16;
    for (var y = 0; y < MH; y += T) {
      for (var x = 0; x < MW; x += T) {
        c.fillStyle = ((x / T + y / T) % 2 === 0) ? tema.chao.par : tema.chao.imp;
        c.fillRect(x, y, T, T);
      }
    }

    for (var i = 0; i < 36; i++) {
      c.fillStyle = tema.chao.mancha[i % 2];
      c.beginPath();
      c.ellipse(Math.random() * MW, Math.random() * MH,
        8 + Math.random() * 14, 5 + Math.random() * 7, 0, 0, Math.PI * 2);
      c.fill();
    }

    var flores = tema.chao.flores;
    for (i = 0; flores.length && i < 30; i++) {
      c.fillStyle = flores[i % flores.length];
      c.fillRect((Math.random() * MW) | 0, (Math.random() * MH) | 0, 2, 2);
    }

    // pedrinhas e rachaduras: textura dura em fillRect puro
    c.fillStyle = tema.chao.borda2;
    for (i = 0; i < 26; i++) {
      c.fillRect((Math.random() * MW) | 0, (Math.random() * MH) | 0,
        Math.random() < 0.35 ? 2 : 1, 1);
    }
    c.fillStyle = tema.chao.imp;
    for (i = 0; i < 20; i++) {
      c.fillRect((Math.random() * MW) | 0, (Math.random() * MH) | 0, 2, 1);
    }

    c.strokeStyle = tema.chao.borda;
    c.lineWidth = 8;
    c.strokeRect(4, 4, MW - 8, MH - 8);
    c.strokeStyle = tema.chao.borda2;
    c.lineWidth = 2;
    c.strokeRect(4, 4, MW - 8, MH - 8);
  }

  function constroiObst(tema) {
    // coordenadas valem na base 192×134 (ver mapas.js) e são escaladas
    // para o mundo — os sprites de obstáculo NÃO escalam (só a posição)
    var ex = MW / 192, ey = MH / 134;
    obst = [];
    for (var i = 0; i < tema.obst.length; i++) {
      var o = tema.obst[i];
      obst.push({
        x: o.x * ex, y: o.y * ey, r: o.r, tipo: o.tipo,
        cx: o.cx * ex, cy: o.cy * ey
      });
    }
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
    if (ent.x > MW - 8) ent.x = MW - 8;
    if (ent.y < 10) ent.y = 10;
    if (ent.y > MH - 8) ent.y = MH - 8;

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
        if (ent.x > MW - 8) ent.x = MW - 8;
        if (ent.y < 10) ent.y = 10;
        if (ent.y > MH - 8) ent.y = MH - 8;
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
      x: MW / 2, y: MH / 2, facing: 1,
      anim: 'idle', frame: 0, frameT: 0,
      hp: s.hpMax, hpMax: s.hpMax, stats: s,
      atkT: 0, atkCd: 0, hitDone: true, inv: 1, fuga: null,
      morto: false, revT: 0
    };
    var c0 = alvoCamera();
    cam.x = c0.x;
    cam.y = c0.y;
    inimigos = [];
    nums = [];
    parts = [];
    semearPoeira();
    skillsEstado = {};
    skillsVigentes = [];
    ultimaSkill = null;
    onda = 0;
    tOnda = 1.0;
    tFlash = 0;
    shake = 0;
    pausada = false;
  }

  function reiniciar() { iniciar(); }

  // Pó ambiente: motes lentos que sobem e dão a volta no mundo. Semente
  // única em iniciar() — atualizar só move (simulação offline não aloca).
  function semearPoeira() {
    poeira = [];
    for (var i = 0; i < 36; i++) {
      poeira.push({
        x: Math.random() * MW, y: Math.random() * MH,
        vx: (Math.random() - 0.5) * 3, vy: -(1 + Math.random() * 2),
        fase: Math.random() * 6, tam: Math.random() < 0.3 ? 2 : 1
      });
    }
  }

  // Personagem dono da batalha em memória (null antes da primeira entrada
  // na jogatina). O save de estado é gravado por ele, não pelo personagem
  // em foco — na seleção os dois podem ser diferentes.
  function dono() { return donoId; }

  function alternarPausa() { pausada = !pausada; return pausada; }

  // ------------------------------------------------------------- câmera
  // Alvo: herói centralizado, presa nos limites do mundo.
  function alvoCamera() {
    return {
      x: Math.max(0, Math.min(MW - VW, heroi.x - VW / 2)),
      y: Math.max(0, Math.min(MH - VH, heroi.y - VH / 2))
    };
  }

  // Suaviza o deslize (lerp); teleporte grande (renascimento) trava na
  // hora para a câmera não viajar pela tela inteira.
  function atualizaCamera(dt) {
    var alvo = alvoCamera();
    var dx = alvo.x - cam.x, dy = alvo.y - cam.y;
    if (dx * dx + dy * dy > 96 * 96) {
      cam.x = alvo.x;
      cam.y = alvo.y;
      return;
    }
    var k = Math.min(1, dt * 12);
    cam.x += dx * k;
    cam.y += dy * k;
  }

  // Aviso grande (onda/chefe/mapa) ancorado no centro da janela atual —
  // nums vive em coordenadas de mundo, e a câmera muda.
  function aviso(txt, cor) {
    // em espaço de mundo: 34 un. = 25% da janela visível (≈68px na tela
    // com k=2), a mesma altura de sempre
    numero(cam.x + VW / 2, cam.y + 34, txt, cor, true);
  }

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
    aviso('MAPA ' + mapa + ' — ' + Mapas.info(mapa).nome.toUpperCase(),
      '#8ce08c');
  }

  // Zera números/partículas depois de uma simulação offline.
  function limparEfeitos() {
    nums.length = 0;
    parts.length = 0;
    Efeitos.limpar();
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
      aviso('BOSS! ' + tem.boss.nome, '#ff6b6b');
    } else {
      var n = Math.min(3 + Math.floor((onda - 1) / 2), 5);
      for (var k = 0; k < n; k++) {
        spawn((onda >= 3 && k % 3 === 2) ? tem.inimigos.raro : tem.inimigos.comum);
      }
      aviso('ONDA ' + onda, '#e8c86a');
    }
  }

  // def: { tipo, cor?, escala?, forma? } — vindo de Mapas.info(mapa)
  function spawn(def) {
    var t = TIPOS[def.tipo] || TIPOS.slime;
    var raio = t.raio || 6;
    // nasce fora da janela, ao redor do herói: mantém o ritmo das ondas
    // (nas bordas do mundo grande o inimigo levaria uma eternidade p/ chegar)
    var fora = 110;                                // ~fora da tela do herói
    var x = heroi.x, y = heroi.y, dx = 0, dy = 0, tent = 0;
    do {
      var ang = Math.random() * Math.PI * 2;
      var dist = fora + Math.random() * 22;        // 110..132px do herói
      x = Math.max(14, Math.min(MW - 14, heroi.x + Math.cos(ang) * dist));
      y = Math.max(14, Math.min(MH - 14, heroi.y + Math.sin(ang) * dist));
      dx = x - heroi.x;
      dy = y - heroi.y;
      tent++;
    } while (tent < 30 && (colideObst(x, y, raio) ||
      dx * dx + dy * dy < (fora - 8) * (fora - 8)));
    if (tent >= 30 && dx * dx + dy * dy < (fora - 8) * (fora - 8)) {
      // herói grudado na parede: canto oposto ao agrupamento (quase nunca)
      x = heroi.x < MW / 2 ? MW - 14 : 14;
      y = heroi.y < MH / 2 ? MH - 14 : 14;
    }

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
      hitFlash: 0, lunge: 0,
      medo: null, empurra: null
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
      numero(heroi ? heroi.x : MW / 2, (heroi ? heroi.y : MH / 2) - 34,
        'NIVEL ' + p.nivel + '!', '#ffd866', true);
      Efeitos.explosao(heroi ? heroi.x : MW / 2,
        (heroi ? heroi.y : MH / 2) - 12, '#ffd866', 1.1);
      var nova = Skills.desbloqueada(p.classe, p.nivel);
      if (nova) {
        numero(heroi ? heroi.x : MW / 2, (heroi ? heroi.y : MH / 2) - 46,
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
      morte.x = heroi.x;      // inimigos se agrupam onde ele caiu
      morte.y = heroi.y;
      heroi.anim = 'idle';
      faísca(heroi.x, heroi.y - 10, '#ff6b6b', 14);
      numero(heroi.x, heroi.y - 36, 'CAIU...', '#ff6b6b', true);
    }
  }

  // Renascimento: sorteia no mundo, longe de obstáculos e de inimigos;
  // depois de 30 tentativas, cai no centro (quase nunca acontece).
  function posicaoAleatoriaSegura() {
    for (var tent = 0; tent < 30; tent++) {
      var x = 16 + Math.random() * (MW - 32);
      var y = 16 + Math.random() * (MH - 32);
      if (colideObst(x, y, 8)) continue;
      var perto = false;
      for (var i = 0; i < inimigos.length; i++) {
        var dx = inimigos[i].x - x, dy = inimigos[i].y - y;
        if (dx * dx + dy * dy < 40 * 40) { perto = true; break; }
      }
      if (!perto) return { x: x, y: y };
    }
    return { x: MW / 2, y: MH / 2 };
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

  // Um golpe do herói: corpo a corpo varre no alcance; as classes à
  // distância (mago/ladino/clérigo) mandam um projétil para o inimigo
  // vivo mais perto e o dano cai na chegada — mesmos cálculos de crítico,
  // veneno e empurrão do golpe normal.
  function golpeia() {
    var st = heroi.stats;
    var cl = Personagem.CLASSES[Game.personagem.classe] ||
      Personagem.CLASSES.guerreiro;
    if (cl.distancia) golpeDistancia(st, cl);
    else golpeCorpo(st);

    // contadores das skills 'area': a cada N golpes, varredura em tudo
    for (var m = 0; m < skillsVigentes.length; m++) {
      var mg = skillsVigentes[m];
      if (mg.tipo !== 'area') continue;
      var est = estadoSkill(mg.id);
      est.cont++;
      if (est.cont % mg.aCada === 0) varredura(mg);
    }
  }

  // Golpe corpo a corpo (padrão): dano instantâneo em quem estiver no
  // alcance — o caminho do guerreiro.
  function golpeCorpo(st) {
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
  }

  // Ataque à distância: um projétil por golpe. alvo/dmg/crit são
  // capturados pelo callback POR VALOR — o alvo pode morrer durante o voo.
  function golpeDistancia(st, cl) {
    var alvo = null;
    var melhor = Infinity;
    var alc2 = (st.alcance + 6) * (st.alcance + 6);
    for (var i = 0; i < inimigos.length; i++) {
      var dx = inimigos[i].x - heroi.x, dy = inimigos[i].y - heroi.y;
      var d2 = dx * dx + dy * dy;
      if (d2 <= alc2 && d2 < melhor) { melhor = d2; alvo = inimigos[i]; }
    }
    if (!alvo) return;

    var crit = Math.random() * 100 < st.crit;
    var dmg = st.dano + Math.floor(Math.random() * 3);
    if (crit) dmg *= 2;
    Efeitos.missil({ x: heroi.x, y: heroi.y - 16 }, alvo, cl.corProj, 0.9,
      function () {
        var idx = inimigos.indexOf(alvo);
        if (idx < 0) return;              // alvo morreu durante o voo
        alvo.hp -= dmg;
        alvo.hitFlash = 0.12;
        var ddx = alvo.x - heroi.x, ddy = alvo.y - heroi.y;
        var d = Math.sqrt(ddx * ddx + ddy * ddy);
        if (d > 0.01) {
          alvo.x += (ddx / d) * 4;
          alvo.y += (ddy / d) * 4;
          resolve(alvo, alvo.raio || 6);
        }
        numero(alvo.x, alvo.y - 18, String(dmg),
          crit ? '#ffd866' : '#ffffff', crit);
        faísca(alvo.x, alvo.y - 6, crit ? '#ffd866' : '#ffffff', crit ? 8 : 4);
        if (alvo.hp > 0) aplicaVeneno(alvo, st);
        if (alvo.hp <= 0) mataInimigo(idx, alvo);
      });
  }

  // ----------------------------------------------------------- skills
  // Estado por skill (contador de golpes / timer). Criação preguiçosa:
  // trocar de classe no meio da luta reconta do zero.
  function estadoSkill(id) {
    if (!skillsEstado[id]) skillsEstado[id] = { cont: 0, t: 0 };
    return skillsEstado[id];
  }

  // Nuke vira missil teleguiado: clarão no conjuro, rastro no voo e o
  // dano só cai na chegada (callback). mg/alvo são PARÂMETROS — o
  // closure captura valores por invocação (não a variável do laço).
  function conjuraNuke(mg, alvo) {
    var mult = mg.mult;
    numero(heroi.x, heroi.y - 30, mg.nome, mg.cor, true);
    Efeitos.brasas(heroi.x, heroi.y - 12, mg.cor, 5, 40, 45);   // clarão
    Efeitos.missil({ x: heroi.x, y: heroi.y - 16 }, alvo, mg.cor,
      1 + (mult - 1) * 0.6,
      function () {
        var idx = inimigos.indexOf(alvo);
        if (idx < 0) return;              // alvo morreu durante o voo
        var dmg = Math.max(1, Math.round(heroi.stats.dano * mult) +
          Math.floor(Math.random() * 3));
        alvo.hp -= dmg;
        alvo.hitFlash = 0.15;
        shake = Math.max(shake, 0.08);
        numero(alvo.x, alvo.y - 18, String(dmg), '#ffffff', false);
        faísca(alvo.x, alvo.y - 6, mg.cor, 6);
        if (alvo.hp <= 0) mataInimigo(idx, alvo);
      });
  }

  // Nuke/cura periódicos (rodando a cada frame com alvo em mãos).
  function skillsPeriodicas(dt, alvo) {
    for (var i = 0; i < skillsVigentes.length; i++) {
      var mg = skillsVigentes[i];
      if (mg.tipo !== 'nuke' && mg.tipo !== 'cura') continue;
      var st = estadoSkill(mg.id);
      st.t -= dt;
      if (st.t > 0) continue;
      st.t = mg.intervalo;
      if (mg.tipo === 'nuke') {
        if (!alvo) continue;
        conjuraNuke(mg, alvo);
      } else if (!heroi.morto && heroi.hp < heroi.hpMax) {
        // cura só anuncia quando realmente cura
        var cura = Math.max(1, Math.round(heroi.hpMax * mg.pct));
        var antes = heroi.hp;
        heroi.hp = Math.min(heroi.hpMax, heroi.hp + cura);
        var ganho = Math.round(heroi.hp - antes);
        if (ganho > 0) {
          Efeitos.cura(heroi.x, heroi.y - 6, mg.cor);
          numero(heroi.x, heroi.y - 34, '+' + ganho, mg.cor, false);
          numero(heroi.x, heroi.y - 44, mg.nome, mg.cor, true);
        }
      }
    }
  }

  // Varredura da skill 'area': acerta todos os inimigos.
  function varredura(mg) {
    var st = heroi.stats;
    numero(heroi.x, heroi.y - 44, mg.nome, mg.cor, true);
    Efeitos.corte(heroi.x, heroi.y - 10, mg.cor, 1 + (mg.mult - 1) * 0.8);
    shake = Math.max(shake, 0.1 + (mg.mult - 1) * 0.1);
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

  // Veneno (skill do ladino): chance por acerto aplica dano contínuo.
  // Recolocar o veneno renova a duração (dps congelado no valor do hit).
  function aplicaVeneno(en, st) {
    for (var i = 0; i < skillsVigentes.length; i++) {
      var mg = skillsVigentes[i];
      if (mg.tipo !== 'veneno') continue;
      if (Math.random() >= mg.chance) continue;
      en.veneno = {
        t: mg.dur,
        dps: Math.max(1, Math.round(st.dano * mg.dps)),
        acc: 0,
        cor: mg.cor
      };
      Efeitos.brasas(en.x, en.y - 8, mg.cor, 5, 60, 45);
      numero(en.x, en.y - 30, mg.nome, mg.cor, false);
    }
  }

  // Skills de posicionamento e medo: gatilho DEFENSIVO — o bando
  // chegando perto do herói dispara, com cooldown próprio (st.t). Roda
  // antes da IA dos inimigos, dentro do atualizaHeroi.
  function skillsPosicionamento(dt) {
    if (heroi.morto) return;
    for (var i = 0; i < skillsVigentes.length; i++) {
      var sk = skillsVigentes[i];
      if (sk.tipo !== 'mobilidade' && sk.tipo !== 'medo') continue;
      var st = estadoSkill(sk.id);
      st.t -= dt;
      if (st.t > 0) continue;
      var perto = false;
      for (var j = 0; j < inimigos.length; j++) {
        var dx = inimigos[j].x - heroi.x, dy = inimigos[j].y - heroi.y;
        if (dx * dx + dy * dy <= sk.gatilho * sk.gatilho) { perto = true; break; }
      }
      if (!perto) continue;
      st.t = sk.intervalo;
      ultimaSkill = sk.id;
      if (sk.tipo === 'medo') aplicaMedo(sk);
      else if (sk.modo === 'empurra') empurra(sk);
      else foge(sk);
    }
  }

  // Empurrão (guerreiro): arremessa o bando para longe em curta rajada —
  // o inimigo empurrado não reage à IA durante o voo.
  function empurra(sk) {
    numero(heroi.x, heroi.y - 44, sk.nome, sk.cor, true);
    Efeitos.corte(heroi.x, heroi.y - 10, sk.cor, 1.5);
    shake = Math.max(shake, 0.12);
    var r2 = sk.alcance * sk.alcance;
    for (var i = 0; i < inimigos.length; i++) {
      var en = inimigos[i];
      var dx = en.x - heroi.x, dy = en.y - heroi.y;
      if (dx * dx + dy * dy > r2) continue;
      var d = Math.sqrt(dx * dx + dy * dy) || 1;
      en.empurra = { t: sk.dur,
        vx: (dx / d) * sk.impulso, vy: (dy / d) * sk.impulso };
      Efeitos.brasas(en.x, en.y - 6, sk.cor, 4, 60, 50);
    }
  }

  // Esquiva (ladino: corrida curta) e Teleporte (mago: salto instantâneo):
  // levam o herói para longe do centro do bando, respeitando limites e
  // obstáculos do mundo.
  function foge(sk) {
    var sx = 0, sy = 0, n = 0;
    for (var i = 0; i < inimigos.length; i++) {
      var en = inimigos[i];
      var dx = en.x - heroi.x, dy = en.y - heroi.y;
      if (dx * dx + dy * dy <= 64 * 64) { sx += dx; sy += dy; n++; }
    }
    if (!n) return;   // o gatilho viu alguém; o bando saiu do raio (raro)
    var d = Math.sqrt(sx * sx + sy * sy) || 1;
    var ux = -sx / d, uy = -sy / d;          // direção oposta ao bando
    numero(heroi.x, heroi.y - 44, sk.nome, sk.cor, true);
    if (sk.modo === 'blink') {
      Efeitos.explosao(heroi.x, heroi.y - 10, sk.cor, 0.9);
      heroi.x = Math.max(8, Math.min(MW - 8, heroi.x + ux * sk.distancia));
      heroi.y = Math.max(10, Math.min(MH - 8, heroi.y + uy * sk.distancia));
      resolve(heroi, 6);
      Efeitos.explosao(heroi.x, heroi.y - 10, sk.cor, 1.1);
      Efeitos.brasas(heroi.x, heroi.y - 6, sk.cor, 8, 90, 60);
    } else {
      // esquiva: rajada curta — corre por sk.distancia em 0,18s
      heroi.fuga = { t: 0.18, vx: ux * sk.distancia / 0.18,
                     vy: uy * sk.distancia / 0.18 };
      Efeitos.corte(heroi.x, heroi.y - 10, sk.cor, 0.9);
    }
  }

  // Amedronta (clérigo): os inimigos no raio fogem por sk.dur segundos —
  // correm para longe e não atacam enquanto durar o medo.
  function aplicaMedo(sk) {
    numero(heroi.x, heroi.y - 44, sk.nome, sk.cor, true);
    Efeitos.explosao(heroi.x, heroi.y - 10, sk.cor, 1.0);
    shake = Math.max(shake, 0.08);
    var r2 = sk.alcance * sk.alcance;
    for (var i = 0; i < inimigos.length; i++) {
      var en = inimigos[i];
      var dx = en.x - heroi.x, dy = en.y - heroi.y;
      if (dx * dx + dy * dy > r2) continue;
      en.medo = { t: sk.dur, cor: sk.cor };
      Efeitos.brasas(en.x, en.y - 10, sk.cor, 5, 70, 45);
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
    // skills ativas (classe/nível podem mudar em combate)
    skillsVigentes = Skills.ativas(Game.personagem.classe, Game.personagem.nivel);

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

    // skills com timer (nuke/cura) e gatilho por proximidade — antes do
    // ciclo de ataque (o empurrão age na IA dos inimigos logo abaixo)
    skillsPeriodicas(dt, alvo);
    skillsPosicionamento(dt);

    // esquiva em curso: corre na fuga e não ataca até pousar
    if (h.fuga) {
      h.fuga.t -= dt;
      mover(h, h.fuga.vx * dt, h.fuga.vy * dt, 6);
      if (h.fuga.t > 0) {
        anima(h, 'walk', dt);
        h.hp = Math.min(h.hpMax, h.hp + 2 * dt);
        return;
      }
      h.fuga = null;
    }

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

      // dano contínuo do veneno (skill do ladino)
      if (en.veneno) {
        en.veneno.t -= dt;
        en.veneno.acc += en.veneno.dps * dt;
        if (en.veneno.acc >= 1) {
          var v = Math.floor(en.veneno.acc);
          en.veneno.acc -= v;
          en.hp -= v;
          en.hitFlash = 0.1;
          Efeitos.brasas(en.x, en.y - 6, en.veneno.cor, 3, 50, 35);
          numero(en.x, en.y - 14, String(v), en.veneno.cor, false);
          if (en.hp <= 0) {
            mataInimigo(i, en);
            continue;
          }
        }
        if (en.veneno.t <= 0) {
          Efeitos.brasas(en.x, en.y - 8, en.veneno.cor, 4, 40, 40);
          en.veneno = null;
        }
      }

      // empurrão da skill: sendo arremessado, não reage à IA
      if (en.empurra) {
        en.empurra.t -= dt;
        mover(en, en.empurra.vx * dt, en.empurra.vy * dt, en.raio || 6);
        if (en.empurra.t <= 0) en.empurra = null;
        continue;
      }

      var alvoX, alvoY;
      if (heroi.morto) {
        // herói caído: se agrupam no local da morte (o centro do mundo
        // grande não estaria nem perto de onde ele caiu)
        alvoX = morte.x; alvoY = morte.y;
      } else {
        alvoX = heroi.x; alvoY = heroi.y;
      }
      var vx = alvoX - en.x, vy = alvoY - en.y;
      var dist = Math.sqrt(vx * vx + vy * vy) || 1;

      // medo (Amedronta): corre para longe do herói e não ataca —
      // o cronômetro anda mesmo com o herói caído, senão trava em 100%
      var comMedo = false;
      if (en.medo) {
        en.medo.t -= dt;
        comMedo = en.medo.t > 0 && !heroi.morto;
        if (en.medo.t <= 0) en.medo = null;
      }

      if (comMedo) {
        mover(en, -(vx / dist) * en.vel * 0.9 * dt,
          -(vy / dist) * en.vel * 0.9 * dt, en.raio || 6);
      } else if (heroi.morto) {
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
    if (!heroi) return;
    atualizaCamera(dt);        // é apresentação: segue mesmo pausada
    if (pausada) return;

    if (shake > 0) shake -= dt;
    if (tFlash > 0) tFlash -= dt;

    // efeitos visuais (missis podem matar e reduzir a lista de inimigos
    // antes do laço de baixo — por isso rodam primeiro)
    Efeitos.atualizar(dt);

    if (heroi.morto) {
      heroi.revT -= dt;
      heroi.anim = 'idle';
      if (heroi.revT <= 0) {
        heroi.morto = false;
        heroi.hp = heroi.hpMax;
        var volta = posicaoAleatoriaSegura();
        heroi.x = volta.x;
        heroi.y = volta.y;
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

    // poeira: deriva lenta com wrap (só posição, sem alocação)
    for (i = 0; i < poeira.length; i++) {
      var po = poeira[i];
      po.x += po.vx * dt;
      po.y += po.vy * dt;
      po.fase += dt;
      if (po.y < 0) { po.y += MH; po.x = Math.random() * MW; }
      if (po.x < 0) po.x += MW;
      else if (po.x >= MW) po.x -= MW;
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

  function sombra(ctx, x, y, rx, cor) {
    // halo largo fraco + miolo denso = sombra com profundidade
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = cor || 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.ellipse(x, y, rx * 1.45, rx * 0.58, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = cor || 'rgba(0,0,0,0.26)';
    ctx.beginPath();
    ctx.ellipse(x, y, rx, rx * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // hex '#rrggbb' -> 'rgba(r,g,b,a)' (o rasterizador entende os dois)
  function corAlfa(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' +
      (n & 255) + ',' + a + ')';
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
    // envenenado: sombra ganha o tom do veneno (pulso vem do tempo restante)
    sombra(ctx, en.x, en.y - 1, 9 * esc,
      en.veneno ? corAlfa(en.veneno.cor,
        0.26 + 0.14 * (0.5 + 0.5 * Math.sin(en.veneno.t * 8))) : null);
    var pulso = en.lunge > 0 ? 1.15 : 1;
    if (en.hitFlash > 0 && Math.floor(en.hitFlash * 40) % 2 === 0) ctx.globalAlpha = 0.45;
    var w = Math.round(14 * esc), h = Math.round(12 * esc * pulso);
    ctx.drawImage(c.canvas, Math.round(en.x - w / 2),
      Math.round(en.y - h - (pulso - 1) * 8), w, h);
    ctx.globalAlpha = 1;
    // marcador de veneno: 3 pontinhos piscando acima da barra de HP
    if (en.veneno) {
      ctx.fillStyle = en.veneno.cor;
      var my = Math.round(en.y - 18 * esc - 7);
      var mx = Math.round(en.x);
      for (var vv = 0; vv < 3; vv++) {
        ctx.globalAlpha = Math.sin(en.veneno.t * 9 + vv * 2.1) > -0.3 ? 1 : 0.3;
        ctx.fillRect(mx - 4 + vv * 4, my - (vv === 1 ? 3 : 0), 2, 2);
      }
      ctx.globalAlpha = 1;
    }
    // marcador de medo: 2 pontinhos tremulando (skill Amedronta)
    if (en.medo) {
      ctx.fillStyle = en.medo.cor;
      var myy = Math.round(en.y - 18 * esc - 7);
      for (var mm = 0; mm < 2; mm++) {
        ctx.globalAlpha = Math.sin(en.medo.t * 10 + mm * 2) > -0.4 ? 1 : 0.3;
        ctx.fillRect(Math.round(en.x) - 2 + mm * 4, myy - mm * 2, 2, 2);
      }
      ctx.globalAlpha = 1;
    }
    if (en.hp < en.hpMax) {
      // 3px: o contorno de 1px (quando existe) não pode cobrir a barra toda
      var bw = Math.round(16 * esc);
      UI.bar(Math.round(en.x - bw / 2), Math.round(en.y - 18 * esc), bw, 3,
        en.hp / en.hpMax, '#d84a4a');
    }
  }

  // desenha a arena dentro do retângulo (vx, vy, vw, vh) da tela — o
  // mundo continua em unidades de 192×134 de janela; k = vw/VW amplia
  // tudo (física, câmera e ritmo intactos, só o desenho escala)
  function desenhar(ctx, vx, vy, vw, vh) {
    var k = vw / VW;
    ctx.save();
    ctx.beginPath();
    ctx.rect(vx, vy, vw, vh);
    ctx.clip();
    ctx.fillStyle = '#0d0b14';
    ctx.fillRect(vx, vy, vw, vh);
    ctx.translate(vx, vy);
    ctx.scale(k, k);
    ctx.translate(-cam.x, -cam.y);

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

    // efeitos das skills (missis, anéis, cortes, motes)
    Efeitos.desenhar(ctx);

    // em espaço de mundo: 8 un. × k=2 = 16px na tela (igual à UI)
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

    // poeira ambiente (espaço de mundo, dentro do clip da janela)
    for (i = 0; i < poeira.length; i++) {
      var pdu = poeira[i];
      ctx.globalAlpha = 0.10 + 0.12 *
        (0.5 + 0.5 * Math.sin(pdu.fase * 2 + pdu.x * 0.05));
      ctx.fillStyle = '#d8d8f0';
      ctx.fillRect(Math.round(pdu.x), Math.round(pdu.y), pdu.tam, pdu.tam);
    }
    ctx.globalAlpha = 1;

    ctx.restore();

    // vinheta: bordas da janela escurecidas em degraus (fillRect+alpha,
    // sem gradiente — primitiva que o rasterizador entende)
    var degraus = [[11, 0.10], [8, 0.07], [5, 0.05], [2, 0.03]];
    for (var vg = 0; vg < degraus.length; vg++) {
      var bd = degraus[vg][0] * k;
      ctx.globalAlpha = degraus[vg][1];
      ctx.fillStyle = '#0d0b14';
      ctx.fillRect(vx, vy, vw, bd);
      ctx.fillRect(vx, vy + vh - bd, vw, bd);
      ctx.fillRect(vx, vy, bd, vh);
      ctx.fillRect(vx + vw - bd, vy, bd, vh);
    }
    ctx.globalAlpha = 1;

    // ---- HUD do herói (espaço de tela, por cima da arena): offsets e
    // fontes proporcionais a k — com a janela nova (k=2) vira 16px
    UI.bar(vx + 4 * k, vy + 4 * k, 54 * k, 6 * k,
      heroi.hp / heroi.hpMax, '#d84a4a');
    UI.text(Math.ceil(heroi.hp) + '/' + heroi.hpMax,
      vx + 62 * k, vy + 7 * k, {
        color: '#ffffff', font: 'bold ' + (8 * k) + 'px monospace'
      });
    UI.text('Onda ' + onda + ' (' + inimigos.length + ')',
      vx + vw - 4 * k, vy + 7 * k, { align: 'right', color: '#e8c86a' });

    if (heroi.morto) {
      ctx.fillStyle = 'rgba(5,3,10,0.5)';
      ctx.fillRect(vx, vy + vh / 2 - 12 * k, vw, 24 * k);
      UI.text('CAIU — revivendo em ' + Math.max(1, Math.ceil(heroi.revT)) + 's',
        vx + vw / 2, vy + vh / 2, { align: 'center', color: '#ff6b6b' });
    }

    if (tFlash > 0) {
      ctx.globalAlpha = Math.min(1, tFlash);
      UI.text('NIVEL ' + nivelFlash + '!', vx + vw / 2, vy + vh / 2 - 4 * k, {
        align: 'center', color: '#ffd866', font: 'bold ' + (8 * k) + 'px monospace'
      });
      ctx.globalAlpha = 1;
    }

    if (pausada) {
      ctx.fillStyle = 'rgba(5,3,10,0.55)';
      ctx.fillRect(vx, vy, vw, vh);
      UI.text('PAUSADO', vx + vw / 2, vy + vh / 2, {
        align: 'center', color: '#e8c86a', font: 'bold ' + (8 * k) + 'px monospace'
      });
    }
  }

  function info() {
    var p = Game.personagem;
    var boss = false;
    for (var i = 0; i < inimigos.length; i++) {
      if (inimigos[i].tipo.boss) { boss = true; break; }
    }
    var medo = 0, empurra = 0;
    for (i = 0; i < inimigos.length; i++) {
      if (inimigos[i].medo) medo++;
      if (inimigos[i].empurra) empurra++;
    }
    return {
      mapa: mapa,
      onda: onda,
      janela: { w: VW, h: VH },
      mundo: { w: MW, h: MH },
      cam: { x: Math.round(cam.x), y: Math.round(cam.y) },
      heroi: { x: Math.round(heroi ? heroi.x : 0),
               y: Math.round(heroi ? heroi.y : 0) },
      inimigos: inimigos.length,
      boss: boss,
      // skills de posicionamento/medo: última disparada + efeitos ativos
      ultimaSkill: ultimaSkill,
      medo: medo,
      empurra: empurra,
      fuga: !!(heroi && heroi.fuga),
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
