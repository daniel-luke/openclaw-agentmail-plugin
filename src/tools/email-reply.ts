import type { AgentMailClient } from '../agentmail-client.js'

export function makeReplyEmailTool(
  getClient: () => AgentMailClient,
  getSignature: () => string,
) {
  return {
    name: 'email_reply',
    description:
      'Reply to an existing email. The configured signature is appended automatically — do NOT write one in the body. Always call email_get first to read the original message before replying.',
    parameters: {
      type: 'object' as const,
      properties: {
        message_id: {
          type: 'string',
          description: 'The message_id of the email to reply to',
        },
        body: {
          type: 'string',
          description:
            'Plain-text reply body. Do not include a signature — it is added automatically.',
        },
        reply_all: {
          type: 'boolean',
          description: 'Reply to all original recipients (default: false)',
        },
        cc: {
          type: 'string',
          description: 'Additional CC recipient address (optional)',
        },
      },
      required: ['message_id', 'body'],
    },
    async execute(
      _ctx: unknown,
      {
        message_id,
        body,
        reply_all = false,
        cc,
      }: { message_id: string; body: string; reply_all?: boolean; cc?: string },
    ): Promise<unknown> {
      const sig = getSignature()
      const fullBody = sig ? `${body}\n\n${sig}` : body
      const result = await getClient().replyToMessage(message_id, {
        text: fullBody,
        reply_all,
        cc,
      })
      return { success: true, ...result }
    },
  }
}
