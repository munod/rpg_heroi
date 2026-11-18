// Teste de fumaça: roda o jogo inteiro com DOM falsificado no Node.
// Uso: node testes/fumaca.js
'use strict';

const { carregar } = require('./carga');

// harness comum: canvas, DOM, localStorage, sandbox e scripts do jogo
const {
  sandbox, jogoCanvas, ouvintesJanela, ouvintesDocumento, clicados,
  localStorage: localStorageStub, frame, tecla, clique, pressionar, soltar
} = carregar();

// ---------------------------------------------------------------- asserções
let falhas = 0;
function conf(cond, msg) {
  if (cond) {
    console.log('  ok  ' + msg);
  } else {
    falhas++;
    console.log('  FALHA  ' + msg);
  }
}

// ---------------------------------------------------------------- testes
// a fumaça valida o layout de referência (16:9): fixa a janela antes do
// load, independente do env JANELA (a seção 19 simula tela larga e volta)
sandbox.window.innerWidth = 1280;
sandbox.window.innerHeight = 720;

// eventos aleatórios DESLIGADOS nas seções 1..27: com centenas de ondas
// rodando, Açougueiro/Gatuno disparariam em massa e poluiriam stats,
// ouro e penalidades de todos os testes. A 28 religa o Açougueiro (e
// desliga de novo no fim), a 29 religa o Gatuno — só lá são testados.
const Eventos = sandbox.Eventos;
Eventos._nasceAco = Eventos.nasceAco;
Eventos._nasceGat = Eventos.nasceGat;
// RNGs novos da spec monstros-novos: mesmo mosquetão (Enxame derruba
// o XP/ouro de qualquer teste que rode ondas; o Cofre mudaria stats)
Eventos._nasceEnxame = Eventos.nasceEnxame;
Eventos._nasceCofre = Eventos.nasceCofre;
const SEM_ACO = function () { return false; };
const SEM_GAT = function () { return 0; };
const SEM_ENX = function () { return false; };
const SEM_COF = function () { return false; };
Eventos.nasceAco = SEM_ACO;
Eventos.nasceGat = SEM_GAT;
Eventos.nasceEnxame = SEM_ENX;
Eventos.nasceCofre = SEM_COF;

// ranking: o setup local do Firebase pode trazer chaves reais
// (ativo: true em js/ranking-config.js) — o teste DESLIGA na largada
// para a suíte não depender do setup de quem roda; a seção 35 reativa
// (com SDK stubado) nas fases que precisam.
sandbox.RankingConfig.ativo = false;

const Game = sandbox.Game;
const Personagem = sandbox.Personagem;
const Salvar = sandbox.Salvar;
const Sprite = sandbox.Sprite;

console.log('1) geração de sprites');
{
  const classes = ['guerreiro', 'mago', 'ladino', 'clerigo'];
  const estilos = ['curto', 'longo', 'rabo', 'moicana', 'careca'];
  let min = Infinity, max = 0, total = 0;
  for (const cl of classes) {
    const p = Personagem.novo();
    p.classe = cl;
    const look = Personagem.lookDe(p);
    for (const est of estilos) {
      look.estilo = est;
      for (const anim of ['idle', 'walk', 'attack']) {
        const frames = anim === 'walk' ? 4 : anim === 'attack' ? 3 : 2;
        for (let f = 0; f < frames; f++) {
          const c = Sprite.heroCanvas(look, anim, f);
          const n = c.canvas._pixels;
          min = Math.min(min, n);
          max = Math.max(max, n);
          total++;
          if (n < 80) console.log('     -> sprite vazio?', cl, est, anim, f, n);
        }
      }
    }
  }
  conf(total === 4 * 5 * (2 + 4 + 3), 'gerou todos os frames (' + total + ')');
  conf(min >= 80, 'nenhum sprite vazio (mín ' + min + ' px)');
  conf(max <= 400, 'nenhum sprite estourou a grade (máx ' + max + ' px)');

  const slime = Sprite.slimeCanvas('#4aa03a', 0);
  conf(slime.canvas._pixels > 50, 'slime desenhado (' + slime.canvas._pixels + ' px)');
  const tree = Sprite.treeCanvas();
  conf(tree.canvas._pixels > 150, 'árvore desenhada (' + tree.canvas._pixels + ' px)');
  const rock = Sprite.rockCanvas();
  conf(rock.canvas._pixels > 40, 'pedra desenhada (' + rock.canvas._pixels + ' px)');
  const morcego = Sprite.morcegoCanvas('#7a5aa8', 0);
  conf(morcego.canvas._pixels > 40,
    'morcego desenhado (' + morcego.canvas._pixels + ' px)');
  const aranha = Sprite.aranhaCanvas('#c84a3a', 0);
  conf(aranha.canvas._pixels > 40,
    'aranha desenhada (' + aranha.canvas._pixels + ' px)');
}

console.log('2) status por classe');
{
  const esperado = {
    guerreiro: { hp: 18 + 10 * 4, dano: 5 + Math.floor(11 / 2) },
    mago: { hp: 8 + 7 * 4, dano: 4 + Math.floor(12 / 2) },
    ladino: { hp: 12 + 8 * 4, dano: 4 + Math.floor(12 / 2) },
    // clérigo: danoMod 'car' (spec gestao-atributos) — car 8+4=12
    clerigo: { hp: 16 + 11 * 4, dano: 4 + Math.floor(12 / 2) }
  };
  for (const cl of Object.keys(esperado)) {
    const p = Personagem.novo();
    p.classe = cl;
    const s = Personagem.status(p);
    conf(s.hpMax === esperado[cl].hp && s.dano === esperado[cl].dano,
      cl + ': hp=' + s.hpMax + ' dano=' + s.dano + ' vel=' + s.vel + ' crit=' + s.crit + '%');
  }

  // Velocidade também acelera o ataque
  const pv = Personagem.novo();
  const rvBase = Personagem.status(pv).recarga;
  conf(Math.abs(rvBase - 0.5) < 1e-9,
    'vel base mantém 0.50s por golpe (recarga=' + rvBase.toFixed(2) + 's)');
  pv.atributos.des = 40;
  const rvAlta = Personagem.status(pv).recarga;
  conf(rvAlta < rvBase,
    'velocidade maior encurta a recarga (' + rvBase.toFixed(2) + 's -> ' +
    rvAlta.toFixed(2) + 's)');
}

console.log('3) export/import JSON');
{
  const p = Personagem.novo();
  p.nome = 'Teste';
  p.classe = 'mago';
  p.atributos.int = 14;
  const ida = Personagem.exportarJSON(p);
  const volta = Personagem.importarJSON(ida);
  conf(volta.nome === 'Teste' && volta.classe === 'mago' && volta.atributos.int === 14,
    'round-trip preserva dados');
  let erro = false;
  try { Personagem.importarJSON('{ sem json'); } catch (e) { erro = true; }
  conf(erro, 'JSON inválido lança erro');
  const parcial = Personagem.importarJSON('{"nome":"Parcial","classe":"mago"}');
  conf(parcial.nome === 'Parcial' && parcial.classe === 'mago' &&
       parcial.atributos.for === 8 && typeof parcial.look.skin === 'string',
    'JSON parcial é normalizado com padrões');
  const gigante = Personagem.importarJSON(
    '{"nome":"G","atributos":{"for":999,"des":1}}');
  conf(gigante.atributos.for === 999 && gigante.atributos.des === 1,
    'sem teto: atributo999 é aceito (for=' + gigante.atributos.for + ')');
  const xpAlto = Personagem.importarJSON('{"nome":"X","xp":1e15}');
  conf(xpAlto.xp === Personagem.custoProximo(1) - 1,
    'xp importado é clampado em xpProx−1 (1e15 -> ' + xpAlto.xp + ')');
  const zerado = Personagem.importarJSON('{"atributos":{"for":0}}');
  conf(zerado.atributos.for === 1,
    'import corrige atributo0 para1 (for=' + zerado.atributos.for + ')');
  const alvo = Personagem.novo();
  alvo.atributos.for = 0;
  let rejeitou = false;
  try { Personagem.validar(alvo); } catch (e) { rejeitou = true; }
  conf(rejeitou, 'validar rejeita atributo0 no save');
  conf(Personagem.novo().pontos === 0,
    'herói novo nasce com 0 pontos (só +5 por nível)');
  conf(Personagem.novo().xpProx === Personagem.custoProximo(1),
    'herói novo começa com o custo do nível 1 (' +
    Personagem.custoProximo(1) + ' XP)');
  conf(Personagem.custoProximo(50) > Personagem.custoProximo(1),
    'custo de nível cresce com o nível');

  // --- itens: round-trip, normalização e efeito no status
  const eq = Personagem.novo();
  eq.classe = 'mago';           // arma padrão da classe: cajado
  eq.equip.arma = { nome: 'Espada de Aço', slot: 'arma', arma: 'espada',
                    rar: 2, bonus: { dano: 7, hp: 10, vel: 5, crit: 3 } };
  eq.bolsa = [{ nome: 'Trapos Gastos', slot: 'armadura', rar: 1,
                bonus: { hp: 8 } }];
  const voltaEq = Personagem.importarJSON(Personagem.exportarJSON(eq));
  conf(voltaEq.equip.arma && voltaEq.equip.arma.nome === 'Espada de Aço' &&
       voltaEq.equip.arma.bonus.dano === 7 && voltaEq.bolsa.length === 1,
    'itens sobrevivem ao round-trip de export/import');
  const semItens = Personagem.importarJSON('{"nome":"Velho"}');
  conf(semItens.equip.arma === null && semItens.equip.armadura === null &&
       semItens.bolsa.length === 0,
    'JSON antigo sem itens ganha equip/bolsa vazios');
  const itemRuim = Personagem.importarJSON(
    '{"nome":"X","equip":{"arma":{"slot":"arma"}},"bolsa":[123]}');
  conf(itemRuim.equip.arma === null && itemRuim.bolsa.length === 0,
    'item malformado é descartado na normalização');
  // status e visual: mede sem equipamento e depois com ele
  eq.equip.arma = null;
  eq.bolsa = [];
  const semEq = Personagem.status(eq);
  eq.equip.arma = voltaEq.equip.arma;
  const comEq = Personagem.status(eq);
  conf(comEq.dano === semEq.dano + 7 && comEq.hpMax === semEq.hpMax + 10 &&
       comEq.vel === semEq.vel + 5 && comEq.crit === semEq.crit + 3,
    'bônus do equipamento entra no status (dano/hp/vel/crítico)');
  conf(Personagem.lookDe(eq).weapon === 'espada',
    'arma equipada muda o visual do herói');
  eq.equip.arma = null;
  conf(Personagem.lookDe(eq).weapon === 'cajado',
    'sem arma equipada volta a arma da classe');
}

console.log('4) boot na tela de seleção + entrada na jogatina');
{
  // dispara o load
  (ouvintesJanela.load || []).forEach(fn => fn({}));
  frame(10);
  conf(Game.cena === 'selecao', 'abriu na tela de seleção (fora da jogatina)');
  conf(jogoCanvas._chamadas > 100, 'renderizou (' + jogoCanvas._chamadas + ' desenhos)');

  // botão "+": atributo Força sobe e pontos caem
  const p0 = Game.personagem;
  p0.pontos = 5;              // herói novo nasce sem pontos: dá saldo ao teste
  const for0 = p0.atributos.for, pts0 = p0.pontos;
  clique(722, 92); // centro do botão + (aba Atributos)
  frame(2);
  conf(p0.atributos.for === for0 + 1 && p0.pontos === pts0 - 1,
    'botão + funciona na criação (for ' + for0 + '->' + p0.atributos.for +
    ', pts ' + pts0 + '->' + p0.pontos + ')');

  // sem teto de 18: dá pra ir além
  p0.atributos.for = 50;
  const ptsCap = p0.pontos;
  clique(722, 92);
  frame(2);
  conf(p0.atributos.for === 51 && p0.pontos === ptsCap - 1,
    'sem teto: Força50 -> 51 (pontos ' + ptsCap + ' -> ' + p0.pontos + ')');

  // --- segurar o + repete (arranque de 0,25s e depois ~10/s)
  p0.pontos = 50;
  const ptsSeg = p0.pontos;
  pressionar(722, 92);          // pressiona sem soltar
  frame(45);                    // ~0,75s segurado
  soltar();
  const gastos = ptsSeg - p0.pontos;
  conf(gastos >= 3 && gastos <= 15,
    'segurar repete o + (gastou ' + gastos + ' em ~0,75s)');

  // --- toggle ×5: gasta 5 por clique e volta para ×1
  clique(708, 234);             // toggle (684,224,55,26)
  frame(2);
  p0.pontos = 10;
  const forT = p0.atributos.for;
  clique(722, 92);
  frame(2);
  conf(p0.atributos.for === forT + 5 && p0.pontos === 5,
    '×5 gasta 5 por clique (for ' + forT + '->' + p0.atributos.for +
    ', pts 10->' + p0.pontos + ')');
  clique(708, 234);             // volta para ×1
  frame(2);
  clique(722, 92);
  frame(2);
  conf(p0.atributos.for === forT + 6 && p0.pontos === 4,
    'toggle volta para ×1 (for +1, pts 5->4)');

  // digitar o nome (renomeia o herói em foco, antes de jogar)
  tecla('keydown', 'KeyB', 'b');
  tecla('keyup', 'KeyB', 'b');
  frame(1);
  conf(p0.nome === 'b', 'digitação renomeia o herói (' + p0.nome + ')');

  // JOGAR: Enter entra na arena e grava o personagem
  const forAntesDeJogar = p0.atributos.for;
  tecla('keydown', 'Enter', 'Enter');
  tecla('keyup', 'Enter', 'Enter');
  frame(2);
  conf(Game.cena === 'jogo', 'Enter entrou na jogatina (modo idle)');
  const salvos = Salvar.listar();
  conf(salvos.length === 1 && salvos[0].nome === 'b' &&
       salvos[0].atributos.for === forAntesDeJogar,
    'JOGAR salvou antes de entrar (nome=' + (salvos[0] && salvos[0].nome) +
    ', for=' + (salvos[0] && salvos[0].atributos.for) + ')');

  // --- combate 100% automático: sobe a primeira onda sozinho
  const Batalha = sandbox.Batalha;
  let info = Batalha.info();
  let espera = 0;
  while (info.onda < 2 && espera < 3000) {
    frame(1);
    espera++;
    info = Batalha.info();
  }
  conf(info.onda >= 2,
    'batalha automática limpou a onda 1 (onda=' + info.onda +
    ', xp=' + info.xp + ', hp=' + info.hp + ')');

  // --- progressão: 1 ponto POR NÍVEL (spec balance-dopamina R-BAL-2)
  // posiciona no nv 2 para o próximo nível (3) creditar o ponto — com
  // a cadência 1 todo nível credita (era 1 a cada 3 = decisão rara)
  const p1 = Game.personagem;
  p1.nivel = 2;
  p1.xpProx = Personagem.custoProximo(2);
  p1.xp = p1.xpProx - 1;
  const nivel0 = p1.nivel, pts1 = p1.pontos;
  let subiu = false;
  for (let i = 0; i < 3000 && !subiu; i++) {
    frame(1);
    if (p1.nivel > nivel0) subiu = true;
  }
  conf(p1.nivel === nivel0 + 1 && p1.pontos === pts1 + 1,
    'abate dá nível e +1 ponto (todo nível; nv ' + nivel0 + '->' + p1.nivel +
    ', pts ' + pts1 + '->' + p1.pontos + ')');

  // --- abas de gestão
  // look fixo por classe (spec visual-heroi-spritecook): as linhas de
  // Pele/Cabelo/Estilo/Roupa saíram da Apar — a coordenada antiga do
  // botão > não muda mais nada
  clique(312, 418);            // aba Aparência (centro da 2ª aba)
  frame(2);
  const look0 = JSON.stringify(p1.look);
  clique(706, 96);           // coordenada antiga do botão > da linha Pele
  frame(2);
  conf(JSON.stringify(p1.look) === look0,
    'Apar sem customização de look (clique antigo é neutro)');

  // --- prévia do herói (spec preview-heroi): existe, DENTRO do
  //     painel (contrato de geometria) e ANIMA com o tempo
  const pv0 = sandbox.Gestao.previa();
  conf(pv0.caixa.y > 214 && pv0.caixa.y + pv0.caixa.h <= 336 &&
    pv0.caixa.x >= 412,
    'caixa da prévia dentro do painel (' +
    pv0.caixa.x + ',' + pv0.caixa.y + ' ' + pv0.caixa.w + 'x' +
    pv0.caixa.h + ')');
  let animou = false;
  for (let i = 0; i < 60 && !animou; i++) {
    frame(1);
    const pv = sandbox.Gestao.previa();
    if (pv.anim !== pv0.anim || pv.quadro !== pv0.quadro) animou = true;
  }
  conf(animou, 'prévia anima (idle/ataque alternam em ~4s)');

  clique(384, 418);           // aba Classe (centro da 3ª aba)
  frame(2);
  clique(673, 102);          // Mago na grade 2×2 (590..756, 88..116)
  frame(2);
  conf(p1.classe === 'mago', 'troca de classe funciona');

  clique(240, 418);           // volta pra aba Atributos (1ª aba)
  frame(2);

  // --- janela flutuante: X fecha, a barra reabre (R-MF-3) — a janela
  //     fecha sem derrubar a simulação e a barra é o caminho de volta
  const gf = sandbox.Gestao.abasGeom();
  clique(gf.fechar.x + 11, gf.fechar.y + 10);   // centro do X
  frame(2);
  conf(!sandbox.Gestao.abasGeom().aberta,
    'X da barra de título fecha a janela da Gestão');
  clique(240, 418);                            // aba na barra inferior reabre
  frame(2);
  const gr = sandbox.Gestao.abasGeom();
  conf(gr.aberta && gr.aba === 'atributos',
    'clique na barra de abas reabre a janela');

  // --- pausar / continuar
  clique(644, 388);
  frame(2);
  conf(Batalha.info().pausada === true, 'botão Pausar pausa a batalha');
  clique(644, 388);
  frame(2);
  conf(Batalha.info().pausada === false, 'botão Continuar retoma a batalha');
}

console.log('5) exportação');
{
  const antes = clicados.length;
  Salvar.exportar(Game.personagem);
  conf(clicados.length === antes + 1, 'exportar baixou um arquivo');
}

console.log('6) morte, revivescimento e troca de tela');
{
  const p = Game.personagem;
  const Batalha = sandbox.Batalha;

  // --- herói fraco cai em combate
  // Duas armadilhas de timing já medidas aqui (flakiness pré-existente):
  //  (a) o herói é MAGO (escala em INT, não FOR) e com agudeza alta ele
  //      RECUA/KITE em vez de morrer → int=1 (fica e apanha);
  //  (b) a onda HERDADA podia ser fraca/limpa: ele farmava até zerar e
  //      "nunca morria" (diag: inim=0 no fim) → pressão garantida com
  //      restaurarOnda(30), como a seção 27.
  p.atributos.con = 1;
  p.atributos.for = 1;
  p.atributos.int = 1;
  p.nivel = 3;                  // HP mínimo (sem subir no meio do teste)
  Batalha.restaurarOnda(30);
  let caiu = false;
  let inimFrames = 0, pausFrames = 0, mortoFrames = 0;
  for (let i = 0; i < 6000 && !caiu; i++) {
    frame(1);
    // congelada: sem level-up/drop fortalecendo no meio (lição seção 27)
    p.equip = { arma: null, armadura: null };
    p.xp = 0;
    const inf6 = Batalha.info();
    if (inf6.morto) { caiu = true; mortoFrames++; }
    if (inf6.inimigos > 0) inimFrames++;
    if (inf6.pausada) pausFrames++;
  }
  if (!caiu) {
    const f6 = Batalha.info();
    console.log('    [diag6] nv=' + f6.nivel + ' hp=' + f6.hp + ' mapa=' +
      f6.mapa + ' onda=' + f6.onda + ' inim=' + f6.inimigos +
      ' inimFrames=' + inimFrames + '/6000 pausFrames=' + pausFrames +
      ' classe=' + Game.personagem.classe + ' con=' +
      Game.personagem.atributos.con + ' for=' + Game.personagem.atributos.for);
  }
  conf(caiu, 'herói pode cair em combate (vida baixa)');

  // --- e revive sozinho
  let reviveu = false;
  for (let i = 0; i < 500 && !reviveu; i++) {
    frame(1);
    if (!Batalha.info().morto) reviveu = true;
  }
  conf(reviveu, 'herói revive sozinho depois de 3s');

  // --- a jogatina não tem como trocar de herói por baixo: você sai dela
  clique(236, 388);           // botão Trocar herói
  frame(2);
  conf(Game.cena === 'selecao',
    'Trocar herói leva para a tela de seleção (fora da arena)');
  const ondaParada = Batalha.info().onda;
  for (let i = 0; i < 60; i++) frame(1);
  conf(Batalha.info().onda === ondaParada,
    'a batalha fica parada enquanto você está fora da jogatina');

  const forSel = Game.personagem.atributos.for;
  Game.personagem.pontos = 5;  // saldo pro clique (herói nasce sem pontos)
  clique(722, 92);            // + funciona na tela de seleção
  frame(2);
  conf(Game.personagem.atributos.for === forSel + 1 &&
       Game.personagem.pontos === 4,
    'dá para ajustar atributos na seleção (for ' + forSel + ' -> ' +
    Game.personagem.atributos.for + ', pontos 5 -> ' +
    Game.personagem.pontos + ')');

  clique(120, 388);            // botão JOGAR
  frame(2);
  conf(Game.cena === 'jogo' && Batalha.info().onda >= 1,
    'JOGAR entra na arena de novo (onda ' + Batalha.info().onda + ')');

  // --- números de dano continuam aparecendo
  jogoCanvas._textos = [];
  for (let i = 0; i < 600; i++) frame(1);
  conf((jogoCanvas._textos || []).some(t => /^\d+$/.test(t)),
    'números de dano aparecem na arena');
}

console.log('7) autosave, nome do arquivo e carisma');
{
  const p = Game.personagem;

  // --- autosave: muda um atributo e roda >3s SEM apertar Enter
  const for0 = p.atributos.for;
  p.atributos.for = for0 + 5;
  for (let i = 0; i < 260; i++) frame(1);
  const gravado = Salvar.listar().find(s => s.id === p.id);
  conf(!!gravado && gravado.atributos.for === for0 + 5,
    'autosave gravou sem Enter (for ' + for0 + ' -> ' +
    (gravado ? gravado.atributos.for : 'não achado') + ')');

  // --- exportar não mangleia acento ("José" -> "Jose.json", não "Jos.json")
  const antes = clicados.length;
  const nomeGuardado = p.nome;
  p.nome = 'José';
  Salvar.exportar(p);
  p.nome = nomeGuardado;
  conf(clicados.length === antes + 1 && clicados[clicados.length - 1] === 'Jose.json',
    'arquivo exportado sem acento (' + clicados[clicados.length - 1] + ')');

  // --- Carisma: dá OURO (log) e NÃO mexe mais em XP
  // (spec gestao-atributos: o xpMult linear chegava a 855× e quebrava
  // a curva calibrada — era a "progressão errada" relatada)
  const pCar = Personagem.novo();
  pCar.atributos.car = 18;
  conf(!('xpMult' in Personagem.status(pCar)),
    'xpMult eliminado (renda = a calibrada, sem multiplicador de build)');
  const mc18 = Personagem.multOuroCar(18);
  conf(Math.abs(mc18 - (1 + 0.22 * Math.log(11))) < 1e-9,
    'carisma multiplica o OURO logaritmico (car 18 -> x' + mc18.toFixed(2) + ')');
  conf(Math.abs(Personagem.multOuroCar(8) - 1) < 1e-9,
    'car 8 = x1,00 (base intacta)');
  conf(Math.abs(Personagem.multOuroCar(100) - 2) < 0.02,
    'car 100 ~ x2,00');
  conf(Personagem.multOuroCar(3174) < 3,
    'satura antes de 3x no fim da campanha (x' +
    Personagem.multOuroCar(3174).toFixed(2) + ' — log, não linear)');
}

console.log('8) seleção: novo herói, exclusão em duas etapas e paginação');
{
  clique(236, 388);                       // Trocar herói -> seleção
  frame(2);
  conf(Game.cena === 'selecao', 'a lista vive na tela de seleção');

  const qtd0 = Salvar.listar().length;
  clique(70, 288);                        // botão Novo (16,272,108,32)
  frame(2);
  conf(Salvar.listar().length === qtd0 + 1,
    'Novo criou um registro a mais (' + qtd0 + ' -> ' +
    Salvar.listar().length + ')');
  conf(Game.personagem.nome === 'Herói', 'o novo herói está em foco na seleção');

  // --- exclusão em duas etapas: foca o primeiro herói da lista
  clique(200, 112);                        // item 1 da lista (16,96,368,32)
  frame(2);
  const alvo = Game.personagem;
  clique(192, 288);                        // Apagar (1º clique)
  frame(2);
  conf(Salvar.listar().some(s => s.id === alvo.id),
    'primeiro clique só pede confirmação (não apagou)');
  clique(192, 288);                        // Sim? (2º clique)
  frame(2);
  conf(!Salvar.listar().some(s => s.id === alvo.id),
    'segundo clique apagou "' + alvo.nome + '"');

  // --- paginação: 9 personagens não cabem mais numa página só
  for (let i = 0; i < 8; i++) {
    const q = Personagem.novo();
    q.nome = 'Pag' + i;
    Salvar.salvar(q);
  }
  frame(2);
  jogoCanvas._textos = [];
  clique(380, 80);                        // seta > da navegação (368,68,24,24)
  frame(2);
  const txts = jogoCanvas._textos || [];
  conf(txts.some(t => t.indexOf('2/2') >= 0),
    'lista paginou para a página 2/2');
  conf(txts.some(t => t.indexOf('Pag') >= 0),
    'a página 2 mostra os personagens Pag*');
}

console.log('8b) save assinado (spec save-assinado)');
{
  const crypto = require('crypto');
  const K = 'rpg_personagens_v1';
  const KE = 'rpg_estado_v1';
  const KM = 'rpg_assinatura_v1';
  const A = sandbox.Assinatura;

  // --- (a) a implementação bate com o crypto de verdade do Node
  const casos = ['', 'abc', '{"nome":"José","ouro":123}', 'x'.repeat(200),
                 'unicode çãé 中 \u{1F600}'];
  let igual = casos.every(m =>
    A.sha256(m) === crypto.createHash('sha256').update(m, 'utf8').digest('hex'));
  igual = igual && casos.every(m =>
    A.hmac(m, A.CHAVE) ===
      crypto.createHmac('sha256', A.CHAVE).update(m, 'utf8').digest('hex'));
  conf(igual, 'SHA-256 e HMAC batem com o crypto do Node (' +
    (casos.length * 2) + ' casos)');

  // --- (b) save sai assinado e volta pela leitura
  const alvo = Personagem.novo();
  alvo.nome = 'Teste Assinado';
  Salvar.salvar(alvo);
  const bruto0 = JSON.parse(localStorageStub.getItem(K) || '[]');
  const meu = bruto0.find(e => e && e.id === alvo.id);
  conf(!!meu && typeof meu._s === 'string' && meu._s.length === 64,
    'save gravado com _s (assinatura de 64 hex)');
  conf(Salvar.listar().some(s => s.id === alvo.id),
    'round-trip: o save assinado volta pela leitura');
  const vAntes = Salvar.versao();
  Salvar.salvar(alvo);
  conf(Salvar.versao() === vAntes + 1,
    'versão do save sobe a cada escrita (cache da lista na seleção)');

  // --- (c) adulteração: o save é rejeitado e NADA é destruído
  const bruto = JSON.parse(localStorageStub.getItem(K));
  const mexido = bruto.find(e => e && e.id === alvo.id);
  const ouro0 = mexido.ouro || 0;
  mexido.ouro = ouro0 + 999999;
  localStorageStub.setItem(K, JSON.stringify(bruto));
  const lista1 = Salvar.listar();
  conf(!lista1.some(s => s.id === alvo.id) && Salvar.rejeitados() >= 1,
    'save adulterado é rejeitado (rejeitados=' + Salvar.rejeitados() + ')');
  conf(lista1.some(s => s.id === Game.personagem.id),
    'os saves dos outros heróis continuam de pé');
  const outro = Personagem.novo();
  outro.nome = 'Teste Vizinho';
  Salvar.salvar(outro);
  const depois = JSON.parse(localStorageStub.getItem(K));
  const preservado = depois.find(e => e && e.id === alvo.id);
  conf(!!preservado && preservado.ouro === ouro0 + 999999 &&
    typeof preservado._s === 'string',
    'o rejeitado é PRESERVADO no storage por outro salvar (sem perda)');

  // --- (d) migração: sem marcador -> aceita e re-assina NA HORA
  const semMarc = JSON.parse(localStorageStub.getItem(K));
  semMarc.forEach(e => { if (e && typeof e === 'object') delete e._s; });
  localStorageStub.setItem(K, JSON.stringify(semMarc));
  localStorageStub.removeItem(KM);
  const migrados = Salvar.listar();
  const brutoMig = JSON.parse(localStorageStub.getItem(K) || '[]');
  const tudoAssinado = brutoMig.length > 0 && brutoMig.every(e =>
    e && typeof e === 'object' && typeof e._s === 'string');
  conf(migrados.some(s => s.id === alvo.id) && tudoAssinado &&
    localStorageStub.getItem(KM) === '1',
    'migração: sem marcador aceita tudo e RE-ESCREVE assinado na hora');

  // --- (e) estado da batalha: adulterado vira null na leitura
  Salvar.salvarEstado(alvo.id, 4, Date.now(), false, 1);
  const est = JSON.parse(localStorageStub.getItem(KE) || '{}');
  est[alvo.id]._s = '0'.repeat(64);
  localStorageStub.setItem(KE, JSON.stringify(est));
  conf(Salvar.lerEstado(alvo.id) === null,
    'estado adulterado -> lerEstado devolve null');

  // --- limpeza: não levar heróis de teste pros testes seguintes
  Salvar.salvarEstado(alvo.id, 1, Date.now(), false, 1);  // re-assina
  Salvar.apagar(alvo.id);
  Salvar.apagar(outro.id);
  conf(!Salvar.listar().some(s => s.id === alvo.id || s.id === outro.id),
    'heróis de teste apagados (apagar continua valendo)');
  conf(Salvar.rejeitados() === 0,
    'após a limpeza nenhuma entrada fica rejeitada (' +
    Salvar.rejeitados() + ')');
}

console.log('9) progresso offline (ausência creditada ao reabrir)');
{
  const pOff = Game.personagem;
  const xp0 = pOff.xp, nv0 = pOff.nivel;
  // herói capaz p/ 10min offline sem morte: a penalidade (Leva 1) regride
  // a onda, e este teste mede PROGRESSO offline, não punição
  pOff.atributos.for = 50;
  pOff.atributos.con = 50;
  pOff.atributos.int = 8;
  // finga que o herói ficou 10 minutos fora na onda 4
  Salvar.salvarEstado(pOff.id, 4, Date.now() - 10 * 60 * 1000, false);
  jogoCanvas._textos = [];
  Game.setScene('jogo');                  // reabre o jogo (enter)
  frame(2);
  const inf = sandbox.Batalha.info();
  conf(inf.onda >= 4, 'retomou na onda gravada (onda=' + inf.onda + ')');
  conf(pOff.xp > xp0 || pOff.nivel > nv0,
    'creditou a ausência (xp ' + xp0 + '->' + pOff.xp +
    ', nv ' + nv0 + '->' + pOff.nivel + ')');
  conf((jogoCanvas._textos || []).some(t => t.indexOf('fora') >= 0),
    'avisa o tempo de ausência na tela');
}

console.log('10) falha de gravação é comunicada');
{
  const setOriginal = localStorageStub.setItem;
  localStorageStub.setItem = function () { throw new Error('QuotaExceededError'); };
  jogoCanvas._textos = [];
  tecla('keydown', 'Enter', 'Enter');
  tecla('keyup', 'Enter', 'Enter');
  frame(2);
  conf((jogoCanvas._textos || []).some(t => t.indexOf('Sem espaço') >= 0),
    'diz que não salvou em vez de fingir que salvou');
  localStorageStub.setItem = setOriginal;
}

console.log('11) barra de HP dos inimigos');
{
  // a barra dos inimigos tem 3px: o contorno de 1px não pode cobrir o miolo
  const UI = sandbox.UI;
  const ctxJogo = jogoCanvas.getContext();
  const chamadas = [];
  const espiao = new Proxy({}, {
    get(t, p) { return (...a) => { chamadas.push(p); }; },
    set() { return true; }
  });
  function medir(h) {
    chamadas.length = 0;
    UI.bar(0, 0, 16, h, 1, '#d84a4a');
    return chamadas.slice();
  }
  UI.setContext(espiao);
  const fina3 = medir(3);               // barra dos inimigos
  const fina2 = medir(2);               // barra ainda mais fina
  const alta = medir(6);                // barra do herói
  UI.setContext(ctxJogo);
  conf(!fina3.includes('strokeRect') && !fina2.includes('strokeRect'),
    'barra fina não recebe contorno (o preenchimento fica visível)');
  conf(alta.includes('strokeRect'), 'barra alta mantém o contorno');
}

console.log('12) chefe do fim de mapa e avanço de mapa');
{
  const Batalha = sandbox.Batalha;
  const p = Game.personagem;
  // herói forte para o teste não depender de tempo de luta
  p.atributos.for = 999;
  p.atributos.con = 999;
  conf(Batalha.info().mapa === 1, 'jogo no mapa 1');
  // spec mundos: mundo()/noMundo() intactos + tema POR MAPA
  // (spec mapa-infinito R-INF-9 — era por mundo; emenda na spec mundos)
  conf(sandbox.Mapas.mundo(1) === 1 && sandbox.Mapas.mundo(10) === 1 &&
       sandbox.Mapas.mundo(11) === 2 && sandbox.Mapas.mundo(101) === 11,
    'mundo() = ceil(mapa/10) (campanha 10×10)');
  conf(sandbox.Mapas.noMundo(7) === 7 && sandbox.Mapas.noMundo(13) === 3,
    'noMundo() = posição do mapa dentro do mundo (1-10)');
  conf(sandbox.Mapas.info(1) !== sandbox.Mapas.info(2),
    'mapas vizinhos têm temas distintos (ciclo por mapa)');
  conf(sandbox.Mapas.info(11) === sandbox.Mapas.info(1) &&
       sandbox.Mapas.info(101) === sandbox.Mapas.info(1),
    'ciclo de 10: mapa 11/101 repetem o tema do mapa 1');
  conf(sandbox.Mapas.forca(99) > sandbox.Mapas.forca(1),
    'forca segue escalando no modo infinito');

  // estado explícito: sem herói vivo/rodando o tOnda não corre e a
  // onda 100 nunca nasce (seções anteriores deixam estado variável)
  if (Batalha.info().pausada) Batalha.alternarPausa();
  let espV12 = 0;
  while (Batalha.info().morto && espV12 < 900) { frame(1); espV12++; }
  Batalha.restaurarOnda(100);            // onda 99 + tOnda=0 -> nasce a 100
  let espera = 0;
  while (Batalha.info().onda < 100 && espera < 600) {
    frame(1);
    espera++;
  }
  conf(Batalha.info().onda === 100, 'chegou na onda 100 (onda=' +
    Batalha.info().onda + ')');
  conf(Batalha.info().boss === true,
    'a onda 100 tem o chefe em campo (inimigos=' +
    Batalha.info().inimigos + ')');

  // derrubar o chefe muda de mapa (a onda não sobe para 101)
  jogoCanvas._textos = [];
  let passou = false;
  for (let i = 0; i < 6000 && !passou; i++) {
    frame(1);
    if (Batalha.info().mapa >= 2) passou = true;
  }
  conf(passou, 'vencer o chefe avançou para o mapa 2');
  conf(Batalha.info().onda <= 1,
    'o mapa 2 recomeça na onda 1 (onda=' + Batalha.info().onda + ')');
  conf(Batalha.info().boss === false, 'o chefe não ficou preso depois de morto');
  conf((jogoCanvas._textos || []).some(t => t.indexOf('MAPA 2') >= 0),
    'avisa o novo mapa na tela');

  // o mapa 2 tem chefe próprio na onda 100
  Batalha.restaurarMapa(2);
  Batalha.restaurarOnda(100);
  espera = 0;
  while (Batalha.info().onda < 100 && espera < 600) {
    frame(1);
    espera++;
  }
  conf(Batalha.info().onda === 100 && Batalha.info().boss === true,
    'mapa 2 tem chefe na onda 100 (onda=' + Batalha.info().onda +
    ', boss=' + Batalha.info().boss + ')');
}

