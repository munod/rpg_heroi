// Configuração do Firebase para o RANKING GLOBAL (js/ranking.js).
//
// Como preencher (console do Firebase):
//   1) console.firebase.google.com → criar projeto (plano gratuito);
//   2) Build → Firestore Database → Create database (modo produção,
//      região mais próxima do Brasil);
//   3) Configurações do app → Seus apps → ícone "</>" (Web) → registrar;
//   4) copie o objeto firebaseConfig da tela para "firebase" abaixo;
//   5) publique as regras do Firestore (verbatim em
//      .specs/features/ranking/regras-firestore.rules);
//   6) ponha ativo: true.
//
// Sem isso (ou sem rede/SDK) a tela de ranking roda em modo
// "não configurado" e NADA é enviado — o jogo nunca depende da rede.
var RankingConfig = {
  ativo: false,
  firebase: {
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: ''
  }
};
