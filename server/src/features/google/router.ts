import { Router } from "express"
import { prisma } from "../../prisma.js"
import { config } from "../../config.js"
import { ApiError, asyncRoute } from "../../http.js"
import {
  authenticate,
  signGoogleStateToken,
  verifyGoogleStateToken,
} from "../../auth.js"
import {
  generateGoogleAuthUrl,
  exchangeGoogleCode,
  revokeGoogleToken,
} from "../../google-oauth.js"
import {
  decryptGoogleToken,
  encryptGoogleToken,
} from "../../security/google-token.js"

export const googleRouter = Router()

googleRouter.get(
  "/status",
  authenticate,
  asyncRoute(async (req, res) => {
    const account = await prisma.googleAccount.findUnique({
      where: { userId: req.user!.id },
    })
    res.json({ connected: Boolean(account), email: account?.email ?? null })
  }),
)

googleRouter.get(
  "/connect",
  authenticate,
  asyncRoute(async (req, res) => {
    const state = signGoogleStateToken(req.user!.id)
    const url = generateGoogleAuthUrl(config.GOOGLE_OAUTH_REDIRECT_URI, state)
    res.json({ url })
  }),
)

googleRouter.get(
  "/callback",
  asyncRoute(async (req, res) => {
    const { code, state, error } = req.query as {
      code?: string
      state?: string
      error?: string
    }
    if (error || !code || !state)
      return res.redirect(`${config.FRONTEND_URL}/?google=error`)
    let userId: string
    try {
      userId = verifyGoogleStateToken(state)
    } catch {
      return res.redirect(`${config.FRONTEND_URL}/?google=error`)
    }
    try {
      const { refreshToken, email } = await exchangeGoogleCode(
        config.GOOGLE_OAUTH_REDIRECT_URI,
        code,
      )
      await prisma.googleAccount.upsert({
        where: { userId },
        update: { email, refreshToken: encryptGoogleToken(refreshToken) },
        create: {
          userId,
          email,
          refreshToken: encryptGoogleToken(refreshToken),
        },
      })
      res.redirect(`${config.FRONTEND_URL}/?google=connected`)
    } catch (cause) {
      console.error(
        "[google-accounts] Falha ao trocar código por token:",
        cause instanceof Error ? cause.message : cause,
      )
      res.redirect(`${config.FRONTEND_URL}/?google=error`)
    }
  }),
)

googleRouter.delete(
  "/disconnect",
  authenticate,
  asyncRoute(async (req, res) => {
    const account = await prisma.googleAccount.findUnique({
      where: { userId: req.user!.id },
    })
    if (account) {
      try {
        await revokeGoogleToken(decryptGoogleToken(account.refreshToken))
      } catch {
        throw new ApiError(
          502,
          "GOOGLE_REVOCATION_FAILED",
          "Não foi possível revogar o acesso no Google. Tente novamente.",
        )
      }
    }
    await prisma.googleAccount.deleteMany({ where: { userId: req.user!.id } })
    res.status(204).send()
  }),
)