console.log('13) save de estado não contamina outro personagem');
{
  const Batalha = sandbox.Batalha;
  const pA = Game.personagem;
  const ondaA = Batalha.info().onda;
  conf(Batalha.dono() === pA.id,
    'a batalha em memória pertence a A (dono=' + Batalha.dono() + ')');
  conf(ondaA > 0, 'batalha em andamento antes do teste (onda ' + ondaA + ')');

  // sai para a seleção e foca outro herói
  clique(236, 388);              // Trocar herói
  frame(2);
  conf(Game.cena === 'selecao', 'saiu para a seleção');
  clique(70, 288);               // Novo -> cria e foca o herói B
  frame(2);
  const pB = Game.personagem;
  conf(pB.id !== pA.id, 'focou um personagem diferente (B)');

  // fechar a aba na seleção: o estado gravado deve continuar sendo o de A
  (ouvintesJanela.beforeunload || []).forEach(fn => fn({}));
  const estA = Salvar.lerEstado(pA.id);
  conf(!!estA && estA.onda === ondaA,
    'beforeunload gravou a onda do dono (A=' +
    (estA ? estA.onda : 'sem estado') + ', esperado ' + ondaA + ')');
  conf(Salvar.lerEstado(pB.id) === null,
    'beforeunload não gravou estado para B');

  // aba oculta na seleção: segue sem gravar estado de B
  sandbox.document.hidden = true;
  (ouvintesDocumento.visibilitychange || []).forEach(fn => fn({}));
  sandbox.document.hidden = false;
  conf(Salvar.lerEstado(pB.id) === null,
    'ocultar a aba não gravou estado para B');

  // voltar da aba na seleção com estado antigo de B: não pode creditar XP
  Salvar.salvarEstado(pB.id, 5, Date.now() - 60 * 1000, false);
  const xpB = pB.xp, nvB = pB.nivel;
  (ouvintesDocumento.visibilitychange || []).forEach(fn => fn({}));
  conf(pB.xp === xpB && pB.nivel === nvB,
    'volta da aba na seleção não creditou XP em B (xp ' +
    xpB + '->' + pB.xp + ')');
}

console.log('14) ausência creditada na jogatina + limites do estado');
{
  const Batalha = sandbox.Batalha;

  // JOGAR com o foco em B: entra na arena e restaura o estado dele
  clique(120, 388);
  frame(2);
  conf(Game.cena === 'jogo', 'entrou na jogatina com B');

  // regressão positiva: na jogatina, a volta da aba creditada continua
  const p = Game.personagem;
  const xp0 = p.xp, nv0 = p.nivel;
  Salvar.salvarEstado(p.id, Batalha.info().onda, Date.now() - 60 * 1000, false);
  sandbox.document.hidden = false;
  (ouvintesDocumento.visibilitychange || []).forEach(fn => fn({}));
  conf(p.xp > xp0 || p.nivel > nv0,
    'volta da aba na jogatina creditou a ausência (xp ' +
    xp0 + '->' + p.xp + ', nv ' + nv0 + '->' + p.nivel + ')');

  // save legado de antes dos mapas: progresso acima da onda 100 não se
  // perde — vira mapa/onda equivalentes na leitura (read-side)
  Salvar.salvarEstado(p.id, 250, Date.now(), false);
  const est250 = Salvar.lerEstado(p.id);
  conf(!!est250 && est250.mapa === 3 && est250.onda === 50,
    'onda 250 legada vira mapa 3, onda 50 (mapa ' +
    (est250 ? est250.mapa : '?') + ', onda ' +
    (est250 ? est250.onda : '?') + ')');

  // save corrompido: onda absurda é rejeitada na leitura
  Salvar.salvarEstado(p.id, 1e15, Date.now(), false);
  conf(Salvar.lerEstado(p.id) === null,
    'lerEstado rejeita onda absurda (1e15, save corrompido)');
}

console.log('15) drops, equipamento e aba de itens');
{
  const Batalha = sandbox.Batalha;
  const Itens = sandbox.Itens;
  const p = Game.personagem;
  p.equip = { arma: null, armadura: null };
  p.bolsa = [];

  // --- drop de verdade: com Math.random zerado todo abate dropa
  const rnd0 = Math.random;
  Math.random = function () { return 0; };
  let dropou = false;
  for (let i = 0; i < 6000 && !dropou; i++) {
    frame(1);
    if (p.equip.arma || p.equip.armadura || p.bolsa.length) dropou = true;
  }
  Math.random = rnd0;
  conf(dropou, 'abate dropou e auto-coletou equipamento');

  // congela a batalha: os próximos passos precisam de RNG e estado fixos
  const estavaPausada = Batalha.info().pausada;
  if (!estavaPausada) Batalha.alternarPausa();

  let s = Itens.sorteiaDrop(1, false);
  let tent = 0;
  while (!s.length && tent++ < 500) s = Itens.sorteiaDrop(1, false);
  conf(s.length === 1 && !!s[0].nome && !!s[0].bonus &&
       (s[0].slot === 'arma' || s[0].slot === 'armadura') &&
       s[0].rar >= 1 && s[0].rar <= 4,
    'sorteio devolve 1 item válido');
  const sd = Itens.sorteiaDrop(1, true);
  conf(sd.length === 2 && sd.every(i => i.rar >= 2),
    'chefe dropa 2 itens de raridade >= 2');

  // --- sistema de afixos: raridade define a quantidade (R-AFI-1)
  conf(Itens.geraItem(1, 1, 'guerreiro').afixos.length === 0,
    'item comum não rola afixo');
  conf(Itens.geraItem(2, 1, 'guerreiro').afixos.length === 1,
    'item incomum rola 1 afixo');
  conf(Itens.geraItem(3, 1, 'guerreiro').afixos.length === 2,
    'item raro rola 2 afixos');

  // --- teto de 1 negativo, magnitude 1,5× e frequência visível (R-AFI-2)
  let excedeu = false, faixasOk = true, comNeg = 0;
  for (let i = 0; i < 300; i++) {
    const it = Itens.geraItem(3, 1, 'mago');
    const negs = it.afixos.filter(a => a.neg);
    if (negs.length > 1) excedeu = true;
    if (negs.length) {
      comNeg++;
      negs.forEach(a => { if (a.valor < 3 || a.valor > 9) faixasOk = false; });
    }
    it.afixos.filter(a => !a.neg).forEach(a => {
      if (a.valor < 2 || a.valor > 6) faixasOk = false;
    });
  }
  conf(!excedeu, 'nunca mais de 1 afixo negativo por item');
  conf(comNeg > 50, 'afixos negativos aparecem com frequência (teto 1/item)');
  conf(faixasOk, 'faixas: positivo 2..6 e negativo 3..9 (1,5×) no mapa 1');

  // --- smart-loot: afixos positivos do mago puxam dano/crit (R-AFI-3)
  let pos = 0, afin = 0;
  for (let i = 0; i < 200; i++) {
    Itens.geraItem(3, 1, 'mago').afixos.filter(a => !a.neg)
      .forEach(a => {
        pos++;
        if (a.chave === 'dano' || a.chave === 'crit') afin++;
      });
  }
  conf(pos > 150 && afin / pos > 0.5,
    'smart-loot: mago recebe afixos de dano/crit acima do acaso (esperado 0,85, achou ' +
    (afin / pos).toFixed(2) + ')');

  // --- nome = prefixo? + base + sufixo?; negativo fora do nome (R-AFI-1)
  let nomeOk = true, negFora = true;
  const bases = Itens.ARMAS.concat(Itens.ARMADURAS);
  for (let i = 0; i < 100 && nomeOk && negFora; i++) {
    const it = Itens.geraItem(3, 1, 'guerreiro');
    if (!bases.some(m => it.nome.indexOf(m.nome) >= 0)) nomeOk = false;
    it.afixos.forEach(a => {
      if (a.neg) { if (it.nome.indexOf(a.nome) >= 0) negFora = false; }
      else if (a.tipo === 'pre') {
        if (it.nome.indexOf(a.nome + ' ') !== 0) nomeOk = false;
      } else if (it.nome.slice(-(a.nome.length + 1)) !== ' ' + a.nome) {
        nomeOk = false;
      }
    });
  }
  conf(nomeOk, 'nome do item monta prefixo + base + sufixo');
  conf(negFora, 'afixo negativo fica fora do nome (só nos status)');

  // --- deltas por chave p/ a UI de comparação (R-AFI-4)
  const amostra = { nome: 'A', bonus: { dano: 5, hp: -3 } };
  const eqAmostra = { nome: 'B', bonus: { dano: 2, hp: 8 } };
  conf(Itens.deltas(amostra, eqAmostra) === ' +3D -11HP',
    'delta por chave: item - equipado, com sinal');
  conf(Itens.deltas(amostra, null) === ' +5D -3HP',
    'sem item equipado o delta é o próprio item assinado');
  const linhaCurta = Itens.linha(
    { nome: 'NomeComMuitosCaracteres', bonus: { dano: 1 } }, null, 10);
  conf(linhaCurta.length <= 10, 'linha da lista é cortada no limite do botão');

  // --- migração: negativo/afixos preservados; legado ganha afixos []
  const migrado = Personagem.importarJSON(JSON.stringify({
    nome: 'N', equip: { arma: { nome: 'Espada Torta Misteriosa Doce',
      slot: 'arma', rar: 3, bonus: { dano: 10, hp: -40 },
      afixos: [{ nome: 'Frágil', chave: 'hp', neg: true, valor: 40 }] } }
  }));
  conf(migrado.equip.arma && migrado.equip.arma.bonus.hp === -40 &&
       migrado.equip.arma.afixos.length === 1 &&
       migrado.equip.arma.afixos[0].neg,
    'save com afixo negativo migra preservando sinal e o afixo');
  const legado = Personagem.importarJSON(
    '{"nome":"L","equip":{"arma":{"nome":"V","slot":"arma","bonus":{"dano":3}}}}');
  conf(legado.equip.arma && Array.isArray(legado.equip.arma.afixos) &&
       legado.equip.arma.afixos.length === 0,
    'item legado sem afixos ganha lista vazia');
  legado.equip.arma = { nome: 'X', slot: 'arma', rar: 1, afixos: [],
    bonus: { dano: -99999, hp: -99999, vel: -99999, crit: -99999 } };
  const stLim = Personagem.status(legado);
  conf(stLim.hpMax >= 10 && stLim.dano >= 1 && stLim.vel >= 10 &&
       stLim.crit >= 0,
    'status é limitado mesmo com bônus negativos extremos');

  // --- auto-equip compara por pontuação; o antigo volta pra bolsa
  p.equip = { arma: null, armadura: null };
  p.bolsa = [];
  const fraca = { nome: 'Fraca', slot: 'arma', rar: 1, bonus: { dano: 1 } };
  const pior = { nome: 'Pior', slot: 'arma', rar: 1, bonus: { dano: 1 } };
  const forte = { nome: 'Forte', slot: 'arma', rar: 3, bonus: { dano: 9 } };
  conf(Itens.equiparSeMelhor(p, fraca) && p.equip.arma === fraca,
    'arma vazia aceita o primeiro drop');
  conf(!Itens.equiparSeMelhor(p, pior) && p.equip.arma === fraca,
    'item pior não substitui o equipado');
  conf(Itens.equiparSeMelhor(p, forte) && p.equip.arma === forte &&
       p.bolsa.indexOf(fraca) >= 0,
    'item melhor equipa e o antigo volta pra bolsa');
  const hpAntes = Personagem.status(p).hpMax;
  p.equip.armadura = { nome: 'Colete', slot: 'armadura', rar: 2,
                       bonus: { hp: 20 } };
  conf(Personagem.status(p).hpMax === hpAntes + 20,
    'bônus da armadura entra no status');

  // --- aba Itens: abre, mostra a bolsa e equipa no clique da linha
  const manto = { nome: 'Manto Teste', slot: 'armadura', rar: 3,
                  bonus: { hp: 50 } };
  Itens.guardar(p, manto);
  jogoCanvas._textos = [];
  clique(456, 418);                 // aba Itens (4ª coluna)
  frame(2);
  conf((jogoCanvas._textos || []).some(t => t.indexOf('Bolsa') >= 0),
    'aba Itens abre com a bolsa');

  // --- ícones de item (spec icones-itens): o sprite existe e a cache
  //     separa tipo + raridade (sem isso, rar 4 mostra ícone de rar 1)
  const icEspada = sandbox.Anim.icone('espada', sandbox.Itens.corRar(1));
  conf(icEspada.canvas._pixels > 40,
    'ícone de espada desenhado (' + icEspada.canvas._pixels + ' px)');
  conf(sandbox.Anim.icone('espada', '#111111') !==
    sandbox.Anim.icone('espada', '#222222'),
    'cache do ícone separa a cor da raridade');

  clique(584, 216);                // linha da bolsa (2ª: y=206..232)
  frame(2);
  conf(p.equip.armadura === manto && p.bolsa.indexOf(manto) < 0,
    'clicar na linha da bolsa equipa o item');

  // --- delta por chave na linha da bolsa (manto hp 50 equipado)
  const cara = { nome: 'Armadura Cara', slot: 'armadura', rar: 2,
                 bonus: { hp: 35 } };
  Itens.guardar(p, cara);
  jogoCanvas._textos = [];
  frame(2);
  conf((jogoCanvas._textos || []).some(t => t.indexOf('-15HP') >= 0),
    'linha da bolsa mostra o delta negativo contra o equipado');
  clique(584, 246);                // linha 3 da bolsa (y=236..262: fraca,
                                   // Colete que voltou do slot, cara)
  frame(2);
  conf(p.equip.armadura === cara && p.bolsa.indexOf(manto) >= 0,
    'clique na linha equipa mesmo com delta negativo (contrato preservado)');
  clique(240, 418);                 // volta pra Atributos (estado neutro)
  frame(2);

  if (!estavaPausada) Batalha.alternarPausa();
}

console.log('16) skills automáticas (procs por classe)');
{
  const Skills = sandbox.Skills;
  const Efeitos = sandbox.Efeitos;
  const Batalha = sandbox.Batalha;
  const p = Game.personagem;
  if (Batalha.info().pausada) Batalha.alternarPausa();
  p.atributos.for = 50;        // herói com dano decente p/ os gatilhos
  p.atributos.int = 50;
  p.pontos = 0;

  // --- dados: desbloqueio por nível (5/15/25/35/45) e cobertura
  conf(Skills.ativas('mago', 4).length === 0 &&
       Skills.ativas('mago', 5).length === 1 &&
       Skills.ativas('mago', 15).length === 2 &&
       Skills.ativas('mago', 25).length === 3 &&
       Skills.ativas('mago', 45).length === 5 &&
       Skills.ativas('mago', 60).length === 6 &&
       Skills.ativas('mago', 150).length === 7 &&
       Skills.ativas('mago', 400).length === 8,
    'skills desbloqueiam nos níveis 5, 15, 25, 35, 45, 60, 150 e 400');
  conf(!!Skills.desbloqueada('mago', 5) &&
       Skills.desbloqueada('mago', 6) === null &&
       Skills.desbloqueada('ladino', 5).tipo === 'veneno',
    'desbloqueada devolve a skill exata do nível');
  conf(['guerreiro', 'mago', 'ladino', 'clerigo']
       .every(c => Skills.daClasse(c).length === 8),
    'toda classe tem 8 skills');
  conf(['guerreiro', 'mago', 'ladino']
       .every(c => Skills.daClasse(c).some(s => s.tipo === 'mobilidade')) &&
       Skills.daClasse('clerigo').some(s => s.tipo === 'medo'),
    'cada classe tem a skill de fuga (mobilidade) ou medo (clérigo)');
  conf(Skills.proxima('mago', 4).nivel === 5 &&
       Skills.proxima('mago', 45).nivel === 60 &&
       Skills.proxima('mago', 400) === null,
    'proxima aponta a próxima skill (nv 45 → nv 60; null com todas)');

  // --- aviso ao subir de nível (mago: força o nível 4 e espera o kill)
  p.classe = 'mago';
  p.nivel = 4;
  p.xp = p.xpProx - 1;
  Batalha.restaurarOnda(3);      // onda fraca: 1 kill garante o aviso
  jogoCanvas._textos = [];
  Batalha.limparEfeitos();        // some com textos/efeitos pendentes
  let desbloqueou = false;
  for (let i = 0; i < 6000 && !desbloqueou; i++) {
    frame(1);
    desbloqueou = (jogoCanvas._textos || [])
      .some(t => t.indexOf('desbloqueada') >= 0);
  }
  conf(desbloqueou, 'subir de nível anuncia a skill desbloqueada');

  // --- nuke periódico do mago dispara sozinho (Bola de Fogo).
  // Fixture determinística: o nuke SÓ conjura com alvo em campo — e o
  // timer dele só corre quando o herói está vivo. Duas armadilhas de
  // timing medidas (flakiness pré-existente no HEAD):
  //  (a) a fixture zerava o FOR, mas MAGO escala em INT (ficou 50) → a
  //      onda morria em ~6s e o timer expirava nos 8s de respiro SEM
  //      alvo (o tiro é desperdiçado: st.t = intervalo roda ANTES do
  //      check !alvo) → dois expiries seguidos no respiro = nenhum tiro;
  //  (b) com HP baixo o herói podia cair no meio da janela (a morte
  //      congela o timer em atualizaHeroi).
  // Correções: int mínimo (a onda 3 vive a janela toda — é o MAGO que
  // precisa ser fraco) e con alto (regen > dano de entrada: não cai),
  // exatamente o que o comentário original já prometia.
  p.atributos.for = 1;
  p.atributos.int = 1;
  p.atributos.con = 200;
  Batalha.restaurarOnda(3);
  jogoCanvas._textos = [];
  Batalha.limparEfeitos();
  let lancou = false;
  const linha = [];
  for (let i = 0; i < 900 && !lancou; i++) {
    frame(1);
    lancou = (jogoCanvas._textos || []).some(t => t === 'Bola de Fogo');
    if (i % 30 === 0) {
      const f = Batalha.info();
      linha.push((i / 60).toFixed(1) + 's:on' + f.onda + '/' + f.inimigos +
        (f.morto ? '/MORTO' : '') + '/hp' + f.hp);
    }
  }
  if (!lancou) {
    console.log('    [linha] ' + linha.join(' '));
    const inf = Batalha.info();
    console.log('    [diag] mapa=' + inf.mapa + ' onda=' + inf.onda +
      ' morto=' + inf.morto + ' hp=' + inf.hp + ' inimigos=' + inf.inimigos +
      ' nv=' + p.nivel + ' classe=' + p.classe + ' loadout=' +
      JSON.stringify(p.loadout) + ' skills=' +
      JSON.stringify((sandbox.Skills.carregadas(p) || []).map(x => x.id)));
  }
  conf(lancou, 'mago dispara a skill automática (Bola de Fogo)');
  conf(Efeitos.qtd() > 0,
    'a skill nasce com efeito visual (missil/explosão)');

  // --- área do guerreiro: varredura a cada 5 golpes
  p.classe = 'guerreiro';
  jogoCanvas._textos = [];
  Batalha.limparEfeitos();
  let varreu = false;
  for (let i = 0; i < 2500 && !varreu; i++) {
    frame(1);
    varreu = (jogoCanvas._textos || []).some(t => t === 'Golpe Embravecido');
  }
  conf(varreu, 'guerreiro faz a varredura contando golpes');
  conf(Efeitos.qtd() > 0,
    'a varredura nasce com o corte luminoso + estilhaços');

  // --- veneno do ladino por acerto
  p.classe = 'ladino';
  // INT 8 (agu 0,25): sem kite/recuar da INT herdada — o herói fica e
  // atira (com INT50 ele alternava fuga/repique e os golpes sumiam);
  // onda 3 calma: 1º golpe sempre não-lethal (~58 de HP contra 19 de
  // dano) → dezenas de rolagens de 30% em 100s — P(falha) ≈ 0
  p.atributos.int = 8;
  Batalha.restaurarOnda(3);
  let espL = 0;
  while (Batalha.info().morto && espL < 900) { frame(1); espL++; }
  jogoCanvas._textos = [];
  Batalha.limparEfeitos();
  let envenenou = false;
  for (let i = 0; i < 6000 && !envenenou; i++) {
    frame(1);
    envenenou = (jogoCanvas._textos || []).some(t => t === 'Veneno');
  }
  const dv = Batalha.info();
  conf(envenenou, 'ladino aplica veneno nos acertos' +
    (envenenou ? '' : ' [onda=' + dv.onda + ' inim=' + dv.inimigos +
      ' morto=' + dv.morto + ' nv=' + p.nivel + ' dano=' + dv.dano + ']'));
  conf(Efeitos.qtd() > 0,
    'a aplicação do veneno respinga efeitos visuais');

  // --- bênção do clérigo: só anuncia quando cura de verdade
  p.classe = 'clerigo';
  p.atributos.con = 1;
  p.atributos.for = 1;
  // pressão de onda 40: um golpe ≥15 garante a janela "ferido" mesmo
  // com regenerador (Leva 1); a bênção annuncia na primeira oportunidade
  Batalha.restaurarOnda(40);
  let ferido = false;
  for (let i = 0; i < 3000 && !ferido; i++) {
    frame(1);
    if (!Batalha.info().morto) {
      ferido = Batalha.info().hp < Personagem.status(p).hpMax - 15;
    }
  }
  conf(ferido, 'herói fraco fica ferido em combate');
  jogoCanvas._textos = [];
  Batalha.limparEfeitos();
  let curou = false;
  for (let i = 0; i < 3000 && !curou; i++) {
    frame(1);
    curou = (jogoCanvas._textos || []).some(t => t === 'Bênção');
  }
  conf(curou, 'clérigo cura periodicamente (Bênção)');
  conf(Efeitos.qtd() > 0,
    'a bênção solta os motes de cura (efeito visual)');
  Batalha.restaurarOnda(3);      // calmaria p/ os próximos passos

  // --- ataque à distância: mago de nível 4 (SEM skills) — o projétil do
  // golpe básico é o único jeito de nascer efeito aqui
  p.classe = 'mago';
  p.nivel = 4;
  Batalha.limparEfeitos();
  let projeteis = false;
  for (let i = 0; i < 3000 && !projeteis; i++) {
    frame(1);
    projeteis = Efeitos.qtd() > 0;
  }
  conf(projeteis, 'mago (nv 4, sem skills) ataca à distância com projétil');

  // --- mobilidade/medo (skills nv 25): gatilho quando o bando se fecha.
  // O efeito exposto em info() é o que prova o disparo (nada de estado
  // velho de testes anteriores).
  const checa = {
    empurrao: inf => inf.empurra > 0,
    esquiva: inf => inf.fuga,
    amedronta: inf => inf.medo > 0
  };
  const gatilho = [
    ['guerreiro', 'empurrao', 'guerreiro empurra o bando'],
    ['ladino', 'esquiva', 'ladino esquiva para longe'],
    ['clerigo', 'amedronta', 'clérigo amedronta os inimigos']
  ];
  for (const [classe, id, msg] of gatilho) {
    p.classe = classe;
    p.nivel = 25;
    p.atributos.for = 1;      // fraco: os inimigos vivem p/ chegar perto
    let disparou = false;
    for (let i = 0; i < 9000 && !disparou; i++) {
      frame(1);
      disparou = checa[id](Batalha.info());
    }
    conf(disparou, msg + ' quando os inimigos se fecham (nv 25)');
  }

  // volta ao estado em que a seção 17 espera encontrar o herói
  p.classe = 'clerigo';
  p.nivel = 6;
  p.atributos.for = 1;
  p.atributos.con = 1;
}

console.log('17) câmera sempre centralizada, região ativa e renascimento');
{
  const Batalha = sandbox.Batalha;
  const p = Game.personagem;
  let inf = Batalha.info();

  // spec mundo-fullscreen R-MF-1: janela da câmera = a tela inteira
  // (herói no CENTRO — decisão do mantenedor) e região ativa dinâmica
  // 5×5 chunks (era 3×3 na janela 192×134)
  conf(inf.janela.w === 768 && inf.janela.h === 432 &&
       inf.mundo.w === 1920 && inf.mundo.h === 1340,
    'região ativa 5×5 chunks (1920×1340) com a janela 768×432 intacta');

  // --- câmera: pausa congela o mundo (mas não a câmera) e ela assenta
  // SEMPRE centralizada no herói — sem clamp, sem bordas (spec
  // mapa-infinito R-INF-1: era "presa nos limites do mundo")
  Batalha.alternarPausa();
  for (let i = 0; i < 200; i++) frame(1);
  inf = Batalha.info();
  const dx0 = inf.cam.x - (inf.heroi.x - inf.janela.w / 2);
  const dy0 = inf.cam.y - (inf.heroi.y - inf.janela.h / 2);
  conf(Math.abs(dx0) <= 2 && Math.abs(dy0) <= 2,
    'câmera centralizada no herói após assentar (dx=' +
    dx0.toFixed(1) + ' dy=' + dy0.toFixed(1) + ')');
  let centralOk = true;
  for (let i = 0; i < 200; i++) {
    frame(1);
    const c = Batalha.info();
    const dx = c.cam.x - (c.heroi.x - c.janela.w / 2);
    const dy = c.cam.y - (c.heroi.y - c.janela.h / 2);
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) centralOk = false;
  }
  conf(centralOk, 'câmera sempre centralizada no herói (nunca sai do centro)');
  Batalha.alternarPausa();

  // --- renascimento aleatório: 3 ciclos; cai no ANEL 40..120px do
  // ponto de queda (spec mapa-infinito R-INF-2 — era: dentro dos
  // limites do mundo 384×268). Fixture determinística: nv 4 (SEM
  // skills → sem bênção que out-heala) e INT 8 (agu baixo → sem
  // kite/recuar, o herói fica e apanha — mesma lição da seção 21)
  p.atributos.con = 1;
  p.atributos.for = 1;
  p.atributos.int = 8;
  p.nivel = 4;
  Batalha.restaurarOnda(30);     // pressão: sem onda forte o con1 não
                                 // morre (combo/rega da Leva 1)
  const locais = [];
  let completo = true;
  for (let ciclo = 0; ciclo < 3 && completo; ciclo++) {
    let morreu = false;
    for (let i = 0; i < 9000 && !morreu; i++) {
      frame(1);
      morreu = Batalha.info().morto;
    }
    if (!morreu) { completo = false; break; }
    const queda = { x: Batalha.info().heroi.x, y: Batalha.info().heroi.y };
    let reviveu = false;
    for (let i = 0; i < 600 && !reviveu; i++) {
      frame(1);
      reviveu = !Batalha.info().morto;
    }
    if (!reviveu) { completo = false; break; }
    const h = Batalha.info().heroi;
    const d = Math.sqrt((h.x - queda.x) * (h.x - queda.x) +
                        (h.y - queda.y) * (h.y - queda.y));
    if (d < 39 || d > 121) { completo = false; break; }
    locais.push(Math.round(h.x) + ',' + Math.round(h.y));
  }
  conf(completo,
    'renascimento no anel 40..120px da queda (3 ciclos' +
    (completo ? '' : '; locais ' + locais.join(' | ')) + ')');
  conf(new Set(locais).size >= 2,
    'renascimento em locais distintos (' + locais.join(' | ') + ')');
  p.nivel = 25;               // devolve o nv da seção 16 (a fixture desceu
                               // só p/ garantir as 3 mortes — sem vazamento)

  // --- a câmera viajou junto do renascimento (assenta na pausa)
  Batalha.alternarPausa();
  for (let i = 0; i < 200; i++) frame(1);
  const f = Batalha.info();
  const fdx = f.cam.x - (f.heroi.x - f.janela.w / 2);
  const fdy = f.cam.y - (f.heroi.y - f.janela.h / 2);
  conf(Math.abs(fdx) <= 2 && Math.abs(fdy) <= 2,
    'câmera acompanha o renascimento (dx=' + fdx.toFixed(1) +
    ' dy=' + fdy.toFixed(1) + ')');
  Batalha.alternarPausa();
}


console.log('18) toque, resolução e escala responsiva');
{
  const Input = sandbox.Input;
  const p = Game.personagem;

  // --- resolução nova + escala fracionária que preenche a janela
  // backing = exibição (spec ajustes-playtest-3: esc fracionário —
  // o texto nasce no tamanho final, sem esticar pelo CSS)
  conf(jogoCanvas.width === parseInt(jogoCanvas.style.width, 10) &&
       jogoCanvas.height === parseInt(jogoCanvas.style.height, 10),
    'backing store = exibição CSS 1:1 (' + jogoCanvas.width + '×' +
    jogoCanvas.height + ') — texto nítido, sem reamostragem');
  conf(jogoCanvas.style.width === '1280px' &&
       jogoCanvas.style.height === '720px',
    'CSS preenche a janela do harness (escala fracionária 1.67×, ' +
    jogoCanvas.style.width + '×' + jogoCanvas.style.height + ')');

  // --- touch: touchstart/touchmove no canvas, touchend na window
  let prevenido = 0;
  const T = (id, x, y) => ({ identifier: id, clientX: x * 2, clientY: y * 2 });
  function dispara(tipo, lista) {
    const ev = { touches: lista, preventDefault() { prevenido++; } };
    const fonte = (tipo === 'touchend' || tipo === 'touchcancel')
      ? ouvintesJanela : jogoCanvas._listeners;
    (fonte[tipo] || []).forEach(fn => fn(ev));
  }

  // tem que haver ouvintes de toque registrados
  conf((jogoCanvas._listeners.touchstart || []).length > 0 &&
       (jogoCanvas._listeners.touchmove || []).length > 0 &&
       (ouvintesJanela.touchend || []).length > 0,
    'ouvintes de touchstart/touchmove/touchend registrados');

  // toque no "+" (centro 728,96) aplica o ponto na hora
  p.pontos = 5;
  const for0 = p.atributos.for;
  dispara('touchstart', [T(1, 728, 96)]);
  conf(Input.mouse.down && Input.mouse.clicked,
    'touchstart vira mouse down+clicked');
  conf(prevenido > 0,
    'preventDefault chamado (mata rolagem, zoom e mouse sintético)');
  conf(Input.mouse.x === 728 && Input.mouse.y === 96,
    'toque mapeia para a coordenada de jogo (728,96)');
  frame(1);
  conf(p.atributos.for === for0 + 1 && p.pontos === 4,
    'clique por toque aplicou o + (for ' + for0 + '->' +
    p.atributos.for + ', pts 5->' + p.pontos + ')');
  conf(!Input.mouse.clicked && Input.mouse.down,
    'clicked consumido no frame; down mantido com o dedo pressionado');

  // arrasto: touchmove segue o dedo que começou
  dispara('touchmove', [T(1, 150, 150)]);
  conf(Input.mouse.x === 150 && Input.mouse.y === 150,
    'touchmove atualiza o ponteiro (150,150)');

  // segundo dedo não sequestra o ponteiro
  dispara('touchstart', [T(1, 150, 150), T(2, 500, 300)]);
  conf(Input.mouse.x === 150 && Input.mouse.y === 150,
    'segundo dedo é ignorado (vale o identifier do primeiro)');
  dispara('touchmove', [T(1, 170, 170), T(2, 500, 300)]);
  conf(Input.mouse.x === 170 && Input.mouse.y === 170,
    'touchmove continua seguindo o primeiro dedo');

  // soltura: em touchend, e.touches = toques QUE RESTAM ativos.
  // dedo 2 sai (resta o 1) -> ponteiro continua; dedo 1 sai -> solta
  dispara('touchend', [T(1, 170, 170)]);
  conf(Input.mouse.down, 'dedo 2 sair não solta o ponteiro (resta o 1)');
  dispara('touchend', [T(2, 500, 300)]);
  conf(!Input.mouse.down, 'dedo 1 (o que controlava) sair solta o ponteiro');

  // touchcancel limpa igual
  dispara('touchstart', [T(1, 40, 40)]);
  conf(Input.mouse.down, 'touchstart liga de novo');
  dispara('touchcancel', []);
  conf(!Input.mouse.down, 'touchcancel solta o ponteiro');
}

console.log('19) viewport larga: layout ancorado e preenchido (celular)');
{
  // celular em paisagem COM as barras do navegador: viewport ~3.2:1
  sandbox.window.innerWidth = 1280;
  sandbox.window.innerHeight = 400;
  (ouvintesJanela.resize || []).forEach(fn => fn({}));

  conf(Game.W === 1382,
    'largura lógica seguiu o aspecto (432×3.2 -> 1382, dentro do teto 1728)');
  conf(jogoCanvas.style.width === '1280px' &&
       jogoCanvas.style.height === '400px',
    'CSS preenche a viewport inteira (1280×400, sem barra lateral)');
  conf(jogoCanvas.width === parseInt(jogoCanvas.style.width, 10) &&
       jogoCanvas.height === parseInt(jogoCanvas.style.height, 10),
    'backing = exibição também em escala <1 (' + jogoCanvas.width +
    '×' + jogoCanvas.height + ' — antes era 1382×432 esticado)');

  const Batalha = sandbox.Batalha;
  const p = Game.personagem;
  const dx = Game.W - 768;   // 614

  // botão do rodapé ancorado à direita: Pausar vive em (W-180, 372, 112,32)
  const pausada0 = Batalha.info().pausada;
  clique(Game.W - 180 + 56, 388);
  frame(2);
  conf(Batalha.info().pausada === !pausada0,
    'Pausar ancorado à direita responde (x=' + (Game.W - 180 + 56) + ')');
  clique(Game.W - 180 + 56, 388);   // restaura o estado
  frame(2);

  // botão + do painel de gestão: retângulos locais + ponteiro deslocado
  p.pontos = 5;
  const for0 = p.atributos.for;
  clique(716 + 12 + dx, 96);        // centro do + (local 728 + dx)
  frame(2);
  conf(p.atributos.for === for0 + 1 && p.pontos === 4,
    'botão + do painel deslocado aplica (dx=' + dx + ', for ' +
    for0 + '->' + p.atributos.for + ')');

  // aba desenhada sob translate: UI.deslocar compensa no hit-test
  jogoCanvas._textos = [];
  clique(456 + dx / 2, 418);   // aba Itens (barra centrada, tela larga)
  frame(2);
  conf((jogoCanvas._textos || []).some(t => t.indexOf('Bolsa') >= 0),
    'aba Itens clicável com o painel ancorado à direita');

  // volta ao normal e confere que tudo reancora
  sandbox.window.innerWidth = 1280;
  sandbox.window.innerHeight = 720;
  (ouvintesJanela.resize || []).forEach(fn => fn({}));
  conf(Game.W === 768 &&
       jogoCanvas.width === parseInt(jogoCanvas.style.width, 10) &&
       jogoCanvas.style.width === '1280px',
    'restaurou 16:9 (W 768, backing = exibição 1280px)');
}

console.log('20) cenário procedural: Perlin Noise com semente do mapa');
{
  const Perlin = sandbox.Perlin;
  const Batalha = sandbox.Batalha;

  // --- determinismo do ruído (mesma semente => mesmo campo)
  Perlin.definirSemente(7);
  const v1 = [Perlin.valor(3.2, 9.7), Perlin.valor(41.5, 0.25)];
  const z = Perlin.ruido(0, 0);
  Perlin.definirSemente(8);
  const outro = Perlin.valor(3.2, 9.7);
  Perlin.definirSemente(7);
  conf(Perlin.valor(3.2, 9.7) === v1[0] && Perlin.valor(41.5, 0.25) === v1[1],
    'mesma semente reproduz exatamente o mesmo campo');
  conf(outro !== v1[0], 'semente diferente gera outro campo (mapa único)');
  conf(z >= -1 && z <= 1, 'ruido(0,0) dentro da faixa [-1, 1]');

  // sorteio independente da semente do ruído e reproduzível
  const ra = Perlin.sorteio(5), rb = Perlin.sorteio(5);
  conf(ra() === rb() && ra() === rb(),
    'sorteio(s) devolve a mesma sequência na mesma semente');

  // --- obstáculos do cenário: densidade, tipos e restrições do gerador
  Batalha.restaurarMapa(1);
  const obs = Batalha.info().obst;
  const antes = JSON.stringify(obs);
  conf(obs.length >= 4,
    'mapa 1 tem obstáculos procedurais (' + obs.length + ')');
  conf(obs.every(o => o.tipo === 'tree' || o.tipo === 'rock'),
    'tipos vêm do tema (tree/rock)');
  conf(obs.every(o =>
      Math.abs(o.x - 192) >= 72 || Math.abs(o.y - 134) >= 64),
    'área central livre p/ spawn e renascimento');
  let afastados = true;
  for (let i = 0; i < obs.length && afastados; i++) {
    for (let j = i + 1; j < obs.length; j++) {
      const dx = obs[i].x - obs[j].x, dy = obs[i].y - obs[j].y;
      if (dx * dx + dy * dy < 55 * 55) afastados = false;
    }
  }
  conf(afastados, 'obstáculos afastados uns dos outros (>=55px de mundo)');

  // --- mapa 2 tem layout próprio; voltar ao 1 reproduz o original
  Batalha.restaurarMapa(2);
  conf(JSON.stringify(Batalha.info().obst) !== antes,
    'mapa 2 tem layout próprio (outra semente, ' +
    Batalha.info().obst.length + ' obstáculos)');
  Batalha.restaurarMapa(1);
  conf(JSON.stringify(Batalha.info().obst) === antes,
    'voltar ao mapa 1 reproduz o mesmo layout (semente = nº do mapa)');
}

