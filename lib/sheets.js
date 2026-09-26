// Thin wrapper around the Google Sheets REST API (service account).
import { JWT } from 'google-auth-library';
import { CONFIG } from './config.js';

let jwt = null;
async function token() {
  if (!jwt) {
    const key = String(process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !key) throw new Error('Google service account is not configured (GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY).');
    jwt = new JWT({ email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, key, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
  }
  const t = await jwt.getAccessToken();
  return t.token;
}

async function api(path, opts = {}) {
  const url = 'https://sheets.googleapis.com/v4/spreadsheets/' + CONFIG.SHEET_ID + path;
  const res = await fetch(url, {
    ...opts,
    headers: { Authorization: 'Bearer ' + (await token()), 'Content-Type': 'application/json', ...(opts.headers || {}) }
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (body.error && body.error.message) || res.statusText;
    if (res.status === 403) throw new Error('Google Sheet access denied. Share the sheet with ' + process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL + ' as Editor. (' + msg + ')');
    throw new Error('Google Sheets error: ' + msg);
  }
  return body;
}
const q = s => "'" + String(s).replace(/'/g, "''") + "'";

/** Real Google Sheets implementation */
export const GoogleSheets = {
  async listSheets() {
    const b = await api('?fields=sheets.properties');
    return b.sheets.map(s => s.properties);
  },
  /** values with dates as serial numbers (unformatted) */
  async getValues(sheet) {
    const b = await api('/values/' + encodeURIComponent(q(sheet)) + '?valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER');
    return b.values || [];
  },
  async append(sheet, rows) {
    return api('/values/' + encodeURIComponent(q(sheet) + '!A1') + ':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS', {
      method: 'POST', body: JSON.stringify({ values: rows })
    });
  },
  async update(sheet, a1, rows) {
    return api('/values/' + encodeURIComponent(q(sheet) + '!' + a1) + '?valueInputOption=RAW', {
      method: 'PUT', body: JSON.stringify({ values: rows })
    });
  },
  async addSheet(title, headers, dateCols) {
    const add = await api(':batchUpdate', { method: 'POST', body: JSON.stringify({ requests: [{ addSheet: { properties: { title, gridProperties: { frozenRowCount: 1 } } } }] }) });
    const id = add.replies[0].addSheet.properties.sheetId;
    await this.update(title, 'A1', [headers]);
    const requests = [{
      repeatCell: {
        range: { sheetId: id, startRowIndex: 0, endRowIndex: 1 },
        cell: { userEnteredFormat: { backgroundColor: { red: 0.12, green: 0.22, blue: 0.39 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } } } },
        fields: 'userEnteredFormat(backgroundColor,textFormat)'
      }
    }];
    (dateCols || []).forEach(c => requests.push({
      repeatCell: {
        range: { sheetId: id, startRowIndex: 1, startColumnIndex: c, endColumnIndex: c + 1 },
        cell: { userEnteredFormat: { numberFormat: { type: 'DATE_TIME', pattern: 'dd/mm/yyyy hh:mm' } } },
        fields: 'userEnteredFormat.numberFormat'
      }
    }));
    await api(':batchUpdate', { method: 'POST', body: JSON.stringify({ requests }) });
    return id;
  }
};

// Tests swap this for an in-memory sheet.
export let Sheets = GoogleSheets;
export function useSheets(impl) { Sheets = impl; }
