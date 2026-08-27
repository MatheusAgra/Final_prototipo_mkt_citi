import { google } from "googleapis"
import { config } from "./config.js"

const gmailReady = Boolean(
  config.GMAIL_CLIENT_ID &&
    config.GMAIL_CLIENT_SECRET &&
    config.GMAIL_REFRESH_TOKEN &&
    config.GMAIL_SENDER,
)

const oauth2Client = new google.auth.OAuth2(
  config.GMAIL_CLIENT_ID,
  config.GMAIL_CLIENT_SECRET,
)
if (gmailReady)
  oauth2Client.setCredentials({ refresh_token: config.GMAIL_REFRESH_TOKEN })
const gmail = google.gmail({ version: "v1", auth: oauth2Client })

function encodeSubject(subject: string): string {
  return `=?utf-8?B?${Buffer.from(subject).toString("base64")}?=`
}

function buildRawMessage(to: string, subject: string, html: string): string {
  const message = [
    `From: "${config.EMAIL_FROM_NAME}" <${config.GMAIL_SENDER}>`,
    `To: ${to}`,
    `Subject: ${encodeSubject(subject)}`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=utf-8",
    "",
    html,
  ].join("\n")

  return Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

export async function sendPasswordResetEmail(
  to: string,
  code: string,
): Promise<void> {
  if (!gmailReady) {
    if (config.ALLOW_RESET_CODE_LOG && !config.IS_PRODUCTION) {
      console.log(
        `[email] Gmail não configurado — código de reset para ${to}: ${code}`,
      )
      return
    }
    throw new Error("Serviço de e-mail não configurado")
  }
  const raw = buildRawMessage(
    to,
    "Seu código de verificação — CITi HubSpot",
    `<p>Seu código de verificação é <strong style="font-size:20px">${code}</strong>.</p><p>Ele expira em ${config.RESET_CODE_TTL_MINUTES} minutos. Se você não solicitou isso, ignore este e-mail.</p>`,
  )
  await gmail.users.messages.send({ userId: "me", requestBody: { raw } })
}
