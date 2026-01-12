import { DayAIClient } from '../../../src/index'

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
