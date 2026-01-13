# Day AI Mobile Example - Implementation Plan

## Overview

Create a **lightweight, simple Claude-powered chat app for mobile** that integrates with Day AI via MCP. This will be the third example app in the `day-ai-sdk/examples/` directory, following the desktop and Vercel cron examples.

**Key Principles:**
- **Simple first**: Text-only chat (no voice complexity initially)
- **Beautiful UI**: Liquid glass design from day-voice
- **Full MCP integration**: Access to all 20+ Day AI CRM tools
- **Cross-platform**: iOS, Android, and Web via Expo
- **Template-ready**: Production-ready starting point for mobile AI apps

---

## What We Learned from day-voice

### Architecture Patterns ✅
- **Clean separation**: Services → Hooks → Components
- **State management**: Single hook managing entire flow
- **Service layer**: Reusable, testable business logic
- **Type safety**: Full TypeScript throughout

### UI/UX Excellence ✅
- **Liquid glass design**: Frosted glass morphism with gradients
- **Smooth animations**: React Native Reanimated
- **NativeWind (Tailwind)**: Utility-first styling for React Native
- **Beautiful message bubbles**: User vs Assistant distinction
- **Status indicators**: Visual feedback for each state

### Technical Stack ✅
- **Expo**: Cross-platform React Native framework
- **React Native Web**: Web support out of the box
- **TypeScript**: Full type safety
- **CORS proxy**: Simple Express server for web API calls

### State Machine Pattern ✅
From day-voice:
```
idle → listening → processing → thinking → speaking → idle
```

For mobile text chat:
```
idle → typing → sending → thinking → streaming → idle
```

---

## Mobile Example: Day AI Chat

### Vision

A **beautiful, minimal Claude chat app** that feels native on mobile while providing full access to Day AI's CRM via MCP tools.

**User Experience:**
1. Opens app → sees chat interface with liquid glass aesthetic
2. Types message → sends to Claude
3. Claude responds with streaming text
4. Claude can use MCP tools to search Day AI CRM (contacts, opportunities, meetings, etc.)
5. Tool results shown inline with beautiful formatting

**Use Cases:**
- "Find all contacts at Acme Corp"
- "What opportunities are closing this week?"
- "Show me meetings from yesterday"
- "Create a new opportunity for $50k with Jane at Acme"
- General Claude chat (no CRM needed)

---

## File Structure

```
day-ai-sdk/
└── examples/
    └── mobile/                           # NEW
        ├── app.json                      # Expo config
        ├── App.tsx                       # Entry point
        ├── package.json
        ├── tsconfig.json
        ├── tailwind.config.js            # NativeWind config
        ├── .env.example                  # API keys template
        ├── README.md                     # Setup & usage guide
        │
        ├── server/
        │   └── proxy.js                  # CORS proxy for web (from day-voice)
        │
        ├── src/
        │   ├── global.css               # Tailwind base styles
        │   │
        │   ├── config/
        │   │   └── env.ts               # Environment variables
        │   │
        │   ├── types/
        │   │   └── index.ts             # TypeScript types
        │   │
        │   ├── services/
        │   │   ├── index.ts
        │   │   ├── DayAIService.ts      # Day AI OAuth + MCP client
        │   │   └── ClaudeService.ts     # Anthropic SDK with streaming
        │   │
        │   ├── hooks/
        │   │   ├── index.ts
        │   │   └── useChat.ts           # Main chat state management
        │   │
        │   └── components/
        │       ├── index.ts
        │       ├── ChatScreen.tsx        # Main screen (from VoiceChatScreen pattern)
        │       ├── GlassView.tsx         # Reusable glass morphism container
        │       ├── MessageBubble.tsx     # Chat message display
        │       ├── ToolCallDisplay.tsx   # MCP tool call visualization
        │       └── SettingsSheet.tsx     # API key + OAuth settings
```

---

## Component Breakdown

### 1. ChatScreen.tsx (Main UI)

**Adapts from:** day-voice's `VoiceChatScreen.tsx`

