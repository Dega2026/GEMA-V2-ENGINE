# GEMA V2 Engine

## SMTP Setup For Real Report Emails

The admin report center now sends real emails through SMTP.
Add the following variables to your `.env` file:

```env
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=notifications@your-domain.com
SMTP_PASS=your_smtp_password
SMTP_FROM="GEMA Reports <notifications@your-domain.com>"
```

Notes:
- Use `SMTP_SECURE=true` with port `465` for SSL providers.
- If SMTP is not configured, `/api/reports/send` returns `502` with a clear reason.
- Report sending is available from all admin sections via the `Send Report` button.

## Operations Value Core (Phase 2-4)

The admin `Operations` section now includes:
- Audit log viewer + CSV export (`/api/audit`, `/api/audit/export.csv`).
- Follow-up automation workflows (`/api/automation/follow-ups`).
- Client portal secure report links (`/api/portal/links`, `/client-portal/:token`).

Optional environment variable:

```env
SITE_BASE_URL=https://your-domain.com
```

If `SITE_BASE_URL` is missing, generated portal links will use the current request host.

