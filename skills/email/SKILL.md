---
name: email
description: Send and receive emails, monitor the inbox, and reply to messages via AgentMail
user-invocable: false
command-dispatch: tool
---

# Email

You have access to an email inbox via AgentMail. The inbox status (unseen message count and recent subjects) is injected into your context at the start of each conversation under the `## Email Inbox` section.

## Language

**Always respond in the same language as the incoming email or the user's request.**

- Before composing any reply, determine the language from the email's subject and body.
- If the user asks you to reply to an email, match the language of that email — not the language the user used to ask you.
- If you cannot determine the language, default to English.

## Signature

The configured signature is appended **automatically** by `email_send` and `email_reply`. Never write a signature yourself — the tool handles it.

## Sending a New Email

Use `email_send` with `to`, `subject`, and `body`. Match the requested language and tone. Omit the signature from the body.

## Reading Emails

- Use `email_list` to get a summary of recent messages (sender, subject, preview, timestamp).
- Use `email_get` with a `message_id` to fetch the full body before replying or summarising.
- **Always call `email_get` before replying** — never reply based on the preview alone.

## Replying to Emails

1. Call `email_get` to read the original message in full.
2. Detect the language from the original email's body and subject.
3. Compose a reply in that language, matching the formality level (formal/informal).
4. Call `email_reply` with the `message_id` and `body`. Omit any signature from the body.
5. Confirm to the user: "Replied to [sender] in [language]."

## Monitoring the Inbox

- When the `## Email Inbox` context shows unseen messages, proactively mention them to the user.
- Example: "You have 2 new emails — one from alice@example.com ('Meeting tomorrow') and one from bob@example.com ('Invoice #123'). Would you like me to read them?"
- After notifying, new emails are automatically marked as seen by the polling loop. You can also call `email_mark_seen` manually if needed.

## Tone

Match the formality of the incoming email:
- A formal business email → formal reply
- A casual message → relaxed, conversational reply
- A newsletter or automated message → no reply needed unless the user asks
