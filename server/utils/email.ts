import type { CloudflareEnv } from '../types/cloudflare-env'

type EmailRecipient = {
  email?: string | null
  name?: string | null
}

export type SendEmailInput = {
  to: EmailRecipient | EmailRecipient[]
  subject: string
  text: string
  html?: string
}

function normalizeRecipients(to: EmailRecipient | EmailRecipient[]): EmailRecipient[] {
  return (Array.isArray(to) ? to : [to])
    .map((item) => ({
      email: typeof item.email === 'string' ? item.email.trim() : '',
      name: typeof item.name === 'string' ? item.name.trim() : '',
    }))
    .filter((item) => item.email)
}

export async function sendEmail(env: CloudflareEnv, input: SendEmailInput): Promise<{ ok: boolean; skipped?: boolean; reason?: string }> {
  const recipients = normalizeRecipients(input.to)
  if (!recipients.length) {
    return { ok: true, skipped: true, reason: 'no_recipients' }
  }

  if (!env.GMAIL_SMTP_USER || !env.GMAIL_SMTP_APP_PASSWORD) {
    console.warn('[email] SMTP Gmail credentials are not configured. Email skipped:', input.subject)
    return { ok: true, skipped: true, reason: 'missing_smtp_config' }
  }

  // Cloudflare Workers do not expose raw TCP sockets for SMTP. Keep this adapter
  // isolated so booking/approval flows keep working until deployment provides a
  // Node runtime or SMTP relay endpoint.
  if (!env.SMTP_RELAY_URL) {
    console.warn('[email] SMTP_RELAY_URL is not configured. Gmail SMTP email skipped:', input.subject)
    return { ok: true, skipped: true, reason: 'missing_smtp_relay' }
  }

  const res = await fetch(env.SMTP_RELAY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.GMAIL_SMTP_APP_PASSWORD}`,
    },
    body: JSON.stringify({
      provider: 'gmail-smtp',
      username: env.GMAIL_SMTP_USER,
      from: env.EMAIL_FROM || env.GMAIL_SMTP_USER,
      to: recipients,
      subject: input.subject,
      text: input.text,
      html: input.html || input.text.replace(/\n/g, '<br>'),
    }),
  })

  if (!res.ok) {
    console.warn('[email] SMTP relay returned non-OK:', res.status, input.subject)
    return { ok: false, reason: `relay_${res.status}` }
  }

  return { ok: true }
}
