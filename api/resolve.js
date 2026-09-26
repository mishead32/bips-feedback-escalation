// GET  /api/resolve?t=TICKET&k=TOKEN   – ticket details for the resolution form
// POST /api/resolve  { t, k, text, by } – save resolution
import { CONFIG, appUrl } from '../lib/config.js';
import { json, wrap, body } from '../lib/http.js';
import { readTickets, saveResolution } from '../lib/core.js';
import { safeEqual } from '../lib/util.js';

export default wrap(async (req, res) => {
  if (req.method === 'POST') {
    const b = await body(req);
    const t = (await readTickets()).find(x => x['Ticket ID'] === String(b.t));
    if (!t || !safeEqual(t.Token, b.k)) return json(res, 403, { error: 'This link is not valid or has expired.' });
    const by = CONFIG.RESOLVER_NAMES.includes(b.by) ? b.by : CONFIG.RESOLVER_NAMES[0];
    await saveResolution(appUrl(req), b.t, b.text, by, t.Token);
    return json(res, 200, { ok: true });
  }
  const url = new URL(req.url, 'http://x');
  const id = url.searchParams.get('t'), k = url.searchParams.get('k');
  const t = (await readTickets()).find(x => x['Ticket ID'] === String(id));
  if (!t || !safeEqual(t.Token, k)) return json(res, 403, { error: 'This link is not valid or has expired. If the parent was not satisfied, a new link has been emailed to you.' });
  const pick = ['Ticket ID', 'Status', 'Level', 'Parent Name', 'Mobile', 'Student Name', 'Class & Section', 'Overall', 'Teaching & Learning',
    'Environment & Safety', 'Improvement Feedback', 'Suggestions', 'Response Remarks'];
  const out = {}; pick.forEach(p => out[p] = t[p]);
  json(res, 200, { ticket: out, resolvers: CONFIG.RESOLVER_NAMES, school: CONFIG.SCHOOL_NAME });
});
