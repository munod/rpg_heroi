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
  // Limites do mundo (espelho de batalha.js: 384×268) com margem: o
  // destino de fuga SEMPRE fica dentro do mapa — sem isso o herói
  // empurrava a parede no vértice e ficava preso (bug: INT alta).
  var MUNDO_L = 384, MUNDO_A = 268, MARGEM_FUGA = 16;
  function clampFuga(x, y) {
    return {
      x: Math.max(MARGEM_FUGA, Math.min(MUNDO_L - MARGEM_FUGA, x)),
      y: Math.max(MARGEM_FUGA, Math.min(MUNDO_A - MARGEM_FUGA, y))
    };
  }

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
    ia.prof = profundidade(agu);       // profundidade vigente (sonda)

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
      // prioridade universal do ladrão: o herói defende o ouro roubado
      // (mesmo burro — sem isso o resgate do Gatuno é imprevisível)
      if (en.gatuno) p += 1000;
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

    // ---- estado: seletor de CAMADAS da Behavior Tree (spec ia-heroi)
    // A raiz avalia as camadas de cima p/ baixo e para na primeira cujo
    // gate satisfaz; a profundidade (INT) decide quantas camadas a
    // árvore alcança. Os gates são os de sempre (prof 3 = agu >= 0,45;
    // prof 2 = agu >= 0,35) — comportamento preservado por construção.
    var cl = null;
    if (typeof Personagem !== 'undefined') {
      var clId = (typeof Game !== 'undefined' && Game.personagem)
        ? Game.personagem.classe : 'guerreiro';
      cl = Personagem.CLASSES[clId];
    }
    var longe = !!(cl && cl.distancia);
    var estado = avaliaCamadas({ agu: agu, hpPct: hpPct, alc: alc,
                                 longe: longe, dAlvo: dAlvo,
                                 dNearest: dNearest, prev: ia.estado });
    ia.estado = estado;

    // ---- destino por estado (o perseguir/combate segue o alvo vivo a
    // cada frame — ver batalha.js; aqui ficam os pontos de fuga — com
    // EVASÃO DE CERCO: as bases geométricas de sempre, agora com olhos
    // no influence map)
    if (estado === 'recuar') {
      var cx = perto ? sx / perto : dxAlvo, cy = perto ? sy / perto : dyAlvo;
      if (cx === 0 && cy === 0) ia.destino = clampFuga(h.x, h.y);
      else ia.destino = direcaoEvasao(h, Math.atan2(-cy, -cx), 90);
    } else if (estado === 'kite') {
      // recua até a faixa segura: ponto ~24px para longe do mais perto
      var mi = 0, d2m = Infinity;
      for (i = 0; i < inimigos.length; i++) {
        dx = inimigos[i].x - h.x; dy = inimigos[i].y - h.y;
        var dv = dx * dx + dy * dy;
        if (dv < d2m) { d2m = dv; mi = i; }
      }
      var nx = h.x - inimigos[mi].x, ny = h.y - inimigos[mi].y;
      if (nx === 0 && ny === 0) ia.destino = clampFuga(h.x, h.y);
      else ia.destino = direcaoEvasao(h, Math.atan2(ny, nx), 24);
    } else {
      ia.destino = ia.alvo;             // segue vivo, atualizado no frame
    }
  }

  // ---- Behavior Tree: seletor de CAMADAS por prioridade --------------
  // Raiz = seletor: avalia as camadas de cima p/ baixo e para na
  // primeira cujo gate satisfaz. A PROFUNDIDADE (INT) decide quantas
  // camadas a árvore alcança — e os limiares são os de sempre
  // (0,35 e 0,45), preservando o comportamento medido por construção.
  var CAMADAS = [
    { nome: 'sobrevivencia', estado: 'recuar', prof: 3,
      gate: function (c) { return c.hpPct < 0.25 + 0.15 * c.agu; } },
    { nome: 'posicionamento', estado: 'kite', prof: 2,
      gate: function (c) {
        return c.longe && (c.prev === 'kite'
          ? c.dAlvo < c.alc * 0.9
          : c.dNearest < c.alc * 0.7); } },
    { nome: 'combate', estado: 'combate', prof: 1,
      gate: function (c) { return c.dAlvo <= c.alc * 0.75; } },
    { nome: 'perseguicao', estado: 'perseguir', prof: 1,
      gate: function () { return true; } }
  ];

  // profundidade da árvore pela agudeza: 1 = só movimento básico
  // (combate/perseguição), 2 = + posicionamento (kite), 3 = completa
  function profundidade(agu) {
    return agu >= 0.45 ? 3 : (agu >= 0.35 ? 2 : 1);
  }

  function avaliaCamadas(c) {
    var prof = profundidade(c.agu);
    var estado = 'perseguir';
    for (var i = 0; i < CAMADAS.length; i++) {
      var cam = CAMADAS[i];
      if (prof < cam.prof) continue;    // camada fora da profundidade
      if (cam.gate(c)) { estado = cam.estado; break; }
    }
    // decorador de RUÍDO pós-seleção (o "cambaleia" do burro) — mesma
    // fórmula de sempre: troca perseguir<->combate, nunca toca a
    // camada de sobrevivência
    if (estado !== 'recuar' && Math.random() < (0.55 - c.agu) * 0.45) {
      estado = Math.random() < 0.5 ? 'perseguir' : 'combate';
    }
    return estado;
  }

  // ---- evasão de cerco (spec ia-heroi) -------------------------------
  // 12 direções girando a partir da base (k=0 = direção de sempre),
  // todas clampFuga; score = ocupação da célula (3×3) + 100 se o ponto
  // cai em rocha. Menor score vence com `<` estrito → desempate
  // determinístico no candidato base: mapa vazio = score 0 em todos =
  // k=0 = exatamente o destino antigo.
  var EVASAO_N = 12;

  function direcaoEvasao(h, angBase, dist) {
    var melhor = null, melhorS = Infinity;
    for (var k = 0; k < EVASAO_N; k++) {
      var ang = angBase + k * (Math.PI * 2 / EVASAO_N);
      var pt = clampFuga(h.x + Math.cos(ang) * dist,
                         h.y + Math.sin(ang) * dist);
      var s = celulaOcup(pt.x, pt.y);
      if (celulaObst(pt.x, pt.y, 6)) s += 100;
      if (s < melhorS) { melhorS = s; melhor = pt; }
    }
    return melhor;
  }

  // --------------------------------------------------------- inimigos
  // Cérebro inimigo por frame (5 linhas × ~6 monstros = nada):
  //  - astúcia < 0,35: destino nulo => a batalha segue o herói vivo na
  //    hora (comportamento burro de sempre, linha reta + escorregão);
  //  - astúcia >= 0,35: CERCO — cada um tem um slot próprio a 11px do
  //    herói (faixa de ataque) em vez de formar fila;
  //  - astúcia >= 0,45 + herói escapando (esquiva/teleporte): ANTICIPA —
  //    mira 40px à frente na direção da fuga para cortar o caminho;
  //  - astúcia >= 0,55 + herói por perto: ESQUIVA — deslize lateral com
  //    cooldown; durante a janela o golpe do herói erra.
  function decideInimigo(en, heroi, dt) {
    if (!en.ia) en.ia = { estado: 'aproximar', destino: null };
    var ia = en.ia;
    if (en.slot === undefined) en.slot = Math.floor(Math.random() * 6);
    var ast = en.astucia || 0;

    if (en.esquiva) { ia.estado = 'esquivar'; return; }

    // antecipação (a cada frame: a janela da fuga é curta)
    if (ast >= 0.45 && heroi.escapa && heroi.escapa.t > 0 && !heroi.morto) {
      ia.estado = 'antecipar';
      ia.destino = { x: heroi.x + heroi.escapa.x * 40,
                     y: heroi.y + heroi.escapa.y * 40 };
      return;
    }

    // esquiva: só o instinto astuto, com cooldown próprio
    if (ast >= 0.55 && !en.medo && !heroi.morto && heroi.hp > 0) {
      en.esquivaCd = (en.esquivaCd || 0) - dt;
      var dxh = heroi.x - en.x, dyh = heroi.y - en.y;
      if (en.esquivaCd <= 0 && dxh * dxh + dyh * dyh <= 40 * 40 &&
          Math.random() < 0.02) {
        var dh = Math.sqrt(dxh * dxh + dyh * dyh) || 1;
        var lado = Math.random() < 0.5 ? 1 : -1;
        en.esquiva = { t: 0.16,
          vx: (-dyh / dh) * 160 * lado, vy: (dxh / dh) * 160 * lado };
        en.esquivaCd = 3.5 - 1.5 * ast;   // astuto desvia mais seguido
        ia.estado = 'esquivar';
        return;
      }
    }

    if (heroi.morto) { ia.estado = 'aguarda'; ia.destino = null; return; }

    var dx = heroi.x - en.x, dy = heroi.y - en.y;
    var d = Math.sqrt(dx * dx + dy * dy) || 1;
    if (ast >= 0.35) {
      // cerco via INFLUENCE MAP (spec ia-monstros): 12 candidatos a
      // raio 11, score = ocupação 3×3 ×3 + preferência do ângulo do
      // slot (com jitter) — desvia de aliados e rochas em vez do slot
      // fixo que colidia com >6 monstros e caía em obstáculo
      ia.destino = destinoCerco(en, heroi);
    } else {
      ia.destino = null;                 // reto no herói vivo (na hora)
    }
    ia.estado = d > 13 ? 'aproximar' : 'combate';
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

  // --------------------------- influence map + flocking (ia-monstros)
  // Mapa de influência do mundo: grade de 8px (48×34 = 1632 células —
  // resolução para discriminar os candidatos do anel de 11px, que ficam
  // ~5,7px entre si; a grade do A* continua em 16px). A camada de
  // OCUPAÇÃO é repintada por frame (monstros por célula); obstáculos
  // são consulta DIRETA por candidato com o raio da entidade — sem memo
  // entre frames, para nunca ficar stale entre mapas (o A* usa memo por
  // chamada: mesmo princípio).
  var IG = 8;
  var ICOLS = 48, ILINHAS = 34;         // ceil(384/8), ceil(268/8)
  var mapaOcup = new Array(ICOLS * ILINHAS).fill(0);

  function idxInfl(x, y) {
    var ci = Math.floor(x / IG), cj = Math.floor(y / IG);
    if (ci < 0) ci = 0; else if (ci >= ICOLS) ci = ICOLS - 1;
    if (cj < 0) cj = 0; else if (cj >= ILINHAS) cj = ILINHAS - 1;
    return cj * ICOLS + ci;
  }

  // repinta a ocupação — chamada no topo de atualizaInimigos, antes do
  // laço (cada frame os monstros estão onde estão)
  function pintaMapa(inimigos) {
    for (var i = 0; i < mapaOcup.length; i++) mapaOcup[i] = 0;
    for (var j = 0; j < inimigos.length; j++) {
      mapaOcup[idxInfl(inimigos[j].x, inimigos[j].y)]++;
    }
  }

  // ocupação na vizinhança 3×3 (~24px — amostra suave: um aliado
  // penaliza o candidato e os vizinhos dele)
  function celulaOcup(x, y) {
    var ci = Math.floor(x / IG), cj = Math.floor(y / IG);
    var s = 0;
    for (var a = -1; a <= 1; a++) {
      for (var b = -1; b <= 1; b++) {
        var ii = ci + a, jj = cj + b;
        if (ii < 0 || jj < 0 || ii >= ICOLS || jj >= ILINHAS) continue;
        s += mapaOcup[jj * ICOLS + ii];
      }
    }
    return s;
  }

  // obstáculo no ponto — com o RAIO DA ENTIDADE (o boss de r=11 não
  // passa onde o slime de r=6 passa)
  function celulaObst(x, y, raio) {
    return Batalha.colideObst(x, y, raio || 6);
  }

  // ---- cerco via influence map (decideInimigo, ast >= 0,35) ----------
  // 12 candidatos a raio EXATO 11 (contrato da seção 23: |raio−11| <
  // 0,01) — dobra a resolução dos 6 slots p/ mais de 6 monstros. Score
  // (menor vence): ocupação 3×3 ×3 + preferência do ângulo do slot (0
  // no ângulo próprio, sobe com o desvio — mantém a identidade de cada
  // um e evita trocar de ângulo a cada frame). Obstáculo rejeita o
  // candidato; se TODOS estiverem bloqueados, cai no slot de sempre.
  var ANEL_R = 11, ANEL_N = 12;
  var PESO_OCUP = 3;
  var PESO_SLOT = 0.5;                  // por passo de 60° fora do slot

  function destinoCerco(en, heroi) {
    var ast = en.astucia || 0;
    var angSlot = ((en.slot || 0) % 6) * 1.0472 + (ast - 0.35) * 1.4;
    var meu = idxInfl(en.x, en.y);
    var mi = meu % ICOLS, mj = (meu / ICOLS) | 0;
    var melhor = null, melhorS = Infinity;
    for (var k = 0; k < ANEL_N; k++) {
      var ang = k * (Math.PI * 2 / ANEL_N);
      var px = heroi.x + Math.cos(ang) * ANEL_R;
      var py = heroi.y + Math.sin(ang) * ANEL_R;
      if (celulaObst(px, py, en.raio || 6)) continue;   // rejeita rocha
      // o próprio monstro não se conta (senão a própria célula sempre
      // tem ≥1 e ele troca de candidato para sempre — instabilidade)
      var ocup = celulaOcup(px, py);
      var alvoIdx = idxInfl(px, py);
      var ai = alvoIdx % ICOLS, aj = (alvoIdx / ICOLS) | 0;
      if (Math.abs(ai - mi) <= 1 && Math.abs(aj - mj) <= 1) ocup--;
      if (ocup < 0) ocup = 0;
      var d = Math.abs(ang - angSlot) % (Math.PI * 2);
      if (d > Math.PI) d = Math.PI * 2 - d;
      var pref = Math.min(d / 1.0472, 6) * PESO_SLOT;
      var s = ocup * PESO_OCUP + pref;
      if (s < melhorS) { melhorS = s; melhor = { x: px, y: py }; }
    }
    if (melhor) return melhor;
    return { x: heroi.x + Math.cos(angSlot) * ANEL_R,   // slot de sempre
             y: heroi.y + Math.sin(angSlot) * ANEL_R };
  }

  // ---- flocking: separação universal (spec ia-monstros) ---------------
  // Empurra o destino para longe dos aliados próximos — SÓ monstro ×
  // monstro (o herói é o alvo, nunca é "aliado"). Com 1 monstro o
  // vetor é exatamente 0 (comportamento idêntico ao de sempre: as
  // fixtures das seções 23/32/41 são de 1 bicho e não mudam).
  var SEP_MARGEM = 6;                   // px além dos raios somados
  var SEP_FORCA = 10;                   // magnitude máxima (px)

  function separacao(en, inimigos) {
    var meuR = en.raio || 6;
    var sx = 0, sy = 0;
    for (var i = 0; i < inimigos.length; i++) {
      var out = inimigos[i];
      if (out === en) continue;
      var dx = en.x - out.x, dy = en.y - out.y;
      var d2 = dx * dx + dy * dy;
      var min = meuR + (out.raio || 6) + SEP_MARGEM;
      if (d2 >= min * min) continue;
      if (d2 < 0.0001) {
        // empilhados no MESMO ponto: direção estável e diferente por
        // índice (senão os dois seriam empurrados na mesma direção e
        // continuariam juntos)
        var ang = i * 1.0472;
        sx += Math.cos(ang);
        sy += Math.sin(ang);
        continue;
      }
      var d = Math.sqrt(d2);
      sx += dx / d;
      sy += dy / d;
    }
    var m = Math.sqrt(sx * sx + sy * sy);
    if (m < 0.0001) return { x: 0, y: 0 };   // 1 monstro ou simetria
    var mag = SEP_FORCA * Math.min(1, m);    // saturação: teto 10px
    return { x: (sx / m) * mag, y: (sy / m) * mag };
  }

  return {
    TICK: TICK,
    agudeza: agudeza,
    astucia: astucia,
    ruido: ruido,
    decideHeroi: decideHeroi,
    decideInimigo: decideInimigo,
    skillEfeito: skillEfeito,
    linhaLivre: linhaLivre,
    caminho: caminho,
    pintaMapa: pintaMapa,
    celulaOcup: celulaOcup,
    celulaObst: celulaObst,
    separacao: separacao,
    destinoCerco: destinoCerco,
    CAMADAS: CAMADAS,
    profundidade: profundidade,
    avaliaCamadas: avaliaCamadas,
    direcaoEvasao: direcaoEvasao
  };
})();
