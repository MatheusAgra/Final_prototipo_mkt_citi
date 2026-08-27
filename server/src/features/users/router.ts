import { Router } from "express"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { prisma } from "../../prisma.js"
import { ApiError, asyncRoute } from "../../http.js"
import { authenticate, managerOnly } from "../../auth.js"
import { publicUser } from "../../serializers.js"

export const usersRouter = Router()
usersRouter.use(authenticate, managerOnly)
usersRouter.get(
  "/",
  asyncRoute(async (_req, res) =>
    res.json(
      (
        await prisma.user.findMany({
          where: { ativo: true },
          orderBy: { createdAt: "asc" },
        })
      ).map(publicUser),
    ),
  ),
)
usersRouter.post(
  "/",
  asyncRoute(async (req, res) => {
    const body = z
      .object({
        nomeCompleto: z.string().trim().min(1, "Informe o nome completo"),
        email: z.string().trim().email("Informe um e-mail válido"),
        perfil: z.enum(["GERENTE", "ANALISTA"]),
        cargo: z.string().trim().nullable().optional(),
        senhaInicial: z
          .string()
          .min(8, "A senha inicial deve ter pelo menos 8 caracteres")
          .max(72, "A senha inicial deve ter no máximo 72 caracteres"),
      })
      .parse(req.body)
    const email = body.email.trim().toLowerCase()
    if (
      await prisma.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
      })
    )
      throw new ApiError(409, "EMAIL_TAKEN")
    const user = await prisma.user.create({
      data: {
        nomeCompleto: body.nomeCompleto,
        email,
        perfil: body.perfil,
        cargo: body.cargo,
        senhaHash: await bcrypt.hash(body.senhaInicial, 12),
        primeiroAcesso: true,
      },
    })
    res.status(201).json(publicUser(user))
  }),
)
usersRouter.patch(
  "/:id",
  asyncRoute(async (req, res) => {
    const body = z
      .object({
        nomeCompleto: z.string().trim().min(1).optional(),
        perfil: z.enum(["GERENTE", "ANALISTA"]).optional(),
        cargo: z.string().trim().nullable().optional(),
        ativo: z.boolean().optional(),
      })
      .parse(req.body)
    res.json(
      publicUser(
        await prisma.user.update({
          where: { id: String(req.params.id) },
          data: {
            ...body,
            ...(body.ativo === false
              ? { sessionVersion: { increment: 1 } }
              : {}),
          },
        }),
      ),
    )
  }),
)
usersRouter.delete(
  "/:id",
  asyncRoute(async (req, res) => {
    if (String(req.params.id) === req.user!.id)
      throw new ApiError(409, "CANNOT_DELETE_SELF")
    const found = await prisma.user.findUnique({
      where: { id: String(req.params.id) },
    })
    if (!found) throw new ApiError(404, "NOT_FOUND")
    await prisma.user.update({
      where: { id: found.id },
      data: {
        ativo: false,
        email: `deleted+${found.id}+${found.email}`,
        sessionVersion: { increment: 1 },
      },
    })
    res.status(204).send()
  }),
)
