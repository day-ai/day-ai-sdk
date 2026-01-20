# Vercel Weather Cron Demo

> **Best Way to Get Support**: Run `claude` from the root of this repo to ask questions and get help customizing this app.

A simple Next.js app that demonstrates **Vercel Cron Jobs** + **Day AI MCP integration**. Every day at 9 AM, this app fetches the weather and emails you via Day AI's `send_notification` tool.

This is a **production-ready template** showing how to build automated workflows that leverage Day AI's capabilities.

## What It Does

1. ⏰ **Cron Job**: Runs daily at 9:00 AM (configured in `vercel.json`)
2. 🌤️ **Fetch Weather**: Gets current weather from OpenWeather API
3. 📧 **Send Email**: Uses Day AI's `send_notification` MCP tool to email you

## Why This Pattern Is Powerful

This demonstrates a fundamental automation pattern:

```
External Data Source (Weather API)
          ↓
    Process/Format
          ↓
Day AI MCP Tool (send_notification)
          ↓
    User's Email
```

You can adapt this for:
- **Daily digest emails** (CRM updates, metrics, alerts)
- **Scheduled reports** (weekly pipeline summaries)
- **Monitoring alerts** (system health, data changes)
- **Data enrichment** (sync external data to CRM properties)

## Quick Start

### Prerequisites

1. **Day AI Account** - Sign up at [day.ai](https://day.ai)
2. **OpenWeather API Key** - Get free key at [openweathermap.org](https://openweathermap.org/api)
3. **Vercel Account** - Sign up at [vercel.com](https://vercel.com)

### Setup

#### 1. Get Day AI OAuth Credentials

From the root of the `day-ai-sdk` repo:

```bash
# Install dependencies
yarn install

# Run OAuth setup
yarn oauth:setup
```

This will:
- Register your integration with Day AI
- Open browser for authorization
- Save credentials to `.env`

Copy these values (`CLIENT_ID`, `CLIENT_SECRET`, `REFRESH_TOKEN`) - you'll need them for Vercel.

#### 2. Get OpenWeather API Key

1. Go to [openweathermap.org/api](https://openweathermap.org/api)
2. Sign up for free account
3. Generate API key (free tier is fine)

#### 3. Deploy to Vercel

Click the button below to deploy:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/day-ai/day-ai-sdk/tree/master/examples/vercel-weather-cron)

During deployment, set these environment variables:

```bash
CLIENT_ID=your-client-id          # From Day AI OAuth setup
CLIENT_SECRET=your-client-secret  # From Day AI OAuth setup
REFRESH_TOKEN=your-refresh-token  # From Day AI OAuth setup
DAY_AI_BASE_URL=https://day.ai    # Default Day AI instance

OPENWEATHER_API_KEY=your-api-key  # From OpenWeather

LOCATION=San Francisco, CA        # Your location (City, State or City, Country)

CRON_SECRET=                      # Optional: Generate with `openssl rand -base64 32`
```

#### 4. Test It

After deployment:

1. Visit your Vercel app URL
2. Click **"Send Weather Update Now"**
3. Check your email!

The cron job will automatically run daily at 9:00 AM.

## Local Development

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your credentials
# (Same variables as Vercel deployment)

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and click the manual sync button to test.

## How It Works

### File Structure

```
vercel-weather-cron/
├── app/
│   ├── page.tsx                  # Dashboard UI
│   ├── layout.tsx                # Root layout
│   ├── globals.css               # Tailwind CSS
│   └── api/
│       ├── cron/
│       │   └── weather/route.ts  # Cron job endpoint
│       └── manual-sync/route.ts  # Manual trigger
├── lib/
│   ├── dayai.ts                  # Day AI client setup
│   └── weather.ts                # OpenWeather API
├── vercel.json                   # Cron configuration
└── package.json
```

### The Cron Job

`app/api/cron/weather/route.ts` is the heart of the app:

```typescript
export async function GET(request: NextRequest) {
  // 1. Fetch weather
  const weather = await getWeather(location)

  // 2. Initialize Day AI MCP
  const client = getDayAIClient()
  await client.mcpInitialize()

  // 3. Send notification
  await client.mcpCallTool('send_notification', {
    channel: 'email',
    emailSubject: `${weather.emoji} Daily Weather Update`,
    emailBody: formatWeatherEmail(weather),
    reasoning: 'Daily weather update from Vercel cron job',
  })
}
```

### Cron Schedule

Configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/weather",
      "schedule": "0 9 * * *"
    }
  ]
}
```

This runs at 9:00 AM UTC daily. To change the schedule:
- `0 9 * * *` - 9:00 AM daily
- `0 */6 * * *` - Every 6 hours
- `0 12 * * MON` - Noon every Monday

See [crontab.guru](https://crontab.guru/) for help with cron syntax.

## Customization Ideas

### 1. Different Notifications

Change the `send_notification` call to send Slack messages:

```typescript
await client.mcpCallTool('send_notification', {
  channel: 'slack',
  slackParagraphs: [
    `🌤️ Weather Update for ${weather.location}`,
    `${weather.temp}°F - ${weather.conditions}`,
  ],
  reasoning: 'Weather update via Slack',
})
```

Or both email and Slack:

```typescript
await client.mcpCallTool('send_notification', {
  channel: 'both',
  emailSubject: '...',
  emailBody: '...',
  slackParagraphs: ['...'],
  reasoning: '...',
})
```

### 2. CRM Data Enrichment

Instead of just sending notifications, update CRM records:

```typescript
// Search for organizations
const orgs = await client.mcpCallTool('search_objects', {
  queries: [{ objectType: 'Organization', take: 100 }],
})

