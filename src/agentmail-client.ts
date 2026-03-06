const BASE_URL = 'https://api.agentmail.to/v0'

export interface AgentMailMessage {
  inbox_id: string
  thread_id: string
  message_id: string
  labels: string[]
  timestamp: string
  from: string
  to: string[]
  cc: string[]
  subject: string
  preview: string
  text?: string
  html?: string
  in_reply_to?: string
  created_at: string
  updated_at: string
}

export interface ListMessagesParams {
  limit?: number
  after?: string
  labels?: string[]
  ascending?: boolean
  page_token?: string
}

export interface SendMessageBody {
  to: string | string[]
  subject: string
  text?: string
  html?: string
  cc?: string | string[]
  bcc?: string | string[]
}

export interface ReplyMessageBody {
  text?: string
  html?: string
  reply_all?: boolean
  cc?: string | string[]
  bcc?: string | string[]
}

export class AgentMailClient {
  constructor(
    private readonly apiKey: string,
    private readonly inboxId: string,
  ) {}

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    }
  }

  async listMessages(params: ListMessagesParams = {}): Promise<AgentMailMessage[]> {
    const url = new URL(`${BASE_URL}/inboxes/${this.inboxId}/messages`)
    if (params.limit !== undefined) url.searchParams.set('limit', String(params.limit))
    if (params.after) url.searchParams.set('after', params.after)
    if (params.ascending !== undefined) url.searchParams.set('ascending', String(params.ascending))
    if (params.page_token) url.searchParams.set('page_token', params.page_token)
    if (params.labels) params.labels.forEach((l) => url.searchParams.append('labels', l))

    const res = await fetch(url.toString(), { headers: this.headers() })
    if (!res.ok) throw new Error(`AgentMail API error ${res.status}: ${await res.text()}`)
    const data = (await res.json()) as { messages: AgentMailMessage[] }
    return data.messages ?? []
  }

  async getMessage(messageId: string): Promise<AgentMailMessage> {
    const res = await fetch(`${BASE_URL}/inboxes/${this.inboxId}/messages/${messageId}`, {
      headers: this.headers(),
    })
    if (!res.ok) throw new Error(`AgentMail API error ${res.status}: ${await res.text()}`)
    return res.json() as Promise<AgentMailMessage>
  }

  async sendMessage(body: SendMessageBody): Promise<{ message_id: string; thread_id: string }> {
    const res = await fetch(`${BASE_URL}/inboxes/${this.inboxId}/messages/send`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`AgentMail API error ${res.status}: ${await res.text()}`)
    return res.json() as Promise<{ message_id: string; thread_id: string }>
  }

  async replyToMessage(
    messageId: string,
    body: ReplyMessageBody,
  ): Promise<{ message_id: string; thread_id: string }> {
    const res = await fetch(`${BASE_URL}/inboxes/${this.inboxId}/messages/${messageId}/reply`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`AgentMail API error ${res.status}: ${await res.text()}`)
    return res.json() as Promise<{ message_id: string; thread_id: string }>
  }

  async updateMessage(messageId: string, patch: { labels?: string[] }): Promise<void> {
    const res = await fetch(`${BASE_URL}/inboxes/${this.inboxId}/messages/${messageId}`, {
      method: 'PATCH',
      headers: this.headers(),
      body: JSON.stringify(patch),
    })
    if (!res.ok) throw new Error(`AgentMail API error ${res.status}: ${await res.text()}`)
  }
}
