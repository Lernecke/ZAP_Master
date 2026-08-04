import nodemailer from "nodemailer"

/**
 * Mailpit SMTP Client for sending local verification and transactional emails.
 * Mailpit UI runs at http://localhost:8025 and catches all emails on SMTP port 1025.
 * If Mailpit is not running locally, it logs the link to the console as a fallback.
 */
export async function sendVerificationEmailMailpit({
  email,
  url,
}: {
  email: string
  url: string
}) {
  const customHost = process.env.SMTP_HOST
  const port = parseInt(process.env.SMTP_PORT || "1025", 10)
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

  const hostsToTry = customHost ? [customHost] : ["127.0.0.1", "localhost", "::1"]
  let lastError: unknown = null

  for (const host of hostsToTry) {
    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: false,
        tls: {
          rejectUnauthorized: false,
        },
        connectionTimeout: 2000,
      })

      const info = await transporter.sendMail({
        from,
        to: email,
        subject,
        html,
      })
      console.log(`[Mailpit] Verification email sent to ${email} via SMTP (${host}:${port}): ${info.messageId}`)
      return { success: true }
    } catch (err) {
      lastError = err
    }
  }

  // Fallback when Mailpit SMTP server is not running on port 1025
  console.warn(`[Mailpit] SMTP server on port ${port} is not running (${lastError instanceof Error ? lastError.message : String(lastError)}).`)
  console.log(`\n==================================================`)
  console.log(`[DEV VERIFICATION LINK]`)
  console.log(`To: ${email}`)
  console.log(`Link: ${url}`)
  console.log(`==================================================\n`)

  return { success: true }
}




