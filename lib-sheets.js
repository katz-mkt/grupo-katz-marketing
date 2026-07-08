/**
 * lib-sheets.js — Autenticação e helpers do Google Sheets (conta de serviço)
 * Reaproveita a googleapis e as credenciais do MCP google-sheets do projeto.
 */
'use strict';

const fs   = require('fs');
const path = require('path');

// Localiza googleapis (instalada no MCP google-sheets) e as credenciais
const TOOLS = path.join(process.env.KATZ_TOOLS ||
  'C:/Users/Usuario/Documents/_CLAUDE/tools/google-sheets-mcp');

// permite carregar googleapis de fora do projeto
const Module = require('module');
if (fs.existsSync(path.join(TOOLS, 'node_modules'))) {
  Module.globalPaths.push(path.join(TOOLS, 'node_modules'));
  process.env.NODE_PATH = path.join(TOOLS, 'node_modules') +
    (process.env.NODE_PATH ? path.delimiter + process.env.NODE_PATH : '');
  Module._initPaths();
}

const { google } = require('googleapis');

const CRED_PATH = process.env.GOOGLE_SHEETS_CREDENTIALS ||
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  path.join(TOOLS, 'credentials.json');

function makeClients(scopes) {
  const credentials = JSON.parse(fs.readFileSync(CRED_PATH, 'utf8'));
  const auth = new google.auth.GoogleAuth({ credentials, scopes });
  return {
    email  : credentials.client_email,
    sheets : google.sheets({ version: 'v4', auth }),
    drive  : google.drive({ version: 'v3', auth })
  };
}

module.exports = { makeClients, CRED_PATH, TOOLS };
