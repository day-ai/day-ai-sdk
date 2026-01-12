import { NextRequest, NextResponse } from 'next/server'
import { getDayAIClient } from '@/lib/dayai'
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

    // Initialize Day AI client and MCP
    const client = getDayAIClient()
    await client.mcpInitialize()
    console.log('[Manual Sync] Day AI MCP initialized')

    // Format email content
    const emailBody = formatWeatherEmail(weather)

    // Send notification via Day AI
    const result = await client.mcpCallTool('send_notification', {
      channel: 'email',
      emailSubject: `${weather.emoji} Manual Weather Update - ${weather.location}`,
      emailBody,
      reasoning: 'Manual weather update triggered from dashboard',
    })

    console.log('[Manual Sync] Notification sent successfully', result)

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
