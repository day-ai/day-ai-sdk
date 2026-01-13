# Day AI Mobile Example

A beautiful, lightweight Claude-powered chat app for mobile that integrates with Day AI's CRM platform via MCP.

![Day AI Mobile](https://img.shields.io/badge/expo-~54.0-blue) ![React Native](https://img.shields.io/badge/react--native-0.81-blue) ![TypeScript](https://img.shields.io/badge/typescript-~5.9-blue)

## Features

- 💬 **Claude AI Chat**: Real-time streaming responses from Claude Sonnet 4.5 or Opus 4.5
- 🔧 **Day AI MCP Integration**: Access 20+ CRM tools (contacts, opportunities, meetings, etc.)
- 🛠️ **Tool Call Visualization**: See when Claude uses MCP tools with expandable details
- 🎨 **Liquid Glass UI**: Beautiful frosted glass morphism design
- 📱 **Cross-platform**: Runs on iOS, Android, and Web
- 💾 **Persistent History**: Chat messages and credentials saved locally
- ⚙️ **Easy Configuration**: API key + OAuth management in settings
- 🚀 **Production Ready**: Clean architecture, full TypeScript support

## What This Is

This is a **production-ready template** for building AI-powered mobile apps with CRM access. Clone it, customize it, and ship your own AI assistant app in hours, not weeks.

**Phase 1 ✅**: Text-based Claude chat with beautiful UI
**Phase 2 ✅**: Day AI MCP integration for CRM access (contacts, opportunities, meetings, etc.)

## Quick Start

### Prerequisites

- Node.js 18+
- Yarn or npm
- Anthropic API key ([get one here](https://console.anthropic.com/))
- For iOS: Xcode and iOS Simulator
- For Android: Android Studio and Android Emulator

### Installation

```bash
# Navigate to the mobile example
cd examples/mobile

# Install dependencies
npm install
# or
yarn install

# Copy environment template
cp .env.example .env
```

### Configuration

Edit `.env` and add your Anthropic API key:

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

> **Note**: You can also configure the API key directly in the app Settings (gear icon).

### Running the App

#### Web (Fastest for Development)

```bash
# Start both the proxy and web app
npm run dev

# Or run them separately:
npm run proxy    # Terminal 1
npm run web      # Terminal 2
```

Open [http://localhost:8081](http://localhost:8081) in your browser.

#### iOS

```bash
npm run ios
```

Requires macOS with Xcode installed.

#### Android

```bash
npm run android
```

Requires Android Studio with an emulator or physical device.

#### Start Expo Dev Server

```bash
npm start
```

Then scan the QR code with:
- **iOS**: Camera app
- **Android**: Expo Go app

## Day AI Setup (Optional)

To enable CRM access via MCP tools, connect to Day AI:

1. **Get OAuth Credentials**: From the SDK root directory:
   ```bash
   cd ../../  # Go to day-ai-sdk root
   yarn oauth:setup
   ```
   This will generate `CLIENT_ID`, `CLIENT_SECRET`, and `REFRESH_TOKEN`.

2. **Connect in Settings**:
   - Open the mobile app
   - Tap the gear icon (Settings)
   - Scroll to "Day AI Connection"
   - Enter your credentials
   - Tap "Connect"

3. **Verify Connection**: You'll see a green "Day AI" indicator in the header when connected.

**What You Get**: Access to 20+ MCP tools including:
- `search_objects` - Search contacts, organizations, opportunities
- `keyword_search` - Keyword-based CRM search
- `get_context_for_objects` - Detailed object context
- `get_meeting_recording_context` - Meeting transcripts
- And many more (see [SCHEMA.md](../../SCHEMA.md))

**Example Prompts** (with Day AI connected):
- "Find all contacts at Acme Corp"
- "Show me opportunities closing this week"
- "Get context for john@example.com"
- "What did we discuss in yesterday's meeting?"

## Usage

1. **First Launch**: The app will prompt you to configure your Anthropic API key
2. **Settings**: Tap the gear icon to:
   - Set/update your API key
   - Choose between Sonnet 4.5 (faster) or Opus 4.5 (more powerful)
   - Connect to Day AI (optional, for CRM access)
   - Clear chat history
3. **Chat**: Type a message and tap send
4. **Streaming**: Watch Claude's response appear in real-time
5. **Tool Calls**: When connected to Day AI, see when Claude uses MCP tools (expandable for details)
6. **History**: Your conversation is automatically saved

## Architecture

```
src/
├── components/
│   ├── ChatScreen.tsx       # Main chat interface
│   ├── MessageBubble.tsx    # Individual message display
│   ├── SettingsSheet.tsx    # Configuration modal
│   ├── ToolCallDisplay.tsx  # MCP tool call visualization
│   └── GlassView.tsx        # Reusable glass effect component
├── hooks/
│   └── useChat.ts           # Chat state management + tool execution
├── services/
│   ├── ClaudeService.ts     # Anthropic SDK with streaming + tools
│   └── DayAIService.ts      # Day AI OAuth + MCP client
├── types/
│   └── index.ts             # TypeScript definitions
└── config/
    └── env.ts               # Environment configuration
```

### Key Patterns

**Service Layer**: Business logic isolated from UI
- `ClaudeService`: Handles Anthropic API communication with streaming and tool support
- `DayAIService`: Manages Day AI OAuth, MCP client, and tool execution

**Hook Pattern**: State management via custom hooks
- `useChat`: Manages chat state, message history, API calls, tool execution, and persistence

**Component Composition**: Reusable UI components
- `GlassView`: Cross-platform frosted glass effect
- `MessageBubble`: Message rendering with role-based styling and tool calls
- `ToolCallDisplay`: Expandable tool call visualization with status
- `ChatScreen`: Main orchestrator component

**Tool Execution Flow**:
1. User sends message → `useChat.sendMessage()`
2. Get MCP tools from `DayAIService` (if connected)
3. Stream from Claude with tools via `ClaudeService`
4. On tool_use event → Execute via `DayAIService.executeTool()`
5. Display tool call with `ToolCallDisplay` component
6. Continue streaming with tool result

## Customization

### Change the Theme

Edit `tailwind.config.js` to customize colors:

```javascript
colors: {
  primary: {
    400: '#4a9a9a',  // Main brand color
    // ... other shades
  }
}
```

Edit gradient colors in `ChatScreen.tsx`:

```tsx
<LinearGradient
  colors={['#f0f9f9', '#e8f4f4', '#d9f0f0', '#e8f4f4']}
  // ... change these to your colors
/>
```

### Add Custom Features

**Example: Add voice input**
1. Install expo-av: `npx expo install expo-av`
2. Create `VoiceInput` component (see day-voice example)
3. Add to `ChatScreen` alongside text input

**Example: Add image generation**
1. Install an image generation SDK
2. Add tool call handling in `ClaudeService`
3. Display images in `MessageBubble`

### Modify System Prompt

Edit the system prompt in `src/services/ClaudeService.ts`:

```typescript
private getSystemPrompt(): string {
  return `You are [Your Custom AI]...`;
}
```

## Web Development (CORS Proxy)

The included proxy server (`server/proxy.js`) handles CORS issues when developing on web.

**Why?** Browsers block direct API calls to Anthropic due to CORS policies.

**How it works:**
1. Your web app → Proxy server → Anthropic API
2. Native apps (iOS/Android) don't need the proxy (no CORS restrictions)

The proxy is automatically started when you run `npm run dev`.

## Deployment

### Deploy to Expo (Easiest)

```bash
# Install Expo CLI globally
npm install -g eas-cli

# Login to Expo
eas login

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

### Deploy Web Version

The web build can be hosted anywhere (Vercel, Netlify, etc.):

```bash
# Build for web
npx expo export --platform web

# Deploy the web-build/ directory to your host
```

> **Important**: For production web deploys, you'll need to run the proxy server on a hosted backend or implement API key management differently.

## What's Included

✅ **Phase 1**: Text-based Claude chat with beautiful liquid glass UI
✅ **Phase 2**: Full Day AI MCP integration with tool call visualization

### Current Features:
- Claude streaming chat (Sonnet 4.5 / Opus 4.5)
- Day AI OAuth connection (manual token entry)
- 20+ MCP tools available when connected
- Real-time tool call visualization with expand/collapse
- Persistent chat history and credentials
- Cross-platform (iOS, Android, Web)

## Future Enhancements

- 🔐 **Full OAuth Flow**: One-tap connection with Expo AuthSession
- 📊 **Rich CRM Data Cards**: Beautiful visualization for contacts, opportunities, meetings
- 🎙️ **Voice Input/Output**: Adapt day-voice patterns for voice chat
- 📱 **Push Notifications**: Scheduled action reminders
- 💬 **Conversation Sharing**: Export and share chat sessions
- 🌐 **Offline Support**: Queue messages when offline

## Troubleshooting

### "API key not configured" error
- Make sure you've set `ANTHROPIC_API_KEY` in `.env` OR configured it in Settings

### Web app can't reach Anthropic API
- Ensure the proxy server is running: `npm run proxy`
- Check that `PROXY_URL` in `.env` matches your proxy server URL

### "Cannot find module" errors
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Clear Metro bundler cache: `npx expo start -c`

### iOS build fails
- Make sure Xcode is installed and up to date
- Run `npx pod-install` in the `ios/` directory (if it exists)

### Android build fails
- Ensure Android Studio is installed with an emulator
- Check that `ANDROID_HOME` environment variable is set

## Contributing

This is a template example. Feel free to:
- Fork and customize for your needs
- Submit issues or suggestions
- Share your builds with the community

## Resources

- [Anthropic API Documentation](https://docs.anthropic.com/)
- [Expo Documentation](https://docs.expo.dev/)
- [Day AI SDK Documentation](../../README.md)
- [NativeWind (Tailwind for React Native)](https://www.nativewind.dev/)

## License

MIT License - see [LICENSE](../../LICENSE) for details.

---

**Built with ❤️ using Day AI SDK**

Ready to build something amazing? Clone this example and start shipping!
