import { google } from "googleapis"
import { config } from "./config.js"

export const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
]

function buildOAuthClient(redirectUri: string) {
  return new google.auth.OAuth2(
    config.GMAIL_CLIENT_ID,
    config.GMAIL_CLIENT_SECRET,
    redirectUri,
  )
}

export function generateGoogleAuthUrl(
  redirectUri: string,
  state: string,
): string {
  return buildOAuthClient(redirectUri).generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_CALENDAR_SCOPES,
    state,
  })
}

export async function exchangeGoogleCode(
  redirectUri: string,
  code: string,
): Promise<{ refreshToken: string; email: string }> {
  const client = buildOAuthClient(redirectUri)
  const { tokens } = await client.getToken(code)
  if (!tokens.refresh_token)
    throw new Error(
      "Google não retornou refresh_token (revogue o acesso em myaccount.google.com/permissions e tente de novo)",
    )
  client.setCredentials(tokens)
  const oauth2 = google.oauth2({ version: "v2", auth: client })
  const { data } = await oauth2.userinfo.get()
  if (!data.email)
    throw new Error(
      "Não foi possível obter o e-mail da conta Google autorizada",
    )
  return { refreshToken: tokens.refresh_token, email: data.email }
}

export async function revokeGoogleToken(refreshToken: string): Promise<void> {
  await buildOAuthClient(config.GOOGLE_OAUTH_REDIRECT_URI).revokeToken(
    refreshToken,
  )
}
