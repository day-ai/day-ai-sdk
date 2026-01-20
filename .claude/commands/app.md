# /app - Guide User Through Building a New App

When the user runs `/app`, help them create a new application integrated with Day AI. Guide them through the planning and implementation process.

## Step 1: Understand Their Goal

Ask clarifying questions to understand what they want to build:

**Questions to Ask:**
- What problem are you trying to solve?
- What will users do with this app?
- What data will it work with? (notes, tasks, bugs, opportunities, etc.)
- Where will it run? (desktop, web, CLI, mobile, serverless)
- Will it be interactive (chat interface) or automated (cron job, background task)?

## Step 2: Choose a Template

Based on their answers, recommend one of our example apps as a starting point:

### Desktop Apps (Electron + React)
**Use `examples/desktop/` when:**
- User wants a native desktop application
- Needs a rich UI with multiple panels/views
- Wants real-time interaction with an AI agent
- Working with local data that needs persistence
- Example use cases: bug tracker, note-taking, CRM dashboard, project manager

**Template provides:**
- Electron main/renderer architecture with IPC
- React + TypeScript + Tailwind UI
- Claude AI chat with streaming
- Day AI OAuth + MCP integration
- Native tools (CRUD operations on local data)
- Glass-morphism dark theme

### Serverless Automation (Vercel/Next.js)
**Use `examples/vercel-weather-cron/` when:**
- User wants scheduled automation (cron jobs)
- Needs to enrich Day AI CRM with external data
- Building a notification/digest system
- No heavy UI required (simple dashboard for testing)
- Example use cases: daily digests, data sync, monitoring alerts, scheduled reports

**Template provides:**
- Next.js 14 with App Router
- Vercel Cron configuration
- Day AI SDK integration
- API route handlers (Node.js runtime)
- Simple React dashboard for testing
- Liquid glass dark mode UI

## Step 3: Plan the Implementation

Work with the user to plan:

### A. Define the Object-of-Work
- What's the primary entity users will interact with?
- What properties does it have?
- How will it be stored? (local JSON, database, file system)

### B. Identify Native Tools
Tools the app provides to the AI agent for working with local data:
- Read operations (get_item, search_items, list_items)
- Write operations (create_item, update_item, delete_item)
- Any domain-specific operations

### C. Identify Day AI MCP Tools to Use
Which Day AI tools will enhance the app?
- `search_objects` - Find people, orgs, opportunities
- `get_context_for_objects` - Get full CRM context
- `get_meeting_recording_context` - Access meeting transcripts
- `create_or_update_person_organization` - Enrich CRM
- `send_notification` - Email/Slack notifications
- `create_page` - Generate documents
- See SCHEMA.md for full list

### D. Design the System Prompt
How should the AI understand its role?
- What can it do?
- What are the boundaries?
- What's the user's workflow?

## Step 4: Implementation Approach

### For Desktop Apps (based on examples/desktop/):

1. **Copy the template:**
   ```bash
   cp -r examples/desktop examples/my-new-app
   cd examples/my-new-app
   ```

2. **Update the data model:**
   - Edit `src/types/index.ts` - define your object type
   - Update native tools in `electron/services/tools.ts`
   - Modify tool handlers in `electron/services/ToolExecutor.ts`

3. **Customize the UI:**
   - Update `src/components/` to display your data
   - Modify `src/App.tsx` for layout changes
   - Keep the 3-panel layout or simplify as needed

4. **Update the system prompt:**
   - Edit `electron/services/AgentService.ts`
   - Define how the AI should behave for your use case

5. **Test and iterate:**
   - Run `npm install && npm run dev`
   - Test AI interactions
   - Refine tools and prompts based on behavior

### For Serverless Apps (based on examples/vercel-weather-cron/):

1. **Copy the template:**
   ```bash
   cp -r examples/vercel-weather-cron examples/my-new-cron
   cd examples/my-new-cron
   ```

2. **Update the data source:**
   - Edit `lib/weather.ts` (rename to match your domain)
   - Replace weather API with your data source (stocks, news, etc.)
   - Update data formatting

3. **Customize the automation:**
   - Edit `app/api/cron/[name]/route.ts`
   - Define what happens on schedule
   - Choose Day AI MCP tools to call

4. **Configure the schedule:**
   - Edit `vercel.json` cron settings
   - Set frequency (hourly, daily, weekly)

5. **Deploy to Vercel:**
   - Set environment variables in Vercel dashboard
   - Deploy and test with manual trigger first
   - Monitor cron logs

## Step 5: Key Patterns to Follow

### The Object-of-Work Pattern
```
User's App Data ← → AI Agent ← → Day AI CRM
     (Notes)              ↕              (Contacts, Meetings, Opps)
                    Native Tools    MCP Tools
```

The AI bridges both worlds, understanding local app data AND full CRM context.

### Native Tools Design
- **Simple, focused**: One tool = one operation
- **Descriptive names**: `update_note` not `modify_data`
- **Clear schemas**: AI needs to know exactly what parameters to pass
- **Good descriptions**: Explain when/why to use each tool

### System Prompt Guidelines
- Explain the app's purpose
- List available tools (native + MCP)
- Define user workflow patterns
- Set boundaries (what NOT to do)
- Give examples of good interactions

## Step 6: Common Customizations

### Change the Theme
- Desktop: Edit `src/index.css` glass-panel classes
- Vercel: Edit `app/globals.css` glass effects
- Use Tailwind utilities for quick changes

### Add Authentication
- Desktop: Already has Day AI OAuth
- Vercel: Add NextAuth.js or similar
- Use Day AI OAuth for SSO

### Add Database
- Desktop: Use better-sqlite3 or local JSON files
- Vercel: Use Vercel Postgres, KV, or external DB
- Keep it simple initially

### Deploy
- Desktop: Use electron-builder (already configured)
- Vercel: `vercel deploy` or GitHub integration
- Set environment variables in production

## Examples of Apps You Can Build

### Desktop Apps:
- **Bug Tracker**: Track bugs, link to Day AI contacts who reported them
- **Sales Pipeline Manager**: Manage deals, pull Day AI opportunity context
- **Meeting Prep Tool**: Prepare for meetings, access attendee history
- **Customer Success Dashboard**: Track customer health, recent interactions
- **Project Manager**: Track projects, link to Day AI organizations

### Serverless Apps:
- **Daily CRM Digest**: Email summary of pipeline changes
- **Lead Enrichment**: Sync company data to Day AI organizations
- **Meeting Reminder**: Send pre-meeting briefings via email
- **Data Sync**: Keep external tools in sync with Day AI
- **Alert System**: Monitor metrics, send notifications

## Tips for Success

1. **Start simple**: Clone an example, make minimal changes first
2. **Test iteratively**: Run the app often, see what works
3. **Focus on tools**: Good tool design = good AI behavior
4. **Use SCHEMA.md**: Reference for all Day AI MCP tools
5. **Ask Claude**: Run `claude` for help debugging
6. **Commit often**: Save progress as you build

## Next Steps

After understanding the user's goal:
1. Recommend the best template to start from
2. Help them plan the customizations needed
3. Guide them through implementation step-by-step
4. Test and refine the AI behavior together
5. Help with deployment when ready

Remember: These templates are production-ready starting points, not just demos. The user should be able to ship a working app in hours, not weeks.
