// GET /api/data  – everything the dashboard needs (live from the Google Sheet)
import { CONFIG, appUrl } from '../lib/config.js';
import { json, wrap, checkDashboardKey } from '../lib/http.js';
import { WA } from '../lib/whatsapp.js';
import { sync, readResponses, readTickets, publicTicket } from '../lib/core.js';

export default wrap(async (req, res) => {
  checkDashboardKey(req);
  let syncInfo = null;
  // safety net: pick up any response the real-time trigger missed (older than 2 minutes)
  try { syncInfo = await sync(appUrl(req), { minAgeMs: 120000 }); } catch (e) { syncInfo = { error: e.message }; if (/access denied|not configured|not found/i.test(e.message)) throw e; }
  const [responses, tickets] = await Promise.all([readResponses(), readTickets()]);
  json(res, 200, {
    responses, tickets: tickets.map(publicTicket), now: Date.now(), sync: syncInfo,
    config: { school: CONFIG.SCHOOL_NAME, threshold: CONFIG.THRESHOLD, resHours: CONFIG.RESOLUTION_HOURS,
      replyHours: CONFIG.PARENT_REPLY_HOURS, resolvers: CONFIG.RESOLVER_NAMES, waAuto: WA.enabled() }
  });
});
