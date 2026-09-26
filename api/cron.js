// Vercel Cron (daily 9:00 AM IST): catch-up sync + overdue reminders
import { CONFIG, appUrl } from '../lib/config.js';
import { json, wrap } from '../lib/http.js';
import { sync, sendOverdueReminders } from '../lib/core.js';

export default wrap(async (req, res) => {
  if (CONFIG.CRON_SECRET && req.headers.authorization !== 'Bearer ' + CONFIG.CRON_SECRET) return json(res, 401, { error: 'unauthorized' });
  const base = appUrl(req);
  const s = await sync(base);
  const reminders = await sendOverdueReminders(base);
  json(res, 200, { ok: true, ...s, reminders });
});
