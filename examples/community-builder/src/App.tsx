import { useCallback, useState } from 'react'
import { CommunityForm } from '@/components/CommunityForm'
import { AgentLog } from '@/components/AgentLog'
import type { AgentEvent, CommunityMember } from '@/types'

export default function App() {
  const [events, setEvents] = useState<AgentEvent[]>([])
  const [isRunning, setIsRunning] = useState(false)

  const handleSync = useCallback(async (member: CommunityMember) => {
    setIsRunning(true)
    setEvents([])

    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(member),
      })

      if (!response.ok || !response.body) {
        setEvents((prev) => [
          ...prev,
          { type: 'error', message: `Server error: ${response.status} ${response.statusText}` },
        ])
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6)) as AgentEvent
              setEvents((prev) => [...prev, event])
            } catch {
              // skip malformed lines
            }
          }
        }
      }
    } catch (err) {
      setEvents((prev) => [
        ...prev,
        { type: 'error', message: err instanceof Error ? err.message : 'Unknown error' },
      ])
    } finally {
      setIsRunning(false)
    }
  }, [])

  const handleReset = useCallback(() => {
    setEvents([])
  }, [])

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Join the Community</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tell us what you need and how you can help — our AI agent will add you to the community directory
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <CommunityForm onSubmit={handleSync} isRunning={isRunning} />
        <AgentLog events={events} onReset={handleReset} />
      </div>
    </div>
  )
}
