import { useState, useMemo } from 'react'
import { IconChevronDown } from '@tabler/icons-react'
import type {
  ChatMessage,
  MCPToolIcon,
  ToolCall,
  ToolResult,
  SDKContentBlock,
} from '../types'
import { emojiFromShortcode } from '../utils/emoji'

function ToolIcon({ icon }: { icon?: MCPToolIcon }) {
  if (!icon) return null

  if (icon.type === 'emoji' && icon.value) {
    return <span className="text-sm">{emojiFromShortcode(icon.value)}</span>
  }

  const src = icon.src || (icon.type === 'url' || icon.type === 'data-uri' ? icon.value : null)
  if (src) {
    return <img src={src} alt="" className="w-3.5 h-3.5 object-contain" />
  }

  return null
}

function formatToolName(name: string): string {
  if (name.startsWith('mcp__')) {
    const parts = name.slice(5).split('__')
    if (parts.length >= 2) return parts.slice(1).join('__').replace(/_/g, ' ')
  }
  return name.replace(/_/g, ' ')
}

// Extract key parameters for inline display based on tool type
function getToolDisplayParams(toolName: string, input: Record<string, unknown>): string {
  const normalizedName = toolName.replace(/^mcp__[^_]+__/, '').toLowerCase()

  const paramExtractors: Record<string, (input: Record<string, unknown>) => string> = {
    glob: (i) => (i.pattern ? `pattern: "${i.pattern}"` : ''),
    grep: (i) => (i.pattern ? `pattern: "${i.pattern}"` : ''),
    search: (i) =>
      i.pattern ? `pattern: "${i.pattern}"` : i.query ? `query: "${i.query}"` : '',
    search_objects: (i) => {
      const queries = i.queries as Array<{ objectType?: string }> | undefined
      if (queries && queries.length > 0) {
        const types = queries.map((q) => q.objectType?.replace('native_', '')).filter(Boolean)
        return types.length > 0 ? types.join(', ') : ''
      }
      return ''
    },
    read: (i) =>
      i.file_path
        ? `"${String(i.file_path).split('/').pop()}"`
        : i.path
          ? `"${String(i.path).split('/').pop()}"`
          : '',
    write: (i) =>
      i.file_path
        ? `"${String(i.file_path).split('/').pop()}"`
        : i.path
          ? `"${String(i.path).split('/').pop()}"`
          : '',
    edit: (i) =>
      i.file_path
        ? `"${String(i.file_path).split('/').pop()}"`
        : i.path
          ? `"${String(i.path).split('/').pop()}"`
          : '',
    bash: (i) =>
      i.command
        ? `"${String(i.command).slice(0, 40)}${String(i.command).length > 40 ? '...' : ''}"`
        : '',
    task: (i) => (i.description ? `"${i.description}"` : ''),
    webfetch: (i) =>
      i.url
        ? `"${String(i.url).slice(0, 50)}${String(i.url).length > 50 ? '...' : ''}"`
        : '',
    websearch: (i) => (i.query ? `query: "${i.query}"` : ''),
  }

  const extractor = paramExtractors[normalizedName]
  if (extractor) {
    return extractor(input)
  }

  // Default: show first string param
  const firstStringParam = Object.entries(input).find(([, v]) => typeof v === 'string')
  if (firstStringParam) {
    const value = String(firstStringParam[1])
    return `${firstStringParam[0]}: "${value.slice(0, 30)}${value.length > 30 ? '...' : ''}"`
  }

  return ''
}

