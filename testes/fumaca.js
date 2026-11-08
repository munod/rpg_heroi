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

  // --- progressão: próximo abate dá nível e +5 pontos
  const p1 = Game.personagem;
  p1.xp = p1.xpProx - 1;
  const nivel0 = p1.nivel, pts1 = p1.pontos;
  let subiu = false;
  for (let i = 0; i < 3000 && !subiu; i++) {
    frame(1);
    if (p1.nivel > nivel0) subiu = true;
  }
  conf(p1.nivel === nivel0 + 1 && p1.pontos === pts1 + 5,
    'abate dá nível e +5 pontos (nv ' + nivel0 + '->' + p1.nivel +
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
  clique(580, 138);           // botão Mago
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
       s[0].rar >= 1 && s[0].rar <= 3,
    'sorteio devolve 1 item válido');
  const sd = Itens.sorteiaDrop(1, true);
  conf(sd.length === 2 && sd.every(i => i.rar >= 2),
    'chefe dropa 2 itens de raridade >= 2');

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
  jogoCanvas._textos = [];
  Batalha.limparEfeitos();        // some com textos/efeitos pendentes
  let desbloqueou = false;
  for (let i = 0; i < 6000 && !desbloqueou; i++) {
    frame(1);
    desbloqueou = (jogoCanvas._textos || [])
      .some(t => t.indexOf('desbloqueada') >= 0);
  }
  conf(desbloqueou, 'subir de nível anuncia a skill desbloqueada');

  // --- nuke periódico do mago dispara sozinho (Bola de Fogo)
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
  jogoCanvas._textos = [];
  Batalha.limparEfeitos();
  let envenenou = false;
  for (let i = 0; i < 2500 && !envenenou; i++) {
    frame(1);
    envenenou = (jogoCanvas._textos || []).some(t => t === 'Veneno');
  }
  conf(envenenou, 'ladino aplica veneno nos acertos');
  conf(Efeitos.qtd() > 0,
    'a aplicação do veneno respinga efeitos visuais');

  // --- bênção do clérigo: só anuncia quando cura de verdade
  p.classe = 'clerigo';
  p.atributos.con = 1;
  p.atributos.for = 1;
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

  // --- renascimento aleatório: 3 ciclos de morte em locais distintos
  p.atributos.con = 1;
  p.atributos.for = 1;
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

  // --- contagem ao vivo: luta forte soma abates/ondas/dano/tempo
  p.atributos.for = 50;
  p.atributos.int = 50;
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

console.log('');
if (falhas) {
  console.log(falhas + ' FALHA(S)');
  process.exit(1);
}
console.log('TODOS OS TESTES PASSARAM');
