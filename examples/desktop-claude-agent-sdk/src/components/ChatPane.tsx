import { useState, useEffect, useRef, useCallback } from 'react'
import { IconSend, IconSquare, IconTrash } from '@tabler/icons-react'
import MessageBubble from './MessageBubble'
import type { Note, ChatMessage, AgentIPCMessage, SDKContentBlock } from '../types'

interface ChatPaneProps {
  currentNote: Note | null
  onNoteUpdate?: (noteId: string) => void
  onNotesChanged?: () => void
  configVersion?: number
}

export default function ChatPane({ currentNote, onNoteUpdate, onNotesChanged, configVersion }: ChatPaneProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [streamingThinking, setStreamingThinking] = useState('')
  const [isConfigured, setIsConfigured] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Streaming buffer for performance (50ms delay like traction)
  const streamBufferRef = useRef('')
  const streamTimerRef = useRef<NodeJS.Timeout | null>(null)
  const hasFinalized = useRef(false)

  // Refs to track current streaming state for finalization
  const streamingContentRef = useRef('')
  const streamingThinkingRef = useRef('')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load chat history when note changes
  useEffect(() => {
    if (!currentNote) {
      setMessages([])
      return
    }

    loadChatHistory(currentNote.id)
  }, [currentNote?.id])

  // Check if API key is configured (re-check when configVersion changes)
  useEffect(() => {
    const checkConfig = async () => {
      const config = await window.dayai.getConfig()
      setIsConfigured(!!config.anthropicApiKey)
    }
    checkConfig()
  }, [configVersion])

  // Handle SDK agent messages
  useEffect(() => {
    const unsubscribe = window.dayai.chat.onAgentMessage((msg: AgentIPCMessage) => {
      // Only process messages for this note
      if (msg.noteId && currentNote && msg.noteId !== currentNote.id) {
        return
      }

      switch (msg.type) {
        case 'session-created':
          // Session management handled by backend
          break

        case 'agent-message':
          if (msg.data) {
            const sdkMsg = msg.data

            // Handle assistant messages with content
            if (sdkMsg.type === 'assistant' && sdkMsg.message?.content) {
              for (const block of sdkMsg.message.content) {
                processContentBlock(block)
              }
            }

            // Handle result message (conversation complete)
            if (sdkMsg.type === 'result') {
              flushStreamBuffer()
            }
          }
          break

        case 'agent-complete':
          flushStreamBuffer()
          finalizeAssistantMessage()
          setIsProcessing(false)
          break

        case 'agent-error':
          setError(msg.error || 'Unknown error')
          setIsProcessing(false)
          setStreamingContent('')
          setStreamingThinking('')
          break

        case 'token-budget':
          // Could display token usage in UI
          console.log('Token budget:', msg.tokenBudget)
          break
      }
    })

    return () => unsubscribe()
  }, [currentNote?.id])

  // Subscribe to note update events
  useEffect(() => {
    const unsubNoteUpdated = window.dayai.chat.onNoteUpdated((noteId) => {
      if (currentNote && noteId === currentNote.id) {
        onNoteUpdate?.(noteId)
      }
    })

    const unsubNotesChanged = window.dayai.chat.onNotesChanged(() => {
      onNotesChanged?.()
    })

    return () => {
      unsubNoteUpdated()
      unsubNotesChanged()
    }
  }, [currentNote, onNoteUpdate, onNotesChanged])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  const processContentBlock = (block: SDKContentBlock) => {
    if (block.type === 'text' && block.text) {
      // Buffer text for performance
      streamBufferRef.current += block.text

      if (!streamTimerRef.current) {
        streamTimerRef.current = setTimeout(() => {
          const chunk = streamBufferRef.current
          streamBufferRef.current = ''
          streamTimerRef.current = null
          streamingContentRef.current += chunk
          setStreamingContent(streamingContentRef.current)
        }, 50)
      }
    } else if (block.type === 'thinking' && block.thinking) {
      streamingThinkingRef.current += block.thinking
      setStreamingThinking(streamingThinkingRef.current)
    } else if (block.type === 'tool_use') {
      // Flush any pending streaming content first to maintain order
      flushStreamBuffer()
      if (streamingContentRef.current) {
        const content = streamingContentRef.current
        const thinking = streamingThinkingRef.current
        streamingContentRef.current = ''
        streamingThinkingRef.current = ''
        setStreamingContent('')
        setStreamingThinking('')
        setMessages(prev => [...prev, {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content,
          thinking: thinking || undefined,
          timestamp: Date.now(),
        }])
      }

      // Tool use - SDK handles execution, we just display it
      setMessages(prev => [...prev, {
        id: `tool-${block.id || Date.now()}`,
        role: 'assistant',
        content: '',
        toolCalls: [{
          id: block.id || '',
          name: block.name || '',
          input: block.input || {},
        }],
        timestamp: Date.now(),
      }])
    } else if (block.type === 'tool_result') {
      // Tool result from SDK
      const content = typeof block.content === 'string'
        ? block.content
        : Array.isArray(block.content)
          ? block.content.map((c: { type: string; text?: string }) => c.text || '').join('\n')
          : ''

      setMessages(prev => [...prev, {
        id: `tool-result-${Date.now()}`,
        role: 'assistant',
        content: '',
        toolResults: [{
          toolCallId: block.tool_use_id || '',
          toolName: '',
          success: !block.is_error,
          result: content,
          error: block.is_error ? content : undefined,
        }],
        timestamp: Date.now(),
      }])
    }
  }

  const flushStreamBuffer = () => {
    if (streamTimerRef.current) {
      clearTimeout(streamTimerRef.current)
      streamTimerRef.current = null
    }
    if (streamBufferRef.current) {
      const chunk = streamBufferRef.current
      streamBufferRef.current = ''
      streamingContentRef.current += chunk
      setStreamingContent(streamingContentRef.current)
    }
  }

  const finalizeAssistantMessage = () => {
    // Prevent duplicate finalization
    if (hasFinalized.current) return
    hasFinalized.current = true

    const content = streamingContentRef.current
    const thinking = streamingThinkingRef.current

    if (content || thinking) {
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: content,
        thinking: thinking || undefined,
        timestamp: Date.now(),
      }
      // Add to local state for display - backend handles saving to history
      setMessages(prev => [...prev, assistantMessage])
    }

    // Clear streaming state
    streamingContentRef.current = ''
    streamingThinkingRef.current = ''
    setStreamingContent('')
    setStreamingThinking('')
  }

  const loadChatHistory = async (noteId: string) => {
    const { messages: history } = await window.dayai.chat.getHistory(noteId)
    setMessages(history)
  }

  const handleSendMessage = async () => {
    if (!input.trim() || !currentNote || isProcessing) return

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    }

    setMessages((prev) => [...prev, userMessage])
    await window.dayai.chat.saveMessage(currentNote.id, userMessage)

    setInput('')
    setIsProcessing(true)
    setStreamingContent('')
    setStreamingThinking('')
    setError(null)
    hasFinalized.current = false
    streamingContentRef.current = ''
    streamingThinkingRef.current = ''

    try {
      // Send message - SDK handles the entire agentic loop
      await window.dayai.chat.sendMessage(currentNote.id, userMessage.content)
    } catch (error) {
      console.error('Chat error:', error)
      setError(error instanceof Error ? error.message : 'Unknown error')
      setIsProcessing(false)
      setStreamingContent('')
      setStreamingThinking('')
    }
  }

  const handleClearHistory = async () => {
    if (!currentNote) return
    await window.dayai.chat.clearHistory(currentNote.id)
    setMessages([])
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleAbort = useCallback(async () => {
    await window.dayai.chat.abort()
    setIsProcessing(false)
    setStreamingContent('')
    setStreamingThinking('')
  }, [])

  if (!currentNote) {
    return (
      <div className="h-full flex flex-col glass-panel">
        <div className="h-[52px] flex-shrink-0 border-b border-white/[0.06] flex items-center px-4">
          <span className="text-sm font-medium text-white/60">Chat</span>
        </div>
        <div className="flex-1 flex items-center justify-center text-white/40 text-sm">
          Select a note to start chatting
        </div>
      </div>
    )
  }

  if (!isConfigured) {
    return (
      <div className="h-full flex flex-col glass-panel">
        <div className="h-[52px] flex-shrink-0 border-b border-white/[0.06] flex items-center px-4">
          <span className="text-sm font-medium text-white/60">Chat</span>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-white/40 text-sm">
            <p className="mb-2">API key not configured</p>
            <p>Add your Anthropic API key in Settings to enable chat</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col glass-panel">
      {/* Header */}
      <div className="h-[52px] flex-shrink-0 border-b border-white/[0.06] flex items-center justify-between px-4">
        <span className="text-sm font-medium text-white/60">Chat</span>
        {messages.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/10 transition-all duration-200"
            title="Clear chat history"
          >
            <IconTrash size={16} stroke={1.5} />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-white/40 text-sm">
            Ask me anything about your note
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {isProcessing && (streamingContent || streamingThinking) && (
              <MessageBubble
                message={{
                  id: 'streaming',
                  role: 'assistant',
                  content: streamingContent,
                  thinking: streamingThinking || undefined,
                  timestamp: Date.now(),
                }}
                isStreaming
              />
            )}
            {isProcessing && !streamingContent && !streamingThinking && (
              <MessageBubble
                message={{
                  id: 'thinking',
                  role: 'assistant',
                  content: '',
                  timestamp: Date.now(),
                  isThinking: true,
                }}
              />
            )}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                {error}
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="flex-shrink-0 p-4 border-t border-white/[0.06]">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about this note..."
            disabled={isProcessing}
            className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/40 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 disabled:opacity-50 transition-all"
          />
          {isProcessing ? (
            <button
              onClick={handleAbort}
              className="px-3 py-2.5 bg-transparent border border-white/20 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all duration-200"
              title="Stop"
            >
              <IconSquare size={18} stroke={1.5} fill="currentColor" />
            </button>
          ) : (
            <button
              onClick={handleSendMessage}
              disabled={!input.trim()}
              className="px-3 py-2.5 glass-button rounded-xl text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <IconSend size={18} stroke={1.5} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
