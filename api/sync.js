// GET /api/sync?secret=SYNC_SECRET  – called instantly by the Google Form trigger (and hourly)
import { CONFIG, appUrl } from '../lib/config.js';
import { json, wrap } from '../lib/http.js';
import { sync, sendOverdueReminders } from '../lib/core.js';
import { safeEqual } from '../lib/util.js';

export default wrap(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (!CONFIG.SYNC_SECRET || !safeEqual(url.searchParams.get('secret'), CONFIG.SYNC_SECRET)) return json(res, 401, { error: 'bad secret' });
  const base = appUrl(req);
  const s = await sync(base);
  const reminders = url.searchParams.get('reminders') === '1' ? await sendOverdueReminders(base) : 0;
  json(res, 200, { ok: true, ...s, reminders });
});
