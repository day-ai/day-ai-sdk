import { DayAIClient } from '../../../src/index'
import type { SendNotificationInput } from '../../../src/types'

let client: DayAIClient | null = null

export function getDayAIClient(): DayAIClient {
  if (!client) {
    const { CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN, DAY_AI_BASE_URL } = process.env

    if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
      throw new Error(
        'Missing Day AI credentials. Please set CLIENT_ID, CLIENT_SECRET, and REFRESH_TOKEN in your environment variables.'
      )
    }

    client = new DayAIClient({
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      refreshToken: REFRESH_TOKEN,
      baseUrl: DAY_AI_BASE_URL || 'https://day.ai',
    })
  }

  return client
}

/**
 * Email or Slack the authorized user via Day AI's send_notification_mcp tool.
 * That tool is only included in some Day AI plans, so a tier error gets a
 * clearer message here.
 */
export async function sendNotification(input: SendNotificationInput) {
  try {
    return await getDayAIClient().sendNotification(input)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (/tier|not available|unknown tool|not found/i.test(message)) {
      throw new Error(
        `send_notification_mcp isn't available to the Day AI assistant you authorized (it's only on some plans). Original error: ${message}`
      )
    }
    throw error
  }
}