console.log('21) estatísticas do jogador (Personagem.stats)');
{
  const p = Game.personagem;
  const Batalha = sandbox.Batalha;
  const chaves = ['abates', 'mortes', 'danoCausado', 'danoRecebido',
                  'ondas', 'bosses', 'itens', 'tempo'];
  if (Batalha.info().pausada) Batalha.alternarPausa();

  conf(!!p.stats && chaves.every(k => typeof p.stats[k] === 'number'),
    'personagem carrega as 8 estatísticas numéricas');

  // --- round-trip do save preserva stats (normalizar completa o resto)
  Salvar.salvar(p);
  const volta = Salvar.listar().find(x => x.id === p.id);
  // --- round-trip do save preserva stats (normalizar completa o resto);
  // tempo é fracionário ao vivo (soma de dt) e o normalizar faz o floor
  const igualStats = !!volta && chaves.every(k =>
    volta.stats[k] ===
    (k === 'tempo' ? Math.floor(p.stats[k]) : p.stats[k]));
  conf(igualStats, 'stats sobrevivem ao save/leitura (normalizar)');
  const antigo = Personagem.normalizar({ nome: 'Old', classe: 'mago' });
  conf(chaves.every(k => antigo.stats[k] === 0),
    'save antigo sem stats ganha os campos zerados');

  // --- contagem ao vivo: luta forte soma abates/ondas/dano/tempo.
  // INT 8 (agu ~0,25) de propósito: INT alta ligava os estados
  // kite/recuar do cérebro e, sem regeneração, o herói fraco ficava
  // fugindo sem atacar — a onda nunca limpava (flake ~1 em 6). Ver
  // lição em .specs/project/STATE.md.
  p.atributos.for = 50;
  p.atributos.int = 8;
  p.atributos.con = 50;
  p.pontos = 0;
  const a0 = JSON.parse(JSON.stringify(p.stats));
  const t0 = p.stats.tempo;
  let contou = false;
  for (let i = 0; i < 12000 && !contou; i++) {
    frame(1);
    contou = p.stats.abates > a0.abates && p.stats.ondas > a0.ondas &&
             p.stats.danoCausado > a0.danoCausado;
  }
  conf(contou, 'luta soma abates, ondas limpas e dano causado');
  conf(p.stats.tempo > t0, 'tempo de jogo acumula durante a luta');

  // --- dano recebido: os inimigos chegam perto e acertam
  let recebido = p.stats.danoRecebido > a0.danoRecebido;
  for (let i = 0; i < 9000 && !recebido; i++) {
    frame(1);
    recebido = p.stats.danoRecebido > a0.danoRecebido;
  }
  conf(recebido, 'dano recebido conta quando o inimigo acerta');

  // --- pausado o tempo não corre (atualizar(dt, true) só na jogatina)
  Batalha.alternarPausa();
  const tp = p.stats.tempo;
  for (let i = 0; i < 100; i++) frame(1);
  conf(p.stats.tempo === tp, 'pausado não acumula tempo de jogo');
  Batalha.alternarPausa();

  // --- morte incrementa mortes
  const m0 = p.stats.mortes;
  p.atributos.con = 1;
  p.atributos.for = 1;
  // pressão de morte: com ESC_DMG 0,045 + HP/nível ×6 + ESPERA 8 o
  // herói aguenta onda 50 — sobe para onda 120 (aqui o teste QUER a
  // morte; lição: fixture de morte precisa de restaurarOnda de pressão)
  Batalha.restaurarOnda(120);
  let morreu = false;
  for (let i = 0; i < 12000 && !morreu; i++) {
    frame(1);
    morreu = p.stats.mortes > m0;
  }
  conf(morreu, 'morte incrementa a estatística de mortes');

  // --- aba Stats na UI (clique na 5ª aba da grade nova)
  jogoCanvas._textos = [];
  clique(528, 418);          // centro da aba Stats (barra do rodapé)
  frame(1);
  conf((jogoCanvas._textos || []).some(t => t.indexOf('Abates') >= 0),
    'aba Stats mostra as estatísticas');
}

console.log('22) IA tática: agudeza, alvo, estados, skills e A*');
{
  const IA = sandbox.IA;
  const Batalha = sandbox.Batalha;
  const p = Game.personagem;

  // --- agudeza: INT 4 = burro, 20 = gênio, teto em 1
  conf(IA.agudeza(1) === 0 && IA.agudeza(4) === 0 &&
       IA.agudeza(20) === 1 && IA.agudeza(30) === 1,
    'agudeza: INT 4 -> 0 (burro), INT 20 -> 1 (gênio)');
  conf(IA.agudeza(12) > IA.agudeza(6) && IA.agudeza(12) < 1,
    'agudeza cresce com a INT (12 = médio: ' +
    IA.agudeza(12).toFixed(2) + ')');

  // --- astúcia dos NPCs: espécie + mapa, com teto
  conf(IA.astucia('slime', 1) === 0 && IA.astucia('boss', 1) === 0.6 &&
       IA.astucia('slime', 3) > IA.astucia('slime', 1) &&
       IA.astucia('aranha', 30) === 1,
    'astúcia: espécie + mapa, com teto em 1');

  // --- alvo: gênio mira a prioridade (perigoso e fraco), burro vai no
  // mais perto mesmo assim (ruído/agnorância de prioridade)
  const mk = int => ({ x: 0, y: 0, hp: 100, hpMax: 100,
    stats: { alcance: 26, atributos: { int: int } } });
  const perto = { x: 60, y: 0, hp: 999, dmg: 1 };   // perto, tanque
  const longe = { x: 150, y: 0, hp: 3, dmg: 20 };   // longe, fraco, perigoso
  let g = 0;
  const hg = mk(20);
  for (let i = 0; i < 60; i++) {
    IA.decideHeroi(hg, [perto, longe], 0.3);
    if (hg.ia.alvo === longe) g++;
  }
  conf(g === 60, 'gênio (INT 20) escolhe o alvo prioritário (' + g + '/60)');
  let b = 0;
  const hb = mk(1);
  for (let i = 0; i < 60; i++) {
    IA.decideHeroi(hb, [perto, longe], 0.3);
    if (hb.ia.alvo === longe) b++;
  }
  conf(b <= 15, 'burro (INT 1) quase sempre no mais perto (' + b + '/60)');

  // --- skillEfeito: gênio dispara mais cedo e com menos espera
  const efB = IA.skillEfeito({ gatilho: 40, intervalo: 10 }, 0);
  const efG = IA.skillEfeito({ gatilho: 40, intervalo: 10 }, 1);
  conf(efG.intervalo < efB.intervalo && efG.gatilho > efB.gatilho,
    'skill: gênio usa com raio maior e cooldown menor');

  // --- A*: reto livre => null (melhor caminho); atravessando obstáculo
  // => volta em waypoints
  conf(IA.linhaLivre(0, 0, 10, 10, 6) === true, 'linha livre = livre');
  const obs = Batalha.info().obst[0];
  if (obs) {
    const r = IA.caminho(obs.x - 30, obs.y, obs.x + 30, obs.y, 6);
    conf(Array.isArray(r) && r.length >= 1,
      'A* dá a volta no obstáculo (' + (r ? r.length : 0) + ' waypoints)');
    conf(IA.caminho(0, 0, 10, 10, 6) === null,
      'A* nem é chamado quando a reta está livre');
  }

  // --- comportamento na arena: gênio recua com HP baixo; burro nunca
  if (Batalha.info().pausada) Batalha.alternarPausa();
  p.atributos.con = 60;                 // vida folgada p/ janela "ferido vivo"
  p.atributos.for = 60;                 // dano alto p/ a luta nunca parar
  p.atributos.int = 40;                 // gênio (efetivo >= 40)
  p.pontos = 0;
  // guerreiro de propósito: sem bênção (clérigo herda da 16) — com a
  // penalidade de morte regredindo ondas, cura > dano em onda fácil e o
  // HP nunca chegaria perto de 35%
  p.classe = 'guerreiro';
  // onda 60: com o combo (Leva 1) o herói só cai abaixo de 35% sob
  // pressão forte — sem isso o regenerador o mantém saudável
  Batalha.restaurarOnda(60);
  const hpMax = Personagem.status(p).hpMax;
  let recuou = false;
  for (let i = 0; i < 12000 && !recuou; i++) {
    frame(1);
    const inf = Batalha.info();
    if (!inf.morto && inf.hp > 0 && inf.hp < hpMax * 0.35 &&
        inf.heroi.estado === 'recuar') {
      recuou = true;
    }
  }
  conf(recuou, 'gênio (INT alto) recua quando o HP fica baixo');

  p.atributos.int = 1;                  // burro de verdade (efetivo < 4)
  let algumaVez = false;
  for (let i = 0; i < 6000 && !algumaVez; i++) {
    frame(1);
    const inf = Batalha.info();
    // o estado só vale quando a agudeza do TICK é de burro (o tick anterior
    // do gênio pode deixar 'recuar' pendente por até 0,2s)
    if (inf.heroi.estado === 'recuar' && inf.heroi.agu < 0.45) algumaVez = true;
  }
  conf(!algumaVez, 'burro (INT 1) nunca recua — vai na raça');
}

console.log('23) IA dos NPCs: astúcia, cerco, antecipação e esquiva');
{
  const IA = sandbox.IA;
  const Batalha = sandbox.Batalha;
  const heroi = { x: 100, y: 100, morto: false, hp: 100, escapa: null };
  IA.pintaMapa([]);   // limpa ocupação residual da arena (spec ia-monstros)

  // --- burro (slime do mapa 1): segue o herói vivo na hora, sem slot
  const burro = { x: 60, y: 100, astucia: IA.astucia('slime', 1), slot: 0 };
  IA.decideInimigo(burro, heroi, 0.0167);
  conf(burro.ia.destino === null,
    'slime do mapa 1 (astúcia 0) vai direto no herói (sem slot)');

  // --- astuto: slot do cerco a 11px, ângulo próprio por inimigo
  const a1 = { x: 60, y: 100, astucia: 0.5, slot: 0 };
  const a2 = { x: 60, y: 140, astucia: 0.5, slot: 1 };
  IA.decideInimigo(a1, heroi, 0.0167);
  IA.decideInimigo(a2, heroi, 0.0167);
  const d1 = a1.ia.destino, d2 = a2.ia.destino;
  const raio = Math.sqrt((d1.x - 100) ** 2 + (d1.y - 100) ** 2);
  conf(Math.abs(raio - 11) < 0.01,
    'astuto mira um slot a 11px do herói (raio ' + raio.toFixed(1) + ')');
  conf(d1.x !== d2.x || d1.y !== d2.y,
    'cada inimigo tem seu slot (cerco em vez de fila)');

  // --- antecipação da fuga: mira 40px à frente para cortar o caminho
  heroi.escapa = { x: 1, y: 0, t: 0.5 };
  const ant = { x: 60, y: 100, astucia: 0.5, slot: 0 };
  IA.decideInimigo(ant, heroi, 0.0167);
  conf(ant.ia.destino && ant.ia.estado === 'antecipar' &&
       ant.ia.destino.x >= 140,
    'astuto antecipa a fuga e mira à frente (x=' +
    (ant.ia.destino ? Math.round(ant.ia.destino.x) : '?') + ')');
  const ing = { x: 60, y: 100, astucia: 0.2, slot: 0 };
  IA.decideInimigo(ing, heroi, 0.0167);
  conf(ing.ia.estado !== 'antecipar',
    'ingênuo (astúcia baixa) segue o herói como está');
  heroi.escapa = null;

  // --- esquiva: só monstro astuto (>= 0,55) desvia, com cooldown
  const esq = { x: 130, y: 100, astucia: 0.6, slot: 2, esquivaCd: 0 };
  let desviou = false;
  for (let i = 0; i < 6000 && !desviou; i++) {
    IA.decideInimigo(esq, heroi, 0.0167);
    if (esq.esquiva) desviou = true;
  }
  conf(desviou, 'astúcia >= 0,55 dispara a esquiva do monstro');
  const burro2 = { x: 130, y: 100, astucia: 0, slot: 3, esquivaCd: 0 };
  let nunca = false;
  for (let i = 0; i < 600; i++) IA.decideInimigo(burro2, heroi, 0.0167);
  nunca = !burro2.esquiva && burro2.ia.estado !== 'esquivar';
  conf(nunca, 'burro (astúcia 0) não esquiva nunca');

  // --- na arena: mapa profundo => esquivas acontecendo de verdade
  if (Batalha.info().pausada) Batalha.alternarPausa();
  Batalha.restaurarMapa(6);              // slime com astúcia 0,6
  Batalha.restaurarOnda(1);
  let esquivando = false;
  for (let i = 0; i < 9000 && !esquivando; i++) {
    frame(1);
    esquivando = Batalha.info().esquivando > 0;
  }
  conf(esquivando, 'na arena, monstro astuto esquiva dos golpes');
}

console.log('24) economia: ouro, venda/sucata, aprimoramento e re-roll');
{
  const Itens = sandbox.Itens;
  const Batalha = sandbox.Batalha;
  const p = Game.personagem;

  // --- ouro de abate (R-ECO-1): volta ao mapa 1 (aqui o herói nv ~9
  // mata rápido — no mapa 6 a ondaTotal 501 torna o kill impossível),
  // RNG zerado => ouro mínimo garantido
  const ouroAntes = p.ouro || 0;
  const estavaPausada = Batalha.info().pausada;
  if (estavaPausada) Batalha.alternarPausa();
  Batalha.restaurarMapa(1);
  Batalha.restaurarOnda(1);
  const rnd0 = Math.random;
  Math.random = function () { return 0; };
  let ganhou = false;
  for (let i = 0; i < 6000 && !ganhou; i++) {
    frame(1);
    if ((p.ouro || 0) > ouroAntes) ganhou = true;
  }
  Math.random = rnd0;
  // congela a batalha p/ o resto da seção (ouro exato não pode variar
  // com kill aleatório durante os testes)
  if (!Batalha.info().pausada) Batalha.alternarPausa();
  conf(ganhou, 'abate rende ouro (escala com mapa/onda)');

  // --- venda paga 25% e sucata garante o piso (R-ECO-2)
  p.ouro = 0;
  p.equip = { arma: null, armadura: null };
  p.bolsa = [];
  const itV = { nome: 'Vendável', slot: 'arma', rar: 2, escala: 1, up: 0,
                afixos: [], bonus: { dano: 10 } };   // valor 60 -> 15
  Itens.guardar(p, itV);
  conf(Itens.vender(p, itV) === 15 && p.ouro === 15 &&
       p.bolsa.indexOf(itV) < 0,
    'venda paga 25% do valor e tira da bolsa');
  const itLixo = { nome: 'Lixo Amaldiçoado', slot: 'arma', rar: 1,
                   escala: 1, up: 0, afixos: [], bonus: { dano: -8 } };
  conf(Itens.precoVenda(itLixo) === 2 && Itens.precoSucata(itLixo) === 3,
    'item ruim: venda 2 < sucata 3 (piso garantido)');
  Itens.guardar(p, itLixo);
  conf(Itens.sucatear(p, itLixo) === 3 && p.bolsa.length === 0,
    'sucata paga o piso e limpa a linha');

  // --- bolsa cheia sucateia o mais antigo (nunca lixo silencioso)
  p.bolsa = [];
  p.ouro = 0;
  for (let i = 0; i < Itens.BOLSA_MAX; i++) {
    Itens.guardar(p, { nome: 'X' + i, slot: 'arma', rar: 1, escala: 1,
                       up: 0, afixos: [], bonus: { dano: 1 } });
  }
  Itens.guardar(p, { nome: 'Novo', slot: 'arma', rar: 2, escala: 1, up: 0,
                     afixos: [], bonus: { dano: 2 } });
  conf(p.bolsa.length === Itens.BOLSA_MAX && p.ouro === 3 &&
       p.bolsa[p.bolsa.length - 1].nome === 'Novo',
    'bolsa cheia: o mais antigo vira ouro e o novo entra');

  // --- aprimoramento: custo, nível e +8% exato no status (R-ECO-3)
  p.ouro = 1000;
  p.equip = { arma: { nome: 'Up Arma', slot: 'arma', rar: 3, escala: 1,
                      up: 0, afixos: [], bonus: { dano: 100 } },
              armadura: null };
  p.bolsa = [];
  const d0 = Personagem.status(p).dano;
  conf(Itens.custoAprim(p.equip.arma) === 25,
    'custo do 1º aprimoramento é 25');
  conf(Itens.aprimorar(p, p.equip.arma) && p.equip.arma.up === 1 &&
       p.ouro === 975,
    'aprimorar cobra o custo e sobe o nível');
  const d1 = Personagem.status(p).dano;
  conf(d1 === d0 + Math.round(100 * 0.08),
    'APR (+8%) entra exatamente no status (+' + (d1 - d0) + ' dano)');

  // --- auto-equip defende a vaga do item aprimorado (up 1 => 108 efet.)
  conf(!Itens.equiparSeMelhor(p, { nome: 'Drop', slot: 'arma', rar: 3,
        escala: 1, up: 0, afixos: [], bonus: { dano: 105 } }),
    'drop de 105 não tira arma aprimada de 100 (108 efetivos)');
  conf(Itens.equiparSeMelhor(p, { nome: 'Drop Bom', slot: 'arma', rar: 3,
        escala: 1, up: 0, afixos: [], bonus: { dano: 200 } }),
    'drop bem maior continua trocando');

  p.ouro = 99999;
  for (let i = 0; i < 10; i++) Itens.aprimorar(p, p.equip.arma);
  conf(p.equip.arma.up === 8 && Itens.custoAprim(p.equip.arma) === -1,
    'teto de aprimoramento (8 níveis)');

  // --- re-roll determinístico com RNG stubado (0.99 em tudo)
  p.ouro = 99999;
  const itR = { nome: 'Poderoso Espada de Aço do Gigante',
                base: 'Espada de Aço', slot: 'arma', rar: 3, escala: 1,
                up: 0, rerolls: 0, bonus: { dano: 8, hp: 6 },
                afixos: [
                  { nome: 'Poderoso', tipo: 'pre', chave: 'dano',
                    neg: false, valor: 5 },
                  { nome: 'do Gigante', tipo: 'suf', chave: 'hp',
                    neg: false, valor: 6 }
                ] };
  const ouroR = p.ouro;
  const rndR = Math.random;
  Math.random = function () { return 0.99; };
  const okR = Itens.reroll(p, itR);
  Math.random = rndR;
  conf(okR && itR.rerolls === 1 && p.ouro === ouroR - 30,
    're-roll cobra 10×rar×escala e conta tentativas');
  conf(itR.afixos.length === 2 && !itR.afixos.some(a => a.neg),
    're-roll mantém 2 afixos e o teto de negativos');
  conf(itR.nome === 'Poderoso Espada de Aço da Agulha' &&
       itR.afixos[1].nome === 'da Agulha' && itR.afixos[1].valor === 5,
    'sufixo livre rolou no topo da faixa e o nome recompôs de base');
  conf((itR.bonus.hp || 0) === 0 && itR.bonus.crit === 5 &&
       itR.bonus.dano === 8,
    'bônus recomputado: sai do Gigante (+6 HP), entra da Agulha (+5 C)');

  // --- migração e UI (R-ECO-5, R-ECO-6)
  const mig = Personagem.importarJSON(
    '{"nome":"E","ouro":77,"equip":{"arma":{"nome":"V","slot":"arma",' +
    '"up":99,"bonus":{"dano":3}}}}');
  conf(mig.ouro === 77 && mig.equip.arma.up === 8 &&
       mig.equip.arma.escala === 1 && mig.equip.arma.rerolls === 0,
    'migração: ouro preservado, up no teto e defaults de economia');

  p.ouro = 500;
  p.equip = { arma: { nome: 'Arma UI', slot: 'arma', rar: 1, escala: 1,
                      up: 0, afixos: [], bonus: { dano: 3 } },
              armadura: null };
  p.bolsa = [];
  const itUI = { nome: 'Pra Vender', slot: 'armadura', rar: 2, escala: 1,
                 up: 0, afixos: [], bonus: { hp: 10 } };
  Itens.guardar(p, itUI);
  jogoCanvas._textos = [];
  clique(456, 418);                 // aba Itens (se não estiver nela)
  frame(2);
  conf((jogoCanvas._textos || []).some(t => t.indexOf('Ouro 500') >= 0),
    'linha da aba Itens mostra o ouro');
  clique(707, 189);                // botão V da linha 0 (y=176..202)
  frame(2);
  conf(p.bolsa.length === 0 && p.ouro === 515,
    'clique no V vende a linha (500 + 15)');
  clique(695, 96);                 // A+ do slot da arma (676..714, y=84..108)
  frame(2);
  conf(p.equip.arma.up === 1 && p.ouro === 490,
    'clique no A+ aprimora e cobra (515 - 25)');

  // --- tooltip do item: teto numérico (não vaza o nome da constante)
  const itD = { nome: 'Aprimorada', slot: 'arma', rar: 2, escala: 1,
                up: 2, rerolls: 0, afixos: [], bonus: { dano: 5 } };
  const linhasD = Itens.dicas(p, itD);
  conf(linhasD.some(l => l[0].indexOf('/' + Itens.MAX_UP) >= 0) &&
       !linhasD.some(l => l[0].indexOf('MAX_UP') >= 0),
    'tooltip do item mostra o teto numérico (sem "MAX_UP" cru)');

  // --- lendário: re-roll NUNCA apaga o negativo forçado (o preço)
  const legR = { nome: 'Poderoso Lendário', base: 'Lendário',
                 slot: 'arma', rar: 4, escala: 1, up: 0, rerolls: 0,
                 bonus: { dano: 6, hp: -6 },
                 afixos: [
                   { nome: 'Quebrado', tipo: 'neg', chave: 'dano',
                     neg: true, valor: 4 },
                   { nome: 'Robusto', tipo: 'pre', chave: 'hp',
                     neg: false, valor: 6 }
                 ] };
  const ouroL = p.ouro;
  p.ouro = 99999;
  const rndL = Math.random;
  Math.random = function () { return 0.99; };
  const okL = Itens.reroll(p, legR);
  Math.random = rndL;
  p.ouro = ouroL;
  conf(okL && legR.afixos.filter(a => a.neg).length === 1,
    're-roll do lendário mantém 1 negativo (tradeoff preservado)');
}

console.log('25) gestão de skills: loadout e keystone');
{
  const Skills = sandbox.Skills;
  const Batalha = sandbox.Batalha;
  const p = Game.personagem;

  // --- carregadas: automático = 3 mais avançadas desbloqueadas
  p.classe = 'mago';
  p.nivel = 45;
  p.loadout = null;
  const auto = Skills.carregadas(p);
  conf(auto.length === 3 && auto[0].nivel === 25 && auto[2].nivel === 45,
    'automático: as 3 skills mais avançadas (nv 25/35/45)');

  // --- seleção custom entre as desbloqueadas
  p.loadout = ['bola-fogo', 'meteoro'];
  const sel = Skills.carregadas(p);
  conf(sel.length === 2 && sel[0].id === 'bola-fogo' &&
       sel[1].id === 'meteoro',
    'loadout escolhido substitui o automático');

  // --- seleção de outra classe cai no automático (troca direta)
  p.classe = 'guerreiro';
  const fb = Skills.carregadas(p);
  conf(fb.length === 3 && fb.every(s => s.classe === 'guerreiro'),
    'loadout alheio à classe nova volta pro automático');
  p.loadout = null;

  // --- migração dos campos de build
  const mig = Personagem.importarJSON(
    '{"nome":"K","nivel":45,"loadout":["a","b","c","d","e","f"],' +
    '"keystoneLib":"x","keystoneOn":1}');
  conf(Array.isArray(mig.loadout) && mig.loadout.length === 5 &&
       mig.keystoneLib === false && mig.keystoneOn === false,
    'migração: loadout truncado no teto 5 e keystone booleanizado');

  // --- efeito exato de cada keystone (liga e compara com desligado)
  for (const ks of Personagem.KEYSTONES) {
    p.classe = ks.classe;
    p.nivel = 45;
    p.keystoneLib = true;
    p.keystoneOn = false;
    const off = Personagem.status(p);
    p.keystoneOn = true;
    const on = Personagem.status(p);
    let ok = true;
    if (ks.dano) ok = ok && on.dano === Math.round(off.dano * ks.dano);
    if (ks.hpMax) ok = ok && on.hpMax === Math.round(off.hpMax * ks.hpMax);
    if (ks.vel) ok = ok && on.vel === off.vel + ks.vel;
    if (ks.crit) ok = ok && on.crit === off.crit + ks.crit;
    conf(ok, 'keystone ' + ks.id + ' aplica o efeito exato no status');
    p.keystoneOn = false;
  }
  p.keystoneLib = false;

  // --- compra (nível + ouro) e respec (10 de ouro)
  p.classe = 'guerreiro';
  p.ouro = 500;
  p.nivel = 29;
  conf(!Personagem.comprarKeystone(p) && p.ouro === 500,
    'keystone exige o nível 30');
  p.nivel = 30;
  const danoSem = Personagem.status(p).dano;
  conf(Personagem.comprarKeystone(p) && p.keystoneLib && p.keystoneOn &&
       p.ouro === 300,
    'compra libera e já ativa (200 de ouro)');
  conf(Personagem.status(p).dano === Math.round(danoSem * 1.35),
    'keystone ativo muda o status na hora');
  conf(Personagem.alternarKeystone(p) && !p.keystoneOn && p.ouro === 290 &&
       Personagem.status(p).dano === danoSem,
    'respec desliga por 10 e o status volta');

  // --- o combate executa só o carregado (filtro na prática)
  if (Batalha.info().pausada) Batalha.alternarPausa();
  p.classe = 'mago';
  p.nivel = 45;
  p.atributos.for = 50;
  // int 8 (não 50): com a compensação 9× da spec gestao-atributos o
  // int 50 dava dano 210 e o clear instantâneo deixava o timer do nuke
  // expirar SEM alvo (mesmo bug medido da Bola de Fogo) — dano
  // controlado = a onda vive a janela e o Meteoro conjura
  p.atributos.int = 8;
  p.pontos = 0;
  p.loadout = ['meteoro'];
  jogoCanvas._textos = [];
  Batalha.limparEfeitos();
  let lancou = false;
  for (let i = 0; i < 2400 && !lancou; i++) {
    frame(1);
    lancou = (jogoCanvas._textos || []).some(t => t === 'Meteoro');
  }
  if (!lancou) {
    const fm = Batalha.info();
    console.log('    [diagMeteoro] dano=' + Personagem.status(p).dano +
      ' hp=' + fm.hp + ' onda=' + fm.onda + ' inim=' + fm.inimigos +
      ' morto=' + fm.morto + ' nv=' + p.nivel);
  }
  conf(lancou, 'skill do loadout dispara na arena (Meteoro)');
  conf(!(jogoCanvas._textos || []).some(t => t === 'Bola de Fogo'),
    'skill fora do loadout não dispara');
  if (!Batalha.info().pausada) Batalha.alternarPausa();

  // --- UI da aba Classe: grade nova, toggle com limites e keystone
  p.keystoneLib = false;
  p.keystoneOn = false;
  p.ouro = 1000;
  p.nivel = 45;
  p.classe = 'guerreiro';
  p.loadout = null;
  clique(384, 418);                 // aba Classe
  frame(2);
  clique(673, 102);                // Mago na grade 2×2
  frame(2);
  conf(p.classe === 'mago' && p.loadout === null,
    'trocar classe na grade zera o loadout (automático)');
  p.loadout = ['bola-fogo'];
  // grade 2×4 (spec arvore-skills): linha = 178 + floor(i/2)*29,
  // coluna = 416 + (i%2)*174, toggle de 110px
  clique(645, 219);                // Meteoro (i=3: col1 linha1)
  frame(2);
  conf(p.loadout.length === 2 && p.loadout.indexOf('meteoro') >= 0,
    'clicar na skill liga no loadout');
  clique(471, 248);                // Rajada (i=4: col0 linha2)
  frame(2);
  clique(645, 190);                // Nova (i=1: col1 linha0) com 3/3
  frame(2);
  conf(p.loadout.length === 3,
    'loadout respeita o máximo de 3');
  conf((jogoCanvas._textos = jogoCanvas._textos || [])
       .some(t => t.indexOf('Máximo de 3') >= 0),
    'ultrapassar o máximo recusa com aviso');
  clique(471, 190);                // Bola (i=0: col0 linha0): sai -> 2/3
  frame(2);
  clique(645, 219);                // Meteoro (i=3): sai -> 1/3
  frame(2);
  clique(471, 248);                // Rajada (i=4): última ativa
  frame(2);
  conf(p.loadout.length === 1,
    'loadout mantém o mínimo de 1 skill');
  conf((jogoCanvas._textos || [])
       .some(t => t.indexOf('Mínimo de 1') >= 0),
    'desligar a última skill recusa com aviso');
  clique(584, 318);                // botão do keystone (y=306..330)
  frame(2);
  conf(p.keystoneLib && p.keystoneOn && p.ouro === 800,
    'botão do keystone compra e ativa (200)');
  clique(584, 318);
  frame(2);
  conf(!p.keystoneOn && p.ouro === 790,
    'botão do keystone desliga no respec (10)');
}

console.log('26) itens lendários: raridade 4, efeitos e equilíbrio');
{
  const Itens = sandbox.Itens;
  const Batalha = sandbox.Batalha;
  const p = Game.personagem;

  // --- estrutura: rar 4, exatamente 1 neg + 1 pos, efeito da tabela
  const idsLeg = Itens.LEGENDARIOS.map(l => l.efeito);
  let estruturaOk = true;
  for (let i = 0; i < 60; i++) {
    const it = Itens.geraItem(4, 1 + (i % 3), 'mago');
    const negs = it.afixos.filter(a => a.neg).length;
    if (it.rar !== 4 || it.afixos.length !== 2 || negs !== 1 ||
        !it.efeito || idsLeg.indexOf(it.efeito) < 0 ||
        !it.base || !it.escala || !Itens.corRar(4)) {
      estruturaOk = false;
    }
  }
  conf(estruturaOk,
    'lendário: rar 4, exatamente 1 neg + 1 pos, efeito da tabela');

  const legNome = Itens.geraItem(4, 1, 'mago');
  const basesT1 = Itens.LEGENDARIOS.filter(l => l.tema === 1)
    .map(l => l.nome);
  conf(basesT1.some(n => legNome.nome.indexOf(n) >= 0),
    'nome lendário monta sobre a base autorada');

  // --- pool por MUNDO (espelha Mapas.info: 3 pools ciclam a cada 3
  // mundos — mundos 1/4/7/10, 2/5/8, 3/6/9; spec mundos R-MUN-8)
  const t1 = ['vampiro', 'fenix'], t2 = ['furia', 'mercador'],
        t3 = ['tempestade', 'santificado'];
  let temaOk = true;
  for (let i = 0; i < 25; i++) {
    if (t1.indexOf(Itens.geraItem(4, 1, 'guerreiro').efeito) < 0) temaOk = false;   // mundo 1
    if (t1.indexOf(Itens.geraItem(4, 31, 'guerreiro').efeito) < 0) temaOk = false;  // mundo 4 cicla p/ 1
    if (t2.indexOf(Itens.geraItem(4, 11, 'guerreiro').efeito) < 0) temaOk = false;  // mundo 2
    if (t3.indexOf(Itens.geraItem(4, 21, 'guerreiro').efeito) < 0) temaOk = false;  // mundo 3
  }
  conf(temaOk, 'pool por mundo (3 pools ciclam: mundos 1/4/7, 2/5/8, 3/6/9)');

  // --- chefe com 15% de elevar (stub 0 prova) e rar 1-3 intactos
  const rnd0 = Math.random;
  Math.random = function () { return 0; };
  const sdLeg = Itens.sorteiaDrop(1, true, 'mago');
  const comum = Itens.sorteiaDrop(1, false, 'mago');
  Math.random = rnd0;
  conf(sdLeg.length === 2 && sdLeg.every(i => i.rar === 4),
    'drop do chefe: 15% eleva a lendário (stub 0 provoca)');
  conf(comum.length === 1 && comum[0].rar === 1,
    'drop comum segue igual (regressão dos rar 1-3)');

  // --- matemática dos efeitos pura
  p.equip = { arma: null, armadura: null };
  conf(!Itens.temEfeito(p, 'vampiro') && Itens.pctVamp(p) === 0 &&
       Itens.multOuro(p) === 1 && Itens.multDano(p, 0.1) === 1,
    'sem lendário: efeitos inertes');
  conf(!Itens.temEfeito(p, 'nao-existe'),
    'id de efeito desconhecido é inerte (save corrompido)');
  p.equip.arma = { nome: 'Lâmina Espectral', slot: 'arma', rar: 4,
    escala: 1, up: 0, afixos: [], efeito: 'furia', bonus: { dano: 7 } };
  conf(Itens.multDano(p, 0.29) === 1.5 && Itens.multDano(p, 0.3) === 1 &&
       Itens.multDano(p, 0.9) === 1,
    'fúria: ×1,5 só abaixo de 30% de HP');
  p.equip.armadura = { nome: 'Manto do Mercador', slot: 'armadura',
    rar: 4, escala: 1, up: 0, afixos: [], efeito: 'mercador',
    bonus: { hp: 20 } };
  conf(Itens.multOuro(p) === 1.5 && Itens.temEfeito(p, 'mercador'),
    'mercador: ouro ×1,5 (arma e armadura contam)');
  p.equip.arma = { nome: 'Sangue Frio', slot: 'arma', rar: 4, escala: 1,
    up: 0, afixos: [], efeito: 'vampiro', bonus: { dano: 8 } };
  conf(Itens.pctVamp(p) === 0.04, 'vampiro: 4% do dano causado vira vida');

  // --- migração: rar 4/efeito válidos preservados; lixo cai no padrão
  const mig = Personagem.importarJSON(JSON.stringify({
    nome: 'L',
    equip: {
      arma: { nome: 'Espada do Eclipse', slot: 'arma', rar: 4,
              bonus: { dano: 10 }, efeito: 'vampiro' },
      armadura: { nome: 'X', slot: 'armadura', rar: 9,
                  efeito: '<script>', bonus: {} }
    }
  }));
  conf(mig.equip.arma.rar === 4 && mig.equip.arma.efeito === 'vampiro',
    'migração preserva rar 4 e efeito válido');
  conf(mig.equip.armadura.rar === 1 && !mig.equip.armadura.efeito,
    'raridade inválida e efeito malformado caem no padrão');

  // --- ★ do efeito na linha da UI (aba Itens)
  p.equip = { arma: null, armadura: null };
  p.bolsa = [];
  Itens.guardar(p, Itens.geraItem(4, 1, 'mago'));
  jogoCanvas._textos = [];
  clique(456, 418);                 // aba Itens (a 25 saiu na Classe)
  frame(2);
  conf((jogoCanvas._textos || []).some(t => t.indexOf('★') >= 0),
    'linha da bolsa mostra o ★ do efeito lendário');

  // --- ouro ×1,5 ao vivo (fórmula determinística com RNG zerado)
  p.equip = { arma: null,
    armadura: { nome: 'Manto', slot: 'armadura', rar: 4, escala: 1,
                up: 0, afixos: [], efeito: 'mercador', bonus: { hp: 20 } } };
  p.bolsa = [];
  p.atributos.for = 50;
  p.atributos.int = 8;             // sem fuga: mata direto
  p.atributos.con = 50;
  p.pontos = 0;
  Batalha.restaurarOnda(1);         // onda 1 sem chefe
  if (Batalha.info().pausada) Batalha.alternarPausa();
  const ouroA = p.ouro || 0;
  const infA = Batalha.info();
  const otA = (infA.mapa - 1) * 100 + infA.onda;
  const baseA = Math.round(1 * sandbox.Mapas.forca(infA.mapa) *
    (1 + (otA + 1) * 0.04));
  const rndM = Math.random;
  Math.random = function () { return 0; };
  let mudou = false;
  for (let i = 0; i < 6000 && !mudou; i++) {
    frame(1);
    mudou = (p.ouro || 0) > ouroA;
  }
  Math.random = rndM;
  const delta = (p.ouro || 0) - ouroA;
  conf(mudou && delta === Math.round(baseA * 1.5),
    'mercador ao vivo: abate paga ouro ×1,5 (' + delta + ' = ' +
    Math.round(baseA * 1.5) + ')');
  if (!Batalha.info().pausada) Batalha.alternarPausa();

  // --- fúria ao vivo: HP < 30% => info().dano = status × 1,5
  p.equip = { arma: { nome: 'Lâmina', slot: 'arma', rar: 4, escala: 1,
               up: 0, afixos: [], efeito: 'furia', bonus: { dano: 50 } },
              armadura: null };
  p.bolsa = [];
  p.classe = 'mago';
  p.nivel = 10;
  p.atributos.for = 1;             // dano controlado (só o bônus da arma)
  p.atributos.con = 13;           // hp ~270 (CON investido vale 9× —
                                   // spec gestao-atributos): o herói
                                   // DESCE degrau a degrau até < 30%
                                   // (limiar ~81)
  p.atributos.int = 8;
  p.pontos = 0;
  Batalha.restaurarOnda(60);       // pressão: com ESC_DMG 0,045 + ESPERA 8
                                   // a onda 20 não fura a regen (o herói
                                   // limpa a onda antes de descer < 30%)
  if (Batalha.info().pausada) Batalha.alternarPausa();
  let furia = null;
  let mortos = 0, amostras = [];
  for (let i = 0; i < 24000 && furia === null; i++) {
    frame(1);
    const inf = Batalha.info();
    if (inf.morto) mortos++;
    // status AO VIVO: níveis e equipamento mudam durante a luta (armadura
    // dropada entra sozinha), então o esperado é recalculado por frame
    const st = Personagem.status(p);
    if (!inf.morto && inf.hp > 0 && inf.hp < st.hpMax * 0.3) {
      const esp = Math.round(st.dano * 1.5);
      // lag de 1 frame: no frame do hit, os stats ainda usam o hp antigo
      // — confirmamos no frame seguinte (atualizaHeroi reprocessa)
      if (inf.dano === esp) {
        furia = true;
      } else if (amostras.length < 3) {
        amostras.push([inf.hp, inf.dano, esp]);
      }
    }
  }
  if (furia !== true) console.log('     -> debug furia:', JSON.stringify({
    mortos, furia, amostras, onda: Batalha.info().onda
  }));
  conf(furia === true,
    'fúria ao vivo: com HP < 30%, dano do herói = status × 1,5');
  if (!Batalha.info().pausada) Batalha.alternarPausa();
}

