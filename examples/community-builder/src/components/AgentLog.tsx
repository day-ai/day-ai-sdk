import { useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, Wrench, MessageSquare, Zap, RotateCcw, AlertCircle } from 'lucide-react'
import type { AgentEvent } from '@/types'

interface AgentLogProps {
  events: AgentEvent[]
  onReset: () => void
}

export function AgentLog({ events, onReset }: AgentLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [events])

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Agent Log</CardTitle>
          <CardDescription>Real-time sync progress</CardDescription>
        </div>
        {events.length > 0 && (
          <Button variant="ghost" size="sm" onClick={onReset}>
            <RotateCcw className="mr-1 h-3 w-3" />
            Clear
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <ScrollArea ref={scrollRef} className="h-[600px] pr-4">
          {events.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Join the community to see the agent in action
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event, i) => (
                <EventItem key={i} event={event} />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

function EventItem({ event }: { event: AgentEvent }) {
  switch (event.type) {
    case 'status':
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Zap className="h-3.5 w-3.5 text-yellow-500" />
          {event.message}
        </div>
      )
    case 'tool_call':
      return (
        <div className="rounded-md border border-border bg-zinc-900/50 p-3">
          <div className="flex items-center gap-2">
            <Wrench className="h-3.5 w-3.5 text-blue-400" />
            <Badge variant="secondary" className="font-mono text-xs">
              {event.name}
            </Badge>
          </div>
          <pre className="mt-2 max-h-32 overflow-auto text-xs text-muted-foreground">
            {JSON.stringify(event.args, null, 2)}
          </pre>
        </div>
      )
    case 'tool_result':
      return (
        <div className="flex items-center gap-2 text-sm">
          {event.success ? (
            <CheckCircle className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <XCircle className="h-3.5 w-3.5 text-red-500" />
          )}
          <span className="font-mono text-xs text-muted-foreground">{event.name}</span>
          <span className={event.success ? 'text-green-400' : 'text-red-400'}>
            {event.success ? 'success' : 'failed'}
          </span>
        </div>
      )
    case 'text_delta':
      return (
        <div className="text-sm text-zinc-300">
          <MessageSquare className="mb-0.5 mr-1 inline h-3.5 w-3.5 text-zinc-500" />
          {event.content}
        </div>
      )
    case 'answer':
      return (
        <div className="rounded-md border border-zinc-700 bg-zinc-800/50 p-3 text-sm text-zinc-200">
          <MessageSquare className="mb-0.5 mr-1 inline h-3.5 w-3.5 text-zinc-400" />
          {event.content}
        </div>
      )
    case 'complete':
      return (
        <div className="flex items-center gap-2 text-sm font-medium text-green-400">
          <CheckCircle className="h-3.5 w-3.5" />
          {event.message}
        </div>
      )
    case 'error':
      return (
        <div className="flex items-center gap-2 text-sm text-red-400">
          <AlertCircle className="h-3.5 w-3.5" />
          {event.message}
        </div>
      )
  }
}
