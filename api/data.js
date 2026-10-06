// GET /api/data  – everything the dashboard needs (live from the Google Sheet)
import { CONFIG, appUrl } from '../lib/config.js';
import { json, wrap, checkDashboardKey } from '../lib/http.js';
import { WA } from '../lib/whatsapp.js';
import { sync, readResponses, readTickets, publicTicket } from '../lib/core.js';

export default wrap(async (req, res) => {
  checkDashboardKey(req);
  let syncInfo = null;
  // safety net: pick up any response the real-time trigger missed (older than 2 minutes)
  try { syncInfo = await sync(appUrl(req), { minAgeMs: 30000 }); } catch (e) { syncInfo = { error: e.message }; if (/access denied|not configured|not found/i.test(e.message)) throw e; }
  const [responses, tickets] = await Promise.all([readResponses(), readTickets()]);
  json(res, 200, {
    responses, tickets: tickets.map(publicTicket), now: Date.now(), sync: syncInfo,
    config: { company: CONFIG.ID, org: CONFIG.ORG_NAME, logo: CONFIG.LOGO_TEXT, brand: CONFIG.BRAND, short: CONFIG.SHORT_NAME,
      who: CONFIG.WHO, whoT: CONFIG.WHO_T, hasStudent: CONFIG.HAS_STUDENT, rating2: CONFIG.RATING2, rating3: CONFIG.RATING3,
      q1: CONFIG.Q1, q2: CONFIG.Q2, q3: CONFIG.Q3, confidentialRule: CONFIG.CONFIDENTIAL_RULE, escalateNames: CONFIG.ESCALATE_TO_NAMES,
      school: CONFIG.SCHOOL_NAME, threshold: CONFIG.THRESHOLD, resHours: CONFIG.RESOLUTION_HOURS,
      replyHours: CONFIG.PARENT_REPLY_HOURS, resolvers: CONFIG.RESOLVER_NAMES, confResolvers: CONFIG.CONFIDENTIAL_RESOLVERS, waAuto: WA.enabled() }
  });
});