console.log('27) sistema punitivo: morte −5 ondas, −10% ouro e 2ª vida');
{
  const Batalha = sandbox.Batalha;
  const p = Game.personagem;

  if (Batalha.info().pausada) Batalha.alternarPausa();
  let espV = 0;
  while (Batalha.info().morto && espV < 900) { frame(1); espV++; }

  // --- a aba Atributos anuncia o novo patamar de pontos
  jogoCanvas._textos = [];
  clique(240, 418);                 // aba Atributos (1ª coluna)
  frame(2);
  // literal de propósito: mudança de cadência é decisão de design e
  // deve estourar este teste (spec balance-dopamina R-BAL-2: 1 por nível)
  conf((jogoCanvas._textos || [])
       .some(t => t.indexOf('A cada nível: +1 ponto') >= 0),
    'rodapé da aba Atributos anuncia 1 ponto a cada nível');

  // fixture: guerreiro de vidro, sem cura e sem fuga — o teste QUER
  // mortes determinísticas (mesma lição das seções 17/21/22)
  p.classe = 'guerreiro';
  p.nivel = 4;
  p.atributos.con = 1;
  p.atributos.for = 1;
  p.atributos.int = 8;
  p.pontos = 0;
  p.equip = { arma: null, armadura: null };
  p.bolsa = [];

  const esperaMorte = (max) => {
    for (let i = 0; i < max && !Batalha.info().morto; i++) frame(1);
    return Batalha.info().morto;
  };
  const esperaVida = (max) => {
    for (let i = 0; i < max && Batalha.info().morto; i++) frame(1);
    return !Batalha.info().morto;
  };
  const esperaOnda = (n) => {
    for (let i = 0; i < 120 &&
         (Batalha.info().onda !== n || Batalha.info().inimigos === 0); i++) {
      frame(1);
    }
  };

  // --- 1) morte: −10% do ouro e −5 ondas (sem contar onda limpa)
  // pressão ALTA (onda 90 — teto útil: acima de FIM_MAPA=100 o
  // restaurarOnda cai em passaMapa em vez de spawnar; lição da seção
  // 21): com a cota de 20s (R-TIM — cota expirada CONTA stats.ondas,
  // spec onda-timer) uma morte lenta (anel full screen: contato ~9s +
  // regen do herói de vidro) deixava a cota disparar ANTES da morte e
  // o conf de "rollback não conta" virava flake — medido: 2 falhas
  // em 4 runs com onda 12)
  Batalha.restaurarOnda(90);
  esperaOnda(90);
  conf(Batalha.info().onda === 90 && Batalha.info().inimigos > 0,
    'onda 90 assentada antes do teste');
  p.ouro = 100;
  const s1 = p.stats.ondas, m1 = p.stats.mortes;
  // relativas ao frame da morte: pathing livre pode dar kills (ouro) e
  // até limpar ondas antes do contato — a penalidade é o delta
  let oAu = p.ouro, oOn = Batalha.info().onda, morte1 = false;
  for (let i = 0; i < 9000 && !morte1; i++) {
    oAu = p.ouro;
    oOn = Batalha.info().onda;
    frame(1);
    morte1 = Batalha.info().morto;
  }
  conf(morte1, 'herói de vidro morre sob pressão (onda 12)');
  conf(p.ouro === oAu - Math.max(1, Math.floor(oAu * 0.1)),
    'morte cobra 10% do ouro (' + oAu + ' → ' + p.ouro + ')');
  conf(Batalha.info().onda === Math.max(1, oOn - 5),
    'morte volta 5 ondas (' + oOn + ' → ' + Batalha.info().onda + ')');
  conf(p.stats.mortes === m1 + 1, 'morte conta em stats.mortes');
  conf(esperaVida(600), 'renasce em 3s');
  conf(Batalha.info().onda === Math.max(1, oOn - 5) &&
       Batalha.info().inimigos > 0,
    'a onda reduzida renasce fresca no renascimento');
  conf(p.stats.ondas === s1,
    'rollback NÃO conta como onda limpa (stats.ondas intacto)');

  // --- 2) piso: onda baixa nunca sai do mapa atual
  esperaVida(900);                 // nunca entra caído (estado herdado)
  // vidro puro (nv1): com ESPERA 8 + regen, nv4 sobrevivia à onda 3 e
  // até farmava (ondas 3→11) — o piso precisa de morte em onda ≤ 6.
  // Reafirmado aqui: o teste 1) anterior deixa o herói matando ondas e
  // o auto-equip pode entregar arma (dano > 5) — sem isso ele limpa
  // ondas 3→10 na janela e "nunca morre".
  p.nivel = 1;
  p.atributos.for = 1;
  p.atributos.con = 1;
  p.atributos.int = 8;
  p.equip = { arma: null, armadura: null };
  p.bolsa = [];
  Batalha.restaurarOnda(3);
  esperaOnda(3);
  conf(Batalha.info().onda === 3 && Batalha.info().inimigos > 0,
    'onda 3 assentada antes do teste do piso');
  p.ouro = 4;
  let oAntes = p.ouro, oOn2 = Batalha.info().onda, morte2 = false;
  for (let i = 0; i < 9000 && !morte2; i++) {
    oAntes = p.ouro;                 // estado do frame ANTES da morte
    oOn2 = Batalha.info().onda;
    frame(1);
    // fixture congelada (medido: ele farmava até a onda 10 com arma +4
    // e nunca morria): drops são auto-equipados e o XP sobe de nível no
    // meio do teste — ambos fortalecem o herói. Zera depois de cada
    // frame (dentro dele o combate já usou o estado correto)
    p.equip = { arma: null, armadura: null };
    p.xp = 0;
    morte2 = Batalha.info().morto;
  }
  if (!morte2) {
    const f27 = Batalha.info();
    const tem = sandbox.Mapas.info(f27.mapa);
    console.log('    [diag27] mapa=' + f27.mapa + ' tema=' + tem.nome +
      ' onda=' + f27.onda + ' inim=' + f27.inimigos + ' hp=' + f27.hp +
      ' nv=' + p.nivel + ' comum=' + tem.inimigos.comum.tipo +
      '(' + tem.inimigos.comum.cor + ')' + ' for=' + p.atributos.for +
      ' con=' + p.atributos.con);
  }
  if (!morte2) {
    const f = Batalha.info();
    console.log('    [diag27b] onda=' + f.onda + ' inim=' + f.inimigos +
      ' hp=' + f.hp + '/' + Personagem.status(p).hpMax +
      ' nv=' + p.nivel + ' dano=' + f.dano +
      ' arma=' + (p.equip.arma ? p.equip.arma.nome + ' +' +
        (p.equip.arma.bonus && p.equip.arma.bonus.dano || 0) : 'null') +
      ' for=' + p.atributos.for + ' int=' + p.atributos.int +
      ' morto=' + f.morto + ' estado=' + f.heroi.estado);
  }
  conf(morte2, 'morre de novo (onda 3)');
  conf(Batalha.info().onda === Math.max(1, oOn2 - 5),
    'piso: volta no mínimo p/ onda 1 (' + oOn2 + ' → ' +
    Batalha.info().onda + ')');
  conf(p.ouro === oAntes - Math.max(1, Math.floor(oAntes * 0.1)),
    'ouro pequeno perde o piso de 1 (perda ≥1: ' + oAntes + ' → ' +
    p.ouro + ')');
  esperaVida(600);

  // --- 3) cofre vazio não vira dívida
  Batalha.restaurarOnda(12);
  esperaOnda(12);
  p.ouro = 0;
  let o0 = p.ouro, morte3 = false;
  for (let i = 0; i < 9000 && !morte3; i++) {
    o0 = p.ouro;                     // abordagem longa pode render kills
    frame(1);                        // (ouro) antes da morte
    morte3 = Batalha.info().morto;
  }
  conf(morte3, 'morre com o cofre vazio');
  conf(p.ouro === (o0 > 0
      ? o0 - Math.max(1, Math.floor(o0 * 0.1)) : 0),
    'ouro zero não vira dívida (base ' + o0 + ' → ' + p.ouro + ')');
  esperaVida(600);

  // --- 4) Véu da Fênix: a 1ª letalidade NÃO paga; a 2ª paga
  p.equip = { arma: null,
    armadura: { nome: 'Véu da Fênix', slot: 'armadura', rar: 4,
                escala: 1, up: 0, afixos: [], efeito: 'fenix',
                bonus: { hp: 20 } } };
  Batalha.restaurarOnda(14);       // pressão p/ 2 letalidades seguras
  esperaOnda(14);
  p.ouro = 100;
  const m4 = p.stats.mortes;
  let ondaLast = Batalha.info().onda, pagou = null;
  for (let i = 0; i < 15000 && pagou === null; i++) {
    const antes = p.ouro;
    frame(1);
    if (p.ouro < antes) {
      pagou = { onda: Batalha.info().onda,
                esperada: Math.max(1, ondaLast - 5),
                mortes: p.stats.mortes - m4,
                oAntes: antes };
    }
    ondaLast = Batalha.info().onda;
  }
  conf(pagou !== null, 'a 2ª letalidade enfim paga a penalidade');
  if (pagou) {
    conf(pagou.mortes === 1 && pagou.onda === pagou.esperada,
      'Fênix segurou a 1ª: só a morte real paga (onda ' +
      pagou.onda + '/' + pagou.esperada + ', mortes +' + pagou.mortes + ')');
    conf(p.ouro === pagou.oAntes -
         Math.max(1, Math.floor(pagou.oAntes * 0.1)),
      'ouro caiu só na morte real (' + pagou.oAntes + ' → ' + p.ouro + ')');
  }
}

console.log('28) evento: o Açougueiro (raro, uma chance, recompensa gorda)');
{
  const Batalha = sandbox.Batalha;
  const p = Game.personagem;
  const rnd = Math.random;
  Eventos.nasceAco = Eventos._nasceAco;   // religa p/ testar as rolagens

  if (Batalha.info().pausada) Batalha.alternarPausa();
  let esp0 = 0;
  while (Batalha.info().morto && esp0 < 900) { frame(1); esp0++; }

  // --- rolagens unitárias (sem arena)
  Eventos.limpa();
  conf(Eventos.nasceAco(29) === false, 'antes da onda 30 nunca aparece');
  Math.random = function () { return 0; };
  conf(Eventos.nasceAco(30) === true, 'rolagem zerada: nasce na onda 30');
  conf(Eventos.acoEmCampo() === true, 'fica em campo até derrubar/partir');
  conf(Eventos.nasceAco(31) === false, 'só um de cada vez');
  Eventos.acoPartiu();
  Math.random = function () { return 0.99; };   // falha sempre (teto 25%)
  for (let i = 0; i < 50; i++) Eventos.nasceAco(32);
  Math.random = function () { return 0.20; };
  const saiu = Eventos.nasceAco(33);
  Math.random = rnd;
  conf(saiu, 'pity: 50 ondas sem aparecer garante (teto 25%)');
  Eventos.acoPartiu();
  Math.random = function () { return 0; };
  Eventos.nasceAco(34);
  Math.random = rnd;
  conf(!Eventos.atualizaAco(Eventos.TEMPO_ACO - 0.1) &&
       Eventos.atualizaAco(0.2),
    'parte depois de 45s em campo');
  Eventos.acoPartiu();

  // --- spawn ao vivo + vitória (herói de for 999, RNG zerado p/ exato)
  p.atributos.for = 999;
  p.atributos.con = 999;
  p.atributos.int = 8;
  p.pontos = 0;
  p.classe = 'guerreiro';
  p.equip = { arma: null, armadura: null };
  p.bolsa = [];
  Batalha.restaurarOnda(30);
  Eventos.limpa();
  jogoCanvas._textos = [];
  Math.random = function () { return 0; };
  for (let i = 0; i < 5 && !Batalha.info().acougueiro; i++) frame(1);
  Math.random = rnd;
  conf(Batalha.info().acougueiro, 'nasce na arena com aviso');
  conf((jogoCanvas._textos || []).some(t => t.indexOf('CARNE FRESCA') >= 0),
    'aviso "CARNE FRESCA!" na tela');

  const ac0 = p.stats.acougueiros;
  const ouroA = p.ouro || 0;
  Math.random = function () { return 0; };   // ouro determinístico
  let matou = false;
  for (let i = 0; i < 12000 && !matou; i++) {
    frame(1);
    matou = p.stats.acougueiros > ac0;
  }
  Math.random = rnd;
  conf(matou, 'herói forte derruba o Açougueiro');
  conf(p.stats.acougueiros === ac0 + 1, 'stats.acougueiros conta +1');
  // RNG zerado e ×10 POR DENTRO do arredondamento: onda 30 (ondaTotal 29)
  // → Açougueiro round(1×1×2,2×10)=22 + minions round(2,2)=2 cada.
  // Faixa, não exato: a geometria de spawn pode deixar 1 minion fora do
  // primeiro golpe. Sem ×10 o delta máximo seria 12 — ≥22 prova o 10×.
  const dOuro = (p.ouro || 0) - ouroA;
  // o CARISMA também multiplica o ouro (spec gestao-atributos: ele saiu
  // do XP e virou economia) — o esperado leva o fator em conta
  const fCar = Personagem.multOuroCar(p.atributos.car || 8);
  const espMin = Math.round(22 * fCar) - 4, espMax = Math.round(40 * fCar) + 4;
  conf(dOuro >= espMin && dOuro <= espMax,
    'ouro ×10 na vitória × carisma (delta ' + dOuro + ', faixa ' +
    espMin + '..' + espMax + ', car ×' + fCar.toFixed(2) + ')');
  const leg = [p.equip.arma, p.equip.armadura].concat(p.bolsa)
    .some(i => i && i.rar === 4);
  conf(leg, 'lendário garantido no saque');

  // a cutscene do evento (Açougueiro) ainda está no ar — o jogador
  // dispensaria antes de usar a UI (spec cutscenes: auto-dismiss 3,5s)
  sandbox.Cutscene.fecha();
  jogoCanvas._textos = [];
  clique(528, 418);            // aba Stats
  frame(1);
  conf((jogoCanvas._textos || [])
       .some(t => t.indexOf('Açougueiros abatidos') >= 0),
    'aba Stats lista os Açougueiros');
  clique(240, 418);                           // volta pra Atributos
  frame(1);

  // --- morte com o predador em campo: penalidade EM DOBRO + despawn
  p.classe = 'guerreiro';
  p.nivel = 4;
  p.atributos.con = 1;
  p.atributos.for = 1;
  p.atributos.int = 8;
  p.pontos = 0;
  p.equip = { arma: null, armadura: null };
  Batalha.restaurarOnda(30);
  Eventos.limpa();
  Math.random = function () { return 0; };
  for (let i = 0; i < 5 && !Batalha.info().acougueiro; i++) frame(1);
  Math.random = rnd;
  conf(Batalha.info().acougueiro, 'predador na arena p/ o teste da morte');
  p.ouro = 100;
  let oAu = p.ouro, oOn = Batalha.info().onda, morreuA = false;
  for (let i = 0; i < 9000 && !morreuA; i++) {
    oAu = p.ouro;
    oOn = Batalha.info().onda;
    frame(1);
    morreuA = Batalha.info().morto;
  }
  conf(morreuA, 'herói de vidro morre com o predador em campo');
  conf(p.ouro === oAu - Math.max(1, Math.floor(oAu * 0.2)),
    'penalidade DOBRADA: −20% do ouro (' + oAu + ' → ' + p.ouro + ')');
  conf(Batalha.info().onda === Math.max(1, oOn - 10),
    'penalidade DOBRADA: −10 ondas (' + oOn + ' → ' +
    Batalha.info().onda + ')');
  let rvA = 0;
  while (Batalha.info().morto && rvA < 900) { frame(1); rvA++; }
  conf(!Batalha.info().morto, 'renasce em 3s');
  conf(Batalha.info().acougueiro === false,
    'morte do herói despacha o Açougueiro (uma chance só)');
  Eventos.nasceAco = SEM_ACO;          // silêncio de novo (29 só gatuno)
}

console.log('29) evento: o Gatuno (rouba, foge, resgate)');
{
  const Batalha = sandbox.Batalha;
  const p = Game.personagem;
  const rnd = Math.random;
  Eventos.nasceGat = Eventos._nasceGat;  // religa o Gatuno

  if (Batalha.info().pausada) Batalha.alternarPausa();
  let esp1 = 0;
  while (Batalha.info().morto && esp1 < 900) { frame(1); esp1++; }

  // --- unidade: roubo, carência (CADA chamada decrementa), resgate,
  // timeout. Livro-caixa: nascer põe carência=3; são necessárias 3
  // chamadas bloqueadas até a próxima aparição.
  Eventos.limpa();
  conf(Eventos.nasceGat(0) === 0, 'sem ouro não há roubo');
  Math.random = function () { return 0; };
  conf(Eventos.nasceGat(100) === 15, 'rouba 15% (100 → 15)');
  conf(Eventos.nasceGat(100) === 0, 'carência em ação (3 → 2)');
  conf(Eventos.gatAbatido() === 18, 'resgate = roubo ×1,2 (15 → 18)');
  conf(Eventos.nasceGat(100) === 0, 'carência (2 → 1)');
  conf(Eventos.nasceGat(100) === 0, 'carência (1 → 0)');
  conf(Eventos.nasceGat(100) === 15, 'acabada a carência, rouba de novo');
  Eventos.gatFugiu();
  conf(Eventos.nasceGat(50) === 0, 'nova aparição reinicia (3 → 2)');
  conf(Eventos.nasceGat(50) === 0, 'carência (2 → 1)');
  conf(Eventos.nasceGat(50) === 0, 'carência (1 → 0)');
  conf(Eventos.nasceGat(50) === 8, 'roubo recalculado (50 → 8)');
  Eventos.gatFugiu();
  conf(Eventos.nasceGat(50) === 0, 'carência (3 → 2)');
  conf(Eventos.nasceGat(50) === 0, 'carência (2 → 1)');
  conf(Eventos.nasceGat(50) === 0, 'carência (1 → 0)');
  conf(Eventos.nasceGat(50) === 8, 'em campo p/ o teste do timeout');
  Math.random = rnd;
  conf(!Eventos.atualizaGat(Eventos.TEMPO_GAT - 0.1) &&
       Eventos.atualizaGat(0.2),
    'desiste da fuga após 30s emperrado');
  Eventos.gatFugiu();

  // --- rollback de morte: reiniciaOnda resolve Enxame/Gatuno (o estado
  // não pode sobreviver à onda refeita: senão o ×1,5 do Enxame valia na
  // onda nova e o gatuno removido deixava o aviso fantasma 30s depois)
  Eventos.limpa();
  Math.random = function () { return 0; };
  conf(Eventos._nasceEnxame(20) && Eventos.multEnxame() === 1.5,
    'enxame ativo vale ×1,5');
  conf(Eventos.nasceGat(100) === 15 && Eventos.gatEmCampo(),
    'gatuno em campo antes do rollback');
  Eventos.reiniciaOnda();
  conf(Eventos.multEnxame() === 1 && !Eventos.gatEmCampo(),
    'rollback encerra o enxame e resolve o gatuno (sem estado órfão)');
  Math.random = rnd;

  // --- resgate ao vivo: RNG zerado → geometria e ouro exatos.
  // spawn no anel full screen (≈460px com RNG zerado; limite de fuga =
  // anel+120 — R-MF-2) e for 999: o herói alcança antes da fuga
  p.classe = 'guerreiro';
  p.nivel = 10;
  p.atributos.for = 999;
  p.atributos.con = 999;
  p.atributos.des = 8;
  p.atributos.int = 8;
  p.pontos = 0;
  p.equip = { arma: null, armadura: null };
  p.bolsa = [];
  // RNG zerado ANTES do spawn: o anel (ângulo/dist) e o atkCd dos
  // monstros usam Math.random — com vivo, a geometria variava entre
  // rodadas e o desfecho do resgate flutuava (flake)
  Math.random = function () { return 0; };
  Batalha.restaurarOnda(1);
  Eventos.limpa();
  p.ouro = 100;
  const o0 = p.ouro;
  jogoCanvas._textos = [];
  for (let i = 0; i < 5 && !Batalha.info().gatuno; i++) frame(1);
  conf(Batalha.info().gatuno, 'nasce e rouba na arena');
  conf(p.ouro === o0 - 15, 'roubo debitado na hora (100 → ' + p.ouro + ')');
  conf((jogoCanvas._textos || []).some(t => t.indexOf('GATUNO ROUBOU') >= 0),
    'aviso do roubo na tela');
  let pegou = false;
  for (let i = 0; i < 6000 && !pegou; i++) {
    frame(1);
    pegou = p.stats.gatunos > 0;
    if (i % 600 === 0) console.log('    [dbg gat] i=' + i + ' gat=' +
      Batalha.info().gatuno + ' morto=' + Batalha.info().morto +
      ' estado=' + Batalha.info().heroi.estado +
      ' mapa=' + Batalha.info().mapa + ' onda=' + Batalha.info().onda +
      ' pausada=' + Batalha.info().pausada);
  }
  Math.random = rnd;
  conf(pegou, 'alcança e derruba o Gatuno (prioridade na IA)');
  conf(p.stats.gatunos === 1, 'stats.gatunos conta +1');
  // RNG zerado: −15 do roubo + 18 de resgate +1 do kill do próprio
  // ladrão +0..3 dos slimes da onda 1 (dependem da geometria do spawn)
  conf(p.ouro >= o0 + 4 && p.ouro <= o0 + 7,
    'resgate pago (100 → ' + p.ouro + ', faixa 104..107)');

  // --- fuga: o ladrão some (borda ou desistência) e o roubo NÃO volta.
  // Herói de vidro: ele morre antes de barrar — e se morrer, a perda é
  // explicada EXATAMENTE pela penalidade normal (−10%/morte, sem ×2 —
  // sem Açougueiro em campo)
  p.atributos.for = 1;
  p.atributos.con = 1;
  p.atributos.des = 1;
  p.nivel = 1;
  // RNG zerado ANTES do spawn (geometria/atkCd fixos — mesma lição da
  // parte 1): com vivo, o anel variava entre rodadas e o herói às vezes
  // alcançava o ladrão antes de morrer (flake do "sem resgate")
  Math.random = function () { return 0; };
  Batalha.restaurarOnda(30);
  Eventos.limpa();
  p.ouro = 100;
  jogoCanvas._textos = [];
  for (let i = 0; i < 5 && !Batalha.info().gatuno; i++) frame(1);
  conf(Batalha.info().gatuno, 'roubador em campo (tento a fuga)');
  const roubado = p.ouro;
  const mortes1 = p.stats.mortes;
  const rec1 = p.stats.danoRecebido || 0;
  const cat1 = p.stats.gatunos;
  let sumiu = false, tSaiu = -1;
  for (let i = 0; i < 9000 && !sumiu; i++) {
    frame(1);
    sumiu = !Batalha.info().gatuno;
    if (sumiu) tSaiu = i;
  }
  Math.random = rnd;
  // resumo do ramo (diagnóstico permanente: o desfecho do Gatuno é
  // corrida entre perseguição do herói e fuga/desistência — ver qual
  // caminho cada run tomou)
  const txtos = (jogoCanvas._textos || []).join('|');
  const desfecho = txtos.indexOf('ESCAPOU') >= 0 ? 'ESCAPOU' :
    (txtos.indexOf('DESISTIU') >= 0 ? 'DESISTIU' : 'ABATIDO?');
  const mortes2 = p.stats.mortes - mortes1;
  console.log('    [gat2] ' + desfecho + ' em ' +
    (tSaiu * 16.7 / 1000).toFixed(1) + 's | resgates+=' +
    (p.stats.gatunos - cat1) + ' | mortes+=' + mortes2 + ' | dano+=' +
    ((p.stats.danoRecebido || 0) - rec1) + ' | ouro ' + roubado + '→' +
    p.ouro + ' | onda ' + Batalha.info().onda + ' | inim ' +
    Batalha.info().inimigos + ' | hp ' + Math.round(Batalha.info().hp || 0));
  conf(sumiu, 'some da arena (fuga na borda ou desistência)');
  conf(p.stats.gatunos === 1, 'sem resgate: stats não muda');
  let esperado = roubado;
  for (let k = 0; k < mortes2; k++) {
    esperado -= Math.max(1, Math.floor(esperado * 0.1));
  }
  conf(p.ouro === esperado,
    'o roubo não volta (roubado ' + roubado + ', mortes +' + mortes2 +
    ' → ' + p.ouro + ')');
  conf((jogoCanvas._textos || []).some(t => t.indexOf('GATUNO') >= 0),
    'aviso do desfecho na tela');
  Eventos.nasceGat = SEM_GAT;         // silêncio de novo (fim das seções 29)
}

console.log('30) tooltips: breakdown do rodapé, atributos e item');
{
  const UI = sandbox.UI;
  const Batalha = sandbox.Batalha;
  const p = Game.personagem;
  const mm = (x, y) => (jogoCanvas._listeners.mousemove || [])
    .forEach(fn => fn({ clientX: x * 2, clientY: y * 2 }));

  if (Batalha.info().pausada) Batalha.alternarPausa();

  // --- statusDetalhado: as partes somam o stat (com keystone ativo)
  p.classe = 'guerreiro';
  p.nivel = 30;
  p.atributos.for = 50;
  p.atributos.des = 20;
  p.atributos.con = 40;
  p.atributos.int = 12;
  p.atributos.car = 20;
  p.pontos = 0;
  p.keystoneLib = true;
  p.keystoneOn = true;              // Fúria Incontida: dano ×1,35 / HP ×0,8
  p.equip = { arma: { nome: 'A', slot: 'arma', rar: 2, escala: 1, up: 2,
                      afixos: [], bonus: { dano: 10 },
                      efeito: 'vampiro' }, armadura: null };
  const soma = (d) => d.partes.reduce((a, x) => a + x.v, 0);
  const sD = Personagem.status(p);
  const det = Personagem.statusDetalhado(p);
  conf(Math.round(soma(det.dano) * det.dano.mult.v) === sD.dano,
    'dano detalhado: Σpartes × keystone = status');
  conf(Math.round(soma(det.hp) * det.hp.mult.v) === sD.hpMax,
    'HP detalhado: Σpartes × keystone = status');
  conf(soma(det.vel) === sD.vel && soma(det.crit) === sD.crit,
    'velocidade e crítico: Σpartes = status (keystone não mexe neles)');
  // os rótulos do detalhamento saem da CONSTANTE (o texto já disse 9×
  // quando o multiplicador virou 3×)
  conf(Personagem.PONTO_MULT === 3 &&
       det.dano.partes.some(x => x.rot.indexOf(Personagem.PONTO_MULT + '×') >= 0) &&
       !det.dano.partes.some(x => x.rot.indexOf('9×') >= 0) &&
       !det.hp.partes.some(x => x.rot.indexOf('9×') >= 0),
    'rótulos do detalhamento usam PONTO_MULT (sem 9× fixo)');
  // XP saiu dos status derivados (spec gestao-atributos): a renda é a
  // calibrada, sem multiplicador de build
  conf(!('xp' in det) && !('xpMult' in sD),
    'XP não é mais status derivado (sem xpMult)');
  conf(det.dps.total ===
       Math.round(sD.dano * (1 + sD.crit / 100) / sD.recarga),
    'DPS = dano × (1 + crít/100) ÷ recarga');
  p.keystoneOn = false;
  const detOff = Personagem.statusDetalhado(p);
  conf(!detOff.dano.mult &&
       soma(detOff.dano) === Personagem.status(p).dano,
    'sem keystone as partes somam direto');
  conf(det.dano.notas.length === 1 && det.dps.notas.length === 1 &&
       det.dano.notas[0].indexOf('Sangue Frio') >= 0,
    'nota do lendário ativo (Sangue Frio) acompanha o detalhe');

  // --- rodapé segmentado: hover abre o breakdown (varre segmentos)
  let tooltip = false, acheiDps = false;
  // varredura fina: o rodapé recentra conforme o tamanho dos textos
  // (o 'Vel' encurtou na spec ajustes-playtest-3) e há intervalos de
  // ~26px (' · ') sem tooltip — xs fixos caíam neles
  for (let x = 40; x <= 660 && !acheiDps; x += 20) {
    jogoCanvas._textos = [];
    clique(x, 356);                 // y do rodapé (sem botão ali)
    for (let i = 0; i < 25; i++) frame(1);
    const ts = jogoCanvas._textos || [];
    if (ts.some(t => t.indexOf('= ') >= 0)) tooltip = true;
    if (ts.some(t => t.indexOf('DPS básico') >= 0)) { acheiDps = true; break; }
  }
  conf(tooltip, 'hover no rodapé abre o breakdown (título com o total)');
  conf(acheiDps, 'segmento DPS expõe a conta (dano × (1+crít) ÷ recarga)');

  // --- tooltip do item completo (cabeçalho da aba Itens)
  clique(456, 418);                 // aba Itens
  frame(2);
  jogoCanvas._textos = [];
  clique(500, 96);                 // texto da arma (não é botão)
  for (let i = 0; i < 25; i++) frame(1);
  conf((jogoCanvas._textos || []).some(t => t.indexOf('Vende ') >= 0),
    'cabeçalho da arma abre o tooltip completo (venda/sucata/custos)');

  // --- tooltip do atributo (linha da INT)
  clique(240, 418);                 // aba Atributos
  frame(2);
  jogoCanvas._textos = [];
  clique(500, 180);                // linha INT (i=3 → y=180)
  for (let i = 0; i < 25; i++) frame(1);
  conf((jogoCanvas._textos || []).some(t => t.indexOf('agudeza da IA') >= 0),
    'linha do INT explica a agudeza da IA');

  // --- long-press: prende 500ms, solta e o ponteiro SAI sem clicar →
  // a caixa retida continua (só um clique fora fecha)
  jogoCanvas._textos = [];
  // alvo = linha do INT (dica de painel, coordenada fixa): o rodapé
  // recentra com o tamanho do texto e xs fixos caíam fora dos retângulos
  pressionar(500, 180);             // mouse down sobre a linha da INT
  for (let i = 0; i < 40; i++) frame(1);   // ~670ms: hover + prensa
  soltar();
  for (let i = 0; i < 3; i++) frame(1);
  mm(150, 150);                     // move SEM clicar (arena, neutro)
  jogoCanvas._textos = [];
  for (let i = 0; i < 3; i++) frame(1);
  conf((jogoCanvas._textos || []).some(t => t.indexOf('= ') >= 0),
    'long-press: caixa fica retida após soltar e mover sem clicar');
  clique(150, 150);                 // clique fora fecha
  jogoCanvas._textos = [];
  for (let i = 0; i < 3; i++) frame(1);
  conf(!(jogoCanvas._textos || []).some(t => t.indexOf('= ') >= 0),
    'clique fora fecha a caixa retida');
}

console.log('31) estatísticas de economia e tooltips de skill/keystone/stats');
{
  const Itens = sandbox.Itens;
  const Batalha = sandbox.Batalha;
  const p = Game.personagem;

  if (Batalha.info().pausada) Batalha.alternarPausa();

  // --- increments das ações de economia (chaves espelhadas em STATS)
  p.ouro = 1000;
  p.equip = { arma: null, armadura: null };
  p.bolsa = [];
  const s0 = p.stats;
  const g0 = s0.ouroGanho || 0, gT = s0.ouroGasto || 0;
  const v0 = s0.vendidos || 0, sc0 = s0.sucateados || 0;
  const a0 = s0.aprimoramentos || 0, r0 = s0.rerolls || 0;
  const itV = { nome: 'V', slot: 'arma', rar: 2, escala: 1, up: 0,
                afixos: [], bonus: { dano: 10 } };
  Itens.guardar(p, itV);
  Itens.vender(p, itV);
  conf(s0.vendidos === v0 + 1 && s0.ouroGanho === g0 + 15,
    'venda conta em vendidos + ouroGanho (+15)');
  const itS = { nome: 'S', slot: 'arma', rar: 1, escala: 1, up: 0,
                afixos: [], bonus: { dano: -8 } };
  Itens.guardar(p, itS);
  Itens.sucatear(p, itS);
  conf(s0.sucateados === sc0 + 1 && s0.ouroGanho === g0 + 18,
    'sucata conta em sucateados + ouroGanho (+3)');
  p.ouro = 0;
  for (let i = 0; i < Itens.BOLSA_MAX; i++) {
    Itens.guardar(p, { nome: 'X' + i, slot: 'arma', rar: 1, escala: 1,
                       up: 0, afixos: [], bonus: { dano: 1 } });
  }
  Itens.guardar(p, { nome: 'Novo', slot: 'arma', rar: 1, escala: 1,
                     up: 0, afixos: [], bonus: { dano: 2 } });
  conf(s0.sucateados === sc0 + 2 && s0.ouroGanho === g0 + 21,
    'bolsa cheia conta a sucata automática (+3 de ouro)');
  p.ouro = 1000;
  const itA = { nome: 'A', slot: 'arma', rar: 2, escala: 1, up: 0,
                afixos: [], bonus: { dano: 10 } };
  Itens.aprimorar(p, itA);
  conf(s0.aprimoramentos === a0 + 1 && s0.ouroGasto === gT + 25,
    'aprimoramento conta em aprimoramentos + ouroGasto (+25)');
  const itR = { nome: 'R', base: 'R', slot: 'arma', rar: 3, escala: 1,
                up: 0, rerolls: 0, bonus: { dano: 8 },
                afixos: [{ nome: 'Poderoso', tipo: 'pre', chave: 'dano',
                           neg: false, valor: 5 }] };
  const rndR = Math.random;
  Math.random = function () { return 0.99; };
  Itens.reroll(p, itR);
  Math.random = rndR;
  conf(s0.rerolls === r0 + 1 && s0.ouroGasto === gT + 25 + 30,
    're-roll conta em rerolls + ouroGasto (+30 = 10×3×1)');
  conf((s0.lendarios || 0) >= 1,
    'drop lendário contado (vitória do Açougueiro na seção 28)');
  conf((s0.ouroGanho || 0) > 0, 'ouro de abates contado em ouroGanho');

  // --- tooltip da linha de estatística (aba Stats)
  jogoCanvas._textos = [];
  clique(528, 418);          // aba Stats
  frame(1);
  clique(500, 120);                        // linha 'Abates' (y=120)
  for (let i = 0; i < 25; i++) frame(1);
  conf((jogoCanvas._textos || [])
       .some(t => t.indexOf('Monstros derrotados') >= 0),
    'tooltip da estatística explica o que ela conta');

  // --- tooltip da skill (linha da aba Classe)
  p.nivel = 45;
  clique(384, 418);                         // aba Classe
  frame(2);
  jogoCanvas._textos = [];
  clique(500, 190);                        // 1ª skill da classe (y=178..202)
  for (let i = 0; i < 25; i++) frame(1);
  conf((jogoCanvas._textos || [])
       .some(t => t.indexOf('golpes') >= 0),
    'tooltip da skill explica o efeito (a cada N golpes)');

  // --- tooltip do keystone (sem ouro: botão desativado não alterna)
  p.ouro = 0;
  const keOn = p.keystoneOn;
  jogoCanvas._textos = [];
  clique(500, 318);                        // botão keystone (y=306..330)
  for (let i = 0; i < 25; i++) frame(1);
  conf((jogoCanvas._textos || [])
       .some(t => t.indexOf('tradeoff') >= 0),
    'tooltip do keystone expõe o tradeoff e os custos');
  conf(p.keystoneOn === keOn,
    'botão desativado sem ouro não alterna o keystone');
}

