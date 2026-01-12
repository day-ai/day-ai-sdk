'use client'

import { useState } from 'react'

export default function Home() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleManualSync = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/manual-sync', { method: 'POST' })
      const data = await response.json()

      if (data.success) {
        setResult(data.data)
      } else {
        setError(data.error || 'Unknown error')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            ☀️ Weather Cron Demo
          </h1>
          <p className="text-white/60">
            Automated daily weather updates via Day AI
          </p>
        </div>

        {/* Info Card */}
        <div className="glass-panel rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">How It Works</h2>
          <div className="space-y-3 text-white/80">
            <div className="flex gap-3">
              <span className="text-2xl">⏰</span>
              <div>
                <strong className="text-white">Cron Job:</strong> Runs daily at 9:00 AM
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-2xl">🌤️</span>
              <div>
                <strong className="text-white">Fetch Weather:</strong> Gets current weather from OpenWeather API
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-2xl">📧</span>
              <div>
                <strong className="text-white">Send Email:</strong> Uses Day AI's <code className="bg-white/10 px-2 py-1 rounded text-sm">send_notification</code> tool
              </div>
            </div>
          </div>
        </div>

        {/* Manual Trigger */}
        <div className="glass-panel rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Test It Now</h2>
          <p className="text-white/80 mb-4">
            Don't want to wait for the cron? Trigger a manual weather update right now.
          </p>
          <button
            onClick={handleManualSync}
            disabled={loading}
            className="w-full glass-button text-white font-medium py-3 px-6 rounded-xl"
          >
            {loading ? '⏳ Sending...' : '📧 Send Weather Update Now'}
          </button>
        </div>

        {/* Result Display */}
        {result && (
          <div className="glass-elevated rounded-2xl p-6 mb-6 border-green-500/30">
            <h3 className="text-lg font-semibold text-green-400 mb-3">
              ✅ Weather Update Sent!
            </h3>
            <div className="space-y-2 text-white/90">
              <div className="flex items-center gap-2">
                <span className="text-3xl">{result.weather.emoji}</span>
                <div>
                  <div className="font-bold text-2xl text-white">{result.weather.temp}°F</div>
                  <div className="text-sm text-white/60">{result.weather.location}</div>
                </div>
              </div>
              <div className="text-sm">
                <strong className="text-white">Conditions:</strong> {result.weather.conditions} ({result.weather.description})
              </div>
              <div className="text-sm">
                <strong className="text-white">Humidity:</strong> {result.weather.humidity}% | <strong className="text-white">Wind:</strong> {result.weather.windSpeed} mph
              </div>
              <div className="text-xs text-green-400/80 mt-3 pt-3 border-t border-white/10">
                Check your email! The notification was sent via Day AI.
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="glass-elevated rounded-2xl p-6 mb-6 border-red-500/30">
            <h3 className="text-lg font-semibold text-red-400 mb-2">
              ❌ Error
            </h3>
            <p className="text-white/90 text-sm">{error}</p>
          </div>
        )}

        {/* Configuration Info */}
        <div className="glass-panel rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Configuration</h2>
          <div className="space-y-3 text-sm text-white/80">
            <div>
              <strong className="text-white">Location:</strong>{' '}
              <code className="bg-white/10 px-2 py-1 rounded">
                {process.env.NEXT_PUBLIC_LOCATION || 'San Francisco, CA'}
              </code>
            </div>
            <div>
              <strong className="text-white">Schedule:</strong> Daily at 9:00 AM (configured in vercel.json)
            </div>
            <div className="pt-3 border-t border-white/10">
              <p className="text-xs text-white/60">
                To change the location or schedule, update your environment variables in Vercel and redeploy.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-white/40">
          <p>
            Powered by{' '}
            <a
              href="https://day.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/80 hover:text-white font-medium transition-colors"
            >
              Day AI
            </a>
            {' '}&{' '}
            <a
              href="https://openweathermap.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/80 hover:text-white font-medium transition-colors"
            >
              OpenWeather
            </a>
          </p>
        </div>
      </div>
    </main>
  )
}
