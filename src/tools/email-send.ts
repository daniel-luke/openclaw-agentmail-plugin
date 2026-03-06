import type { AgentMailClient } from '../agentmail-client.js'

export function makeSendEmailTool(
  getClient: () => AgentMailClient,
  getSignature: () => string,
) {
  return {
    name: 'email_send',
    description:
      'Send a new email from the agent inbox. The configured signature is appended automatically — do NOT write one in the body.',
    parameters: {
      type: 'object' as const,
      properties: {
        to: { type: 'string', description: 'Recipient email address' },
        subject: { type: 'string', description: 'Email subject line' },
        body: {
          type: 'string',
          description: 'Plain-text email body. Do not include a signature — it is added automatically.',
        },
        cc: { type: 'string', description: 'CC recipient address (optional)' },
        bcc: { type: 'string', description: 'BCC recipient address (optional)' },
      },
      required: ['to', 'subject', 'body'],
    },
    async execute(
      _ctx: unknown,
      {
        to,
        subject,
        body,
        cc,
        bcc,
      }: { to: string; subject: string; body: string; cc?: string; bcc?: string },
    ): Promise<unknown> {
      const sig = getSignature()
      const fullBody = sig ? `${body}\n\n${sig}` : body
      const result = await getClient().sendMessage({ to, subject, text: fullBody, cc, bcc })
      return { success: true, ...result }
    },
  }
}
