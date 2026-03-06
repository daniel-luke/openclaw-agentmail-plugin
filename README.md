# openclaw-agentmail-plugin

[AgentMail](https://agentmail.to) integration for [OpenClaw](https://openclaw.ai). Gives the AI agent a full email workflow: send messages, read the inbox, reply to threads, and get notified when new mail arrives — all via natural language.

## Features

- **Send emails** — ask the agent to write and send an email to anyone
- **Read the inbox** — list recent messages or fetch the full body of a specific email
- **Reply to threads** — the agent replies in the correct thread context automatically
- **Inbox monitoring** — a background polling loop checks for new mail and posts a notification to your configured channel
- **Automatic signature** — every outgoing message gets your configured plain-text signature appended, consistently
- **Language awareness** — the agent always responds in the same language as the incoming email or your request

## Requirements

- OpenClaw ≥ 2026.1.30
- An [AgentMail](https://agentmail.to) account with an existing inbox and API key

## Installation

Add the plugin to your OpenClaw configuration (`~/.openclaw/openclaw.json`):

```json
{
  "plugins": {
    "load": {
      "paths": ["/path/to/custom-plugins"]
    },
    "entries": {
      "openclaw-agentmail-plugin": {
        "enabled": true,
        "config": {
          "apiKey": "your-agentmail-api-key",
          "inboxId": "your-inbox-id",
          "signature": "Kind regards,\nYour Name",
          "pollingIntervalMinutes": 5,
          "notificationChannel": "telegram"
        }
      }
    }
  }
}
```

## Configuration

| Field | Required | Description |
|---|---|---|
| `apiKey` | ✅ | Your AgentMail API key (Bearer token) — get it from the [AgentMail console](https://console.agentmail.to) |
| `inboxId` | ✅ | The ID of your existing AgentMail inbox |
| `signature` | ✅ | Plain-text signature appended to every outgoing email |
| `pollingIntervalMinutes` | | How often (in minutes) to check for new mail. Defaults to `5` |
| `notificationChannel` | | OpenClaw channel ID to post new-email notifications to (e.g. `telegram`) |

## How inbox monitoring works

The plugin runs a background polling loop at the configured interval. On each cycle it fetches inbox messages and looks for any that have not yet been processed (tracked via an `agent-seen` label stored server-side on AgentMail). For each new message it:

1. Posts a notification to the configured channel — e.g.:
   ```
   New email from alice@example.com — "Project proposal"
   Preview: Hi, I wanted to share the updated proposal...
   Use email_get with message_id "..." to read it.
   ```
2. Marks the message as `agent-seen` so it won't be reported again

The agent also sees a live inbox summary (unseen count + recent subjects) injected into every conversation turn, so it can proactively mention new mail.

## CLI commands

| Command | Description |
|---|---|
| `openclaw email list` | Show the 10 most recent inbox messages with seen/new status |
| `openclaw email poll` | Trigger a manual inbox poll immediately |

## Agent tools

| Tool | Description |
|---|---|
| `email_send` | Send a new email (signature appended automatically) |
| `email_list` | List recent inbox message summaries |
| `email_get` | Fetch the full body of a specific message |
| `email_reply` | Reply to an existing thread (signature appended automatically) |
| `email_mark_seen` | Mark a message as seen to suppress future notifications |

## Example interactions

> "Send an email to jan@example.com about the meeting tomorrow at 10am"

> "Do I have any new emails?"

> "Read the email from Sarah"

> "Reply and tell her I'll have the report ready by Friday"

> "Forward that email to my colleague at tom@example.com"