**Layout:**
```
┌─────────────────────────────┐
│  Header (Liquid Glass)      │  ← App title, settings icon
│  "Day AI Chat"              │
├─────────────────────────────┤
│                             │
│  Message Bubbles            │  ← ScrollView with messages
│  - User messages (right)    │
│  - Assistant (left)         │
│  - Tool calls (inline)      │  ← NEW: Show MCP tool usage
│                             │
│  [Streaming text...]        │  ← Live typing indicator
│                             │
├─────────────────────────────┤
│  Input Area (Glass)         │  ← Text input + send button
│  [Type a message...] [Send] │
└─────────────────────────────┘
```

**Features:**
- Auto-scroll to bottom on new messages
- Streaming response display (word-by-word)
- Tool call visualization (show what Claude is doing)
- Pull-to-refresh to clear chat
- Settings button (top right) → opens settings sheet

---

### 2. GlassView.tsx (Reusable Component)

**Copy directly from day-voice** - this is perfect as-is.

Provides the liquid glass frosted effect used throughout the app.

---

### 3. MessageBubble.tsx

**Adapts from:** day-voice's `MessageBubble.tsx`

**Enhancements:**
- Add support for tool calls display
- Show timestamps on long press
- Different styles for user vs assistant
- Markdown support for formatting (optional nice-to-have)

**Message Types:**
```typescript
type MessageRole = 'user' | 'assistant';

interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  toolCalls?: ToolCall[];     // NEW: MCP tool usage
}

interface ToolCall {
  name: string;
  input: any;
  result?: any;
  status: 'pending' | 'success' | 'error';
}
```

---

### 4. ToolCallDisplay.tsx (NEW Component)

**Visual representation of MCP tool calls:**

```
┌─────────────────────────────────────┐
│ 🔧 search_objects                   │
│                                     │
│ Query: Person @ acme.com            │
│ ✓ Found 3 contacts                  │
│                                     │
│ [Expand to see results]             │
└─────────────────────────────────────┘
```

**Features:**
- Collapsible tool call details
- Status indicator (pending, success, error)
- Pretty-print JSON results
- Color-coded by tool type

---

### 5. SettingsSheet.tsx (NEW Component)

**Bottom sheet for configuration:**

```
┌─────────────────────────────────────┐
│  Settings                     [X]   │
├─────────────────────────────────────┤
│                                     │
│  Anthropic API Key                  │
│  [••••••••••••••••••] [Edit]       │
│                                     │
│  Day AI Connection                  │
│  ✓ Connected as chris@day.ai        │
│  [Reconnect]                        │
│                                     │
│  Model Selection                    │
│  ⚪ Sonnet 4.5 (Fast)               │
│  ⚪ Opus 4.5 (Powerful)             │
│                                     │
│  [Clear Chat History]               │
│                                     │
└─────────────────────────────────────┘
```

---

## Service Layer

### DayAIService.ts

**Purpose:** Handle Day AI OAuth + MCP client

**Key Methods:**
```typescript
class DayAIService {
  // OAuth flow
  async connect(): Promise<void>
  async disconnect(): Promise<void>
  isConnected(): boolean

  // MCP client
  async initialize(): Promise<void>
  async listTools(): Promise<Tool[]>
  async callTool(name: string, input: any): Promise<any>

  // Helper methods
  getConnectionStatus(): ConnectionStatus
}
```

**Implementation Notes:**
- Reuse core `DayAIClient` from `src/DayAIClient.ts`
- Handle OAuth callback (deep linking on mobile)
- Store tokens securely (AsyncStorage or SecureStore)
- Manage MCP connection lifecycle

---

### ClaudeService.ts

**Purpose:** Anthropic SDK for Claude chat with streaming

**Key Methods:**
```typescript
class ClaudeService {
  async *chatStream(
    message: string,
    history: Message[],
    tools: Tool[]  // MCP tools from Day AI
  ): AsyncGenerator<StreamChunk>

  // Stream chunk types:
  // - content_block_start
  // - content_block_delta (text)
  // - tool_use (MCP tool call)
  // - message_stop
}
```

**Implementation Notes:**
- Use `@anthropic-ai/sdk` package
- Support streaming responses
- Handle tool calls (MCP tools from Day AI)
- Tool use flow:
  1. Claude decides to use tool
  2. Pause streaming
  3. Call tool via DayAIService
  4. Resume streaming with tool result
  5. Claude responds with final answer

---

## Hook: useChat

**Adapts from:** day-voice's `useVoiceChat.ts`

