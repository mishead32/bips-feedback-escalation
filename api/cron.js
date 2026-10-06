// Vercel Cron (daily 9:00 AM IST): catch-up sync + overdue reminders for every company
import { appUrl, COMPANY_IDS, runForCompany, companyConfig } from '../lib/config.js';
import { json, wrap } from '../lib/http.js';
import { sync, sendOverdueReminders } from '../lib/core.js';

export default wrap(async (req, res) => {
  if (process.env.CRON_SECRET && req.headers.authorization !== 'Bearer ' + process.env.CRON_SECRET) return json(res, 401, { error: 'unauthorized' });
  const base = appUrl(req);
  const out = {};
  for (const id of COMPANY_IDS.filter(id => companyConfig(id).SHEET_ID)) {
    out[id] = await runForCompany(id, async () => {
      try { const s = await sync(base); return { ok: true, ...s, reminders: await sendOverdueReminders(base) }; }
      catch (e) { return { ok: false, error: e.message }; }
    });
  }
  json(res, 200, { ok: true, companies: out });
}, { all: true });
