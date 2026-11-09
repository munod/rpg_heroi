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
const SEM_ACO = function () { return false; };
const SEM_GAT = function () { return 0; };
Eventos.nasceAco = SEM_ACO;
Eventos.nasceGat = SEM_GAT;

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
    clerigo: { hp: 16 + 11 * 4, dano: 4 + Math.floor(9 / 2) }
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
  conf(xpAlto.xp === 1e9,
    'xp importado tem teto defensivo (1e15 -> ' + xpAlto.xp + ')');
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

  // --- progressão: próximo abate dá nível e +3 pontos
  const p1 = Game.personagem;
  p1.xp = p1.xpProx - 1;
  const nivel0 = p1.nivel, pts1 = p1.pontos;
  let subiu = false;
  for (let i = 0; i < 3000 && !subiu; i++) {
    frame(1);
    if (p1.nivel > nivel0) subiu = true;
  }
  conf(p1.nivel === nivel0 + 1 && p1.pontos === pts1 + 3,
    'abate dá nível e +3 pontos (nv ' + nivel0 + '->' + p1.nivel +
    ', pts ' + pts1 + '->' + p1.pontos + ')');

  // --- abas de gestão
  clique(515, 50);            // aba Aparência (centro da 2ª aba)
  frame(2);
  const pele0 = p1.look.skin;
  clique(706, 96);           // botão > da linha Pele
  frame(2);
  conf(p1.look.skin !== pele0, 'troca de cor de pele funciona');

  clique(585, 50);           // aba Classe (centro da 3ª aba)
  frame(2);
  clique(673, 102);          // Mago na grade 2×2 (590..756, 88..116)
  frame(2);
  conf(p1.classe === 'mago', 'troca de classe funciona');

  clique(445, 50);           // volta pra aba Atributos (1ª aba)
  frame(2);

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
  p.atributos.con = 1;
  p.atributos.for = 1;
  let caiu = false;
  for (let i = 0; i < 6000 && !caiu; i++) {
    frame(1);
    if (Batalha.info().morto) caiu = true;
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

  // --- carisma agora dá XP de verdade
  const pCar = Personagem.novo();
  pCar.atributos.car = 18;                 // efetivo 18 -> x1.30
  conf(Math.abs(Personagem.status(pCar).xpMult - 1.3) < 1e-9,
    'carisma multiplica o XP (x' +
    Personagem.status(pCar).xpMult.toFixed(2) + ')');
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
  conf(sandbox.Mapas.info(99) === sandbox.Mapas.info(3) &&
       sandbox.Mapas.forca(99) > sandbox.Mapas.forca(1),
    'mapa além da lista reutiliza o tema e segue escalando (modo infinito)');

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
  clique(655, 50);                 // aba Itens (4ª coluna)
  frame(2);
  conf((jogoCanvas._textos || []).some(t => t.indexOf('Bolsa') >= 0),
    'aba Itens abre com a bolsa');
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
  clique(445, 50);                 // volta pra Atributos (estado neutro)
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
       Skills.ativas('mago', 45).length === 5,
    'skills desbloqueiam nos níveis 5, 15, 25, 35 e 45');
  conf(!!Skills.desbloqueada('mago', 5) &&
       Skills.desbloqueada('mago', 6) === null &&
       Skills.desbloqueada('ladino', 5).tipo === 'veneno',
    'desbloqueada devolve a skill exata do nível');
  conf(['guerreiro', 'mago', 'ladino', 'clerigo']
       .every(c => Skills.daClasse(c).length === 5),
    'toda classe tem 5 skills');
  conf(['guerreiro', 'mago', 'ladino']
       .every(c => Skills.daClasse(c).some(s => s.tipo === 'mobilidade')) &&
       Skills.daClasse('clerigo').some(s => s.tipo === 'medo'),
    'cada classe tem a skill de fuga (mobilidade) ou medo (clérigo)');
  conf(Skills.proxima('mago', 4).nivel === 5 &&
       Skills.proxima('mago', 45) === null,
    'proxima aponta a próxima skill (ou null com todas)');

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
  // Fixture determinística: o nuke SÓ conjura com alvo em campo — for=1
  // (inimigo da onda 3 vive a janela toda) e con alto (herói não cai
  // e pausa o update); antes, sem garantias, dependia do ciclo de spawn
  p.atributos.for = 1;
  p.atributos.con = 60;
  Batalha.restaurarOnda(3);
  jogoCanvas._textos = [];
  Batalha.limparEfeitos();
  let lancou = false;
  for (let i = 0; i < 900 && !lancou; i++) {
    frame(1);
    lancou = (jogoCanvas._textos || []).some(t => t === 'Bola de Fogo');
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

console.log('17) câmera, mundo maior e renascimento aleatório');
{
  const Batalha = sandbox.Batalha;
  const p = Game.personagem;
  let inf = Batalha.info();

  conf(inf.janela.w === 192 && inf.janela.h === 134 &&
       inf.mundo.w === 384 && inf.mundo.h === 268,
    'mundo 384×268 com a janela 192×134 intacta');

  // --- câmera: pausa congela o mundo (mas não a câmera) e ela assenta
  Batalha.alternarPausa();
  let limitesOk = true;
  for (let i = 0; i < 200; i++) {
    frame(1);
    const c = Batalha.info();
    if (c.cam.x < 0 || c.cam.y < 0 ||
        c.cam.x > c.mundo.w - c.janela.w ||
        c.cam.y > c.mundo.h - c.janela.h) {
      limitesOk = false;
    }
  }
  conf(limitesOk, 'câmera sempre presa nos limites do mundo');
  inf = Batalha.info();
  const ax = Math.max(0, Math.min(inf.mundo.w - inf.janela.w,
    inf.heroi.x - inf.janela.w / 2));
  const ay = Math.max(0, Math.min(inf.mundo.h - inf.janela.h,
    inf.heroi.y - inf.janela.h / 2));
  conf(Math.abs(inf.cam.x - ax) <= 2 && Math.abs(inf.cam.y - ay) <= 2,
    'câmera assentada e centrada no herói (dx=' +
    (inf.cam.x - ax) + ' dy=' + (inf.cam.y - ay) + ')');
  Batalha.alternarPausa();

  // --- renascimento aleatório: 3 ciclos de morte em locais distintos.
  // Fixture determinística: nv 4 (SEM skills → sem bênção que out-heala)
  // e INT 8 (agu baixo → sem kite/recuar, o herói fica e apanha — mesma
  // lição da seção 21; com o ritmo mais lento os heróis herdados eram
  // fortes demais p/ morrer sozinhos)
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
    let reviveu = false;
    for (let i = 0; i < 600 && !reviveu; i++) {
      frame(1);
      reviveu = !Batalha.info().morto;
    }
    if (!reviveu) { completo = false; break; }
    const h = Batalha.info().heroi;
    if (h.x < 16 || h.x > 384 - 16 || h.y < 16 || h.y > 268 - 16) {
      completo = false;
      break;
    }
    locais.push(h.x + ',' + h.y);
  }
  conf(completo, 'renascimento dentro dos limites do mundo (3 ciclos)');
  conf(new Set(locais).size >= 2,
    'renascimento em locais distintos (' + locais.join(' | ') + ')');
  p.nivel = 25;               // devolve o nv da seção 16 (a fixture desceu
                              // só p/ garantir as 3 mortes — sem vazamento)

  // --- a câmera viajou junto do renascimento (assenta na pausa)
  Batalha.alternarPausa();
  for (let i = 0; i < 200; i++) frame(1);
  const f = Batalha.info();
  const fax = Math.max(0, Math.min(f.mundo.w - f.janela.w,
    f.heroi.x - f.janela.w / 2));
  const fay = Math.max(0, Math.min(f.mundo.h - f.janela.h,
    f.heroi.y - f.janela.h / 2));
  conf(Math.abs(f.cam.x - fax) <= 2 && Math.abs(f.cam.y - fay) <= 2,
    'câmera acompanha o renascimento');
  Batalha.alternarPausa();
}