**State Management:**
```typescript
interface ChatState {
  chatState: 'idle' | 'sending' | 'thinking' | 'streaming';
  messages: Message[];
  currentResponse: string;  // Streaming text accumulator
  error: string | null;
  isConnected: boolean;     // Day AI connection
}

function useChat() {
  const [state, setState] = useState<ChatState>(initialState);

  // Actions
  const sendMessage = async (text: string) => { ... }
  const cancelStreaming = () => { ... }
  const clearMessages = () => { ... }

  return {
    ...state,
    sendMessage,
    cancelStreaming,
    clearMessages,
  };
}
```

**Flow:**
1. User types message → `sendMessage(text)`
2. Add user message to `messages[]`
3. Set state to `'thinking'`
4. Start streaming from Claude
5. For each chunk:
   - If text: append to `currentResponse`
   - If tool call: pause, execute tool, resume
6. When done: add assistant message to `messages[]`
7. Set state to `'idle'`

---

## Styling: Liquid Glass Design

### Color Palette (from day-voice)

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#4a9a9a',  // Main brand color
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        }
      }
    }
  }
}
```

### Gradient Background

```jsx
<LinearGradient
  colors={['#f0f9f9', '#e8f4f4', '#d9f0f0', '#e8f4f4']}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 1 }}
  className="absolute inset-0"
/>
```

### Glass Effect

```jsx
<GlassView
  intensity={60}
  tint="light"
  className="rounded-2xl overflow-hidden"
  style={{
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  }}
>
  {children}
</GlassView>
```

---

## API Keys & Configuration

### .env.example

```bash
# Anthropic API Key (required)
ANTHROPIC_API_KEY=sk-ant-...

# Day AI OAuth (auto-populated after first connection)
DAY_AI_CLIENT_ID=
DAY_AI_CLIENT_SECRET=
DAY_AI_REFRESH_TOKEN=

# Optional: Custom proxy URL for web
PROXY_URL=http://localhost:3001
```

### OAuth Flow on Mobile

**Challenge:** OAuth callback on mobile (not just localhost)

**Solutions:**
1. **Expo AuthSession**: Use Expo's built-in OAuth flow
2. **Deep Linking**: Register `dayai://` custom scheme
3. **Web fallback**: QR code → complete on desktop → copy token

**Recommended:** Start with manual token entry in settings, add full OAuth in v2.

---

## Development Phases

### Phase 1: Basic Chat (MVP)
- [ ] Set up Expo project structure
- [ ] Copy liquid glass UI components from day-voice
- [ ] Implement `useChat` hook (text only)
- [ ] Integrate Anthropic SDK with streaming
- [ ] Basic message display (no tool calls yet)
- [ ] Settings sheet for API key entry

**Deliverable:** Beautiful chat app that talks to Claude (no Day AI yet)

---

### Phase 2: Day AI MCP Integration
- [ ] Integrate `DayAIClient` from core SDK
- [ ] Implement `DayAIService` wrapper
- [ ] Manual token entry in settings (OAuth v2 later)
- [ ] Pass MCP tools to Claude
- [ ] Handle tool calls in streaming flow
- [ ] Display tool calls in UI (`ToolCallDisplay`)

**Deliverable:** Full Day AI integration with MCP tools

---

### Phase 3: Polish & Documentation
- [ ] Error handling & loading states
- [ ] Pull-to-refresh, haptic feedback
- [ ] Comprehensive README
- [ ] Example prompts & screenshots
- [ ] Deploy example to Expo (expo.dev/preview)

**Deliverable:** Production-ready template

---

### Phase 4: Advanced Features (Future)
- [ ] Full OAuth flow (Expo AuthSession)
- [ ] Voice input (adapt from day-voice)
- [ ] Voice output (adapt from day-voice)
- [ ] Offline message queue
- [ ] Push notifications for scheduled actions
- [ ] Share conversations

---

## Key Differences from day-voice

| Feature | day-voice | Day AI Mobile |
|---------|-----------|---------------|
| **Input** | Voice (hold to talk) | Text (type) |
| **Output** | Voice (ElevenLabs TTS) | Text (streaming) |
| **AI Backend** | Claude via Anthropic API | Claude via Anthropic SDK |
| **Special Features** | Real-time transcription | MCP tool calls (Day AI CRM) |
| **Complexity** | High (voice streaming) | Low (text streaming) |
| **Services** | 3 (Transcription, AI, Speech) | 2 (Claude, DayAI) |

