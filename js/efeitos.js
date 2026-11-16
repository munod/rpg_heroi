// Efeitos de combate — dono único do feedback visual (base visual:
// Docs/efeitos.md — pools com teto, receitas com valores exatos,
// game feel e três camadas de desenho). Só primitivas que o
// rasterizador de testes entende (fillRect, strokeRect, ellipse+fill,
// rect+fill, drawImage com globalAlpha, translate/scale);
// arc/stroke()/gradiente quebram o screenshot e 'lighter' é
// inofensivo fora do navegador (só lá a camada soma).
// Lógica de dano NÃO mora aqui: o missil recebe um callback e quem
// faz o estrago é a Batalha. silenciar(true) bloqueia os spawns
// DECORATIVOS e zera os pools — o MISSIL é exceção (ele leva dano na
// chegada: a simulação offline precisa que ele voe).
var Efeitos = (function () {
  // ------------------------------------------------------------ pools
  var MAX = { parts: 380, nums: 50, aneis: 24, raios: 8, arcos: 10 };
  var parts = [], nums = [], aneis = [], raios = [], arcos = [];

  function limitar(lista, max) {
    while (lista.length > max) lista.shift();
  }
  function push(e) { parts.push(e); limitar(parts, MAX.parts); }

  // ------------------------------------------------- estado singleton
  var flash = null;        // {cor, a, t, tMax} — luz de tela
  var borda = null;        // {cor, a, t, tMax} — vinheta de evento
  var shakeT = 0, shakeFor = 0, shakeFase = 0;
  var hitStop = 0;
  var perigoFrac = 1;      // fração de vida 0..1 (vira vermelho <0,35)
  var tempo = 0;           // relógio próprio (pisca/perigo/aura)
  var mudo = false;

  function rand(a, b) { return a + Math.random() * (b - a); }

  // mistura hex com branco (f em [0,1]) — cores do glow/anel
  function mistura(hex, f) {
    if (typeof hex !== 'string' || hex.charAt(0) !== '#') return hex;
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return hex;
    function m(c) { return Math.round(c + (255 - c) * f); }
    function hx(c) { return (c < 16 ? '0' : '') + c.toString(16); }
    return '#' + hx(m(r)) + hx(m(g)) + hx(m(b));
  }

  // ------------------------------------------------- silenciar/limpar
  // Mudo antes de lógica: a simulação offline não gasta nada. O
  // missil fica (é lógica: dano na chegada — ver R-EF-8 da spec).
  function silenciar(v) {
    mudo = !!v;
    if (!mudo) return;
    for (var i = parts.length - 1; i >= 0; i--) {
      if (parts[i].tipo !== 'missil') parts.splice(i, 1);
    }
    nums.length = 0; aneis.length = 0; raios.length = 0; arcos.length = 0;
    flash = null; borda = null;
    shakeT = 0; shakeFor = 0; hitStop = 0;
  }

  // limpeza total (limparEfeitos da Batalha / reinício de batalha)
  function limpar() {
    parts.length = 0; nums.length = 0; aneis.length = 0;
    raios.length = 0; arcos.length = 0;
    flash = null; borda = null;
    shakeT = 0; shakeFor = 0; hitStop = 0;
  }

  function qtd() {
    return parts.length + nums.length + aneis.length +
      raios.length + arcos.length;
  }

  // ------------------------------------------------ sprites (doc §3)
  // Gerados 1× por cor|raio em canvas offscreen (fillRect 1×1 com
  // alpha — funciona em TODO ctx do harness) e desenhados com
  // drawImage + globalAlpha (nenhum gradiente por pixel no tempo de
  // execução).
  var glowCache = {}, anelCache = {};

  function glow(cor, r) {
    var chave = cor + '|' + r;
    if (glowCache[chave]) return glowCache[chave];
    var cv = document.createElement('canvas');
    var lado = r * 2 + 1;
    cv.width = lado;
    cv.height = lado;
    var g = cv.getContext('2d');
    for (var dy = -r; dy <= r; dy++) {
      for (var dx = -r; dx <= r; dx++) {
        var d = Math.sqrt(dx * dx + dy * dy) / (r + 0.5);
        if (d > 1) continue;
        var f = (1 - d) * (1 - d);
        var a = Math.min(1, f * 1.5);
        if (a < 0.05) continue;
        g.globalAlpha = a;
        g.fillStyle = mistura(cor, Math.max(0, 1 - d * 2.6) * 0.85);
        g.fillRect(r + dx, r + dy, 1, 1);
      }
    }
    glowCache[chave] = cv;
    return cv;
  }

  // anel de choque: coroa em R=16, banda [-3, +1.5] com alpha
  function anelSprite(cor) {
    if (anelCache[cor]) return anelCache[cor];
    var R = 16;
    var cv = document.createElement('canvas');
    cv.width = R * 2 + 1;
    cv.height = R * 2 + 1;
    var g = cv.getContext('2d');
    for (var dy = -R; dy <= R; dy++) {
      for (var dx = -R; dx <= R; dx++) {
        var banda = Math.sqrt(dx * dx + dy * dy) - R;
        if (banda < -3 || banda > 1.5) continue;
        var q = 1 - Math.abs(banda + 1) / 2.6;
        var a = Math.max(0, Math.min(1, q)) * 0.95;
        if (a <= 0.02) continue;
        g.globalAlpha = a;
        g.fillStyle = mistura(cor, 0.45 * Math.max(0, q));
        g.fillRect(R + dx, R + dy, 1, 1);
      }
    }
    anelCache[cor] = cv;
    return cv;
  }

  // ------------------------------------------------- game feel (doc §7)
  // Ajuste pós-feedback (mantenedor achou a tremedeira BRUTA):
  // duração 0,14+f×0,16 (antes 0,18+f×0,22) e fase de impacto —
  // impactos encadeados mantêm a MESMA fase (sem salto no meio)
  function sacudir(f) {
    if (mudo) return;
    if (!Opcoes.liga('shake')) return;   // opções: sem tremedeira
    shakeT = Math.max(shakeT, 0.14 + f * 0.16);
    if (shakeT <= 0.14 + f * 0.16 && shakeFor === 0) {
      shakeFase = Math.random() * Math.PI * 2;  // só no impacto novo
    }
    shakeFor = Math.max(shakeFor, f);
  }

  // offset suave: SENOIDE com fase sorteada no impacto (não há salto
  // aleatório por frame — era isso que passava "bruto") + amplitude
  // reduzida 0,6+f×1,2 (antes 0,8+f×1,8). Offset inteiro (pixel art);
  // Batalha.desenhar traduz dentro do clip.
  function shakeOffset() {
    if (shakeT <= 0 || !Opcoes.liga('shake')) return null;
    var f = shakeFor * Math.min(1, shakeT / 0.3);
    var amp = 0.6 + f * 1.2;
    return {
      x: Math.round(Math.sin(tempo * 80 + shakeFase) * amp),
      y: Math.round(Math.cos(tempo * 62 + shakeFase * 1.7) * amp)
    };
  }

  // hit-stop: guarda o MÁximo (não soma); congelar consome e devolve
  function parar(seg) {
    if (mudo) return;
    if (seg > hitStop) hitStop = seg;
  }
  function congelar(dt) {
    if (hitStop <= 0) return false;
    hitStop -= dt;
    if (hitStop < 0) hitStop = 0;
    return true;
  }

  // flash fraco nunca apaga um flash forte em curso
  function flashTela(cor, a, t) {
    if (mudo) return;
    if (!Opcoes.liga('flash')) return;   // opções: sem flash de tela
    if (flash && flash.a * (flash.t / flash.tMax) > a) return;
    flash = { cor: cor, a: a, t: t, tMax: t };
  }

  function bordaTela(cor, a, t) {
    if (mudo) return;
    if (!Opcoes.liga('flash')) return;   // opções: sem vinheta de evento
    borda = { cor: cor, a: a, t: t, tMax: t };
  }

  function perigo(frac) {
    // vinheta vermelha de perigo é o mesmo tipo de estímulo do flash —
    // desligada, a fração vira 1 (nunca pisca)
    perigoFrac = Opcoes.liga('flash') ? frac : 1;
  }

  // ------------------------------------------------ catálogo (doc §4)
  // faíscas em rajada: ângulo aleatório, cor cicla pela lista
  function faiscaMuita(x, y, cores, n, forca) {
    if (mudo) return;
    for (var i = 0; i < n; i++) {
      var ang = Math.random() * Math.PI * 2;
      var vel = rand(35, 95) * (forca || 1);
      push({
        tipo: 'faisca', x: x + rand(-2, 2), y: y + rand(-2, 2),
        vx: Math.cos(ang) * vel, vy: Math.sin(ang) * vel - rand(10, 30),
        dur: rand(0.25, 0.5), t: 0, fase: Math.random() * 6,
        tam: Math.random() < 0.3 ? 2 : 1,
        cor: cores[i % cores.length]
      });
    }
  }
  function faisca(x, y, cor, n, forca) {
    faiscaMuita(x, y, [cor, '#ffffff'], n, forca);
  }

  // brasas genéricas (fachada da batalha — grav parametrizável)
  function brasas(x, y, cor, n, grav, forca) {
    if (mudo) return;
    for (var i = 0; i < n; i++) {
      var ang = Math.random() * Math.PI * 2;
      var vel = (forca || 60) * (0.4 + Math.random() * 0.8);
      push({
        tipo: 'brasa', x: x, y: y,
        vx: Math.cos(ang) * vel, vy: Math.sin(ang) * vel - 18,
        grav: grav === undefined ? 130 : grav,
        dur: rand(0.5, 0.9), t: 0, fase: Math.random() * 6,
        cor: cor
      });
    }
  }

  function brasaFlutuante(x, y, cor, n, dur0, dur1) {
    if (mudo) return;
    for (var i = 0; i < n; i++) {
      push({
        tipo: 'brasa', x: x, y: y,
        vx: rand(-14, 14), vy: rand(-38, -18),
        grav: 0, sobe: true,
        dur: rand(dur0, dur1), t: 0, fase: Math.random() * 6,
        cor: cor
      });
    }
  }

  function cacos(x, y, cor, n) {
    if (mudo) return;
    for (var i = 0; i < n; i++) {
      push({
        tipo: 'caco', x: x, y: y,
        vx: rand(-55, 55), vy: rand(-95, -25),
        dur: rand(0.5, 0.9), t: 0, fase: Math.random() * 6,
        cor: Math.random() < 0.34 ? '#ffffff' : cor
      });
    }
  }

  function fumaca(x, y, cor, n) {
    if (mudo) return;
    for (var i = 0; i < n; i++) {
      push({
        tipo: 'fumaca', x: x, y: y,
        vx: rand(-8, 8), vy: rand(-22, -10),
        r: rand(1.5, 2.5),
        dur: rand(0.7, 1.1), t: 0, fase: Math.random() * 6,
        cor: cor
      });
    }
  }

  function poeiraPart(x, y, cor, n) {
    if (mudo) return;
    for (var i = 0; i < n; i++) {
      push({
        tipo: 'poeira', x: x, y: y,
        vx: rand(-16, 16), vy: rand(-6, 2),
        r: rand(1.5, 2.5), dur: 0.4, t: 0, fase: Math.random() * 6,
        cor: cor
      });
    }
  }

  function confete(x, y, n, cor) {
    if (mudo) return;
    for (var i = 0; i < n; i++) {
      push({
        tipo: 'confete', x: x, y: y,
        vx: rand(-40, 40), vy: rand(-90, -40),
        dur: rand(1.2, 1.9), t: 0, fase: Math.random() * 6,
        cor: cor || '#ffd866'
      });
    }
  }

  function estrela(x, y, cor, r, dur) {
    if (mudo) return;
    push({ tipo: 'estrela', x: x, y: y, r: r, dur: dur, t: 0, cor: cor });
  }

  function brilho(x, y, cor, r, dur) {
    if (mudo) return;
    push({ tipo: 'brilho', x: x, y: y, r: r, dur: dur, t: 0, cor: cor });
  }

  function motePart(x, y, cor, n, dur0, dur1) {
    if (mudo) return;
    for (var i = 0; i < n; i++) {
      push({
        tipo: 'mote', x: x + rand(-10, 10), y: y + rand(-8, 4),
        vy: rand(-30, -14), fase: Math.random() * 6,
        dur: rand(dur0, dur1), t: 0, cor: cor
      });
    }
  }

  // anel de choque expandindo (ease-out + afinamento + fade — doc §3)
  function anel(x, y, r0, r1, tMax, cor, alpha, atraso) {
    if (mudo) return;
    pushAneis({
      x: x, y: y, r0: r0, r1: r1, tMax: tMax, cor: cor,
      alpha: alpha === undefined ? 0.9 : alpha,
      t: 0, atraso: atraso || 0
    });
  }
  function pushAneis(a) {
    aneis.push(a);
    limitar(aneis, MAX.aneis);
  }

  // relâmpago: polilinha jagged pré-calculada (doc §5.8)
  // raio RADIAL (nivelUp): 12 raios em ângulos i/12·2π, r=16,
  // traço de 1px a cada 2px partindo de s=4 (doc §4 — catálogo)
  function raioRadial(x, y) {
    if (mudo) return;
    raios.push({ radial: true, x: x, y: y, t: 0, tMax: 0.55 });
    limitar(raios, MAX.raios);
  }

  // relâmpago vertical (doc §5.8 — bossChegou). O impacto é o y do ALVO
  // em coordenadas de MUNDO (mundo infinito — antes era fixo no topo do
  // mundo 384×268 e o relâmpago aparecia fora da tela).
  function raio(xAlvo, yAlvo) {
    if (mudo) return;
    var base = (typeof yAlvo === 'number' && isFinite(yAlvo)) ? yAlvo : 242;
    var topo = base - 110;
    var nos = [], x = xAlvo + rand(-24, 24), y = topo;
    while (y < base) {
      y += rand(5, 9);
      x += rand(-8, 8);
      if (y > base && Math.abs(x - xAlvo) > 6) x += (xAlvo - x) * 0.4;
      nos.push({ x: x, y: Math.min(y, base) });
    }
    nos.push({ x: xAlvo, y: base - 2 });
    raios.push({ nos: nos, alvo: xAlvo, baseY: base, t: 0, tMax: 0.4 });
    limitar(raios, MAX.raios);
  }

  // ------------------------------------------------------- missil (nosso)
  // Projétil teleguiado com rastro: na chegada explode e chama
  // aoChegar() — o dano é da Batalha (callback). Único spawn que
  // sobrevive ao silenciar (dano offline).
  function missil(de, para, cor, escala, aoChegar) {
    var dx = para.x - de.x, dy = para.y - de.y;
    var d = Math.sqrt(dx * dx + dy * dy) || 1;
    push({
      tipo: 'missil', x: de.x, y: de.y, x0: de.x, y0: de.y,
      para: para,
      nx: -dy / d, ny: dx / d,
      curva: (Math.random() - 0.5) * 16,
      dur: Math.max(0.18, Math.min(0.32, d / 340)), t: 0,
      cor: cor, escala: escala || 1, aoChegar: aoChegar
    });
  }

  // ------------------------------------------------- fachadas da batalha
  // pulso luminoso que cresce (usado por explosao/cura)
  function pulso(x, y, cor, r0, r1, dur) {
    if (mudo) return;
    push({ tipo: 'brilho', x: x, y: y, r: r1, r0: r0,
           dur: dur, t: 0, cor: cor, cresce: r0 });
  }

  // Impacto de skill: halo + anel suave + brasas (assinatura antiga)
  function explosao(x, y, cor, escala) {
    if (mudo) return;
    var e = escala || 1;
    brilho(x, y, cor, 6 * e, 0.24);
    anel(x, y, 4 * e, 17 * e, 0.45, cor, 0.85);
    brasas(x, y, cor, Math.round(9 * e), 170, 75);
  }

  // Arco de lâmina ao redor do herói (doc §5.7 — 16 segmentos)
  function corte(x, y, cor, escala, facing) {
    if (mudo) return;
    arcos.push({
      x: x, y: y, cor: cor, esc: escala || 1,
      facing: facing === undefined ? 1 : facing,
      t: 0, tMax: 0.36
    });
    limitar(arcos, MAX.arcos);
    brasas(x, y, cor, 6, 150, 55);
  }

  // Motes de cura subindo (halo +7 motes)
  function cura(x, y, cor) {
    if (mudo) return;
    brilho(x, y, cor, 8, 0.5);
    motePart(x, y + 4, cor, 7, 0.8, 1.2);
  }

  // ------------------------------------------------ receitas (doc §5)
  function impacto(x, y, cor, crit) {
    if (mudo) return;
    sacudir(crit ? 0.6 : 0.3);
    parar(crit ? 0.08 : 0.02);
    estrela(x, y, crit ? '#ffd866' : '#ffffff', crit ? 9 : 5,
      crit ? 0.20 : 0.12);
    brilho(x, y, crit ? '#ffd866' : cor, crit ? 9 : 6,
      crit ? 0.24 : 0.16);
    anel(x, y, crit ? 3 : 2, crit ? 24 : 10, crit ? 0.30 : 0.16,
      crit ? '#ffd866' : '#ffffff', crit ? 0.9 : 0.7);
    faiscaMuita(x, y,
      crit ? ['#ffd866', '#fff3c8', '#ffffff'] : ['#ffffff', cor],
      crit ? 14 : 6, crit ? 1.0 : 0.55);
    if (crit) {
      brasaFlutuante(x, y, '#ffd866', 4, 0.5, 0.9);
      flashTela('#ffd866', 0.16, 0.14);
      bordaTela('#ffd866', 0.30, 0.24);
    }
  }

  function impactoHeroi(x, y, fatal) {
    if (mudo) return;
    sacudir(fatal ? 0.8 : 0.35);
    brilho(x, y, '#ff5a5a', fatal ? 12 : 7, fatal ? 0.40 : 0.18);
    faiscaMuita(x, y,
      fatal ? ['#ff6b6b', '#ffb0b0', '#ffffff'] : ['#ff6b6b', '#ffb0b0'],
      fatal ? 16 : 6, fatal ? 1.1 : 0.6);
    bordaTela('#ff3b3b', fatal ? 0.7 : 0.4, fatal ? 1.6 : 0.5);
    anel(x, y, fatal ? 3 : 2, fatal ? 30 : 12, fatal ? 0.5 : 0.2,
      fatal ? '#ff6b6b' : '#ff6b6b', fatal ? 0.9 : 0.7);
    if (fatal) {
      parar(0.14);
      flashTela('#ff2a2a', 0.3, 0.3);
      fumaca(x, y, '#5a3038', 6);
      poeiraPart(x, y, '#8a6a6a', 6);
    }
  }

  function morte(x, y, cor, boss) {
    if (mudo) return;
    sacudir(boss ? 0.9 : 0.3);
    if (boss) parar(0.12);
    flashTela(boss ? '#ffd866' : '#ffffff',
      boss ? 0.34 : 0.10, boss ? 0.35 : 0.10);
    if (boss) bordaTela('#ffd866', 0.55, 0.7);
    anel(x, y, 4, 26, 0.34, cor, 0.85);
    if (boss) {
      anel(x, y, 2, 34, 0.34, '#ffffff', 0.9, 0.10);
      anel(x, y, 6, 64, 0.7, '#ff9a3a', 0.85, 0.22);
    }
    cacos(x, y, cor, boss ? 22 : 10);
    brasaFlutuante(x, y, cor, boss ? 16 : 6, 0.5, 0.9);
    fumaca(x, y, boss ? '#6a5a4a' : '#8a8a92', boss ? 6 : 3);
    poeiraPart(x, y, '#8a6a6a', boss ? 8 : 4);
    brilho(x, y, boss ? '#ffd866' : '#ffffff', boss ? 16 : 9,
      boss ? 0.45 : 0.20);
    if (boss) confete(x, y, 16, '#ffd866');
  }

  function nivelUp(x, y) {
    if (mudo) return;
    sacudir(0.3);
    flashTela('#ffd866', 0.26, 0.34);
    bordaTela('#ffd866', 0.5, 0.6);
    anel(x, y, 3, 20, 0.3, '#ffd866', 0.9);
    anel(x, y, 3, 32, 0.5, '#ffffff', 0.8, 0.14);
    brilho(x, y - 8, '#ffd866', 14, 0.5);
    for (var i = 0; i < 12; i++) raioRadial(x, y);
    confete(x, y, 18, '#ffd866');
    brasaFlutuante(x, y, '#ffd866', 8, 0.5, 0.9);
  }

  function reviver(x, y) {
    if (mudo) return;
    flashTela('#8ce08c', 0.22, 0.3);
    bordaTela('#8ce08c', 0.35, 0.5);
    anel(x, y, 3, 22, 0.4, '#8ce08c', 0.9);
    anel(x, y, 2, 14, 0.3, '#ffffff', 0.8, 0.12);
    brilho(x, y, '#8ce08c', 12, 0.45);
    motePart(x, y, '#8ce08c', 7, 0.7, 1.2);
    motePart(x, y, '#ffffff', 7, 0.7, 1.2);
  }

  function bossChegou(x, y) {
    if (mudo) return;
    sacudir(1.0);
    parar(0.14);
    flashTela('#5a0f14', 0.35, 0.3);
    bordaTela('#d84a20', 0.6, 1.1);
    raio(x - 40, y - 6);
    raio(x + 40, y - 6);
    anel(x, y, 6, 70, 0.7, '#ffb060', 0.9);
    anel(x, y, 4, 40, 0.5, '#ffffff', 0.8, 0.16);
    brilho(x, y, '#ff5a3a', 16, 0.5);
    poeiraPart(x, y, '#8a8a92', 14);
    brasaFlutuante(x, y, '#ffb060', 10, 0.5, 1.0);
    faiscaMuita(x, y, ['#ffd866', '#ff8a3a', '#ffffff'], 16, 1.2);
  }

  // --------------------------------------------------- números (doc §6)
  // 3 estilos: normal (sombra), crit (halo dourado + tremor),
  // big (pulso + balanço). Estilo booleano legado: true = big.
  function nota(x, y, txt, cor, estilo) {
    if (mudo) return;
    var est = estilo === true ? 'big'
      : (estilo === false || !estilo) ? 'normal' : estilo;
    // opções: números de dano/XP (normal/crit) podem desligar; o 'big'
    // (aviso/boss/clear) é sinalização e fica sempre — só some com o
    // próprio som mudo da simulação offline
    if (est !== 'big' && !Opcoes.liga('num')) return;
    var cfg = est === 'crit'
      ? { t: 1.15, sobe: 34, font: 'bold 11px monospace' }
      : est === 'big'
        ? { t: 1.4, sobe: 16, font: 'bold 10px monospace' }
        : { t: 0.9, sobe: 24, font: 'bold 8px monospace' };
    nums.push({
      x: x, y: y, txt: String(txt), cor: cor, est: est,
      tMax: cfg.t, sobe: cfg.sobe, font: cfg.font,
      t: 0, fase: Math.random() * 6
    });
    limitar(nums, MAX.nums);
  }

  // ------------------------------------------------------- ciclo
  function atualizaPart(e, dt) {
    if (e.tipo === 'faisca') {
      e.vy += 190 * dt;
      var af = Math.max(0, 1 - 2.2 * dt);
      e.vx *= af;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
    } else if (e.tipo === 'caco') {
      e.vy += 240 * dt;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
    } else if (e.tipo === 'brasa') {
      if (e.sobe) {
        e.x += Math.cos(e.t * 5 + e.fase) * 10 * dt;
        e.y += -6 * dt;
      } else {
        e.vy += e.grav * dt;
        e.x += e.vx * dt;
        e.y += e.vy * dt;
      }
    } else if (e.tipo === 'fumaca') {
      var af2 = Math.max(0, 1 - 1.5 * dt);
      e.vx *= af2;
      e.vy *= af2;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.r += 3.2 * dt;
    } else if (e.tipo === 'poeira') {
      var af3 = Math.max(0, 1 - 1.5 * dt);
      e.vx *= af3;
      e.vy *= af3;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.r += 2.4 * dt;
    } else if (e.tipo === 'confete') {
      e.vy += 70 * dt;
      e.vx += Math.cos(e.t * 9 + e.fase) * 26 * dt;
      var af4 = Math.max(0, 1 - 1.2 * dt);
      e.vx *= af4;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
    } else if (e.tipo === 'mote') {
      e.y += e.vy * dt;
      e.x += Math.sin((e.t + e.fase) * 6) * 8 * dt;
    } else if (e.tipo === 'missil') {
      var k = Math.min(1, e.t / e.dur);
      var ax = e.para ? e.para.x : e.x;
      var ay = e.para ? e.para.y : e.y;
      var px = e.x0 + (ax - e.x0) * k;
      var py = e.y0 + (ay - e.y0) * k;
      var off = Math.sin(k * Math.PI) * e.curva;
      e.x = px + e.nx * off;
      e.y = py + e.ny * off;
      // rastro (decorativo — some no mudo)
      if (!mudo && Math.random() < 0.9) {
        push({
          tipo: 'brasa', x: e.x, y: e.y,
          vx: rand(-10, 10), vy: rand(-10, 10),
          grav: 40, dur: 0.25, t: 0, fase: Math.random() * 6,
          cor: e.cor
        });
      }
    }
  }

  function atualizar(dt) {
    tempo += dt;
    if (shakeT > 0) {
      shakeT -= dt;
      if (shakeT <= 0) { shakeT = 0; shakeFor = 0; }   // fim: força zerada
    }
    if (flash) {
      flash.t -= dt;
      if (flash.t <= 0) flash = null;
    }
    if (borda) {
      borda.t -= dt;
      if (borda.t <= 0) borda = null;
    }
    var i, e;
    for (i = parts.length - 1; i >= 0; i--) {
      e = parts[i];
      e.t += dt;
      atualizaPart(e, dt);
      if (e.t >= e.dur) {
        if (e.tipo === 'missil') {
          var fx = e.para ? e.para.x : e.x;
          var fy = e.para ? e.para.y : e.y;
          explosao(fx, fy, e.cor, e.escala);
          if (e.aoChegar) e.aoChegar();
        }
        parts.splice(i, 1);
      }
    }
    for (i = nums.length - 1; i >= 0; i--) {
      e = nums[i];
      e.t += dt;
      // subida com desaceleração (corta a velocidade no fim)
      e.y -= e.sobe * dt * Math.max(0.25, Math.min(1, e.t / e.tMax));
      if (e.t >= e.tMax) nums.splice(i, 1);
    }
    for (i = aneis.length - 1; i >= 0; i--) {
      e = aneis[i];
      if (e.atraso > 0) { e.atraso -= dt; continue; }
      e.t += dt;
      if (e.t >= e.tMax) aneis.splice(i, 1);
    }
    for (i = raios.length - 1; i >= 0; i--) {
      e = raios[i];
      e.t += dt;
      if (e.t >= e.tMax) raios.splice(i, 1);
    }
    for (i = arcos.length - 1; i >= 0; i--) {
      e = arcos[i];
      e.t += dt;
      if (e.t >= e.tMax) arcos.splice(i, 1);
    }
  }

  // ---------------------------------------------------- desenho
  // 1ª camada (aditiva): glows + arcos + relâmpagos
  function desenhaGlow(ctx, e) {
    var k = Math.min(1, e.t / e.dur);
    if (e.tipo === 'brasa') {
      var r = e.grav && !e.sobe ? 3 : 4;
      ctx.globalAlpha = (1 - k) * (0.6 + 0.4 * Math.sin(e.t * 14 + e.fase));
      var spr = glow(e.cor, r);
      ctx.drawImage(spr, Math.round(e.x) - r, Math.round(e.y) - r);
    } else if (e.tipo === 'faisca') {
      ctx.globalAlpha = (1 - k) * 0.5;
      var s2 = glow(e.cor, 3);
      ctx.drawImage(s2, Math.round(e.x) - 3, Math.round(e.y) - 3);
    } else if (e.tipo === 'mote') {
      ctx.globalAlpha = (1 - k) * (0.5 + 0.4 * Math.sin(e.t * 8 + e.fase));
      var s3 = glow(e.cor, 3);
      ctx.drawImage(s3, Math.round(e.x) - 3, Math.round(e.y) - 3);
    } else if (e.tipo === 'brilho') {
      var rr = e.cresce !== undefined
        ? e.cresce + (e.r - e.cresce) * (1 - (1 - k) * (1 - k))
        : e.r * 0.9;
      ctx.globalAlpha = 1 - k;
      var s4 = glow(e.cor, Math.max(2, Math.round(rr)));
      ctx.drawImage(s4, Math.round(e.x) - rr, Math.round(e.y) - rr,
        rr * 2, rr * 2);
    } else if (e.tipo === 'missil') {
      ctx.globalAlpha = 0.5;
      var s5 = glow(e.cor, 5);
      ctx.drawImage(s5, Math.round(e.x) - 5, Math.round(e.y) - 5);
    }
    ctx.globalAlpha = 1;
  }

  function desenhaCorpo(ctx, e) {
    var k = Math.min(1, e.t / e.dur);
    if (e.tipo === 'faisca') {
      ctx.globalAlpha = 1 - k;
      ctx.fillStyle = e.cor;
      var x = Math.round(e.x), y = Math.round(e.y);
      // rastro: 2 cópias atrás
      ctx.fillRect(Math.round(e.x - e.vx * 0.016),
        Math.round(e.y - e.vy * 0.016), 1, 1);
      ctx.fillRect(Math.round(e.x - e.vx * 0.032),
        Math.round(e.y - e.vy * 0.032), 1, 1);
      ctx.fillRect(x, y, e.tam, e.tam);
    } else if (e.tipo === 'caco') {
      ctx.globalAlpha = 1 - k;
      ctx.fillStyle = k < 0.35 ? '#8a8a92' : e.cor;
      var gira = Math.floor(e.t * 18 + e.fase) % 2;
      ctx.fillRect(Math.round(e.x), Math.round(e.y), gira ? 2 : 1,
        gira ? 1 : 2);
    } else if (e.tipo === 'confete') {
      ctx.globalAlpha = Math.min(1, 1.5 * k);
      ctx.fillStyle = e.cor;
      ctx.fillRect(Math.round(e.x), Math.round(e.y), 2, 2);
    } else if (e.tipo === 'estrela') {
      // cruz de 4 pontas: braço cresce no nascimento, miolo branco
      var rr = Math.round(e.r * (0.4 + 0.6 * (1 - k)));
      ctx.globalAlpha = 1 - k;
      ctx.fillStyle = e.cor;
      ctx.fillRect(Math.round(e.x) - rr, Math.round(e.y), rr * 2 + 1, 1);
      ctx.fillRect(Math.round(e.x), Math.round(e.y) - rr, 1, rr * 2 + 1);
      var pd = Math.round(rr * 0.45);
      ctx.fillRect(Math.round(e.x) - pd, Math.round(e.y) - pd, 1, 1);
      ctx.fillRect(Math.round(e.x) + pd, Math.round(e.y) - pd, 1, 1);
      ctx.fillRect(Math.round(e.x) - pd, Math.round(e.y) + pd, 1, 1);
      ctx.fillRect(Math.round(e.x) + pd, Math.round(e.y) + pd, 1, 1);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.round(e.x), Math.round(e.y), 1, 1);
    } else if (e.tipo === 'missil') {
      ctx.globalAlpha = 1;
      ctx.fillStyle = e.cor;
      ctx.fillRect(Math.round(e.x) - 1, Math.round(e.y) - 1, 3, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.round(e.x), Math.round(e.y), 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  // fumaça/poeira: elipses translúcidas que crescem (por último)
  function desenhaFumaca(ctx, e) {
    var k = Math.min(1, e.t / e.dur);
    ctx.globalAlpha = (e.tipo === 'fumaca' ? 0.4 : 0.5) * k;
    ctx.fillStyle = e.cor;
    ctx.beginPath();
    ctx.ellipse(e.x, e.y, Math.max(0.5, e.r), Math.max(0.4, e.r * 0.8),
      0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function desenhaAneis(ctx) {
    for (var i = 0; i < aneis.length; i++) {
      var a = aneis[i];
      if (a.atraso > 0) continue;
      var prog = 1 - a.t / a.tMax;
      if (prog <= 0) continue;
      var raio = a.r0 + (a.r1 - a.r0) * (1 - (1 - prog) * (1 - prog));
      var esp = Math.max(0.25, Math.min(1, 1 - prog * 0.7));
      var alpha = a.alpha * (1 - prog) * esp;
      if (alpha <= 0.01) continue;
      var spr = anelSprite(a.cor);
      var tam = spr.width * (raio / 16);
      ctx.globalAlpha = alpha;
      ctx.drawImage(spr, a.x - tam / 2, a.y - tam / 2, tam, tam);
    }
    ctx.globalAlpha = 1;
  }

  function desenhaArcos(ctx) {
    for (var i = 0; i < arcos.length; i++) {
      var a = arcos[i];
      var prog = 1 - a.t / a.tMax;
      if (prog > 0.94) continue;
      var some = prog > 0.7 ? (1 - prog) / 0.3 : 1;
      var N = 16;
      for (var s = 0; s < N; s++) {
        var tS = s / N;
        if (tS > prog) break;
        var idade = (prog - tS) / 0.7;
        var brilhoK = (1 - idade) * some;
        if (brilhoK <= 0.02) continue;
        var larg = 2 + Math.round(3 * (1 - Math.abs(tS - 0.5) * 2) * brilhoK);
        var ang = -1.3 + tS * 2.2;
        if (a.facing === -1) ang = Math.PI - ang;
        var px = a.x + Math.cos(ang) * 11 * a.esc;
        var py = a.y + Math.sin(ang) * 11 * a.esc * 0.8;
        ctx.globalAlpha = brilhoK;
        ctx.fillStyle = '#ffd866';
        ctx.fillRect(Math.round(px) - larg / 2, Math.round(py) - larg / 2,
          larg, larg);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(Math.round(px) - 1, Math.round(py) - 1, 2, 2);
      }
      // glow na ponta da lâmina
      if (prog < 0.88) {
        var angT = -1.3 + Math.min(prog, 0.9375) * 2.2;
        if (a.facing === -1) angT = Math.PI - angT;
        var tx = a.x + Math.cos(angT) * 11 * a.esc;
        var ty = a.y + Math.sin(angT) * 11 * a.esc * 0.8;
        ctx.globalAlpha = 0.55 * some;
        var sg = glow('#ffd866', 6);
        ctx.drawImage(sg, Math.round(tx) - 6, Math.round(ty) - 6);
      }
    }
    ctx.globalAlpha = 1;
  }

  function desenhaRaios(ctx) {
    for (var i = 0; i < raios.length; i++) {
      var r = raios[i];
      if (r.radial) {
        var kr = r.t / r.tMax;
        var len = 16 * (0.35 + 0.65 * (1 - kr));
        ctx.globalAlpha = 1 - kr;
        ctx.fillStyle = '#ffd866';
        for (var q = 0; q < 12; q++) {
          var angR = q / 12 * Math.PI * 2;
          for (var s2 = 4; s2 < len; s2 += 2) {
            ctx.fillRect(Math.round(r.x + Math.cos(angR) * s2),
              Math.round(r.y + Math.sin(angR) * s2), 1, 1);
          }
        }
        continue;
      }
      var pisca = Math.floor(r.t * 46) % 2;
      ctx.globalAlpha = pisca ? 1 : 0.4;
      // traço contínuo entre nós (interpolação sem pontilhado)
      var n = 0;
      for (var j = 0; j < r.nos.length - 1; j++) {
        var a = r.nos[j], b = r.nos[j + 1];
        var dx = b.x - a.x, dy = b.y - a.y;
        var passos = Math.max(Math.abs(dx), Math.abs(dy)) | 0;
        for (var s = 0; s <= passos; s++) {
          var px = a.x + dx * (s / Math.max(1, passos));
          var py = a.y + dy * (s / Math.max(1, passos));
          n++;
          ctx.fillStyle = n % 3 === 0 ? '#ffffff' : '#ffd866';
          ctx.fillRect(Math.round(px), Math.round(py), 1, 1);
        }
      }
      // clarão cruzado no impacto (baseY do raio — mundo infinito)
      var by = (typeof r.baseY === 'number') ? r.baseY : 242;
      ctx.fillStyle = '#fff3c8';
      ctx.fillRect(r.alvo - 2, by - 2, 5, 1);
      ctx.fillRect(r.alvo, by - 4, 1, 5);
    }
    ctx.globalAlpha = 1;
  }

  function desenhaNums(ctx) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (var i = 0; i < nums.length; i++) {
      var n = nums[i];
      // crit treme nos 0,12s iniciais (some 1 frame em 2)
      if (n.est === 'crit' && n.t < 0.12 && Math.random() < 0.5) continue;
      var alpha = n.t > n.tMax - 0.25 ? Math.max(0, (n.t - (n.tMax - 0.25)) / 0.25) : 1;
      var bx = n.x, by = n.y;
      if (n.est === 'big') bx += Math.sin(n.t * 9 + n.fase) * 1.3;
      ctx.globalAlpha = alpha *
        (n.est === 'big' ? 0.8 + 0.2 * Math.sin(n.t * 12 + n.fase) : 1);
      ctx.font = n.font;
      // halo dourado nas 4 direções (crit)
      if (n.est === 'crit') {
        ctx.fillStyle = 'rgba(255, 216, 102, 0.35)';
        ctx.fillText(n.txt, Math.round(bx) - 2, Math.round(by));
        ctx.fillText(n.txt, Math.round(bx) + 2, Math.round(by));
        ctx.fillText(n.txt, Math.round(bx), Math.round(by) - 2);
        ctx.fillText(n.txt, Math.round(bx), Math.round(by) + 2);
      }
      // sombra 1px
      ctx.fillStyle = '#1b1424';
      ctx.fillText(n.txt, Math.round(bx) + 1, Math.round(by) + 1);
      ctx.fillStyle = n.cor;
      ctx.fillText(n.txt, Math.round(bx), Math.round(by));
    }
    ctx.globalAlpha = 1;
  }

  // camada de baixo: anéis de choque no chão (atrás das entidades)
  function desenharBaixo(ctx) {
    desenhaAneis(ctx);
  }

  // camada de topo (ordem do doc §8): aditiva → sólida → fumaça → números
  function desenharTopo(ctx) {
    var i;
    ctx.globalCompositeOperation = 'lighter';
    for (i = 0; i < parts.length; i++) {
      var e = parts[i];
      if (e.tipo === 'fumaca' || e.tipo === 'poeira' ||
          e.tipo === 'caco' || e.tipo === 'confete' ||
          e.tipo === 'estrela') continue;
      desenhaGlow(ctx, e);
    }
    desenhaArcos(ctx);
    desenhaRaios(ctx);
    ctx.globalCompositeOperation = 'source-over';
    for (i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (p.tipo === 'fumaca' || p.tipo === 'poeira') continue;
      desenhaCorpo(ctx, p);
    }
    for (i = 0; i < parts.length; i++) {
      var f = parts[i];
      if (f.tipo === 'fumaca' || f.tipo === 'poeira') desenhaFumaca(ctx, f);
    }
    desenhaNums(ctx);
  }

  // camada de JANELA (depois do restore do clip): flash, vinheta de
  // evento e perigo de vida — cobrem a janela, não o mundo
  function molduras(ctx, cor, base, vx, vy, vw, vh) {
    for (var i = 0; i < 4; i++) {
      var ins = i * 3;
      ctx.globalAlpha = base * (1 - i * 0.2);
      ctx.fillStyle = cor;
      ctx.fillRect(vx + ins, vy + ins, vw - ins * 2, 3);
      ctx.fillRect(vx + ins, vy + vh - ins - 3, vw - ins * 2, 3);
      ctx.fillRect(vx + ins, vy + ins + 3, 3, vh - ins * 2 - 6);
      ctx.fillRect(vx + vw - ins - 3, vy + ins + 3, 3, vh - ins * 2 - 6);
    }
    ctx.globalAlpha = 1;
  }

  function desenharTela(ctx, vx, vy, vw, vh) {
    if (flash) {
      ctx.globalAlpha = flash.a * (flash.t / flash.tMax);
      ctx.fillStyle = flash.cor;
      ctx.fillRect(vx, vy, vw, vh);
      ctx.globalAlpha = 1;
    }
    if (borda) {
      var osc = 0.75 + 0.25 * Math.sin(borda.t * 16);
      molduras(ctx, borda.cor, borda.a * (borda.t / borda.tMax) * osc,
        vx, vy, vw, vh);
    } else if (perigoFrac < 0.35) {
      // perigo de vida: pisca vermelho (doc §7)
      var s = (0.35 - perigoFrac) / 0.35;
      var a = s * (0.10 + 0.10 * Math.sin(tempo * 6));
      if (a > 0.005) molduras(ctx, '#ff3b3b', a, vx, vy, vw, vh);
    }
  }

  // aura do chefe: dois glows pulsando atrás do sprite (doc §7)
  function auraBoss(ctx, x, y) {
    var a = 0.30 + 0.16 * Math.sin(tempo * 4);
    ctx.globalAlpha = a;
    var g1 = glow('#d8422a', 10);
    ctx.drawImage(g1, Math.round(x) - 10, Math.round(y - 8) - 10);
    ctx.globalAlpha = a * 0.7;
    var g2 = glow('#ffd866', 6);
    ctx.drawImage(g2, Math.round(x) - 6, Math.round(y - 8) - 6);
    ctx.globalAlpha = 1;
  }

  // sonda p/ testes (seção 49)
  function info() {
    var ests = [];
    for (var i = 0; i < nums.length; i++) ests.push(nums[i].est);
    return {
      parts: parts.length, nums: nums.length, aneis: aneis.length,
      raios: raios.length, arcos: arcos.length, qtd: qtd(),
      shake: Math.max(0, Math.round(shakeT * 100) / 100),
      hitStop: Math.round(hitStop * 1000) / 1000,
      flash: flash ? { cor: flash.cor, a: flash.a,
        restante: Math.round(flash.t * 100) / 100 } : null,
      borda: !!borda,
      perigo: Math.round(perigoFrac * 100) / 100,
      mudo: mudo,
      numEstilos: ests,
      glowCache: Object.keys(glowCache).length,
      anelCache: Object.keys(anelCache).length
    };
  }

  return {
    silenciar: silenciar,
    limpar: limpar,
    qtd: qtd,
    atualizar: atualizar,
    desenharBaixo: desenharBaixo,
    desenharTopo: desenharTopo,
    desenharTela: desenharTela,
    // spawns granulares (fachadas antigas + catálogo novo)
    brasas: brasas,
    faisca: faisca,
    faiscaMuita: faiscaMuita,
    explosao: explosao,
    corte: corte,
    cura: cura,
    missil: missil,
    poeiraPart: poeiraPart,
    // receitas (Docs/efeitos.md §5)
    impacto: impacto,
    impactoHeroi: impactoHeroi,
    morte: morte,
    nivelUp: nivelUp,
    reviver: reviver,
    bossChegou: bossChegou,
    raio: raio,
    raioRadial: raioRadial,
    // game feel
    sacudir: sacudir,
    shakeOffset: shakeOffset,
    parar: parar,
    congelar: congelar,
    flashTela: flashTela,
    bordaTela: bordaTela,
    perigo: perigo,
    // números
    nota: nota,
    auraBoss: auraBoss,
    info: info
  };
})();
