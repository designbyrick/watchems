# Watchems Monitoring & Cron Jobs

## Overview
This document describes the monitoring infrastructure for Watchems, including cron jobs that run periodically to collect performance and SEO metrics.

**Migration Date:** 2026-03-25  
**Previous System:** Windows Task Scheduler (deprecated)  
**Current System:** Vercel Cron Jobs (serverless)

---

## Architecture

### Before (Windows Task Scheduler)
- Ran on local Windows machine
- Scheduled tasks: `setup-cwv-cron.ps1`, `cwv-monitoring.ps1`
- Stored metrics in local filesystem logs
- Required manual machine uptime

### After (Vercel Cron Jobs)
- Runs on Vercel infrastructure (serverless)
- Configured via `vercel.json`
- API endpoints trigger monitoring functions
- Metrics stored in Upstash Redis (scalable, persistent)
- Zero infrastructure maintenance

---

## Cron Jobs

### 1. Core Web Vitals Monitor

**Endpoint:** `/api/cron/core-web-vitals`

**Schedule:** Daily at 02:00 UTC (1:00 PM PDT / 2:00 PM EDT)

**Cron Expression:** `0 2 * * *`

**What it does:**
- Fetches Core Web Vitals from Google PageSpeed Insights API
- Reads CrUX **field data** (p75 of real Chrome users, last 28 days) from `loadingExperience`, falling back to `originLoadingExperience` when the URL has too little traffic. Lab data (`lighthouseResult`) is not used.
- Collects metrics for `https://watchems.com`:
  - **LCP** (Largest Contentful Paint): target < 2.5s
  - **INP** (Interaction to Next Paint): target < 0.2s (200ms) — replaced FID as a Core Web Vital in March 2024
  - **CLS** (Cumulative Layout Shift): target < 0.1 (unitless)
- Checks thresholds and generates alerts if any metric exceeds target
- Returns JSON response with metrics and alert status

**Data Collected:**
```json
{
  "timestamp": "2026-03-25T02:00:00.000Z",
  "source": "url",
  "metrics": {
    "lcp": 2.1,
    "inp": 0.15,
    "cls": 0.08
  },
  "alerts": null,
  "status": "healthy"
}
```

**Alert Example (if threshold exceeded):**
```json
{
  "timestamp": "2026-03-25T02:00:00.000Z",
  "source": "url",
  "metrics": {
    "lcp": 3.2,
    "inp": 0.15,
    "cls": 0.08
  },
  "alerts": [
    {
      "level": "warning",
      "metric": "LCP",
      "value": "3.20",
      "unit": "s",
      "threshold": 2.5,
      "message": "LCP exceeds threshold: 3.20s > 2.5s"
    }
  ],
  "status": "degraded"
}
```

`status` is `no-data` when CrUX has no field data for the URL or origin.

**Response Codes:**
- `200 OK` - Metrics fetched and processed successfully
- `401 Unauthorized` - Invalid or missing cron secret
- `500 Internal Server Error` - API error or service failure

---

### Image Health Check (R2 + image optimizer)

**Endpoint:** `/api/cron/image-health`

**Why:** on 2026-10-29 the Cloudflare R2 subscription was silently removed. Every r2.dev photo URL returned 403, `/_next/image` returned 502, and nobody noticed until visitors saw only alt text.

**What it does:**
- Loads the newest approved photo from the `photos` table
- HEAD-requests its R2 URL and GET-requests `https://watchems.com/_next/image?url=…&w=640&q=75`
- On any non-200, emails `IMAGE_HEALTH_ALERT_EMAIL` (default gusman.design4@gmail.com) via Resend
- Alerts once when a failure streak starts, a reminder every 6h while it continues, and once on recovery (state in Upstash Redis key `image-health:state`; production has no Upstash yet, so it falls back to at most ~2 alerts per hour)
- Returns `200` when healthy, `503` when failing, `401` without a valid secret

**Schedule:** the Vercel project is on the **Hobby** plan, which only allows daily crons. So:
- `vercel.json` runs it daily at 09:00 UTC (backup)
- GitHub Actions (`.github/workflows/image-health.yml`) calls it **every 15 minutes** with `Authorization: Bearer <CRON_SECRET>` — this is what gives early warning. The repo is public, so Actions minutes are free. GitHub schedules can drift by several minutes.
- On a Pro plan, change the `vercel.json` schedule to `*/15 * * * *` and delete the workflow

