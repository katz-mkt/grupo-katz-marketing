// DADOS DO DASHBOARD — gerado automaticamente toda terça-feira
// followers e posts: atualizados via API do Instagram (update.js)
// reach, impressions, engagement, posts_week, stories_week, reels_week:
//   inserir manualmente via Meta Business Suite após cada semana

const DATA = {
  meta: {
    lastUpdated : "17/06/2026",
    nextUpdate  : "24/06/2026",
    week        : 25,
    period      : "11/06 – 17/06/2026"
  },

  instagram: [
    {
      id       : "katz",
      name     : "Katz Empreendimentos",
      username : "@katz.life.style",
      url      : "https://instagram.com/katz.life.style",
      color    : "#C9A96E",
      followers: 46246,
      posts    : 1326,
      new_followers : null,
      reach         : null,
      impressions   : null,
      engagement    : null,
      posts_week    : null,
      stories_week  : null,
      reels_week    : null
    },
    {
      id       : "hauz",
      name     : "Hauz Construções",
      username : "@hauzconstrucoes",
      url      : "https://instagram.com/hauzconstrucoes",
      color    : "#2E86AB",
      followers: 16088,
      posts    : 610,
      new_followers : null,
      reach         : null,
      impressions   : null,
      engagement    : null,
      posts_week    : null,
      stories_week  : null,
      reels_week    : null
    },
    {
      id       : "marianilza",
      name     : "Maria Nilza",
      username : "@restaurantemarianilza",
      url      : "https://instagram.com/restaurantemarianilza",
      color    : "#E07A5F",
      followers: 9836,
      posts    : 312,
      new_followers : null,
      reach         : null,
      impressions   : null,
      engagement    : null,
      posts_week    : null,
      stories_week  : null,
      reels_week    : null
    },
    {
      id       : "pierjoao",
      name     : "Pier João de Tiba",
      username : "@pierjoaodetiba",
      url      : "https://instagram.com/pierjoaodetiba",
      color    : "#9B5DE5",
      followers: 7985,
      posts    : 305,
      new_followers : null,
      reach         : null,
      impressions   : null,
      engagement    : null,
      posts_week    : null,
      stories_week  : null,
      reels_week    : null
    },
    {
      id       : "bahiakatz",
      name     : "Bahia Katz",
      username : "@bahiakatz",
      url      : "https://instagram.com/bahiakatz",
      color    : "#00B4D8",
      followers: 5901,
      posts    : 881,
      new_followers : null,
      reach         : null,
      impressions   : null,
      engagement    : null,
      posts_week    : null,
      stories_week  : null,
      reels_week    : null
    },
    {
      id       : "casaararipe",
      name     : "Casa do Araripe",
      username : "@casadoararipe",
      url      : "https://instagram.com/casadoararipe",
      color    : "#52B788",
      followers: 55,
      posts    : 13,
      new_followers : null,
      reach         : null,
      impressions   : null,
      engagement    : null,
      posts_week    : null,
      stories_week  : null,
      reels_week    : null
    }
  ],

  manual: [
    {
      platform   : "LinkedIn",
      icon       : "LI",
      iconBg     : "#0A66C2",
      name       : "Grupo Katz",
      account    : "linkedin.com/company/grupo-katz",
      followers  : null,
      posts_week : null,
      reach      : null,
      impressions: null,
      engagement : null,
      notes      : "Token apenas escrita — inserir via LinkedIn Analytics"
    },
    {
      platform   : "YouTube",
      icon       : "YT",
      iconBg     : "#FF0000",
      name       : "Cosmos 3D / Grupo Katz",
      account    : "—",
      followers  : null,
      posts_week : null,
      reach      : null,
      impressions: null,
      engagement : null,
      notes      : "Inserir via YouTube Studio Analytics"
    },
    {
      platform   : "TikTok",
      icon       : "TK",
      iconBg     : "#2A2A2A",
      name       : "Grupo Katz",
      account    : "—",
      followers  : null,
      posts_week : null,
      reach      : null,
      impressions: null,
      engagement : null,
      notes      : "Inserir via TikTok Analytics"
    }
  ],

  // Top posts da semana — update.js atualiza automaticamente
  top_posts: [
    {
      account_id   : "katz",
      account_name : "Katz Empreendimentos",
      account_color: "#C9A96E",
      post_id      : "18106166284968694",
      type         : "VIDEO",
      date         : "17/06/2026",
      likes        : 36,
      comments     : 1,
      thumb        : "thumbs/top_katz_1.jpg",
      caption      : "Por que Acuruí?\nLocalizado na Estrada Real, o Haras do Passo está a 50 min de BH, mas totalmente imerso na natureza.",
      url          : "https://www.instagram.com/reel/DLIgzYFOpZT/"
    },
    {
      account_id   : "hauz",
      account_name : "Hauz Construções",
      account_color: "#2E86AB",
      post_id      : "18012302648715681",
      type         : "VIDEO",
      date         : "17/06/2026",
      likes        : 28,
      comments     : 1,
      thumb        : "thumbs/top_hauz_2.jpg",
      caption      : "Implantada com rigor geométrico às margens do lago, a PCN evidencia o domínio técnico na articulação de volumes ortogonais.",
      url          : "https://www.instagram.com/reel/DLJpQ5gOFIh/"
    },
    {
      account_id   : "hauz",
      account_name : "Hauz Construções",
      account_color: "#2E86AB",
      post_id      : "17963039988121082",
      type         : "CAROUSEL_ALBUM",
      date         : "15/06/2026",
      likes        : 26,
      comments     : 0,
      thumb        : "thumbs/top_hauz_3.jpg",
      caption      : "REN | MINAS GERAIS\nProjeto Arquitetônico: Jacobsen Arquitetura\nImagens: Fran Parente\nConstrução: Hauz Construções",
      url          : "https://www.instagram.com/p/DLFHXlzOHOC/"
    }
  ],

  // Histórico semanal — update.js adiciona 1 entrada por semana automaticamente
  history: [
    {
      date: "17/06/2026", week: 25,
      followers: {
        katz: 46246, hauz: 16088, marianilza: 9836,
        pierjoao: 7985, bahiakatz: 5901, casaararipe: 55
      }
    }
  ]
};