// Update each org with weather data
for (const org of orgs.data) {
  if (org.city) {
    const weather = await getWeather(org.city)
    await client.mcpCallTool('create_or_update_person_organization', {
      objectId: org.id,
      objectType: 'Organization',
      customProperties: [{
        propertyId: 'custom_weather',
        value: `${weather.emoji} ${weather.temp}°F`,
      }],
    })
  }
}
```

### 3. Different Data Sources

Replace the weather API with:
- **Stock prices** for public companies
- **News/sentiment** monitoring
- **Social media** follower counts
- **Competitor** website changes
- **Event/conference** schedules

### 4. Daily Digests

Send a summary of CRM activity:

```typescript
// Get today's opportunities
const opps = await client.mcpCallTool('search_objects', {
  queries: [{
    objectType: 'Opportunity',
    where: {
      updatedAt: { dateGt: new Date().toISOString() }
    }
  }]
})

// Format and send
await client.mcpCallTool('send_notification', {
  channel: 'email',
  emailSubject: 'Daily CRM Digest',
  emailBody: formatDigest(opps),
  reasoning: 'Daily digest email',
})
```

## Troubleshooting

### "Missing Day AI credentials"

Make sure you've set `CLIENT_ID`, `CLIENT_SECRET`, and `REFRESH_TOKEN` in Vercel environment variables.

### "Location not found"

Check your `LOCATION` environment variable. Format should be:
- `San Francisco, CA`
- `New York, NY`
- `London, UK`

### "OPENWEATHER_API_KEY is not set"

Get a free API key from [openweathermap.org](https://openweathermap.org/api) and add it to your environment variables.

### Cron not running

- Check Vercel dashboard → Cron Jobs tab for logs
- Cron jobs require a **paid Vercel plan** (Hobby plan includes some crons)
- Use the manual sync button to test without waiting for the schedule

## Questions & Support

### Using Claude (Recommended)

The **best way to get help** customizing this app:

```bash
# From the root of the repo
cd ../../  # if you're in examples/vercel-weather-cron
claude
```

Ask Claude anything:
- "How do I change this to send Slack notifications?"
- "Show me how to sync weather to organization custom properties"
- "Help me add a different data source"
- "How do I change the cron schedule?"

Claude has full context on this codebase and can help you customize, debug, and ship faster.

## Learn More

- [Day AI SDK Documentation](../../README.md)
- [CLAUDE.md](../../CLAUDE.md) - Quick reference for Claude sessions
- [SCHEMA.md](../../SCHEMA.md) - Full Day AI object schemas and MCP tools
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [OpenWeather API Docs](https://openweathermap.org/api)

## License

MIT - See the main Day AI SDK repository for details.
