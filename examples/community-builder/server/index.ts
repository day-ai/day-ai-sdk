import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { runAgentLoop, type CommunityMember } from './agent.js'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

app.post('/api/sync', async (req, res) => {
  const member = req.body as CommunityMember

  if (!member.email) {
    res.status(400).json({ error: 'Email is required' })
    return
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  const send = (event: Record<string, unknown>) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`)
  }

  try {
    await runAgentLoop(member, send)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown server error'
    send({ type: 'error', message })
  } finally {
    res.end()
  }
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
