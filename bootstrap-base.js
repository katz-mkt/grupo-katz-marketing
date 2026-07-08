#!/usr/bin/env node
/**
 * bootstrap-base.js — Prepara a planilha-base (abas + cabeçalhos).
 *
 * A planilha já foi criada no Drive do time (ver base-config.json).
 * Este script, rodando pela conta de serviço, cria as abas e escreve os
 * cabeçalhos. Requer que a planilha esteja COMPARTILHADA com a conta de
 * serviço como editor (sheets-mcp@cosmos-sheets-mcp.iam.gserviceaccount.com).
 *
 * Estrutura:
 *  - diario      : histórico APPEND-ONLY (1 linha por conta por dia) — nunca apagado
 *  - visao_geral : último snapshot dos KPIs por conta (sobrescrito a cada sync)
 *  - posts       : principais publicações/reels do período (sobrescrito)
 *  - hashtags    : melhores hashtags do período (sobrescrito)
 *  - manual      : dados inseridos à mão pelo time (LinkedIn, YouTube, TikTok)
 *
 * Uso: node bootstrap-base.js
 */
'use strict';

const fs   = require('fs');
const path = require('path');
const { makeClients } = require('./lib-sheets');

const CONFIG = JSON.parse(fs.readFileSync(path.join(__dirname, 'base-config.json'), 'utf8'));

const TABS = {
  diario     : ['data', 'conta_id', 'conta', 'seguidores', 'novos_seguidores', 'alcance', 'visualizacoes'],
  visao_geral: ['conta_id', 'conta', 'seguidores', 'cresc_seguidores', 'novos_seguidores', 'publicacoes',
                'visualizacoes', 'cresc_visualizacoes', 'alcance', 'cresc_alcance', 'curtidas', 'comentarios',
                'contas_engajadas', 'taxa_engajamento', 'atualizado_em'],
  posts      : ['conta_id', 'conta', 'tipo', 'data', 'legenda', 'link', 'alcance', 'visualizacoes',
                'curtidas', 'comentarios', 'salvos', 'compartilhamentos', 'interacoes', 'taxa_engajamento'],
  hashtags   : ['conta_id', 'conta', 'hashtag', 'interacoes'],
  manual     : ['plataforma', 'conta', 'seguidores', 'alcance_mes', 'engajamento_mes', 'obs', 'atualizado_em']
};

async function main() {
  const id = CONFIG.spreadsheetId;
  const { sheets, email } = makeClients(['https://www.googleapis.com/auth/spreadsheets']);
  console.log('Conta de serviço:', email);

  let meta;
  try {
    meta = await sheets.spreadsheets.get({ spreadsheetId: id });
  } catch (e) {
    console.error('\n✗ Sem acesso à planilha. Compartilhe-a com a conta de serviço como EDITOR:');
    console.error('  ' + email + '\n');
    process.exit(1);
  }

  const existing = meta.data.sheets.map(s => s.properties.title);
  const wanted   = Object.keys(TABS);

  // Cria abas que faltam
  const addReqs = wanted.filter(n => !existing.includes(n))
    .map((title, i) => ({ addSheet: { properties: { title, gridProperties: { frozenRowCount: 1 } } } }));
  if (addReqs.length) {
    await sheets.spreadsheets.batchUpdate({ spreadsheetId: id, requestBody: { requests: addReqs } });
    console.log('✓ Abas criadas:', addReqs.map(r => r.addSheet.properties.title).join(', '));
  }

  // Remove a aba padrão vazia (Sheet1 / Página1), se existir e não for uma das nossas
  meta = await sheets.spreadsheets.get({ spreadsheetId: id });
  const leftover = meta.data.sheets.find(s => !wanted.includes(s.properties.title));
  if (leftover && meta.data.sheets.length > wanted.length) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: id,
      requestBody: { requests: [{ deleteSheet: { sheetId: leftover.properties.sheetId } }] }
    });
    console.log('✓ Aba padrão removida:', leftover.properties.title);
  }

  // Cabeçalhos
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: id,
    requestBody: {
      valueInputOption: 'RAW',
      data: wanted.map(name => ({ range: `${name}!A1`, values: [TABS[name]] }))
    }
  });
  console.log('✓ Cabeçalhos gravados');

  // Formata cabeçalhos (negrito + fundo)
  meta = await sheets.spreadsheets.get({ spreadsheetId: id });
  const fmt = meta.data.sheets
    .filter(s => wanted.includes(s.properties.title))
    .map(s => ({
      repeatCell: {
        range: { sheetId: s.properties.sheetId, startRowIndex: 0, endRowIndex: 1 },
        cell: { userEnteredFormat: { textFormat: { bold: true }, backgroundColor: { red: .93, green: .93, blue: .95 } } },
        fields: 'userEnteredFormat(textFormat,backgroundColor)'
      }
    }));
  await sheets.spreadsheets.batchUpdate({ spreadsheetId: id, requestBody: { requests: fmt } });
  console.log('✓ Formatação aplicada');

  console.log('\n📊 BASE PRONTA:\n' + CONFIG.url + '\n');
}

main().catch(e => { console.error('Erro:', e.message); process.exit(1); });