**Secrets:** `CRON_SECRET` must be set both in Vercel (Production) and as a GitHub repository secret. **Env vars (Vercel):** `CRON_SECRET` (Vercel Cron sends it automatically), `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, optional `IMAGE_HEALTH_ALERT_EMAIL`.

---

### 2. Google Search Console Metrics

**Endpoint:** `/api/cron/gsc-metrics`

**Schedule:** Weekly on Mondays at 03:00 UTC (7:00 PM PDT Sunday / 8:00 PM EDT Sunday)

**Cron Expression:** `0 3 * * 1`

**What it does:**
- Fetches ranking and traffic metrics from Google Search Console
- Requires service account credentials (see setup below)
- Collects last 90 days of data:
  - Total clicks
  - Total impressions
  - Average position
  - Average CTR
  - Top 20 keywords with individual metrics
- Stores results in Upstash Redis

**Data Collected:**
```json
{
  "timestamp": "2026-03-24T03:00:00.000Z",
  "totalClicks": 1547,
  "totalImpressions": 28394,
  "averagePosition": 8.5,
  "averageCTR": 5.44,
  "topQueries": [
    {
      "query": "watch comparison",
      "clicks": 245,
      "impressions": 3821,
      "position": 3.2,
      "ctr": 6.41
    },
    {
      "query": "luxury watch review",
      "clicks": 189,
      "impressions": 2945,
      "position": 5.1,
      "ctr": 6.42
    }
  ]
}
```

**Response Codes:**
- `200 OK` - Metrics fetched and stored successfully
- `202 Skipped` - Service account not configured (non-fatal)
- `401 Unauthorized` - Invalid or missing cron secret
- `500 Internal Server Error` - Authentication or API error

---

## Configuration

### Vercel Configuration (`vercel.json`)

```json
{
  "crons": [
    {
      "path": "/api/cron/core-web-vitals",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/gsc-metrics",
      "schedule": "0 3 * * 1"
    }
  ]
}
```

**Cron Schedule Syntax:**
- Format: `<minute> <hour> <day> <month> <weekday>`
- `0 2 * * *` = 02:00 UTC every day
- `0 3 * * 1` = 03:00 UTC every Monday (weekday 1)

---

### Environment Variables

#### Required for Cron Security
- **`CRON_SECRET`** (required in production)
  - Set in Vercel Dashboard → Project Settings → Environment Variables (Production)
  - Vercel automatically sends `Authorization: Bearer <CRON_SECRET>` on every cron invocation when this variable exists — the name must be exactly `CRON_SECRET`
  - Routes compare the header in constant time; without the variable they return `401` outside `NODE_ENV=development`
  - Generate with `openssl rand -hex 32`
  - `VERCEL_CRON_SECRET` is still read as a legacy fallback, but Vercel does not send it — use `CRON_SECRET`

#### Optional for Core Web Vitals Monitor
- **`PAGESPEED_API_KEY`** (recommended)
  - Google Cloud API key with the PageSpeed Insights API enabled
  - Without it, requests use the shared anonymous quota and frequently fail with `429`

#### Required for Google Search Console Metrics
- **`GOOGLE_SERVICE_ACCOUNT_JSON`** (optional, skipped if not set)
  - Google Cloud service account JSON credentials
  - Can be passed as:
    - Raw JSON string: `{"type": "service_account", ...}`
    - Base64-encoded JSON: `eyJ0eXBlIjogInNlcnZpY2VfYWNjb3VudCIsIC4uLn0=`
  - Set in Vercel Dashboard → Project Settings → Environment Variables

**To obtain Google Service Account credentials:**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a service account with "Search Console API" access
3. Generate a JSON key file
4. Download and store securely (do NOT commit to git)
5. Paste the JSON content (or base64 version) as `GOOGLE_SERVICE_ACCOUNT_JSON`

---

## Data Storage

### Core Web Vitals
- **Current:** Returned directly in API response
- **Future:** Can be extended to store in Redis for historical analysis

### Google Search Console
- **Storage:** Upstash Redis (if credentials configured)
- **Keys:**
  - `gsc:metrics:latest` - Most recent metrics snapshot
  - `gsc:metrics:{timestamp}` - Historical entries with 90-day TTL
- **Retention:** 90 days (auto-cleanup)

---

## Monitoring & Alerts

### Manual Testing

Both routes require the auth header in production:

```bash
CRON_SECRET=<value> npm run monitor:cwv
CRON_SECRET=<value> npm run monitor:gsc
```

or directly:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://watchems.com/api/cron/core-web-vitals
```