console.log('32) correções de IA/combate: colado, encurralado, DES e tooltip');
{
  const Batalha = sandbox.Batalha;
  const UI = sandbox.UI;
  const p = Game.personagem;
  const mm = (x, y) => (jogoCanvas._listeners.mousemove || [])
    .forEach(fn => fn({ clientX: x * 2, clientY: y * 2 }));

  if (Batalha.info().pausada) Batalha.alternarPausa();
  let e0 = 0;
  while (Batalha.info().morto && e0 < 900) { frame(1); e0++; }

  // --- 1) ranged ataca mesmo COLADO (<0.7×alcance) — bug clássico do
  // kite: 7815 frames de inimigo colado davam 0 golpes
  p.classe = 'mago';
  p.nivel = 4;                    // sem skills: só o golpe básico conta
  p.atributos.for = 40;
  p.atributos.con = 999;
  p.atributos.int = 12;
  p.atributos.des = 8;
  p.pontos = 0;
  p.equip = { arma: null, armadura: null };
  p.bolsa = [];
  Batalha.restaurarOnda(3);
  const alc = Personagem.status(p).alcance;
  const limiar = Math.round(alc * 0.7);
  let colado = 0, danoColado = 0, ult = p.stats.danoCausado;
  let golpeColado = 0, atkAntes = false;
  for (let i = 0; i < 9000; i++) {
    frame(1);
    const f = Batalha.info();
    const perto = f.inimigoPerto >= 0 && f.inimigoPerto < limiar;
    if (perto) {
      colado++;
      danoColado += p.stats.danoCausado - ult;
      if (f.atacando && !atkAntes) golpeColado++;
    }
    ult = p.stats.danoCausado;
    atkAntes = f.atacando;
  }
  conf(colado > 500 && golpeColado > 0,
    'ranged ataca com o inimigo colado (' + colado + ' frames perto, ' +
    golpeColado + ' golpes, ' + danoColado + ' de dano)');

  // --- 2) destino de fuga NUNCA fora do mapa (INT alta)
  p.classe = 'mago';
  p.nivel = 4;
  p.atributos.con = 1;
  p.atributos.for = 1;
  p.atributos.int = 50;           // agu 1.0: recuar/kite direto
  p.atributos.des = 8;
  p.pontos = 0;
  Batalha.restaurarOnda(30);
  e0 = 0;
  while (Batalha.info().morto && e0 < 900) { frame(1); e0++; }
  let fugas = 0, fora = 0, emRocha = 0, maxD = 0;
  let prevDest = null, setsLonge = 0, staleLonge = 0;
  for (let i = 0; i < 9000; i++) {
    frame(1);
    const f = Batalha.info();
    if ((f.heroi.estado === 'recuar' || f.heroi.estado === 'kite') &&
        f.destino) {
      fugas++;
      const d = f.destino;
      // spec mapa-infinito R-INF-3: sem mundo, o teto é a DISTÂNCIA
      // ao herói (FUGA_MAX = 96) — era: limites com margem 16 no
      // mundo 384×268
      const ddx = d.x - f.heroi.x, ddy = d.y - f.heroi.y;
      const dist = Math.sqrt(ddx * ddx + ddy * ddy);
      const novoDest = !prevDest || prevDest.x !== d.x || prevDest.y !== d.y;
      if (dist > 120) { if (novoDest) setsLonge++; else staleLonge++; }
      if (dist > maxD) maxD = dist;
      if (dist > 97) fora++;
      // evasão de cerco (spec ia-heroi): fuga nunca pousa em rocha
      if (sandbox.IA.celulaObst(d.x, d.y, 6)) emRocha++;
      prevDest = { x: d.x, y: d.y };
    } else prevDest = null;
  }
  // Limiar = clamp por DECISÃO + drift entre TICKs: o destino nasce
  // ≤96px do herói (clampFuga a cada TICK = 0,2s), mas entre decisões
  // o herói anda (vel×0,2 — e pode desviar numa rocha, afastando o
  // destino guardado). Medido (lição: contrato tem que medir o que o
  // código garante): ~0,3% dos frames levemente acima de 97 = puro
  // drift; um clamp ROTO daria coordenadas de mundo (200+px) — bem
  // acima do limiar.
  const velHer = (Personagem.status(p).vel || 70);
  const limFuga = 96 + velHer * 0.3 + 6;
  conf(fugas > 500 && maxD <= limFuga,
    'destino de fuga sempre perto do herói (' + fugas + ' fugas, máx ' +
    maxD.toFixed(0) + 'px ≤ ' + limFuga.toFixed(0) + ' = 96 + vel×TICK; ' +
    fora + ' frame(s) só no drift entre decisões; >120px: ' +
    setsLonge + ' em destino NOVO, ' + staleLonge + ' em destino antigo)');
  // tolerância de 1%: a evasão já escolhe fora de rocha (ponto
  // arredondado), mas quando TODOS os candidatos estão bloqueados o
  // fallback é o slot de sempre (documentado na spec) — caso raro
  const tetoRocha = Math.max(2, Math.round(fugas * 0.01));
  conf(emRocha <= tetoRocha,
    'destino de fuga quase nunca cai em rocha (' + emRocha + '/' + fugas +
    ', teto ' + tetoRocha + ')');

  // --- 3) DES volta a acelerar o ataque (ciclo = recarga, não 0,36s)
  // Mesma onda fraca p/ dois heróis: conta golpes em janela igual.
  function golpesComDes(des) {
    p.classe = 'guerreiro';
    p.nivel = 20;
    // for=1: o herói NÃO mata os inimigos da onda 15 em 10s → combate
    // contínuo e o golpe é limitado pela RECARGA (com for=999 o 1-shot
    // fazia os dois casos darem o mesmo nº de golpes)
    p.atributos.for = 1;
    p.atributos.con = 999;
    p.atributos.int = 8;
    p.atributos.des = des;
    p.atributos.car = 8;
    p.pontos = 0;
    p.equip = { arma: null, armadura: null };
    // slots travados: com Math.random zerado TODO abate dropa e o
    // auto-equip equipava arma no meio da janela — o des300 limpava a
    // onda (semInim=124) e a medição virava 1,3×. Travado, o drop vai
    // pra bolsa (inofensivo) e o herói de for=1 segue sem matar.
    const travaAnt = p.trava;
    p.trava = { arma: true, armadura: true };
    // RNG ZERADO na janela inteira (padrão da seção do drop): o atkCd
    // inicial dos inimigos (0,5+rand×0,8), o ruído da IA e o ângulo de
    // spawn usam Math.random — sem o zerar a medição flutuava entre
    // rodadas (razão 1,3-1,6 = corte de conf em cima do ruído). Zerado
    // desde o spawn, a janela de contagem é 100% determinística.
    const rnd0 = Math.random;
    Math.random = function () { return 0; };
    Batalha.restaurarOnda(15);
    let ee = 0;
    while (Batalha.info().morto && ee < 900) { frame(1); ee++; }
    // espera o inimigo colado
    for (let i = 0; i < 3000 && Batalha.info().inimigoPerto > 55; i++) {
      frame(1);
    }
    let n = 0, antes = false, semInim = 0, arma = 0;
    for (let i = 0; i < 900; i++) {
      frame(1);
      const f = Batalha.info();
      if (f.inimigos === 0) semInim++;
      if (p.equip.arma) arma++;
      const emRange = f.inimigoPerto >= 0 && f.inimigoPerto <= 60;
      if (emRange && f.atacando && !antes) n++;
      antes = f.atacando;
    }
    Math.random = rnd0;
    p.trava = travaAnt;
    return { n, semInim, arma, inim: Batalha.info().inimigos,
             onda: Batalha.info().onda };
  }
  // spec gestao-atributos: a curva da vel é SATURANTE — a aceleração
  // existe mas é menor que a antiga linear (DES 300 = 132 px/s, não
  // 946). Ponto distante o suficiente p/ a diferença ser visível.
  // Estabilizado (lição: corte de conf não pode ficar em cima do
  // ruído — este teste caiu 5× em uma só leva): Math.random ZERADO
  // desde o spawn da janela (padrão da seção do drop) + slots de equip
  // travados (zerado, todo abate dropa e o auto-equip limpava a onda)
  // → medição 100% determinística (25/35 em 7 rodadas). Corte 1,3 =
  // margem contra jitter residual do frame; a saturação segue provada
  // (linear antigo daria razão ~13×; o piso é ~1,4).
  const r8 = golpesComDes(8);      // vel 70  → recarga 0,50s
  const r300 = golpesComDes(300);  // vel 132 → recarga 0,27s
  const g8 = r8.n, g62 = r300.n;
  if (!(g8 > 4 && g62 >= Math.round(g8 * 1.3))) {
    console.log('    [diagDES] des8: semInim=' + r8.semInim +
      ' arma=' + r8.arma + ' fim inim=' + r8.inim + ' onda=' + r8.onda +
      ' || des300: semInim=' + r300.semInim + ' arma=' + r300.arma +
      ' fim inim=' + r300.inim + ' onda=' + r300.onda);
  }
  conf(g8 > 4 && g62 >= Math.round(g8 * 1.3),
    'DES acelera o ataque (curva saturante: des8=' + g8 +
    ' golpes/10s, des300=' + g62 + ', razão ' +
    (g62 / Math.max(1, g8)).toFixed(1) + '×)');

  // --- 4) tooltip da linha de atributo NÃO abre pelo botão −
  jogoCanvas._textos = [];
  clique(240, 418);                 // aba Atributos
  frame(2);
  // y da 1ª linha = 96; botão − em 684..708 × 84..108
  mm(694, 96);                     // mouse SOBRE o −
  for (let i = 0; i < 40; i++) frame(1);   // ~670ms > delay 250ms
  // marcador específico do tooltip ('Valor atual: N') — o rótulo
  // 'Força' é desenhado o tempo todo e não distingue
  const abriuNoMenos = (jogoCanvas._textos || [])
    .some(t => t.indexOf('Valor atual') >= 0 ||
               t.indexOf('FOR: dano') >= 0);
  conf(!abriuNoMenos,
    'segurar o − não abre o tooltip da linha');
  mm(500, 96);                     // mouse no rótulo (deve abrir)
  jogoCanvas._textos = [];
  for (let i = 0; i < 40; i++) frame(1);
  conf((jogoCanvas._textos || [])
       .some(t => t.indexOf('FOR: dano') >= 0),
    'hover no rótulo abre o tooltip normalmente');
}

console.log('33) gestão: fixar slot, auto-aprimorar e stats base→total');
{
  const Itens = sandbox.Itens;
  const Batalha = sandbox.Batalha;
  const p = Game.personagem;

  if (Batalha.info().pausada) Batalha.alternarPausa();
  let e1 = 0;
  while (Batalha.info().morto && e1 < 900) { frame(1); e1++; }

  // --- flags nascem desligadas e sobrevivem à normalização
  const pn = sandbox.Personagem.novo();
  conf(pn.trava && pn.trava.arma === false && pn.trava.armadura === false &&
       pn.autoApr === false,
    'herói novo: slots soltos e auto A+ desligado');
  const pnorm = sandbox.Personagem.normalizar({ nivel: 5 });
  conf(pnorm.trava.arma === false && pnorm.autoApr === false,
    'save antigo ganha trava/autoApr com default seguro');

  // --- fixar slot: equiparSeMelhor respeita a trava
  p.equip = { arma: { nome: 'A', slot: 'arma', rar: 2, escala: 1, up: 0,
                      afixos: [], bonus: { dano: 10 } }, armadura: null };
  p.bolsa = [];
  p.trava = { arma: true, armadura: false };
  const melhor = { nome: 'B', slot: 'arma', rar: 3, escala: 1, up: 0,
                   afixos: [], bonus: { dano: 99 } };
  conf(Itens.equiparSeMelhor(p, melhor) === false &&
       p.equip.arma.nome === 'A',
    'slot fixado: drop melhor NÃO substitui (vai p/ bolsa)');
  conf(Itens.guardar(p, melhor) === true && p.equip.arma.nome === 'A',
    'drop foi guardado na bolsa em vez de equipado');
  p.trava.arma = false;
  conf(Itens.equiparSeMelhor(p, Itens.normalizaItem
         ? Itens.normalizaItem(melhor, 'arma') : melhor) === true ||
       p.equip.arma.nome === 'B',
    'slot solto: equipar volta a funcionar');

  // --- botão [x] da UI alterna a trava
  p.trava = { arma: false, armadura: false };
  clique(456, 418);                 // aba Itens
  frame(2);
  clique(656, 96);                 // centro do [x] da arma (640..672 × 84..108)
  frame(1);
  conf(p.trava.arma === true,
    'clique no checkbox fixa a arma');
  clique(656, 96);
  frame(1);
  conf(p.trava.arma === false,
    'clique de novo solta a arma');
  clique(656, 124);                // [x] da armadura (112..136)
  frame(1);
  conf(p.trava.armadura === true,
    'checkbox da armadura é independente');
  p.trava = { arma: false, armadura: false };

  // --- auto-aprimorar: só gasta quando ligado, respeita saldo
  // batalha PAUSADA: sem kills nem penalidade de morte mexendo no ouro
  if (!Batalha.info().pausada) Batalha.alternarPausa();
  p.equip = { arma: { nome: 'A', slot: 'arma', rar: 2, escala: 1, up: 0,
                      afixos: [], bonus: { dano: 10 } }, armadura: null };
  p.ouro = 0;
  p.autoApr = false;
  const apr0 = p.stats.aprimoramentos || 0;
  const g0 = p.stats.ouroGasto || 0;
  for (let i = 0; i < 300; i++) frame(1);   // ~5s com ouro 0
  conf(p.equip.arma.up === 0 &&
       (p.stats.aprimoramentos || 0) === apr0 &&
       (p.stats.ouroGasto || 0) === g0,
    'auto A+ desligado: nada muda mesmo rodando');
  p.autoApr = true;
  p.ouro = 60;                     // 1º aprim custa 25, 2º custa 100
  for (let i = 0; i < 300; i++) frame(1);   // ~5s
  conf(p.equip.arma.up === 1 &&
       (p.stats.aprimoramentos || 0) === apr0 + 1 &&
       p.ouro === 35,
    'auto A+ ligado: aprimora 1× e para sem saldo (up=' +
    p.equip.arma.up + ', ouro=' + Math.round(p.ouro) + ')');
  conf((p.stats.ouroGasto || 0) === g0 + 25,
    'ouro gasto contado em stats.ouroGasto (+25)');
  p.autoApr = false;
  p.ouro = 100000;
  const upA = p.equip.arma.up;
  for (let i = 0; i < 600; i++) frame(1);
  conf(p.equip.arma.up === upA && p.ouro === 100000,
    'auto A+ desligado de volta: não gasta mais');
  // teto MAX_UP
  p.equip.arma.up = Itens.MAX_UP;
  p.ouro = 99999;
  p.autoApr = true;
  const ouroTeto = p.ouro;
  for (let i = 0; i < 300; i++) frame(1);
  conf(p.ouro === ouroTeto && p.equip.arma.up === Itens.MAX_UP,
    'teto MAX_UP respeitado (não joga ouro fora)');
  p.autoApr = false;
  if (Batalha.info().pausada) Batalha.alternarPausa();
  p.trava = { arma: false, armadura: false };

  // --- botão [x] do auto A+ na UI (640..674 × 138..162)
  clique(657, 150);
  frame(1);
  conf(p.autoApr === true, 'clique no checkbox liga o Auto A+');
  clique(657, 150);
  frame(1);
  conf(p.autoApr === false, 'clique de novo desliga');

  // --- bloco base→total na aba Stats
  p.classe = 'guerreiro';
  p.nivel = 30;
  p.atributos.for = 50;
  p.atributos.con = 40;
  // des 9: com a compensação 9× (1,3 → 11,7/ponto) o des 20 estourava
  // o clamp 45% em base E total (45 < 45 falhava) — 9 dá 26 < 34
  p.atributos.des = 9;
  p.atributos.int = 8;
  p.atributos.car = 8;
  p.pontos = 0;
  p.keystoneOn = false;
  p.equip = { arma: { nome: 'A', slot: 'arma', rar: 2, escala: 1, up: 3,
                      afixos: [], bonus: { dano: 50, vel: 30, crit: 8 } },
              armadura: { nome: 'V', slot: 'armadura', rar: 2, escala: 1,
                          up: 2, afixos: [], bonus: { hp: 120 } } };
  const det = Personagem.statusDetalhado(p);
  const st = Personagem.status(p);
  conf(det.dano.base < det.dano.total &&
       det.dano.base === det.dano.partes[0].v + det.dano.partes[1].v,
    'base do dano = classe+atributo (sem itens): ' + det.dano.base +
    ' + itens = ' + det.dano.total);
  conf(det.hp.base < det.hp.total && det.vel.base < det.vel.total &&
       det.crit.base < det.crit.total,
    'HP/Vel/Crít: base < total com itens equipados');
  conf(det.dano.base + det.dano.partes[2].v === st.dano,
    'sem keystone: base + itens = status (' + det.dano.base + '+' +
    det.dano.partes[2].v + ' = ' + st.dano + ')');
  clique(528, 418);                 // aba Stats
  frame(2);
  const ts = jogoCanvas._textos || [];
  conf(ts.some(t => t.indexOf('Base → total') >= 0),
    'aba Stats mostra o cabeçalho "Base → total"');
  conf(ts.some(t => t.indexOf('Dano ' + det.dano.base + '→' +
    det.dano.total) >= 0),
    'linha do Dano com seta base→total (' + det.dano.base + '→' +
    det.dano.total + ')');
  conf(ts.some(t => t.indexOf('FOR 50→') >= 0),
    'atributos com seta investido→efetivo (bônus de classe)');
}

console.log('34) velocidade: recarga com piso 0,08 e sub-passos (não atravessa)');
{
  const Batalha = sandbox.Batalha;
  const p = Game.personagem;

  // --- 1) recarga SEM piso: 35/vel puro em qualquer DES
  p.classe = 'guerreiro';
  p.equip = { arma: null, armadura: null };
  p.bolsa = [];
  p.keystoneOn = false;
  p.atributos = { for: 8, des: 8, con: 8, int: 8, car: 8 };
  p.pontos = 0;
  // spec gestao-atributos: a DES usa curva saturante, então a recarga
  // NÃO chega mais no piso por atributo — ela é limitada pelo TETO da
  // velocidade (250 px/s = 7,1 g/s). A fórmula continua a mesma.
  let casos = [[8, 70], [100, 104.1], [500, 148.1]];
  for (const [des, velEsp] of casos) {
    p.atributos.des = des;
    const s = Personagem.status(p);
    conf(Math.abs(s.vel - velEsp) < 0.5 &&
         s.recarga === Math.max(0.08, 35 / s.vel),
      'curva saturante + recarga: DES ' + des + ' → vel ' +
      s.vel.toFixed(1) + ' (≈' + velEsp + '), recarga ' +
      s.recarga.toFixed(4) + 's (' + (1 / s.recarga).toFixed(1) + ' g/s)');
  }
  // teto REAL do jogo: 250 px/s → 7,1 g/s (o piso de 0,08s / 12,5 g/s
  // continua no código mas é inalcançável — a velocidade é limitada)
  p.atributos.des = 99999;
  const sTeto = Personagem.status(p);
  conf(Math.abs(sTeto.vel - Personagem.VEL_MAX) < 1e-9 &&
       Math.abs(sTeto.recarga - 35 / Personagem.VEL_MAX) < 1e-9,
    'teto da velocidade limita a recarga (' + sTeto.vel + ' px/s = ' +
    (1 / sTeto.recarga).toFixed(1) + ' g/s — nunca 12,5)');
  p.atributos.des = 8;

  // --- 2) a checagem de atravessamento ACUSA um salto sintético
  // (prova que a propriedade abaixo tem dentes)
  const obst = Batalha.info().obst;
  conf(obst.length > 0 && obst.every(o => typeof o.r === 'number' &&
       typeof o.cx === 'number' && typeof o.cy === 'number'),
    'info().obst expõe centro de colisão e raio (' + obst.length + ')');
  function cortaMiolo(p0, p1, o) {
    const dx = p1.x - p0.x, dy = p1.y - p0.y;
    const l2 = dx * dx + dy * dy;
    let t = l2 > 0 ? ((o.cx - p0.x) * dx + (o.cy - p0.y) * dy) / l2 : 0;
    t = Math.max(0, Math.min(1, t));
    const qx = p0.x + t * dx - o.cx, qy = p0.y + t * dy - o.cy;
    const distReta = Math.sqrt(qx * qx + qy * qy);
    const d0 = Math.sqrt((p0.x - o.cx) ** 2 + (p0.y - o.cy) ** 2);
    const d1 = Math.sqrt((p1.x - o.cx) ** 2 + (p1.y - o.cy) ** 2);
    // entra e sai SEM tocar a borda = atravessou em salto
    return distReta < o.r - 2 && d0 > o.r + 2 && d1 > o.r + 2;
  }
  const alvo = obst[0];
  const salto = { p0: { x: alvo.cx - 14, y: alvo.cy },
                  p1: { x: alvo.cx + 14, y: alvo.cy } };
  conf(cortaMiolo(salto.p0, salto.p1, alvo) === true,
    'sintético: salto de 28px pelo miolo é detectado como atravessamento');
  conf(cortaMiolo({ x: alvo.cx - 14, y: alvo.cy - 20 },
                  { x: alvo.cx + 14, y: alvo.cy - 20 }, alvo) === false,
    'sintético: passar longe NÃO acusa (sem falso positivo)');

  // --- 3) herói a 25,8px/frame correndo pelo campo: NUNCA atravessa
  // int 8 = não usa A* (caminha reto e escorrega na colisão) — é exatamente
  // o caminho que saltava por cima dos obstáculos antes dos sub-passos
  if (Batalha.info().pausada) Batalha.alternarPausa();
  p.classe = 'guerreiro';
  p.nivel = 20;
  // spec gestao-atributos: o clamp de 250 tornou os cenários extremos
  // (25,8px/frame) INALCANÇÁVEIS — o teste roda na velocidade máxima
  // real da build mono-DES no fim da campanha (240,8 px/s = 4,0px/frame
  // = 2 sub-passos), que é o pior caso possível hoje.
  p.atributos = { for: 999, con: 999, des: 3174, int: 8, car: 8 };
  p.pontos = 0;
  p.equip = { arma: null, armadura: null };
  Batalha.restaurarOnda(3);
  let ev = 0;
  while (Batalha.info().morto && ev < 900) { frame(1); ev++; }
  const velEsperada = Personagem.status(p).vel;
  conf(velEsperada > 4 * 60 && velEsperada <= Personagem.VEL_MAX,
    'fixture: vel máxima da build (' + velEsperada.toFixed(1) +
    ' px/s = ' + (velEsperada / 60).toFixed(1) + 'px/frame > 4px = ' +
    'sub-passos ativos)');
  let viol = 0, corridas = 0, ult = null;
  for (let i = 0; i < 12000; i++) {
    frame(1);
    const f = Batalha.info();
    const atual = { x: f.heroi.x, y: f.heroi.y };
    if (ult) {
      const d = Math.hypot(atual.x - ult.x, atual.y - ult.y);
      // limiares p/ a vel máxima real (~4px/frame com clamp 250)
      if (d > 3) corridas++;
      if (d > 2) {
        for (const o of f.obst) {
          if (cortaMiolo(ult, atual, o)) viol++;
        }
      }
    }
    ult = atual;
  }
  conf(corridas > 100,
    'a fixture realmente correu pelo campo (' + corridas +
    ' frames com corrida >3px)');
  conf(viol === 0,
    'em 12000 frames na vel máxima (4px/frame, 2 sub-passos): ' +
    'NENHUM obstáculo atravessado (' + viol + ' violações)');
}

console.log('35) ranking: score, apelido, degradação, cena e gatilhos');
{
  const Ranking = sandbox.Ranking;
  const Batalha = sandbox.Batalha;
  const RankingConfig = sandbox.RankingConfig;

  // --- 1) fórmula do score (bordas e monotonia)
  conf(Ranking.scoreDe({ mapa: 1, onda: 1, nivel: 1 }) === 101001,
    'score fórmula exata (M1 O1 N1 = 101001)');
  conf(Ranking.scoreDe({ mapa: 1, onda: 100, nivel: 50 }) === 200050,
    'score borda: mapa 1 onda 100 = 200050');
  conf(Ranking.scoreDe({ mapa: 2, onda: 1, nivel: 50 }) >
       Ranking.scoreDe({ mapa: 1, onda: 100, nivel: 50 }),
    'mapa 2 onda 1 sempre vence mapa 1 onda 100');
  conf(Ranking.scoreDe({ mapa: 1, onda: 100, nivel: 999 }) <
       Ranking.scoreDe({ mapa: 2, onda: 1, nivel: 0 }),
    'pior nível do mapa 2 vence o melhor do mapa 1');
  conf(Ranking.scoreDe({ mapa: 1, onda: 100, nivel: 9999 }) === 200999,
    'nível capado em 999 (nunca empurra a onda)');
  conf(Ranking.scoreDe({ mapa: 1, onda: 0, nivel: 50 }) ===
       Ranking.scoreDe({ mapa: 1, onda: 1, nivel: 50 }),
    'onda 0 (recém-passou de mapa) conta como 1');
  let ant = -1, mono = true;
  for (let m = 1; m <= 5; m++) {
    for (let o = 1; o <= 100; o++) {
      const s = Ranking.scoreDe({ mapa: m, onda: o, nivel: 999 });
      if (s <= ant) mono = false;
      ant = s;
    }
  }
  conf(mono, 'score estritamente crescente em todo o espaço (mapa × onda)');

  // --- 1b) identidade que as RULES do Firestore espelham (spec
  //          ranking-antitrampa): score == mapa*100000 + onda*1000 +
  //          min(nivel,999). O lado servidor é .specs/features/ranking/
  //          regras-firestore.rules; se o scoreDe mudar de forma, ESTE
  //          teste avisa que as regras precisam mudar junto.
  {
    const bordas = [
      { mapa: 1, onda: 1, nivel: 0 },
      { mapa: 1, onda: 1, nivel: 998 },
      { mapa: 1, onda: 1, nivel: 999 },
      { mapa: 1, onda: 1, nivel: 1000 },
      { mapa: 1, onda: 100, nivel: 9500 },
      { mapa: 2, onda: 50, nivel: 37 },
      { mapa: 100, onda: 100, nivel: 999 },
      { mapa: 100000, onda: 1, nivel: 1 }
    ];
    let deriva = '';
    for (const r of bordas) {
      const obtido = Ranking.scoreDe(r);
      const esperado = r.mapa * 100000 + r.onda * 1000 +
        (r.nivel <= 999 ? r.nivel : 999);
      if (obtido !== esperado && !deriva) {
        deriva = JSON.stringify(r) + ' -> ' + obtido + ' != ' + esperado;
      }
    }
    conf(!deriva, 'scoreDe espelha a fórmula das rules' +
      (deriva ? ' (' + deriva + ')' : ' (8 casos de borda)'));
  }

  // --- 2) apelido: slug, validação e forma do doc
  conf(Ranking.slug('José da Silva') === 'jose-da-silva',
    'slug remove acentos e espaços');
  conf(Ranking.slug('AÇÃO!!') === 'acao', 'slug normaliza caixa e símbolos');
  conf(Ranking.slug('  --Foo--  ') === 'foo', 'slug aparrega traços');
  conf(Ranking.slug('???') === '', 'slug de lixo vira vazio (inválido)');
  conf(Ranking.nickValido('a') && !Ranking.nickValido('') &&
       Ranking.nickValido('x'.repeat(20)) &&
       !Ranking.nickValido('x'.repeat(21)),
    'apelido válido: 1..20 chars');
  const doc = Ranking.docDe({ nick: 'José', mapa: 2, onda: 5, nivel: 10,
                              classe: 'mago', at: 123 });
  conf(doc.id === 'jose' && doc.dados.nick === 'José' &&
       doc.dados.score === Ranking.scoreDe({ mapa: 2, onda: 5, nivel: 10 }) &&
       doc.dados.classe === 'mago',
    'doc: id = slug + campos na forma exata do Firestore');

  // --- 3) degradação SEM config (placeholder recém-entregue)
  conf(RankingConfig.ativo === false,
    'seção desligada na largada (independe do setup local do Firebase)');
  conf(Ranking.estado() === 'desativado', 'estado inicial: desativado');
  conf(Ranking.submete() === false && Ranking.enviado() === null,
    'submete sem config: no-op (nada enviado, sem lançar)');
  let topErr = null;
  Ranking.top(function (e) { topErr = e; });
  conf(topErr && Ranking.estado() === 'desativado',
    'top sem config: callback de erro + estado desativado');

  // --- 4) gatilhos: passaMapa e morte chamam submete (spy)
  let chamadas = 0;
  const subOrig = Ranking.submete;
  Ranking.submete = function () {
    chamadas++;
    return subOrig.apply(Ranking, arguments);
  };
  const mapa0 = Batalha.info().mapa;
  Batalha.passaMapa();
  conf(Batalha.info().mapa === mapa0 + 1 && chamadas === 1,
    'gatilho 1: passaMapa avança o mapa E chama Ranking.submete');
  Batalha.restaurarMapa(mapa0);

  // morte: onda de PRESSÃO (lição do STATE: com onda fraca a regen
  // 4%/s + 2hp/s em nv20 supera o dano e o herói não cai)
  const p = Game.personagem;
  p.atributos.con = 1;
  p.atributos.for = 1;
  p.atributos.des = 8;
  p.pontos = 0;
  Batalha.restaurarOnda(50);
  let caiu = false;
  for (let i = 0; i < 6000 && !caiu; i++) {
    frame(1);
    if (Batalha.info().morto) caiu = true;
  }
  if (!(caiu && chamadas >= 2)) {
    const fz = Batalha.info();
    console.log('    [diagRank] caiu=' + caiu + ' chamadas=' + chamadas +
      ' nv=' + p.nivel + ' hp=' + fz.hp + ' onda=' + fz.onda +
      ' inim=' + fz.inimigos + ' estado=' + fz.heroi.estado +
      ' arma=' + (p.equip.arma ? p.equip.arma.nome : 'null'));
  }
  conf(caiu && chamadas >= 2,
    'gatilho 2: a morte chama Ranking.submete (' + chamadas +
    ' chamadas no total)');
  Ranking.submete = subOrig;          // devolve o método original

  // --- 5) cena: botão na seleção + estado "não configurado"
  clique(236, 388);                   // Trocar herói (rodapé da jogatina)
  frame(2);
  conf(Game.cena === 'selecao', 'saiu para a seleção');
  jogoCanvas._textos = [];
  clique(314, 319);                   // botão Ranking (260,306,108,26)
  frame(2);
  conf(Game.cena === 'ranking', 'botão Ranking abre a cena');
  conf(jogoCanvas._textos.some(t => t.indexOf('não configurado') >= 0),
    'sem config: a cena mostra "não configurado"');

  // --- 6) digitação do apelido na cena (com filtro)
  function digita(k) {
    tecla('keydown', 'Key' + k.toUpperCase(), k);
    frame(1);
  }
  for (const k of ['J', 'o', 's', 'e']) digita(k);
  conf(Ranking.nick() === 'Jose', 'digitou o apelido na cena (Jose)');
  conf(localStorageStub.getItem('rpg_rank_nick_v1') === 'Jose',
    'apelido gravado em rpg_rank_nick_v1 (chave versionada)');
  digita('!');                        // caractere fora do filtro
  conf(Ranking.nick() === 'Jose', 'caractere inválido é ignorado');
  tecla('keydown', 'Backspace', 'Backspace');
  frame(1);
  conf(Ranking.nick() === 'Jos', 'Backspace apaga uma letra');
  digita('e');
  conf(Ranking.nick() === 'Jose', 'digita de novo depois de apagar');

  // --- 7) lazy-load: com ativo mas SEM SDK, injeta o <script>
  RankingConfig.ativo = true;
  const criados = [];
  const criaOrig = sandbox.document.createElement;
  sandbox.document.createElement = function (t) {
    criados.push(t);
    return criaOrig.call(sandbox.document, t);
  };
  let cbTop = false;
  Ranking.top(function () { cbTop = true; });
  conf(criados.indexOf('script') >= 0,
    'lazy-load: injeta <script> do SDK ao abrir o ranking');
  conf(criados.filter(t => t === 'script').length === 1,
    'injeta um script por vez (o 2º espera o onload do 1º)');
  conf(Ranking.estado() === 'carregando',
    'estado "carregando" enquanto o SDK não chega');
  conf(!cbTop, 'callback só completa quando o SDK carrega (sem rede: não)');
  sandbox.document.createElement = criaOrig;
  Ranking._reseta();

  // --- 8) SDK stubado no sandbox (sem rede): grava e lê na unha
  const sets = [];
  let leitura = 'ok';
  function resolvido(v) {
    return { then: function (ok) { ok(v); return this; } };
  }
  function rejeitado(e) {
    return { then: function (ok, erro) { if (erro) erro(e); return this; } };
  }
  const docsFake = [
    { data: () => ({ nick: 'Zezinho', score: 999999, mapa: 9, onda: 50,
                     nivel: 80, classe: 'mago', at: 1762000000000 }) },
    { data: () => ({ nick: 'Maria', score: 5, mapa: 1, onda: 1,
                     nivel: 3, classe: 'ladino', at: 1761000000000 }) }
  ];
  sandbox.firebase = {
    initializeApp: function (cfg) { sets.push(['init', !!cfg]); },
    firestore: function () {
      return {
        collection: function (nome) {
          sets.push(['col', nome]);
          return {
            doc: function (id) {
              return { set: function (dados) {
                sets.push(['set', id, dados]);
                return resolvido();
              } };
            },
            orderBy: function () {
              return { limit: function () {
                return { get: function () {
                  sets.push(['get']);
                  return leitura === 'ok'
                    ? resolvido({ docs: docsFake })
                    : rejeitado(new Error('rede'));
                } };
              } };
            }
          };
        }
      };
    }
  };

  const info = Batalha.info();
  const esp = Ranking.scoreDe({ mapa: info.mapa, onda: info.onda,
                                nivel: info.nivel });
  conf(Ranking.submete() === true, 'com config+SDK: submete aceita o progresso');
  let setsFeitos = sets.filter(c => c[0] === 'set');
  conf(sets.some(c => c[0] === 'col' && c[1] === 'rank') &&
       setsFeitos.length === 1 && setsFeitos[0][1] === 'jose' &&
       setsFeitos[0][2].score === esp,
    'escreveu doc "jose" na coleção "rank" com score exato (' + esp + ')');
  conf(Ranking.enviado() && Ranking.enviado().nick === 'Jose' &&
       localStorageStub.getItem('rpg_rank_ultimo_v1') !== null,
    'enviado() registra o doc aceito e grava meu melhor');
  conf(Ranking.submete() === false &&
       sets.filter(c => c[0] === 'set').length === 1,
    'progresso igual NÃO reenvia (melhor marca por apelido)');
  const mapaAlvo = Math.max(9, Batalha.info().mapa + 7);
  Batalha.restaurarMapa(mapaAlvo);
  conf(Ranking.submete() === true &&
       sets.filter(c => c[0] === 'set').length === 2,
    'progresso maior reenvia (mapa ' + mapaAlvo + ')');

  // --- 9) cena COM dados: top 10 + meu melhor
  jogoCanvas._textos = [];
  Game.setScene('ranking');           // reentra: dispara a leitura
  frame(2);
  conf(Ranking.estado() === 'ok', 'cena com SDK stubado: estado ok');
  const txts = jogoCanvas._textos;
  conf(txts.some(t => t.indexOf('Zezinho') >= 0),
    'top 10 renderiza os nomes (Zezinho)');
  conf(txts.some(t => t === 'MEU MELHOR'), 'bloco MEU MELHOR presente');
  conf(txts.some(t => t.indexOf('score ') === 0),
    'meu melhor mostra o score registrado');

  // --- 10) erro SEM cache → "Falha"; falha COM cache → cache local
  // (a cena só atualiza aviso/cache no PRÓPRIO atualiza() — re-entra)
  localStorageStub.removeItem('rpg_rank_cache_v1');
  leitura = 'falha';
  let err2 = null;
  Ranking.top(function (e) { err2 = e; });      // nível de API: cb de erro
  conf(err2 && Ranking.estado() === 'erro',
    'leitura falha e sem cache: estado erro');
  jogoCanvas._textos = [];
  Game.setScene('ranking');                     // reentra: dispara atualiza()
  frame(2);
  conf(jogoCanvas._textos.some(t => t.indexOf('Falha') >= 0),
    'cena mostra "Falha" no estado de erro');
  leitura = 'ok';
  Game.setScene('ranking');
  frame(2);                                     // leitura boa: regrava cache
  leitura = 'falha';
  let lista3 = null, deC3 = false, err3 = 'x';
  Ranking.top(function (e, l, deC) { err3 = e; lista3 = l; deC3 = deC; });
  conf(err3 === null && lista3 && lista3.length === 2 && deC3 === true &&
       Ranking.estado() === 'ok' && Ranking.ehCache(),
    'falha COM cache: serve o cache local (2 itens, flag cache)');
  jogoCanvas._textos = [];
  Game.setScene('ranking');                     // cena com a leitura falha
  frame(2);
  conf(jogoCanvas._textos.some(t => t.indexOf('cache local') >= 0),
    'cena avisa que está mostrando o cache');
  leitura = 'ok';

  // --- 11) botões do rodapé: ATUALIZAR e VOLTAR
  const gets0 = sets.filter(c => c[0] === 'get').length;
  clique(700, 388);                   // ATUALIZAR (W-128..W-8 em W=768)
  frame(2);
  conf(sets.filter(c => c[0] === 'get').length === gets0 + 1,
    'ATUALIZAR relê o ranking');
  clique(68, 388);                    // VOLTAR (8,372,120,32)
  frame(2);
  conf(Game.cena === 'selecao', 'VOLTAR volta para a seleção');
}

