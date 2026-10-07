import { NextRequest, NextResponse } from 'next/server'
import { sendNotification } from '@/lib/dayai'
import { getWeather, formatWeatherEmail } from '@/lib/weather'

// Use Node.js runtime for better SDK compatibility
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const location = process.env.LOCATION || 'San Francisco, CA'

    console.log(`[Manual Sync] Starting weather fetch for ${location}`)

    // Fetch weather data
    const weather = await getWeather(location)
    console.log(`[Manual Sync] Weather fetched: ${weather.temp}°F, ${weather.conditions}`)

    // Format email content
    const emailBody = formatWeatherEmail(weather)

    // Email the authorized Day AI user (throws if the tool fails)
    const result = await sendNotification({
      channel: 'email',
      emailSubject: `${weather.emoji} Manual Weather Update - ${weather.location}`,
      emailBody,
      reasoning: 'Manual weather update triggered from dashboard',
    })

    console.log('[Manual Sync] Notification sent', result)

    return NextResponse.json({
      success: true,
      data: {
        weather,
        notification: result,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('[Manual Sync] Error:', error)
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