console.log('18) toque, resolução e escala responsiva');
{
  const Input = sandbox.Input;
  const p = Game.personagem;

  // --- resolução nova + escala fracionária que preenche a janela
  conf(jogoCanvas.width === 768 && jogoCanvas.height === 432,
    'backing store 768×432');
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
  conf(jogoCanvas.width === 1382 && jogoCanvas.height === 432,
    'backing store 1382×432 (esc=1)');

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
  clique(412 + 3 * 70 + 33 + dx, 54);   // aba Itens (local 622..688)
  frame(2);
  conf((jogoCanvas._textos || []).some(t => t.indexOf('Bolsa') >= 0),
    'aba Itens clicável com o painel ancorado à direita');

  // volta ao normal e confere que tudo reancora
  sandbox.window.innerWidth = 1280;
  sandbox.window.innerHeight = 720;
  (ouvintesJanela.resize || []).forEach(fn => fn({}));
  conf(Game.W === 768 && jogoCanvas.width === 768 &&
       jogoCanvas.style.width === '1280px',
    'restaurou 768×432 em 16:9');
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
  // ondas fortes: com o combo (Leva 1) a pressão vira insustentável só
  // em onda alta — aqui o teste QUER a morte
  Batalha.restaurarOnda(50);
  let morreu = false;
  for (let i = 0; i < 12000 && !morreu; i++) {
    frame(1);
    morreu = p.stats.mortes > m0;
  }
  conf(morreu, 'morte incrementa a estatística de mortes');

  // --- aba Stats na UI (clique na 5ª aba da grade nova)
  jogoCanvas._textos = [];
  clique(412 + 4 * 70 + 33, 54);          // centro da aba Stats (725, 54)
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
  clique(655, 50);                 // aba Itens (se não estiver nela)
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
    '{"nome":"K","nivel":45,"loadout":["a","b","c","d"],' +
    '"keystoneLib":"x","keystoneOn":1}');
  conf(Array.isArray(mig.loadout) && mig.loadout.length === 3 &&
       mig.keystoneLib === false && mig.keystoneOn === false,
    'migração: loadout truncado no teto e keystone booleanizado');

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
  p.atributos.int = 50;
  p.pontos = 0;
  p.loadout = ['meteoro'];
  jogoCanvas._textos = [];
  Batalha.limparEfeitos();
  let lancou = false;
  for (let i = 0; i < 2400 && !lancou; i++) {
    frame(1);
    lancou = (jogoCanvas._textos || []).some(t => t === 'Meteoro');
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
  clique(585, 50);                 // aba Classe
  frame(2);
  clique(673, 102);                // Mago na grade 2×2
  frame(2);
  conf(p.classe === 'mago' && p.loadout === null,
    'trocar classe na grade zera o loadout (automático)');
  p.loadout = ['bola-fogo'];
  clique(584, 265);                // linha Meteoro (i=3: y=253..277)
  frame(2);
  conf(p.loadout.length === 2 && p.loadout.indexOf('meteoro') >= 0,
    'clicar na skill liga no loadout');
  clique(584, 290);                // linha Rajada (i=4: y=278..302)
  frame(2);
  clique(584, 215);                // linha Nova (i=1: y=203..227) com 3/3
  frame(2);
  conf(p.loadout.length === 3,
    'loadout respeita o máximo de 3');
  conf((jogoCanvas._textos = jogoCanvas._textos || [])
       .some(t => t.indexOf('Máximo de 3') >= 0),
    'ultrapassar o máximo recusa com aviso');
  clique(584, 190);                // linha Bola (i=0): sai -> 2/3
  frame(2);
  clique(584, 265);                // linha Meteoro (i=3): sai -> 1/3
  frame(2);
  clique(584, 290);                // linha Rajada (i=4): última ativa
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

  // --- pool por tema (o clamp espelha Mapas.info: mapa 4+ = tema 3,
  // o mesmo cenário do cenário/procedural)
  const t1 = ['vampiro', 'fenix'], t2 = ['furia', 'mercador'],
        t3 = ['tempestade', 'santificado'];
  let temaOk = true;
  for (let i = 0; i < 25; i++) {
    if (t1.indexOf(Itens.geraItem(4, 1, 'guerreiro').efeito) < 0) temaOk = false;
    if (t2.indexOf(Itens.geraItem(4, 2, 'guerreiro').efeito) < 0) temaOk = false;
    if (t3.indexOf(Itens.geraItem(4, 3, 'guerreiro').efeito) < 0) temaOk = false;
    if (t3.indexOf(Itens.geraItem(4, 4, 'guerreiro').efeito) < 0) temaOk = false;
  }
  conf(temaOk, 'pool por tema (mapa 4+ clampa no tema 3, como Mapas.info)');

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
  clique(655, 50);                 // aba Itens (a 25 saiu na Classe)
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
  p.atributos.con = 50;            // hp 244: o herói DESCE degrau a
                                   // degrau até a faixa < 30% (limiar 73)
  p.atributos.int = 8;
  p.pontos = 0;
  Batalha.restaurarOnda(20);       // pressão garantida: sem ela o
                                   // regenerador segura HP > 30% (Leva 1)
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
  clique(445, 50);                 // aba Atributos (1ª coluna)
  frame(2);
  conf((jogoCanvas._textos || [])
       .some(t => t.indexOf('Cada nível: +3 pontos') >= 0),
    'rodapé da aba Atributos anuncia +3 pontos por nível');

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
  Batalha.restaurarOnda(12);
  esperaOnda(12);
  conf(Batalha.info().onda === 12 && Batalha.info().inimigos > 0,
    'onda 12 assentada antes do teste');
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
    morte2 = Batalha.info().morto;
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
  Batalha.restaurarOnda(8);
  esperaOnda(8);
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
  conf(dOuro >= 22 && dOuro <= 40,
    'ouro ×10 na vitória (delta ' + dOuro + ', faixa 22..40)');
  const leg = [p.equip.arma, p.equip.armadura].concat(p.bolsa)
    .some(i => i && i.rar === 4);
  conf(leg, 'lendário garantido no saque');

  jogoCanvas._textos = [];
  clique(412 + 4 * 70 + 33, 54);            // aba Stats
  frame(1);
  conf((jogoCanvas._textos || [])
       .some(t => t.indexOf('Açougueiros abatidos') >= 0),
    'aba Stats lista os Açougueiros');
  clique(445, 50);                           // volta pra Atributos
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

  // --- resgate ao vivo: RNG zerado → geometria e ouro exatos.
  // spawn a 110px (clamp ≥70 das bordas) e for 999: o golpe alcança
  // antes da borda (2,0s de perseguição vs ≥2,8s de fuga)
  p.classe = 'guerreiro';
  p.nivel = 10;
  p.atributos.for = 999;
  p.atributos.con = 999;
  p.atributos.des = 8;
  p.atributos.int = 8;
  p.pontos = 0;
  p.equip = { arma: null, armadura: null };
  p.bolsa = [];
  Batalha.restaurarOnda(1);
  Eventos.limpa();
  p.ouro = 100;
  const o0 = p.ouro;
  jogoCanvas._textos = [];
  Math.random = function () { return 0; };
  for (let i = 0; i < 5 && !Batalha.info().gatuno; i++) frame(1);
  conf(Batalha.info().gatuno, 'nasce e rouba na arena');
  conf(p.ouro === o0 - 15, 'roubo debitado na hora (100 → ' + p.ouro + ')');
  conf((jogoCanvas._textos || []).some(t => t.indexOf('GATUNO ROUBOU') >= 0),
    'aviso do roubo na tela');
  let pegou = false;
  for (let i = 0; i < 6000 && !pegou; i++) {
    frame(1);
    pegou = p.stats.gatunos > 0;
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
  Batalha.restaurarOnda(30);
  Eventos.limpa();
  p.ouro = 100;
  jogoCanvas._textos = [];
  Math.random = function () { return 0; };
  for (let i = 0; i < 5 && !Batalha.info().gatuno; i++) frame(1);
  conf(Batalha.info().gatuno, 'roubador em campo (tento a fuga)');
  const roubado = p.ouro;
  const mortes1 = p.stats.mortes;
  let sumiu = false;
  for (let i = 0; i < 9000 && !sumiu; i++) {
    frame(1);
    sumiu = !Batalha.info().gatuno;
  }
  Math.random = rnd;
  conf(sumiu, 'some da arena (fuga na borda ou desistência)');
  conf(p.stats.gatunos === 1, 'sem resgate: stats não muda');
  const mortes2 = p.stats.mortes - mortes1;
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
  conf(Math.abs(soma(det.xp) - sD.xpMult) < 1e-9,
    'XP: Σpartes = status');
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
  for (const x of [150, 240, 330, 430, 520, 610]) {
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
  clique(655, 50);                 // aba Itens
  frame(2);
  jogoCanvas._textos = [];
  clique(500, 96);                 // texto da arma (não é botão)
  for (let i = 0; i < 25; i++) frame(1);
  conf((jogoCanvas._textos || []).some(t => t.indexOf('Vende ') >= 0),
    'cabeçalho da arma abre o tooltip completo (venda/sucata/custos)');

  // --- tooltip do atributo (linha da INT)
  clique(445, 50);                 // aba Atributos
  frame(2);
  jogoCanvas._textos = [];
  clique(500, 180);                // linha INT (i=3 → y=180)
  for (let i = 0; i < 25; i++) frame(1);
  conf((jogoCanvas._textos || []).some(t => t.indexOf('agudeza da IA') >= 0),
    'linha do INT explica a agudeza da IA');

  // --- long-press: prende 500ms, solta e o ponteiro SAI sem clicar →
  // a caixa retida continua (só um clique fora fecha)
  jogoCanvas._textos = [];
  pressionar(240, 356);             // mouse down sobre um segmento
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
  clique(412 + 4 * 70 + 33, 54);          // aba Stats
  frame(1);
  clique(500, 120);                        // linha 'Abates' (y=120)
  for (let i = 0; i < 25; i++) frame(1);
  conf((jogoCanvas._textos || [])
       .some(t => t.indexOf('Monstros derrotados') >= 0),
    'tooltip da estatística explica o que ela conta');

  // --- tooltip da skill (linha da aba Classe)
  p.nivel = 45;
  clique(585, 50);                         // aba Classe
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
  let fugas = 0, fora = 0;
  for (let i = 0; i < 9000; i++) {
    frame(1);
    const f = Batalha.info();
    if ((f.heroi.estado === 'recuar' || f.heroi.estado === 'kite') &&
        f.destino) {
      fugas++;
      const d = f.destino;
      // limites com margem 16 (mundo 384×268): fora disso = bug
      if (d.x < 16 || d.x > 368 || d.y < 16 || d.y > 252) fora++;
    }
  }
  conf(fugas > 500 && fora === 0,
    'destino de fuga sempre dentro do mapa (' + fugas +
    ' fugas, ' + fora + ' fora)');

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
    Batalha.restaurarOnda(15);
    let ee = 0;
    while (Batalha.info().morto && ee < 900) { frame(1); ee++; }
    // espera o inimigo colado
    for (let i = 0; i < 3000 && Batalha.info().inimigoPerto > 55; i++) {
      frame(1);
    }
    let n = 0, antes = false;
    for (let i = 0; i < 900; i++) {
      frame(1);
      const f = Batalha.info();
      const emRange = f.inimigoPerto >= 0 && f.inimigoPerto <= 60;
      if (emRange && f.atacando && !antes) n++;
      antes = f.atacando;
    }
    return n;
  }
  const g8 = golpesComDes(8);      // recarga 0,50s → ~30 frames/golpe
  const g62 = golpesComDes(62);    // recarga 0,15s (piso) → ~9 frames
  conf(g8 > 4 && g62 >= Math.round(g8 * 1.8),
    'DES acelera o ataque até o piso (des8=' + g8 +
    ' golpes/10s, des62=' + g62 + ', razão ' +
    (g62 / Math.max(1, g8)).toFixed(1) + '×)');

  // --- 4) tooltip da linha de atributo NÃO abre pelo botão −
  jogoCanvas._textos = [];
  clique(445, 50);                 // aba Atributos
  frame(2);
  // y da 1ª linha = 96; botão − em 684..708 × 84..108
  mm(694, 96);                     // mouse SOBRE o −
  for (let i = 0; i < 40; i++) frame(1);   // ~670ms > delay 250ms
  // marcador específico do tooltip ('Valor atual: N') — o rótulo
  // 'Força' é desenhado o tempo todo e não distingue
  const abriuNoMenos = (jogoCanvas._textos || [])
    .some(t => t.indexOf('Valor atual') >= 0 ||
               t.indexOf('dano do ataque') >= 0);
  conf(!abriuNoMenos,
    'segurar o − não abre o tooltip da linha');
  mm(500, 96);                     // mouse no rótulo (deve abrir)
  jogoCanvas._textos = [];
  for (let i = 0; i < 40; i++) frame(1);
  conf((jogoCanvas._textos || [])
       .some(t => t.indexOf('dano do ataque') >= 0),
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
  clique(655, 50);                 // aba Itens
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
  p.atributos.des = 20;
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
  clique(725, 50);                 // aba Stats
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

console.log('34) velocidade: recarga sem piso e sub-passos (não atravessa)');
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
  let casos = [[8, 0.5], [100, 35 / 346], [500, 35 / 1546]];
  for (const [des, esp] of casos) {
    p.atributos.des = des;
    const s = Personagem.status(p);
    conf(Math.abs(s.recarga - esp) < 1e-9 && s.recarga === 35 / s.vel,
      'recarga sem piso: DES ' + des + ' → ' + s.recarga.toFixed(4) +
      's (' + (1 / s.recarga).toFixed(1) + ' g/s), fórmula 35/vel exata');
  }
  conf(Personagem.status(p).recarga < 0.15,
    'DES 500 passa do antigo piso de 0,15s (6,67 g/s)');
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
  p.atributos = { for: 999, con: 999, des: 500, int: 8, car: 8 };
  p.pontos = 0;
  p.equip = { arma: null, armadura: null };
  Batalha.restaurarOnda(3);
  let ev = 0;
  while (Batalha.info().morto && ev < 900) { frame(1); ev++; }
  const velEsperada = Personagem.status(p).vel;
  conf(velEsperada === 1546,
    'fixture: herói a 1546 px/s = 25,8px/frame (vel=' + velEsperada + ')');
  let viol = 0, corridas = 0, ult = null;
  for (let i = 0; i < 12000; i++) {
    frame(1);
    const f = Batalha.info();
    const atual = { x: f.heroi.x, y: f.heroi.y };
    if (ult) {
      const d = Math.hypot(atual.x - ult.x, atual.y - ult.y);
      if (d > 10) corridas++;
      if (d > 4) {
        for (const o of f.obst) {
          if (cortaMiolo(ult, atual, o)) viol++;
        }
      }
    }
    ult = atual;
  }
  conf(corridas > 100,
    'a fixture realmente correu pelo campo (' + corridas +
    ' frames com corrida >10px)');
  conf(viol === 0,
    'em 12000 frames a 25,8px/frame: NENHUM obstáculo atravessado (' +
    viol + ' violações)');
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
  conf(RankingConfig.ativo === false, 'config nasce desativada');
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

console.log('');
if (falhas) {
  console.log(falhas + ' FALHA(S)');
  process.exit(1);
}
console.log('TODOS OS TESTES PASSARAM');
