import { CONFIG, runForCompany, COMPANY_IDS, companyConfig } from './config.js';
import { safeEqual } from './util.js';

export function json(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}
export function checkDashboardKey(req) {
  if (!CONFIG.DASHBOARD_PASSWORD) throw Object.assign(new Error('Password for ' + CONFIG.ORG_NAME + ' is not set in Vercel (' + (CONFIG.ID === 'bips' ? 'DASHBOARD_PASSWORD' : CONFIG.ID.toUpperCase() + '_PASSWORD') + ').'), { code: 500 });
  const key = req.headers['x-key'] || '';
  if (!safeEqual(key, CONFIG.DASHBOARD_PASSWORD)) throw Object.assign(new Error('Wrong password for ' + CONFIG.ORG_NAME), { code: 401 });
}
export async function body(req) {
  if (req._parsedBody) return req._parsedBody;
  let b = {};
  if (req.body && typeof req.body === 'object') b = req.body;
  else if (typeof req.body === 'string') { try { b = JSON.parse(req.body); } catch (e) { b = {}; } }
  else if (req.method === 'POST') {
    const chunks = []; for await (const c of req) chunks.push(c);
    try { b = JSON.parse(Buffer.concat(chunks).toString() || '{}'); } catch (e) { b = {}; }
  }
  req._parsedBody = b;
  return b;
}
/** company of this request: header x-company, ?c=, or body.c. Old links without it = BIPS. */
export async function companyOf(req) {
  const url = new URL(req.url, 'http://x');
  const c = req.headers['x-company'] || url.searchParams.get('c') || (await body(req)).c || 'bips';
  companyConfig(c); // validates
  return String(c).toLowerCase();
}
/** wrap(fn) runs fn inside the request's company. wrap(fn, { all: true }) runs fn once, caller loops companies. */
export function wrap(fn, opts = {}) {
  return async (req, res) => {
    try {
      if (opts.all) return await fn(req, res);
      const c = await companyOf(req);
      await runForCompany(c, () => fn(req, res));
    }
    catch (e) { console.error(e); json(res, e.code || 500, { error: e.message || String(e) }); }
  };
}
export { runForCompany, COMPANY_IDS };
