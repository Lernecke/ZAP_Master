import nodemailer from "nodemailer"

/**
 * Mailpit SMTP Client for sending local verification and transactional emails.
 * Mailpit UI runs at http://localhost:8025 and catches all emails on SMTP port 1025.
 */
export const mailpitTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "127.0.0.1",
  port: parseInt(process.env.SMTP_PORT || "1025", 10),
  secure: false,
})

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

  try {
    const info = await mailpitTransporter.sendMail({
      from,
      to: email,
      subject,
      html,
    })
    console.log(`[Mailpit] Verification email sent to ${email}: ${info.messageId}`)
    return { success: true }
  } catch (error) {
    console.error("[Mailpit] Error sending verification email:", error)
    return { success: false, error }
  }
}
