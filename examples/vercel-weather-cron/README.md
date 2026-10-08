# Vercel Weather Cron

A Next.js app that runs on a schedule with **Vercel Cron Jobs**. Every day at 9:00 AM UTC it fetches the weather and emails it to you through Day AI.

Swap the weather call for any data source to build daily digests, scheduled reports, alerts or data syncs.

```
Vercel Cron → /api/cron/weather → OpenWeather → Day AI send_notification_mcp → your inbox
```

> **Plan note:** the email goes through Day AI's `send_notification_mcp` tool, which is only included in some Day AI plans. If your assistant doesn't have it, the route fails with a message saying so. Check `client.mcpListTools()`, or swap in another tool (for example, `create_or_update_action` to create a task).

## Setup

### 1. Day AI credentials

From the repo root:

```bash
yarn install && yarn build
cp .env.example .env     # set INTEGRATION_NAME
yarn oauth:setup
```

Copy `CLIENT_ID`, `CLIENT_SECRET` and `REFRESH_TOKEN` from the root `.env`.

### 2. OpenWeather API key

Sign up at [openweathermap.org/api](https://openweathermap.org/api); the free tier is enough.

### 3. Run locally

```bash
cd examples/vercel-weather-cron
npm install
cp .env.example .env     # fill in the variables below
npm run dev
```

Open http://localhost:3000 and click **Send Weather Update Now** to test without waiting for the schedule.

| Variable | Value |
|---|---|
| `CLIENT_ID`, `CLIENT_SECRET`, `REFRESH_TOKEN` | Day AI credentials from step 1 |
| `DAY_AI_BASE_URL` | Optional, defaults to `https://day.ai` |
| `OPENWEATHER_API_KEY` | From step 2 |
| `LOCATION` | e.g. `San Francisco, CA` |
| `CRON_SECRET` | Recommended in production: `openssl rand -base64 32` |

### 4. Deploy

Deploy to Vercel (`vercel` from this directory, or import the repo with this folder as the root) and set the same variables in the project settings. Store the Day AI credentials as encrypted environment variables. They grant access to your CRM.

## How it works

| File | Role |
|---|---|
| `vercel.json` | Cron schedule (`0 9 * * *`) |
| `app/api/cron/weather/route.ts` | Scheduled endpoint. Checks `CRON_SECRET`, fetches weather, sends the email |
| `app/api/manual-sync/route.ts` | Same flow, triggered from the dashboard |
| `lib/dayai.ts` | Creates the `DayAIClient` and wraps `sendNotification()` |
| `lib/weather.ts` | OpenWeather call and email formatting |

The core of the cron route:

```typescript
const weather = await getWeather(location)

await sendNotification({
  channel: 'email',
  emailSubject: `${weather.emoji} Daily Weather Update - ${weather.location}`,
  emailBody: formatWeatherEmail(weather),
  reasoning: 'Daily weather update from Vercel cron job',
})
```

`sendNotification()` calls `send_notification_mcp` and throws if the tool returns an error.

## Customizing

**Slack instead of email:**

```typescript
await sendNotification({
  channel: 'slack', // or 'both'
  slackParagraphs: [`*Weather for ${weather.location}*\n${weather.temp}°F, ${weather.conditions}`],
  reasoning: 'Weather update via Slack',
})
```

Slack requires the Day AI Slack integration. Add `slackChannelId` to post to a channel instead of a DM.

**A daily CRM digest:** query Day AI instead of OpenWeather.

```typescript
const client = getDayAIClient()
const today = new Date().toISOString().slice(0, 10)

const opps = await client.search('native_opportunity', undefined, {
  timeframeField: 'updatedAt',
  timeframeStart: today,
  propertiesToReturn: ['title', 'stageId', 'ownerEmail'],
})

await sendNotification({
  channel: 'email',
  emailSubject: 'Opportunities updated today',
  emailBody: `<ul>${opps.native_opportunity.results.map((o: any) => `<li>${o.title}</li>`).join('')}</ul>`,
  reasoning: 'Daily opportunity digest',
})
```

**Write data back to the CRM:** look records up with `search_objects`, then update them with `create_or_update_person_organization` (`objectType: 'native_organization'`), passing the `objectId` the search returned. Custom property IDs are UUIDs from `read_crm_schema`. See [SCHEMA.md](../../SCHEMA.md) and [TOOLS.md](../../TOOLS.md).

**Let Claude do the work:** for scheduled jobs that need judgment, such as "summarize what changed in my pipeline and flag risks", run a Claude agent from the cron route using the Agent SDK pattern in the [root README](../../README.md#2-build-an-agent), instead of hand-writing each call.

**Schedule:** edit `vercel.json`. For example, `0 */6 * * *` runs every 6 hours and `0 12 * * MON` runs at noon on Mondays (UTC). Vercel's plan limits apply to how often crons can run.

## Troubleshooting

| Problem | Fix |
|---|---|
| `Missing Day AI credentials` | Set `CLIENT_ID`, `CLIENT_SECRET`, `REFRESH_TOKEN` |
| `send_notification_mcp isn't available…` | Your Day AI assistant's plan doesn't include it. See the plan note above |
| `OPENWEATHER_API_KEY is not set` / `Location not found` | Check the key and use `City, State` or `City, Country` |
| Cron didn't run | Check the Cron Jobs tab in Vercel. Test with the manual button first |
