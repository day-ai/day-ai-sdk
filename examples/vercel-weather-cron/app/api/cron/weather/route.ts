import { NextRequest, NextResponse } from 'next/server'
import { getDayAIClient } from '@/lib/dayai'
import { getWeather, formatWeatherEmail } from '@/lib/weather'

// Use Node.js runtime for better SDK compatibility
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    // Optional: Verify cron secret for security
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret) {
      const authHeader = request.headers.get('authorization')
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    // Get location from environment
    const location = process.env.LOCATION || 'San Francisco, CA'

    console.log(`[Weather Cron] Starting weather fetch for ${location}`)

    // Fetch weather data
    const weather = await getWeather(location)
    console.log(`[Weather Cron] Weather fetched: ${weather.temp}°F, ${weather.conditions}`)

    // Initialize Day AI client and MCP
    const client = getDayAIClient()
    await client.mcpInitialize()
    console.log('[Weather Cron] Day AI MCP initialized')

    // Format email content
    const emailBody = formatWeatherEmail(weather)

    // Send notification via Day AI
    const result = await client.mcpCallTool('send_notification', {
      channel: 'email',
      emailSubject: `${weather.emoji} Daily Weather Update - ${weather.location}`,
      emailBody,
      reasoning: 'Daily weather update from Vercel cron job',
    })

    console.log('[Weather Cron] Notification sent successfully', result)

    return NextResponse.json({
      success: true,
      data: {
        weather,
        notification: result,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('[Weather Cron] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