function getResultSummary(toolName: string, result: unknown): string {
  if (result === null || result === undefined) return 'done'

  const normalizedName = toolName.replace(/^mcp__[^_]+__/, '').toLowerCase()

  // Try to extract meaningful info from the result
  if (typeof result === 'object' && result !== null) {
    const obj = result as Record<string, unknown>

    // Check for results/data arrays with objects that have names/titles
    const items = obj.results || obj.data || (Array.isArray(result) ? result : null)
    if (Array.isArray(items) && items.length > 0) {
      const count = items.length
      // Try to determine what type of objects
      const first = items[0] as Record<string, unknown>
      if (first?.objectType) {
        const type = String(first.objectType).replace('native_', '').replace(/_/g, ' ')
        return `${count} ${type}${count !== 1 ? 's' : ''}`
      }
      if (first?.name || first?.title) {
        return `${count} result${count !== 1 ? 's' : ''}`
      }
      return `${count} item${count !== 1 ? 's' : ''}`
    }

    if ('message' in obj) return String(obj.message)
    if ('status' in obj) return String(obj.status)
  }

  if (Array.isArray(result)) {
    if (normalizedName === 'glob' || normalizedName === 'search') {
      return `Found ${result.length} file${result.length === 1 ? '' : 's'}`
    }
    if (normalizedName === 'grep') {
      return `Found ${result.length} match${result.length === 1 ? '' : 'es'}`
    }
    return `${result.length} item${result.length !== 1 ? 's' : ''}`
  }

  if (typeof result === 'string') {
    const lines = result.split('\n').length
    if (normalizedName === 'read') {
      return `Read ${lines} line${lines === 1 ? '' : 's'}`
    }
    if (normalizedName === 'bash') {
      return lines > 1 ? `${lines} lines of output` : 'Completed'
    }
    if (normalizedName === 'write' || normalizedName === 'edit') {
      return 'Saved'
    }
    if (result.length < 50) return result
    return 'Completed'
  }

  return 'done'
}

