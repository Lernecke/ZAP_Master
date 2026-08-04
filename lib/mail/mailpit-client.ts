import nodemailer from "nodemailer"

/**
 * Mailpit / Inbucket Client for sending local verification and transactional emails.
 * Supports Mailpit HTTP API (Supabase Docker Mailpit at http://127.0.0.1:54324/api/v1/send or standalone at http://127.0.0.1:8025/api/v1/send)
 * and Nodemailer SMTP (port 1025 / SMTP_PORT).
 */
export async function sendVerificationEmailMailpit({
  email,
  url,
}: {
  email: string
  url: string
}) {
  const from = process.env.MAIL_FROM_ADDRESS || "noreply@zap.ch"
  const subject = "E-Mail-Adresse bestätigen – ZAP v2"
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px;">
      <h2 style="color: #2563eb;">Willkommen bei ZAP v2!</h2>
      <p>Bitte klicke auf den folgenden Link, um deine E-Mail-Adresse zu bestätigen:</p>
      <p style="margin: 24px 0;">
        <a href="${url}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
          E-Mail-Adresse bestätigen
        </a>
      </p>
      <p style="color: #666666; font-size: 14px;">Falls du kein Konto erstellt hast, kannst du diese Nachricht ignorieren.</p>
    </div>
  `

  // 1. Try Mailpit REST API (Supabase Docker Mailpit at http://127.0.0.1:54324 or standalone at http://127.0.0.1:8025)
  const mailpitApiUrls = [
    process.env.MAILPIT_API_URL,
    "http://127.0.0.1:54324/api/v1/send",
    "http://localhost:54324/api/v1/send",
    "http://127.0.0.1:8025/api/v1/send",
    "http://localhost:8025/api/v1/send",
  ].filter(Boolean) as string[]

  for (const apiUrl of mailpitApiUrls) {
    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          From: { Email: from, Name: "ZAP v2" },
          To: [{ Email: email }],
          Subject: subject,
          HTML: html,
        }),
        signal: AbortSignal.timeout(1500),
      })

      if (res.ok) {
        const body = await res.json()
        console.log(`[Mailpit API] Verification email delivered to ${email} via HTTP API (${apiUrl}): ${body?.ID || 'OK'}`)
        return { success: true }
      }
    } catch {
      // Continue to next URL or SMTP fallback
    }
  }

  // 2. Try Nodemailer SMTP (e.g. standalone Mailpit on port 1025)
  const smtpHost = process.env.SMTP_HOST || "127.0.0.1"
  const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 1025

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: false,
      tls: { rejectUnauthorized: false },
      connectionTimeout: 1000,
      greetingTimeout: 1000,
    })

    const info = await transporter.sendMail({
      from,
      to: email,
      subject,
      html,
    })
    console.log(`[Mailpit SMTP] Verification email sent to ${email} via SMTP (${smtpHost}:${smtpPort}): ${info.messageId}`)
    return { success: true }
  } catch (smtpErr) {
    console.warn(`[Mailpit] Local SMTP/HTTP not available (${smtpErr instanceof Error ? smtpErr.message : String(smtpErr)}).`)
    console.log(`\n==================================================`)
    console.log(`[DEV VERIFICATION LINK]`)
    console.log(`To: ${email}`)
    console.log(`Link: ${url}`)
    console.log(`==================================================\n`)

    return { success: true }
  }
}

/**
 * Mailpit / Inbucket Client for sending local Magic Link emails.
 */
export async function sendMagicLinkEmailMailpit({
  email,
  url,
}: {
  email: string
  url: string
}) {
  const from = process.env.MAIL_FROM_ADDRESS || "noreply@zap.ch"
  const subject = "Dein Login-Link für ZAP v2"
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px;">
      <h2 style="color: #2563eb;">Anmeldung bei ZAP v2</h2>
      <p>Klicke auf den folgenden Link, um dich ohne Passwort anzumelden:</p>
      <p style="margin: 24px 0;">
        <a href="${url}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
          Jetzt anmelden
        </a>
      </p>
      <p style="color: #666666; font-size: 14px;">Dieser Link ist zeitlich begrenzt gültig. Falls du diesen Link nicht angefordert hast, kannst du diese Nachricht einfach ignorieren.</p>
    </div>
  `

  // 1. Try Mailpit REST API
  const mailpitApiUrls = [
    process.env.MAILPIT_API_URL,
    "http://127.0.0.1:54324/api/v1/send",
    "http://localhost:54324/api/v1/send",
    "http://127.0.0.1:8025/api/v1/send",
    "http://localhost:8025/api/v1/send",
  ].filter(Boolean) as string[]

  for (const apiUrl of mailpitApiUrls) {
    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          From: { Email: from, Name: "ZAP v2" },
          To: [{ Email: email }],
          Subject: subject,
          HTML: html,
        }),
        signal: AbortSignal.timeout(1500),
      })

      if (res.ok) {
        const body = await res.json()
        console.log(`[Mailpit API] Magic link email delivered to ${email} via HTTP API (${apiUrl}): ${body?.ID || 'OK'}`)
        return { success: true }
      }
    } catch {
      // Continue to next URL or SMTP fallback
    }
  }

  // 2. Try Nodemailer SMTP
  const smtpHost = process.env.SMTP_HOST || "127.0.0.1"
  const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 1025

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: false,
      tls: { rejectUnauthorized: false },
      connectionTimeout: 1000,
      greetingTimeout: 1000,
    })

    const info = await transporter.sendMail({
      from,
      to: email,
      subject,
      html,
    })
    console.log(`[Mailpit SMTP] Magic link email sent to ${email} via SMTP (${smtpHost}:${smtpPort}): ${info.messageId}`)
    return { success: true }
  } catch (smtpErr) {
    console.warn(`[Mailpit] Local SMTP/HTTP not available (${smtpErr instanceof Error ? smtpErr.message : String(smtpErr)}).`)
    console.log(`\n==================================================`)
    console.log(`[DEV MAGIC LINK]`)
    console.log(`To: ${email}`)
    console.log(`Link: ${url}`)
    console.log(`==================================================\n`)

    return { success: true }
  }
}

