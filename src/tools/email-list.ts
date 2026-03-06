import type { AgentMailClient } from '../agentmail-client.js'

export function makeListEmailsTool(getClient: () => AgentMailClient) {
  return {
    name: 'email_list',
    description:
      'List recent messages in the inbox. Returns summaries: sender, subject, preview, timestamp, and labels. Use email_get to fetch the full body of a specific message.',
    parameters: {
      type: 'object' as const,
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of messages to return (default: 20)',
        },
        after: {
          type: 'string',
          description: 'Only return messages after this ISO 8601 timestamp (optional)',
        },
      },
      required: [],
    },
    async execute(
      _ctx: unknown,
      { limit = 20, after }: { limit?: number; after?: string },
    ): Promise<unknown> {
      const messages = await getClient().listMessages({ limit, after })
      return messages.map(({ message_id, from, subject, preview, timestamp, labels }) => ({
        message_id,
        from,
        subject,
        preview,
        timestamp,
        labels,
      }))
    },
  }
}