### Vercel Dashboard
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select Watchems project
3. Navigate to "Crons" tab
4. View execution history, logs, and next scheduled runs

### Integration with Monitoring Tools
Future integrations:
- Email alerts on Core Web Vitals degradation
- Slack notifications for critical GSC drops
- Grafana dashboard for metric trends

---

## Removed Legacy Scripts

The following Windows Task Scheduler scripts have been deprecated and removed:
- ~~`scripts/setup-cwv-cron.ps1`~~ (scheduled task setup)
- ~~`scripts/cwv-monitoring.ps1`~~ (legacy monitoring script)
- ~~`scripts/setup-cwv-cron.bat`~~ (batch scheduler)

**Why:** Vercel's serverless cron jobs are:
- More reliable (no machine uptime required)
- Cheaper (no dedicated infrastructure)
- Easier to debug (integrated logs in dashboard)
- Scalable (automatic retry & error handling)

---

## Troubleshooting

### Core Web Vitals returning null values
- **Cause:** PageSpeed Insights API rate limiting (set `PAGESPEED_API_KEY`) or no CrUX field data (`status: "no-data"`)
- **Solution:** Add an API key; CrUX needs enough real Chrome traffic on the URL/origin

### GSC Metrics showing "GOOGLE_SERVICE_ACCOUNT_JSON not configured"
- **Cause:** Environment variable not set in Vercel
- **Solution:** Add the service account JSON to Vercel → Project Settings → Environment Variables

### Cron job not executing at scheduled time
- **Cause:** Vercel free tier may have delayed execution
- **Solution:** Check Vercel Crons dashboard for execution history; upgrade if needed

### "Unauthorized" error on manual testing
- **Cause:** Missing or incorrect `Authorization` header
- **Solution:** Ensure `CRON_SECRET` is set in Vercel and matches the header value (or run with `NODE_ENV=development` and no secret for local testing)

---

## Next Steps

1. **Deploy to Vercel:**
   ```bash
   git add vercel.json app/api/cron/
   git commit -m "Add Vercel cron jobs for monitoring"
   git push  # Auto-deploys via GitHub integration
   ```

2. **Configure Environment Variables in Vercel:**
   - Add `CRON_SECRET` (required — crons return 401 without it)
   - Add `PAGESPEED_API_KEY` (recommended)
   - Add `GOOGLE_SERVICE_ACCOUNT_JSON` (for GSC metrics)

3. **Verify Cron Execution:**
   - Check Vercel Crons dashboard after first scheduled run
   - Review logs for any errors
   - Monitor Core Web Vitals trend over 1-2 weeks

4. **Set Up Alerts (Future):**
   - Integrate with Slack or email for metric degradation alerts
   - Create dashboard for historical metric visualization

---

## Cron Schedule Reference

| Job | Schedule | Frequency | Next Run (example) |
|-----|----------|-----------|-------------------|
| Core Web Vitals | `0 2 * * *` | Daily at 02:00 UTC | Tomorrow 02:00 UTC |
| GSC Metrics | `0 3 * * 1` | Weekly (Monday) at 03:00 UTC | Next Monday 03:00 UTC |

---

## References

- [Vercel Cron Jobs Documentation](https://vercel.com/docs/cron-jobs)
- [Google PageSpeed Insights API](https://developers.google.com/speed/docs/insights/v5/about)
- [Google Search Console API](https://developers.google.com/webmaster-tools/docs/api)
- [Upstash Redis Documentation](https://upstash.com/docs/redis/overview)
