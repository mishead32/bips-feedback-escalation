// GET /api/health  – setup checklist (needs dashboard password in header x-key or ?key=)
import { CONFIG } from '../lib/config.js';
import { json, wrap } from '../lib/http.js';
import { Sheets } from '../lib/sheets.js';
import { WA } from '../lib/whatsapp.js';
import { safeEqual } from '../lib/util.js';

export default wrap(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const key = req.headers['x-key'] || url.searchParams.get('key');
  if (!CONFIG.DASHBOARD_PASSWORD || !safeEqual(key, CONFIG.DASHBOARD_PASSWORD)) return json(res, 401, { error: 'add ?key=YOUR_DASHBOARD_PASSWORD' });
  const checks = {
    SHEET_ID: !!CONFIG.SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY: !!process.env.GOOGLE_PRIVATE_KEY,
    GMAIL_USER: !!process.env.GMAIL_USER, GMAIL_APP_PASSWORD: !!process.env.GMAIL_APP_PASSWORD,
    ESCALATE_TO: CONFIG.ESCALATE_TO.length > 0, CC: CONFIG.CC.length > 0, SYNC_SECRET: !!CONFIG.SYNC_SECRET
  };
  let sheet = 'not checked';
  try { const s = await Sheets.listSheets(); sheet = 'OK – tabs: ' + s.map(x => x.title).join(', '); } catch (e) { sheet = 'ERROR – ' + e.message; }
  let whatsapp = 'OFF – manual Send on WhatsApp button (add WA_TOKEN + WA_PHONE_NUMBER_ID to switch on)';
  if (WA.enabled()) {
    try {
      const r = await fetch('https://graph.facebook.com/' + (process.env.WA_API_VERSION || 'v21.0') + '/' + process.env.WA_PHONE_NUMBER_ID + '?fields=display_phone_number,verified_name,quality_rating', { headers: { Authorization: 'Bearer ' + process.env.WA_TOKEN } });
      const j = await r.json();
      whatsapp = r.ok ? 'ON – ' + j.verified_name + ' (' + j.display_phone_number + '), quality ' + j.quality_rating + '; templates: ' + Object.values(WA.templates()).join(', ') : 'ERROR – ' + ((j.error && j.error.message) || r.status);
    } catch (e) { whatsapp = 'ERROR – ' + e.message; }
  }
  json(res, 200, { checks, sheet, whatsapp });
});