function CompactToolCall({ toolCall, toolResult }: { toolCall: ToolCall; toolResult?: ToolResult }) {
  const [expanded, setExpanded] = useState(false)

  const displayName = toolCall.title || formatToolName(toolCall.name)
  const isComplete = !!toolResult
  const isSuccess = toolResult?.success ?? true
  const summary = toolResult ? getResultSummary(toolCall.name, toolResult.result) : 'running...'
  const input = toolCall.input || {}

  return (
    <div className="text-xs">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left py-1 px-2 -mx-2 rounded hover:bg-white/5 transition-colors group"
      >
        {/* Status indicator */}
        {isComplete ? (
          isSuccess ? (
            <span className="text-green-400">✓</span>
          ) : (
            <span className="text-red-400">✗</span>
          )
        ) : (
          <span className="text-white/30 animate-pulse">○</span>
        )}

        {/* Icon + Name */}
        <span className="text-white/50 flex items-center gap-1.5">
          <ToolIcon icon={toolCall.icon} />
          <span>{displayName}</span>
        </span>

        {/* Arrow */}
        <span className="text-white/20">→</span>

        {/* Result summary */}
        <span className={isComplete ? (isSuccess ? 'text-white/70' : 'text-red-400/70') : 'text-white/30'}>
          {isSuccess ? summary : toolResult?.error || 'failed'}
        </span>

        {/* Expand chevron */}
        <IconChevronDown
          size={12}
          className={`ml-auto text-white/20 transition-transform opacity-0 group-hover:opacity-100 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="mt-1 ml-5 pl-3 border-l border-white/10 space-y-2">
          {Object.keys(input).length > 0 && (
            <div>
              <div className="text-white/30 text-[10px] uppercase tracking-wide mb-1">Input</div>
              <pre className="text-white/40 text-[11px] overflow-x-auto max-h-32 overflow-y-auto">
                {JSON.stringify(input, null, 2)}
              </pre>
            </div>
          )}
          {toolResult?.result && (
            <div>
              <div className="text-white/30 text-[10px] uppercase tracking-wide mb-1">Output</div>
              <pre className="text-white/40 text-[11px] overflow-x-auto max-h-32 overflow-y-auto">
                {typeof toolResult.result === 'string'
                  ? toolResult.result
                  : JSON.stringify(toolResult.result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Component for rendering tool use (inline style like traction)
function ToolUseDisplay({ toolCall }: { toolCall: ToolCall }) {
  const [expanded, setExpanded] = useState(false)

  const displayName = formatToolName(toolCall.name)
  const paramsDisplay = useMemo(
    () => getToolDisplayParams(toolCall.name, toolCall.input),
    [toolCall.name, toolCall.input]
  )

  return (
    <div className="font-mono text-xs">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-start gap-2 text-left hover:bg-white/5 rounded px-2 py-1.5 -mx-2 transition-colors group w-full"
      >
        <span className="text-primary-400 flex-shrink-0">⏺</span>
        <span className="text-white/80 break-all">
          <span className="text-primary-300">{displayName}</span>
          {paramsDisplay && <span className="text-white/50">({paramsDisplay})</span>}
        </span>
        <IconChevronDown
          size={12}
          className={`ml-auto mt-0.5 text-white/30 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>
      {expanded && (
        <div className="ml-6 mt-1 pl-3 border-l border-white/10">
          <div className="text-white/30 text-[10px] uppercase tracking-wide mb-1">Input</div>
          <pre className="text-white/40 text-[11px] overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap break-all">
            {JSON.stringify(toolCall.input, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

// Component for rendering tool result (inline style like traction)
function ToolResultDisplay({ toolResult }: { toolResult: ToolResult }) {
  const [expanded, setExpanded] = useState(false)

  const summary = useMemo(() => {
    if (!toolResult.success && toolResult.error) {
      const errorMsg = toolResult.error
      return errorMsg.length > 50 ? errorMsg.slice(0, 50) + '...' : errorMsg
    }
    return getResultSummary(toolResult.toolName, toolResult.result)
  }, [toolResult])

  const hasExpandableContent = toolResult.result || toolResult.error

  return (
    <div className="font-mono text-xs">
      <button
        onClick={() => hasExpandableContent && setExpanded(!expanded)}
        className={`flex items-start gap-2 text-left rounded px-2 py-1.5 -mx-2 transition-colors group w-full ${
          hasExpandableContent ? 'hover:bg-white/5 cursor-pointer' : 'cursor-default'
        }`}
        disabled={!hasExpandableContent}
      >
        <span className="text-white/30 flex-shrink-0 ml-4">⎿</span>
        <span className={`break-all ${toolResult.success ? 'text-white/60' : 'text-red-400'}`}>{summary}</span>
        {hasExpandableContent && (
          <IconChevronDown
            size={12}
            className={`ml-auto mt-0.5 text-white/30 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 ${expanded ? 'rotate-180' : ''}`}
          />
        )}
      </button>
      {expanded && hasExpandableContent && (
        <div className="ml-10 mt-1 pl-3 border-l border-white/10">
          <div className="text-white/30 text-[10px] uppercase tracking-wide mb-1">
            {toolResult.success ? 'Output' : 'Error'}
          </div>
          <pre
            className={`text-[11px] overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap break-all ${
              toolResult.success ? 'text-white/40' : 'text-red-400/70'
            }`}
          >
            {toolResult.success
              ? (typeof toolResult.result === 'string' ? toolResult.result : JSON.stringify(toolResult.result, null, 2))
              : toolResult.error}
          </pre>
        </div>
      )}
    </div>
  )
}

// Parse tool result content from SDK format
function parseSDKContent(
  content: string | Array<{ type: string; text?: string }> | undefined
): string {
  if (!content) return ''
  if (typeof content === 'string') return content
  // Handle array content format from SDK
  return content
    .filter((c) => c.type === 'text' && c.text)
    .map((c) => c.text)
    .join('\n')
}

// Component for rendering tool_use blocks from SDK content blocks
function SDKToolUseDisplay({ block }: { block: SDKContentBlock }) {
  const [expanded, setExpanded] = useState(false)

  const displayName = formatToolName(block.name || '')
  const input = block.input || {}
  const paramsDisplay = useMemo(
    () => getToolDisplayParams(block.name || '', input),
    [block.name, input]
  )

  return (
    <div className="font-mono text-xs">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-start gap-2 text-left hover:bg-white/5 rounded px-2 py-1.5 -mx-2 transition-colors group w-full"
      >
        <span className="text-primary-400 flex-shrink-0">⏺</span>
        <span className="text-white/80 break-all">
          <span className="text-primary-300">{displayName}</span>
          {paramsDisplay && <span className="text-white/50">({paramsDisplay})</span>}
        </span>
        <IconChevronDown
          size={12}
          className={`ml-auto mt-0.5 text-white/30 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>
      {expanded && (
        <div className="ml-6 mt-1 pl-3 border-l border-white/10">
          <div className="text-white/30 text-[10px] uppercase tracking-wide mb-1">Input</div>
          <pre className="text-white/40 text-[11px] overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap break-all">
            {JSON.stringify(input, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

// Component for rendering tool_result blocks from SDK content blocks
function SDKToolResultDisplay({ block }: { block: SDKContentBlock }) {
  const [expanded, setExpanded] = useState(false)

  const contentStr = parseSDKContent(block.content)
  const isError = block.is_error === true

  // Try to parse JSON content for better display
  const parsedResult = useMemo(() => {
    try {
      return JSON.parse(contentStr)
    } catch {
      return contentStr
    }
  }, [contentStr])

  const summary = useMemo(() => {
    if (isError) {
      return contentStr.length > 50 ? contentStr.slice(0, 50) + '...' : contentStr
    }
    return getResultSummary('', parsedResult)
  }, [isError, contentStr, parsedResult])

  const hasExpandableContent = contentStr.length > 0

  return (
    <div className="font-mono text-xs">
      <button
        onClick={() => hasExpandableContent && setExpanded(!expanded)}
        className={`flex items-start gap-2 text-left rounded px-2 py-1.5 -mx-2 transition-colors group w-full ${
          hasExpandableContent ? 'hover:bg-white/5 cursor-pointer' : 'cursor-default'
        }`}
        disabled={!hasExpandableContent}
      >
        <span className="text-white/30 flex-shrink-0 ml-4">⎿</span>
        <span className={`break-all ${!isError ? 'text-white/60' : 'text-red-400'}`}>
          {summary}
        </span>
        {hasExpandableContent && (
          <IconChevronDown
            size={12}
            className={`ml-auto mt-0.5 text-white/30 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 ${expanded ? 'rotate-180' : ''}`}
          />
        )}
      </button>
      {expanded && hasExpandableContent && (
        <div className="ml-10 mt-1 pl-3 border-l border-white/10">
          <div className="text-white/30 text-[10px] uppercase tracking-wide mb-1">
            {isError ? 'Error' : 'Output'}
          </div>
          <pre
            className={`text-[11px] overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap break-all ${
              isError ? 'text-red-400/70' : 'text-white/40'
            }`}
          >
            {typeof parsedResult === 'string' ? parsedResult : JSON.stringify(parsedResult, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

// Render a single SDK content block
function SDKContentBlockRenderer({ block }: { block: SDKContentBlock }) {
  switch (block.type) {
    case 'text':
      return <div className="text-sm whitespace-pre-wrap break-words">{block.text}</div>
    case 'thinking':
      return (
        <div className="text-sm whitespace-pre-wrap break-words text-white/50 italic">
          {block.thinking}
        </div>
      )
    case 'tool_use':
      return <SDKToolUseDisplay block={block} />
    case 'tool_result':
      return <SDKToolResultDisplay block={block} />
    default:
      return null
  }
}

interface MessageBubbleProps {
  message: ChatMessage
  isStreaming?: boolean
  /** Optional: SDK content blocks for richer rendering */
  contentBlocks?: SDKContentBlock[]
}

export default function MessageBubble({
  message,
  isStreaming: isStreamingProp,
  contentBlocks,
}: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const isThinking = message.isThinking
  const isStreaming = isStreamingProp || message.isStreaming
  const hasContent = message.content && message.content.trim().length > 0
  const hasToolCalls = message.toolCalls && message.toolCalls.length > 0
  const hasToolResults = message.toolResults && message.toolResults.length > 0
  const hasContentBlocks = contentBlocks && contentBlocks.length > 0

  // Check if we have tool blocks in contentBlocks
  const toolBlocks = contentBlocks?.filter(
    (b) => b.type === 'tool_use' || b.type === 'tool_result'
  )
  const hasToolBlocks = toolBlocks && toolBlocks.length > 0
  const textBlocks = contentBlocks?.filter((b) => b.type === 'text' || b.type === 'thinking')
  const hasTextBlocks = textBlocks && textBlocks.length > 0

  // Tool-only message using SDK contentBlocks: render tool blocks only
  if (!isUser && hasToolBlocks && !hasContent && !hasTextBlocks && !isThinking) {
    return (
      <div className="flex justify-start">
        <div className="max-w-[85%] bg-white/[0.02] border border-white/[0.06] rounded-lg px-3 py-2 space-y-1">
          {toolBlocks!.map((block, index) => (
            <SDKContentBlockRenderer key={`${block.type}-${block.id || index}`} block={block} />
          ))}
        </div>
      </div>
    )
  }

  // Tool-only message using toolCalls array: render as inline tool display
  if (!isUser && hasToolCalls && !hasContent && !isThinking && !hasContentBlocks) {
    return (
      <div className="flex justify-start">
        <div className="max-w-[85%] bg-white/[0.02] border border-white/[0.06] rounded-lg px-3 py-2 space-y-1">
          {message.toolCalls!.map((toolCall) => (
            <ToolUseDisplay key={toolCall.id} toolCall={toolCall} />
          ))}
        </div>
      </div>
    )
  }

  // Tool result-only message: render as inline result display
  if (!isUser && hasToolResults && !hasContent && !hasToolCalls && !isThinking && !hasContentBlocks) {
    return (
      <div className="flex justify-start">
        <div className="max-w-[85%] bg-white/[0.02] border border-white/[0.06] rounded-lg px-3 py-2 space-y-1">
          {message.toolResults!.map((toolResult) => (
            <ToolResultDisplay key={toolResult.toolCallId} toolResult={toolResult} />
          ))}
        </div>
      </div>
    )
  }

  // Thinking state
  if (isThinking) {
    return (
      <div className="flex justify-start">
        <div className="max-w-[85%]">
          <div className="inline-block rounded-2xl px-4 py-2.5 bg-white/5 text-white/90">
            <div className="flex items-center gap-2 text-white/50">
              <div className="flex gap-1">
                <span
                  className="w-2 h-2 bg-white/40 rounded-full animate-bounce"
                  style={{ animationDelay: '0ms' }}
                />
                <span
                  className="w-2 h-2 bg-white/40 rounded-full animate-bounce"
                  style={{ animationDelay: '150ms' }}
                />
                <span
                  className="w-2 h-2 bg-white/40 rounded-full animate-bounce"
                  style={{ animationDelay: '300ms' }}
                />
              </div>
              <span className="text-sm">Thinking...</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Regular message with content (and possibly tool blocks)
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] ${isUser ? 'text-right' : ''}`}>
        <div
          className={`inline-block max-w-full rounded-2xl px-4 py-2.5 ${
            isUser ? 'bg-primary-500/20 text-white' : 'bg-white/5 text-white/90'
          }`}
        >
          {/* Render SDK contentBlocks if available */}
          {hasContentBlocks ? (
            <div className="space-y-3">
              {contentBlocks!.map((block, index) => {
                // Add separator before tool blocks if there was text before
                const prevBlock = index > 0 ? contentBlocks![index - 1] : null
                const needsSeparator =
                  (block.type === 'tool_use' || block.type === 'tool_result') &&
                  (prevBlock?.type === 'text' || prevBlock?.type === 'thinking')

                return (
                  <div key={`${block.type}-${block.id || index}`}>
                    {needsSeparator && <div className="border-t border-white/10 -mx-4 my-3" />}
                    <SDKContentBlockRenderer block={block} />
                  </div>
                )
              })}
              {isStreaming && (
                <span className="inline-block w-2 h-4 ml-0.5 bg-white/50 animate-pulse" />
              )}
            </div>
          ) : (
            <>
              {/* Thinking content if present */}
              {message.thinking && (
                <div className="mb-3 pb-3 border-b border-white/10">
                  <div className="text-white/30 text-[10px] uppercase tracking-wide mb-1">Thinking</div>
                  <div className="text-sm text-white/50 whitespace-pre-wrap break-words">
                    {message.thinking}
                  </div>
                </div>
              )}

              {/* Main content */}
              {hasContent && (
                <div className="text-sm whitespace-pre-wrap break-words">
                  {message.content}
                  {isStreaming && (
                    <span className="inline-block w-2 h-4 ml-0.5 bg-white/50 animate-pulse" />
                  )}
                </div>
              )}

              {/* Tool calls inline with content */}
              {hasToolCalls && hasContent && (
                <div className="mt-3 pt-3 border-t border-white/10 space-y-1">
                  {message.toolCalls!.map((toolCall) => (
                    <ToolUseDisplay key={toolCall.id} toolCall={toolCall} />
                  ))}
                </div>
              )}

              {/* Tool results inline with content */}
              {hasToolResults && hasContent && (
                <div className="mt-3 pt-3 border-t border-white/10 space-y-1">
                  {message.toolResults!.map((toolResult) => (
                    <ToolResultDisplay key={toolResult.toolCallId} toolResult={toolResult} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Timestamp */}
        {!isThinking && !isStreaming && (
          <div className={`mt-1 text-xs text-white/30 ${isUser ? 'text-right' : ''}`}>
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
