import "dotenv/config"
import http from "node:http"
import { google } from "googleapis"

const clientId = process.env.GMAIL_CLIENT_ID
const clientSecret = process.env.GMAIL_CLIENT_SECRET

if (!clientId || !clientSecret) {
  console.error(
    "Defina GMAIL_CLIENT_ID e GMAIL_CLIENT_SECRET no .env antes de rodar este script.",
  )
  process.exit(1)
}

const PORT = 8085
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`
const oauth2Client = new google.auth.OAuth2(
  clientId,
  clientSecret,
  REDIRECT_URI,
)

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: [
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/calendar.events",
  ],
})

console.log(
  `\nCadastre esta URI de redirecionamento no seu Client ID (se ainda não fez): ${REDIRECT_URI}\n`,
)
console.log(
  "Abra esta URL no navegador, logado com a conta Google que vai ENVIAR e-mails e CRIAR eventos de calendário:\n",
)
console.log(authUrl)
console.log("\nAguardando você autorizar no navegador...\n")

const code: string = await new Promise((resolve, reject) => {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", REDIRECT_URI)
    if (url.pathname !== "/oauth2callback") {
      res.writeHead(404)
      res.end()
      return
    }
    const authCode = url.searchParams.get("code")
    const error = url.searchParams.get("error")
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" })
    res.end(
      error
        ? "<p>Autorização negada. Pode fechar esta aba.</p>"
        : "<p>Autorizado! Pode fechar esta aba e voltar ao terminal.</p>",
    )
    server.close()
    if (error) reject(new Error(error))
    else if (authCode) resolve(authCode)
    else reject(new Error("Nenhum código retornado pelo Google."))
  })
  server.listen(PORT)
})

const { tokens } = await oauth2Client.getToken(code)

if (!tokens.refresh_token) {
  console.error(
    "\nNão veio refresh_token na resposta. Revogue o acesso do app em https://myaccount.google.com/permissions e rode o script de novo (o prompt=consent força um novo refresh_token).",
  )
  process.exit(1)
}

console.log("\nRefresh token gerado com sucesso. Copie para o seu .env:\n")
console.log(`GMAIL_REFRESH_TOKEN="${tokens.refresh_token}"`)
