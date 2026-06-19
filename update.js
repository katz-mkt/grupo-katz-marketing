#!/usr/bin/env node
/**
 * update.js — Atualização semanal do Dashboard de Marketing Grupo Katz
 * Roda toda terça-feira às 9h via Windows Task Scheduler.
 *
 * O que faz:
 *  1. Chama a API do Instagram para cada conta e obtém followers + posts
 *  2. Lê o data.js atual para preservar o histórico e métricas manuais
 *  3. Escreve novo data.js com os dados atualizados
 *  4. Faz git commit + push para o GitHub (GitHub Pages atualiza em ~1 min)
 */

'use strict';

const https    = require('https');
const fs       = require('fs');
const path     = require('path');
const { execSync } = require('child_process');

// ── Configuração das contas ────────────────────────────────────────────────
const ACCOUNTS = [
  {
    id: 'katz', name: 'Katz Empreendimentos',
    username: '@katz.life.style', url: 'https://instagram.com/katz.life.style',
    color: '#C9A96E',
    businessId: '17841402972868220',
    token: 'EAALy8G2Ai2IBRqKZCZBW1veJzW3KbGZBcSXPOb745ahA3H3m9ZAx55odqa5yJIcLShZAHjTGnpHA0ggB44j6LzMzWemRJ3dlfV90m8rxcBFrvO4nnfkRQeL0bOZC9BvXbKZBZB7elPOwy3A5uG66T2ZAoomRf0DCG5j4d04OBfgjzXJbNEoGkKH5ji8C7nZB0EJHrjgnU2MtMZD'
  },
  {
    id: 'hauz', name: 'Hauz Construções',
    username: '@hauzconstrucoes', url: 'https://instagram.com/hauzconstrucoes',
    color: '#2E86AB',
    businessId: '17841401455894729',
    token: 'EAALy8G2Ai2IBRsoGV1YlrNI4DWeJmx0DPZCjQzuLJKyH6NKrtRXMtNoZBUqANSCHvZBJ1eHCR9iJLvjVS8wDvEBRINucnD9GnZA2Q19OTuWbP17CoVC6PeuFQ5zK7RUBCH60c8ZB4bl7eGLb8H5IMKIZBx0oGYGwHtO2ZCCum1dLM7XZBjysS3v9tuCYALa3E9LVXcZBykoyZC'
  },
  {
    id: 'marianilza', name: 'Maria Nilza',
    username: '@restaurantemarianilza', url: 'https://instagram.com/restaurantemarianilza',
    color: '#E07A5F',
    businessId: '17841447607274738',
    token: 'EAALy8G2Ai2IBRvAbcZCu2uZCrZB9SKbDQ4zXrOju5nrt5F7rW27LUV27X8zcvMoSZBaKZCeFLz6gaEQDWOwIuOjnzeKeCecGHrTZCl52muDnZAZBlZASdklP81ZAlevnNGEZCRNBxXaal3pnT7RNZA0s3D0mMrBPGzhimF0VND03NIJKqU3swysRzuGlTx36CifCMnVkm3PL7b4ZD'
  },
  {
    id: 'pierjoao', name: 'Pier João de Tiba',
    username: '@pierjoaodetiba', url: 'https://instagram.com/pierjoaodetiba',
    color: '#9B5DE5',
    businessId: '17841450308131592',
    token: 'EAALy8G2Ai2IBRi1cRsj4w6LOmwJNqkLuadte991l3Y79GHahs31r0ZAxnYlQUZCU9OChsZAsFFx67iMJWhKuUL65BNwc8CpokJwtmkqCkv8PH7yn3hoTv64t399SUw5SyKhNSFUPYkjyHOVZCJ8ZAXMGg559iHpEl1NkNfZAZBayquF6hyToT3aNTooIZBqhaUeUoCZAJ11kZD'
  },
  {
    id: 'bahiakatz', name: 'Bahia Katz',
    username: '@bahiakatz', url: 'https://instagram.com/bahiakatz',
    color: '#00B4D8',
    businessId: '17841465611913453',
    token: 'EAALy8G2Ai2IBRrv6XtbPlezmmVt8RLIhrZANZBwlmlMw4NwqCFdvCnstRg89ZAzuKKkUoiliyWj97OWyWqoEAoPsrQsT838GGUFNQVE0ZABUMcKxHmt1nLqLaBcpjhuNZBHPpR6SExTKVR0Dg7uH8qE98fgp5n5FBaS632GV1GTGV7ZARQe4i5RNWDeRCy65vtZC5GN2u6i'
  },
  {
    id: 'casaararipe', name: 'Casa do Araripe',
    username: '@casadoararipe', url: 'https://instagram.com/casadoararipe',
    color: '#52B788',
    businessId: '17841477438138145',
    token: 'EAALy8G2Ai2IBRiZBi1BNOqnXHC1Rhljy8q19rtmw5MAuBKLmvjjD58gZB6E0KQKIszyh3KX0omzpP03vx07XEmQyeeeMblTIGDq7NHsCSFZCmLdIE8zfK3lzh61stl9CSZBMjMAqU7EsZBfsYZBQ7jnKGU64w44JZCdgxXoBf5sikQdv616tWcKk50FsI3mu52LbVuBW42ZB'
  }
];

