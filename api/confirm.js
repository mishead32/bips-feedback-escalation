// GET  /api/confirm?t=TICKET&p=TOKEN   – details for the parent's Satisfied / Not Satisfied form
// POST /api/confirm { t, p, response, remarks }
import { CONFIG, appUrl } from '../lib/config.js';
import { json, wrap, body } from '../lib/http.js';
import { readTickets, parentConfirm, ST } from '../lib/core.js';
import { safeEqual } from '../lib/util.js';

export default wrap(async (req, res) => {
  if (req.method === 'POST') {
    const b = await body(req);
    await parentConfirm(appUrl(req), b.t, b.p, b.response, b.remarks);
    return json(res, 200, { ok: true });
  }
  const url = new URL(req.url, 'http://x');
  const t = (await readTickets()).find(x => x['Ticket ID'] === String(url.searchParams.get('t')));
  if (!t || !safeEqual(t['Parent Token'], url.searchParams.get('p'))) return json(res, 403, { error: 'This link is not valid.' });
  json(res, 200, {
    school: CONFIG.SCHOOL_NAME, open: t.Status === ST.RES, answered: t['Parent Response'] || '',
    ticket: { id: t['Ticket ID'], parent: t['Parent Name'], student: t['Student Name'], cls: t['Class & Section'],
      concern: t['Improvement Feedback'] || ('Overall rating ' + t['Overall'] + '/5'), resolution: t['Resolution'] }
  });
});
