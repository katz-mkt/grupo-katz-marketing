#!/usr/bin/env node
/**
 * update-relatorio.js — Coleta insights completos do Instagram (modelo mLabs)
 * Gera report-data.js consumido por relatorio.html
 *
 * Métricas por conta (período: últimos 30 dias, comparado aos 30 anteriores):
 *  - Visão geral: seguidores, novos seguidores, publicações, visualizações,
 *    alcance, curtidas, comentários, contas engajadas, taxa de engajamento
 *  - Séries diárias: alcance, novos seguidores
 *  - Atividade dos seguidores online por hora e por dia da semana
 *  - Demografia: gênero, faixa etária, cidades
 *  - Melhores hashtags (interações somadas por hashtag)
 *  - Principais publicações e reels (alcance, curtidas, comentários, salvos, compart.)
 *
 * Uso: node update-relatorio.js
 */

'use strict';

const https = require('https');
const fs    = require('fs');
const path  = require('path');

// Reaproveita as contas/tokens do update.js
const ACCOUNTS = (() => {
  const src = fs.readFileSync(path.join(__dirname, 'update.js'), 'utf8');
  const m = src.match(/const ACCOUNTS = (\[[\s\S]*?\n\]);/);
  return new Function('return ' + m[1])();
})();

const V = 'v21.0';

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { reject(new Error(d.slice(0, 200))); } });
    }).on('error', reject);
  });
}

function api(pathPart, params) {
  const qs = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  return get(`https://graph.facebook.com/${V}/${pathPart}?${qs}`);
}

const fmtDate = d => d.toISOString().slice(0, 10);
const brDate  = d => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;

async function totalValues(bid, token, metrics, since, until) {
  const r = await api(`${bid}/insights`, {
    metric: metrics.join(','), period: 'day', metric_type: 'total_value',
    since, until, access_token: token
  });
  const out = {};
  (r.data || []).forEach(m => { out[m.name] = m.total_value ? m.total_value.value : null; });
  return out;
}

async function dailySeries(bid, token, metric, since, until) {
  const r = await api(`${bid}/insights`, { metric, period: 'day', since, until, access_token: token });
  const vals = r.data && r.data[0] ? r.data[0].values : [];
  return vals.map(v => ({ date: v.end_time.slice(0, 10), value: typeof v.value === 'number' ? v.value : v.value }));
}

async function demographics(bid, token, breakdown) {
  try {
    const r = await api(`${bid}/insights`, {
      metric: 'follower_demographics', period: 'lifetime',
      metric_type: 'total_value', breakdown, access_token: token
    });
    const res = r.data && r.data[0] && r.data[0].total_value &&
                r.data[0].total_value.breakdowns && r.data[0].total_value.breakdowns[0];
    if (!res) return [];
    return res.results.map(x => ({ label: x.dimension_values.join(' '), value: x.value }))
      .sort((a, b) => b.value - a.value);
  } catch (e) { return []; }
}

function growth(cur, prev) {
  if (cur == null || prev == null || prev === 0) return null;
  return Math.round(((cur - prev) / prev) * 10000) / 100;
}

