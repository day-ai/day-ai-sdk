export interface CommunityMember {
  email: string
  linkedInUrl: string
  firstName: string
  lastName: string
  howICanHelp: string
  whereINeedHelp: string
}

export type AgentEvent =
  | { type: 'status'; message: string }
  | { type: 'tool_call'; name: string; args: Record<string, unknown> }
  | { type: 'tool_result'; name: string; success: boolean }
  | { type: 'text_delta'; content: string }
  | { type: 'answer'; content: string }
  | { type: 'complete'; message: string }
  | { type: 'error'; message: string }
