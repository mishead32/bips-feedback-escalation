// Company-wise settings. Secrets and emails come from Vercel Environment Variables.
// One deployment serves BIPS, Bodyzone and Spa Kora. Every request runs "inside" one company
// (see runForCompany); CONFIG always returns the settings of that company.
import { AsyncLocalStorage } from 'async_hooks';

const E = process.env;
const list = v => String(v || '').split(',').map(s => s.trim()).filter(Boolean);
const pick = (...vals) => vals.find(v => v !== undefined && v !== null && String(v).trim() !== '');

function common(P, d) {
  // P = env prefix ("BIPS_", "BODYZONE_", "SPAKORA_"); d = defaults
  const g = k => pick(E[P + k], d.legacy ? E[k] : undefined);
  return {
    THRESHOLD: Number(pick(g('ESCALATE_IF_OVERALL_AT_OR_BELOW'), 4)),
    RESOLUTION_HOURS: Number(pick(g('RESOLUTION_HOURS'), 24)),
    PARENT_REPLY_HOURS: Number(pick(g('PARENT_REPLY_HOURS'), 24)),
    TZ_OFFSET_MIN: 330,
    TICKET_SHEET: 'FB Tickets',
    SETTINGS_SHEET: 'FB Settings',
    SHEET_ID: pick(g('SHEET_ID'), d.sheetId, ''),
    RESPONSE_SHEET: pick(g('RESPONSE_SHEET'), 'Form responses 1'),
    ESCALATE_TO: list(g('ESCALATE_TO')),
    ESCALATE_TO_NAMES: pick(g('ESCALATE_TO_NAMES'), d.toNames),
    RESOLVER_NAMES: list(pick(g('RESOLVER_NAMES'), d.resolvers)),
    CC: list(g('CC')),
    MIS_EMAIL: list(pick(g('MIS_EMAIL'), E.MIS_EMAIL, E.GMAIL_USER)),
    CONFIDENTIAL_TO: list(pick(g('CONFIDENTIAL_ESCALATE_TO'), g('MIS_EMAIL'), E.MIS_EMAIL, E.GMAIL_USER)),
    CONFIDENTIAL_CC: list(g('CONFIDENTIAL_CC') || ''),
    CONFIDENTIAL_NAMES: pick(g('CONFIDENTIAL_NAMES'), "Sir / Ma'am"),
    CONFIDENTIAL_RESOLVERS: list(pick(g('CONFIDENTIAL_RESOLVERS'), 'Management')),
    DASHBOARD_PASSWORD: pick(g('PASSWORD'), d.legacy ? E.DASHBOARD_PASSWORD : undefined, ''),
    WA_PREFIX: d.waPrefix,
    SYNC_SECRET: E.SYNC_SECRET || '',
    CRON_SECRET: E.CRON_SECRET || ''
  };
}

