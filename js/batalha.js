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
  var poeira = [];       // pó ambiente da arena (visual só)
  var onda = 0;
  var tOnda = 1.0;                // espera até a próxima onda
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
               raio: 11, forma: 'slime', cor: '#d8a020' },
    // eventos (Leva 2): ac = predador raro; gatuno = ladrão que foge
    acougueiro: { hp: 22, dmg: 6, vel: 40, xpExtra: 10, escala: 2.4,
                  raio: 11, forma: 'slime', cor: '#ff5a3a' },
    gatuno: { hp: 8, dmg: 1, vel: 24, xpExtra: 0, forma: 'slime',
              cor: '#e8c86a' },
    // ---- espécies com SKILL PRÓPRIA (spec monstros-novos) ------------
    // hp/dano MENORES que o raro atual: a mecânica já é a ameaça.
    // atirador = ataque à distância (R-MON-2); regenerador = cura
    // quando não apanha; drenador = 30% do dano vira vida dele.
    atirador: { hp: 18, dmg: 4, vel: 32, xpExtra: 4, forma: 'morcego',
                cor: '#7a9ab8', raio: 5,
                ranged: { alcance: 90, cd: 2.2 } },
    regenerador: { hp: 30, dmg: 5, vel: 24, xpExtra: 5, forma: 'slime',
                   cor: '#6a9a6a', regen: 0.03, regenApos: 2 },
    drenador: { hp: 24, dmg: 6, vel: 30, xpExtra: 5, forma: 'slime',
                cor: '#9a5ab8', dreno: 0.3 }
  };

  var FIM_MAPA = 100;        // ondas por mapa; a100 é o chefe

  // Escala de monstros por onda (spec mundos R-MUN-4): o teto antigo
  // era fixo em 5 — batia já na onda 4 do mapa 1 e NUNCA mais mudava
  // (constante no jogo inteiro). Agora cresce até o fim da campanha,
  // em DUAS variantes para o A/B medido com ritmo (≥4 runs cada):
  //   'mundo': degraus a cada mundo (identidade de mundo: cada mundo
  //            entra mais povoado) — 5 → 5+9k no mundo 10;
  //   'mapa': progressão suave a cada mapa — 5 → 5+9k no mapa 100
  //            (mesmo ponto final, sem degraus).
  // O ramp inicial 3+tot/2 continua valendo (early intacto: nasce 3,
  // completa 5 na onda 4 como sempre). k = monstros extras por mundo
  // (calibrado em T8 p/ ~200h de campanha).
  var ESC_MONSTROS = 'mundo';
  // k = 0,5 (medição: k=1 estolou o mundo 3 em 2 de 2 runs — teto 7
  // = +40% de dano na fronteira; k=0 saudável em 3/3). Com 0,5 o
  // mundo 3 fica em teto 6 e o fim da campanha em 9 (escala visível,
  // impacto suave). k=0 reproduz o teto fixo antigo (floor já garante
  // teto inteiro para k fracionário).
  var ESC_MONSTROS_K = 0.5;

  // Teto no FIM da campanha (mundo 10 = mapa 100): no modo infinito
  // não segue crescendo (anel de spawn e custo de IA) — a dificuldade
  // lá em cima continua pela escala de HP/dano. As duas variantes têm
  // o MESMO ponto final (5 + 9K) e só mudam o FORMATO do crescimento:
  // 'mundo' = degraus de K a cada fronteira de mundo (identidade);
  // 'mapa' = degraus menores, ~a cada 11 mapas (progressão suave).
  function tetoMonstros() {
    var FIM_M = Mapas.LISTA.length;
    var FIM_P = FIM_M * Mapas.MAPAS_POR_MUNDO;
    var extra = ESC_MONSTROS === 'mundo'
      ? (Math.min(Mapas.mundo(mapa), FIM_M) - 1) * ESC_MONSTROS_K
      : Math.floor((Math.min(mapa, FIM_P) - 1) * ESC_MONSTROS_K *
                   (FIM_M - 1) / (FIM_P - 1));
    // floor: k fracionário (ex 0,5) não pode virar teto 9,5 — o laço
    // de spawn faria k < 9,5 = 10 iterações
    return 5 + Math.floor(extra);
  }

  // Variante/k da escala (A/B medido em T8; exportado p/ teste) — sem
  // argumentos devolve o vigente. k = 0 é LEGÍTIMO (reproduz o teto
  // fixo antigo de 5), então o teste é >= 0 e não > 0.
  function escalaMonstros(modo, k) {
    if (modo === 'mundo' || modo === 'mapa') ESC_MONSTROS = modo;
    if (typeof k === 'number' && k >= 0) ESC_MONSTROS_K = k;
    return { modo: ESC_MONSTROS, k: ESC_MONSTROS_K };
  }

  // Monstros da próxima onda (exportado p/ teste — seção mundos)
  function qtdMonstros() {
    var tot = ondaTotal();
    return Math.min(3 + Math.floor(tot / 2), tetoMonstros());
  }

  // Onda como se o jogo fosse um só: total de ondas vencidas desde o
  // mapa 1 (0 na primeira onda). É a base da escala CONTÍNUA de
  // dificuldade/XP — sem ela a onda 1 de cada mapa novo recomeçava do
  // zero e as primeiras ondas dos mapas seguintes eram papel picado
  // (o herói chegava lá com dano de fim de mapa anterior).
  function ondaTotal() {
    return (mapa - 1) * FIM_MAPA + (onda - 1);
  }

  // Escala por onda — alavanca do ritmo das ondas (boss incluído).
  // Medir com testes/ritmo.js antes de mexer.
  // Escala LINEAR por onda (1 + tot×ESC) — leva progressao-exponencial.
  // Loop de calibragem com ritmo.js (~14 iterações, 4 runs/decisão):
  // com níveis escassos (custo G^nv) e renda H^onda, a fronteira só
  // anda se CLEAR < SOBREVIVÊNCIA — produto HP×DMG acima de ~0,09
  // refaz o muro do mapa 3 (renda num tot parado × custo exponencial =
  // estagnação; medido: estol em 4/4 runs). Nota: o alvo antigo de
  // "30-40 mortes/50min" era o SINTOMA do estol (grind) — com economia
  // funcional a morte voltou a ser evento de fronteira/boss (~10/120min).
  var ESC_HP = 1.90;      // vida do inimigo por onda
  var ESC_DMG = 0.045;    // dano do inimigo por onda
  // Respiro entre ondas — ALAVANCA DE DURAÇÃO da campanha (spec mundos
  // R-MUN-7). Medido (ritmo, 4 configs): o nº de monstros NÃO muda a
  // duração (k=1/3/5 → todos ~21 mapas/600min; só o perigo muda — k=10
  // → 195 mortes), porque o XP extra fortalece o herói e compensa. O
  // ESPERA é linear e seguro (tempo de regen, sem tocar no cliff
  // HP×DMG): 8s → 21 mapas/600min, 40s → 8, 70s → 5.
  // Por isso ele ESCALA COM A PROFUNDIDADE: o mundo 1 mantém os 8s
  // medidos (mapa 1 ≈ 33min intacto — alvo aprovado) e cada mapa
  // seguinte respira +1,1s, até 117s no fim da campanha. Calibração:
  // 100 mapas × 100 ondas × (clear ~15s + espera média ~62s) ≈ 201h
  // (R-MUN-7 — o fator é 100 ONDAS por mapa, não 100 mapas).
  // No modo infinito (mapa > 100) o respiro trava no patamar do mundo
  // 10 — senão cresceria sem limite (mapa 1000 = 18min/onda).
  // Teto da regen (spec gestao-atributos): 500 hp/s. Early intocado
  // (4-20 hp/s); no late corta 2.800 → 500. Critério: manter mortes
  // como eventos na medição comparativa (T9: 6 mortes em 2400min).
  // Se a sim estolar, SOBE este número.
  var REGEN_MAX = 500;
  var ESPERA_BASE = 2.0;      // respiro do mundo 1 (intacto)
  var ESPERA_PASSO = 1.1;     // + por mapa de profundidade
  var ESPERA_TRANSICAO = 8.0; // pós-chefe: a troca de mapa é o seu
                              // próprio tempo (não espera o respiro
                              // escalado — senão a vitória atrasaria
                              // 117s após o último chefe)
  var MAPA_FIM_CAMPANHA =
    Mapas.MAPAS_POR_MUNDO * Mapas.LISTA.length;   // 10 × 10 = 100

  function esperaOnda() {
    var m = Math.min(mapa, MAPA_FIM_CAMPANHA);
    return ESPERA_BASE + (m - 1) * ESPERA_PASSO;
  }

  // Renda de XP harmônica com o custo (spec progressao-exponencial):
  // XP = XP_BASE × XP_H^ondaTotal; em tot=0 vale 12 (escala inicial).
  // RE-BASE (spec mundos): H 1,10 → 1,064 com G 1,07 em personagem.js —
  // ratio ln(H)/ln(G) = 0,9166 ≈ 0,9133 (a trajetória nv/onda não
  // muda), mas a renda só estoura 1e308 na onda 11.433 (a antiga, na
  // 7.411 = mapa ~75, cortava a progressão antes do fim da campanha).
  var XP_BASE = 12;
  var XP_H = 1.064;
  function xpAbate(tot, xpExtra) {
    return Math.round(XP_BASE * Math.pow(XP_H, tot)) + (xpExtra || 0);
  }

  // ------------------------------------------------------------ cenário
  // Terreno procedural: manchas orgânicas amostradas do campo de Perlin
  // (sede do mapa) e elementos apontados por sorteio com semente — mesmo
  // mapa, mesmo chão; mapa novo, chão novo (inclusive no modo infinito).
  function constroiChao(tema, semente) {
    chao = document.createElement('canvas');
    chao.width = MW;
    chao.height = MH;
    var c = chao.getContext('2d');

    c.fillStyle = tema.chao.base;
    c.fillRect(0, 0, MW, MH);

    var T = 16;
    var x, y, i;
    for (y = 0; y < MH; y += T) {
      for (x = 0; x < MW; x += T) {
        c.fillStyle = ((x / T + y / T) % 2 === 0) ? tema.chao.par : tema.chao.imp;
        c.fillRect(x, y, T, T);
      }
    }

    // manchas em duas faixas do ruído (altas/baixas): remendos orgânicos
    // ligados uns aos outros no lugar de elipses soltas aleatórias
    var passo = 4;
    for (y = 0; y < MH; y += passo) {
      for (x = 0; x < MW; x += passo) {
        var v = Perlin.valor(x / 56, y / 56);
        if (v >= 0.62) c.fillStyle = tema.chao.mancha[0];
        else if (v <= 0.38) c.fillStyle = tema.chao.mancha[1];
        else continue;
        c.fillRect(x, y, passo, passo);
      }
    }

    // flores em cachos: faixa aceita MAIS LARGA (0,45..0,75) + 1 vizinho
    // por flor — as 30 saem em ~33 tentativas (antes 121) e caem mais
    // soltas pelo mapa. (Medição da leva: a "linha pontilhada" que
    // aparecia nas screenshots era TEXTO de dano flutuante — o
    // rasterizador de teste desenha glifo como bloco — e não o chão.)
    var flores = tema.chao.flores;
    var rng = Perlin.sorteio(semente * 3 + 1);
    var tent = 0;
    for (i = 0; flores.length && i < 30 && tent < 500; tent++) {
      var fx = Math.floor(rng() * MW);
      var fy = Math.floor(rng() * MH);
      var fa = Perlin.valor(fx / 40 + 11, fy / 40 + 5);
      if (fa < 0.45 || fa > 0.75) continue;
      c.fillStyle = flores[i % flores.length];
      c.fillRect(fx, fy, 2, 2);
      c.fillRect(fx + (rng() < 0.5 ? -3 : 3), fy + (rng() < 0.5 ? -2 : 2),
        1, 1);
      i++;
    }

    // pedrinhas e rachaduras: textura dura em fillRect puro
    c.fillStyle = tema.chao.borda2;
    for (i = 0; i < 26; i++) {
      c.fillRect(Math.floor(rng() * MW), Math.floor(rng() * MH),
        rng() < 0.35 ? 2 : 1, 1);
    }
    c.fillStyle = tema.chao.imp;
    for (i = 0; i < 20; i++) {
      c.fillRect(Math.floor(rng() * MW), Math.floor(rng() * MH), 2, 1);
    }

    c.strokeStyle = tema.chao.borda;
    c.lineWidth = 8;
    c.strokeRect(4, 4, MW - 8, MH - 8);
    c.strokeStyle = tema.chao.borda2;
    c.lineWidth = 2;
    c.strokeRect(4, 4, MW - 8, MH - 8);
  }

  // Obstáculos proceduralmente posicionados: pontos sorteados na base
  // 192×134 (mesma convenção das coordenadas antigas de mapas.js) filtrados
  // pelo ruído de Perlin — só entram em "clareira" do campo, sempre longe
  // do centro (spawn/renascimento do herói) e afastados uns dos outros.
  // Tipos e densidade vêm do tema; a posição, da semente do mapa.
  function constroiObst(tema, semente) {
    var ex = MW / 192, ey = MH / 134;
    var rng = Perlin.sorteio(semente * 7 + 29);
    var tipos = tema.obst.tipos;
    var alvo = tema.obst.qtd;
    var feitos = [];
    obst = [];
    var tent = 0;
    while (obst.length < alvo && tent < 600) {
      tent++;
      var x = 12 + rng() * 168;         // base 192 com folga de borda
      var y = 12 + rng() * 110;         // base 134
      // centro livre: onde o herói nasce e onde o renascimento cai no pior caso
      if (Math.abs(x - 96) < 36 && Math.abs(y - 67) < 32) continue;
      var perto = false;
      for (var i = 0; i < feitos.length; i++) {
        var ddx = feitos[i].x - x, ddy = feitos[i].y - y;
        if (ddx * ddx + ddy * ddy < 30 * 30) { perto = true; break; }
      }
      if (perto) continue;
      // clareira do ruído (relaxada depois de 400 tentativas: o tema tem
      // que ter a densidade mínima, mesmo num campo desfavorável)
      if (tent < 400 && Perlin.valor(x / 48 + 3, y / 48 + 9) < 0.42) continue;
      // vegetação nas altas do ruído, pedra nas baixas (quando há as duas)
      var arvore = tipos.length > 1 && Perlin.valor(x / 30 + 5, y / 30 + 5) > 0.5;
      var tipo = arvore ? 'tree' : tipos[tipos.length - 1];
      feitos.push({ x: x, y: y });
      obst.push({
        x: x * ex, y: y * ey,
        r: tipo === 'tree' ? 7 : 5,
        tipo: tipo,
        // âncora do sprite: árvore sobe 6, pedra 4 (convenção antiga)
        cx: x * ex, cy: (y + (tipo === 'tree' ? -6 : -4)) * ey
      });
    }
  }

  // (re)constrói chão e obstáculos quando o mapa muda
  function garanteCenario() {
    if (cenarioMapa === mapa) return;
    var tem = Mapas.info(mapa);
    Perlin.definirSemente(mapa);   // terreno/obstáculos = f(mapa)
    constroiChao(tem, mapa);
    constroiObst(tem, mapa);
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

  // Um passo de deslocamento em SUB-FRAÇÕES ≤4px: em alta velocidade o
  // salto de um frame atravessaria obstáculos (r deles 5-7, do herói 6 —
  // 25px/frame caem do outro lado sem encostar). Cada fração reaplica
  // resolve() → a colisão vale em QUALQUER velocidade (4 < 10, a menor
  // sobreposição do jogo = obst 5 + morcego 5). Custo: ceil(d/4) ≈ 7
  // iterações no pior caso de jogo real — desprezível.
  function mover(ent, ddx, ddy, raio) {
    var d = Math.sqrt(ddx * ddx + ddy * ddy);
    if (d <= 4) {
      ent.x += ddx;
      resolve(ent, raio);
      ent.y += ddy;
      resolve(ent, raio);
      return;
    }
    var n = Math.ceil(d / 4);
    var ux = ddx / n, uy = ddy / n;
    for (var i = 0; i < n; i++) {
      ent.x += ux;
      resolve(ent, raio);
      ent.y += uy;
      resolve(ent, raio);
    }
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
      atkT: 0, atkCd: 0, atkDur: 0.36, hitDone: true, inv: 1, fuga: null,
      morto: false, revT: 0
    };
    var c0 = alvoCamera();
    cam.x = c0.x;
    cam.y = c0.y;
    inimigos = [];
    semearPoeira();
    skillsEstado = {};
    Eventos.limpa();
    skillsVigentes = [];
    ultimaSkill = null;
    onda = 0;
    tOnda = 1.0;
    Efeitos.limpar();
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
    Efeitos.limpar();
  }

  // Retoma o mapa gravado no save (reabertura/progresso offline).
  function restaurarMapa(n) {
    if (typeof n !== 'number' || !isFinite(n) || n < 1) return;
    mapa = Math.floor(n);
    garanteCenario();
  }

  // Chefe do mapa derrubado: avança para o próximo (onda 1 de novo).
  function passaMapa() {
    var mAntes = Mapas.mundo(mapa);
    mapa++;
    // cutscene de fronteira (spec cutscenes): SÓ na campanha (destino
    // <= 10) — 100→101 (mundo 11) é da vitória, e no infinito os mundos
    // ciclam e cutscene seria spam. restaurarMapa não passa por aqui.
    var mDepois = Mapas.mundo(mapa);
    if (mDepois !== mAntes && mDepois <= 10) {
      Cutscene.mundo(mAntes, mDepois);
    } else if (mDepois !== mAntes) {
      // 100→101 (mundo 11): a VITÓRIA assume — corta qualquer cutscene
      // pendente (ex.: mundo 10 aberta e não dispensada). No infinito os
      // mundos ciclam e não há cutscene; o fecha() aqui é inofensivo.
      Cutscene.fecha();
    }
    onda = 0;
    garanteCenario();
    aviso('MAPA ' + mapa + ' — ' + Mapas.info(mapa).nome.toUpperCase(),
      '#8ce08c');
    tOnda = ESPERA_TRANSICAO;   // onda 1 do mapa novo não espera o
                                // respiro escalado (e a vitória do
                                // mundo 10 aparece já na transição)
    Ranking.submete();   // marco do ranking: fim de mapa (seção 35)
  }

  // Zera números/partículas/efeitos depois de uma simulação offline
  // (nums e parts moram no Efeitos desde a spec visual-efeitos).
  function limparEfeitos() {
    Efeitos.limpar();
  }

  // ----------------------------------------------------------- ondas
  // a onda FIM_MAPA de cada mapa é o chefe — vencido, passa de mapa
  function ehBoss(n) {
    return n === FIM_MAPA;
  }

  function proximaOnda() {
    if (onda >= FIM_MAPA) {
      stat('ondas');                       // onda 100 (chefe) limpa
      passaMapa(); return;
    }
    if (onda > 0) stat('ondas');           // a 1ª onda do jogo não conta
    onda++;
    Eventos.encerraEnxame();   // o bônus ×1,5 vale só pra onda do enxame
    spawnaOnda();
  }

  // Nasce a onda ATUAL (contagem e incremento ficam em proximaOnda).
  // Chamada direto no renascimento com rollback: a onda reduzida pela
  // morte nasce fresca SEM contar como onda limpa. Os resets de onda
  // (2ª vida, Cetro da Tempestade) são efeitos de nascimento.
  function spawnaOnda() {
    if (heroi) heroi.fenixUsada = false;
    if (Itens.temEfeito(Game.personagem, 'tempestade')) skillsEstado = {};
    var tem = Mapas.info(mapa);
    if (ehBoss(onda)) {
      // chefe + 2 minions do próprio mapa: a onda não espera um alvo só
      var chefe = spawn(tem.boss);
      spawn(tem.inimigos.comum);
      spawn(tem.inimigos.raro);
      aviso('BOSS! ' + tem.boss.nome, '#ff6b6b');
      Efeitos.bossChegou(chefe.x, chefe.y);
    } else {
      // nº de inimigos: ramp 3+tot/2 até o teto do mundo (spec mundos —
      // era fixo 5 para sempre); raro entra pelo total como sempre
      var tot = ondaTotal();
      var n = qtdMonstros();
      // ENXAME (spec monstros-novos R-MON-4.1): 2× inimigos nesta onda
      // e (em mataInimigo) XP/ouro ×1,5 — pressão com paga boa
      if (Eventos.nasceEnxame(onda)) {
        n = Math.ceil(n * 2);
        aviso('ENXAME! A PRAGA CHEGA EM BANDA', '#8ac040');
        Cutscene.evento('enxame');
      }
      for (var k = 0; k < n; k++) {
        spawn((tot >= 2 && k % 3 === 2) ? tem.inimigos.raro : tem.inimigos.comum);
      }
      aviso('ONDA ' + onda, '#e8c86a');
    }
    nasceEventos();
  }

  // Eventos aleatórios da onda: Açougueiro primeiro (em campo trava o
  // resto); gatuno rouba 15% e nasce longe das bordas p/ dar tempo de
  // reação. O ouro é debitado aqui (batalha é a dona de p.ouro).
  function nasceEventos() {
    if (Eventos.nasceAco(onda)) {
      var ac = spawn({ tipo: 'acougueiro' });
      aviso('AÇOUGUEIRO — CARNE FRESCA!', '#ff5a3a');
      Cutscene.evento('acougueiro');
      if (ac) numero(ac.x, ac.y - 40, 'CARNE FRESCA!', '#ff5a3a', true);
      return;
    }
    // COFRE ABANDONADO (R-MON-4.2): nasce no campo — só quem passar
    // por ele coleta (o herói caminha até lá quando não há inimigos)
    if (Eventos.nasceCofre(onda)) {
      var pc = posicaoAleatoriaSegura();
      Eventos.colocaCofre(pc.x, pc.y);
      aviso('COFRE ABANDONADO NO CAMPO!', '#e8c86a');
      Cutscene.evento('cofre');
    }
    var p = Game.personagem;
    var roubo = Eventos.nasceGat(p ? (p.ouro || 0) : 0);
    if (roubo > 0 && p) {
      p.ouro = Math.max(0, p.ouro - roubo);
      var g = spawn({ tipo: 'gatuno', roubo: roubo });
      aviso('GATUNO ROUBOU ' + roubo + ' OURO!', '#e8c86a');
      Cutscene.evento('gatuno');
      if (g) numero(g.x, g.y - 34, '-' + roubo + ' ouro', '#e8c86a', false);
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

    // dificuldade em escala CONTÍNUA entre mapas: ondaTotal soma as
    // ondas dos mapas anteriores, então a onda 1 do mapa 2 nasce no
    // mesmo patamar da onda 100 do mapa 1 (antes recomeçava em ~2× o
    // base — as primeiras ondas dos mapas seguintes eram fáceis demais).
    // A escala do herói (+4 HP/nível +5 pontos/nível) é mais suave,
    // senão vira loop. Mapas.forca ficou só nos drops (itens.js).
    var tot = ondaTotal();
    var escHp = 1 + tot * ESC_HP;
    var escDmg = 1 + tot * ESC_DMG;
    // chefe: hp x4 e dano x1.5 sobre a escala da própria onda — desafiador,
    // mas derrotável (ele não regenera e o herói revive com vida cheia)
    // Açougueiro: predador de topo — hp ×3 e dano ×1,35 sobre a onda
    // (medido: ×5/×1,6 era parede inquebrável → stall + morte ×2 quase
    // certa; ×3/×1,35 mantém o susto e devolve a chance de vingança)
    var ehAc = def.tipo === 'acougueiro';
    var hp = Math.round(t.hp * escHp * (t.boss ? 4 : ehAc ? 3 : 1));
    var ent = {
      x: x, y: y, tipo: t,
      chave: def.tipo || 'slime',   // p/ sonda de teste (seção 41)
      cor: def.cor || t.cor,
      escala: def.escala || t.escala || 1,
      forma: def.forma || t.forma || 'slime',
      hp: hp, hpMax: hp,
      dmg: Math.max(2,
        Math.round(t.dmg * escDmg * (t.boss ? 1.5 : ehAc ? 1.35 : 1))),
      // o chefe é pesado: não ganha a corrida de velocidade da onda
      vel: t.boss ? t.vel : t.vel + Math.min(12, tot),
      raio: raio,
      frame: 0, frameT: 0,
      atkCd: 0.5 + Math.random() * 0.8,
      hitFlash: 0, lunge: 0,
      medo: null, empurra: null,
      // astúcia da espécie no mapa atual (IA.decideInimigo), slot do
      // cerco (estável, dá a volta a cada 6) e esquiva com cooldown
      // inicial escalonado — a onda inteira não desvia junto
      astucia: IA.astucia(def.tipo, mapa),
      slot: inimigos.length % 6,
      esquivaCd: 1.5 + Math.random() * 2,
      acougueiro: ehAc,
      gatuno: def.tipo === 'gatuno',
      roubo: def.roubo || 0,
      // SKILLS DA ESPÉCIE copiadas do TIPOS (spec monstros-novos) — sem
      // isto en.ranged/en.regen/en.dreno ficam undefined e NENHUMA skill
      // nova funciona (bug medido: o atirador só dava golpe corpo a corpo)
      ranged: t.ranged || null,
      regen: t.regen,
      regenApos: t.regenApos,
      dreno: t.dreno
    };
    if (ent.gatuno) {
      // longe das bordas p/ dar tempo de reação (contrajogada)
      ent.x = Math.max(70, Math.min(MW - 70, ent.x));
      ent.y = Math.max(70, Math.min(MH - 70, ent.y));
    }
    inimigos.push(ent);
    return ent;
  }

  // -------------------------------------------------------- progressão
  function ganhaXP(qtd) {
    var p = Game.personagem;
    // teto de nível (NIVEL_MAX): no cap o XP é DESCARTADO na hora —
    // nenhum acumula escondido que drenaria num futuro raise do cap
    if (p.nivel >= Personagem.NIVEL_MAX) return;
    // safeguard: NaN/infinito/negativo/zero não mexem em nada (a renda
    // legítima tardia chega a ~10^46 — o teto superior morre no clamp
    // do normalizar, não aqui)
    if (typeof qtd !== 'number' || !isFinite(qtd) || qtd <= 0) return;
    // guarda contra save corrompido (xpProx <= 0 travaria a aba em loop)
    if (!(p.xpProx > 0)) {
      p.xpProx = Personagem.custoProximo(Math.max(1, Math.floor(p.nivel) || 1));
    }
    // SEM multiplicador de build: a renda é exatamente a calibrada
    // (12×1,064^onda — spec gestao-atributos; o xpMult do Carisma era
    // a "progressão errada" relatada: 3,6× no nv30, 855× no teto)
    p.xp += Math.max(1, Math.round(qtd));
    while (p.nivel < Personagem.NIVEL_MAX && p.xp >= p.xpProx) {
      p.xp -= p.xpProx;
      p.nivel++;
      // 1 ponto a cada 3 níveis (spec gestao-atributos — fonte única
      // em Personagem.PONTOS_CADA/NIVEL): decisão esparso e pesada
      if (p.nivel % Personagem.PONTOS_CADA === 0) {
        p.pontos += Personagem.PONTOS_NIVEL;
      }
      p.xpProx = Personagem.custoProximo(p.nivel);
      if (heroi && !heroi.morto) heroi.hp = heroi.hpMax;
      numero(heroi ? heroi.x : MW / 2, (heroi ? heroi.y : MH / 2) - 34,
        'NIVEL ' + p.nivel + '!', '#ffd866', true);
      Efeitos.nivelUp(heroi ? heroi.x : MW / 2,
        (heroi ? heroi.y : MH / 2) - 12);
      var nova = Skills.desbloqueada(p.classe, p.nivel);
      if (nova) {
        numero(heroi ? heroi.x : MW / 2, (heroi ? heroi.y : MH / 2) - 46,
          nova.nome + ' desbloqueada!', nova.cor, true);
      }
      // teto do loadout que subiu (spec arvore-skills: 3 → 4 no nv 50,
      // → 5 no nv 150) — o jogador fica sabendo que o slot abriu
      var limAqui = Skills.limite(p.nivel);
      if (limAqui > Skills.limite(p.nivel - 1)) {
        numero(heroi ? heroi.x : MW / 2, (heroi ? heroi.y : MH / 2) - 60,
          'Loadout: ' + limAqui + ' skills ativas!', '#8ce08c', true);
      }
    }
    // chegou ao teto neste lote: sobra do último nível é descartada
    if (p.nivel >= Personagem.NIVEL_MAX) p.xp = 0;
  }

  // Move em direção ao destino com rota REATIVA: reto quando a linha está
  // livre (sempre o melhor caminho); bloqueado => A* pela IA (só entidades
  // espertas — burros seguem na reta e escorregam na colisão). A rota fica
  // em ent.caminho e o reteste tem cooldown (não recalcula todo frame).
  function moverPara(ent, dest, raio, dt, esperto) {
    if (!dest) return;
    var dx = dest.x - ent.x, dy = dest.y - ent.y;
    if (dx * dx + dy * dy > 48 * 48) {
      ent.caminho = null;                 // destino andou demais: invalida
    }
    var ddx = dx, ddy = dy;
    if (IA.linhaLivre(ent.x, ent.y, dest.x, dest.y, raio)) {
      ent.caminho = null;
    } else if (esperto) {
      if (ent.caminho && ent.caminho.length) {
        var prox = ent.caminho[0];
        var px = prox.x - ent.x, py = prox.y - ent.y;
        if (px * px + py * py < 12 * 12) {
          ent.caminho.shift();
          prox = ent.caminho[0];
        }
        if (prox) { ddx = prox.x - ent.x; ddy = prox.y - ent.y; }
        else ent.caminho = null;
      } else {
        ent.caminhoT = (ent.caminhoT || 0) - dt;
        if (ent.caminhoT <= 0) {
          ent.caminhoT = 0.4;
          ent.caminho = IA.caminho(ent.x, ent.y, dest.x, dest.y, raio) || [];
          if (ent.caminho.length) {
            ddx = ent.caminho[0].x - ent.x;
            ddy = ent.caminho[0].y - ent.y;
          }
        }
      }
    }
    var d = Math.sqrt(ddx * ddx + ddy * ddy);
    if (d < 0.001) return;
    var passo = (ent === heroi) ? ent.stats.vel * dt : ent.vel * dt;
    mover(ent, (ddx / d) * passo, (ddy / d) * passo, raio);
  }

  // ----------------------------------------------------------- efeitos
  function numero(x, y, txt, cor, big) {
    // estilo booleano legado: true = 'big' (Efeitos.nota normaliza)
    Efeitos.nota(x, y, txt, cor, big);
  }

  // Estatísticas de vida inteira (Personagem.stats). Escreve sempre no
  // personagem em foco — mesma regra do XP: a batalha só roda na jogatina,
  // onde foco e dono da batalha coincidem.
  function stat(chave, n) {
    var p = Game.personagem;
    if (!p || !p.stats) return;
    p.stats[chave] = (p.stats[chave] || 0) + (n === undefined ? 1 : n);
    // vampirismo lendário (Sangue Frio): 4% do dano causado vira vida —
    // silencioso, sem popup (bate a cada golpe)
    if (chave === 'danoCausado' && typeof n === 'number' && n > 0 &&
        heroi && !heroi.morto) {
      var pv = Itens.pctVamp(p);
      if (pv > 0) {
        heroi.hp = Math.min(heroi.hpMax,
          heroi.hp + Math.max(1, Math.round(n * pv)));
      }
    }
  }

  // Penalidade de morte (padrão Diablo 2): −10% do ouro (piso de 1
  // quando há ouro) e volta de 5 ondas (piso: onda 1 do mapa atual —
  // nunca sai do mapa). A onda em curso só é desfeita no renascimento
  // (rollbackPend → inimigos limpos + spawnaOnda), porque este ponto
  // roda DENTRO do laço decrescente de inimigos. mult > 1 vem dos
  // eventos (Açougueiro = 2). Mesmas regras offline: é o mesmo loop.
  var rollbackPend = false;
  function penalizaMorte(mult) {
    // com o Açougueiro em campo a morte dobra (−20% ouro, −10 ondas)
    if (mult === 1) {
      for (var i = 0; i < inimigos.length; i++) {
        if (inimigos[i].acougueiro) { mult = 2; break; }
      }
    }
    var p = Game.personagem;
    if (p && p.ouro > 0) {
      p.ouro -= Math.max(1, Math.floor(p.ouro * 0.1 * mult));
      if (p.ouro < 0) p.ouro = 0;
    }
    onda = Math.max(1, onda - 5 * mult);
    rollbackPend = true;
  }

  // o predador parte (timeout ou morte do herói) — fora do laço
  function despachaAco() {
    Eventos.acoPartiu();
    for (var i = 0; i < inimigos.length; i++) {
      if (inimigos[i].acougueiro) { inimigos.splice(i, 1); break; }
    }
    aviso('O Açougueiro partiu... por enquanto.', '#ff5a3a');
  }

  // ---- skills de espécie (spec monstros-novos) — FUNÇÕES PURAS ----
  // Vira fonte única do update e é exportada p/ teste sem arena.

  // REGENERADOR: cura 3%/s quando não apanha há 2s (espelho do inv do
  // herói). hitFlash > 0 = acabou de levar golpe (setado em todos os
  // pontos de dano); veneno trava (senão o veneno do herói seria inútil
  // contra ele).
  function regeneraEspecie(en, dt) {
    if (!en.regen || en.veneno) return false;
    if (en.hp <= 0 || en.hp >= en.hpMax) return false;
    if (en.hitFlash > 0) en.semDano = 0;
    else en.semDano = (en.semDano || 0) + dt;
    if (en.semDano <= en.regenApos) return false;
    en.hp = Math.min(en.hpMax, en.hp + en.hpMax * en.regen * dt);
    return true;
  }

  // DRENADOR: 30% do dano que dá vira vida dele (fica tanque contra
  // build de dano lento — castiga DPS baixo)
  function drenaVida(en, dmg) {
    if (!en.dreno || en.hp <= 0 || en.hp >= en.hpMax) return false;
    en.hp = Math.min(en.hpMax, en.hp + dmg * en.dreno);
    return true;
  }

  // Dano do inimigo no herói — guarda de invirmortalidade num lugar só
  // (antes estava no chamador) e o roubo de vida do drenador
  function machucaHeroi(en, dmg) {
    if (heroi.morto || heroi.inv > 0) return;
    danoHeroi(dmg);
    if (drenaVida(en, dmg)) {
      numero(en.x, en.y - 20, '+' + Math.round(dmg * en.dreno),
        '#9a5ab8', false);
    }
  }

  // Tiro do atirador (R-MON-2): o projétil SEGUE o herói (Efeitos.missil
  // guarda a referência) e o dano cai NA CHEGADA — mesmo padrão do
  // golpe à distância do herói. Não atira em cadáver e o impacto
  // respeita o inv (mesma regra do golpe corpo a corpo).
  function atiraInimigo(en) {
    if (heroi.morto) return;
    Efeitos.missil({ x: en.x, y: en.y - 10 }, heroi,
      '#9ab8d8', 0.75, function () {
        machucaHeroi(en, en.dmg);
      });
  }

  function danoHeroi(dmg) {
    if (heroi.morto) return;
    stat('danoRecebido', Math.round(dmg));
    heroi.hp -= dmg;
    heroi.inv = 0.5;
    Efeitos.impactoHeroi(heroi.x, heroi.y, false);
    numero(heroi.x, heroi.y - 26, '-' + dmg, '#ff6b6b', false);
    if (heroi.hp <= 0) {
      // 2ª vida lendária (Véu da Fênix): 1× por onda, revive com metade
      if (!heroi.fenixUsada &&
          Itens.temEfeito(Game.personagem, 'fenix')) {
        heroi.hp = Math.max(1, Math.round(heroi.hpMax * 0.5));
        heroi.fenixUsada = true;
        heroi.inv = 1.2;
        numero(heroi.x, heroi.y - 36, '2ª VIDA!', '#ffd866', true);
        Efeitos.cura(heroi.x, heroi.y - 6, '#ffd866');
        return;
      }
      // marco do ranking ANTES da penalidade (−5 ondas): registra o
      // progresso real alcançado, não o pós-rollback (seção 35)
      Ranking.submete();
      penalizaMorte(1);        // 2ª vida (Fênix) retornou antes: não paga
      heroi.hp = 0;
      heroi.morto = true;
      stat('mortes');
      heroi.revT = 3;
      morte.x = heroi.x;      // inimigos se agrupam onde ele caiu
      morte.y = heroi.y;
      heroi.anim = 'idle';
      Efeitos.impactoHeroi(heroi.x, heroi.y, true);
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

  // Recompensa do COFRE (spec monstros-novos R-MON-4.2): ouro =
  // forca×25 + drop GARANTIDO rar ≥2 — o 1º evento "bom" do jogo
  // (só existiam pressão e contrajogada). O item passa pelo mesmo
  // auto-equip/bolsa de qualquer drop.
  function coletaCofre(cof) {
    Eventos.cofreColetado();
    var p = Game.personagem;
    if (!p) return;
    var ouro = Math.round(Mapas.forca(mapa) * 25);
    p.ouro = Math.min((p.ouro || 0) + ouro, Personagem.OURO_MAX);
    stat('ouroGanho', ouro);
    numero(cof.x, cof.y - 24, '+' + ouro + ' OURO!', '#e8c86a', true);
    Efeitos.brasas(cof.x, cof.y - 8, '#e8c86a', 6, 40, 50);
    var it = Itens.geraItem(2, mapa, p.classe);   // rar 2 garantido
    stat('itens');
    var equipou = Itens.equiparSeMelhor(p, it);
    if (!equipou) Itens.guardar(p, it);
    numero(cof.x, cof.y - 44, (equipou ? it.nome + '!' : '+' + it.nome),
      Itens.corRar(it.rar), false);
    aviso('COFRE: +' + ouro + ' OURO!', '#e8c86a');
  }

  function mataInimigo(i, en) {
    Efeitos.morte(en.x, en.y, en.cor, !!(en.tipo && en.tipo.boss));
    inimigos.splice(i, 1);
    stat('abates');
    if (en.acougueiro) { stat('acougueiros'); Eventos.acoMorreu(); }
    if (en.gatuno) stat('gatunos');
    // XP na mesma escala contínua das ondas: a recompensa não despenca
    // no primeiro kill de cada mapa novo (o nível travava no troco de
    // mapa). (+ondaTotal+1 reproduz exatamente o 4+onda×2 de sempre no
    // mapa 1.)
    var ganho = xpAbate(ondaTotal(), en.tipo.xpExtra);
    // bônus do ENXAME: só enquanto a onda dele está de pé
    ganho = Math.round(ganho * Eventos.multEnxame());
    if (en.tipo.boss) {
      stat('bosses');
      // recompensa de chefe: XP de várias ondas de uma vez
      ganho = Math.round(ganho * 5);
      numero(en.x, en.y - 40, 'BOSS DERROTADO!', '#ffd866', true);
    } else if (en.acougueiro) {
      // vingança completa: XP ×4 (ouro ×10 está na conta de baixo)
      ganho = Math.round(ganho * Eventos.MULT_XP_ACO);
      numero(en.x, en.y - 40, 'AÇOUGUEIRO ABATIDO!', '#ff5a3a', true);
    }
    // ouro do abate: escala com o mapa e a onda (chefe paga ×8) — a
    // moeda sustenta venda/sucata/aprimoramento/re-roll da aba Itens
    var ouro = Math.round(Eventos.multEnxame() *
      (1 + Math.random() * 2) * Mapas.forca(mapa) *
      (1 + (ondaTotal() + 1) * 0.04) *
      (en.tipo.boss ? 8 : (en.acougueiro ? Eventos.MULT_OURO_ACO : 1)));
    ouro = Math.round(ouro * Itens.multOuro(Game.personagem));  // mercador
    // Carisma → ouro (spec gestao-atributos): logarítmico, saturante
    // — fonte única em Personagem.multOuroCar (testável, seção 7)
    ouro = Math.round(ouro * Personagem.multOuroCar(
      Game.personagem.atributos.car));
    // safeguard: teto de ouro total (spec progressao-exponencial)
    Game.personagem.ouro = Math.min(
      (Game.personagem.ouro || 0) + ouro, Personagem.OURO_MAX);
    stat('ouroGanho', ouro);
    numero(en.x, en.y - 24, '+' + ganho + ' XP · +' + ouro + ' ouro',
      '#ffd866', false);
    ganhaXP(ganho);
    // gatuno derrubado: o resgate (roubo ×1,2) é a recompensa — sem drop
    if (en.gatuno) {
      var resg = Eventos.gatAbatido();
      Game.personagem.ouro = (Game.personagem.ouro || 0) + resg;
      stat('ouroGanho', resg);
      numero(en.x, en.y - 40, '+' + resg + ' OURO DE VOLTA!', '#8ce08c',
        true);
    } else {
      soltaItens(en);
    }
    // dentro do mapa o respiro escala com a profundidade; na onda 100
    // (chefe) ele é ZERO (spec respiro R-RES-3): a espera da troca de
    // mapa é a do passaMapa (ESPERA_TRANSICAO) — antes os DOIS 8s
    // somavam 16s de campo vazio no troco ("o personagem dorme").
    // B2: o clear vira beat de decisão — avisa quanto falta e o que já
    // dá pra distribuir. Chefe não avisa aqui (BOSS DERROTADO! + o
    // MAPA N do passaMapa já cobrem o momento).
    tOnda = ehBoss(onda) ? 0 : esperaOnda();
    if (inimigos.length === 0 && !ehBoss(onda) && !heroi.morto) {
      var pts = Game.personagem.pontos || 0;
      aviso('ONDA LIMPA · ' + Math.ceil(tOnda) + 's' +
        (pts > 0 ? ' · +' + UI.abrev(pts) + ' PONTOS' : ''), '#8ce08c');
    }
  }

  // Drop do abate: equipa automaticamente se for melhor que o equipado;
  // senão vai para a bolsa (a mais antiga sai quando enche).
  function soltaItens(en) {
    var p = Game.personagem;
    if (!p || !p.equip || !p.bolsa) return;
    var drops = Itens.sorteiaDrop(mapa, !!en.tipo.boss, p.classe);
    // vitória sobre o predador: lendário garantido (o drop normal rola por
    // cima, se a chance quiser)
    if (en.acougueiro) drops.unshift(Itens.geraItem(4, mapa, p.classe));
    for (var i = 0; i < drops.length; i++) {
      stat('itens');
      var it = drops[i];
      if (it.rar >= 4) stat('lendarios');
      var equipou = Itens.equiparSeMelhor(p, it);
      if (!equipou) Itens.guardar(p, it);
      numero(en.x, en.y - 34,
        (it.rar >= 4 ? '★ ' : '') + (equipou ? it.nome + '!' : '+' + it.nome),
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
      // monstro esquivando: o golpe passa raspando (janela de 0,16s)
      if (en.esquiva) {
        numero(en.x, en.y - 22, 'ESQUIVOU', '#c9c2dd', false);
        continue;
      }

      var crit = Math.random() * 100 < st.crit;
      var dmg = st.dano + Math.floor(Math.random() * 3);
      if (crit) dmg *= 2;

      en.hp -= dmg;
      stat('danoCausado', dmg);
      en.hitFlash = 0.12;
      if (d > 0.01) {
        en.x += (dx / d) * 4;
        en.y += (dy / d) * 4;
        resolve(en, en.raio || 6);
      }
      numero(en.x, en.y - 18, String(dmg), crit ? '#ffd866' : '#ffffff',
        crit ? 'crit' : false);
      Efeitos.impacto(en.x, en.y - 4, '#ffffff', crit);

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
    // o cérebro (IA) escolheu um alvo prioritário ainda válido? senão, o
    // mais perto dentro do alcance
    var mira = heroi.ia ? heroi.ia.alvo : null;
    if (mira && mira.hp > 0) {
      var mdx = mira.x - heroi.x, mdy = mira.y - heroi.y;
      if (mdx * mdx + mdy * mdy <= alc2) alvo = mira;
    }
    for (var i = 0; !alvo && i < inimigos.length; i++) {
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
        if (alvo.esquiva) {               // deslizou: o projétil erra
          numero(alvo.x, alvo.y - 22, 'ESQUIVOU', '#c9c2dd', false);
          return;
        }
        alvo.hp -= dmg;
        stat('danoCausado', dmg);
        alvo.hitFlash = 0.12;
        var ddx = alvo.x - heroi.x, ddy = alvo.y - heroi.y;
        var d = Math.sqrt(ddx * ddx + ddy * ddy);
        if (d > 0.01) {
          alvo.x += (ddx / d) * 4;
          alvo.y += (ddy / d) * 4;
          resolve(alvo, alvo.raio || 6);
        }
        numero(alvo.x, alvo.y - 18, String(dmg),
          crit ? '#ffd866' : '#ffffff', crit ? 'crit' : false);
        Efeitos.impacto(alvo.x, alvo.y - 4, cl.corProj, crit);
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
        stat('danoCausado', dmg);
        alvo.hitFlash = 0.15;
        numero(alvo.x, alvo.y - 18, String(dmg), '#ffffff', false);
        Efeitos.impacto(alvo.x, alvo.y - 4, mg.cor, false);
        if (alvo.hp <= 0) mataInimigo(idx, alvo);
      });
  }

  // Agudeza da INT vigente — a mesma régua de IA.agudeza do cérebro;
  // as skills disparam com raio/cooldown proporcionais a ela (gênio usa
  // mais cedo e com menos espera).
  function aguHeroi() {
    var s = heroi ? heroi.stats : null;
    return IA.agudeza(s && s.atributos ? s.atributos.int : 8);
  }

  // Nuke/cura periódicos (rodando a cada frame com alvo em mãos).
  function skillsPeriodicas(dt, alvo) {
    var agu = aguHeroi();
    for (var i = 0; i < skillsVigentes.length; i++) {
      var mg = skillsVigentes[i];
      if (mg.tipo !== 'nuke' && mg.tipo !== 'cura') continue;
      var st = estadoSkill(mg.id);
      st.t -= dt;
      if (st.t > 0) continue;
      st.t = IA.skillEfeito(mg, agu).intervalo || mg.intervalo;
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
          // égide santificada: a cura respinga o mesmo valor nos
          // inimigos próximos (laço descendente, igual à varredura)
          if (Itens.temEfeito(Game.personagem, 'santificado')) {
            fereProximos(ganho);
          }
        }
      }
    }
  }

  function fereProximos(dano) {
    var raio2 = 64 * 64;
    for (var i = inimigos.length - 1; i >= 0; i--) {
      var en = inimigos[i];
      var dx = en.x - heroi.x, dy = en.y - heroi.y;
      if (dx * dx + dy * dy > raio2) continue;
      var dmg = Math.max(1, dano);
      en.hp -= dmg;
      stat('danoCausado', dmg);
      en.hitFlash = 0.12;
      numero(en.x, en.y - 18, String(dmg), '#ffe89a', false);
      Efeitos.impacto(en.x, en.y - 4, '#ffe89a', false);
      if (en.hp <= 0) mataInimigo(i, en);
    }
  }

  // Varredura da skill 'area': acerta todos os inimigos.
  function varredura(mg) {
    var st = heroi.stats;
    numero(heroi.x, heroi.y - 44, mg.nome, mg.cor, true);
    Efeitos.corte(heroi.x, heroi.y - 10, mg.cor,
      1 + (mg.mult - 1) * 0.8, heroi.facing);
    Efeitos.sacudir(0.1 + (mg.mult - 1) * 0.15);
    for (var i = inimigos.length - 1; i >= 0; i--) {
      var en = inimigos[i];
      var dmg = Math.max(1, Math.round(st.dano * mg.mult) +
        Math.floor(Math.random() * 3));
      en.hp -= dmg;
      stat('danoCausado', dmg);
      en.hitFlash = 0.12;
      numero(en.x, en.y - 18, String(dmg), mg.cor, false);
      Efeitos.impacto(en.x, en.y - 4, mg.cor, false);
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
    var agu = aguHeroi();
    for (var i = 0; i < skillsVigentes.length; i++) {
      var sk = skillsVigentes[i];
      if (sk.tipo !== 'mobilidade' && sk.tipo !== 'medo') continue;
      var st = estadoSkill(sk.id);
      st.t -= dt;
      if (st.t > 0) continue;
      var ef = IA.skillEfeito(sk, agu);
      var gat = ef.gatilho || sk.gatilho;
      var perto = false;
      for (var j = 0; j < inimigos.length; j++) {
        var dx = inimigos[j].x - heroi.x, dy = inimigos[j].y - heroi.y;
        if (dx * dx + dy * dy <= gat * gat) { perto = true; break; }
      }
      if (!perto) continue;
      st.t = ef.intervalo || sk.intervalo;
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
    Efeitos.corte(heroi.x, heroi.y - 10, sk.cor, 1.5, heroi.facing);
    Efeitos.sacudir(0.25);
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
    // direção da fuga fica registrada 0,6s: monstros astutos antecipam
    heroi.escapa = { x: ux, y: uy, t: 0.6 };
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
      Efeitos.corte(heroi.x, heroi.y - 10, sk.cor, 0.9, heroi.facing);
    }
  }

  // Amedronta (clérigo): os inimigos no raio fogem por sk.dur segundos —
  // correm para longe e não atacam enquanto durar o medo.
  function aplicaMedo(sk) {
    numero(heroi.x, heroi.y - 44, sk.nome, sk.cor, true);
    Efeitos.explosao(heroi.x, heroi.y - 10, sk.cor, 1.0);
    Efeitos.sacudir(0.15);
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
    // fúria lendária (Lâmina Espectral): HP < 30% => dano ×1,5
    var fd = Itens.multDano(Game.personagem, s.hpMax > 0 ? h.hp / s.hpMax : 1);
    if (fd !== 1) s.dano = Math.max(1, Math.round(s.dano * fd));
    h.stats = s;
    if (s.hpMax !== h.hpMax) {
      h.hpMax = s.hpMax;
      if (h.hp > h.hpMax) h.hp = h.hpMax;
    }
    // skills ativas (classe/nível podem mudar em combate)
    skillsVigentes = Skills.carregadas(Game.personagem);

    if (h.atkCd > 0) h.atkCd -= dt;
    if (h.inv > 0) h.inv -= dt;
    // sustento do herói: 4%/s quando não apanha há 0,5s (inv zerado) —
    // segura a fronteira p/ a morte voltar a ser evento (Leva 1).
    // COM TETO em hp/s (spec gestao-atributos): sem ele o HP late-game
    // (70k com CON mono) regenerava 2.800/s = invencível contra 1-2
    // inimigos. Corte no early = ZERO (regen early ≈ 4-20 hp/s).
    // HP em si NÃO mexe: ele sustenta a frente contra a dificuldade
    // linear (1+tot×ESC). Ajustar só com medição (tasks T9).
    if (h.inv <= 0 && h.hp < h.hpMax) {
      var regen = Math.min(REGEN_MAX, h.hpMax * 0.04);
      h.hp = Math.min(h.hpMax, h.hp + regen * dt);
    }
    if (h.escapa) {
      h.escapa.t -= dt;
      if (h.escapa.t <= 0) h.escapa = null;
    }

    // cérebro tático (IA): alvo/estado/destino decididos por tick, com
    // qualidade escalada pela INT (agudeza) — o alvo escolhido alimenta
    // skills, mira à distância e a perseguição
    IA.decideHeroi(h, inimigos, dt);
    var alvo = h.ia.alvo;
    if (h.ia.estado === 'perseguir' || h.ia.estado === 'combate') {
      h.ia.destino = alvo;                // alvo vivo segue a cada frame
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
    // COFRE ABANDONADO (R-MON-4.2): sem alvo em campo, o herói caminha
    // até ele (o estado "espera" da IA o deixaria parado pra sempre).
    // Guard !atacando: não interrompe um golpe em curso.
    if (!alvo && !atacando && !heroi.morto) {
      var cof0 = Eventos.posCofre();
      if (cof0) {
        var cdx = cof0.x - h.x, cdy = cof0.y - h.y;
        var cd = Math.sqrt(cdx * cdx + cdy * cdy) || 1;
        if (cd > 6) {
          mover(h, (cdx / cd) * h.stats.vel * dt,
            (cdy / cd) * h.stats.vel * dt, 6);
          if (Math.abs(cdx) > 2) h.facing = cdx > 0 ? 1 : -1;
          anima(h, 'walk', dt);
        }
      }
    }
    if (atacando) {
      h.atkT -= dt;
      // a animação acompanha a RECHARGA (bug: 0,36s fixos estagnavam a
      // Destreza em ~17 pontos) — frames e hit relativos à duração real
      var dur = h.atkDur || 0.36;
      var e2 = dur - Math.max(0, h.atkT);
      h.anim = 'attack';
      h.frame = Math.max(0, Math.min(2, Math.floor(e2 / (dur / 3))));
      if (!h.hitDone && e2 >= Math.min(0.10, dur * 0.5)) {
        h.hitDone = true;
        golpeia();
      }
      if (h.atkT <= 0) h.atkT = 0;
    }

    if (!atacando) {
      var alc = h.stats.alcance;
      // o destino de fuga está a <24px? encostado/preso na parede fugir
      // não resolve — para de correr e briga (bug: gênio encurralado
      // ficava em gelo sem atacar)
      var temEspaco = false;
      if (h.ia.destino) {
        var idx = h.ia.destino.x - h.x, idy = h.ia.destino.y - h.y;
        temEspaco = idx * idx + idy * idy >= 24 * 24;
      }
      var fugindo = h.ia.estado === 'recuar' && temEspaco;
      if (fugindo) {
        // gênio ferido: abre mão do golpe e cria distância (destino fixo
        // recalculado a cada tick do cérebro)
        moverPara(h, h.ia.destino, 6, dt, h.ia.agu >= 0.35);
        anima(h, 'walk', dt);
      } else if (alvo) {
        var dx2 = alvo.x - h.x, dy2 = alvo.y - h.y;
        var dist = Math.sqrt(dx2 * dx2 + dy2 * dy2) || 1;
        if (Math.abs(dx2) > 2) h.facing = dx2 > 0 ? 1 : -1;

        // kite (ranged esperto): a fuga decide só o MOVIMENTO entre
        // golpes — o tiro NUNCA é bloqueado por estar colado (bug:
        // ranged não atacava em <0.7×alcance; sem espaço p/ fugir,
        // ficava parado)
        var foge = h.ia.estado === 'kite' && dist < alc * 0.7 && temEspaco;
        var bate = dist <= alc * 0.75 ||
          (h.ia.estado === 'kite' && dist <= alc);

        if (bate && !(foge && h.atkCd > 0)) {
          anima(h, 'idle', dt);
          if (h.atkCd <= 0) {
            // a animação acompanha a recarga: ciclo real = recarga em
            // qualquer DES (sem piso — curva 35/vel pura)
            h.atkDur = Math.min(0.36, h.stats.recarga);
            h.atkT = h.atkDur;
            h.atkCd = h.stats.recarga;
            h.hitDone = false;
          }
        } else if (foge || dist > alc * 0.75) {
          // fora de alcance: se aproxima — ou cria distância no kite.
          // nunca golpeia o ar
          moverPara(h, h.ia.destino || alvo, 6, dt, h.ia.agu >= 0.35);
          anima(h, 'walk', dt);
        } else {
          anima(h, 'idle', dt);
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
      // skill do REGENERADOR (spec monstros-novos) — fonte única em
      // regeneraEspecie (exportada p/ teste puro)
      regeneraEspecie(en, dt);
      if (en.lunge > 0) en.lunge -= dt;

      // dano contínuo do veneno (skill do ladino)
      if (en.veneno) {
        en.veneno.t -= dt;
        en.veneno.acc += en.veneno.dps * dt;
        if (en.veneno.acc >= 1) {
          var v = Math.floor(en.veneno.acc);
          en.veneno.acc -= v;
          en.hp -= v;
          stat('danoCausado', v);
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

      // Gatuno (evento): não briga — corre p/ a borda mais próxima com
      // o ouro; tocar a borda = perda (o tempo do Eventos desemperra)
      if (en.gatuno) {
        var dk = 0;
        var dists = [en.x, MW - en.x, en.y, MH - en.y];
        for (var q = 1; q < 4; q++) if (dists[q] < dists[dk]) dk = q;
        var pv = en.vel * dt;
        mover(en, dk === 0 ? -pv : (dk === 1 ? pv : 0),
                   dk === 2 ? -pv : (dk === 3 ? pv : 0), en.raio || 6);
        if (dists[dk] <= pv + 1) {
          var perdido = en.roubo || 0;
          Eventos.gatFugiu();
          inimigos.splice(i, 1);
          aviso('GATUNO ESCAPOU COM ' + perdido + ' OURO!', '#ff6b6b');
        }
        continue;
      }

      // empurrão da skill: sendo arremessado, não reage à IA
      if (en.empurra) {
        en.empurra.t -= dt;
        mover(en, en.empurra.vx * dt, en.empurra.vy * dt, en.raio || 6);
        if (en.empurra.t <= 0) en.empurra = null;
        continue;
      }

      // cérebro do monstro: cerco/antecipação/esquiva pela astúcia
      IA.decideInimigo(en, heroi, dt);

      // esquiva em curso: desliza lateral e não reage à IA na janela
      if (en.esquiva) {
        en.esquiva.t -= dt;
        mover(en, en.esquiva.vx * dt, en.esquiva.vy * dt, en.raio || 6);
        if (en.esquiva.t <= 0) en.esquiva = null;
        continue;
      }

      // destino do movimento: slot do cerco/antecipação da IA, ou — no
      // burro — o herói vivo na hora (herói caído: local da morte)
      var hx = heroi.morto ? morte.x : heroi.x;
      var hy = heroi.morto ? morte.y : heroi.y;
      var vhx = hx - en.x, vhy = hy - en.y;
      var distH = Math.sqrt(vhx * vhx + vhy * vhy) || 1;
      var alvoX = hx, alvoY = hy;
      if (!heroi.morto && en.ia && en.ia.destino) {
        alvoX = en.ia.destino.x;
        alvoY = en.ia.destino.y;
      }
      // flocking (spec ia-monstros): a separação universal desloca o
      // destino para longe dos aliados — e, quando a base É de ataque
      // (≤13px), mantém o resultado ≤12,5px do alvo: sem o clamp o
      // destino sai de 13px, o monstro para em cima dele e o ramo de
      // golpe (distH ≤13) nunca dispara. Base longa (antecipação a
      // 40px) não é clampada — cortar a fuga precisa do ponto à frente.
      var brx = alvoX - hx, bry = alvoY - hy;
      var br = Math.sqrt(brx * brx + bry * bry);
      var sep = IA.separacao(en, inimigos);
      alvoX += sep.x;
      alvoY += sep.y;
      if (br <= 13) {
        var sdx = alvoX - hx, sdy = alvoY - hy;
        var sr = Math.sqrt(sdx * sdx + sdy * sdy);
        if (sr > 12.5) {
          alvoX = hx + sdx * (12.5 / sr);
          alvoY = hy + sdy * (12.5 / sr);
        }
      }
      var vx = alvoX - en.x, vy = alvoY - en.y;

      // medo (Amedronta): corre para longe do herói e não ataca —
      // o cronômetro anda mesmo com o herói caído, senão trava em 100%
      var comMedo = false;
      if (en.medo) {
        en.medo.t -= dt;
        comMedo = en.medo.t > 0 && !heroi.morto;
        if (en.medo.t <= 0) en.medo = null;
      }

      if (comMedo) {
        mover(en, -(vhx / distH) * en.vel * 0.9 * dt,
          -(vhy / distH) * en.vel * 0.9 * dt, en.raio || 6);
      } else if (heroi.morto) {
        if (distH > 20) mover(en, (vhx / distH) * en.vel * 0.5 * dt,
          (vhy / distH) * en.vel * 0.5 * dt, en.raio || 6);
      } else if (en.ranged) {
        // ATIRADOR (spec monstros-novos R-MON-2): fora do alcance fecha
        // a distância; DENTRO dele atira (cd 2,2s = janela de reação —
        // o golpe corpo a corpo é 1,4s). Não fica imóvel: quem quiser
        // encarar precisa colar (o guerreiro tem alcance 26, o tiro 90)
        if (distH > en.ranged.alcance) {
          moverPara(en, { x: alvoX, y: alvoY }, en.raio || 6, dt,
            (en.astucia || 0) >= 0.4);
        } else if (en.atkCd <= 0) {
          en.atkCd = en.ranged.cd;
          atiraInimigo(en);
        }
      } else if (distH > 13) {
        // se aproxima do alvo (slot do cerco/antecipação/herói) — A*
        // quando a reta está bloqueada e a astúcia >= 0,4
        moverPara(en, { x: alvoX, y: alvoY }, en.raio || 6, dt,
          (en.astucia || 0) >= 0.4);
      } else if (en.atkCd <= 0) {
        en.atkCd = 1.4;
        en.lunge = 0.18;
        machucaHeroi(en, en.dmg);
      }
    }
  }

  // contaTempo: só o update da jogatina passa true — a simulação de
  // ausência (progresso offline) em jogo.js não é tempo jogado
  function atualizar(dt, contaTempo) {
    if (!heroi) return;
    atualizaCamera(dt);        // é apresentação: segue mesmo pausada
    if (pausada) return;
    // hit-stop antes de tudo (doc): congela mundo E partículas — o
    // tempo de jogo não corre durante o congelamento
    if (Efeitos.congelar(dt)) return;
    // influence map: ocupação repintada no TOPO do frame, antes do
    // herói (atualizaHeroi) e dos monstros (atualizaInimigos) — os
    // dois leem a pintura corrente (spec ia-heroi / ia-monstros)
    IA.pintaMapa(inimigos);
    if (contaTempo) stat('tempo', dt);



    // efeitos visuais (missis podem matar e reduzir a lista de inimigos
    // antes do laço de baixo — por isso rodam primeiro)
    Efeitos.perigo(heroi.hp / heroi.hpMax);
    Efeitos.atualizar(dt);

    // COFRE ABANDONADO: coleta por PROXIMIDADE (o herói caminha até lá
    // quando não há inimigos — ver atualizaHeroi)
    var cof = Eventos.posCofre();
    if (cof && !heroi.morto) {
      var dxc = heroi.x - cof.x, dyc = heroi.y - cof.y;
      if (dxc * dxc + dyc * dyc < 22 * 22) coletaCofre(cof);
    }

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
        Efeitos.reviver(heroi.x, heroi.y);
        numero(heroi.x, heroi.y - 26, 'DE VOLTA!', '#8ce08c', true);
        // o Açougueiro não fica p/ vingança: morte do herói = ele parte
        // (a penalidade já foi APLICADA EM DOBRO na morte)
        if (Eventos.acoEmCampo()) despachaAco();
        if (rollbackPend) {
          // a onda perdida é desfeita aqui (fora do laço de inimigos) e
          // a onda reduzida renasce sem contar em stats.ondas
          rollbackPend = false;
          inimigos.length = 0;
          spawnaOnda();
        }
      }
    } else {
      atualizaHeroi(dt);
    }

    atualizaInimigos(dt);

    // timers dos eventos (ponto seguro: fora do laço de inimigos)
    if (Eventos.atualizaAco(dt)) despachaAco();
    if (Eventos.atualizaGat(dt)) {
      // gatuno emperrado além do tempo: desiste da fuga
      for (var gi = 0; gi < inimigos.length; gi++) {
        if (inimigos[gi].gatuno) { inimigos.splice(gi, 1); break; }
      }
      Eventos.gatFugiu();
      aviso('GATUNO DESISTIU DA FUGA!', '#ff6b6b');
    }

    // ondas
    if (inimigos.length === 0 && !heroi.morto) {
      tOnda -= dt;
      if (tOnda <= 0) proximaOnda();
    }

    // poeira: deriva lenta com wrap (só posição, sem alocação)
    for (var i = 0; i < poeira.length; i++) {
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
  // Cofre Abandonado na cena (spec monstros-novos) — só fillRect e
  // strokeRect: primitivas que o rasterizador de testes entende
  function desenhaCofre(ctx, cof) {
    var cx = Math.round(cof.x), cy = Math.round(cof.y);
    var m = Sprite.rampa('#7a5530');      // madeira
    var o = Sprite.rampa('#d9a62a');      // latão
    // corpo
    ctx.fillStyle = m.base;
    ctx.fillRect(cx - 8, cy - 6, 16, 7);
    // tampa em 2 degraus (canto arredondado à moda pixel)
    ctx.fillStyle = m.luz;
    ctx.fillRect(cx - 8, cy - 9, 16, 3);
    ctx.fillRect(cx - 7, cy - 11, 14, 2);
    // sombra embaixo da tampa + base no chão
    ctx.fillStyle = m.som;
    ctx.fillRect(cx - 8, cy - 7, 16, 1);
    ctx.fillRect(cx - 8, cy, 16, 1);
    // faixas de latão (verticais cruzando tampa e corpo)
    ctx.fillStyle = o.base;
    ctx.fillRect(cx - 5, cy - 11, 2, 12);
    ctx.fillRect(cx + 3, cy - 11, 2, 12);
    ctx.fillStyle = o.som;
    ctx.fillRect(cx + 4, cy - 11, 1, 12);
    // fechadura
    ctx.fillStyle = o.luz;
    ctx.fillRect(cx - 1, cy - 6, 3, 4);
    ctx.fillStyle = '#4a3a12';
    ctx.fillRect(cx, cy - 5, 1, 2);
    ctx.strokeStyle = '#1b1424';
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - 8.5, cy - 11.5, 17, 13);
  }

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
    var x0 = Math.round(heroi.x - 8), y0 = Math.round(heroi.y - 20);
    if (heroi.facing === -1) {
      // espelha o sprite (desenhado olhando pra direita) — alvo à
      // esquerda (spec virada-ataque); só o drawImage vira: a sombra
      // e o alpha do inv ficam fora do save/restore
      ctx.save();
      ctx.translate(x0 + c.w, y0);
      ctx.scale(-1, 1);
      ctx.drawImage(c.canvas, 0, 0, c.w, c.h);
      ctx.restore();
    } else {
      ctx.drawImage(c.canvas, x0, y0, c.w, c.h);
    }
    ctx.globalAlpha = 1;
  }

  function spriteInimigo(en) {
    // chave = espécie (spec visual-monstros): dá detalhe próprio ao
    // sprite sem mudar forma/cor — entra também na cache do Anim
    if (en.forma === 'morcego') return Anim.morcego(en.cor, en.frame, en.chave);
    if (en.forma === 'aranha') return Anim.aranha(en.cor, en.frame, en.chave);
    return Anim.slime(en.cor, en.frame, en.chave);
  }

  function desenhaInimigo(ctx, en) {
    var esc = en.escala;
    // aura do chefe pulsa atrás do sprite (doc §7)
    if (en.tipo && en.tipo.boss) Efeitos.auraBoss(ctx, en.x, en.y);
    var c = spriteInimigo(en);
    // envenenado: sombra ganha o tom do veneno (pulso vem do tempo restante)
    sombra(ctx, en.x, en.y - 1, 9 * esc,
      en.veneno ? corAlfa(en.veneno.cor,
        0.26 + 0.14 * (0.5 + 0.5 * Math.sin(en.veneno.t * 8))) : null);
    var pulso = en.lunge > 0 ? 1.15 : 1;
    if (en.hitFlash > 0 && Math.floor(en.hitFlash * 40) % 2 === 0) ctx.globalAlpha = 0.45;
    if (en.esquiva && Math.floor(en.esquiva.t * 30) % 2 === 0) ctx.globalAlpha = 0.5;
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

    var so = Efeitos.shakeOffset();
    if (so) ctx.translate(so.x, so.y);

    ctx.drawImage(chao, 0, 0);
    Efeitos.desenharBaixo(ctx);   // anéis no chão, atrás das entidades

    // profundidade: obstáculos e entidades ordenados pelos pés
    var cena = [];
    var i;
    for (i = 0; i < obst.length; i++) cena.push({ y: obst[i].y, t: 1, o: obst[i] });
    for (i = 0; i < inimigos.length; i++) cena.push({ y: inimigos[i].y, t: 2, e: inimigos[i] });
    var cofCena = Eventos.posCofre();
    if (cofCena) cena.push({ y: cofCena.y, t: 4, c: cofCena });
    cena.push({ y: heroi.y, t: 3 });
    cena.sort(function (a, b) { return a.y - b.y; });

    for (i = 0; i < cena.length; i++) {
      var it = cena[i];
      if (it.t === 1) desenhaObst(ctx, it.o);
      else if (it.t === 2) desenhaInimigo(ctx, it.e);
      else if (it.t === 4) desenhaCofre(ctx, it.c);
      else desenhaHeroi(ctx);
    }

    // camada de topo: glows/corpos/fumaça + números flutuantes
    // (ordem do doc: aditiva → sólida → fumaça → números)
    Efeitos.desenharTopo(ctx);

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
    // flash/vinheta de evento/perigo — espaço de JANELA (spec visual-efeitos)
    Efeitos.desenharTela(ctx, vx, vy, vw, vh);

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
    // B1 (spec respiro R-RES-1): contagem visível do respiro — sem ela
    // a espera parece infinita ("dorme entre as ondas"); antecipação >
    // incerteza. Mesmo x da linha de onda, uma linha abaixo.
    if (inimigos.length === 0 && tOnda > 0 && !heroi.morto) {
      UI.text('PRÓXIMA ONDA EM ' + Math.max(1, Math.ceil(tOnda)) + 's',
        vx + vw - 4 * k, vy + 17 * k,
        { align: 'right', color: '#8ce08c' });
    }

    if (heroi.morto) {
      ctx.fillStyle = 'rgba(5,3,10,0.5)';
      ctx.fillRect(vx, vy + vh / 2 - 12 * k, vw, 24 * k);
      UI.text('CAIU — revivendo em ' + Math.max(1, Math.ceil(heroi.revT)) + 's',
        vx + vw / 2, vy + vh / 2, { align: 'center', color: '#ff6b6b' });
    }

    if (pausada) {
      ctx.fillStyle = 'rgba(5,3,10,0.55)';
      ctx.fillRect(vx, vy, vw, vh);
      UI.text('PAUSADO', vx + vw / 2, vy + vh / 2, {
        align: 'center', color: '#e8c86a', font: 'bold ' + (8 * k) + 'px monospace'
      });
    }
  }

  // algum inimigo com a flag de evento em campo?
  function temE(flag) {
    for (var i = 0; i < inimigos.length; i++) {
      if (inimigos[i][flag]) return true;
    }
    return false;
  }

  function info() {
    var p = Game.personagem;
    var boss = false;
    for (var i = 0; i < inimigos.length; i++) {
      if (inimigos[i].tipo.boss) { boss = true; break; }
    }
    var medo = 0, empurra = 0, esquivando = 0;
    for (i = 0; i < inimigos.length; i++) {
      if (inimigos[i].medo) medo++;
      if (inimigos[i].empurra) empurra++;
      if (inimigos[i].esquiva) esquivando++;
    }
    return {
      mapa: mapa,
      acougueiro: temE('acougueiro'),
      gatuno: temE('gatuno'),
      dano: (heroi && heroi.stats) ? Math.round(heroi.stats.dano) : 0,
      onda: onda,
      // sonda do respiro (spec respiro R-RES-1): tempo até a próxima
      // onda p/ teste — 0 = onda em campo ou spawn em curso
      espera: Math.max(0, tOnda),
      janela: { w: VW, h: VH },
      mundo: { w: MW, h: MH },
      cam: { x: Math.round(cam.x), y: Math.round(cam.y) },
      // sonda dos inimigos (spec monstros-novos — seção 41 mede
      // skill de espécie: hp do regenerador, chave do atirador, etc)
      bichos: (function () {
        var out = [];
        for (var bi = 0; bi < inimigos.length; bi++) {
          var be = inimigos[bi];
          out.push({ chave: be.chave, hp: Math.round(be.hp),
                     hpMax: be.hpMax,
                     x: Math.round(be.x), y: Math.round(be.y),
                     atkCd: Math.round(be.atkCd * 100) / 100,
                     dist: Math.round(Math.sqrt(
                       (be.x - heroi.x) * (be.x - heroi.x) +
                       (be.y - heroi.y) * (be.y - heroi.y))) });
        }
        return out;
      })(),
      cofre: (function () {
        var c = Eventos.posCofre();
        if (!c) return null;
        return { x: Math.round(c.x), y: Math.round(c.y),
                 dist: Math.round(Math.sqrt(
                   (heroi.x - c.x) * (heroi.x - c.x) +
                   (heroi.y - c.y) * (heroi.y - c.y))) };
      })(),
      enxame: Eventos.enxameAtivo(),
      heroi: { x: Math.round(heroi ? heroi.x : 0),
               y: Math.round(heroi ? heroi.y : 0),
               estado: (heroi && heroi.ia) ? heroi.ia.estado : null,
               agu: (heroi && heroi.ia && typeof heroi.ia.agu === 'number')
                 ? Math.round(heroi.ia.agu * 100) / 100 : 0,
               prof: (heroi && heroi.ia && typeof heroi.ia.prof === 'number')
                 ? heroi.ia.prof : 0,
               facing: heroi ? heroi.facing : 1 },
      inimigos: inimigos.length,
      // diagnóstico p/ teste (seções 32): distância do inimigo mais
      // perto, se o golpe está em animação e o destino de fuga atual
      inimigoPerto: (function () {
        var dMin = Infinity;
        for (var i = 0; i < inimigos.length; i++) {
          var dx = inimigos[i].x - (heroi ? heroi.x : 0);
          var dy = inimigos[i].y - (heroi ? heroi.y : 0);
          var d = Math.sqrt(dx * dx + dy * dy);
          if (d < dMin) dMin = d;
        }
        return dMin === Infinity ? -1 : Math.round(dMin);
      })(),
      atacando: !!(heroi && heroi.atkT > 0),
      destino: (heroi && heroi.ia && heroi.ia.destino)
        ? { x: Math.round(heroi.ia.destino.x),
            y: Math.round(heroi.ia.destino.y) }
        : null,
      boss: boss,
      // cenário procedural (semente do mapa) e skills de posicionamento
      obst: obst.map(function (o) {
        return { x: Math.round(o.x), y: Math.round(o.y), tipo: o.tipo,
                 // centro de colisão cru + raio (p/ a propriedade da
                 // seção 34: cy difere de y pelo offset da âncora)
                 cx: o.cx, cy: o.cy, r: o.r };
      }),
      ultimaSkill: ultimaSkill,
      medo: medo,
      empurra: empurra,
      esquivando: esquivando,
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
    colideObst: colideObst,
    reiniciar: reiniciar,
    dono: dono,
    atualizar: atualizar,
    desenhar: desenhar,
    alternarPausa: alternarPausa,
    restaurarMapa: restaurarMapa,
    restaurarOnda: restaurarOnda,
    passaMapa: passaMapa,     // marco do ranking (também o chefe chama)
    ganhaXP: ganhaXP,         // teto de nível testável (seção 36)
    xpAbate: xpAbate,         // renda exponencial testável (seção 38)
    REGEN_MAX: REGEN_MAX,     // teto da regen (spec gestao-atributos)
    TIPOS: TIPOS,             // espécies (spec monstros-novos — seção 41)
    spawn: spawn,             // p/ fixtures da seção 41 (skill de espécie)
    regeneraEspecie: regeneraEspecie,  // skill pura (teste sem arena)
    drenaVida: drenaVida,              // skill pura (teste sem arena)
    qtdMonstros: qtdMonstros, // escala de monstros testável (seção 39)
    escalaMonstros: escalaMonstros, // A/B mundo vs mapa (seção 39)
    fimCampanha: function () { return MAPA_FIM_CAMPANHA; },
    limparEfeitos: limparEfeitos,
    info: info
  };
})();
