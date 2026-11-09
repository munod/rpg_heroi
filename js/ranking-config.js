// Configuração do Firebase para o RANKING GLOBAL (js/ranking.js).
//
// Como preencher (console do Firebase):
//   1) console.firebase.google.com → criar projeto (plano gratuito);
//   2) Build → Firestore Database → Create database (modo produção,
//      região mais próxima do Brasil);
//   3) Configurações do app → Seus apps → ícone "</>" (Web) → registrar;
//   4) copiar os valores do firebaseConfig da tela para "firebase";
//   5) publicar as regras do Firestore (verbatim em
//      .specs/features/ranking/regras-firestore.rules);
//   6) ponha ativo: true.
//
// ATENÇÃO: o snippet que o console mostra usa `import` (módulo ES) e só
// funciona com bundler (Vite/webpack). Aqui o jogo carrega scripts
// CLÁSSICOS — cole só os VALORES dentro do objeto abaixo, como está.
//
// Sem isso (ou sem rede/SDK) a tela de ranking roda em modo
// "não configurado" e NADA é enviado — o jogo nunca depende da rede.
var RankingConfig = {
  ativo: true,
  firebase: {
    apiKey: 'AIzaSyAowNMnFDoExKVlP_PJygP9Wz7-Z0FQKcI',
    authDomain: 'heroirpg-d9d1f.firebaseapp.com',
    projectId: 'heroirpg-d9d1f',
    storageBucket: 'heroirpg-d9d1f.firebasestorage.app',
    messagingSenderId: '938821894754',
    appId: '1:938821894754:web:8d719a05e5c23c3817473b'
  }
};
