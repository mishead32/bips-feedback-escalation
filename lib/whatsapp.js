// Optional: automatic WhatsApp messages through Meta WhatsApp Cloud API.
// Turned ON only when WA_TOKEN and WA_PHONE_NUMBER_ID are set in Vercel. Otherwise the dashboard's
// manual "Send on WhatsApp" button is used.
import { CONFIG } from './config.js';

const E = process.env;
const P = () => CONFIG.ID.toUpperCase() + '_';           // BIPS_, BODYZONE_, SPAKORA_
const ev = k => E[P() + k] || E[k];                      // company value first, then shared value
export const WA = {
  token: () => ev('WA_TOKEN'),
  phoneId: () => ev('WA_PHONE_NUMBER_ID'),
  enabled: () => !!(WA.token() && WA.phoneId()),
  lang: () => ev('WA_LANG') || 'en',
  templates: () => ({
    resolution: E[P() + 'WA_TEMPLATE_RESOLUTION'] || (CONFIG.ID === 'bips' && E.WA_TEMPLATE_RESOLUTION) || CONFIG.WA_PREFIX + '_resolution',
    closed: E[P() + 'WA_TEMPLATE_CLOSED'] || (CONFIG.ID === 'bips' && E.WA_TEMPLATE_CLOSED) || CONFIG.WA_PREFIX + '_ticket_closed',
    notsat: E[P() + 'WA_TEMPLATE_REESCALATED'] || (CONFIG.ID === 'bips' && E.WA_TEMPLATE_REESCALATED) || CONFIG.WA_PREFIX + '_reescalated'
  })
};

/** "98765 43210" -> "919876543210" (India); returns '' if not a valid 10-digit mobile */
export function waNumber(m) {
  let d = String(m || '').replace(/\D/g, '');
  if (d.length > 10) d = d.slice(-10);
  return /^[6-9]\d{9}$/.test(d) ? '91' + d : '';
}

// Meta does not allow new lines / tabs / 4+ spaces inside template variables
const p = (s, max = 600) => {
  let t = String(s == null ? '' : s).replace(/[\r\n\t]+/g, ' ').replace(/ {2,}/g, ' ').trim() || '-';
  return t.length > max ? t.slice(0, max - 1) + '…' : t;
};

let poster = async (url, payload) => {
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + WA.token(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j.error && (j.error.error_user_msg || j.error.message)) || ('WhatsApp API error ' + r.status));
  return j;
};
export function usePoster(fn) { poster = fn; }

async function sendTemplate(mobile, name, params) {
  const to = waNumber(mobile);
  if (!to) throw new Error('Invalid mobile number "' + mobile + '"');
  const url = 'https://graph.facebook.com/' + (process.env.WA_API_VERSION || 'v21.0') + '/' + WA.phoneId() + '/messages';
  const j = await poster(url, {
    messaging_product: 'whatsapp', to, type: 'template',
    template: { name, language: { code: WA.lang() }, components: [{ type: 'body', parameters: params.map(x => ({ type: 'text', text: p(x) })) }] }
  });
  return (j.messages && j.messages[0] && j.messages[0].id) || 'sent';
}

function concern(t) {
  const c = String(t['Improvement Feedback'] || '').trim();
  return c ? p(c, 250) : 'Overall rating ' + t['Overall'] + '/5';
}

/** type: 'resolution' | 'closed' | 'notsat'
 *  BIPS templates:      resolution {{1}} parent {{2}} student+class {{3}} ticket {{4}} concern {{5}} action {{6}} link
 *                       closed {{1}} parent {{2}} ticket {{3}} student;   reescalated {{1}} parent {{2}} ticket
 *  Bodyzone / Spa Kora: resolution {{1}} name {{2}} ticket {{3}} concern {{4}} action {{5}} link
 *                       closed {{1}} name {{2}} ticket;                  reescalated {{1}} name {{2}} ticket */
export async function sendParentWhatsApp(type, t, confirmUrl) {
  const T = WA.templates();
  const st = CONFIG.HAS_STUDENT;
  if (type === 'resolution') {
    return sendTemplate(t['Mobile'], T.resolution, st
      ? [t['Parent Name'], t['Student Name'] + ', Class ' + t['Class & Section'], t['Ticket ID'], concern(t), t['Resolution'], confirmUrl]
      : [t['Parent Name'], t['Ticket ID'], concern(t), t['Resolution'], confirmUrl]);
  }
  if (type === 'closed') return sendTemplate(t['Mobile'], T.closed, st ? [t['Parent Name'], t['Ticket ID'], t['Student Name']] : [t['Parent Name'], t['Ticket ID']]);
  if (type === 'notsat') return sendTemplate(t['Mobile'], T.notsat, [t['Parent Name'], t['Ticket ID']]);
  throw new Error('unknown WhatsApp type ' + type);
}
