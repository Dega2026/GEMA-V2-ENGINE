# GEMA-V2 Deployment Guide (Hostinger)

## 1) App Setup
1. Upload the project to your Hostinger Node.js app directory.
2. Set startup command to: `npm start`
3. Install dependencies from panel terminal: `npm install`

## 2) Required Environment Variables
Add these in Hostinger Node.js environment manager:

- `NODE_ENV=production`
- `PORT=5000` (or the port provided by Hostinger)
- `MONGO_URI=...`
- `JWT_SECRET=...`
- `REFRESH_TOKEN_SECRET=...`
- `AUDIT_LOG_SIGNING_KEY=...`
- `CORS_ALLOWED_ORIGINS=https://your-domain.com`

## 3) AI + SMTP Variables
For full AI and email behavior:

- `AI_API_KEY=...`
- `AI_MODEL=gpt-4.1-mini` (optional)
- `AI_API_BASE_URL=https://api.openai.com/v1` (optional)

- `SMTP_HOST=...`
- `SMTP_PORT=587`
- `SMTP_SECURE=false`
- `SMTP_USER=...`
- `SMTP_PASS=...`
- `SMTP_FROM=GEMA Reports <no-reply@yourdomain.com>`

If AI or SMTP keys are missing, the app still runs in safe placeholder mode.

## 4) Daily AI Report (11:00 PM)
The production start command enables the daily report scheduler automatically.

Optional variables:
- `DAILY_REPORT_TO=ops@yourdomain.com,ceo@yourdomain.com`
- `DAILY_REPORT_LANG=en`
- `ENABLE_DAILY_AI_REPORT=true`

## 5) Pre-Launch Check
Run before go-live:

```bash
npm run deploy:check
```

## 6) Quick Validation After Deploy
1. Open `/products` and test sidebar filters.
2. Open `/pharmacy/<slug>` and verify products render.
3. Login to `/admin` and verify floating `GEMA Assistant` appears.
4. Trigger a manual report test:

```bash
npm run ai:report:once
```
