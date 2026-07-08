#!/usr/bin/env node
/**
 * sync-base.js — Sincroniza a base do Google Sheets e regenera o relatório.
 *
 * Fluxo a cada execução:
 *  1. Coleta os últimos 30 dias de cada conta via IG Graph API (update-relatorio.js)
 *  2. APPEND na aba `diario`: só grava (data, conta) que ainda não existem —
 *     o histórico nunca é apagado, então cresce além da janela de 30 dias da API
 *  3. Sobrescreve `visao_geral`, `posts` e `hashtags` com o snapshot mais recente
 *  4. Lê de volta TODO o histórico da aba `diario` e regenera report-data.js
 *     com as séries longas (o relatório passa a mostrar meses, como o modelo mLabs)
 *
 * A planilha precisa estar compartilhada como editor com a conta de serviço.
 * Uso: node sync-base.js
 */
'use strict';

const fs   = require('fs');
const path = require('path');
const { makeClients } = require('./lib-sheets');
const { collectAll, brDate } = require('./update-relatorio');

const CONFIG = JSON.parse(fs.readFileSync(path.join(__dirname, 'base-config.json'), 'utf8'));
const ID = CONFIG.spreadsheetId;

const num = v => (v == null || v === '' ? null : Number(v));

async function readTab(sheets, range) {
  const r = await sheets.spreadsheets.values.get({ spreadsheetId: ID, range });
  return r.data.values || [];
}

async function overwriteTab(sheets, tab, header, rows) {
  await sheets.spreadsheets.values.clear({ spreadsheetId: ID, range: `${tab}!A2:Z100000` });
  const values = [header, ...rows];
  await sheets.spreadsheets.values.update({
    spreadsheetId: ID, range: `${tab}!A1`,
    valueInputOption: 'RAW', requestBody: { values }
  });
}

