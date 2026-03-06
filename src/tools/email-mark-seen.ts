import type { AgentMailClient } from '../agentmail-client.js'

export const AGENT_SEEN_LABEL = 'agent-seen'

export function makeMarkSeenTool(getClient: () => AgentMailClient) {
  return {
    name: 'email_mark_seen',
    description:
      'Mark an email as seen by the agent (adds the "agent-seen" label). The polling loop does this automatically when notifying, but you can call this manually to suppress future notifications for a message.',
    parameters: {
      type: 'object' as const,
      properties: {
        message_id: {
          type: 'string',
          description: 'The message_id of the email to mark as seen',
        },
      },
      required: ['message_id'],
    },
    async execute(_ctx: unknown, { message_id }: { message_id: string }): Promise<unknown> {
      await getClient().updateMessage(message_id, { labels: [AGENT_SEEN_LABEL] })
      return { success: true, message_id }
    },
  }
}
