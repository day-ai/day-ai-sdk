import { useState, useEffect, useRef, useCallback } from 'react'
import { IconSend, IconSquare, IconTrash } from '@tabler/icons-react'
import MessageBubble from './MessageBubble'
import type { Note, ChatMessage, ToolCall, AgentResponse } from '../types'

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
  const [isConfigured, setIsConfigured] = useState(false)

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

  // Subscribe to streaming events
  useEffect(() => {
    const unsubChunk = window.dayai.chat.onStreamChunk((chunk) => {
      if (chunk.type === 'text') {
        setStreamingContent((prev) => prev + chunk.content)
      }
    })

    const unsubEnd = window.dayai.chat.onStreamEnd(() => {
      setIsProcessing(false)
    })

    const unsubError = window.dayai.chat.onStreamError((error) => {
      console.error('Stream error:', error)
      setIsProcessing(false)
    })

    const unsubNoteUpdated = window.dayai.chat.onNoteUpdated((noteId) => {
      if (currentNote && noteId === currentNote.id) {
        onNoteUpdate?.(noteId)
      }
    })

    const unsubNotesChanged = window.dayai.chat.onNotesChanged(() => {
      onNotesChanged?.()
    })

    return () => {
      unsubChunk()
      unsubEnd()
      unsubError()
      unsubNoteUpdated()
      unsubNotesChanged()
    }
  }, [currentNote, onNoteUpdate, onNotesChanged])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  const loadChatHistory = async (noteId: string) => {
    const history = await window.dayai.chat.getHistory(noteId)
    setMessages(history)
  }

  const handleSendMessage = async () => {
    if (!input.trim() || !currentNote || isProcessing) return

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    await window.dayai.chat.saveMessage(currentNote.id, userMessage)

    setInput('')
    setIsProcessing(true)
    setStreamingContent('')

    try {
      const response = await window.dayai.chat.sendMessage(currentNote.id, userMessage.content)
      await handleAgentResponse(response)
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, errorMessage])
      await window.dayai.chat.saveMessage(currentNote.id, errorMessage)
    } finally {
      setIsProcessing(false)
      setStreamingContent('')
    }
  }

  const handleAgentResponse = async (response: AgentResponse) => {
    if (!currentNote) return

    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: response.content,
      timestamp: new Date().toISOString(),
      thinking: response.thinking,
      toolCall: response.toolCall,
    }

    setMessages((prev) => [...prev, assistantMessage])
    await window.dayai.chat.saveMessage(currentNote.id, assistantMessage)

    // If there's a tool call, execute it
    if (response.toolCall) {
      await handleToolExecution(response.toolCall, assistantMessage)
    }
  }

  const handleToolExecution = async (toolCall: ToolCall, originalMessage: ChatMessage) => {
    if (!currentNote) return

    setIsProcessing(true)
    setStreamingContent('')

    try {
      const { toolResult, response } = await window.dayai.chat.executeToolAndContinue(
        currentNote.id,
        toolCall
      )

      // Update the original message with tool result
      const updatedMessage: ChatMessage = {
        ...originalMessage,
        toolResult: {
          toolCallId: toolCall.id,
          toolName: toolCall.name,
          success: toolResult.success,
          result: toolResult.result,
          error: toolResult.error,
        },
      }

      setMessages((prev) => prev.map((m) => (m.id === originalMessage.id ? updatedMessage : m)))
      await window.dayai.chat.saveMessage(currentNote.id, updatedMessage)

      // Handle any follow-up response
      if (response.content || response.toolCall) {
        await handleAgentResponse(response)
      }
    } catch (error) {
      console.error('Tool execution error:', error)
    } finally {
      setIsProcessing(false)
      setStreamingContent('')
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
            {isProcessing && streamingContent && (
              <MessageBubble
                message={{
                  id: 'streaming',
                  role: 'assistant',
                  content: streamingContent,
                  timestamp: new Date().toISOString(),
                  isStreaming: true,
                }}
              />
            )}
            {isProcessing && !streamingContent && (
              <MessageBubble
                message={{
                  id: 'thinking',
                  role: 'assistant',
                  content: '',
                  timestamp: new Date().toISOString(),
                  isThinking: true,
                }}
              />
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
