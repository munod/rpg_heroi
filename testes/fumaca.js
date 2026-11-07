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
  clique(361, 46); // centro do botão + (aba Atributos)
  frame(2);
  conf(p0.atributos.for === for0 + 1 && p0.pontos === pts0 - 1,
    'botão + funciona na criação (for ' + for0 + '->' + p0.atributos.for +
    ', pts ' + pts0 + '->' + p0.pontos + ')');

  // sem teto de 18: dá pra ir além
  p0.atributos.for = 50;
  const ptsCap = p0.pontos;
  clique(361, 46);
  frame(2);
  conf(p0.atributos.for === 51 && p0.pontos === ptsCap - 1,
    'sem teto: Força50 -> 51 (pontos ' + ptsCap + ' -> ' + p0.pontos + ')');

  // --- segurar o + repete (arranque de 0,25s e depois ~10/s)
  p0.pontos = 50;
  const ptsSeg = p0.pontos;
  pressionar(361, 46);          // pressiona sem soltar
  frame(45);                    // ~0,75s segurado
  soltar();
  const gastos = ptsSeg - p0.pontos;
  conf(gastos >= 3 && gastos <= 15,
    'segurar repete o + (gastou ' + gastos + ' em ~0,75s)');

  // --- toggle ×5: gasta 5 por clique e volta para ×1
  clique(354, 117);             // toggle (342,112,25,11)
  frame(2);
  p0.pontos = 10;
  const forT = p0.atributos.for;
  clique(361, 46);
  frame(2);
  conf(p0.atributos.for === forT + 5 && p0.pontos === 5,
    '×5 gasta 5 por clique (for ' + forT + '->' + p0.atributos.for +
    ', pts 10->' + p0.pontos + ')');
  clique(354, 117);             // volta para ×1
  frame(2);
  clique(361, 46);
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
  clique(270, 25);            // aba Aparência
  frame(2);
  const pele0 = p1.look.skin;
  clique(353, 48);           // botão > da linha Pele
  frame(2);
  conf(p1.look.skin !== pele0, 'troca de cor de pele funciona');

  clique(314, 25);           // aba Classe
  frame(2);
  clique(290, 69);           // botão Mago
  frame(2);
  conf(p1.classe === 'mago', 'troca de classe funciona');

  clique(226, 25);           // volta pra aba Atributos
  frame(2);

  // --- pausar / continuar
  clique(322, 194);
  frame(2);
  conf(Batalha.info().pausada === true, 'botão Pausar pausa a batalha');
  clique(322, 194);
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
  clique(118, 194);           // botão Trocar herói
  frame(2);
  conf(Game.cena === 'selecao',
    'Trocar herói leva para a tela de seleção (fora da arena)');
  const ondaParada = Batalha.info().onda;
  for (let i = 0; i < 60; i++) frame(1);
  conf(Batalha.info().onda === ondaParada,
    'a batalha fica parada enquanto você está fora da jogatina');

  const forSel = Game.personagem.atributos.for;
  Game.personagem.pontos = 5;  // saldo pro clique (herói nasce sem pontos)
  clique(361, 46);            // + funciona na tela de seleção
  frame(2);
  conf(Game.personagem.atributos.for === forSel + 1 &&
       Game.personagem.pontos === 4,
    'dá para ajustar atributos na seleção (for ' + forSel + ' -> ' +
    Game.personagem.atributos.for + ', pontos 5 -> ' +
    Game.personagem.pontos + ')');

  clique(60, 194);            // botão JOGAR
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
  clique(118, 194);                       // Trocar herói -> seleção
  frame(2);
  conf(Game.cena === 'selecao', 'a lista vive na tela de seleção');

  const qtd0 = Salvar.listar().length;
  clique(35, 144);                        // botão Novo (8,136,54,16)
  frame(2);
  conf(Salvar.listar().length === qtd0 + 1,
    'Novo criou um registro a mais (' + qtd0 + ' -> ' +
    Salvar.listar().length + ')');
  conf(Game.personagem.nome === 'Herói', 'o novo herói está em foco na seleção');

  // --- exclusão em duas etapas: foca o primeiro herói da lista
  clique(100, 56);                        // item 1 da lista (8,48,184,16)
  frame(2);
  const alvo = Game.personagem;
  clique(96, 144);                        // Apagar (1º clique)
  frame(2);
  conf(Salvar.listar().some(s => s.id === alvo.id),
    'primeiro clique só pede confirmação (não apagou)');
  clique(96, 144);                        // Sim? (2º clique)
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
  clique(190, 40);                        // seta > da navegação (184,34,12,12)
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
  clique(118, 194);              // Trocar herói
  frame(2);
  conf(Game.cena === 'selecao', 'saiu para a seleção');
  clique(35, 144);               // Novo -> cria e foca o herói B
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
  clique(60, 194);
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
  clique(358, 25);                 // aba Itens (4ª coluna)
  frame(2);
  conf((jogoCanvas._textos || []).some(t => t.indexOf('Bolsa') >= 0),
    'aba Itens abre com a bolsa');
  clique(292, 108);                // linha da bolsa (2ª: y=102..115)
  frame(2);
  conf(p.equip.armadura === manto && p.bolsa.indexOf(manto) < 0,
    'clicar na linha da bolsa equipa o item');
  clique(226, 25);                 // volta pra Atributos (estado neutro)
  frame(2);

  if (!estavaPausada) Batalha.alternarPausa();
}

