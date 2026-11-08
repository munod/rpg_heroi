// IA tática do jogo — o "cérebro" compartilhado por herói e inimigos.
// Arquitetura: Avaliação Utilitária (árvore de decisão ponderada) com
// lógica DIFUSA nos fatores — HP%, distância e cerco entram como graus de
// verdade contínuos (sem motor fuzzy formal). A qualidade da decisão vem
// da INTELIGÊNCIA do personagem: agudeza(int) ∈ [0,1]; os pesos levam
// ruído ∝ (1 − agudeza), então INT baixa escolhe quase aleatório ("burro
// de verdade") e INT alta calcula a melhor ação. Inimigos usam
// astúcia(espécie, mapa) — semântica espécie + profundidade dos mapas.
// Raciocina em TICKS de 0,2s (não por frame): custo desprezível.
var IA = (function () {
  var TICK = 0.2;                     // segundos entre decisões
  var AGU_MIN = 4, AGU_FAIXA = 16;    // int 4 -> 0 (burro), 20 -> 1 (gênio)

  // Astúcia base por espécie (batalha.js TIPOS) e ganho por mapa — a
  // inteligência dos NPCs cresce junto com a profundidade do mapa.
  var BASE_ASTUCIA = {
    slime: 0, visgo: 0.15, morcego: 0.3, aranha: 0.4, boss: 0.6
  };
  var PASSO_ASTUCIA = 0.12;

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  // Agudeza do herói a partir do atributo INTELIGÊNCIA (efetivo, com
  // bônus de classe): 4 = burro, 12 = médio (mago padrão), 20+ = gênio.
  function agudeza(int) {
    var i = (typeof int === 'number' && isFinite(int)) ? int : 8;
    return clamp((i - AGU_MIN) / AGU_FAIXA, 0, 1);
  }

  // Astúcia de um inimigo: espécie + profundidade (mapa), com teto.
  function astucia(tipo, mapa) {
    var base = BASE_ASTUCIA[tipo];
    if (base === undefined) base = 0;
    var m = (typeof mapa === 'number' && mapa >= 1) ? Math.floor(mapa) : 1;
    return clamp(base + (m - 1) * PASSO_ASTUCIA, 0, 1);
  }

  // Ruído multiplicativo: burro erra muito, gênio erra pouco (nunca zero
  // — até um gênio surpreende, e a aleatoriedade pura é honesta).
  function ruido(agu) {
    return (Math.random() * 2 - 1) * (1 - agu) * 0.9;
  }

  // ----------------------------------------------------------- herói
  // Decide alvo, estado e ponto de destino. h.ia = { t, estado, alvo,
  // destino, agu }. Estados: espera | perseguir | combate | kite | recuar.
  function decideHeroi(h, inimigos, dt) {
    if (!h.ia) h.ia = { t: 0, estado: 'perseguir', alvo: null, destino: null };
    var ia = h.ia;

    // o alvo morreu/saiu de campo entre ticks: solta na hora
    if (ia.alvo && inimigos.indexOf(ia.alvo) < 0) ia.alvo = null;

    ia.t -= dt;
    if (ia.t > 0) return;
    ia.t = TICK;

    var s = h.stats;
    var agu = agudeza(s.atributos ? s.atributos.int : 8);
    ia.agu = agu;

    if (!inimigos.length) {
      ia.estado = 'espera';
      ia.alvo = null;
      ia.destino = null;
      return;
    }

    // ---- alvo: perto SEMPRE pontua; a prioridade (perigoso e fraco,
    // derrubável na hora) só pesa quem tem agudeza — com INT 0 o peso
    // da prioridade é exatamente 0 e o burro vai no mais perto, ponto.
    var i, en, dx, dy, dist;
    var melhor = null, melhorP = -Infinity;
    for (i = 0; i < inimigos.length; i++) {
      en = inimigos[i];
      dx = en.x - h.x; dy = en.y - h.y;
      dist = Math.sqrt(dx * dx + dy * dy);
      var prio = ((en.dmg || 3) * 6) / (en.hp + 1);
      var p = -dist + prio * (40 * agu) + ruido(agu) * 40;
      if (p > melhorP) { melhorP = p; melhor = en; }
    }
    ia.alvo = melhor;

    // ---- contexto contínuo: hp% e grau de cerco (quantos no raio)
    var hpPct = h.hp / h.hpMax;
    var alc = s.alcance;
    var perto = 0, sx = 0, sy = 0;
    var dNearest = Infinity;
    for (i = 0; i < inimigos.length; i++) {
      dx = inimigos[i].x - h.x; dy = inimigos[i].y - h.y;
      var d2 = dx * dx + dy * dy;
      if (d2 < dNearest) dNearest = d2;
      if (d2 < 44 * 44) { perto++; sx += dx; sy += dy; }
    }
    dNearest = Math.sqrt(dNearest);
    var dxAlvo = ia.alvo.x - h.x, dyAlvo = ia.alvo.y - h.y;
    var dAlvo = Math.sqrt(dxAlvo * dxAlvo + dyAlvo * dyAlvo);

    // ---- estado: limiares contínuos escalados pela agudeza
    var cl = null;
    if (typeof Personagem !== 'undefined') {
      var clId = (typeof Game !== 'undefined' && Game.personagem)
        ? Game.personagem.classe : 'guerreiro';
      cl = Personagem.CLASSES[clId];
    }
    var longe = !!(cl && cl.distancia);
    var estado;
    if (agu >= 0.45 && hpPct < 0.25 + 0.15 * agu) {
      estado = 'recuar';               // gênio abre mão do golpe para viver
    } else if (longe && agu >= 0.35 &&
               (ia.estado === 'kite' ? dAlvo < alc * 0.9 : dNearest < alc * 0.7)) {
      // ranged: mantém a distância e atira em retirada (com histerese
      // p/ não oscilar entre perseguir e kite na fronteira)
      estado = 'kite';
    } else if (dAlvo <= alc * 0.75) {
      estado = 'combate';
    } else {
      estado = 'perseguir';
    }
    // burro cambaleia: com agudeza baixa troca de ideia sem motivo
    if (estado !== 'recuar' && Math.random() < (0.55 - agu) * 0.45) {
      estado = Math.random() < 0.5 ? 'perseguir' : 'combate';
    }
    ia.estado = estado;

    // ---- destino por estado (o perseguir/combate segue o alvo vivo a
    // cada frame — ver batalha.js; aqui ficam os pontos fixos)
    if (estado === 'recuar') {
      var cx = perto ? sx / perto : dxAlvo, cy = perto ? sy / perto : dyAlvo;
      var cd = Math.sqrt(cx * cx + cy * cy) || 1;
      ia.destino = { x: h.x - (cx / cd) * 90, y: h.y - (cy / cd) * 90 };
    } else if (estado === 'kite') {
      // recua até a faixa segura: ponto ~24px para longe do mais perto
      var mi = 0, d2m = Infinity;
      for (i = 0; i < inimigos.length; i++) {
        dx = inimigos[i].x - h.x; dy = inimigos[i].y - h.y;
        var dv = dx * dx + dy * dy;
        if (dv < d2m) { d2m = dv; mi = i; }
      }
      var nx = h.x - inimigos[mi].x, ny = h.y - inimigos[mi].y;
      var nd = Math.sqrt(nx * nx + ny * ny) || 1;
      ia.destino = { x: h.x + (nx / nd) * 24, y: h.y + (ny / nd) * 24 };
    } else {
      ia.destino = ia.alvo;             // segue vivo, atualizado no frame
    }
  }

  // --------------------------------------------------- skills (INT)
  // Gênio usa as skills mais cedo (raio de gatilho maior) e com menos
  // espera (cooldown efetivo menor); burro, ao contrário.
  function skillEfeito(sk, agu) {
    var a = (typeof agu === 'number') ? clamp(agu, 0, 1) : 0.5;
    return {
      gatilho: sk.gatilho ? sk.gatilho * (0.85 + 0.35 * a) : undefined,
      intervalo: sk.intervalo ? sk.intervalo * (1.3 - 0.45 * a) : undefined
    };
  }

  // ------------------------------------------------ caminho (A* + reta)
  // Mundo 384×268 em células de 16px = 24×17 = 408 nós — A* é instantâneo.
  // Só é chamado quando a LINHA RETA está bloqueada (ver batalha.moverPara)
  // e a entidade é esperta o bastante; burros continuam na reta e escorregam
  // na colisão (comportamento "zumbi" proposital e barato).
  var G = 16;
  var COLS = 24, LINHAS = 17;          // ceil(384/16), ceil(268/16)
  var DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1],
              [1, 1], [1, -1], [-1, 1], [-1, -1]];

  function dentroC(x, y) {
    return x >= 0 && y >= 0 && x < COLS && y < LINHAS;
  }

  // Amostra a reta a cada 8px: livre => nenhum obstáculo no caminho.
  function linhaLivre(x1, y1, x2, y2, raio) {
    var dx = x2 - x1, dy = y2 - y1;
    var d = Math.sqrt(dx * dx + dy * dy);
    var passos = Math.ceil(d / 8);
    for (var i = 1; i <= passos; i++) {
      var k = i / passos;
      if (Batalha.colideObst(x1 + dx * k, y1 + dy * k, raio)) return false;
    }
    return true;
  }

  function custo(i, j, ti, tj) {
    return (i === ti || j === tj) ? 1 : 1.41421;
  }

  // A* 8-direções; devolve a lista de waypoints (coords de mundo) ou
  // null = sem caminho (aí quem chamou segue na reta e escorrega).
  function caminho(x1, y1, x2, y2, raio) {
    if (linhaLivre(x1, y1, x2, y2, raio)) return null;
    var si = Math.floor(x1 / G), sj = Math.floor(y1 / G);
    var ti = Math.floor(x2 / G), tj = Math.floor(y2 / G);
    si = clamp(si, 0, COLS - 1); sj = clamp(sj, 0, LINHAS - 1);
    ti = clamp(ti, 0, COLS - 1); tj = clamp(tj, 0, LINHAS - 1);

    var bloq = [];                      // memo por célula (null = sem testar)
    function ocupada(ci, cj) {
      var idx = cj * COLS + ci;
      if (bloq[idx] === undefined) {
        bloq[idx] = Batalha.colideObst(ci * G + G / 2, cj * G + G / 2, raio);
      }
      return bloq[idx];
    }
    // saída/chegada podem nascer grudados na borda de um obstáculo
    if (ocupada(si, sj)) {
      var achou = false;
      for (var r = 1; r <= 2 && !achou; r++) {
        for (var a = -r; a <= r && !achou; a++) {
          for (var b = -r; b <= r && !achou; b++) {
            if (!dentroC(si + a, sj + b)) continue;
            if (!ocupada(si + a, sj + b)) { si += a; sj += b; achou = true; }
          }
        }
      }
      if (!achou) return null;
    }
    if (ocupada(ti, tj)) {
      var achou2 = false;
      for (var r2 = 1; r2 <= 3 && !achou2; r2++) {
        for (var a2 = -r2; a2 <= r2 && !achou2; a2++) {
          for (var b2 = -r2; b2 <= r2 && !achou2; b2++) {
            if (!dentroC(ti + a2, tj + b2)) continue;
            if (!ocupada(ti + a2, tj + b2)) { ti += a2; tj += b2; achou2 = true; }
          }
        }
      }
      if (!achou2) return null;
    }

    var N = COLS * LINHAS;
    var g = new Array(N).fill(Infinity);
    var f = new Array(N).fill(Infinity);
    var veio = new Array(N).fill(-1);
    var fechado = new Array(N).fill(false);
    var aberto = [];
    function h(i, j) {                  // heurística octile
      var di = Math.abs(i - ti), dj = Math.abs(j - tj);
      return Math.max(di, dj) + 0.41421 * Math.min(di, dj);
    }
    var s0 = sj * COLS + si;
    g[s0] = 0;
    f[s0] = h(si, sj);
    aberto.push(s0);

    var achouCaminho = false;
    var guard = 0;
    while (aberto.length && guard++ < 900) {
      // remove o melhor (lista pequena: 408 nós no máximo)
      var bi = 0;
      for (var k = 1; k < aberto.length; k++) {
        if (f[aberto[k]] < f[aberto[bi]]) bi = k;
      }
      var atual = aberto.splice(bi, 1)[0];
      if (fechado[atual]) continue;
      fechado[atual] = true;
      var ci = atual % COLS, cj = (atual / COLS) | 0;
      if (ci === ti && cj === tj) { achouCaminho = true; break; }

      for (var d = 0; d < DIRS.length; d++) {
        var ni = ci + DIRS[d][0], nj = cj + DIRS[d][1];
        if (!dentroC(ni, nj) || ocupada(ni, nj)) continue;
        if (DIRS[d][0] && DIRS[d][1] &&
            (ocupada(ci + DIRS[d][0], cj) || ocupada(ci, cj + DIRS[d][1]))) {
          continue;                     // sem corte de quina na diagonal
        }
        var nidx = nj * COLS + ni;
        if (fechado[nidx]) continue;
        var ng = g[atual] + custo(ci, cj, ni, nj);
        if (ng < g[nidx]) {
          g[nidx] = ng;
          f[nidx] = ng + h(ni, nj);
          veio[nidx] = atual;
          if (aberto.indexOf(nidx) < 0) aberto.push(nidx);
        }
      }
    }
    if (!achouCaminho) return null;

    // reconstrói do destino para a origem e inverte
    var out = [];
    var cur = tj * COLS + ti;
    var orig = sj * COLS + si;
    var guarda2 = 0;
    while (cur !== orig && cur >= 0 && guarda2++ < 900) {
      var wi = cur % COLS, wj = (cur / COLS) | 0;
      out.push({ x: wi * G + G / 2, y: wj * G + G / 2 });
      cur = veio[cur];
    }
    if (cur < 0) return null;
    out.reverse();
    out.push({ x: x2, y: y2 });         // pino final exato do destino
    return out;
  }

  return {
    TICK: TICK,
    agudeza: agudeza,
    astucia: astucia,
    ruido: ruido,
    decideHeroi: decideHeroi,
    skillEfeito: skillEfeito,
    linhaLivre: linhaLivre,
    caminho: caminho
  };
})();
