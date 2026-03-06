# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this plugin does

OpenClaw plugin that gives the AI agent a full email workflow via AgentMail: send emails, read the inbox, reply to threads, and proactively monitor for new mail. Incoming notifications are posted to a configurable OpenClaw channel. The agent always responds in the same language as the incoming email or user request, and every outgoing message carries a configurable plain-text signature.

## Architecture

```
src/
  index.ts                    Plugin entrypoint — registers service, hook, tools, and CLI
  agentmail-client.ts         Thin fetch wrapper for the AgentMail REST API
  tools/
    email-send.ts             Tool: send a new email (auto-appends signature)
    email-list.ts             Tool: list recent inbox message summaries
    email-get.ts              Tool: fetch full body of a specific message
    email-reply.ts            Tool: reply to an existing message (auto-appends signature)
    email-mark-seen.ts        Tool: mark a message as seen (adds "agent-seen" label)
skills/
  email/SKILL.md              Instructs the agent on language, tone, signature, and inbox monitoring
```

### Key design decisions

- **No local state file**: read/unread tracking uses AgentMail's own label system. Messages processed by the polling loop receive an `"agent-seen"` label on the server. This survives plugin restarts without any local file.
- **Polling via `setInterval`**, not OpenClaw's native cron system. OpenClaw cron creates a full isolated agent session on every trigger (spending tokens). A background `setInterval` loop only calls the AgentMail HTTP API; tokens are spent only when the agent processes a channel notification.
- **Ambient context injection**: a `command:new` hook injects inbox status (unseen count + recent subjects) into every agent turn so the LLM is always aware of pending mail without a tool call.
- **Signature injection is done in code**, not by the agent. `email_send` and `email_reply` append the configured `signature` to the body before calling the API. The skill file instructs the agent never to write a signature manually.
- **Language detection is the agent's responsibility** — the skill file instructs it to detect the language of the incoming email and respond in kind.

## Plugin configuration (openclaw.json)

```json
{
  "plugins": {
    "entries": {
      "openclaw-agentmail-plugin": {
        "enabled": true,
        "config": {
          "apiKey": "<your-agentmail-api-key>",
          "inboxId": "<your-inbox-id>",
          "signature": "Kind regards,\nYour Name",
          "pollingIntervalMinutes": 5,
          "notificationChannel": "telegram"
        }
      }
    }
  }
}
```

## AgentMail REST API surface used

Base URL: `https://api.agentmail.to/v0`
Auth: `Authorization: Bearer <apiKey>` on every request.

| Method | Path | Used for |
|--------|------|----------|
| GET | `/inboxes/{inbox_id}/messages` | List messages (polling + email_list) |
| GET | `/inboxes/{inbox_id}/messages/{message_id}` | Full message body (email_get) |
| POST | `/inboxes/{inbox_id}/messages/send` | Send new email (email_send) |
| POST | `/inboxes/{inbox_id}/messages/{message_id}/reply` | Reply to thread (email_reply) |
| PATCH | `/inboxes/{inbox_id}/messages/{message_id}` | Update labels (email_mark_seen + polling loop) |

## CLI commands

```
openclaw email list    # Show the 10 most recent inbox messages
openclaw email poll    # Trigger a manual poll cycle immediately
```

## Adding new tools

1. Create `src/tools/email-<name>.ts` following the maker-function pattern in existing tools (export a `make<Name>Tool(...)` function returning `{ name, description, parameters, execute }`)
2. Import and register with `api.registerTool?.(make<Name>Tool(...))` in `src/index.ts`
3. Update `skills/email/SKILL.md` if the agent needs guidance on when or how to use it

## Development

```bash
npm install          # Install dev dependencies
npx tsc --noEmit     # Type-check without emitting
```

No build step is needed — OpenClaw loads `src/index.ts` directly via the `openclaw.extensions` entry in `package.json`.