async function collectAccount(acc, since, until, prevSince, prevUntil) {
  const t = acc.token, bid = acc.businessId;
  const out = { id: acc.id, name: acc.name, username: acc.username, url: acc.url, color: acc.color, error: null };

  // Perfil
  const prof = await api(bid, { fields: 'followers_count,media_count,username,profile_picture_url', access_token: t });
  if (prof.error) { out.error = prof.error.message; return out; }
  out.followers   = prof.followers_count;
  out.media_count = prof.media_count;
  out.avatar      = prof.profile_picture_url || null;

  // Totais do período e do período anterior
  const METRICS = ['views', 'reach', 'accounts_engaged', 'likes', 'comments', 'total_interactions'];
  const cur  = await totalValues(bid, t, METRICS, since, until).catch(() => ({}));
  let   prev = {};
  try { prev = await totalValues(bid, t, METRICS, prevSince, prevUntil); } catch (e) {}

  // Novos seguidores por dia (API só cobre últimos 30 dias)
  const followSeries = await dailySeries(bid, t, 'follower_count', since, until).catch(() => []);
  const newFollowers = followSeries.reduce((s, x) => s + (x.value || 0), 0);

  // Alcance diário
  out.reach_daily  = await dailySeries(bid, t, 'reach', since, until).catch(() => []);
  out.follow_daily = followSeries;

  // Seguidores online → por hora e por dia da semana
  out.online_hours = null; out.online_weekdays = null;
  try {
    const r = await api(`${bid}/insights`, { metric: 'online_followers', period: 'lifetime', since, until, access_token: t });
    const days = (r.data && r.data[0] && r.data[0].values) || [];
    const hours = Array(24).fill(0), weekdays = Array(7).fill(0), wdCount = Array(7).fill(0);
    days.forEach(d => {
      const wd = new Date(d.end_time).getUTCDay();
      let dayTotal = 0, dayPeak = 0;
      Object.entries(d.value || {}).forEach(([h, v]) => { hours[+h] += v; dayTotal += v; dayPeak = Math.max(dayPeak, v); });
      weekdays[wd] += dayPeak; wdCount[wd]++;
    });
    out.online_hours    = hours.map(v => Math.round(v / Math.max(days.length, 1)));
    out.online_weekdays = weekdays.map((v, i) => Math.round(v / Math.max(wdCount[i], 1)));
  } catch (e) {}

  // Demografia
  out.demo_gender = await demographics(bid, t, 'gender');
  out.demo_age    = await demographics(bid, t, 'age');
  out.demo_city   = (await demographics(bid, t, 'city')).slice(0, 10);

  // Mídias do período (até 100) com insights
  const mediaResp = await api(`${bid}/media`, {
    fields: 'id,caption,media_type,media_product_type,timestamp,permalink,thumbnail_url,media_url,like_count,comments_count,' +
            'insights.metric(reach,saved,shares,views)',
    limit: 100, access_token: t
  }).catch(() => ({ data: [] }));

  const inPeriod = (mediaResp.data || []).filter(m => {
    const d = m.timestamp.slice(0, 10);
    return d >= since && d <= until;
  });

  const norm = m => {
    const ins = {};
    ((m.insights && m.insights.data) || []).forEach(i => { ins[i.name] = i.values && i.values[0] ? i.values[0].value : null; });
    const likes = m.like_count || 0, comments = m.comments_count || 0;
    const reach = ins.reach || 0, saved = ins.saved || 0, shares = ins.shares || 0, views = ins.views || 0;
    return {
      caption : (m.caption || '').slice(0, 90),
      url     : m.permalink,
      thumb   : m.thumbnail_url || m.media_url || null,
      date    : m.timestamp.slice(0, 10),
      type    : m.media_product_type || m.media_type,
      reach, views, likes, comments, saved, shares,
      interactions: likes + comments + saved + shares,
      eng_rate: reach ? Math.round((likes + comments + saved + shares) / reach * 10000) / 100 : null
    };
  };

  const all = inPeriod.map(norm);
  out.posts_period = all.length;
  out.top_posts = [...all].sort((a, b) => b.reach - a.reach).slice(0, 10);
  out.top_reels = all.filter(p => p.type === 'REELS').sort((a, b) => b.views - a.views).slice(0, 10);

  // Hashtags: interações somadas por hashtag
  const tags = {};
  inPeriod.forEach((m, i) => {
    const inter = all[i].interactions;
    ((m.caption || '').match(/#[\wÀ-ÿ]+/g) || []).forEach(tg => {
      const k = tg.slice(1);
      tags[k] = (tags[k] || 0) + inter;
    });
  });
  out.hashtags = Object.entries(tags).map(([tag, v]) => ({ tag, value: v }))
    .sort((a, b) => b.value - a.value).slice(0, 10);

  // Visão geral com crescimento
  out.overview = {
    followers        : { value: out.followers, growth: null },
    new_followers    : { value: newFollowers, growth: null },
    posts            : { value: all.length, growth: null },
    views            : { value: cur.views ?? null, growth: growth(cur.views, prev.views) },
    reach            : { value: cur.reach ?? null, growth: growth(cur.reach, prev.reach) },
    likes            : { value: cur.likes ?? null, growth: growth(cur.likes, prev.likes) },
    comments         : { value: cur.comments ?? null, growth: growth(cur.comments, prev.comments) },
    engaged          : { value: cur.accounts_engaged ?? null, growth: growth(cur.accounts_engaged, prev.accounts_engaged) },
    interactions     : { value: cur.total_interactions ?? null, growth: growth(cur.total_interactions, prev.total_interactions) },
    engagement_rate  : {
      value : (cur.accounts_engaged && cur.reach) ? Math.round(cur.accounts_engaged / cur.reach * 10000) / 100 : null,
      growth: growth(
        (cur.accounts_engaged && cur.reach) ? cur.accounts_engaged / cur.reach : null,
        (prev.accounts_engaged && prev.reach) ? prev.accounts_engaged / prev.reach : null
      )
    }
  };

  return out;
}

async function main() {
  const now = new Date();
  const until = new Date(now); until.setDate(until.getDate() - 1);            // ontem
  const since = new Date(until); since.setDate(since.getDate() - 29);         // 30 dias
  const prevUntil = new Date(since); prevUntil.setDate(prevUntil.getDate() - 1);
  const prevSince = new Date(prevUntil); prevSince.setDate(prevSince.getDate() - 29);

  const S = fmtDate(since), U = fmtDate(until), PS = fmtDate(prevSince), PU = fmtDate(prevUntil);
  console.log(`\n=== Relatório Detalhado — período ${S} a ${U} (comparação: ${PS} a ${PU}) ===\n`);

  const accounts = [];
  for (const acc of ACCOUNTS) {
    process.stdout.write(`Coletando ${acc.name}... `);
    try {
      const data = await collectAccount(acc, S, U, PS, PU);
      accounts.push(data);
      console.log(data.error ? `✗ ${data.error}` : `✓ ${data.posts_period} posts, alcance ${data.overview.reach.value?.toLocaleString('pt-BR') ?? '—'}`);
    } catch (e) {
      console.log(`✗ ERRO: ${e.message}`);
      accounts.push({ id: acc.id, name: acc.name, username: acc.username, color: acc.color, error: e.message });
    }
  }

  const output = `// RELATÓRIO DETALHADO — gerado automaticamente em ${brDate(now)}
// Período: ${brDate(since)} – ${brDate(until)} | Comparação: ${brDate(prevSince)} – ${brDate(prevUntil)}
// Gerado por update-relatorio.js — NÃO editar manualmente

const REPORT = {
  meta: {
    generatedAt : "${brDate(now)}",
    period      : "${brDate(since)} – ${brDate(until)}",
    prevPeriod  : "${brDate(prevSince)} – ${brDate(prevUntil)}"
  },
  accounts: ${JSON.stringify(accounts, null, 2)}
};
`;
  fs.writeFileSync(path.join(__dirname, 'report-data.js'), output, 'utf8');
  console.log('\n✓ report-data.js gerado');
}

main().catch(e => { console.error('Erro fatal:', e.message); process.exit(1); });
