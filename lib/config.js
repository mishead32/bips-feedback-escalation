// All settings. Secrets and emails come from Vercel Environment Variables.
const list = v => String(v || '').split(',').map(s => s.trim()).filter(Boolean);

export const CONFIG = {
  SCHOOL_NAME: 'Bhupindra International Public School',
  SHORT_NAME: 'BIPS',
  SHEET_ID: process.env.SHEET_ID || '',
  RESPONSE_SHEET: process.env.RESPONSE_SHEET || 'Form responses 1',
  TICKET_SHEET: 'FB Tickets',
  SETTINGS_SHEET: 'FB Settings',

  ESCALATE_TO: list(process.env.ESCALATE_TO),
  ESCALATE_TO_NAMES: process.env.ESCALATE_TO_NAMES || "Indu Ma'am and Poonam Gulati Ma'am",
  RESOLVER_NAMES: list(process.env.RESOLVER_NAMES || "Indu Ma'am,Poonam Gulati Ma'am"),
  CC: list(process.env.CC),
  MIS_EMAIL: list(process.env.MIS_EMAIL || process.env.GMAIL_USER),
  COORDINATOR_NAME: 'MIS – Parent Feedback Cell',

  THRESHOLD: Number(process.env.ESCALATE_IF_OVERALL_AT_OR_BELOW || 4),
  RESOLUTION_HOURS: Number(process.env.RESOLUTION_HOURS || 24),
  PARENT_REPLY_HOURS: Number(process.env.PARENT_REPLY_HOURS || 24),
  TZ_OFFSET_MIN: 330, // India (IST) – sheet timezone

  DASHBOARD_PASSWORD: process.env.DASHBOARD_PASSWORD || '',
  SYNC_SECRET: process.env.SYNC_SECRET || '',
  CRON_SECRET: process.env.CRON_SECRET || ''
};

export function appUrl(req) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return 'https://' + process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (req && req.headers && req.headers.host) return (req.headers['x-forwarded-proto'] || 'https') + '://' + req.headers.host;
  return '';
}