console.log('36) ajustes: piso da recarga, cooldown na Stats (rolagem) e teto');
{
  const Personagem = sandbox.Personagem;
  const Batalha = sandbox.Batalha;
  const IA = sandbox.IA;
  const p = Game.personagem;

  // --- 1) piso 0,08s vivo no status (fonte única — detalhe na seção 34)
  p.classe = 'guerreiro';
  p.equip = { arma: null, armadura: null };
  p.bolsa = [];
  p.keystoneOn = false;
  p.atributos = { for: 8, des: 8, con: 8, int: 8, car: 8 };
  p.pontos = 0;
  p.atributos.des = 99999;
  const sTeto = Personagem.status(p);
  conf(Math.abs(sTeto.vel - Personagem.VEL_MAX) < 1e-9 &&
       Math.abs(sTeto.recarga - 35 / Personagem.VEL_MAX) < 1e-9,
    'teto da vel limita a recarga (250 px/s = 7,1 g/s — o piso 0,08s ' +
    '/ 12,5 g/s continua no código mas é inalcançável)');
  p.atributos.des = 8;

  // --- 2) teto de nível 9500 (spec mundos: campanha 10k ondas → nv ~9150)
  conf(Personagem.NIVEL_MAX === 9500, 'NIVEL_MAX = 9500 (fonte única)');
  const salv = Personagem.normalizar({ nivel: 36000, xp: 999999,
    xpProx: 756125,
    atributos: { for: 500, des: 8, con: 8, int: 8, car: 8 } });
  conf(salv.nivel === 9500 && salv.xp === 0 &&
       salv.xpProx === Personagem.custoProximo(9500),
    'normalizar clampa save nv 36.000 → 9500 (xp zerado, xpProx refaz)');
  conf(salv.atributos.for === 500,
    'atributos investidos preservados no clamp');

  const nv0 = p.nivel;
  p.nivel = Personagem.NIVEL_MAX - 1;
  p.xp = 0;
  p.xpProx = Personagem.custoProximo(p.nivel);
  // com custo exponencial o lote precisa cobrir o custo REAL do nível
  Batalha.ganhaXP(Personagem.custoProximo(p.nivel));
  conf(p.nivel === Personagem.NIVEL_MAX && p.xp === 0,
    'ganhaXP: 9499 → 9500 e a sobra do último nível é descartada');
  Batalha.ganhaXP(1e9);
  conf(p.nivel === Personagem.NIVEL_MAX && p.xp === 0,
    'no teto o XP é DESCARTADO (não acumula buffer escondido)');
  p.nivel = nv0;
  p.xp = 0;
  p.xpProx = Personagem.custoProximo(nv0);

  // --- 3) cabeçalho: MÁXIMO no teto (e volta fora do teto)
  clique(120, 388);                    // JOGAR (seleção -> jogatina)
  frame(2);
  conf(Game.cena === 'jogo', 'entrou na jogatina p/ ver o cabeçalho');
  p.nivel = Personagem.NIVEL_MAX;
  p.xp = 0;
  p.xpProx = Personagem.custoProximo(Personagem.NIVEL_MAX);
  jogoCanvas._textos = [];
  frame(1);
  conf(jogoCanvas._textos.some(t => t === 'MÁXIMO'),
    'cabeçalho mostra MÁXIMO no teto');
  p.nivel = nv0;
  p.xp = 0;
  p.xpProx = Personagem.custoProximo(nv0);
  jogoCanvas._textos = [];
  frame(1);
  conf(!jogoCanvas._textos.some(t => t === 'MÁXIMO'),
    'fora do teto a barra volta a mostrar xp/xpProx');

  // --- 4) aba Stats: bloco de cooldowns com o valor EFETIVO da INT
  p.classe = 'mago';
  p.atributos = { for: 8, des: 8, con: 8, int: 8, car: 8 };
  p.pontos = 0;
  clique(528, 418);                     // aba Stats
  frame(1);
  jogoCanvas._textos = [];
  frame(1);
  let tx = jogoCanvas._textos;
  conf(tx.some(t => t.indexOf('Abates') >= 0),
    'aba Stats renderiza as estatísticas (dobra inicial)');
  conf(!tx.some(t => t.indexOf('cooldown') >= 0),
    'bloco de cooldowns FORA da dobra inicial (precisa rolar)');

  // efetivo = o que o combate usa: IA.skillEfeito com a agudeza da INT
  const agu = IA.agudeza(Personagem.status(p).atributos.int);
  const efBola = IA.skillEfeito({ intervalo: 4.5 }, agu).intervalo;
  const espTxt = String(Math.round(efBola * 10) / 10).replace('.', ',') +
    's (base 4,5s)';

  // --- 5) rolagem: wheel revela o fundo...
  jogoCanvas._textos = [];
  (ouvintesJanela.wheel || []).forEach(fn => fn({ deltaY: 100 }));
  frame(1);
  tx = jogoCanvas._textos;
  conf(tx.some(t => t.indexOf('Skills — cooldown') >= 0),
    'wheel para baixo revela o bloco de cooldowns');
  conf(tx.some(t => t.indexOf('Bola de Fogo') >= 0),
    'linhas das skills entram na faixa visível');
  conf(tx.some(t => t.indexOf(espTxt) >= 0),
    'cooldown EFETIVO com a INT (' + espTxt + ')');
  conf(!tx.some(t => t.indexOf('Abates') >= 0) &&
       tx.some(t => t.indexOf('Estatísticas') >= 0),
    'topo saiu da vista mas o título fixo continua (rolagem real)');

  // --- 6) arrasto do thumb: pressiona em cima e arrasta p/ o fundo
  // (reseta os textos DEPOIS de soltar: só o estado final importa)
  pressionar(750, 150);                // thumb (x746..754) perto do topo
  frame(1);
  (jogoCanvas._listeners.mousemove || [])
    .forEach(fn => fn({ clientX: 1500, clientY: 660 }));  // x750, y330
  frame(1);
  soltar();
  jogoCanvas._textos = [];
  frame(1);
  tx = jogoCanvas._textos;
  conf(tx.some(t => t.indexOf('Rajada Arcana') >= 0) &&
       !tx.some(t => t.indexOf('Abates') >= 0),
    'arrasto do thumb levou ao fundo da lista');

  // --- 7) limites: wheel gigante trava no topo e no fundo
  jogoCanvas._textos = [];
  (ouvintesJanela.wheel || []).forEach(fn => fn({ deltaY: -999999 }));
  frame(1);
  tx = jogoCanvas._textos;
  conf(tx.some(t => t.indexOf('Abates') >= 0) &&
       !tx.some(t => t.indexOf('cooldown') >= 0),
    'wheel negativo gigante trava no TOPO (clamp em 0)');
  jogoCanvas._textos = [];
  (ouvintesJanela.wheel || []).forEach(fn => fn({ deltaY: 999999 }));
  frame(1);
  tx = jogoCanvas._textos;
  conf(tx.some(t => t.indexOf('Rajada Arcana') >= 0) &&
       tx.some(t => t.indexOf('Estatísticas') >= 0),
    'wheel positivo gigante trava no FUNDO (clamp no limite)');
}

console.log('37) ranking observável: motivos, toasts e status na cena');
{
  const Ranking = sandbox.Ranking;
  const Batalha = sandbox.Batalha;
  const Gravacao = sandbox.Gravacao;

  function resolvido(v) {
    return { then: function (ok) { ok(v); return this; } };
  }
  function rejeitado(e) {
    return { then: function (ok, erro) { if (erro) erro(e); return this; } };
  }

  // --- 1) sem apelido: motivo + dica única por sessão (não spama)
  const nickAntes = Ranking.nick();
  Ranking.nick('');
  Ranking._reseta();
  conf(Ranking.submete() === false && Ranking.ultimoEnvio() &&
       Ranking.ultimoEnvio().motivo === 'sem-apelido',
    'sem apelido: submete recusa com motivo sem-apelido');
  jogoCanvas._textos = [];
  frame(1);
  conf(jogoCanvas._textos.some(t => t.indexOf('apelido na tela Ranking') >= 0),
    'toast explica como pontuar (dica única)');
  Gravacao.entrar(Game.personagem);     // limpa o toast p/ o teste seguinte
  jogoCanvas._textos = [];
  Ranking.submete();                    // 2ª tentativa sem apelido
  frame(1);
  conf(!jogoCanvas._textos.some(t => t.indexOf('apelido na tela Ranking') >= 0),
    'a dica NÃO repete (uma vez por sessão)');
  Ranking.nick(nickAntes);              // devolve o apelido (Jose)

  // --- 2) file:// detectado antes de qualquer tentativa de rede
  sandbox.location = { protocol: 'file:' };
  Ranking._reseta();
  conf(Ranking.submete() === false && Ranking.ultimoEnvio() &&
       Ranking.ultimoEnvio().motivo === 'arquivo-local',
    'file://: motivo arquivo-local (nem tenta carregar o SDK)');
  jogoCanvas._textos = [];
  frame(1);
  conf(jogoCanvas._textos.some(t => t.indexOf('file://') >= 0),
    'toast avisa que arquivo local não funciona (dica única)');
  delete sandbox.location;

  // --- 3) rejeição do SERVIDOR vira motivo com detalhe (não silencioso)
  Ranking._reseta();
  const sets37 = [];
  sandbox.firebase = {
    initializeApp: function () {},
    firestore: function () {
      return { collection: function () {
        return {
          doc: function () { return { set: function (dados) {
            sets37.push(dados);
            return rejeitado(new Error('permission denied (teste)'));
          } }; },
          orderBy: function () { return { limit: function () {
            return { get: function () { return resolvido({ docs: [] }); } };
          } }; }
        };
      } };
    }
  };
  Batalha.restaurarMapa(Math.max(20, Batalha.info().mapa + 5));
  conf(Ranking.submete() === true, 'tentativa parte (progresso maior)');
  conf(Ranking.ultimoEnvio() && Ranking.ultimoEnvio().motivo === 'regras' &&
       Ranking.ultimoEnvio().detalhe.indexOf('permission denied') >= 0,
    'rejeição do set vira motivo "regras" com detalhe (nunca silencioso)');

  // --- 4) sucesso: enviado + toast de confirmação
  Ranking._reseta();
  sandbox.firebase = {
    initializeApp: function () {},
    firestore: function () {
      return { collection: function () {
        return {
          doc: function () { return { set: function () {
            return resolvido();
          } }; },
          orderBy: function () { return { limit: function () {
            return { get: function () { return resolvido({ docs: [] }); } };
          } }; }
        };
      } };
    }
  };
  Batalha.restaurarMapa(Math.max(40, Batalha.info().mapa + 5));
  conf(Ranking.submete() === true && Ranking.ultimoEnvio() &&
       Ranking.ultimoEnvio().ok === true &&
       Ranking.ultimoEnvio().motivo === 'enviado',
    'sucesso: ultimoEnvio.ok com motivo enviado ✓');
  jogoCanvas._textos = [];
  frame(1);
  conf(jogoCanvas._textos.some(t => t.indexOf('enviado ao ranking') >= 0),
    'toast de confirmação na jogatina');

  // --- 5) progresso pior/igual: silencioso de propósito (nao-melhor)
  Batalha.restaurarMapa(1);
  Gravacao.entrar(Game.personagem);
  conf(Ranking.submete() === false && Ranking.ultimoEnvio() &&
       Ranking.ultimoEnvio().motivo === 'nao-melhor',
    'sem melhoria: motivo nao-melhor (não é falha)');
  jogoCanvas._textos = [];
  frame(1);
  const semToast = ['enviado ao ranking', 'apelido na tela Ranking',
                    'recusou', 'use o site publicado'];
  conf(!jogoCanvas._textos.some(t =>
    semToast.some(m => t.indexOf(m) >= 0)),
    'sem melhoria: NENHUM toast (silencioso de propósito)');

  // --- 6) a cena Ranking mostra a linha de status com o motivo vigente
  jogoCanvas._textos = [];
  Game.setScene('ranking');
  frame(2);
  const tx37 = jogoCanvas._textos;
  conf(tx37.some(t => t.indexOf('último envio:') >= 0 &&
       t.indexOf('sem melhoria') >= 0),
    'cena mostra "último envio: ... sem melhoria"');
}

console.log('38) progressão exponencial: curva, renda harmônica e safeguards');
{
  const Personagem = sandbox.Personagem;
  const Batalha = sandbox.Batalha;
  const UI = sandbox.UI;
  const p = Game.personagem;

  // --- 1) custo EXPOENCIAL puro: razão constante em qualquer nível
  const g1 = Personagem.custoProximo(2) / Personagem.custoProximo(1);
  const g50 = Personagem.custoProximo(51) / Personagem.custoProximo(50);
  const gTopo = Personagem.custoProximo(Personagem.NIVEL_MAX) /
    Personagem.custoProximo(Personagem.NIVEL_MAX - 1);
  conf(Math.abs(g1 - g50) < 1e-9 && Math.abs(g1 - gTopo) < 1e-9,
    'razão G constante do1º ao 9500º nível (exponencial pura: ' +
    g1.toFixed(4) + ')');
  // re-base spec mundos: G 1,11 → 1,07 (custo(9500) ≈ 10^281 < 1e308)
  conf(Math.abs(g1 - 1.07) < 1e-9, 'G inicial = 1,07 (re-base mundos)');
  conf(Personagem.custoProximo(1) === 146,
    'custo do nível 1 = 146 (1º nível ~35-45s intacto)');
  conf(isFinite(Personagem.custoProximo(Personagem.NIVEL_MAX)) &&
       Personagem.custoProximo(Personagem.NIVEL_MAX) < 1e308,
    'custo(9500) finito (< 1e308 — doubles seguros até o teto)');
  let monotonio = true;
  for (let n = 1; n < Personagem.NIVEL_MAX - 1; n++) {
    if (Personagem.custoProximo(n + 1) <= Personagem.custoProximo(n)) {
      monotonio = false; break;
    }
  }
  conf(monotonio, 'custo estritamente crescente em toda a curva');

  // --- 2) renda harmônica: xpAbate exponencial com continuidade
  conf(Batalha.xpAbate(0, 0) === 12,
    'xpAbate na fronteira = XP_BASE 12 (escala inicial)');
  conf(Batalha.xpAbate(0, 4) === 16, 'xpExtra continua somando por cima');
  const h50 = Batalha.xpAbate(50, 0) / Batalha.xpAbate(49, 0);
  const h200 = Batalha.xpAbate(200, 0) / Batalha.xpAbate(199, 0);
  // tolerância 1%: o Math.round da renda mexe na 4ª casa da razão
  // re-base spec mundos: H 1,10 → 1,064 (renda(9999) ≈ 10^270 < 1e308)
  conf(Math.abs(h50 - h200) < 0.01 && Math.abs(h50 - 1.064) < 0.01,
    'renda com razão XP_H = 1,064 constante (' + h50.toFixed(4) + ')');
  conf(Batalha.xpAbate(300, 0) > Batalha.xpAbate(100, 0) * 1000,
    'renda cresce ≥1000× do onda 100 p/ 300 (absorve o custo G^nv)');
  conf(isFinite(Batalha.xpAbate(9999, 0)) && Batalha.xpAbate(9999, 0) < 1e308,
    'renda(9999) finita (< 1e308 — cobre a campanha de 100 mapas)');

  // --- 3) safeguards: save editado não salta nível nem transborda
  const salv = Personagem.normalizar({
    nivel: 50, xp: 1e18, xpProx: 1, pontos: 99999999, ouro: 1e20,
    atributos: { for: 1e9, des: 8, con: 8, int: 8, car: 8 }
  });
  conf(salv.xpProx === Personagem.custoProximo(50),
    'xpProx do save é IGNORADO (recalculado da fonte única — fecha o 83k)');
  conf(salv.xp === Personagem.custoProximo(50) - 1,
    'xp editado (1e18) clampado em xpProx−1');
  conf(salv.ouro === Personagem.OURO_MAX,
    'ouro editado (1e20) com teto OURO_MAX (1e12)');
  conf(salv.pontos === Personagem.PONTOS_MAX,
    'pontos editados com teto PONTOS_MAX');
  conf(salv.atributos.for === Personagem.ATRIB_MAX,
    'atributo editado (1e9) com teto ATRIB_MAX');
  conf(Personagem.OURO_MAX < 2 ** 53 && Personagem.PONTOS_MAX < 2 ** 53 &&
       Personagem.ATRIB_MAX < 2 ** 53,
    'tetos de save < 2^53 (integer-safe; custo/XP exponencial é float ' +
    'de comparação, seguro até 1e308)');

  // --- 4) ganhaXP rejeita lixo numérico (NaN/−5/Infinity/zero)
  p.nivel = 50;
  p.xp = 0;
  p.xpProx = Personagem.custoProximo(50);
  const nvLixo = p.nivel, xpLixo = p.xp;
  Batalha.ganhaXP(NaN);
  Batalha.ganhaXP(-5);
  Batalha.ganhaXP(Infinity);
  Batalha.ganhaXP(0);
  conf(p.nivel === nvLixo && p.xp === xpLixo,
    'ganhaXP descarta NaN/negativo/infinito/zero sem corromper');

  // --- 5) level-up com custo FLOAT (exponencial sem round)
  // ganho é arredondado, custo é float: dá sobra — o invariante é
  // passar de nível com a sobra LIMITADA ao custo do novo nível
  Batalha.ganhaXP(Personagem.custoProximo(p.nivel) + 10);
  conf(p.nivel === 51 && p.xp < Personagem.custoProximo(51),
    'level-up com custo exponencial (50 → 51, sobra limitada)');

  // --- 6) abreviação da barra (padrão de indústria)
  conf(UI.abrev(999) === '999' && UI.abrev(1500) === '1,5K' &&
       UI.abrev(1e6) === '1M' && UI.abrev(2.5e9) === '2,5B' &&
       UI.abrev(1e45) === '1Qad',
    'UI.abrev: 999 · 1,5K · 1M · 2,5B · 10^45 (pt-BR)');
  // além do último sufixo ("Nod" = 10^60 → limiar 10^63): notação
  // científica — sem isso a barra de XP do late game mostraria
  // "1e+281Nod" (o sufixo engolindo a mantissa)
  conf(UI.abrev(1e61) === '10Nod' && UI.abrev(1e63) === '1e63' &&
       UI.abrev(1.5e281) === '1,5e281' && UI.abrev(9.96e280) === '1e281' &&
       UI.abrev(1.79e308) === '1,8e308',
    'UI.abrev: notação científica pt-BR após o último sufixo ' +
    '(10^61 = 10Nod · 10^63 = 1e63 · 1,5e281 · rollover 1e281)');
}

console.log('39) mundos: escala de monstros, A/B e vitória da campanha');
{
  const Batalha = sandbox.Batalha;
  const Mapas = sandbox.Mapas;
  const Personagem = sandbox.Personagem;
  const p = Game.personagem;

  // --- cena de jogo com estado limpo (a 37 terminou na cena ranking)
  p.atributos.for = 1e6;    // dano absurdo p/ derrubar o chefe do mundo 10
  p.atributos.int = 1e6;    // (mago usa INT como mod de dano)
  p.atributos.con = 1e6;    // HP ~4M: tanque o dano do fim de campanha
  p.atributos.des = 100;    // velocidade moderada (sem explodir sub-passos)
  p.atributos.car = 8;
  // ts fresco: sem crédito de ausência ao reabrir a cena
  Salvar.salvarEstado(p.id, 1, Date.now(), false, 1);
  Game.setScene('jogo');
  frame(2);
  if (Batalha.info().pausada) Batalha.alternarPausa();

  // --- 1) escala de monstros: early intacto, teto cresce por mundo.
  // k EXPLÍCITO aqui = propriedade geométrica (imune a mudança de
  // balanço); o valor shipado é checado à parte no 1b.
  Batalha.escalaMonstros('mundo', 2);
  Batalha.restaurarMapa(1);
  Batalha.restaurarOnda(2);                    // onda 1 (tot 0)
  conf(Batalha.qtdMonstros() === 3,
    'mundo 1, onda 1: 3 monstros (ramp intacto)');
  Batalha.restaurarOnda(6);                    // onda 5 (tot 4)
  conf(Batalha.qtdMonstros() === 5,
    'mundo 1 completa o teto de 5 na onda 5 (igual ao antigo)');
  Batalha.restaurarMapa(50);                   // mundo 5
  conf(Batalha.qtdMonstros() === 13,
    'mundo 5: teto 13 (5 + 4 mundos × k=2)');
  Batalha.restaurarMapa(100);                  // mundo 10 (fim da campanha)
  conf(Batalha.qtdMonstros() === 23,
    'mundo 10: teto 23 (5 + 9 mundos × k=2)');
  Batalha.restaurarMapa(150);                  // mundo 15 — modo infinito
  conf(Batalha.qtdMonstros() === 23,
    'modo infinito: teto trava no fim da campanha (não cresce p/ sempre)');

  // --- 1b) valor SHIPADO (k=0,5 — medição: k=1 estolou o mundo 3 em
  // 2 de 2 runs, k=0 saudável em 3/3 → escalamos suave)
  Batalha.escalaMonstros('mundo', 0.5);
  Batalha.restaurarMapa(1);
  Batalha.restaurarOnda(6);
  conf(Batalha.qtdMonstros() === 5,
    'shipado (k=0,5): teto 5 no mundo 1 (early intacto)');
  Batalha.restaurarMapa(24);                  // mundo 3 — a zona medida
  conf(Batalha.qtdMonstros() === 6,
    'shipado (k=0,5): teto 6 no mundo 3 (zona do estol)');
  Batalha.restaurarMapa(100);
  conf(Batalha.qtdMonstros() === 9,
    'shipado (k=0,5): teto 9 no fim da campanha (escala 5→9)');

  // --- 2) A/B: variante 'mapa' chega no MESMO ponto, mais suave no meio
  Batalha.escalaMonstros('mapa', 2);
  Batalha.restaurarMapa(100);
  conf(Batalha.qtdMonstros() === 23,
    'variante mapa: mesmo ponto final (23) no mapa 100');
  Batalha.restaurarMapa(11);                   // primeira fronteira de mundo
  const nMapa = Batalha.qtdMonstros();
  Batalha.escalaMonstros('mundo', 2);
  const nMundo = Batalha.qtdMonstros();
  conf(nMundo === 7 && nMapa === 6,
    'mapa 11: mundo dá 7 (degrau na fronteira), mapa dá 6 (mais suave)');
  Batalha.escalaMonstros('mundo', 0.5);        // restaura o valor shipado

  // --- 3) vitória: chefe do mapa 100 → overlay → continuar
  Batalha.restaurarMapa(100);
  Batalha.restaurarOnda(100);                  // onda 99 + tOnda 0 → nasce a 100
  let nasceu = false;
  for (let i = 0; i < 600 && !nasceu; i++) {
    frame(1);
    nasceu = Batalha.info().boss;
  }
  conf(nasceu, 'chefe do mundo 10 em campo (mapa 100, onda 100)');

  let passou = false;
  for (let i = 0; i < 6000 && !passou; i++) {
    frame(1);
    if (Batalha.info().mapa >= 101) passou = true;
  }
  conf(passou, 'derrotar o chefe do mundo 10 avança ao mapa 101 (fim da campanha)');

  // overlay aparece no render seguinte
  jogoCanvas._textos = [];
  frame(1);
  conf(jogoCanvas._textos.some(t => t.indexOf('CAMPANHA CONCLUÍDA') >= 0),
    'overlay de vitória aparece ao cruzar o mundo 10');
  conf(!p.vitoria, 'flag vitoria ainda false (só no clique de Continuar)');

  // --- 4) bloqueio: com o overlay no ar, os botões de baixo não respondem
  clique(236, 388);                           // Trocar herói (rodapé)
  frame(1);
  conf(Game.cena === 'jogo',
    'overlay bloqueia os botões de baixo (Trocar herói não responde)');

  // --- 5) Continuar: grava a flag e some com o overlay
  clique(384, 276);                           // centro do botão Continuar
  frame(1);
  conf(p.vitoria === true, 'clique em Continuar grava p.vitoria');
  jogoCanvas._textos = [];
  frame(1);
  conf(!jogoCanvas._textos.some(t => t.indexOf('CAMPANHA CONCLUÍDA') >= 0),
    'overlay some depois de Continuar');

  // --- 6) persistência: normalizar mantém a flag; reabrir não re-mostra
  conf(Personagem.normalizar(JSON.parse(JSON.stringify(p))).vitoria === true,
    'normalizar preserva vitoria no save (round-trip)');
  conf(Personagem.normalizar({}).vitoria === false,
    'save novo nasce com vitoria false');
  Salvar.salvarEstado(p.id, Batalha.info().onda || 1, Date.now(), false,
                      Batalha.info().mapa);
  Game.setScene('jogo');                      // reabre a cena
  frame(2);
  jogoCanvas._textos = [];
  frame(1);
  conf(!jogoCanvas._textos.some(t => t.indexOf('CAMPANHA CONCLUÍDA') >= 0),
    'reabrir a cena não re-mostra o overlay (vitoria persiste)');
  conf(Batalha.info().mapa >= 101,
    'modo infinito segue após reabrir (mapa ' + Batalha.info().mapa + ')');
}

console.log('40) gestao-atributos: teto da regen, afixo vel e clamp final');
{
  const Personagem = sandbox.Personagem;
  const Batalha = sandbox.Batalha;
  const Itens = sandbox.Itens;
  const p = Game.personagem;

  // --- 1) afixo "vel" com escala limitada (spec R-GA-3)
  // no mapa 100 a escala é 100 — sem o limite o afixo daria +600 e o
  // clamp de 250 desperdiçaria o item inteiro
  let velMax = 0, danoMax = 0;
  for (let i = 0; i < 400; i++) {
    const it = Itens.geraItem(4, 100, 'ladino');
    if (it.bonus.vel) velMax = Math.max(velMax, it.bonus.vel);
    if (it.bonus.dano) danoMax = Math.max(danoMax, it.bonus.dano);
  }
  conf(velMax > 0 && velMax <= 30,
    'afixo vel limitado no mapa 100 (máx ' + velMax + ' ≤ 30)');
  conf(danoMax > 500,
    'afixo dano mantém escala cheia no mapa 100 (' + danoMax + ')');

  // --- 2) clamp final: pior caso possível nunca passa de 250
  const antes = { at: p.atributos, eq: p.equip, nv: p.nivel };
  p.nivel = 9500;
  p.atributos = { for: 8, des: 3174, con: 8, int: 8, car: 8 };  // mono-DES
  p.equip = { arma: { nome: 'V', slot: 'arma', rar: 4, escala: 100,
                      up: 8, afixos: [], bonus: { vel: 3000 } },
              armadura: { nome: 'V2', slot: 'armadura', rar: 4,
                          escala: 100, up: 8, afixos: [],
                          bonus: { vel: 3000 } } };
  p.keystoneOn = false;
  const sPior = Personagem.status(p);
  conf(sPior.vel <= Personagem.VEL_MAX,
    'pior caso (mono-DES teto + item +3.000): vel = ' + sPior.vel +
    ' ≤ ' + Personagem.VEL_MAX);
  conf(sPior.recarga >= 35 / Personagem.VEL_MAX - 1e-9,
    'recarga respeita o teto da vel (' + sPior.recarga.toFixed(3) + 's ≥ ' +
    (35 / Personagem.VEL_MAX).toFixed(3) + 's)');
  // Σpartes do detalhamento fecha com o teto (antes o rodapé mostrava
  // 321/778 contra 250 — o clamp da velocidade não era detalhado)
  const detPior = Personagem.statusDetalhado(p);
  const somaVel = detPior.vel.partes.reduce((a, x) => a + x.v, 0);
  conf(Math.abs(somaVel - sPior.vel) < 1e-9,
    'detalhamento da velocidade fecha no teto (' + Math.round(somaVel) +
    ' = ' + Math.round(sPior.vel) + ')');
  p.atributos = antes.at; p.equip = antes.eq; p.nivel = antes.nv;

  // --- 3) regen COM TETO (spec R-GA-4): a taxa observada nunca passa
  // de REGEN_MAX por segundo (era hpMax×4%/s = 2.800/s no late = invencível)
  // con alto p/ hpMax > 12.500 (sem isso 4%/s nunca passaria do teto),
  // for baixo p/ os inimigos viverem e drenarem hp (senão hp fica
  // cheio e não há o que medir), nível fixo p/ hpMax não saltar
  p.atributos = { for: 8, con: 9999, des: 8, int: 8, car: 8 };
  p.nivel = 1;
  p.equip = { arma: null, armadura: null };
  Batalha.restaurarOnda(1);
  if (Batalha.info().pausada) Batalha.alternarPausa();
  let esperaV = 0;
  while (Batalha.info().morto && esperaV < 900) { frame(1); esperaV++; }
  // folga = teto×dt + 1,5 p/ o Math.ceil do info().hp (arredonda p/
  // cima e infla o delta em até 1/frame). SEM o teto a cura seria
  // hpMax×4%×dt ≈ 26,7/frame — então 9,0 prova o corte (era 500).
  const dt = 0.0167, margem = Batalha.REGEN_MAX * dt + 1.5;
  // info() não expõe hpMax — sai do status (estável: nível congelado)
  const hpMaxFixo = Personagem.status(p).hpMax;
  let maiorDelta = 0, vistos = 0, hpAnt = null;
  for (let i = 0; i < 3000; i++) {
    frame(1);
    p.xp = 0;                     // congela o nível (hpMax estável)
    const f = Batalha.info();
    if (!f.morto && f.hp > 0 && f.hp < hpMaxFixo && hpAnt !== null &&
        f.hp > hpAnt) {
      maiorDelta = Math.max(maiorDelta, f.hp - hpAnt);
      vistos++;
    }
    hpAnt = f.hp;
  }
  conf(vistos > 50 && maiorDelta <= margem,
    'regen limitada pelo teto (maior cura/frame ' + maiorDelta.toFixed(1) +
    ' ≤ ' + margem.toFixed(1) + ' = ' + Batalha.REGEN_MAX + '×dt×1,05, ' +
    'em ' + vistos + ' frames medidos)');

  // --- 4) cadência dos pontos na fonte única (a seção 4 cobre o fluxo)
  conf(Personagem.PONTOS_CADA === 1 && Personagem.PONTOS_NIVEL === 1,
    'fonte única: 1 ponto a cada nível (' + Personagem.PONTOS_CADA +
    '/' + Personagem.PONTOS_NIVEL + ')');

  // --- 5) batida e cota (spec onda-timer R-TIM-1/2): constantes
  // exportadas (o comportamento cobre a seção 51). Literal p/ decisão
  // de design: mudar a cota tem que estourar aqui (mundo-fullscreen:
  // mantenedor reduziu 30 → 20s em 2026-11-18, após medir 15s)
  conf(Batalha.BEAT === 2 && Batalha.ONDA_SEG === 20,
    'batida 2s e cota 20s exportadas (BEAT=' + Batalha.BEAT +
    ' · ONDA_SEG=' + Batalha.ONDA_SEG + ')');

  // --- 6) o keystone de crítico ROMPE o teto 45 (o +18C/−10%D não pode
  // virar só o custo no late game) e o detalhamento fecha com o status
  const bk = { classe: p.classe, nivel: p.nivel, at: p.atributos,
               eq: p.equip, lib: p.keystoneLib, on: p.keystoneOn };
  p.classe = 'ladino';
  p.nivel = 100;
  p.atributos = { for: 8, des: 20, con: 8, int: 8, car: 8 };
  p.equip = { arma: null, armadura: null };
  p.keystoneLib = true;
  p.keystoneOn = false;
  const offK = Personagem.status(p);
  p.keystoneOn = true;
  const onK = Personagem.status(p);
  const detK = Personagem.statusDetalhado(p);
  const somaK = detK.crit.partes.reduce((a, x) => a + x.v, 0);
  conf(offK.crit === 45 && onK.crit === 45 + 18 &&
       Math.abs(somaK - onK.crit) < 1e-9,
    'keystone de crítico rompe o teto 45 (45 → ' + onK.crit +
    ') e Σpartes fecha (' + Math.round(somaK) + ')');
  p.classe = bk.classe; p.nivel = bk.nivel; p.atributos = bk.at;
  p.equip = bk.eq; p.keystoneLib = bk.lib; p.keystoneOn = bk.on;
}

console.log('41) monstros novos: espécies com skill, ranged, comum intacto e eventos');
{
  const Batalha = sandbox.Batalha;
  const Mapas = sandbox.Mapas;
  const Eventos = sandbox.Eventos;
  const Efeitos = sandbox.Efeitos;
  const Personagem = sandbox.Personagem;
  const p = Game.personagem;

  // cena de jogo com estado limpo (a 40 terminou na arena)
  Salvar.salvarEstado(p.id, 1, Date.now(), false, 1);
  Game.setScene('jogo');
  // 62 frames (não 2): o herói nasce em iniciar() com inv: 1 (graça de
  // 1s) e a onda 1 só nasce no frame 60 — rodar até aqui deixa o inv
  // zerado SEM combate (os bichos nascem no último frame e ainda estão
  // a 460+px do anel full screen). Sem isso o 1º tiro do atirador
  // pousa na janela de graça e machucaHeroi engole o dano (o 2º tiro
  // vem a 2,2s = fora da espera do teste) — flake medido: 3 falhas
  // em 5 runs.
  frame(62);
  if (Batalha.info().pausada) Batalha.alternarPausa();

  // --- 1) as 3 espécies novas, cada uma com a skill declarada
  const T = Batalha.TIPOS;
  conf(['atirador', 'regenerador', 'drenador'].every(k => !!T[k]),
    '3 espécies novas em TIPOS');
  conf(T.atirador.ranged && T.regenerador.regen && T.drenador.dreno,
    'cada uma com a skill própria declarada (ranged/regen/dreno)');
  conf(T.atirador.ranged.alcance === 90 &&
       T.atirador.ranged.cd > 1.4,
    'atirador: alcance 90 e cd 2,2s > 1,4s do CQC (janela de reação)');
  conf(T.atirador.hp <= T.visgo.hp && T.regenerador.hp <= T.aranha.hp &&
       T.drenador.hp <= T.aranha.hp,
    'stats MENORES que o raro antigo (a mecânica já é a ameaça)');

  // --- 2) comum intacto nos 10 + raro novo só nos temas 5-9
  // (varre os 10 TEMAS — com o ciclo por mapa de10 (R-INF-9) info(m)
  // percorre LISTA[0..9] na ordem de sempre)
  const comuns = [];
  const raros = [];
  for (let m = 1; m <= 10; m++) {
    const t = Mapas.info(m).inimigos;
    comuns.push(t.comum.tipo);
    raros.push(t.raro.tipo);
  }
  conf(JSON.stringify(comuns) === JSON.stringify(
    ['slime', 'slime', 'aranha', 'slime', 'slime',
     'morcego', 'visgo', 'morcego', 'visgo', 'aranha']),
    'o COMUM dos 10 temas não mudou (progressão medida intacta): ' +
    comuns.join(','));
  conf(JSON.stringify(raros.slice(4)) === JSON.stringify(
    ['regenerador', 'atirador', 'regenerador', 'atirador',
     'drenador', 'drenador']),
    'temas 5-9 ganham as espécies novas como RARO: ' +
    raros.slice(4).join(','));

  // --- 3) SKILLS PURAS (função exportada = fonte única do update)
  const reg = { regen: 0.03, regenApos: 2, hp: 50, hpMax: 100,
                hitFlash: 0, semDano: 0 };
  let reg1 = false;
  for (let i = 0; i < 300 && !reg1; i++) {
    reg1 = Batalha.regeneraEspecie(reg, 1 / 60);
  }
  conf(reg1 && reg.hp > 50 && reg.semDano > 2,
    'regenerador: cura só após 2s sem apanhar (hp ' + reg.hp.toFixed(1) + ')');
  reg.hitFlash = 0.12;            // acabou de levar golpe (sinal do jogo)
  Batalha.regeneraEspecie(reg, 1 / 60);
  conf(reg.semDano === 0, 'regenerador: apanhou → trava (semDano = 0)');
  reg.veneno = { cor: '#8ac040' };
  reg.hp = 50; reg.semDano = 99;
  const curouVeneno = Batalha.regeneraEspecie(reg, 1 / 60);
  conf(!curouVeneno,
    'regenerador: envenenado NÃO regenera (o veneno do herói vale algo)');
  const dren = { dreno: 0.3, hp: 50, hpMax: 100 };
  conf(Batalha.drenaVida(dren, 100) && dren.hp === 80,
    'drenador: 30% do dano vira vida (100 → 80)');
  conf(!Batalha.drenaVida({ dreno: 0.3, hp: 100, hpMax: 100 }, 50),
    'drenador: cheio não estoura o hpMax');

  // --- 4) ATIRADOR na arena: o dano cai NA CHEGADA do projétil
  // HP altíssimo (não morre) mas DANO MÍNIMO (não mata o atirador
  // antes do projétil pousar — com int 999 ele limpava a arena antes
  // do tiro e a asserção media +0)
  p.atributos.for = 1;
  p.atributos.con = 9999;
  p.atributos.int = 1;
  // des 1 = herói LENTO (vel 70): com o DES herdado (vel 250) ele
  // alcançava o atirador em 0,5s e o matava ANTES do cd inicial dele
  // expirar (medido: `atir=undefined` no diag) — a 70px/s a perseguição
  // leva ~2,9s e o tiro (cd inicial ≤1,3s + alcance 90) sai primeiro
  p.atributos.des = 1;
  p.nivel = 50;
  // ARENA SÓ COM O ATIRADOR — dois erros medidos e corrigidos:
  //  (a) restaurarOnda(1) deixa onda 0 → ondaTotal −1 → escHp −0,9 →
  //      HP NEGATIVO no spawn (inimigo inválido); restaurarOnda(2) deixa
  //      a onda 1 (tot 0, escHp 1) e a arena limpa;
  //  (b) a onda 1 nasceria com slimes e o dano da asserção viria DELES.
  // A onda seguinte nasce só quando a atual limpa (guarda inimigos=0),
  // então a janela de medição é livre por ~450 frames (7,5s ≈ 3 tiros).
  Batalha.restaurarOnda(2);
  conf(Batalha.info().inimigos === 0 && Batalha.info().onda === 1,
    'arena zerada na onda 1 (tot 0 → escala de hp válida)');
  Batalha.spawn({ tipo: 'atirador' });
  conf(Batalha.info().bichos.some(b => b.chave === 'atirador'),
    'atirador nasce em campo (sonda bichos)');
  // PROVA do TIRO pelo reset do cooldown: só o ramo ranged seta
  // atkCd = 2,2 (o corpo a corpo de todos os inimigos seta 1,4) — o cd
  // passa de ≤1,6 para >1,6 = ele conjurou. Isolado de "quem deu o
  // dano", então a asserção não depende da fonte do hit.
  let atirou = false, cdAnterior = null;
  const dano0 = p.stats.danoRecebido;
  for (let i = 0; i < 450 && !atirou; i++) {
    const b = Batalha.info().bichos.find(x => x.chave === 'atirador');
    const cd = b ? b.atkCd : null;
    if (cdAnterior !== null && cd !== null &&
        cdAnterior <= 1.6 && cd > 1.6) atirou = true;
    cdAnterior = cd;
    frame(1);
  }
  if (!atirou) {
    const f = Batalha.info();
    const b = f.bichos.find(x => x.chave === 'atirador');
    console.log('    [diagAtir] limpa=' + limpa + ' inim=' + f.inimigos +
      ' morto=' + f.morto + ' hp=' + f.hp + ' onda=' + f.onda +
      ' atir=' + JSON.stringify(b) + ' dano=' + (p.stats.danoRecebido - dano0));
  }
  conf(atirou,
    'atirador CONJURA o tiro (reset do cd para 2,2s — só o ramo ' +
    'ranged faz isso; o CQC de qualquer inimigo setaria 1,4s)');
  // o projétil do tiro pousa e drena vida do herói (dano na chegada)
  const danoDepois = p.stats.danoRecebido;
  for (let i = 0; i < 120 && p.stats.danoRecebido === danoDepois; i++) frame(1);
  conf(p.stats.danoRecebido > dano0,
    'o dano do tiro cai na CHEGADA do projétil (+' +
    (p.stats.danoRecebido - dano0) + ' de dano recebido)');

  // --- 5) Enxame (R-MON-4.1): rolagem, dobra a onda, paga ×1,5, encerra
  Eventos.nasceEnxame = Eventos._nasceEnxame;   // religa (mosquetão)
  Eventos.nasceCofre = Eventos._nasceCofre;
  const rnd = Math.random;
  Math.random = function () { return 0; };      // rolagem sempre "sim"
  conf(Eventos.nasceEnxame(20) === true &&
       Eventos.enxameAtivo() && Eventos.multEnxame() === 1.5,
    'enxame: rolagem forçada → ativo e XP/ouro ×1,5');
  Eventos.encerraEnxame();
  conf(Eventos.multEnxame() === 1 && Eventos.enxameAtivo() === false,
    'enxame: encerra ao passar de onda (×1,5 vale só na onda dele)');
  Math.random = function () { return 1; };      // rolagem sempre "não"
  conf(Eventos.nasceEnxame(20) === false,
    'enxame: sem luck não nasce (pity/carence funcionam)');
  Math.random = rnd;
  // na arena: com luck forçado a onda nasce DOBRADA (Eventos.limpa
  // antes: os testes acima deixaram carência/pity ativos)
  Eventos.limpa();
  Math.random = function () { return 0; };
  Batalha.restaurarOnda(20);
  frame(1);
  const comEnx = Batalha.info().inimigos;
  Eventos.encerraEnxame();
  Math.random = function () { return 1; };
  Batalha.restaurarOnda(20);
  frame(1);
  const semEnx = Batalha.info().inimigos;
  Math.random = rnd;
  conf(comEnx === Math.ceil(semEnx * 2),
    'enxame dobra a onda (' + comEnx + ' = 2×' + semEnx + ')');

  // --- 6) Cofre Abandonado (R-MON-4.2): nasce no campo, só quem
  //        passar coleta — e paga ouro + drop rar 2
  Math.random = function () { return 0; };
  Eventos.cofreColetado();
  conf(Eventos.nasceCofre(20) === true,
    'cofre: rolagem forçada → elegível');
  // posição já colocada pelo nasceEventos da onda; coloca manualmente
  const antesOuro = p.ouro || 0;
  const antesItens = p.stats.itens;
  // leva o herói até o cofre: ele caminha sozinho sem inimigos em campo
  // — iniciar() dá ~1s de campo vazio (tOnda 1,0) e poe o herói no
  // centro do chunk; restaurarOnda(1) nascia a onda já no frame 1 e o
  // anel full screen (≈460px) atrasou tanto a aproximação que o herói
  // passava a janela toda perseguindo monstros p/ leste (7 frames de
  // subida — FALHA medida na fase B)
  Batalha.iniciar();
  frame(1);
  Math.random = rnd;
  Eventos.cofreColetado();
  Eventos.colocaCofre(60, 60);        // canto fixo p/ o teste
  // teleporta o herói perto (chegada por proximidade, sem esperar andar)
  // — o movimento até lá já é coberto pelo caminho natural no jogo
  const cof = Batalha.info().cofre;
  conf(cof && cof.x === 60 && cof.y === 60,
    'cofre aparece na sonda com a posição certa');
  // caminhada VERTICAL até o cofre com WALK (bug pré-existente desde
  // monstros-novos: o bloco do cofre chamava anima(walk) sem fluxo
  // próprio e o ramo "sem alvo" sobrescrevia com idle — o herói
  // DESLIZAVA em idle em linha reta; sonda info().heroi.anim p/ pegar)
  // — 54px p/ cima: o caminho inteiro cai na CLAREIRA central do chunk
  // (y ∈ 70..198 sem centros de obstáculo) — com −100 o herói saía da
  // clareira e podia grudar numa árvore (flake medido: nunca coletava)
  Eventos.colocaCofre(Math.round(Batalha.info().heroi.x),
    Math.round(Batalha.info().heroi.y) - 54);
  let subiu = 0, movendo = 0, andandoIdle = 0;
  let pyV = Batalha.info().heroi.y;
  for (let i = 0; i < 400; i++) {
    frame(1);
    const s = Batalha.info();
    const dyV = s.heroi.y - pyV;
    pyV = s.heroi.y;
    if (dyV < -0.3) {                 // só conta frames EM MOVIMENTO
      movendo++;
      subiu -= dyV;
      if (s.heroi.anim !== 'walk') andandoIdle++;
    }
    if (s.cofre === null) break;      // coletou (chegou perto)
  }
  // invariant: movimento ⇒ walk (obstáculo no caminho não importa —
  // o que se mede é a POSE durante o deslocamento, não a distância)
  conf(movendo >= 8 && andandoIdle === 0,
    'caminhada vertical p/ o cofre anda com WALK (' +
    movendo + ' frame(s) em movimento, ' + andandoIdle +
    ' deles em idle; subiu ' + Math.round(subiu) + 'px)');
  // caminha: sem inimigos, o herói vai até ele (R-MON-4.2)
  let coletou = false;
  for (let i = 0; i < 12000 && !coletou; i++) {
    frame(1);
    coletou = Batalha.info().cofre === null;
  }
  conf(coletou,
    'sem inimigos o herói caminha até o cofre e COLETA (soma ' +
    ((p.ouro || 0) - antesOuro) + ' de ouro)');
  conf((p.ouro || 0) > antesOuro && p.stats.itens > antesItens,
    'cofre paga ouro (' + Math.round(Mapas.forca(1) * 25) + ') + drop rar 2');

  Eventos.cofreColetado();
}

