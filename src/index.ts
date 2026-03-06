import { AgentMailClient } from './agentmail-client.js'
import { makeSendEmailTool } from './tools/email-send.js'
import { makeListEmailsTool } from './tools/email-list.js'
import { makeGetEmailTool } from './tools/email-get.js'
import { makeReplyEmailTool } from './tools/email-reply.js'
import { makeMarkSeenTool, AGENT_SEEN_LABEL } from './tools/email-mark-seen.js'

interface PluginConfig {
  apiKey: string
  inboxId: string
  signature: string
  pollingIntervalMinutes?: number
  notificationChannel?: string
}

interface UnseenCache {
  count: number
  subjects: string[]
}

interface PluginState {
  client?: AgentMailClient
  config?: PluginConfig
  unseenCache?: UnseenCache
  pollingTimer?: ReturnType<typeof setInterval>
}

// OpenClaw plugin API — types are inferred from usage since the SDK types
// may not be installed. Adjust if openclaw exports a typed package.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function register(api: any): void {
  const state: PluginState = {}

  const sendToChannel = async (channelId: string, message: string): Promise<void> => {
    try {
      await api.runtime?.channels?.send?.(channelId, message)
    } catch {
      api.logger?.info(`[agentmail-plugin] Channel notification (${channelId}): ${message}`)
    }
  }

  const pollInbox = async (): Promise<void> => {
    if (!state.client || !state.config) return
    try {
      const messages = await state.client.listMessages({ limit: 50 })
      const unseen = messages.filter((m) => !m.labels.includes(AGENT_SEEN_LABEL))

      // Keep the hook cache fresh regardless of whether there's a notification channel
      state.unseenCache = {
        count: unseen.length,
        subjects: unseen.slice(0, 5).map((m) => m.subject),
      }

      if (unseen.length === 0 || !state.config.notificationChannel) return

      for (const msg of unseen) {
        const lines = [
          `New email from ${msg.from} — "${msg.subject}"`,
          msg.preview ? `Preview: ${msg.preview}` : '',
          `Use email_get with message_id "${msg.message_id}" to read it.`,
        ].filter(Boolean)

        await sendToChannel(state.config.notificationChannel, lines.join('\n'))
        await state.client.updateMessage(msg.message_id, { labels: [AGENT_SEEN_LABEL] })
      }
    } catch (err) {
      api.logger?.warn('[agentmail-plugin] Poll error:', err)
    }
  }

  api.registerService?.({
    id: 'agentmail',
    async start() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = api.config as any

      // Try known config locations (direct, nested .config, plugins.entries path)
      const config: PluginConfig =
        raw?.apiKey ? raw
        : raw?.config?.apiKey ? raw.config
        : (raw?.plugins?.entries?.['openclaw-agentmail-plugin']?.config ?? {})

      state.config = config
      state.client = new AgentMailClient(config.apiKey, config.inboxId)
      state.unseenCache = { count: 0, subjects: [] }

      const intervalMs = (config.pollingIntervalMinutes ?? 5) * 60 * 1000

      // Initial poll on startup
      await pollInbox()

      // Recurring background poll
      state.pollingTimer = setInterval(() => {
        pollInbox().catch((err) =>
          api.logger?.warn('[agentmail-plugin] Interval poll error:', err),
        )
      }, intervalMs)

      api.logger?.info(
        `[agentmail-plugin] Started — inbox ${config.inboxId}, polling every ${config.pollingIntervalMinutes ?? 5} minutes`,
      )
    },
  })

  // Inject inbox status into every agent turn so the LLM is aware of pending mail
  api.registerHook?.(
    'command:new',
    async () => {
      if (!state.config || !state.unseenCache) return undefined
      const { count, subjects } = state.unseenCache
      const lines = [
        `## Email Inbox`,
        `Inbox ID: ${state.config.inboxId}`,
        `Unseen messages: ${count}`,
      ]
      if (subjects.length > 0) {
        lines.push(`Recent subjects: ${subjects.join(', ')}`)
      }
      return { systemContext: lines.join('\n') }
    },
    { description: 'Inject email inbox status for agent awareness' },
  )

  api.registerTool?.(
    makeSendEmailTool(
      () => state.client!,
      () => state.config?.signature ?? '',
    ),
  )
  api.registerTool?.(makeListEmailsTool(() => state.client!))
  api.registerTool?.(makeGetEmailTool(() => state.client!))
  api.registerTool?.(
    makeReplyEmailTool(
      () => state.client!,
      () => state.config?.signature ?? '',
    ),
  )
  api.registerTool?.(makeMarkSeenTool(() => state.client!))

  api.registerCli?.({
    name: 'email',
    description: 'AgentMail plugin commands',
    subcommands: [
      {
        name: 'list',
        description: 'Show the 10 most recent inbox messages',
        async handler() {
          if (!state.client) {
            console.error('Plugin not yet started. Try again in a moment.')
            return
          }
          const messages = await state.client.listMessages({ limit: 10 })
          if (messages.length === 0) {
            console.log('No messages found.')
            return
          }
          for (const msg of messages) {
            const tag = msg.labels.includes(AGENT_SEEN_LABEL) ? '[seen]' : '[new] '
            console.log(`${tag} ${msg.timestamp} | from: ${msg.from} | subject: ${msg.subject}`)
          }
        },
      },
      {
        name: 'poll',
        description: 'Manually trigger an inbox poll now',
        async handler() {
          if (!state.client) {
            console.error('Plugin not yet started. Try again in a moment.')
            return
          }
          console.log('Polling inbox...')
          await pollInbox()
          console.log('Done.')
        },
      },
    ],
  })
}