---

## Dependencies (package.json)

```json
{
  "name": "day-ai-mobile",
  "version": "1.0.0",
  "main": "index.ts",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "proxy": "node server/proxy.js",
    "dev": "concurrently \"yarn proxy\" \"yarn web\""
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.32.1",
    "@expo/vector-icons": "^15.0.3",
    "expo": "~54.0.30",
    "expo-blur": "^15.0.8",
    "expo-font": "^14.0.10",
    "expo-linear-gradient": "^15.0.8",
    "expo-status-bar": "~3.0.9",
    "nativewind": "^4.2.1",
    "react": "19.1.0",
    "react-dom": "19.1.0",
    "react-native": "0.81.5",
    "react-native-reanimated": "~4.1.1",
    "react-native-safe-area-context": "^5.6.2",
    "react-native-web": "^0.21.2",
    "tailwindcss": "^3.4.17"
  },
  "devDependencies": {
    "@types/react": "~19.1.0",
    "typescript": "~5.9.2",
    "cors": "^2.8.5",
    "express": "^5.2.1"
  }
}
```

---

## README Structure (examples/mobile/README.md)

```markdown
# Day AI Mobile Example

A beautiful, lightweight Claude-powered chat app for mobile that integrates with Day AI's CRM platform via MCP.

## Features
- 💬 Claude AI chat with streaming responses
- 🔧 Access to 20+ Day AI MCP tools (contacts, opportunities, meetings, etc.)
- 🎨 Liquid glass UI design
- 📱 Cross-platform: iOS, Android, Web
- 🚀 Production-ready template

## Quick Start
...

## Screenshots
...

## Architecture
...

## Customization Guide
...

## Deploying to Production
...
```

---

## Success Criteria

✅ **Beautiful UI**
- Matches day-voice liquid glass aesthetic
- Smooth animations and transitions
- Native feel on iOS, Android, and Web

✅ **Functional Chat**
- Streaming responses from Claude
- Full conversation history
- Error handling and loading states

✅ **Day AI Integration**
- All 20+ MCP tools available
- Tool calls visualized in UI
- Seamless OAuth connection

✅ **Developer Experience**
- Clear documentation
- Easy to clone and customize
- Well-structured codebase
- Full TypeScript types

✅ **Template Quality**
- Follows day-ai-sdk patterns
- Production-ready code
- Extensible architecture

---

## Open Questions

1. **OAuth on Mobile**: Start with manual token entry or implement full OAuth flow?
   - **Recommendation:** Manual tokens first, OAuth in Phase 4

2. **Tool Result Display**: Expand inline or separate panel?
   - **Recommendation:** Inline with expand/collapse

3. **Model Selection**: Allow user to pick Sonnet vs Opus?
   - **Recommendation:** Yes, in settings sheet

4. **Message Persistence**: Save chat history locally?
   - **Recommendation:** Phase 4 (AsyncStorage)

5. **Web vs Native Split**: Same codebase or separate?
   - **Recommendation:** Same codebase (Expo handles this)

---

## Next Steps

Once this plan is approved:

1. ✅ Create `examples/mobile/` directory
2. ✅ Copy day-voice foundation (UI components, structure)
3. ✅ Remove voice features, simplify to text chat
4. ✅ Integrate Day AI SDK (OAuth + MCP client)
5. ✅ Implement streaming chat with tool calls
6. ✅ Polish UI and write documentation
7. ✅ Test on iOS, Android, and Web
8. ✅ Create demo video and screenshots

---

## Timeline Estimate

- **Phase 1 (Basic Chat)**: 1-2 days
- **Phase 2 (MCP Integration)**: 2-3 days
- **Phase 3 (Polish & Docs)**: 1-2 days
- **Total**: ~1 week for production-ready template

---

## Conclusion

This mobile example will be a **lightweight, beautiful starting point** for developers who want to build mobile AI apps with Day AI integration. By adapting the proven patterns from day-voice and keeping the scope focused on text chat, we can deliver a high-quality template quickly.

The key insight: **day-voice solved the hard UI/UX problems**. We can reuse that foundation and focus on the Day AI MCP integration, which is unique value.
