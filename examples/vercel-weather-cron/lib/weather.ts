export interface WeatherData {
  temp: number
  feelsLike: number
  conditions: string
  description: string
  humidity: number
  windSpeed: number
  emoji: string
  location: string
}

const WEATHER_EMOJIS: Record<string, string> = {
  Clear: '☀️',
  Clouds: '☁️',
  Rain: '🌧️',
  Drizzle: '🌦️',
  Thunderstorm: '⛈️',
  Snow: '❄️',
  Mist: '🌫️',
  Fog: '🌫️',
  Haze: '🌫️',
}

// Location coordinates mapping (to avoid geocoding API issues)
const LOCATIONS: Record<string, { lat: number; lon: number; display: string }> = {
  'San Francisco, CA': { lat: 37.7749, lon: -122.4194, display: 'San Francisco, CA' },
  'New York, NY': { lat: 40.7128, lon: -74.0060, display: 'New York, NY' },
  'Los Angeles, CA': { lat: 34.0522, lon: -118.2437, display: 'Los Angeles, CA' },
  'Chicago, IL': { lat: 41.8781, lon: -87.6298, display: 'Chicago, IL' },
  'Seattle, WA': { lat: 47.6062, lon: -122.3321, display: 'Seattle, WA' },
}

export async function getWeather(location: string): Promise<WeatherData> {
  const apiKey = process.env.OPENWEATHER_API_KEY

  if (!apiKey) {
    throw new Error('OPENWEATHER_API_KEY is not set')
  }

  // Get coordinates from predefined locations
  const locationData = LOCATIONS[location] || LOCATIONS['San Francisco, CA']
  const { lat, lon, display } = locationData

  // Use current weather API (free tier)
  const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=imperial&appid=${apiKey}`

  const weatherResponse = await fetch(weatherUrl)
  if (!weatherResponse.ok) {
    const errorText = await weatherResponse.text()
    throw new Error(`Weather API failed: ${weatherResponse.status} - ${errorText}`)
  }

  const weatherData: any = await weatherResponse.json()

  const conditions = weatherData.weather[0].main
  const emoji = WEATHER_EMOJIS[conditions] || '🌡️'

  return {
    temp: Math.round(weatherData.main.temp),
    feelsLike: Math.round(weatherData.main.feels_like),
    conditions,
    description: weatherData.weather[0].description,
    humidity: weatherData.main.humidity,
    windSpeed: Math.round(weatherData.wind.speed),
    emoji,
    location: display,
  }
}

export function formatWeatherEmail(weather: WeatherData): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a1a1a; margin-bottom: 24px;">
        ${weather.emoji} Weather Update for ${weather.location}
      </h2>

      <div style="background: #f5f5f5; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 16px;">
          <span style="font-size: 48px;">${weather.emoji}</span>
          <div>
            <div style="font-size: 36px; font-weight: bold; color: #1a1a1a;">${weather.temp}°F</div>
            <div style="color: #666; font-size: 14px;">Feels like ${weather.feelsLike}°F</div>
          </div>
        </div>

        <div style="color: #333; font-size: 18px; text-transform: capitalize; margin-bottom: 16px;">
          ${weather.description}
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; color: #666; font-size: 14px;">
          <div>💧 Humidity: ${weather.humidity}%</div>
          <div>💨 Wind: ${weather.windSpeed} mph</div>
        </div>
      </div>

      <div style="color: #999; font-size: 12px; text-align: center; padding-top: 16px; border-top: 1px solid #e5e5e5;">
        <p>This notification was sent by your Vercel Weather Cron app.</p>
        <p style="margin-top: 8px;">Powered by Day AI</p>
      </div>
    </div>
  `
}