console.log('42) cutscenes: fronteiras de mundo, eventos e mapa do universo');
{
  const Cutscene = sandbox.Cutscene;
  const Batalha = sandbox.Batalha;
  const Eventos = sandbox.Eventos;
  const p = Game.personagem;

  // eventos DESLIGADOS na seção inteira (mosquetão): cada teste religa
  // só o que precisa — sem isso um cofre aleatório abriria cutscene e
  // bloquearia a gestão no meio dos testes
  Eventos.nasceAco = SEM_ACO;
  Eventos.nasceGat = SEM_GAT;
  Eventos.nasceEnxame = SEM_ENX;
  Eventos.nasceCofre = SEM_COF;
  Eventos.limpa();
  Cutscene.fecha();

  // cena de jogo com estado limpo (a 41 terminou na arena)
  Salvar.salvarEstado(p.id, 1, Date.now(), false, 1);
  Game.setScene('jogo');
  frame(2);
  if (Batalha.info().pausada) Batalha.alternarPausa();
  clique(240, 418);                        // aba Atributos (p/ o botão +)
  frame(1);

  // --- 1) gatilho: só fronteiras de mundo da campanha
  Batalha.restaurarMapa(10);
  Batalha.passaMapa();                    // 10 → 11: mundo 1 → 2
  conf(Cutscene.ativa(), 'fronteira 10→11 abre a cutscene');
  let inf = Cutscene.info();
  conf(inf.tipo === 'mundo' && inf.de === 1 && inf.para === 2,
    'cutscene de MUNDO 1 → 2 (tipo/de/para)');
  Cutscene.fecha();
  Batalha.restaurarMapa(3);
  Batalha.passaMapa();                    // 3 → 4: mesmo mundo
  conf(!Cutscene.ativa(), '3→4 (mesmo mundo) não abre');
  Batalha.restaurarMapa(20);
  conf(!Cutscene.ativa(), 'restaurarMapa não dispara (só passaMapa)');
  Cutscene.mundo(5, 6);                   // pendente proposital
  Batalha.restaurarMapa(100);
  Batalha.passaMapa();                    // 100 → 101: mundo 11
  conf(!Cutscene.ativa(),
    '100→101 corta a pendente (a vitória assume)');
  Batalha.restaurarMapa(1);

  // --- 2) prioridade (mundo > evento) e teto 1 dos eventos
  Cutscene.evento('cofre');
  inf = Cutscene.info();
  conf(inf.tipo === 'evento' && inf.chave === 'cofre',
    'evento abre cutscene');
  Cutscene.mundo(2, 3);
  inf = Cutscene.info();
  conf(inf.tipo === 'mundo' && inf.para === 3,
    'mundo SUBSTITUI evento (prioridade)');
  Cutscene.evento('enxame');
  inf = Cutscene.info();
  conf(inf.tipo === 'mundo' && inf.para === 3,
    'evento NÃO interrompe mundo (teto 1)');
  Cutscene.fecha();

  // --- 3) auto-dismiss dos eventos (~3,5s)
  Cutscene.evento('acougueiro');
  const rest0 = Cutscene.info().restante;
  conf(rest0 > 3, 'evento abre com cronômetro (' + rest0 + 's)');
  jogoCanvas._textos = [];
  frame(1);
  const te = jogoCanvas._textos;
  conf(te.some(x => x.indexOf('AÇOUGUEIRO') >= 0),
    'cutscene de evento renderiza o título');
  conf(te.some(x => x.indexOf('some sozinho') >= 0),
    'dica do evento sem botão ("some sozinho…") na tela');
  // narração DATILOGRAFADA (spec visual-cutscene): espera a linha
  // revelar — teto de frames p/ não travar se o texto crescer
  let narrou = false;
  for (let i = 0; i < 300 && !narrou; i++) {
    frame(1);
    narrou = (jogoCanvas._textos || [])
      .some(x => x.indexOf('fareja o seu rastro') >= 0);
  }
  conf(narrou, 'narração do evento datilografada na tela');
  frame(60);                              // ~1s
  const inf3 = Cutscene.info();
  conf(inf3 && inf3.restante < rest0,
    'cronômetro anda (' + rest0 + '→' + inf3.restante + ')');
  frame(200);                             // +3,3s
  conf(!Cutscene.ativa(), 'evento some sozinho (~3,5s)');

  // --- 4) silenciar (voltaAusencia desliga eventos na simulação)
  Cutscene.silenciar(true);
  Cutscene.evento('gatuno');
  conf(!Cutscene.ativa(), 'silenciado: evento não abre');
  Cutscene.silenciar(false);
  Cutscene.evento('gatuno');
  conf(Cutscene.ativa() && Cutscene.info().chave === 'gatuno',
    'liberado: evento abre');
  Cutscene.fecha();

  // --- 5) render do overlay de fronteira (mapa do universo + narração)
  Batalha.restaurarMapa(10);
  Batalha.passaMapa();                    // mundo 2 no ar
  jogoCanvas._textos = [];
  frame(1);
  const t42 = jogoCanvas._textos;
  conf(t42.some(x => x.indexOf('MUNDO 2') >= 0), 'título MUNDO 2 na tela');
  conf(t42.some(x => x.indexOf('Cripta Congelada') >= 0),
    'nome do mundo na tela');
  conf(t42.some(x => x.indexOf('Morcego Ancião') >= 0),
    'chefe do novo mundo na tela');
  conf(t42.some(x => x.indexOf('clique para avançar') >= 0),
    'dica "clique para avançar" na tela (sem botão)');
  conf(t42.some(x => x.indexOf('conquistado') >= 0),
    'legenda do mapa do universo na tela');
  // narração DATILOGRAFADA (spec visual-cutscene): linha 1 completa +
  // pausa 0,8s + linha 2 ≈ 2,5s — espera com teto de frames
  let narrouM = false;
  for (let i = 0; i < 400 && !narrouM; i++) {
    frame(1);
    narrouM = (jogoCanvas._textos || [])
      .some(x => x.indexOf('O gelo cobre tudo') >= 0);
  }
  conf(narrouM, 'narração da fronteira datilografada na tela');

  // --- 6) bloqueio da gestão + fechar (Enter e botão)
  p.xp = 0;                               // sem level-up no meio do teste
  p.pontos = 5;
  const for0 = p.atributos.for;
  clique(722, 92);                        // botão + de Força
  frame(1);
  conf(p.atributos.for === for0 && p.pontos === 5,
    'cutscene bloqueia a gestão (+ não responde)');
  tecla('keydown', 'Enter', 'Enter');
  tecla('keyup', 'Enter', 'Enter');
  frame(1);
  conf(!Cutscene.ativa(), 'Enter fecha a cutscene');
  Cutscene.mundo(1, 2);                   // reabre p/ testar os cliques
  conf(Cutscene.info().botao === null, 'sem botão (info().botao null)');
  let fechou42 = false;
  for (let i = 0; i < 6 && !fechou42; i++) {
    clique(300, 250);                     // sem botão: todo clique avança
    frame(1);
    fechou42 = !Cutscene.ativa();
  }
  conf(fechou42, 'cliques avançam e encerram a cena (sem botão)');
  clique(722, 92);
  frame(1);
  conf(p.atributos.for > for0 && p.pontos < 5,
    'gestão desbloqueada após fechar (+ responde)');
  Batalha.restaurarMapa(1);

  // --- 7) wiring: os 4 eventos chamam Cutscene.evento (RNG religado;
  //        spy substitui a função p/ não abrir cutscene de verdade)
  Eventos.limpa();
  const evOrig = Cutscene.evento;
  const chaves = [];
  Cutscene.evento = function (k) { chaves.push(k); };
  const rnd7 = Math.random;
  Math.random = function () { return 0; };   // rolagens sempre "sim"

  Eventos.nasceEnxame = Eventos._nasceEnxame;
  Batalha.restaurarOnda(16);             // onda 16 ≥ 15 (mínimo do enxame)
  frame(1);
  conf(chaves.indexOf('enxame') >= 0, 'wiring: enxame → Cutscene.evento');
  Eventos.nasceEnxame = SEM_ENX;

  Eventos.nasceCofre = Eventos._nasceCofre;
  Batalha.restaurarOnda(11);             // onda 11 ≥ 10 (mínimo do cofre)
  frame(1);
  conf(chaves.indexOf('cofre') >= 0, 'wiring: cofre → Cutscene.evento');
  Eventos.nasceCofre = SEM_COF;

  Eventos.nasceAco = Eventos._nasceAco;
  Batalha.restaurarOnda(31);             // onda 31 ≥ 30 (mínimo do Açougueiro)
  frame(1);
  conf(chaves.indexOf('acougueiro') >= 0,
    'wiring: açougueiro → Cutscene.evento');
  Eventos.nasceAco = SEM_ACO;

  p.ouro = Math.max(p.ouro || 0, 1000);  // gatuno só rola com ouro > 0
  Eventos.nasceGat = Eventos._nasceGat;
  Batalha.restaurarOnda(2);
  frame(1);
  conf(chaves.indexOf('gatuno') >= 0, 'wiring: gatuno → Cutscene.evento');
  Eventos.nasceGat = SEM_GAT;

  Math.random = rnd7;
  Cutscene.evento = evOrig;
  Cutscene.fecha();

  // --- 8) cena própria: mapa do universo (botão na seleção)
  Game.setScene('selecao');
  frame(1);
  Salvar.salvarEstado(Game.personagem.id, 25, Date.now(), false, 25);
  clique(192, 319);                      // botão Universo (132,306,120,26)
  frame(2);
  conf(Game.cena === 'universo',
    'botão Universo na seleção abre a cena');
  jogoCanvas._textos = [];
  frame(1);
  const tu = jogoCanvas._textos;
  conf(tu.some(x => x.indexOf('MAPA DO UNIVERSO') >= 0),
    'título MAPA DO UNIVERSO na tela');
  conf(tu.some(x => x.indexOf('Pântano Venenoso') >= 0),
    'tema do mapa do save (25 → ciclo por mapa = Pântano) com nome');
  conf(tu.some(x => x.indexOf('Baba do Pântano') >= 0),
    'chefe do tema atual na tela');
  conf(tu.some(x => x.indexOf('mapa 25') >= 0),
    'progresso do save (mapa 25) na tela');
  clique(Math.round(Game.W / 2), 358);   // botão Voltar (W/2-70,340,140,36)
  frame(1);
  conf(Game.cena === 'selecao', 'Voltar retorna à seleção');
}

console.log('43) árvore de skills: 8 por classe, ramos e loadout escalonado');
{
  const Skills = sandbox.Skills;
  const Personagem = sandbox.Personagem;
  const Batalha = sandbox.Batalha;
  const p = Game.personagem;

  // cena de jogo limpa (a 42 terminou na seleção)
  Salvar.salvarEstado(p.id, 1, Date.now(), false, 1);
  Game.setScene('jogo');
  frame(2);
  if (Batalha.info().pausada) Batalha.alternarPausa();

  // --- 1) árvore: 8 skills/classe, níveis 5..400 na ordem
  const NVS = [5, 15, 25, 35, 45, 60, 150, 400];
  conf(['guerreiro', 'mago', 'ladino', 'clerigo'].every(c => {
    const d = Skills.daClasse(c);
    return d.length === 8 && d.every((s, i) => s.nivel === NVS[i]);
  }), 'toda classe tem 8 skills nos níveis 5, 15, 25, 35, 45, 60, 150, 400');
  conf(Skills.proxima('mago', 45).nivel === 60 &&
       Skills.proxima('mago', 400) === null,
    'proxima(45) aponta a nv 60; null com todas desbloqueadas');

  // --- 2) as novas abrem os tipos que faltavam em cada classe
  const tipos = c => new Set(Skills.daClasse(c).map(s => s.tipo));
  conf(['cura', 'medo'].every(t => tipos('guerreiro').has(t)) &&
       ['veneno', 'medo', 'cura'].every(t => tipos('mago').has(t)) &&
       ['cura', 'medo'].every(t => tipos('ladino').has(t)) &&
       ['mobilidade', 'veneno'].every(t => tipos('clerigo').has(t)),
    'novas skills preenchem os tipos que faltavam por classe');
  conf(['guerreiro', 'mago', 'ladino', 'clerigo']
       .every(c => tipos(c).size >= 5),
    'toda classe cobre ao menos 5 dos 6 tipos');

  // --- 3) loadout escalonado: 3 → 4 (nv 50) → 5 (nv 150)
  conf([1, 49, 50, 149, 150, 9000].map(n => Skills.limite(n))
       .join(',') === '3,3,4,4,5,5' && Skills.LIMITE === 5,
    'limite(nivel): 3 → 4 no nv 50 → 5 no nv 150 (teto absoluto 5)');

  // --- 4) carregadas: automático acompanha o teto; seleção é fatiada
  p.classe = 'mago';
  p.nivel = 45;
  p.loadout = null;
  p.ramos = null;
  conf(Skills.carregadas(p).length === 3,
    'auto nv45 = 3 (idêntico ao baseline medido)');
  p.nivel = 200;
  const auto5 = Skills.carregadas(p);
  conf(auto5.length === 5 && auto5[0].nivel === 25,
    'auto nv200 = 5 (as mais avançadas desbloqueadas)');
  p.loadout = ['bola-fogo', 'nova-arcano', 'teleporte', 'meteoro',
    'rajada-arcana', 'toxina-arcano'];
  conf(Skills.carregadas(p).length === 5,
    'seleção de 6 ids fatia no limite atual (5)');
  p.nivel = 45;
  conf(Skills.carregadas(p).length === 3,
    'a mesma seleção no nv45 fatia em 3');
  p.loadout = null;

  // --- 5) ramos: dados — 2 por skill, campos permitidos, sidegrade
  const CAMPOS = Object.keys(Skills.SENTIDO);
  let ramOk = true, sideOk = true, nomesOk = true;
  for (const sk of Skills.LISTA) {
    if (!Array.isArray(sk.ramos) || sk.ramos.length !== 2) {
      ramOk = false;
      continue;
    }
    for (const r of sk.ramos) {
      if (!r.nome || r.nome.length > 7) nomesOk = false;
      let buff = 0, nerf = 0;
      for (const k in r.mods) {
        if (CAMPOS.indexOf(k) < 0) { ramOk = false; continue; }
        const s = Skills.SENTIDO[k] * (r.mods[k] - 1);
        if (s > 0) buff++;
        else if (s < 0) nerf++;
      }
      if (!buff || !nerf) sideOk = false;
    }
  }
  conf(ramOk, 'toda skill tem 2 ramos com mods só em campos permitidos');
  conf(sideOk, 'todo ramo é sidegrade (≥1 buff e ≥1 nerf, nunca buff puro)');
  conf(nomesOk, 'nomes de ramo têm ≤7 chars (cabe no botão de 52px)');

  // --- 6) comRamo: base neutra, merge e aCada inteiro
  const bravo = Skills.daClasse('guerreiro')[0];   // aCada 7, mult 1.2
  conf(Skills.comRamo(bravo, null) === bravo,
    'sem escolha = base neutra (a própria skill, valores intactos)');
  conf(bravo.aCada === 7 && bravo.mult === 1.2,
    'a base NÃO é mutada pelo merge');
  const largada = Skills.comRamo(bravo, 'largada');  // ×1.4 aCada, ×1.35 mult
  conf(largada.aCada === 10 && Math.abs(largada.mult - 1.62) < 1e-9 &&
       largada.ramo === 'largada',
    'comRamo aplica os fatores e arredonda aCada (7 → 9.8 → 10)');
  conf(Skills.comRamo(bravo, 'ramo-inexistente') === bravo,
    'ramo inválido cai na base neutra');

  // --- 7) ciclo: base → A → B → base (e limpa p.ramos)
  p.ramos = null;
  const ciclo = [];
  ciclo.push(Skills.cicloRamo(p, bravo));
  ciclo.push(Skills.cicloRamo(p, bravo));
  ciclo.push(Skills.cicloRamo(p, bravo));
  conf(ciclo.join(',') === 'largada,pressa,' && p.ramos === null,
    'ciclo do ramo: base → A → B → base (p.ramos volta a null)');

  // --- 8) carregadas mergeia o ramo escolhido
  p.classe = 'mago';
  p.nivel = 200;
  p.loadout = ['bola-fogo'];
  p.ramos = { 'bola-fogo': 'chama' };   // ×1.5 mult, ×1.35 intervalo
  const chama = Skills.carregadas(p)[0];
  conf(chama.ramo === 'chama' &&
       Math.abs(chama.mult - 2.7) < 1e-9 &&
       Math.abs(chama.intervalo - 6.075) < 1e-9,
    'carregadas mergeia o ramo ativo (chama: ×1.5 dano, ×1.35 recarga)');
  p.loadout = null;
  p.ramos = null;

  // --- 9) normalização do save (personagem — sem depender de skills)
  const mig = Personagem.normalizar(JSON.parse(JSON.stringify({
    nome: 'R', nivel: 10,
    ramos: { 'bola-fogo': 'chama', 'x': 5, '': 'y', 'mal': 6 }
  })));
  conf(mig.ramos && mig.ramos['bola-fogo'] === 'chama' &&
       Object.keys(mig.ramos).length === 1,
    'ramos no save: só pares de strings sobrevivem (lixo some)');
  conf(Personagem.normalizar({}).ramos === null,
    'save novo nasce sem ramos (base neutra)');

  // --- 10) level-up anuncia o teto que subiu (nv 50 → 4 skills)
  p.classe = 'mago';
  p.nivel = 49;
  p.xpProx = Personagem.custoProximo(49);
  p.xp = p.xpProx - 1;
  p.atributos.for = 50;
  p.atributos.int = 50;
  p.atributos.con = 200;
  Batalha.restaurarOnda(3);
  jogoCanvas._textos = [];
  let subiu = false;
  for (let i = 0; i < 3000 && !subiu; i++) {
    frame(1);
    subiu = (jogoCanvas._textos || [])
      .some(t => t.indexOf('Loadout: 4 skills') >= 0);
  }
  conf(subiu && p.nivel === 50,
    'level-up do nv 50 anuncia o teto novo do loadout (4 skills)');

  // --- 11) UI da aba Classe: grade 2×4 + botões de ramo
  p.classe = 'guerreiro';
  p.nivel = 400;
  p.loadout = null;
  p.ramos = null;
  clique(384, 418);                        // aba Classe
  frame(2);
  jogoCanvas._textos = [];
  frame(1);
  const t43 = jogoCanvas._textos;
  conf(['Golpe Embravecido', 'Ímpeto Vital', 'Grito de Guerra']
       .every(n => t43.some(x => x.indexOf(n) >= 0)),
    'grade 2×4 desenha as 8 skills (1ª, 6ª e 8ª)');
  conf(t43.some(x => x === 'Base'),
    'ramo sem escolha mostra "Base" no botão');
  conf(t43.some(x => x.indexOf('máx 5') >= 0),
    'cabeçalho usa o teto do nível (máx 5 no nv 400)');

  // ciclo por clique no botão de ramo (530..582, 178..202)
  clique(556, 190);
  frame(1);
  conf(p.ramos && p.ramos['golpe-bravo'] === 'largada',
    'clique no ramo: base → A (largada)');
  clique(556, 190);
  frame(1);
  conf(p.ramos && p.ramos['golpe-bravo'] === 'pressa',
    'clique no ramo: A → B (pressa)');
  clique(556, 190);
  frame(1);
  conf(p.ramos === null, 'clique no ramo: B → base (limpa p.ramos)');

  // tooltip da skill (dwell ~0,4s): hover no toggle da 1ª skill
  clique(471, 190);                       // toggle — também alterna o loadout
  jogoCanvas._textos = [];
  for (let i = 0; i < 26; i++) frame(1);
  const tt = jogoCanvas._textos;
  conf(tt.some(x => x.indexOf('Base neutra') >= 0),
    'tooltip da skill mostra a base neutra como opção');
  conf(tt.some(x => x.indexOf('Largada:') >= 0),
    'tooltip lista o ramo A com o efeito');

  // tooltip do botão de ramo
  clique(556, 190);                       // volta a ser largada (base → A)
  jogoCanvas._textos = [];
  for (let i = 0; i < 26; i++) frame(1);
  conf(jogoCanvas._textos
       .some(x => x.indexOf('Ramo da skill: Golpe Embravecido') >= 0),
    'tooltip do ramo descreve os dois ramos da skill');

  p.loadout = null;
  p.ramos = null;
}

console.log('44) IA dos monstros: flocking (separação) e influence map');
{
  const IA = sandbox.IA;
  const Batalha = sandbox.Batalha;
  const p = Game.personagem;

  // cena limpa (a 43 terminou na arena)
  Salvar.salvarEstado(p.id, 1, Date.now(), false, 1);
  Game.setScene('jogo');
  frame(2);
  if (Batalha.info().pausada) Batalha.alternarPausa();

  // --- 1) mapa de influência: ocupação repintada por frame
  IA.pintaMapa([{ x: 104, y: 108 }, { x: 200, y: 50 }]);
  conf(IA.celulaOcup(104, 108) >= 1,
    'mapa pinta a ocupação na célula do monstro');
  conf(IA.celulaOcup(300, 240) === 0, 'célula sem monstro = 0');
  IA.pintaMapa([]);
  conf(IA.celulaOcup(104, 108) === 0, 'repintar zera a ocupação');

  // --- obstáculo: consulta direta com o RAIO da entidade
  const rochas = Batalha.info().obst;
  conf(rochas.length > 0, 'arena tem obstáculos p/ o teste');
  const r0 = rochas[0];
  conf(IA.celulaObst(r0.cx, r0.cy, 6) === true,
    'rocha = obstáculo para o slime (r 6)');
  let brecha = null;
  for (let dist = 8; dist <= 17 && !brecha; dist++) {
    for (let a = 0; a < 8 && !brecha; a++) {
      const ang = a * Math.PI / 4;
      const bx = Math.round(r0.cx + Math.cos(ang) * dist);
      const by = Math.round(r0.cy + Math.sin(ang) * dist);
      if (!IA.celulaObst(bx, by, 6) && IA.celulaObst(bx, by, 11)) {
        brecha = [bx, by];
      }
    }
  }
  conf(!!brecha, 'brecha: slime (r6) passa onde o boss (r11) não para');

  // --- 2) separação (função pura — o flocking universal)
  const A = { x: 100, y: 100, raio: 6 }, B = { x: 108, y: 100, raio: 6 };
  const sNada = IA.separacao(A, [A]);
  conf(sNada.x === 0 && sNada.y === 0,
    '1 monstro: separação exatamente 0 (baseline intacta)');
  const sA = IA.separacao(A, [A, B]);
  const sB = IA.separacao(B, [A, B]);
  conf(Math.abs(sA.x + 10) < 0.01 && Math.abs(sB.x - 10) < 0.01,
    'dois a 8px se empurram para longe (±10px opostos)');
  const sLonge = IA.separacao(A, [{ x: 140, y: 100, raio: 6 }]);
  conf(sLonge.x === 0 && sLonge.y === 0, 'aliado a 40px: separação 0');

  // --- 3) destino via influence map (decideInimigo)
  const h2 = { x: 100, y: 100, morto: false, hp: 100, escapa: null };
  IA.pintaMapa([]);
  const s0 = { x: 60, y: 100, astucia: 0.5, slot: 0, raio: 6 };
  IA.decideInimigo(s0, h2, 0.0167);
  const r0d = Math.sqrt((s0.ia.destino.x - 100) ** 2 +
                        (s0.ia.destino.y - 100) ** 2);
  conf(Math.abs(r0d - 11) < 0.01,
    'sem ocupação: mantém o anel a 11px (contrato da seção 23)');
  IA.pintaMapa([{ x: 111, y: 100 }]);        // aliado no candidato do slot 0
  const s1 = { x: 60, y: 100, astucia: 0.5, slot: 0, raio: 6 };
  IA.decideInimigo(s1, h2, 0.0167);
  const d1 = s1.ia.destino;
  const r1 = Math.sqrt((d1.x - 100) ** 2 + (d1.y - 100) ** 2);
  conf(Math.abs(r1 - 11) < 0.01 &&
       !(Math.abs(d1.x - 111) < 0.01 && Math.abs(d1.y - 100) < 0.01),
    'aliado no slot preferido → gira p/ célula livre (raio 11 mantido)');
  IA.pintaMapa([]);
  const burro = { x: 60, y: 100, astucia: IA.astucia('slime', 1), slot: 0 };
  IA.decideInimigo(burro, h2, 0.0167);
  conf(burro.ia.destino === null,
    'burro continua sem slot (só separação — escopo confirmado)');

  // --- 4) integração na arena: a matilha não se empilha e cerca
  p.nivel = 1;                        // sem skills desbloqueadas (sem procs)
  p.atributos.for = 1;
  p.atributos.int = 1;
  p.atributos.des = 1;
  p.atributos.con = 9999;             // tanque: ninguém derruba o herói
  p.equip.arma = null;
  p.equip.armadura = null;
  p.autoApr = false;
  p.loadout = null;
  p.ramos = null;
  Batalha.restaurarOnda(2);            // limpa a arena (onda 1, vel base)
  const hb = Batalha.info().heroi;
  for (let i = 0; i < 6; i++) {
    const en = Batalha.spawn({ tipo: 'slime' });
    // anel controlado a 40px: ângulos uniformes (determinístico)
    const ang = i * Math.PI / 3;
    en.x = hb.x + Math.cos(ang) * 40;
    en.y = hb.y + Math.sin(ang) * 40;
    en.hp = en.hpMax = 9999;          // ninguém morre no meio do teste
  }
  // espera a matilha chegar ao alcance de ataque (teto 400 frames)
  let chegou = 0;
  for (let i = 0; i < 400 && chegou < 5; i++) {
    frame(1);
    chegou = Batalha.info().bichos.filter(b => b.dist <= 14).length;
  }
  conf(chegou >= 5,
    'matilha chega em alcance de ataque (' + chegou + '/6 a ≤14px)');

  const bs = Batalha.info().bichos;
  conf(bs.length === 6,
    'ninguém morreu no caminho (' + bs.length + '/6 vivos)');
  let minD = Infinity;
  for (let a = 0; a < bs.length; a++) {
    for (let b = a + 1; b < bs.length; b++) {
      const dd = Math.sqrt((bs[a].x - bs[b].x) ** 2 +
                           (bs[a].y - bs[b].y) ** 2);
      if (dd < minD) minD = dd;
    }
  }
  conf(minD >= 8,
    'sem empilhamento: par mais próximo a ' + Math.round(minD) +
    'px (≥8 — a separação segura o corpos distantes)');

  // cerco: os ângulos ao redor do herói cobrem o círculo (vão ≤170°)
  const hh = Batalha.info().heroi;
  const angs = bs.map(b => Math.atan2(b.y - hh.y, b.x - hh.x))
    .sort((x, y) => x - y);
  let maiorVao = 0;
  for (let i = 0; i < angs.length; i++) {
    const dd = (angs[(i + 1) % angs.length] - angs[i] + Math.PI * 2) %
      (Math.PI * 2);
    if (dd > maiorVao) maiorVao = dd;
  }
  const graus = Math.round(maiorVao * 180 / Math.PI);
  conf(graus <= 170,
    'cerco cobre o herói (maior vão ' + graus + '° ≤170°)');
}

console.log('45) IA do herói: Behavior Tree e evasão de cerco');
{
  const IA = sandbox.IA;
  const Batalha = sandbox.Batalha;
  const p = Game.personagem;

  // --- 1) estrutura da árvore
  conf(IA.CAMADAS.map(c => c.nome).join(',') ===
       'sobrevivencia,posicionamento,combate,perseguicao',
    'CAMADAS na ordem de prioridade (sobrevivência primeiro)');
  conf(IA.CAMADAS[0].prof === 3 && IA.CAMADAS[1].prof === 2 &&
       IA.CAMADAS[2].prof === 1 && IA.CAMADAS[3].prof === 1,
    'profundidade por camada: 3/2/1/1');
  conf(IA.profundidade(0) === 1 && IA.profundidade(0.34) === 1 &&
       IA.profundidade(0.35) === 2 && IA.profundidade(0.44) === 2 &&
       IA.profundidade(0.45) === 3 && IA.profundidade(1) === 3,
    'profundidade da INT: 1/2/3 nas fronteiras 0,35 e 0,45');

  // --- 2) gates por fixture direta (sem arena)
  const mkH = (int, hp) => ({ x: 100, y: 100, hp: hp, hpMax: 100,
    stats: { alcance: 26, atributos: { int: int } } });
  const inim = [{ x: 150, y: 100, hp: 50, hpMax: 50, dmg: 5 }];
  const perto2 = [{ x: 112, y: 100, hp: 50, hpMax: 50, dmg: 5 }];
  const salv = p.classe;
  p.classe = 'mago';                 // ranged: habilita posicionamento

  const burro = mkH(1, 1);
  let viuRecuar = false, viuKite = false;
  for (let i = 0; i < 60; i++) {
    IA.decideHeroi(burro, inim, 0.3);
    if (burro.ia.estado === 'recuar') viuRecuar = true;
    if (burro.ia.estado === 'kite') viuKite = true;
  }
  conf(!viuRecuar && !viuKite,
    'burro (prof 1) com HP 1 nunca recua nem kita em 60 ticks');

  const genio = mkH(20, 1);
  IA.decideHeroi(genio, inim, 0.3);
  conf(genio.ia.estado === 'recuar' && genio.ia.prof === 3,
    'gênio (prof 3) com HP 1 recua já no 1º tick (' + genio.ia.estado +
    ', prof ' + genio.ia.prof + ')');

  const kg = mkH(20, 100);
  IA.decideHeroi(kg, perto2, 0.3);
  conf(kg.ia.estado === 'kite',
    'ranged gênio perto kita — camada de posicionamento (' +
    kg.ia.estado + ')');

  const kb = mkH(1, 100);
  IA.decideHeroi(kb, perto2, 0.3);
  conf(kb.ia.estado !== 'kite',
    'ranged burro perto NÃO kita — prof 1 pula a camada (' +
    kb.ia.estado + ')');
  p.classe = salv;

  // --- 3) evasão de cerco (função pura)
  const cf = (x, y) => ({ x: Math.max(16, Math.min(368, x)),
                          y: Math.max(16, Math.min(252, y)) });
  IA.pintaMapa([]);
  const he = { x: 100, y: 100 };
  const base = IA.direcaoEvasao(he, 0, 90);
  conf(Math.abs(base.x - 190) < 0.001 && Math.abs(base.y - 100) < 0.001,
    'mapa vazio: a evasão cai exatamente no destino antigo (190,100)');

  // zona aberta: os 12 candidatos de 90px livres de rocha — o teste de
  // ocupação não pode depender do sorteio do cenário
  let livre = null;
  for (let hx = 110; hx <= 270 && !livre; hx += 10) {
    for (let hy = 110; hy <= 160 && !livre; hy += 10) {
      let ok = true;
      for (let k = 0; k < 12 && ok; k++) {
        const pt = cf(hx + Math.cos(k * Math.PI / 6) * 90,
                      hy + Math.sin(k * Math.PI / 6) * 90);
        if (IA.celulaObst(pt.x, pt.y, 6)) ok = false;
      }
      if (ok) livre = { x: hx, y: hy };
    }
  }
  conf(!!livre, 'mapa tem zona aberta p/ o teste de evasão');

  if (livre) {
    IA.pintaMapa([{ x: livre.x + 90, y: livre.y }]);   // inimigo na base
    const giro = IA.direcaoEvasao(livre, 0, 90);
    conf(!(Math.abs(giro.x - (livre.x + 90)) < 0.01 &&
           Math.abs(giro.y - livre.y) < 0.01) &&
         IA.celulaOcup(giro.x, giro.y) === 0,
      'inimigo no ponto base → evasão gira p/ célula livre');
  }
  IA.pintaMapa([]);

  // rocha na base: achar uma rocha cuja base esteja bloqueada e exista
  // rota livre fora dela (senão o desempate k=0 mantém o ponto de sempre)
  let cen = null;
  const rochas = Batalha.info().obst;
  for (let r = 0; r < rochas.length && !cen; r++) {
    const o = rochas[r];
    if (o.cx < 110 || o.cx > 300 || o.cy < 30 || o.cy > 240) continue;
    const hr = { x: o.cx - 90, y: o.cy };
    const k0 = cf(hr.x + 90, hr.y);
    if (!IA.celulaObst(k0.x, k0.y, 6)) continue;   // base na rocha
    let melhor = Infinity;
    for (let k = 1; k < 12; k++) {
      const pt = cf(hr.x + Math.cos(k * Math.PI / 6) * 90,
                    hr.y + Math.sin(k * Math.PI / 6) * 90);
      const sc = IA.celulaObst(pt.x, pt.y, 6) ? 100 : 0;
      if (sc < melhor) melhor = sc;
    }
    if (melhor < 100) cen = hr;         // existe rota fora da rocha
  }
  conf(!!cen, 'rocha com rota de fuga livre encontrada p/ o teste');
  if (cen) {
    IA.pintaMapa([]);
    const desvio = IA.direcaoEvasao(cen, 0, 90);
    conf(!IA.celulaObst(desvio.x, desvio.y, 6),
      'rocha no ponto base → evasão foge para fora da rocha');
  }
  IA.pintaMapa([]);

  // --- 4) sonda prof na arena (a 44 deixou INT 1 → prof 1)
  frame(25);
  const inf = Batalha.info();
  conf(inf.heroi.prof >= 1 && inf.heroi.prof <= 3,
    'sonda prof na arena = ' + inf.heroi.prof + ' (faixa 1-3)');
}

