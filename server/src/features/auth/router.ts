import { Router } from "express"
import bcrypt from "bcryptjs"
import crypto from "node:crypto"
import { z } from "zod"
import { prisma } from "../../prisma.js"
import { ApiError, asyncRoute } from "../../http.js"
import { authenticate, signToken } from "../../auth.js"
import { publicUser } from "../../serializers.js"
import { config } from "../../config.js"
import { sendPasswordResetEmail } from "../../email.js"

export const authRouter = Router()
authRouter.post(
  "/login",
  asyncRoute(async (req, res) => {
    const body = z
      .object({
        email: z.string().trim().email().max(254),
        senha: z.string().min(1).max(72),
      })
      .parse(req.body)
    const user = await prisma.user.findFirst({
      where: {
        email: { equals: body.email.trim().toLowerCase(), mode: "insensitive" },
        ativo: true,
      },
    })
    if (!user || !(await bcrypt.compare(body.senha, user.senhaHash)))
      throw new ApiError(
        401,
        "INVALID_CREDENTIALS",
        "E-mail ou senha inválidos",
      )
    res.json({
      token: signToken(user.id, user.perfil, user.sessionVersion),
      user: publicUser(user),
    })
  }),
)
authRouter.get(
  "/me",
  authenticate,
  asyncRoute(async (req, res) =>
    res.json(
      publicUser(
        await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } }),
      ),
    ),
  ),
)
authRouter.post(
  "/change-password",
  authenticate,
  asyncRoute(async (req, res) => {
    const body = z
      .object({
        senhaAtual: z.string().min(1),
        novaSenha: z.string().min(8).max(72),
        confirmarSenha: z.string().min(8).max(72),
      })
      .parse(req.body)
    if (body.novaSenha !== body.confirmarSenha)
      throw new ApiError(422, "PASSWORD_CONFIRMATION_MISMATCH")
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.user!.id },
    })
    if (!(await bcrypt.compare(body.senhaAtual, user.senhaHash)))
      throw new ApiError(400, "WRONG_CURRENT_PASSWORD")
    if (await bcrypt.compare(body.novaSenha, user.senhaHash))
      throw new ApiError(422, "SAME_PASSWORD")
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        senhaHash: await bcrypt.hash(body.novaSenha, 12),
        primeiroAcesso: false,
        sessionVersion: { increment: 1 },
      },
    })
    res.json({
      ok: true,
      token: signToken(updated.id, updated.perfil, updated.sessionVersion),
    })
  }),
)
authRouter.post(
  "/logout",
  authenticate,
  asyncRoute(async (req, res) => {
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { sessionVersion: { increment: 1 } },
    })
    res.status(204).send()
  }),
)

const GENERIC_FORGOT_MESSAGE =
  "Se o e-mail existir em nossa base, um código de verificação foi enviado."
authRouter.post(
  "/forgot-password",
  asyncRoute(async (req, res) => {
    const body = z
      .object({ email: z.string().trim().email().max(254) })
      .parse(req.body)
    const user = await prisma.user.findFirst({
      where: {
        email: { equals: body.email.trim().toLowerCase(), mode: "insensitive" },
        ativo: true,
      },
    })
    if (user) {
      const code = crypto.randomInt(100000, 1000000).toString()
      await prisma.$transaction([
        prisma.passwordResetCode.deleteMany({
          where: { userId: user.id, usedAt: null },
        }),
        prisma.passwordResetCode.create({
          data: {
            userId: user.id,
            codeHash: await bcrypt.hash(code, 12),
            attempts: 0,
            expiresAt: new Date(
              Date.now() + config.RESET_CODE_TTL_MINUTES * 60000,
            ),
          },
        }),
      ])
      await sendPasswordResetEmail(user.email, code)
    }
    res.json({ message: GENERIC_FORGOT_MESSAGE })
  }),
)
authRouter.post(
  "/verify-code",
  asyncRoute(async (req, res) => {
    const body = z
      .object({
        email: z.string().trim().email().max(254),
        codigo: z.string().regex(/^\d{6}$/),
      })
      .parse(req.body)
    const user = await prisma.user.findFirst({
      where: {
        email: { equals: body.email.trim().toLowerCase(), mode: "insensitive" },
        ativo: true,
      },
    })
    if (!user) throw new ApiError(400, "CODE_INVALID", "Código inválido")
    const reset = await prisma.passwordResetCode.findFirst({
      where: { userId: user.id, usedAt: null },
      orderBy: { createdAt: "desc" },
    })
    if (!reset || reset.attempts >= 5)
      throw new ApiError(400, "CODE_INVALID", "Código inválido")
    if (reset.expiresAt < new Date())
      throw new ApiError(
        410,
        "CODE_EXPIRED",
        "Código expirado, solicite um novo",
      )
    if (!(await bcrypt.compare(body.codigo, reset.codeHash))) {
      await prisma.passwordResetCode.updateMany({
        where: { id: reset.id, usedAt: null, attempts: { lt: 5 } },
        data: { attempts: { increment: 1 } },
      })
      throw new ApiError(400, "CODE_INVALID", "Código inválido")
    }
    const resetToken = crypto.randomBytes(32).toString("base64url")
    const resetTokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex")
    const granted = await prisma.passwordResetCode.updateMany({
      where: { id: reset.id, usedAt: null, attempts: { lt: 5 } },
      data: {
        usedAt: new Date(),
        resetTokenHash,
        resetTokenExpiresAt: new Date(
          Date.now() + config.RESET_TOKEN_TTL_MINUTES * 60000,
        ),
      },
    })
    if (granted.count !== 1)
      throw new ApiError(400, "CODE_INVALID", "Código inválido")
    res.json({ resetToken })
  }),
)
authRouter.post(
  "/reset-password",
  asyncRoute(async (req, res) => {
    const body = z
      .object({
        resetToken: z.string().min(1),
        novaSenha: z.string().min(8).max(72),
        confirmarSenha: z.string().min(8).max(72),
      })
      .parse(req.body)
    if (body.novaSenha !== body.confirmarSenha)
      throw new ApiError(422, "PASSWORD_CONFIRMATION_MISMATCH")
    const tokenHash = crypto
      .createHash("sha256")
      .update(body.resetToken)
      .digest("hex")
    const grant = await prisma.passwordResetCode.findUnique({
      where: { resetTokenHash: tokenHash },
    })
    if (
      !grant ||
      grant.resetUsedAt ||
      !grant.resetTokenExpiresAt ||
      grant.resetTokenExpiresAt <= new Date()
    )
      throw new ApiError(401, "RESET_TOKEN_INVALID")
    await prisma.$transaction(async (tx) => {
      const consumed = await tx.passwordResetCode.updateMany({
        where: {
          id: grant.id,
          resetUsedAt: null,
          resetTokenExpiresAt: { gt: new Date() },
        },
        data: { resetUsedAt: new Date() },
      })
      if (consumed.count !== 1) throw new ApiError(401, "RESET_TOKEN_INVALID")
      await tx.user.update({
        where: { id: grant.userId },
        data: {
          senhaHash: await bcrypt.hash(body.novaSenha, 12),
          primeiroAcesso: false,
          sessionVersion: { increment: 1 },
        },
      })
    })
    res.json({ ok: true })
  }),
)