async function main() {
  console.log('\n=== Sincronizando base (Google Sheets) ===\n');
  const { sheets, email } = makeClients(['https://www.googleapis.com/auth/spreadsheets']);

  // Valida acesso
  try { await sheets.spreadsheets.get({ spreadsheetId: ID }); }
  catch (e) {
    console.error('✗ Sem acesso à planilha. Compartilhe como EDITOR com:\n  ' + email + '\n');
    process.exit(1);
  }

  // 1) Coleta viva
  console.log('Coletando Instagram...');
  const { accounts, now, period } = await collectAll();
  console.log('  ✓ ' + accounts.length + ' contas');

  // 2) APPEND no diário (sem duplicar dia/conta)
  const diarioRows = await readTab(sheets, 'diario!A2:G100000');
  const seen = new Set(diarioRows.map(r => `${r[0]}|${r[1]}`));   // data|conta_id
  const today = brDate(now).split('/').reverse().join('-');       // yyyy-mm-dd

  const toAppend = [];
  for (const a of accounts) {
    if (a.error) continue;
    const byDate = {};
    (a.reach_daily || []).forEach(x => { (byDate[x.date] = byDate[x.date] || {}).reach = x.value; });
    (a.follow_daily || []).forEach(x => { (byDate[x.date] = byDate[x.date] || {}).nf = x.value; });
    for (const date of Object.keys(byDate).sort()) {
      const key = `${date}|${a.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const d = byDate[date];
      toAppend.push([
        date, a.id, a.name,
        date === today ? a.followers : '',   // seguidores total só no dia de hoje
        d.nf ?? '', d.reach ?? '', ''         // visualizações diárias não vêm da API
      ]);
    }
  }
  if (toAppend.length) {
    // ordena por data para manter o diário cronológico
    toAppend.sort((x, y) => (x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : 0));
    await sheets.spreadsheets.values.append({
      spreadsheetId: ID, range: 'diario!A1',
      valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS',
      requestBody: { values: toAppend }
    });
    console.log(`  ✓ diário: +${toAppend.length} linhas novas`);
  } else {
    console.log('  ✓ diário: nada novo para gravar');
  }

  // 3) Sobrescreve snapshots
  const ts = brDate(now);
  const ovRows = accounts.filter(a => !a.error).map(a => {
    const o = a.overview;
    return [a.id, a.name, o.followers.value, o.new_followers.value, o.new_followers.value,
      o.posts.value, o.views.value, o.views.growth, o.reach.value, o.reach.growth,
      o.likes.value, o.comments.value, o.engaged.value, o.engagement_rate.value, ts];
  });
  await overwriteTab(sheets,
    'visao_geral',
    ['conta_id','conta','seguidores','cresc_seguidores','novos_seguidores','publicacoes','visualizacoes',
     'cresc_visualizacoes','alcance','cresc_alcance','curtidas','comentarios','contas_engajadas','taxa_engajamento','atualizado_em'],
    ovRows);
  console.log('  ✓ visao_geral atualizada');

  const postRows = [];
  accounts.filter(a => !a.error).forEach(a => {
    (a.top_posts || []).forEach(p => postRows.push([
      a.id, a.name, p.type, p.date, p.caption, p.url,
      p.reach, p.views, p.likes, p.comments, p.saved, p.shares, p.interactions, p.eng_rate
    ]));
  });
  await overwriteTab(sheets, 'posts',
    ['conta_id','conta','tipo','data','legenda','link','alcance','visualizacoes','curtidas',
     'comentarios','salvos','compartilhamentos','interacoes','taxa_engajamento'],
    postRows);
  console.log('  ✓ posts atualizada');

  const tagRows = [];
  accounts.filter(a => !a.error).forEach(a => {
    (a.hashtags || []).forEach(h => tagRows.push([a.id, a.name, h.tag, h.value]));
  });
  await overwriteTab(sheets, 'hashtags', ['conta_id','conta','hashtag','interacoes'], tagRows);
  console.log('  ✓ hashtags atualizada');

  // 4) Lê o histórico completo e regenera report-data.js com séries longas
  const allDiario = await readTab(sheets, 'diario!A2:G100000');
  const hist = {};   // conta_id -> { reach:[], follow:[] }
  allDiario.forEach(r => {
    const [date, id] = r;
    if (!id) return;
    (hist[id] = hist[id] || { reach: [], follow: [] });
    if (r[5] !== '' && r[5] != null) hist[id].reach.push({ date, value: num(r[5]) });
    if (r[4] !== '' && r[4] != null) hist[id].follow.push({ date, value: num(r[4]) });
  });

  // substitui as séries de 30 dias pela série acumulada da base
  accounts.forEach(a => {
    if (hist[a.id]) {
      a.reach_daily  = hist[a.id].reach.sort((x, y) => x.date < y.date ? -1 : 1);
      a.follow_daily = hist[a.id].follow.sort((x, y) => x.date < y.date ? -1 : 1);
    }
  });

  // primeira data da base = início real do período acumulado
  const allDates = allDiario.map(r => r[0]).filter(Boolean).sort();
  const firstDate = allDates[0] ? allDates[0].split('-').reverse().join('/') : brDate(now);

  const output = `// RELATÓRIO DETALHADO — gerado por sync-base.js em ${brDate(now)}
// Fonte: base histórica no Google Sheets (acumulada, sem limite de 30 dias)
// Planilha: ${CONFIG.url}
// NÃO editar manualmente

const REPORT = {
  meta: {
    generatedAt : "${brDate(now)}",
    period      : "${firstDate} – ${brDate(new Date(now.getTime() - 864e5))}",
    prevPeriod  : "${brDate(period.prevSince)} – ${brDate(period.prevUntil)}",
    source      : "Google Sheets (base acumulada)"
  },
  accounts: ${JSON.stringify(accounts, null, 2)}
};
`;
  fs.writeFileSync(path.join(__dirname, 'report-data.js'), output, 'utf8');
  console.log('  ✓ report-data.js regenerado (histórico completo)');
  console.log('\n✓ Sincronização concluída.\n');
}

main().catch(e => { console.error('Erro fatal:', e.message); process.exit(1); });
