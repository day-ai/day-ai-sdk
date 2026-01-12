import { IconUser, IconSparkles, IconTool, IconCheck, IconX } from '@tabler/icons-react'
import type { ChatMessage } from '../types'

interface MessageBubbleProps {
  message: ChatMessage
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const isThinking = message.isThinking
  const isStreaming = message.isStreaming

  // Format tool name for display
  const formatToolName = (name: string) => {
    // Handle MCP tools (mcp__server__toolname)
    if (name.startsWith('mcp__')) {
      const parts = name.slice(5).split('__')
      if (parts.length >= 2) {
        return `${parts[0]}: ${parts.slice(1).join('__')}`
      }
    }
    return name.replace(/_/g, ' ')
  }

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? 'bg-primary-500/20' : 'bg-white/10'
        }`}
      >
        {isUser ? (
          <IconUser size={16} className="text-primary-400" />
        ) : (
          <IconSparkles size={16} className="text-white/60" />
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 min-w-0 ${isUser ? 'text-right' : ''}`}>
        <div
          className={`inline-block max-w-full rounded-2xl px-4 py-2.5 ${
            isUser
              ? 'bg-primary-500/20 text-white'
              : 'bg-white/5 text-white/90'
          }`}
        >
          {isThinking ? (
            <div className="flex items-center gap-2 text-white/50">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-sm">Thinking...</span>
            </div>
          ) : (
            <>
              {/* Main content */}
              <div className="text-sm whitespace-pre-wrap break-words">
                {message.content}
                {isStreaming && (
                  <span className="inline-block w-2 h-4 ml-0.5 bg-white/50 animate-pulse" />
                )}
              </div>

              {/* Tool call indicator */}
              {message.toolCall && (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <div className="flex items-center gap-2 text-xs text-white/50">
                    <IconTool size={14} />
                    <span>Using tool: {formatToolName(message.toolCall.name)}</span>
                  </div>
                  {message.toolResult && (
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      {message.toolResult.success ? (
                        <>
                          <IconCheck size={14} className="text-green-400" />
                          <span className="text-green-400">Success</span>
                        </>
                      ) : (
                        <>
                          <IconX size={14} className="text-red-400" />
                          <span className="text-red-400">
                            {message.toolResult.error || 'Failed'}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Timestamp */}
        {!isThinking && !isStreaming && (
          <div className="mt-1 text-xs text-white/30">
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        )}
      </div>
    </div>
  )
}