const MANUAL_NETWORKS = [
  {
    platform: 'LinkedIn', icon: 'LI', iconBg: '#0A66C2',
    name: 'Grupo Katz', account: 'linkedin.com/company/grupo-katz',
    notes: 'Token apenas escrita — inserir via LinkedIn Analytics'
  },
  {
    platform: 'YouTube', icon: 'YT', iconBg: '#FF0000',
    name: 'Cosmos 3D / Grupo Katz', account: '—',
    notes: 'Inserir via YouTube Studio Analytics'
  },
  {
    platform: 'TikTok', icon: 'TK', iconBg: '#2A2A2A',
    name: 'Grupo Katz', account: '—',
    notes: 'Inserir via TikTok Analytics'
  }
];

// ── Helpers ────────────────────────────────────────────────────────────────
function pad(n) { return String(n).padStart(2, '0'); }

function getWeekNumber(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day  = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}

function fetchAccount(businessId, token) {
  return new Promise((resolve, reject) => {
    const url = `https://graph.facebook.com/v21.0/${businessId}` +
      `?fields=id,name,username,followers_count,media_count&access_token=${token}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`JSON inválido: ${data.slice(0, 200)}`)); }
      });
    }).on('error', reject);
  });
}

function readCurrentHistory(dataPath) {
  if (!fs.existsSync(dataPath)) return [];
  const src = fs.readFileSync(dataPath, 'utf8');
  // Extract the history array using a simple regex
  const m = src.match(/history\s*:\s*(\[[\s\S]*?\])\s*\};/);
  if (!m) return [];
  try { return JSON.parse(m[1]); }
  catch (e) { return []; }
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  const now      = new Date();
  const week     = getWeekNumber(now);
  const year     = now.getFullYear();
  const dateStr  = `${pad(now.getDate())}/${pad(now.getMonth()+1)}/${year}`;

  const next     = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const nextStr  = `${pad(next.getDate())}/${pad(next.getMonth()+1)}/${year}`;

  // Period: Monday to Sunday of current week
  const mon  = new Date(now);
  const day  = now.getDay() === 0 ? 6 : now.getDay() - 1;
  mon.setDate(now.getDate() - day);
  const sun  = new Date(mon.getTime() + 6 * 24 * 60 * 60 * 1000);
  const period = `${pad(mon.getDate())}/${pad(mon.getMonth()+1)} – ${pad(sun.getDate())}/${pad(sun.getMonth()+1)}/${year}`;

  console.log(`\n=== Dashboard Marketing — Semana ${week}/${year} (${dateStr}) ===\n`);

  // ── Fetch Instagram data ──
  const igData = [];
  for (const acc of ACCOUNTS) {
    process.stdout.write(`Buscando ${acc.name}... `);
    try {
      const resp = await fetchAccount(acc.businessId, acc.token);
      if (resp.error) throw new Error(resp.error.message);
      igData.push({
        ...acc,
        followers    : resp.followers_count,
        posts        : resp.media_count,
        new_followers: null,
        reach        : null,
        impressions  : null,
        engagement   : null,
        posts_week   : null,
        stories_week : null,
        reels_week   : null
      });
      console.log(`✓  ${resp.followers_count.toLocaleString('pt-BR')} seguidores`);
    } catch (err) {
      console.log(`✗  ERRO: ${err.message}`);
      // Keep zeroed entry so dashboard doesn't break
      igData.push({
        ...acc,
        followers: 0, posts: 0,
        new_followers: null, reach: null, impressions: null,
        engagement: null, posts_week: null, stories_week: null, reels_week: null
      });
    }
  }

  // ── Build history ──
  const dataPath = path.join(__dirname, 'data.js');
  let history    = readCurrentHistory(dataPath);

  const snapshot = { date: dateStr, week };
  snapshot.followers = {};
  igData.forEach(a => { snapshot.followers[a.id] = a.followers; });
  history.push(snapshot);
  if (history.length > 52) history = history.slice(-52); // keep 1 year

  // ── Render data.js ──
  const igJson = igData.map(a => `    {
      id       : "${a.id}",
      name     : "${a.name}",
      username : "${a.username}",
      url      : "${a.url}",
      color    : "${a.color}",
      followers: ${a.followers},
      posts    : ${a.posts},
      new_followers : null,
      reach         : null,
      impressions   : null,
      engagement    : null,
      posts_week    : null,
      stories_week  : null,
      reels_week    : null
    }`).join(',\n');

  const manualJson = MANUAL_NETWORKS.map(m => `    {
      platform   : "${m.platform}",
      icon       : "${m.icon}",
      iconBg     : "${m.iconBg}",
      name       : "${m.name}",
      account    : "${m.account}",
      followers  : null,
      posts_week : null,
      reach      : null,
      impressions: null,
      engagement : null,
      notes      : "${m.notes}"
    }`).join(',\n');

  const historyJson = JSON.stringify(history, null, 4)
    .split('\n').map((l, i) => i === 0 ? l : '  ' + l).join('\n');

  const output = `// DADOS DO DASHBOARD — gerado automaticamente em ${dateStr}
// followers e posts: via API Instagram (update.js)
// reach, impressions, engagement, posts_week, stories_week, reels_week:
//   inserir manualmente via Meta Business Suite

const DATA = {
  meta: {
    lastUpdated : "${dateStr}",
    nextUpdate  : "${nextStr}",
    week        : ${week},
    period      : "${period}"
  },

  instagram: [
${igJson}
  ],

  manual: [
${manualJson}
  ],

  history: ${historyJson}
};
`;

  fs.writeFileSync(dataPath, output, 'utf8');
  console.log('\n✓ data.js atualizado');

  // ── Git commit + push ──
  const cwd = __dirname;
  try {
    execSync('git add data.js', { cwd, stdio: 'pipe' });
    execSync(`git commit -m "data: atualização semana ${week}/${year}"`, { cwd, stdio: 'pipe' });
    execSync('git push origin main', { cwd, stdio: 'inherit' });
    console.log(`✓ GitHub atualizado — semana ${week}/${year}`);
    console.log(`  Site: https://katz-mkt.github.io/grupo-katz-marketing/\n`);
  } catch (err) {
    const msg = err.stderr ? err.stderr.toString() : err.message;
    if (msg.includes('nothing to commit')) {
      console.log('  (sem alterações para commitar)');
    } else {
      console.error('✗ Erro git:', msg);
      process.exit(1);
    }
  }
}

main().catch(err => {
  console.error('\nErro fatal:', err.message);
  process.exit(1);
});