console.log('16) magias automáticas (procs por classe)');
{
  const Magias = sandbox.Magias;
  const Batalha = sandbox.Batalha;
  const p = Game.personagem;
  if (Batalha.info().pausada) Batalha.alternarPausa();
  p.atributos.for = 50;        // herói com dano decente p/ os gatilhos
  p.atributos.int = 50;
  p.pontos = 0;

  // --- dados: desbloqueio por nível (5 e 15) e cobertura das classes
  conf(Magias.ativas('mago', 4).length === 0 &&
       Magias.ativas('mago', 5).length === 1 &&
       Magias.ativas('mago', 15).length === 2,
    'magias desbloqueiam nos níveis 5 e 15');
  conf(!!Magias.desbloqueada('mago', 5) &&
       Magias.desbloqueada('mago', 6) === null &&
       Magias.desbloqueada('ladino', 5).tipo === 'veneno',
    'desbloqueada devolve a magia exata do nível');
  conf(['guerreiro', 'mago', 'ladino', 'clerigo']
       .every(c => Magias.magiasDe(c).length === 2),
    'toda classe tem 2 magias');

  // --- aviso ao subir de nível (mago: força o nível 4 e espera o kill)
  p.classe = 'mago';
  p.nivel = 4;
  p.xp = p.xpProx - 1;
  jogoCanvas._textos = [];
  let desbloqueou = false;
  for (let i = 0; i < 6000 && !desbloqueou; i++) {
    frame(1);
    desbloqueou = (jogoCanvas._textos || [])
      .some(t => t.indexOf('desbloqueada') >= 0);
  }
  conf(desbloqueou, 'subir de nível anuncia a magia desbloqueada');

  // --- nuke periódico do mago dispara sozinho (Bola de Fogo)
  jogoCanvas._textos = [];
  let lancou = false;
  for (let i = 0; i < 900 && !lancou; i++) {
    frame(1);
    lancou = (jogoCanvas._textos || []).some(t => t === 'Bola de Fogo');
  }
  conf(lancou, 'mago dispara a magia automática (Bola de Fogo)');

  // --- área do guerreiro: varredura a cada 5 golpes
  p.classe = 'guerreiro';
  jogoCanvas._textos = [];
  let varreu = false;
  for (let i = 0; i < 2500 && !varreu; i++) {
    frame(1);
    varreu = (jogoCanvas._textos || []).some(t => t === 'Golpe Embravecido');
  }
  conf(varreu, 'guerreiro faz a varredura contando golpes');

  // --- veneno do ladino por acerto
  p.classe = 'ladino';
  jogoCanvas._textos = [];
  let envenenou = false;
  for (let i = 0; i < 2500 && !envenenou; i++) {
    frame(1);
    envenenou = (jogoCanvas._textos || []).some(t => t === 'Veneno');
  }
  conf(envenenou, 'ladino aplica veneno nos acertos');

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
  let curou = false;
  for (let i = 0; i < 3000 && !curou; i++) {
    frame(1);
    curou = (jogoCanvas._textos || []).some(t => t === 'Bênção');
  }
  conf(curou, 'clérigo cura periodicamente (Bênção)');
}

console.log('');
if (falhas) {
  console.log(falhas + ' FALHA(S)');
  process.exit(1);
}
console.log('TODOS OS TESTES PASSARAM');
