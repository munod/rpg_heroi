// Painel de gestão do personagem (atributos, aparência, classe).
// Compartilhado pela tela de seleção/criação e pela tela de jogo, para
// as duas telas terem exatamente o mesmo comportamento.
var Gestao = (function () {
  var aba = 'atributos';   // atributos | aparencia | classe | itens
  var paginaBolsa = 0;     // página da lista da bolsa (5 por página)
  var passo = 1;           // quantos pontos por ação (toggle ×1/×5)
  var repT = 0;            // tempo segurando um botão +/−
  var repI = 0;            // tempo desde a última repetição
  var REP_ATRASO = 0.25;   // segurar antes de começar a repetir
  var REP_PASSO = 0.1;     // cadência da repetição (~10/s)
  var RECT_TOGGLE = { x: 684, y: 224, w: 55, h: 26 };
  var prevT = 0;           // relógio da prévia da aba Apar (spec preview-heroi)
  // caixa da prévia: canto direito-de-baixo do painel — EM BAIXO das 4
  // linhas (y 104..214, contrato de clique) e à direita das dicas (x416)
  var PREVIA = { x: 616, y: 232, w: 132, h: 96, esc: 3 };

  function ciclo(arr, atual) {
    var i = arr.indexOf(atual);
    return arr[(i + 1) % arr.length];
  }

  function cicloTras(arr, atual) {
    var i = arr.indexOf(atual);
    if (i < 0) i = 0;
    return arr[(i - 1 + arr.length) % arr.length];
  }

  function quebra(texto, max) {
    var palavras = texto.split(' ');
    var linhas = [], atual = '';
    for (var i = 0; i < palavras.length; i++) {
      var teste = atual ? atual + ' ' + palavras[i] : palavras[i];
      if (teste.length > max && atual) {
        linhas.push(atual);
        atual = palavras[i];
      } else {
        atual = teste;
      }
    }
    if (atual) linhas.push(atual);
    return linhas;
  }

  function dentro(m, r) {
    return m.x >= r.x && m.x < r.x + r.w && m.y >= r.y && m.y < r.y + r.h;
  }

  // Linhas dos atributos com retângulos dos botões +/− — fonte única de
  // geometria: o update aplica as ações e o render só desenha por cima.
  // Alvos de toque: 11 -> 24px no dobro da resolução (dedo no celular).
  function linhasAtributos() {
    return Personagem.ATRIBUTOS.map(function (at, i) {
      var y = 96 + i * 28;
      return {
        at: at.id,
        nome: at.nome,
        y: y,
        menos: { x: 684, y: y - 12, w: 24, h: 24 },
        mais:  { x: 716, y: y - 12, w: 24, h: 24 }
      };
    });
  }

  // Move `passo` pontos no sentido dir, com as guardas em cada unidade
  // (não gasta mais do que tem, não leva atributo abaixo de 1).
  function aplicar(p, at, dir) {
    for (var i = 0; i < passo; i++) {
      if (dir > 0) {
        if (p.pontos <= 0) return;
        p.atributos[at] += 1;
        p.pontos -= 1;
      } else {
        if (p.atributos[at] <= 1) return;
        p.atributos[at] -= 1;
        p.pontos += 1;
      }
    }
  }

  // O que cada estatística conta (tooltip da aba Stats, Leva 4)
  var DESC_STATS = {
    'Abates': 'Monstros derrotados pelo herói',
    'Chefes derrotados': 'Chefes da onda 100 derrubados',
    'Açougueiros abatidos': 'Vitórias sobre o evento lendário (ouro ×10)',
    'Gatunos pegos': 'Ladrões abatidos antes da fuga (resgate ×1,2)',
    'Ondas limpas': 'Ondas completadas — morte não conta (só perde)',
    'Dano causado': 'PV total tirado dos monstros',
    'Dano recebido': 'PV total perdidos pelo herói',
    'Mortes': 'Quedas — cada uma paga −10% de ouro e −5 ondas',
    'Itens dropados': 'Drops coletados (equipados ou guardados)',
    'Tempo de jogo': 'Tempo em jogatina ativa — offline não conta'
  };

  // Tooltip dos atributos (Leva 3): o que cada um alimenta — o detalhe
  // numérico por fonte vive no tooltip do rodapé
  function dicasAtributo(linha, p) {
    var v = p.atributos[linha.at];
    var textos = {
      for: 'FOR: dano do ataque (+1 a cada 2 pontos efetivos)',
      des: 'DES: velocidade (×3), recarga (÷ vel) e crítico (×1,3)',
      con: 'CON: vida máxima (+4 por ponto)',
      int: 'INT: agudeza da IA — 4 = burro, 20 = gênio (skills/IA)',
      car: 'CAR: ouro de abate (log, satura ~2,8×) — no clérigo vira dano'
    };
    var out = [
      [(textos[linha.at] || linha.nome), '#e8c86a'],
      ['Valor atual: ' + v, '#f2eef8']
    ];
    if (linha.at === 'int') {
      // espelho de IA.agudeza: (int − 4) ÷ 16 em 0..1
      var agu = Math.max(0, Math.min(1, (v - 4) / 16));
      out.push(['Hoje: agudeza ' + agu.toFixed(2) +
        ' (0 burro · 1 gênio)', '#9a90b8']);
    }
    return out;
  }

  // As ações do painel acontecem aqui (fora do render): o clique aplica
  // na hora e, segurado, repete depois do arranque — em vez de um ponto
  // por clique, só.
  // auto-aprimorar: um passo a cada 0,5s no slot de MENOR custo —
  // teto (custoAprim = -1) e saldo respeitados; contadores/ouro já
  // contam dentro de Itens.aprimorar
  var autoT = 0;
  function autoAprPasso(p) {
    var alvo = null, melhor = -1, i, slot, it, c;
    for (i = 0; i < 2; i++) {
      slot = i === 0 ? 'arma' : 'armadura';
      it = p.equip[slot];
      if (!it) continue;
      c = Itens.custoAprim(it);
      if (c > 0 && (p.ouro || 0) >= c && (melhor < 0 || c < melhor)) {
        alvo = it;
        melhor = c;
      }
    }
    if (alvo) Itens.aprimorar(p, alvo);
  }

  function update(dt, p) {
    if (!p) { repT = 0; repI = 0; autoT = 0; prevT = 0; return; }
    // relógio da prévia: roda em QUALQUER aba (e também na criação —
    // selecao.js chama este update), antes dos return adiante
    prevT += dt;
    // roda em QUALQUER aba (é gestão, não visual)
    if (p.autoApr) {
      autoT += dt;
      if (autoT >= 0.5) { autoT = 0; autoAprPasso(p); }
    } else {
      autoT = 0;
    }
    // aba Stats: rolagem do conteúdo (wheel + arrasto do thumb)
    if (aba === 'stats') { atualizaStatsRolagem(); return; }
    if (aba !== 'atributos') { repT = 0; repI = 0; return; }
    // em tela larga o painel ancora à direita: os retângulos são locais
    // e o ponteiro é deslocado para o espaço do painel (dx = W - 768)
    var dx = Game.W - 768;
    var m = { x: Input.mouse.x - dx, y: Input.mouse.y,
              clicked: Input.mouse.clicked, down: Input.mouse.down };
    var linhas = linhasAtributos();
    var alvo = null, dir = 0;
    for (var i = 0; i < linhas.length; i++) {
      if (dentro(m, linhas[i].menos)) { alvo = linhas[i].at; dir = -1; break; }
      if (dentro(m, linhas[i].mais)) { alvo = linhas[i].at; dir = 1; break; }
    }

    if (alvo && m.clicked) aplicar(p, alvo, dir);

    if (alvo && m.down) {
      repT += dt;
      if (repT >= REP_ATRASO) {
        repI += dt;
        while (repI >= REP_PASSO) {
          repI -= REP_PASSO;
          aplicar(p, alvo, dir);
        }
      }
    } else {
      repT = 0;
      repI = 0;
    }

    if (m.clicked && dentro(m, RECT_TOGGLE)) passo = passo === 1 ? 5 : 1;
  }

  function desenhaAbas() {
    // 5 abas encurtadas: o painel tem 352px — 66px de largura com passo 70
    var lista = [
      ['atributos', 'Atrib'],
      ['aparencia', 'Apar'],
      ['classe', 'Classe'],
      ['itens', 'Itens'],
      ['stats', 'Stats']
    ];
    lista.forEach(function (a, i) {
      var x = 412 + i * 70;
      if (UI.button(x, 40, 66, 28, a[1], {
        ativo: aba === a[0],
        color: aba === a[0] ? '#e8c86a' : '#9a90b8',
        font: 'bold 16px monospace'
      })) {
        aba = a[0];
      }
    });
  }

  function desenhaAtributos(ctx, p) {
    linhasAtributos().forEach(function (linha) {
      var v = p.atributos[linha.at];
      UI.text(linha.nome, 416, linha.y, {});
      UI.text(String(v), 664, linha.y, { align: 'right', color: '#e8c86a' });
      // visual apenas: clicar/segurar aplica em Gestao.update
      UI.button(linha.menos.x, linha.menos.y, 24, 24, '-',
        { disabled: v <= 1 });
      UI.button(linha.mais.x, linha.mais.y, 24, 24, '+',
        { disabled: p.pontos <= 0 });
      // 264 = até x=680: NÃO cobre o − (684..708) nem o + (716..740) —
      // segurar o − abria o tooltip (bug reportado)
      UI.dica({ x: 416, y: linha.y - 12, w: 264, h: 24 },
        dicasAtributo(linha, p));
    });

    // toggle de quantos pontos cada clique/segurar gasta
    UI.button(RECT_TOGGLE.x, RECT_TOGGLE.y, RECT_TOGGLE.w, RECT_TOGGLE.h,
      '×' + passo, {
        ativo: passo === 5,
        color: passo === 5 ? '#e8c86a' : undefined
      });

    var cl = Personagem.CLASSES[p.classe];
    var bonus = Personagem.ATRIBUTOS.filter(function (at) {
      return cl.bonus[at.id];
    }).map(function (at) {
      var b = cl.bonus[at.id];
      return (b > 0 ? '+' : '') + b + ' ' + at.nome;
    }).join(', ');
    UI.text('Classe: ' + cl.nome, 416, 240, { color: cl.cor });
    // em 16px cabem 35 caracteres nos 343px do painel; 36 estoura
    var linhas = quebra(bonus || 'sem bônus', 35);
    linhas.forEach(function (linha, i) {
      UI.text(linha, 416, 268 + i * 24, { color: '#9a90b8' });
    });
    UI.text('A cada ' + Personagem.PONTOS_CADA + ' níveis: +' +
      Personagem.PONTOS_NIVEL + ' ponto',
      416, 268 + linhas.length * 24 + 12,
      { color: '#6f678a' });
  }

  // Ciclo da prévia (spec preview-heroi): 3s de idle (2 × 0,35s) + 1s
  // de ataque (3 × 0,36s) — só visual, sem relação com a recarga real.
  function previaFrame() {
    var f = prevT % 4;
    if (f < 3) return { anim: 'idle', quadro: Math.floor((f % 0.7) / 0.35) };
    return { anim: 'attack',
      quadro: Math.min(2, Math.floor((f - 3) / 0.36)) };
  }

  // Sonda p/ teste (e p/ uso futuro): o que a prévia está mostrando.
  function previa() {
    var pv = previaFrame();
    return { anim: pv.anim, quadro: pv.quadro,
      caixa: { x: PREVIA.x, y: PREVIA.y, w: PREVIA.w, h: PREVIA.h } };
  }

  // Prévia do herói: mesmo caminho do desenho da arena (lookDe + Anim.hero
  // — mesma cache, mesma chave), sprite ×3 com pé na base da caixa.
  function desenhaPrevia(ctx, p) {
    var pv = previaFrame();
    var c = Anim.hero(Personagem.lookDe(p), pv.anim, pv.quadro);
    UI.panel(PREVIA.x, PREVIA.y, PREVIA.w, PREVIA.h, 'Prévia');
    var cx = PREVIA.x + 66;
    var base = PREVIA.y + PREVIA.h - 6;
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.ellipse(cx, base, 22, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // corpo centrado em x=8 da grade (mesma âncora da arena)
    ctx.drawImage(c.canvas, Math.round(cx - 8 * PREVIA.esc),
      Math.round(base - 20 * PREVIA.esc),
      20 * PREVIA.esc, 20 * PREVIA.esc);
  }

  function desenhaAparencia(ctx, p, o) {
    var estiloIds = Personagem.ESTILOS.map(function (e) { return e.id; });
    var estiloNomes = {};
    Personagem.ESTILOS.forEach(function (e) { estiloNomes[e.id] = e.nome; });

    var linhas = [
      {
        rot: 'Pele', swatch: true,
        get: function () { return p.look.skin; },
        muda: function (d) {
          p.look.skin = d > 0
            ? ciclo(Personagem.CORES_PELE, p.look.skin)
            : cicloTras(Personagem.CORES_PELE, p.look.skin);
        }
      },
      {
        rot: 'Cabelo', swatch: true,
        get: function () { return p.look.hair; },
        muda: function (d) {
          p.look.hair = d > 0
            ? ciclo(Personagem.CORES_CABELO, p.look.hair)
            : cicloTras(Personagem.CORES_CABELO, p.look.hair);
        }
      },
      {
        rot: 'Estilo', swatch: false,
        nome: function () { return estiloNomes[p.look.estilo] || '?'; },
        muda: function (d) {
          p.look.estilo = d > 0
            ? ciclo(estiloIds, p.look.estilo)
            : cicloTras(estiloIds, p.look.estilo);
        }
      },
      {
        rot: 'Roupa', swatch: true,
        get: function () { return p.look.cloth; },
        muda: function (d) {
          p.look.cloth = d > 0
            ? ciclo(Personagem.CORES_ROUPA, p.look.cloth)
            : cicloTras(Personagem.CORES_ROUPA, p.look.cloth);
        }
      }
    ];

    linhas.forEach(function (lin, i) {
      var y = 104 + i * 32;
      UI.text(lin.rot, 416, y, {});
      if (UI.button(508, y - 14, 24, 28, '<')) lin.muda(-1);
      if (lin.swatch) {
        UI.swatch(544, y - 14, 140, 28, lin.get());
      } else {
        UI.swatch(544, y - 14, 140, 28, '#241f33');
        UI.text(lin.nome(), 614, y, { align: 'center', color: '#c9c2dd' });
      }
      if (UI.button(692, y - 14, 24, 28, '>')) lin.muda(1);
    });

    desenhaPrevia(ctx, p);

    // dicas curtas: a caixa da prévia começa em x616 (o texto tem que
    // caber à esquerda — 16px monospace ≈ 9,6px por caractere)
    UI.text('Muda em tempo real', 416, 248, { color: '#9a90b8' });
    if (o && o.criacao) {
      // na tela de seleção o nome se digita no cabeçalho
      UI.text('Nome: tecle no topo', 416, 280, { color: '#6f678a' });
      UI.text('Enter entra na arena', 416, 308, { color: '#6f678a' });
    } else {
      UI.text('Enter salva o look', 416, 280, { color: '#6f678a' });
    }
  }

  // Ações de investimento num slot (A+ aprimora · R+ re-rola), com o
  // custo no rótulo; desativadas sem item/ouro/teto/afixos.
  function slotAcoes(p, item, y) {
    var ca = item ? Itens.custoAprim(item) : -1;
    var cr = item ? Itens.custoReroll(item) : -1;
    if (UI.button(676, y, 38, 24, 'A+' + (ca >= 0 ? ca : '—'), {
      disabled: !item || ca < 0 || (p.ouro || 0) < ca,
      font: '11px monospace'
    })) {
      if (Itens.aprimorar(p, item)) {
        Gravacao.msg(item.nome + ' aprimorado (+' + item.up + ')');
      }
    }
    if (UI.button(718, y, 38, 24, 'R+' + (cr >= 0 ? cr : '—'), {
      disabled: !item || cr < 0 || (p.ouro || 0) < cr,
      font: '11px monospace'
    })) {
      if (Itens.reroll(p, item)) Gravacao.msg('Re-roll: ' + item.nome);
    }
  }

  // Aba Itens: 2 slots equipados (nome + bônus, com A+/R+), ouro e bolsa
  // paginada. Linha da bolsa = equipar | V (vende 25%) | S (sucata, piso
  // garantido) — o delta por chave aparece contra o equipado (item com
  // afixo negativo aparece com '-'). Linhas em 13px.
  // checkbox de fixar slot (R-GES-1): impede o auto-equip de trocar
  // por melhor — a troca MANUAL pela bolsa continua livre
  function slotFixar(p, slot, y) {
    var on = !!(p.trava && p.trava[slot]);
    if (UI.button(640, y, 32, 24, on ? '[x]' : '[ ]', {
      ativo: on,
      color: on ? '#e8c86a' : '#6f678a',
      font: '11px monospace'
    })) {
      if (!p.trava) p.trava = { arma: false, armadura: false };
      p.trava[slot] = !p.trava[slot];
      Gravacao.msg((slot === 'arma' ? 'Arma' : 'Armadura') +
        (p.trava[slot] ? ' fixada — não troca por melhor' : ' solta'));
    }
    UI.dica({ x: 640, y: y, w: 32, h: 24 }, [[
      on ? 'FIXADA: drop não substitui' : 'Fixar: drop não substitui',
      '#e8c86a']]);
  }

  function desenhaItens(ctx, p) {
    var arma = p.equip.arma, arm = p.equip.armadura;
    // nomes enxutos (20/16 chars): a linha termina antes do [x] em 640
    UI.text('Arma: ' + (arma ? Itens.linha(arma, null, 20) : '—'), 416, 96,
      { color: arma ? Itens.corRar(arma.rar) : '#6f678a', font: '13px monospace' });
    UI.dica({ x: 416, y: 84, w: 220, h: 24 }, Itens.dicas(p, arma));
    slotFixar(p, 'arma', 84);
    slotAcoes(p, arma, 84);
    UI.text('Armadura: ' + (arm ? Itens.linha(arm, null, 16) : '—'), 416, 124,
      { color: arm ? Itens.corRar(arm.rar) : '#6f678a', font: '13px monospace' });
    UI.dica({ x: 416, y: 112, w: 220, h: 24 }, Itens.dicas(p, arm));
    slotFixar(p, 'armadura', 112);
    slotAcoes(p, arm, 112);

    UI.text('Ouro ' + milhar(p.ouro || 0) + ' · Bolsa ' +
      p.bolsa.length + '/' + Itens.BOLSA_MAX,
      416, 152, { color: '#e8c86a', font: '13px monospace' });
    // checkbox Auto A+ (R-GES-2): gasta ouro sozinho no slot mais barato
    var autoOn = p.autoApr === true;
    if (UI.button(640, 138, 34, 24, autoOn ? '[x]' : '[ ]', {
      ativo: autoOn,
      color: autoOn ? '#8ce08c' : '#6f678a',
      font: '11px monospace'
    })) {
      p.autoApr = !autoOn;
      Gravacao.msg(autoOn ? 'Auto A+ desligado' : 'Auto A+ ligado — gasta ouro no A+');
    }
    UI.dica({ x: 640, y: 138, w: 34, h: 24 }, [
      ['Auto A+: aprimora sozinho o', '#8ce08c'],
      ['slot mais barato (teto e', '#8ce08c'],
      ['saldo respeitados)', '#8ce08c']
    ]);
    UI.text('V venda · S sucata · A+ apr. · R+ rer.', 416, 168,
      { color: '#6f678a', font: '11px monospace' });
    var paginas = Math.max(1, Math.ceil(p.bolsa.length / 5));
    if (paginaBolsa > paginas - 1) paginaBolsa = paginas - 1;
    if (UI.button(684, 144, 28, 28, '<', { disabled: paginaBolsa === 0 })) {
      paginaBolsa--;
    }
    if (UI.button(720, 144, 28, 28, '>',
      { disabled: paginaBolsa >= paginas - 1 })) {
      paginaBolsa++;
    }

    if (!p.bolsa.length) {
      UI.text('Derrotar monstros dropa equipamento', 416, 192,
        { color: '#6f678a' });
      return;
    }

    p.bolsa.slice(paginaBolsa * 5, paginaBolsa * 5 + 5)
      .forEach(function (item, i) {
        var y = 176 + i * 30;
        if (UI.button(416, y, 272, 26,
          Itens.linha(item, p.equip[item.slot], 33), {
            align: 'left', color: Itens.corRar(item.rar),
            font: '13px monospace'
          })) {
          Itens.equipar(p, item);
        }
        UI.dica({ x: 416, y: y, w: 272, h: 26 }, Itens.dicas(p, item));
        if (UI.button(692, y, 30, 26, 'V', {
          color: '#8ce08c', font: '13px monospace'
        })) {
          var gv = Itens.vender(p, item);
          if (gv) Gravacao.msg('+' + gv + ' ouro (vendido)');
        }
        if (UI.button(726, y, 30, 26, 'S', {
          color: '#c9c2dd', font: '13px monospace'
        })) {
          var gs = Itens.sucatear(p, item);
          if (gs) Gravacao.msg('+' + gs + ' ouro (sucata)');
        }
      });
  }

  // Alterna uma skill no loadout: começa do automático na primeira troca;
  // mínimo 1 e máximo Skills.limite(nivel) — 3/4/5 (spec arvore-skills;
  // recusas com toast).
  function alternarSkill(p, id) {
    var sel = Array.isArray(p.loadout) ? p.loadout.slice()
      : Skills.carregadas(p).map(function (s) { return s.id; });
    var i = sel.indexOf(id);
    if (i >= 0) {
      if (sel.length <= 1) {
        Gravacao.msg('Mínimo de 1 skill ativa');
        return;
      }
      sel.splice(i, 1);
    } else {
      var lim = Skills.limite(p.nivel);
      if (sel.length >= lim) {
        Gravacao.msg('Máximo de ' + lim + ' skills ativas');
        return;
      }
      sel.push(id);
    }
    p.loadout = sel;
    Gravacao.msg('Skills ativas: ' + sel.length + '/' +
      Skills.limite(p.nivel));
  }

  // ---- ramos (spec arvore-skills): ciclo base → A → B → base -------
  function nomeRamo(sk, ramoId) {
    if (!Array.isArray(sk.ramos)) return '';
    for (var i = 0; i < sk.ramos.length; i++) {
      if (sk.ramos[i].id === ramoId) return sk.ramos[i].nome;
    }
    return '';
  }

  function alternaRamo(p, sk) {
    var prox = Skills.cicloRamo(p, sk);
    Gravacao.msg('Ramo de ' + sk.nome + ': ' +
      (prox ? nomeRamo(sk, prox) : 'base neutra'));
  }

  function dicaRamo(sk, ramo) {
    var out = [['Ramo da skill: ' + sk.nome, '#e8c86a']];
    if (Array.isArray(sk.ramos)) {
      for (var i = 0; i < sk.ramos.length; i++) {
        var r = sk.ramos[i];
        out.push([r.nome + ': ' + r.efeito + (ramo === r.id ? '  [ATIVO]' : ''),
          ramo === r.id ? '#e8c86a' : '#9a90b8']);
      }
    }
    out.push(['Sem escolha = base neutra (valores originais)', '#6f678a']);
    return out;
  }

  // Aba Classe: grade 2×2 das classes + loadout de skills (máx
  // Skills.limite = 3/4/5 por nível) em GRADE 2×4 com botão de ramo +
  // keystone (efeito e custo no rótulo). Sem descrição/próxima skill:
  // bônus aparecem na aba Atributos e o nível de cada skill na própria
  // linha. Linhas de 24px (alvo de toque do celular).
  function desenhaClasse(ctx, p) {
    var ordem = ['guerreiro', 'mago', 'ladino', 'clerigo'];
    ordem.forEach(function (id, i) {
      var cl = Personagem.CLASSES[id];
      var sel = p.classe === id;
      var x = 416 + (i % 2) * 174;      // 2 colunas de 166 + 8 de vão
      var y = 88 + Math.floor(i / 2) * 36;
      if (UI.button(x, y, 166, 28, (sel ? '> ' : '  ') + cl.nome, {
        color: sel ? '#e8c86a' : '#f2eef8'
      })) {
        if (!sel) {
          p.classe = id;
          p.loadout = null;             // volta pro automático da classe
        }
      }
    });

    // loadout: as 8 skills da classe em GRADE 2×4 (coluna única não
    // cabe — spec arvore-skills) — ativas em dourado, bloqueadas com o
    // nível de desbloqueio; cada linha tem o toggle (110px) e o botão
    // de ramo (52px: base → A → B → base)
    var ativasIds = Skills.carregadas(p).map(function (s) { return s.id; });
    var lim = Skills.limite(p.nivel);
    UI.text('Skills ativas (máx ' + lim + ')', 416, 168,
      { color: '#9a90b8', font: '13px monospace' });
    UI.text(ativasIds.length + '/' + lim, 752, 168,
      { align: 'right', color: '#e8c86a', font: '13px monospace' });
    Skills.daClasse(p.classe).forEach(function (sk, i) {
      var x = 416 + (i % 2) * 174;        // 2 colunas de 166 (110+4+52)
      var y = 178 + Math.floor(i / 2) * 29;  // 4 linhas: 178..289
      var aberta = sk.nivel <= p.nivel;
      var on = aberta && ativasIds.indexOf(sk.id) >= 0;
      var ramo = Skills.ramoDe(p, sk);
      if (UI.button(x, y, 110, 24, sk.nome, {
          disabled: !aberta,
          ativo: on,
          align: 'left',
          color: on ? '#e8c86a' : (aberta ? '#f2eef8' : '#6f678a'),
          font: '10px monospace'
        })) {
        alternarSkill(p, sk.id);
      }
      UI.dica({ x: x, y: y, w: 110, h: 24 }, Skills.dicas(sk, ramo));
      // ramo: bloqueada mostra o nível; sem escolha = "Base"
      var rot = !aberta ? ('nv ' + sk.nivel)
        : (ramo ? nomeRamo(sk, ramo) : 'Base');
      if (UI.button(x + 114, y, 52, 24, rot, {
          disabled: !aberta,
          ativo: !!ramo,
          color: ramo ? '#e8c86a' : '#9a90b8',
          font: '10px monospace'
        })) {
        alternaRamo(p, sk);
      }
      UI.dica({ x: x + 114, y: y, w: 52, h: 24 }, dicaRamo(sk, ramo));
    });

    // keystone da classe: efeito e custo no rótulo (11px p/ caber)
    var k = Personagem.keystoneDe(p.classe);
    var rot = '', dis = true;
    if (!k || p.nivel < Personagem.KEY_NIVEL) {
      rot = 'K: keystone da classe libera no nível ' + Personagem.KEY_NIVEL;
    } else if (!p.keystoneLib) {
      rot = 'K: ' + k.nome + ' ' + k.efeito + ' · ' +
        Personagem.KEY_CUSTO + ' ouro';
      dis = (p.ouro || 0) < Personagem.KEY_CUSTO;
    } else {
      rot = 'K: ' + k.nome + ' ' + k.efeito + ' · ' +
        (p.keystoneOn
          ? 'ATIVO (desl ' + Personagem.KEY_RESPEC + ')'
          : 'ligar (' + Personagem.KEY_RESPEC + ')');
      dis = (p.ouro || 0) < Personagem.KEY_RESPEC;
    }
    if (k) {
      UI.dica({ x: 416, y: 306, w: 340, h: 24 }, [
        ['K: ' + k.nome + ' — ' + k.efeito + ' (tradeoff)',
          p.keystoneOn ? '#8ce08c' : '#e8c86a'],
        ['Libera no nível ' + Personagem.KEY_NIVEL + ' · compra ' +
          Personagem.KEY_CUSTO + ' de ouro · alternar ' +
          Personagem.KEY_RESPEC, '#9a90b8'],
        ['Aparece no detalhe do Dano/HP do rodapé quando ativo', '#6f678a']
      ]);
    }
    if (UI.button(416, 306, 340, 24, rot, {
      disabled: dis,
      ativo: p.keystoneOn,
      color: p.keystoneOn ? '#8ce08c' : '#c9c2dd',
      font: '11px monospace'
    })) {
      var ligado = p.keystoneOn;
      var ok = p.keystoneLib
        ? Personagem.alternarKeystone(p)
        : Personagem.comprarKeystone(p);
      if (ok) {
        Gravacao.msg(p.keystoneLib && !ligado
          ? 'Keystone comprado e ativo!' : 'Keystone desligado');
      } else {
        Gravacao.msg('Sem ouro para isso');
      }
    }
  }

  // milhar em pt-BR sem depender do locale do ambiente: 1234567 -> 1.234.567
  function milhar(n) {
    var s = String(Math.max(0, Math.floor(n || 0)));
    return s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  // segundos -> '45s' | '12min' | '2h13min'
  function tempoHumano(seg) {
    var s = Math.max(0, Math.floor(seg || 0));
    if (s < 60) return s + 's';
    var min = Math.floor(s / 60);
    if (min < 60) return min + 'min';
    return Math.floor(min / 60) + 'h' + (min % 60) + 'min';
  }

  // ---- rolagem da aba Stats (o conteúdo passou do painel de 300px com
  // o bloco de cooldowns): wheel + arrasto do thumb (mouse/toque
  // compartilham o ponteiro). Linhas fora da faixa NÃO são desenhadas —
  // sem clip, que o rasterizador de testes não tem.
  var statsScroll = 0;      // offset atual (px)
  var statsArrasta = false; // arrastando o thumb
  var statsArrastaOff = 0;  // agarre: distância do clique ao centro
  var statsAlt = 0;         // base do conteúdo (medida no último render)
  var ST_TOPO = 116, ST_BASE = 334;              // faixa rolável
  var ST_TRILHO = { x: 746, y: 112, w: 8, h: 222 };
  // valores alinhados à direita ficam à ESQUERDA do trilho (2px de
  // folga) — spec ajustes-playtest-3: antes em 752 o thumb cobria os
  // últimos dígitos dos números
  var ST_VAL_X = 744;

  function statsMax() {
    return Math.max(0, statsAlt - ST_BASE);
  }

  function statsThumb() {
    var max = statsMax();
    if (max <= 0) return null;
    var altCont = Math.max(ST_BASE - ST_TOPO, statsAlt - ST_TOPO);
    var th = Math.max(24, Math.round(
      ST_TRILHO.h * (ST_BASE - ST_TOPO) / altCont));
    return { x: ST_TRILHO.x,
             y: ST_TRILHO.y + Math.round((ST_TRILHO.h - th) *
               (statsScroll / max)),
             w: ST_TRILHO.w, h: th };
  }

  function atualizaStatsRolagem() {
    var dx = Game.W - 768;
    var m = { x: Input.mouse.x - dx, y: Input.mouse.y,
              clicked: Input.mouse.clicked, down: Input.mouse.down };
    var w = Input.roda();
    if (w) statsScroll += w * 0.5;      // rolagem suave
    var t = statsThumb();
    if (m.clicked && t && dentro(m, t)) {
      statsArrasta = true;
      // agarre: preserva a distância clique→centro do thumb (clicar na
      // borda não pode pular o scroll)
      statsArrastaOff = (t.y + t.h / 2) - m.y;
    }
    if (!m.down) statsArrasta = false;
    t = statsThumb();
    if (statsArrasta && t) {
      var max = statsMax();
      var faixa = ST_TRILHO.h - t.h;
      // o centro do thumb segue o ponteiro (com o offset de agarre)
      if (faixa > 0) {
        statsScroll = (m.y + statsArrastaOff - ST_TRILHO.y - t.h / 2) /
          faixa * max;
      }
    }
    statsScroll = Math.max(0, Math.min(statsScroll, statsMax()));
  }

  // segundos -> '4,5s' (vírgula decimal pt-BR)
  function fmtSeg(v) {
    return String(Math.round(v * 10) / 10).replace('.', ',') + 's';
  }

  // Valor de cooldown na tela: EFETIVO de combate (o que a Batalha usa —
  // IA.skillEfeito com a agudeza da INT) com a base entre parênteses;
  // área vira tempo estimado com a recarga atual; veneno é chance.
  function txtCooldown(sk, p, agu) {
    if (sk.tipo === 'area') {
      return '≈' + fmtSeg(sk.aCada * Personagem.status(p).recarga) +
        ' a cada ' + sk.aCada + ' golpes';
    }
    if (sk.tipo === 'veneno') {
      return Math.round(sk.chance * 100) + '% por golpe · ' + sk.dur + 's';
    }
    var ef = IA.skillEfeito(sk, agu).intervalo;
    if (!ef) return '—';
    return fmtSeg(ef) + ' (base ' + fmtSeg(sk.intervalo) + ')';
  }

  // Aba Stats: estatísticas de vida inteira do herói (Personagem.stats)
  // + bloco de cooldowns das skills. Rola porque o conteúdo passou do
  // painel (spec ajustes-playtest-2).
  function desenhaStats(ctx, p) {
    var s = p.stats || {};
    UI.text('Estatísticas', 416, 96, { color: '#e8c86a' });   // fixo
    var itens = [];   // { base, desenha(y) } — base = y SEM rolagem
    function em(base, f) { itens.push({ base: base, desenha: f }); }

    var linhas = [
      ['Abates', milhar(s.abates)],
      ['Chefes derrotados', milhar(s.bosses)],
      ['Açougueiros abatidos', milhar(s.acougueiros)],
      ['Gatunos pegos', milhar(s.gatunos)],
      ['Ondas limpas', milhar(s.ondas)],
      ['Dano causado', milhar(s.danoCausado)],
      ['Dano recebido', milhar(s.danoRecebido)],
      ['Mortes', milhar(s.mortes)],
      ['Itens dropados', milhar(s.itens)],
      ['Tempo de jogo', tempoHumano(s.tempo)]
    ];
    linhas.forEach(function (l, i) {
      em(116 + i * 15, function (y) {
        UI.text(l[0], 416, y, { color: '#c9c2dd', font: '13px monospace' });
        UI.text(l[1], ST_VAL_X, y, { align: 'right', color: '#e8c86a',
          font: '13px monospace' });
        UI.dica({ x: 416, y: y - 7, w: 340, h: 14 },
          [[l[0] + ': ' + (DESC_STATS[l[0]] || '—'), '#e8c86a']]);
      });
    });

    // ---- base → total (padrão D3: 'Life 143/143 (15+108+20)') -------
    // O que os modificadores (itens · aprimoramento · keystone · bônus
    // de classe) estão acrescentando — sem ter que abrir o hover.
    var det = Personagem.statusDetalhado(p);
    var ef = Personagem.status(p).atributos;   // efetivos (c/ classe)
    var bi = p.atributos;                      // investido
    function par(rot, base, tot) {
      // só a Vel é fracionária por construção (46+24×(DES/8)^0,35) —
      // na tela sai inteira; os demais valores são crus (os testes
      // parseiam 'Dano base→total' com o número exato)
      if (rot === 'Vel') { base = Math.round(base); tot = Math.round(tot); }
      return rot + ' ' + base + (base === tot ? '' : '→' + tot);
    }
    var yB = 116 + linhas.length * 15 + 4;
    em(yB, function (y) {
      UI.text('Base → total (itens · keystone)', 416, y,
        { color: '#9a90b8', font: '13px monospace' });
      UI.dica({ x: 416, y: y - 7, w: 340, h: 14 }, [
        ['base = sem modificadores · seta = com eles', '#e8c86a'],
        ['detalhe por fonte no rodapé (hover)', '#9a90b8']
      ]);
    });
    var blocos = [
      par('Dano', det.dano.base, det.dano.total) + ' · ' +
        par('HP', det.hp.base, det.hp.total),
      par('Vel', det.vel.base, det.vel.total) + ' · ' +
        par('Crít', det.crit.base, det.crit.total) + '%',
      par('FOR', bi.for, ef.for) + ' · ' + par('DES', bi.des, ef.des) +
        ' · ' + par('CON', bi.con, ef.con),
      par('INT', bi.int, ef.int) + ' · ' + par('CAR', bi.car, ef.car)
    ];
    blocos.forEach(function (txt, i) {
      em(yB + 14 + i * 14, function (y) {
        UI.text(txt, 416, y,
          { color: i < 2 ? '#f2eef8' : '#c9c2dd', font: '13px monospace' });
      });
    });

    // ---- cooldowns das skills: valor EFETIVO com a INT atual --------
    var agu = IA.agudeza(ef.int);   // espelho do aguHeroi da Batalha
    var yS = yB + 14 + blocos.length * 14 + 6;
    em(yS, function (y) {
      UI.text('Skills — cooldown (com sua INT)', 416, y,
        { color: '#9a90b8', font: '13px monospace' });
      UI.dica({ x: 416, y: y - 7, w: 340, h: 14 }, [
        ['efetivo = o que o combate usa (a INT acelera)', '#e8c86a'],
        ['área conta golpes: o tempo varia com a sua DES', '#9a90b8']
      ]);
    });
    Skills.daClasse(p.classe).forEach(function (sk, i) {
      var aberta = sk.nivel <= p.nivel;
      em(yS + 14 + i * 15, function (y) {
        var cor = aberta ? '#f2eef8' : '#6f678a';
        UI.text(sk.nome + (aberta ? '' : ' (nv ' + sk.nivel + ')'),
          416, y, { color: cor, font: '13px monospace' });
        // bloqueada: só o nível (a referência de cd fica no tooltip)
        UI.text(aberta ? txtCooldown(sk, p, agu) : 'nv ' + sk.nivel,
          ST_VAL_X, y, { align: 'right',
            color: aberta ? '#e8c86a' : '#6f678a', font: '13px monospace' });
        UI.dica({ x: 416, y: y - 7, w: 340, h: 14 },
          Skills.dicas(sk, Skills.ramoDe(p, sk)));
      });
    });

    // ---- desenha só o que cabe na faixa visível
    for (var i = 0; i < itens.length; i++) {
      var y = itens[i].base - statsScroll;
      if (y < ST_TOPO - 8 || y > ST_BASE + 8) continue;
      itens[i].desenha(y);
    }
    statsAlt = itens[itens.length - 1].base + 8;

    // ---- barra de rolagem (só quando o conteúdo passa do painel)
    var t = statsThumb();
    if (t) {
      ctx.fillStyle = 'rgba(16, 12, 24, 0.9)';
      ctx.fillRect(ST_TRILHO.x, ST_TRILHO.y, ST_TRILHO.w, ST_TRILHO.h);
      ctx.fillStyle = '#5a4f78';
      ctx.fillRect(t.x, t.y, t.w, t.h);
    }
  }

  // geometria p/ teste (spec ajustes-playtest-3): os valores da aba
  // Stats têm que caber à esquerda do trilho da rolagem
  function statsGeom() {
    return { valX: ST_VAL_X, trilho: ST_TRILHO };
  }

  // Desenha o painel direito completo (painel + abas + conteúdo).
  // o.criacao ajusta as dicas de texto para a tela de seleção.
  function desenhar(ctx, p, o) {
    // âncora direita em tela larga: o grupo inteiro desloca por dx
    // (desenho via translate; hit-test via UI.deslocar e o m - dx do
    // update). Em 16:9, dx = 0 e nada muda.
    var dx = Game.W - 768;
    ctx.save();
    ctx.translate(dx, 0);
    UI.deslocar(dx);
    UI.panel(408, 36, 352, 300);
    desenhaAbas();
    if (aba === 'atributos') desenhaAtributos(ctx, p);
    else if (aba === 'aparencia') desenhaAparencia(ctx, p, o);
    else if (aba === 'itens') desenhaItens(ctx, p);
    else if (aba === 'stats') desenhaStats(ctx, p);
    else desenhaClasse(ctx, p);
    UI.deslocar(0);
    ctx.restore();
  }

  return {
    desenhar: desenhar,
    update: update,
    quebra: quebra,
    statsGeom: statsGeom,
    previa: previa
  };
})();
