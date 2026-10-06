// GET /api/sync?secret=SYNC_SECRET&c=bips|bodyzone|spakora  – called instantly by each Google Form trigger (and hourly)
// Without c= every configured company is synced.
import { CONFIG, appUrl, COMPANY_IDS, runForCompany, companyConfig } from '../lib/config.js';
import { json, wrap } from '../lib/http.js';
import { sync, sendOverdueReminders } from '../lib/core.js';
import { safeEqual } from '../lib/util.js';

export default wrap(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (!process.env.SYNC_SECRET || !safeEqual(url.searchParams.get('secret'), process.env.SYNC_SECRET)) return json(res, 401, { error: 'bad secret' });
  const base = appUrl(req);
  const only = url.searchParams.get('c');
  const ids = only ? [String(only).toLowerCase()] : COMPANY_IDS.filter(id => companyConfig(id).SHEET_ID);
  const out = {};
  for (const id of ids) {
    out[id] = await runForCompany(id, async () => {
      try {
        const s = await sync(base);
        const reminders = url.searchParams.get('reminders') === '1' ? await sendOverdueReminders(base) : 0;
        return { ok: true, ...s, reminders };
      } catch (e) { return { ok: false, error: e.message }; }
    });
  }
  // keep the old single-company response shape when one company was asked for
  json(res, 200, only ? out[ids[0]] : { ok: true, companies: out });
}, { all: true });
