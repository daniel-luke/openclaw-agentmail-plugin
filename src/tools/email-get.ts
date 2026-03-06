import type { AgentMailClient } from '../agentmail-client.js'

export function makeGetEmailTool(getClient: () => AgentMailClient) {
  return {
    name: 'email_get',
    description:
      'Fetch the full content (body, subject, sender, thread ID) of a specific email by its message_id. Always call this before replying to ensure you have the full context.',
    parameters: {
      type: 'object' as const,
      properties: {
        message_id: {
          type: 'string',
          description: 'The message_id of the email to retrieve',
        },
      },
      required: ['message_id'],
    },
    async execute(_ctx: unknown, { message_id }: { message_id: string }): Promise<unknown> {
      const msg = await getClient().getMessage(message_id)
      return {
        message_id: msg.message_id,
        thread_id: msg.thread_id,
        from: msg.from,
        to: msg.to,
        cc: msg.cc,
        subject: msg.subject,
        timestamp: msg.timestamp,
        labels: msg.labels,
        text: msg.text,
        html: msg.html,
        in_reply_to: msg.in_reply_to,
      }
    },
  }
}
