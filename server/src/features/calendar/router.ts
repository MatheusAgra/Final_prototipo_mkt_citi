import { Router } from "express"
import { z } from "zod"
import { prisma } from "../../prisma.js"
import { ApiError, asyncRoute } from "../../http.js"
import { authenticate } from "../../auth.js"
import {
  createGoogleEvent,
  updateGoogleEvent,
  deleteGoogleEvent,
  type GoogleEventResult,
} from "../../calendar-google.js"
import { eventBody, normalizeSala } from "./schemas.js"
import { decryptGoogleToken } from "../../security/google-token.js"

export const calendarRouter = Router()
calendarRouter.use(authenticate)
const eventInclude = {
  participantes: { where: { user: { ativo: true } }, include: { user: true } },
} as const
const serializeEvent = (event: any, manager = false) => ({
  ...event,
  registroPresencaConfirmado:
    event.tipo === "REUNIAO" &&
    event.participantes.some(
      (p: any) => p.user.perfil === "ANALISTA" && p.statusPresenca !== null,
    ),
  participantes: event.participantes.map((p: any) => ({
    userId: p.userId,
    nome: p.user.nomeCompleto,
    email: p.user.email,
    avaliavelPresenca: p.user.perfil === "ANALISTA",
    ...(manager && p.user.perfil === "ANALISTA"
      ? { statusPresenca: p.statusPresenca }
      : {}),
  })),
})
async function assertParticipantsValid(participantIds: string[]) {
  const count = await prisma.user.count({
    where: { id: { in: participantIds }, ativo: true },
  })
  if (count !== new Set(participantIds).size)
    throw new ApiError(
      422,
      "INVALID_PARTICIPANT",
      "Somente usuários ativos podem participar do evento",
    )
}
calendarRouter.get(
  "/participants",
  asyncRoute(async (_req, res) => {
    const users = await prisma.user.findMany({
      where: { ativo: true },
      select: { id: true, nomeCompleto: true, cargo: true, perfil: true },
      orderBy: { nomeCompleto: "asc" },
    })
    res.json(users)
  }),
)
calendarRouter.get(
  "/events",
  asyncRoute(async (req, res) => {
    const q = z
      .object({
        inicio: z.coerce.date().optional(),
        fim: z.coerce.date().optional(),
        canal: z.enum(["INSTAGRAM", "LINKEDIN", "SITE", "EMAIL"]).optional(),
      })
      .parse(req.query)
    const events = await prisma.calendarEvent.findMany({
      where: {
        ...(q.canal ? { canal: q.canal } : {}),
        ...(q.inicio || q.fim ? { data: { gte: q.inicio, lte: q.fim } } : {}),
      },
      orderBy: [{ data: "asc" }, { horario: "asc" }],
      include: eventInclude,
    })
    res.json(
      events.map((event) =>
        serializeEvent(event, req.user!.perfil === "GERENTE"),
      ),
    )
  }),
)
const googleInput = (event: any) => ({
  titulo: event.titulo,
  dataISO: event.data.toISOString().slice(0, 10),
  horario: event.horario,
  horarioFim: event.horarioFim,
  attendeeEmails: event.participantes.map((p: any) => p.user.email),
  location:
    event.formatoLocal === "PRESENCIAL"
      ? (event.sala ?? undefined)
      : event.formatoLocal === "MEET"
        ? (event.linkMeet ?? undefined)
        : undefined,
  // Sem link colado pelo usuário: pede pro Google gerar uma sala de Meet de verdade, o que dá o botão
  // nativo "Entrar com o Google Meet" no Calendar (um link colado manualmente nunca ganha esse botão —
  // só aparece como texto em "local", limitação do próprio Google).
  autoGenerateMeet: event.formatoLocal === "MEET" && !event.linkMeet,
})
async function refreshTokenFor(userId: string | null): Promise<string | null> {
  if (!userId) return null
  const account = await prisma.googleAccount.findUnique({ where: { userId } })
  return account ? decryptGoogleToken(account.refreshToken) : null
}
async function persistGoogleResult(
  eventId: string,
  event: any,
  result: GoogleEventResult,
) {
  const data: { googleEventId?: string; linkMeet?: string } = {}
  if (result.id) data.googleEventId = result.id
  if (event.formatoLocal === "MEET" && !event.linkMeet && result.meetLink)
    data.linkMeet = result.meetLink
  if (Object.keys(data).length === 0) return event
  return prisma.calendarEvent.update({
    where: { id: eventId },
    data,
    include: eventInclude,
  })
}
calendarRouter.post(
  "/events",
  asyncRoute(async (req, res) => {
    const body = normalizeSala(eventBody.parse(req.body))
    const participantIds = Array.from(
      new Set([...body.participantIds, req.user!.id]),
    )
    await assertParticipantsValid(participantIds)
    const { participantIds: _ignored, ...data } = body
    let event = await prisma.calendarEvent.create({
      data: {
        ...data,
        criadorId: req.user!.id,
        participantes: { create: participantIds.map((userId) => ({ userId })) },
      },
      include: eventInclude,
    })
    const refreshToken = await refreshTokenFor(req.user!.id)
    if (refreshToken) {
      const result = await createGoogleEvent(refreshToken, googleInput(event))
      event = await persistGoogleResult(event.id, event, result)
    }
    res.status(201).json(serializeEvent(event, req.user!.perfil === "GERENTE"))
  }),
)
calendarRouter.patch(
  "/events/:id",
  asyncRoute(async (req, res) => {
    const body =
      req.body.formatoLocal !== undefined
        ? normalizeSala(eventBody.partial().parse(req.body))
        : eventBody.partial().parse(req.body)
    const participantsProvided = req.body.participantIds !== undefined
    const existing = await prisma.calendarEvent.findUniqueOrThrow({
      where: { id: String(req.params.id) },
    })
    if (participantsProvided) {
      await assertParticipantsValid(body.participantIds!)
      if (
        existing.criadorId &&
        !body.participantIds!.includes(existing.criadorId)
      )
        throw new ApiError(
          422,
          "CREATOR_REQUIRED",
          "O criador do evento não pode ser removido dos participantes — para isso, apague o evento inteiro.",
        )
    }
    const { participantIds, ...data } = body
    const adoptingCreator = !existing.criadorId
    const dataWithCreator = adoptingCreator
      ? { ...data, criadorId: req.user!.id }
      : data
    let event = await prisma.$transaction(async (tx) => {
      if (participantsProvided) {
        await tx.calendarEventAttendee.deleteMany({
          where: { eventId: String(req.params.id) },
        })
        await tx.calendarEventAttendee.createMany({
          data: participantIds!.map((userId) => ({
            eventId: String(req.params.id),
            userId,
          })),
        })
      }
      return tx.calendarEvent.update({
        where: { id: String(req.params.id) },
        data: dataWithCreator,
        include: eventInclude,
      })
    })
    const refreshToken = await refreshTokenFor(event.criadorId)
    // Ao "adotar" um evento sem criador, o googleEventId antigo pode pertencer à conta de outra pessoa
    // (ex.: era da conta compartilhada usada antes da conexão por usuário) — trata como sincronização nova.
    if (refreshToken) {
      const result =
        existing.googleEventId && !adoptingCreator
          ? await updateGoogleEvent(
              refreshToken,
              existing.googleEventId,
              googleInput(event),
            )
          : await createGoogleEvent(refreshToken, googleInput(event))
      event = await persistGoogleResult(event.id, event, result)
    }
    res.json(serializeEvent(event, req.user!.perfil === "GERENTE"))
  }),
)
calendarRouter.delete(
  "/events/:id",
  asyncRoute(async (req, res) => {
    const existing = await prisma.calendarEvent.findUniqueOrThrow({
      where: { id: String(req.params.id) },
    })
    await prisma.calendarEvent.delete({ where: { id: existing.id } })
    if (existing.googleEventId) {
      const refreshToken = await refreshTokenFor(existing.criadorId)
      if (refreshToken)
        await deleteGoogleEvent(refreshToken, existing.googleEventId)
    }
    res.status(204).send()
  }),
)