export const COMPANIES = {
  bips: () => ({
    ID: 'bips', SHORT_NAME: 'BIPS', ORG_NAME: 'Bhupindra International Public School', SCHOOL_NAME: 'Bhupindra International Public School',
    LOGO_TEXT: 'BHUPINDRA INTERNATIONAL PUBLIC SCHOOL', BRAND: '#1F3864',
    WHO: 'parent', WHO_T: 'Parent', HAS_STUDENT: true,
    RATING2: 'Teaching & Learning', RATING3: 'School Environment & Safety',
    Q1: 'If you gave less than 5 stars in any area, please let us know how we can improve to meet your expectations.',
    Q2: 'What additional initiatives, support, or opportunities would you like BIPS to offer or incorporate to make your experience with us more enriching and fulfilling?',
    Q3: '',
    COLS: { name: ['parent name', 'full name'], rating2: ['teaching'], rating3: ['environment'], suggest: ['additional', 'one thing we could add', 'add or improve'], liked: ['like the most'] },
    COORDINATOR_NAME: 'MIS – Parent Feedback Cell', CATEGORY_SET: 'school', CONFIDENTIAL_RULE: true,
    ...common('BIPS_', { legacy: true, sheetId: '', toNames: "Indu Sharma Ma'am and Poonam Gulati Ma'am",
      resolvers: "Indu Sharma Ma'am (Principal),Poonam Gulati Ma'am", waPrefix: 'bips' })
  }),
  bodyzone: () => ({
    ID: 'bodyzone', SHORT_NAME: 'BZ', ORG_NAME: 'Bodyzone', SCHOOL_NAME: 'Bodyzone',
    LOGO_TEXT: 'BODYZONE FITNESS & SPA', BRAND: '#2D3142',
    WHO: 'member', WHO_T: 'Member', HAS_STUDENT: false,
    RATING2: 'Trainer & Staff Support', RATING3: 'Cleanliness & Facilities',
    Q1: 'If you gave less than 5 stars in any area, please let us know how we can improve to meet your expectations.',
    Q2: 'What is one thing we could add or improve to make your experience with us even better?',
    Q3: 'What is the one thing you like the most about Bodyzone?',
    COLS: { name: ['full name', 'name'], rating2: ['trainer', 'staff support'], rating3: ['cleanliness', 'facilities'], suggest: ['one thing we could add', 'add or improve'], liked: ['like the most'] },
    COORDINATOR_NAME: 'MIS – Member Feedback Cell', CATEGORY_SET: 'gym', CONFIDENTIAL_RULE: false,
    ...common('BODYZONE_', { sheetId: '1VDZkztZbkVpFNwv-5cYRF9YTjKcyU_xHR36o-PuaJTI', toNames: 'Amit Kumar Sir, Amit Kapoor Sir and Floor Managers',
      resolvers: 'Amit Kumar,Amit Kapoor,Floor Manager', waPrefix: 'bodyzone' })
  }),
  spakora: () => ({
    ID: 'spakora', SHORT_NAME: 'SK', ORG_NAME: 'Spa Kora', SCHOOL_NAME: 'Spa Kora',
    LOGO_TEXT: 'SPA KORA', BRAND: '#2F5D50',
    WHO: 'client', WHO_T: 'Client', HAS_STUDENT: false,
    RATING2: 'Therapist Service', RATING3: 'Ambience & Hygiene',
    Q1: 'If you gave less than 5 stars in any area, please let us know how we can improve to meet your expectations.',
    Q2: 'What is one thing we could add or improve to make your experience with us even better?',
    Q3: 'What is the one thing you like the most about Spa Kora?',
    COLS: { name: ['full name', 'name'], rating2: ['therapist', 'trainer', 'staff support'], rating3: ['ambience', 'hygiene', 'cleanliness'], suggest: ['one thing we could add', 'add or improve'], liked: ['like the most'] },
    COORDINATOR_NAME: 'MIS – Client Feedback Cell', CATEGORY_SET: 'spa', CONFIDENTIAL_RULE: false,
    ...common('SPAKORA_', { sheetId: '1i15JFAufvWbJajwXQSdjfpWlr7CSbapmsFRPRN9TyjM', toNames: "Amit Kumar Sir and Deepmala Ma'am",
      resolvers: 'Amit Kumar,Deepmala', waPrefix: 'spakora' })
  })
};
export const COMPANY_IDS = Object.keys(COMPANIES);
export function companyConfig(id) {
  const f = COMPANIES[String(id || '').toLowerCase()];
  if (!f) throw Object.assign(new Error('Unknown company "' + id + '"'), { code: 400 });
  return f();
}

const als = new AsyncLocalStorage();
/** run fn with CONFIG = settings of company `id` */
export function runForCompany(id, fn) { return als.run(companyConfig(id), fn); }
export function currentCompany() { return als.getStore() || companyConfig('bips'); }

// CONFIG.X always reads the current company's value
export const CONFIG = new Proxy({}, { get: (_, k) => currentCompany()[k] });

/** public list for the login screen (no secrets) */
export function companyList() {
  return COMPANY_IDS.map(id => { const c = companyConfig(id); return { id, name: c.ORG_NAME, logo: c.LOGO_TEXT, brand: c.BRAND, ready: !!(c.SHEET_ID && c.DASHBOARD_PASSWORD) }; });
}

export function appUrl(req) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return 'https://' + process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (req && req.headers && req.headers.host) return (req.headers['x-forwarded-proto'] || 'https') + '://' + req.headers.host;
  return '';
}
