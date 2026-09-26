// POST /api/action  { fn, args }  – dashboard buttons
import { appUrl } from '../lib/config.js';
import { json, wrap, checkDashboardKey, body } from '../lib/http.js';
import * as core from '../lib/core.js';

export default wrap(async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });
  checkDashboardKey(req);
  const { fn, args = [] } = await body(req);
  const base = appUrl(req);
  const a = args;
  const map = {
    apiEscalateResponse: () => core.escalateResponse(base, a[0], a[1]),
    apiSaveResolution: () => core.saveResolution(base, a[0], a[1], String(a[2] || '') + ' (entered by MIS)'),
    apiMarkWhatsApp: () => core.markWhatsApp(a[0], a[1]),
    apiParentResponse: () => core.parentResponse(base, a[0], a[1], a[2], a[3]),
    apiResendEscalation: () => core.resendEscalation(base, a[0])
  };
  if (!map[fn]) return json(res, 400, { error: 'Unknown action' });
  const result = await map[fn]();
  json(res, 200, { ok: true, result });
});
