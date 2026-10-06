# GCS Feedback & Escalation System – BIPS · Bodyzone · Spa Kora (Vercel)

Live dashboard + automatic escalation emails on top of the Google Form response sheets.
One Vercel project serves three companies. The dashboard first asks **which company**, then that company's **password**.

| Company | Sheet | Escalates to | Password variable |
|---|---|---|---|
| BIPS | `SHEET_ID` | Indu Sharma Ma'am, Poonam Gulati Ma'am (`ESCALATE_TO`) | `DASHBOARD_PASSWORD` |
| Bodyzone | built in (`1VDZkztZ…`) | Amit Kumar, Amit Kapoor, Floor Managers (`BODYZONE_ESCALATE_TO`) | `BODYZONE_PASSWORD` |
| Spa Kora | built in (`1i15JFAu…`) | Amit Kumar, Deepmala (`SPAKORA_ESCALATE_TO`) | `SPAKORA_PASSWORD` |

Each sheet gets its own `FB Tickets` and `FB Settings` tabs. Ticket numbers: `BIPS-FB-…`, `BZ-FB-…`, `SK-FB-…`.
The Principal rule (complaints about Indu Sharma Ma'am go only to `CONFIDENTIAL_ESCALATE_TO`) applies to BIPS only.
Bodyzone / Spa Kora variables can also be named `BODYZONE_CC`, `BODYZONE_ESCALATE_TO_NAMES`, `BODYZONE_RESOLVER_NAMES` (same for `SPAKORA_`).
In `apps-script/FormTrigger.gs` set `COMPANY = 'bips' | 'bodyzone' | 'spakora'` for each sheet.

## How it works
```
Google Form ──► Google Sheet "Form responses 1"
                    │  (Apps Script trigger – instant)
                    ▼
            Vercel  /api/sync  ──► ticket in "FB Tickets" tab
                                  ──► escalation email (Principal Indu Sharma Ma'am, Poonam Gulati Ma'am)
Email button ──► /resolve.html ──► resolution saved ──► alert email to MIS
Dashboard (/) ──► Send on WhatsApp (message contains parent link)
Parent link ──► /confirm.html ──► Satisfied (closure email) / Not Satisfied + remarks (re-escalation email)
Hourly (Apps Script) + daily 9 AM (Vercel cron) ──► overdue reminder emails
```
The Google Sheet is the database. The dashboard reads it live (auto-refresh every 60 seconds).

## Folder
| Path | What |
|---|---|
| `public/index.html` | Dashboard |
| `public/resolve.html` | Resolution form opened from the email (Indu Sharma Ma'am / Poonam Gulati Ma'am) |
| `public/confirm.html` | Parent's Satisfied / Not Satisfied form (link in the WhatsApp message) |
| `api/*.js` | Serverless API (data, action, resolve, sync, cron, health) |
| `lib/*.js` | Logic, Google Sheets access, email templates |
| `apps-script/FormTrigger.gs` | Paste into the Google Sheet's Apps Script (real-time trigger) |
| `.env.example` | List of Environment Variables to add in Vercel |

## Environment variables (Vercel → Settings → Environment Variables)
| Name | Example |
|---|---|
| `SHEET_ID` | `1CythY7lD6i0UqX8MEsSQkQgTV5F3cLtIk3jq2t3ocH8` |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `sales-report-reader@bodyzone-reports.iam.gserviceaccount.com` |
| `GOOGLE_PRIVATE_KEY` | the `private_key` value from the service-account JSON file |
| `GMAIL_USER` | `mis.gcs1@gmail.com` |
| `GMAIL_APP_PASSWORD` | 16-letter Gmail App Password |
| `ESCALATE_TO` | `indu@...,poonam@...` |
| `CC` | optional (Principal Indu Sharma Ma'am is already in ESCALATE_TO) |
| `MIS_EMAIL` | `mis.gcs1@gmail.com` |
| `CONFIDENTIAL_ESCALATE_TO` | who gets complaints that mention the Principal (Indu Sharma Ma'am) (default: MIS_EMAIL). These are never sent to the Principal or Poonam Gulati Ma'am. |
| `DASHBOARD_PASSWORD` | your dashboard password |
| `SYNC_SECRET` | any long random text (same value goes in FormTrigger.gs) |
| `CRON_SECRET` | any long random text |

Optional – automatic WhatsApp (Meta Cloud API): `WA_TOKEN`, `WA_PHONE_NUMBER_ID`, `WA_LANG` (default `en`). Template names: `bips_resolution`, `bips_ticket_closed`, `bips_reescalated` (see guide Part D). Without these the dashboard uses the manual Send on WhatsApp button.

Optional: `RESPONSE_SHEET` (default `Form responses 1`), `ESCALATE_IF_OVERALL_AT_OR_BELOW` (4), `RESOLUTION_HOURS` (24), `PARENT_REPLY_HOURS` (24), `APP_URL`.

Check setup any time: `https://YOUR-APP.vercel.app/api/health?c=bips&key=PASSWORD` (use `c=bodyzone` / `c=spakora` with that company's password)

See **BIPS_Feedback_Vercel_Setup_Guide.pdf** for step-by-step instructions.
