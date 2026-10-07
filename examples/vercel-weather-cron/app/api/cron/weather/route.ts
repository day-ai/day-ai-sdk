import { NextRequest, NextResponse } from 'next/server'
import { sendNotification } from '@/lib/dayai'
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

    // Format email content
    const emailBody = formatWeatherEmail(weather)

    // Email the authorized Day AI user (throws if the tool fails)
    const result = await sendNotification({
      channel: 'email',
      emailSubject: `${weather.emoji} Daily Weather Update - ${weather.location}`,
      emailBody,
      reasoning: 'Daily weather update from Vercel cron job',
    })

    console.log('[Weather Cron] Notification sent', result)

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