console.log('46) UI visual: paleta, primitivas com fallback e cromo');
{
  const UI = sandbox.UI;
  const ctx = jogoCanvas.getContext();
  UI.setContext(ctx);

  // --- 1) PALETA centralizada (chaves do doc ui.md §2 + acentos)
  const chaves = ['bgTop', 'bgBot', 'topoTop', 'topoBot', 'painelTop',
    'painelBot', 'borda', 'btnTop', 'btnBot', 'btnTopH', 'btnBotH',
    'ativoTop', 'ativoBot', 'sombra', 'ouro', 'ouroClaro', 'ouroEsc',
    'texto', 'suave', 'suave2', 'apagado', 'verde', 'vermelho'];
  const faltando = chaves.filter(k => !UI.PALETA[k]);
  conf(faltando.length === 0,
    'PALETA completa (' + (chaves.length - faltando.length) + '/' +
    chaves.length + (faltando.length ? ' — falta: ' + faltando.join(',') : '') + ')');
  const hexRuins = chaves.filter(k => k !== 'sombra' &&
    !/^#[0-9a-f]{6}$/i.test(UI.PALETA[k]));
  conf(hexRuins.length === 0,
    'cores da PALETA em hex válido' +
    (hexRuins.length ? ': ' + hexRuins.join(',') : ''));

  // --- 2) grad com fallback: o ctx do harness não tem gradiente real
  const g1 = UI.grad(0, 0, 0, 10, [[0, '#241d3e'], [1, '#16112c']]);
  conf(g1 === '#241d3e',
    'grad devolve a 1ª cor sólida sem createLinearGradient (' + g1 + ')');

  // --- 3) caminho: harness sem roundRect real (proxy = length 0)
  conf(typeof ctx.roundRect !== 'function' || ctx.roundRect.length === 0,
    'harness sem roundRect real → caminho cai no rect (quadrado nos testes)');
  const a0 = jogoCanvas._chamadas;
  UI.caminho(10, 10, 40, 20, 6);
  conf(jogoCanvas._chamadas >= a0 + 2,
    'caminho roda beginPath + retângulo sem exceção');

  // --- 4) caixa e panel desenham (Δ de chamadas) e título continua
  const a1 = jogoCanvas._chamadas;
  UI.caixa(20, 20, 60, 30, 6, '#334455');
  conf(jogoCanvas._chamadas > a1, 'caixa desenha sem exceção');

  jogoCanvas._textos = [];
  UI.panel(30, 40, 200, 100, 'TÍTULO TESTE');
  conf((jogoCanvas._textos || []).some(t => t.indexOf('TÍTULO TESTE') >= 0),
    'painel novo mantém o título em fillText');

  // --- 4b) receitas da spec mundo-fullscreen (janela flutuante + barra)
  jogoCanvas._textos = [];
  UI.janela(40, 60, 200, 100, 'JANELA TESTE');
  conf((jogoCanvas._textos || []).some(t => t.indexOf('JANELA TESTE') >= 0),
    'janela flutuante mantém o título em fillText');
  const a1b = jogoCanvas._chamadas;
  UI.barra(60, 404, 368, 28);
  conf(jogoCanvas._chamadas > a1b, 'barra de abas desenha sem exceção');

  // --- 5) fundo e faixaTopo das cenas
  const a2 = jogoCanvas._chamadas;
  UI.fundo(ctx);
  UI.faixaTopo(ctx, 30);
  conf(jogoCanvas._chamadas > a2, 'fundo/faixaTopo desenham sem exceção');

  // --- 6) sombra de texto: opt-in dobra fillText; padrão = 1 cópia
  jogoCanvas._textos = [];
  UI.text('SOMBRA2', 10, 10, { sombra: true });
  const nSombra = (jogoCanvas._textos || []).filter(t => t === 'SOMBRA2').length;
  conf(nSombra === 2, 'text com sombra desenha 2 cópias (' + nSombra + ')');
  jogoCanvas._textos = [];
  UI.text('SEM SOMBRA', 10, 30, {});
  const nSem = (jogoCanvas._textos || []).filter(t => t === 'SEM SOMBRA').length;
  conf(nSem === 1, 'text sem sombra continua com 1 cópia (' + nSem + ')');

  // --- 7) tom: mistura hex com branco (base do degradê das barras)
  conf(UI.tom('#000000', 1) === '#ffffff' && UI.tom('#d84a4a', 0) === '#d84a4a',
    'tom: preto×1 = branco, cor×0 = cor original');
  conf(UI.tom('rgba(1, 2, 3, 0.5)', 0.4) === 'rgba(1, 2, 3, 0.5)',
    'tom devolve não-hex intacto (não quebra)');

  // --- 8) botão:4 estados desenham sem exceção (hit-test é da seção 1)
  const a3 = jogoCanvas._chamadas;
  UI.button(40, 200, 120, 36, 'NORMAL');
  UI.button(40, 244, 120, 36, 'ATIVO', { ativo: true });
  UI.button(40, 288, 120, 36, 'OFF', { disabled: true });
  conf(jogoCanvas._chamadas > a3,
    'botão: 4 estados desenham sem exceção');
}

console.log('47) Ajustes playtest: resolução nítida, Vel inteira e scrollbar');
{
  const UI = sandbox.UI;
  const Batalha = sandbox.Batalha;
  const Gestao = sandbox.Gestao;
  const p = Game.personagem;

  // --- 1) backing = exibição (contrato de nitidez da spec)
  const dpr = sandbox.window.devicePixelRatio || 1;
  conf(jogoCanvas.width === parseInt(jogoCanvas.style.width, 10) * dpr &&
       jogoCanvas.height === parseInt(jogoCanvas.style.height, 10) * dpr,
    'backing store = exibição × dpr (' + jogoCanvas.width + '×' +
    jogoCanvas.height + ' vs CSS ' + jogoCanvas.style.width + ')');
  conf(Game.W === 768, 'largura lógica 768 intacta em 16:9 (layout)');

  // --- 2) Vel sem casas decimais (rodapé + aba Stats)
  const salvDes = p.atributos.des;
  p.atributos.des = 9;              // vel fracionária: 46+24×(9/8)^0,35
  const velBruta = Personagem.status(p).vel;
  conf(velBruta % 1 !== 0,
    'fixture: DES 9 gera vel fracionária (' + velBruta.toFixed(3) + ')');
  // cena em jogo, sem vitória/cutscene travando a gestão
  p.vitoria = false;
  if (typeof Cutscene !== 'undefined') Cutscene.fecha();
  if (Batalha.info().pausada) Batalha.alternarPausa();
  jogoCanvas._textos = [];
  frame(2);
  const txtRodape = jogoCanvas._textos || [];
  conf(txtRodape.some(t => /^Vel \d+$/.test(t)),
    'rodapé mostra Vel inteira (' +
    (txtRodape.find(t => /^Vel /.test(t)) || '?') + ')');

  // aba Stats (clique no seletor) — bloco Base → total
  clique(528, 418);
  jogoCanvas._textos = [];
  frame(2);
  const txts = jogoCanvas._textos || [];
  conf(!txts.some(t => /Vel \d+\./.test(t)),
    'nenhum texto com Vel decimal após render (rodapé + aba Stats)');
  p.atributos.des = salvDes;

  // --- 3) scrollbar da aba Stats não cobre os valores
  const sg = Gestao.statsGeom();
  conf(sg.valX + 2 <= sg.trilho.x,
    'valores à esquerda da scrollbar (x ' + sg.valX + ' + 2 ≤ trilho ' +
    sg.trilho.x + ')');
}

console.log('48) Visual cutscene: letterbox, datilografado e avançar');
{
  const Cutscene = sandbox.Cutscene;
  const Batalha = sandbox.Batalha;
  const p = Game.personagem;

  Cutscene.fecha();
  Salvar.salvarEstado(p.id, 1, Date.now(), false, 1);
  Game.setScene('jogo');
  frame(2);
  if (Batalha.info().pausada) Batalha.alternarPausa();

  // --- 1) avancar nos estágios do doc (complete → próxima → encerra)
  Cutscene.mundo(1, 2);
  let inf = Cutscene.info();
  conf(inf.tipo === 'mundo' && inf.revela.linha === 0 &&
       inf.revela.chars === 0,
    'cutscene nasce com a linha 0 não revelada');
  Cutscene.avancar();
  inf = Cutscene.info();
  conf(inf.revela.linha === 0 && inf.revela.chars > 0,
    'estágio 1: avançar completa a linha atual (' +
    inf.revela.chars + ' chars)');
  Cutscene.avancar();
  inf = Cutscene.info();
  conf(inf.revela.linha === 1 && inf.revela.chars === 0,
    'estágio 2: avançar passa para a próxima linha');
  Cutscene.avancar();
  inf = Cutscene.info();
  conf(inf.revela.linha === 1 && inf.revela.chars > 0,
    'estágio 3: completa a última linha');
  Cutscene.avancar();
  conf(!Cutscene.ativa(),
    'última linha completa → avançar encerra a cena');

  // --- 2) letterbox desliza até o cap (0,35s)
  Cutscene.mundo(1, 2);
  conf(Cutscene.info().barras === 0, 'letterbox nasce recolhido');
  for (let i = 0; i < 30; i++) frame(1);      // ~0,5s > 0,35s
  inf = Cutscene.info();
  conf(!!inf && inf.barras >= 0.35,
    'letterbox desliza até a altura final (' +
    (inf ? inf.barras : '?') + 's ≥ 0,35)');

  // --- 3) datilografado progride sozinho (REVELA 55 chars/s)
  let passou = false;
  for (let i = 0; i < 200 && !passou; i++) {
    frame(1);
    passou = Cutscene.info().revela.linha > 0;   // linha 0 completa
  }
  conf(passou, 'linha 0 se revela sozinha e avança (typewriter)');

  // --- 4) dica pisca (presença E ausência em 1s de frames)
  Cutscene.fecha();
  Cutscene.evento('cofre');
  let viu = 0, oculto = 0;
  for (let i = 0; i < 60; i++) {
    jogoCanvas._textos = [];
    frame(1);
    if ((jogoCanvas._textos || [])
      .some(t => t.indexOf('some sozinho') >= 0)) viu++; else oculto++;
  }
  conf(viu > 0 && oculto > 0,
    'dica do evento pisca (visível ' + viu + '/60, oculto ' +
    oculto + '/60)');
  conf(Cutscene.ativa(), 'evento segue vivo após 1s (auto-dismiss 3,5s)');

  // --- 5) clique em qualquer ponto avança (integração Jogo.update)
  Cutscene.fecha();
  Cutscene.mundo(1, 2);
  frame(1);
  const antes = Cutscene.info().revela;
  clique(100, 200);                        // sem botão: todo clique avança
  frame(1);
  const depois = Cutscene.info().revela;
  conf(depois.chars > antes.chars || depois.linha > antes.linha,
    'clique em qualquer ponto avança a narração (' +
    JSON.stringify(antes) + ' → ' + JSON.stringify(depois) + ')');

  // --- 6) sem botão: cliques avançam e a última etapa fecha
  conf(Cutscene.info().botao === null, 'sem botão (info().botao null)');
  let fechou = false;
  for (let i = 0; i < 6 && !fechou; i++) {
    clique(300, 250);
    frame(1);
    fechou = !Cutscene.ativa();
  }
  conf(fechou, 'cliques avançam e encerram a cena sem botão');
}

console.log('49) Visual efeitos: pools, receitas, game feel e camadas');
{
  const Efeitos = sandbox.Efeitos;
  const Batalha = sandbox.Batalha;

  Efeitos.limpar();

  // --- 1) pools com teto (doc §2)
  for (let i = 0; i < 30; i++) Efeitos.faiscaMuita(50, 50, ['#ffffff'], 40, 1);
  conf(Efeitos.info().parts === 380,
    'pool de partículas com teto 380 (' + Efeitos.info().parts + ')');

  // --- 2) nota nos 3 estilos + teto de números
  Efeitos.limpar();
  Efeitos.nota(10, 10, '1', '#ffffff', false);
  Efeitos.nota(10, 20, '2', '#ffd866', 'crit');
  Efeitos.nota(10, 30, '3', '#ffd866', true);   // booleano legado = big
  conf(Efeitos.info().numEstilos.join(',') === 'normal,crit,big',
    'nota nos 3 estilos (normal/crit/big-legado)');
  for (let i = 0; i < 60; i++) Efeitos.nota(0, 0, 'x', '#ffffff', false);
  conf(Efeitos.info().nums === 50,
    'pool de números com teto 50 (' + Efeitos.info().nums + ')');

  // --- 3) hit-stop: parar guarda o máximo; congelar consome e expira
  Efeitos.limpar();
  Efeitos.parar(0.05);
  Efeitos.parar(0.02);
  conf(Efeitos.info().hitStop === 0.05,
    'parar guarda o MÁXIMO (0,05, não soma)');
  // quantização por frame: o frame em que HÁ hitstop congela (true)
  // mesmo que dt passe do saldo — depois disso expira
  const c1 = Efeitos.congelar(0.06);
  const c2 = Efeitos.congelar(0.01);
  conf(c1 === true && c2 === false,
    'congelar congela o frame com saldo e expira depois (0,05)');

  // --- 4) shake: fórmula do doc, offset inteiro
  Efeitos.limpar();
  conf(Efeitos.shakeOffset() === null, 'sem sacudir = sem offset');
  Efeitos.sacudir(1);
  const so = Efeitos.shakeOffset();
  conf(!!so && Number.isInteger(so.x) && Number.isInteger(so.y) &&
       Math.abs(so.x) <= 2 && Math.abs(so.y) <= 2,
    'sacudir(1): offset inteiro e limitado (±2px — suavizado)');
  // ajuste pós-feedback: o salto ALEATÓRIO por frame era a
  // "tremedeira bruta" — agora é senóide estável no mesmo frame
  const soB = Efeitos.shakeOffset();
  conf(!!soB && so.x === soB.x && so.y === soB.y,
    'offset estável no mesmo frame (sem salto aleatório)');

  // --- 5) flash fraco nunca apaga o forte em curso
  Efeitos.limpar();
  Efeitos.flashTela('#ffd866', 0.9, 0.5);
  Efeitos.flashTela('#ffffff', 0.1, 0.5);
  const infF = Efeitos.info();
  conf(!!infF.flash && infF.flash.cor === '#ffd866' && infF.flash.a === 0.9,
    'flash fraco não substitui o forte em curso');

  // --- 6) silenciar: decorativo bloqueado, missil (lógica) sobrevive
  Efeitos.limpar();
  Efeitos.silenciar(true);
  Efeitos.impacto(10, 10, '#ffffff', true);
  Efeitos.nota(10, 10, 'x', '#ffffff', false);
  Efeitos.sacudir(1);
  Efeitos.parar(0.1);
  Efeitos.missil({ x: 0, y: 0 }, { x: 30, y: 0 }, '#ff8800', 1, null);
  const infM = Efeitos.info();
  conf(infM.mudo && infM.qtd === 1 && infM.parts === 1 &&
       infM.shake === 0 && infM.hitStop === 0,
    'mudo: só o missil (dano offline) sobrevive (qtd ' + infM.qtd + ')');
  Efeitos.silenciar(false);

  // --- 7) receitas do doc gastam os pools certos
  Efeitos.limpar();
  Efeitos.impacto(50, 50, '#ffffff', false);
  conf(Efeitos.info().aneis >= 1 && Efeitos.info().parts > 0,
    'impacto normal: anel + faíscas');
  Efeitos.limpar();
  Efeitos.impacto(50, 50, '#ffd866', true);
  const infC = Efeitos.info();
  conf(infC.aneis >= 1 && !!infC.flash && infC.borda,
    'impacto crítico: anel + flash + vinheta dourados');
  Efeitos.limpar();
  Efeitos.morte(60, 60, '#8ac040', true);
  conf(Efeitos.info().aneis >= 2 && Efeitos.info().parts > 0,
    'morte de chefe: anéis duplos + cacos/brasas');
  Efeitos.limpar();
  Efeitos.nivelUp(60, 60);
  conf(Efeitos.info().raios >= 1,
    'nivelUp: raios radiais (' + Efeitos.info().raios + ')');
  Efeitos.limpar();
  Efeitos.reviver(60, 60);
  conf(Efeitos.info().aneis >= 2, 'reviver: dois anéis + brilho/motes');
  Efeitos.limpar();
  Efeitos.bossChegou(60, 60);
  const infB = Efeitos.info();
  conf(infB.raios >= 1 && infB.aneis >= 1 && infB.hitStop > 0,
    'bossChegou: relâmpago + anéis + hit-stop');

  // --- 8) perigo + glow cache criado no DESENHO
  Efeitos.limpar();
  Efeitos.perigo(0.2);
  conf(Efeitos.info().perigo === 0.2, 'perigo reflete a fração de vida');
  Efeitos.perigo(1);
  const g0 = Efeitos.info().glowCache;
  Efeitos.brasas(100, 100, '#12ab34', 4, 60, 50);   // cor nunca usada
  frame(2);                                    // renderiza a arena
  conf(Efeitos.info().glowCache > g0,
    'glow cache cresce no desenho (' + g0 + ' → ' +
    Efeitos.info().glowCache + ')');
  Efeitos.limpar();

  // --- 9) limparEfeitos zera tudo (contrato das 7 seções)
  Efeitos.impacto(1, 1, '#ffffff', true);
  Efeitos.nota(1, 1, 'n', '#ffffff', false);
  Efeitos.sacudir(1);
  Efeitos.parar(0.1);
  Batalha.limparEfeitos();
  const infL = Efeitos.info();
  conf(infL.qtd === 0 && infL.shake === 0 && infL.hitStop === 0 &&
       !infL.flash && !infL.borda,
    'limparEfeitos zera pools + shake + hit-stop + flash + vinheta');
}

console.log('50) Virada do herói: facing aplica o espelho para o alvo');
{
  const Batalha = sandbox.Batalha;
  const p = Game.personagem;

  // cena limpa (mesmo padrão da 45) — ninguém morre no teste
  p.vitoria = false;
  if (typeof Cutscene !== 'undefined') Cutscene.fecha();
  Salvar.salvarEstado(p.id, 1, Date.now(), false, 1);
  Game.setScene('jogo');
  frame(2);
  if (Batalha.info().pausada) Batalha.alternarPausa();
  p.nivel = 1;
  p.atributos.for = 1;
  p.atributos.int = 1;
  p.atributos.des = 1;
  p.atributos.con = 9999;
  p.equip.arma = null;
  p.equip.armadura = null;
  p.autoApr = false;
  p.loadout = null;
  p.ramos = null;
  Batalha.restaurarOnda(2);
  const hb = Batalha.info().heroi;
  const en = Batalha.spawn({ tipo: 'slime' });
  en.hp = en.hpMax = 9999;
  conf(hb.facing === 1, 'facing nasce virado pra direita (= 1)');

  // alvo À ESPERDA → o herói vira (-1)
  en.x = hb.x - 70;
  en.y = hb.y;
  let esq = false;
  for (let i = 0; i < 90 && !esq; i++) {
    frame(1);
    esq = Batalha.info().heroi.facing === -1;
  }
  conf(esq, 'alvo à esquerda → herói vira (facing -1)');

  // alvo À DIREITA → volta pra 1 (entre golpes o ramo !atacando re-vira)
  en.x = Batalha.info().heroi.x + 70;
  en.y = Batalha.info().heroi.y;
  let dir = false;
  for (let i = 0; i < 90 && !dir; i++) {
    frame(1);
    dir = Batalha.info().heroi.facing === 1;
  }
  conf(dir, 'alvo à direita → herói volta (facing 1)');
}

console.log('51) respiro: contagem no HUD, beat do clear e fim do delay duplo');
{
  const Batalha = sandbox.Batalha;
  const p = Game.personagem;

  // cena limpa + herói forte p/ clear rápido (mesmo padrão da 12)
  p.vitoria = false;
  if (typeof Cutscene !== 'undefined') Cutscene.fecha();
  if (Batalha.info().pausada) Batalha.alternarPausa();
  p.atributos.for = 999;
  p.atributos.con = 999;
  let esp = 0;
  while (Batalha.info().morto && esp < 900) { frame(1); esp++; }
  Batalha.restaurarMapa(1);
  Batalha.restaurarOnda(3);
  esp = 0;
  while (Batalha.info().onda < 3 && esp < 600) { frame(1); esp++; }
  conf(Batalha.info().onda === 3, 'onda 3 em campo antes do teste');
  conf(Batalha.info().cota > 19 && Batalha.info().cota <= 20,
    'onda normal nasce com cota de 20s (cota=' +
    Batalha.info().cota.toFixed(1) + ')');
  // HUD da cota durante a onda (spec onda-timer R-TIM-4)
  jogoCanvas._textos = [];
  frame(1);
  conf((jogoCanvas._textos || []).some(t => t.indexOf('TEMPO') >= 0),
    'HUD mostra TEMPO durante a onda (cota visível)');

  // --- a/b: o respiro expõe espera e o HUD mostra a contagem (R-RES-1)
  jogoCanvas._textos = [];
  for (let i = 0; i < 3000 && Batalha.info().inimigos > 0; i++) frame(1);
  conf(Batalha.info().inimigos === 0, 'onda 3 limpa → respiro em curso');
  conf(Batalha.info().espera > 0, 'info().espera > 0 durante o respiro');
  jogoCanvas._textos = [];
  frame(1);
  conf((jogoCanvas._textos || []).some(t => t.indexOf('PRÓXIMA ONDA') >= 0),
    'HUD mostra a contagem da próxima onda no respiro');

  // --- b: o clear dispara o beat de decisão (R-RES-2)
  conf((jogoCanvas._textos || []).length >= 0, 'reset do _textos p/ 2b'); // âncora
  Batalha.restaurarOnda(4);
  esp = 0;
  while (Batalha.info().onda < 4 && esp < 600) { frame(1); esp++; }
  jogoCanvas._textos = [];
  for (let i = 0; i < 3000 && Batalha.info().inimigos > 0; i++) frame(1);
  conf((jogoCanvas._textos || []).some(t => t.indexOf('ONDA LIMPA') >= 0),
    'clear comum avisa ONDA LIMPA com a contagem');

  // --- c: morte do chefe NÃO dispara o beat e NÃO tem delay duplo
  // (R-RES-3): do kill ao mapa ≥ 2 são 0 frames de campo vazio — antes
  // eram ~479 (8s de tOnda) + 8s do passaMapa somando 16s de vazio
  Batalha.restaurarMapa(1);
  Batalha.restaurarOnda(100);
  esp = 0;
  while (!(Batalha.info().onda === 100 && Batalha.info().boss) && esp < 600) {
    frame(1); esp++;
  }
  conf(Batalha.info().boss === true, 'chefe do mapa 1 em campo');
  conf(Batalha.info().cota === -1,
    'chefe isento da cota (cota=-1 = sem prazo, spec R-TIM-3)');
  jogoCanvas._textos = [];
  let framesVazio = 0, passou = false;
  for (let i = 0; i < 6000 && !passou; i++) {
    frame(1);
    const f = Batalha.info();
    if (f.mapa >= 2) passou = true;
    else if (f.onda === 100 && f.inimigos === 0 && !f.boss) framesVazio++;
  }
  conf(passou, 'chefe derrubado → mapa 2');
  conf(!(jogoCanvas._textos || []).some(t => t.indexOf('ONDA LIMPA') >= 0),
    'morte do chefe NÃO dispara ONDA LIMPA (o passaMapa assume)');
  conf(framesVazio <= 5,
    'sem delay duplo: ' + framesVazio +
    ' frame(s) de vazio antes da troca (eram ~479+479)');

  // --- d: expiração da cota → reforços junto dos sobreviventes
  // (spec onda-timer R-TIM-2): con9999 (imortal de verdade) + for1 +
  // SEM equip/autoApr (dano mínimo DETERMINÍSTICO — com equip herdado
  // das seções anteriores o herói limpava a onda e a cota não
  // estourava: flake) = a onda nunca limpa → em ONDA_SEG estoura
  p.atributos.for = 1;
  p.atributos.con = 9999;
  p.nivel = 4;
  p.pontos = 0;
  p.equip = { arma: null, armadura: null };
  p.bolsa = [];
  p.autoApr = false;
  Batalha.restaurarMapa(1);
  // onda90: escala de HP ~112× — dano do herói de for1 nunca limpa
  Batalha.restaurarOnda(90);
  esp = 0;
  while (Batalha.info().onda < 90 && esp < 600) { frame(1); esp++; }
  conf(Batalha.info().inimigos > 0, 'onda 90 em campo (herói não limpa)');
  const ondaAntes = Batalha.info().onda;
  const inimAntes = Batalha.info().inimigos;
  const cotaFrames = Math.round(Batalha.ONDA_SEG * 1000 / 16.7);
  jogoCanvas._textos = [];
  let estourou = false;
  for (let i = 0; i < cotaFrames + 180 && !estourou; i++) {
    frame(1);
    estourou = Batalha.info().onda > ondaAntes;
  }
  conf(estourou,
    'cota expirou → a onda avança sem limpar (' + ondaAntes + '→' +
    Batalha.info().onda + ' em ≤' + (cotaFrames + 180) + ' frames)');
  conf((jogoCanvas._textos || []).some(t => t.indexOf('ATRASADA') >= 0),
    'aviso ONDA ATRASADA — REFORÇOS! na tela');
  conf(Batalha.info().inimigos > inimAntes,
    'reforços somam aos sobreviventes (' + inimAntes + '→' +
    Batalha.info().inimigos + ' inimigos)');
}

console.log('52) opções: defaults, gates, persistência e overlay');
{
  const Opcoes = sandbox.Opcoes;
  const Efeitos = sandbox.Efeitos;

  // --- a) defaults = comportamento de sempre (tudo ligado)
  conf(Opcoes.liga('shake') && Opcoes.liga('flash') &&
       Opcoes.liga('num') && Opcoes.liga('poeira'),
    'defaults de todas as opções ligados');

  // --- b) gate do shake (spec opcoes R-OP-2)
  Opcoes.alterna('shake');                      // desliga
  Efeitos.sacudir(1);
  conf(Efeitos.shakeOffset() === null,
    'shake desligado: sacudir não produz offset');
  Opcoes.alterna('shake');                      // religa
  Efeitos.sacudir(1);
  conf(Efeitos.shakeOffset() !== null,
    'shake religado: sacudir volta a produzir offset');
  Efeitos.limpar();

  // --- c) gate do flash e dos números
  Opcoes.alterna('flash');
  Efeitos.flashTela('#ffffff', 0.9, 0.2);
  conf(!Efeitos.info().flash, 'flash desligado: flashTela não arma');
  Opcoes.alterna('flash');
  Opcoes.alterna('num');
  const q0 = Efeitos.info().qtd;
  Efeitos.nota(10, 10, 'DANO', '#ffffff', false);
  conf(Efeitos.info().qtd === q0,
    'números desligados: nota normal não nasce');
  Efeitos.nota(10, 10, 'AVISO', '#ffffff', true);
  conf(Efeitos.info().qtd === q0 + 1,
    'números desligados: estilo big (aviso) continua nascendo');
  Opcoes.alterna('num');
  Efeitos.limpar();

  // --- d) persistência (rpg_opcoes_v1)
  Opcoes.alterna('poeira');
  const bruto = localStorageStub.getItem('rpg_opcoes_v1');
  conf(!!bruto && bruto.indexOf('"poeira":false') >= 0,
    'alterna grava em rpg_opcoes_v1 (' + bruto + ')');
  Opcoes.alterna('poeira');                     // restaura pra teste

  // --- e) overlay: abre pelo botão do cabeçalho, toggle, Fechar
  conf(Game.cena === 'jogo', 'cena jogo ativa p/ o overlay');
  jogoCanvas._textos = [];
  clique(728, 20);                             // botão Opções (W−72..W−8, 8..32)
  frame(2);
  conf((jogoCanvas._textos || []).some(t => t.indexOf('OPÇÕES') >= 0),
    'clique em Opções abre o overlay (título OPÇÕES no frame)');

  clique(384, 150);                            // 1º toggle (shake) no painel
  frame(2);
  conf(Opcoes.liga('shake') === false,
    'toggle no overlay desliga shake');
  conf((jogoCanvas._textos || []).some(t => t.indexOf('Sacudir a tela · DES') >= 0),
    'o toggle reflete DES no rótulo');
  Efeitos.sacudir(1);
  conf(Efeitos.shakeOffset() === null,
    'shake desligado pelo overlay: sem offset');
  Efeitos.limpar();

  clique(384, 324);                            // Fechar (264..504, 306..342)
  frame(2);
  jogoCanvas._textos = [];
  frame(2);
  conf(!(jogoCanvas._textos || []).some(t => t.indexOf('OPÇÕES') >= 0),
    'Fechar fecha o overlay (não desenha mais)');

  // restaura o estado pra não vazar pros artefatos seguintes
  if (!Opcoes.liga('shake')) Opcoes.alterna('shake');
  localStorageStub.removeItem('rpg_opcoes_v1');
}

console.log('53) teleporte no mundo infinito: sem clamp ao canto antigo');
{
  const Batalha = sandbox.Batalha;
  const p = Game.personagem;

  // estado limpo (a seção 52 mexe em opções/overlay, não na batalha)
  Batalha.iniciar();
  p.classe = 'mago';
  p.nivel = 30;
  p.atributos = { for: 8, des: 8, con: 999, int: 20, car: 8 };
  p.pontos = 0;
  p.loadout = ['teleporte'];     // skill de mobilidade do mago (nv 25)
  p.ramos = null;
  p.equip = { arma: null, armadura: null };

  // longe do canto do mundo antigo (384×268), onde o clamp antigo pegava
  Batalha._posicionaHeroi(2000, 2000);
  const antes = Batalha.info().heroi;
  const en = Batalha.spawn({ tipo: 'slime' });
  en.x = 2020;                   // dentro do gatilho de proximidade (44px)
  en.y = 2000;

  let usou = false;
  for (let i = 0; i < 30 && !usou; i++) {
    frame(1);
    usou = Batalha.info().ultimaSkill === 'teleporte';
  }
  const dep = Batalha.info().heroi;
  const dist = Math.hypot(dep.x - antes.x, dep.y - antes.y);
  conf(usou && antes.x > 1500 && dep.x > 1500 && dep.y > 1500 &&
       dist <= 96 * 1.4 + 6,
    'teleporte não é clampado ao mundo antigo (de ' + antes.x + ',' +
    antes.y + ' para ' + dep.x + ',' + dep.y + ' = ' + dist.toFixed(0) +
    'px)');

  Batalha.iniciar();               // não vaza posição/estado pros artefatos
}

console.log('54) robustez: save corrompido, tetos do infinito e pisos');
{
  const Batalha = sandbox.Batalha;
  const Itens = sandbox.Itens;
  const Personagem = sandbox.Personagem;
  const Salvar = sandbox.Salvar;
  const somaP = d => d.partes.reduce((a, x) => a + x.v, 0);

  // --- nome corrompido não pode derrubar normalizar/listar (o boot
  // chamava ultimo()->listar()->normalizar e morria com "nome ausente")
  let nomesOk = true;
  for (const n of [[], '   ', {}, 5, null, undefined]) {
    try {
      const q = Personagem.normalizar({ nome: n });
      nomesOk = nomesOk && typeof q.nome === 'string' && q.nome.length > 0;
    } catch (e) { nomesOk = false; }
  }
  conf(nomesOk, 'normalizar nunca lança por nome corrompido (fallback Herói)');

  // --- entrada que passa na assinatura mas quebra normalizar: listar
  // sobrevive, a entrada fica no storage e o próximo gravar a preserva
  const K = 'rpg_personagens_v1';
  const KM = 'rpg_assinatura_v1';
  const brutoS = JSON.parse(localStorageStub.getItem(K) || '[]');
  brutoS.push({ id: 'quebrado-teste', nome: 'Quebrado', classe: 'guerreiro' });
  localStorageStub.setItem(K, JSON.stringify(brutoS));
  localStorageStub.removeItem(KM);       // migra/re-assina na próxima leitura
  const origNorm = Personagem.normalizar;
  let listaQ = null, erroQ = null;
  Personagem.normalizar = function (e) {
    if (e && e.id === 'quebrado-teste') throw new Error('boom');
    return origNorm(e);
  };
  try { listaQ = Salvar.listar(); } catch (e) { erroQ = e; }
  // apagar um id inexistente passa por gravar(listar()) com a quebrada
  try { Salvar.apagar('id-que-nao-existe'); } catch (e) { erroQ = erroQ || e; }
  Personagem.normalizar = origNorm;
  conf(!erroQ && !!listaQ,
    'listar/gravar sobrevivem a uma entrada que quebra normalizar');
  const brutoDepois = JSON.parse(localStorageStub.getItem(K) || '[]');
  conf(brutoDepois.some(e => e && e.id === 'quebrado-teste'),
    'entrada inválida PRESERVADA no storage (nada é apagado)');
  localStorageStub.setItem(K, JSON.stringify(
    brutoDepois.filter(e => e && e.id !== 'quebrado-teste')));
  Salvar.listar();                       // re-assina a lista limpa
  conf(!Salvar.listar().some(x => x.id === 'quebrado-teste'),
    'entrada de teste removida');

  // --- item do infinito profundo: o teto antigo (99.999/999) apagava
  // bônus e congelava a escala na leitura
  let perdeu = 0, escalaOk = true;
  for (let i = 0; i < 60; i++) {
    const it = Itens.geraItem(3, 3000, 'guerreiro');
    const q = Personagem.normalizar({ nome: 'x', equip: {
      arma: it.slot === 'arma' ? it : null,
      armadura: it.slot === 'armadura' ? it : null } });
    const n = it.slot === 'arma' ? q.equip.arma : q.equip.armadura;
    if (!n) { perdeu++; continue; }
    for (const k of Object.keys(it.bonus)) {
      if ((n.bonus[k] || 0) !== it.bonus[k]) perdeu++;
    }
    if (n.escala !== it.escala) escalaOk = false;
  }
  conf(perdeu === 0, 'bônus de item do mapa 3000 preservado na normalização');
  conf(escalaOk, 'escala do item do mapa 3000 preservada (não congela em 999)');

  // --- -0 não vira chave fantasma (normalizar idempotente)
  const pNeg = Personagem.normalizar({
    nome: 'x',
    equip: { arma: { nome: 'X', slot: 'arma', bonus: { dano: -0.5 } } }
  });
  const pNeg2 = Personagem.normalizar(pNeg);
  conf(JSON.stringify(pNeg) === JSON.stringify(pNeg2),
    'normalizar idempotente com bônus -0,5');

  // --- xp sempre < xpProx (o -1 não é representável acima de ~2^53)
  let xpOk = true;
  for (const nv of [500, 724, 2000, 9000]) {
    const q = Personagem.normalizar({ nome: 'x', nivel: nv, xp: 1e300 });
    if (!(q.xp >= 0 && q.xp < q.xpProx)) xpOk = false;
  }
  conf(xpOk, 'xp < xpProx em nível alto (clamp com epsilon relativo)');

  // --- xpAbate finito no modo infinito (curva estoura 1e308 no mapa ~115)
  conf(Number.isFinite(Batalha.xpAbate(11400, 0)) &&
       Number.isFinite(Batalha.xpAbate(20000, 10)) &&
       Batalha.xpAbate(20000, 0) > Batalha.xpAbate(9999, 0),
    'xpAbate finito e monotônico no infinito (teto 1e300)');

  // --- pisos do dano/HP entram no detalhamento (item amaldiçoado)
  const maldita = Personagem.normalizar({
    nome: 'x', classe: 'guerreiro', nivel: 1,
    atributos: { for: 1, des: 1, con: 1, int: 1, car: 1 },
    equip: { arma: { nome: 'Maldita', slot: 'arma', rar: 1, up: 0,
                     escala: 1, afixos: [], bonus: { dano: -100, hp: -100 } },
             armadura: null }
  });
  const sM = Personagem.status(maldita);
  const dM = Personagem.statusDetalhado(maldita);
  const md = dM.dano.mult ? dM.dano.mult.v : 1;
  const mh = dM.hp.mult ? dM.hp.mult.v : 1;
  conf(sM.dano === 1 && Math.round(somaP(dM.dano) * md) === sM.dano,
    'piso do dano (1) representado no detalhamento');
  conf(sM.hpMax === 10 && Math.round(somaP(dM.hp) * mh) === sM.hpMax,
    'piso do HP (10) representado no detalhamento');
  conf(typeof Batalha.info().heroi.hpMax === 'number' &&
       Batalha.info().heroi.hpMax > 0,
    'info().heroi.hpMax exposto (sonda do fuzz)');
}

console.log('');
if (falhas) {
  console.log(falhas + ' FALHA(S)');
  process.exit(1);
}
console.log('TODOS OS TESTES PASSARAM');
