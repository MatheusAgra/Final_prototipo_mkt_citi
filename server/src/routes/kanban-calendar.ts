import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma.js'
import { ApiError, asyncRoute } from '../http.js'
import { authenticate } from '../auth.js'
import { createGoogleEvent, updateGoogleEvent, deleteGoogleEvent } from '../calendar-google.js'

const assignment = z.object({ userId: z.string().uuid(), nota: z.number().min(0).max(5).nullable().optional() })
const taskFields = z.object({ titulo: z.string().trim().min(1), redeSocial: z.enum(['INSTAGRAM','LINKEDIN','SITE','EMAIL']), dificuldade: z.enum(['FACIL','MEDIO','DIFICIL']), dataInicio: z.coerce.date().nullable().optional(), dataEntrega: z.coerce.date().nullable().optional(), colunaId: z.string().uuid(), responsaveis: z.array(assignment).default([]) })
const validDates = (value: { dataInicio?: Date | null; dataEntrega?: Date | null }) => !value.dataInicio || !value.dataEntrega || value.dataEntrega >= value.dataInicio
const taskBody = taskFields.refine(validDates, { message: 'O prazo deve ser igual ou posterior à data de início', path: ['dataEntrega'] })
const taskPatch = taskFields.partial().refine(validDates, { message: 'O prazo deve ser igual ou posterior à data de início', path: ['dataEntrega'] })
const taskInclude = { coluna: true, atribuicoes: { include: { user: true } } } as const
const serializeTask = (task: any, includeGrades: boolean) => ({ ...task, responsaveis: task.atribuicoes.map((a: any) => ({ userId: a.userId, nome: a.user.nomeCompleto, ...(includeGrades ? { nota: a.nota } : {}) })) })

export const kanbanRouter = Router(); kanbanRouter.use(authenticate)
kanbanRouter.get('/assignees', asyncRoute(async (_req, res) => {
  const users = await prisma.user.findMany({ where: { ativo: true, perfil: 'ANALISTA' }, select: { id: true, nomeCompleto: true, cargo: true }, orderBy: { nomeCompleto: 'asc' } })
  res.json(users)
}))
kanbanRouter.get('/columns', asyncRoute(async (req, res) => {
  const canal = z.enum(['INSTAGRAM','LINKEDIN','SITE','EMAIL']).optional().parse(req.query.canal)
  const columns = await prisma.kanbanColumn.findMany({ orderBy: { ordem: 'asc' }, include: { tasks: { where: canal ? { redeSocial: canal } : {}, orderBy: { ordem: 'asc' }, include: taskInclude } } })
  const includeGrades = req.user!.perfil === 'GERENTE'
  res.json(columns.map((column) => ({ ...column, tasks: column.tasks.map((task) => serializeTask(task, includeGrades)) })))
}))
kanbanRouter.post('/columns', asyncRoute(async (req, res) => {
  const body = z.object({ nome: z.string().trim().min(1), cor: z.string().optional(), isDone: z.boolean().default(false) }).parse(req.body)
  const max = await prisma.kanbanColumn.aggregate({ _max: { ordem: true } })
  res.status(201).json(await prisma.kanbanColumn.create({ data: { ...body, ordem: (max._max.ordem ?? -1) + 1 } }))
}))
kanbanRouter.patch('/columns/:id', asyncRoute(async (req, res) => res.json(await prisma.kanbanColumn.update({ where: { id: String(req.params.id) }, data: z.object({ nome: z.string().min(1).optional(), cor: z.string().nullable().optional(), ordem: z.number().int().min(0).optional(), isDone: z.boolean().optional() }).parse(req.body) }))))
kanbanRouter.delete('/columns/:id', asyncRoute(async (req, res) => { if (await prisma.task.count({ where: { colunaId: String(req.params.id) } })) throw new ApiError(409, 'COLUMN_NOT_EMPTY'); await prisma.kanbanColumn.delete({ where: { id: String(req.params.id) } }); res.status(204).send() }))
kanbanRouter.post('/tasks', asyncRoute(async (req, res) => {
  const body = taskBody.parse(req.body); const ordem = await prisma.task.count({ where: { colunaId: body.colunaId } })
  if (body.responsaveis.some((assignment) => assignment.nota != null)) throw new ApiError(422, 'GRADE_ONLY_AFTER_CREATION', 'As notas devem ser atribuídas somente ao editar a task')
  const analystCount = await prisma.user.count({ where: { id: { in: body.responsaveis.map((assignment) => assignment.userId) }, perfil: 'ANALISTA', ativo: true } })
  if (analystCount !== new Set(body.responsaveis.map((assignment) => assignment.userId)).size) throw new ApiError(422, 'INVALID_ASSIGNEE', 'Somente analistas ativos podem ser responsáveis por tasks')
  const task = await prisma.task.create({ data: { titulo: body.titulo, redeSocial: body.redeSocial, dificuldade: body.dificuldade, dataInicio: body.dataInicio, dataEntrega: body.dataEntrega, colunaId: body.colunaId, ordem, atribuicoes: { create: body.responsaveis.map((a) => ({ userId: a.userId, nota: a.nota })) } }, include: taskInclude })
  res.status(201).json(serializeTask(task, req.user!.perfil === 'GERENTE'))
}))
kanbanRouter.patch('/tasks/:id', asyncRoute(async (req, res) => {
  const body = taskPatch.parse(req.body)
  const responsaveisProvided = req.body.responsaveis !== undefined
  let assignmentsToSave = body.responsaveis
  if (responsaveisProvided) {
    const analystCount = await prisma.user.count({ where: { id: { in: body.responsaveis!.map((assignment) => assignment.userId) }, perfil: 'ANALISTA', ativo: true } })
    if (analystCount !== new Set(body.responsaveis!.map((assignment) => assignment.userId)).size) throw new ApiError(422, 'INVALID_ASSIGNEE', 'Somente analistas ativos podem ser responsáveis por tasks')
    if (req.user!.perfil !== 'GERENTE') {
      const current = await prisma.taskAssignment.findMany({ where: { taskId: String(req.params.id) } })
      const grades = new Map(current.map((assignment) => [assignment.userId, assignment.nota]))
      if (body.responsaveis!.some((assignment) => assignment.nota != null)) throw new ApiError(403, 'MANAGER_ONLY_GRADING', 'Somente a gerente pode avaliar a execução da task')
      assignmentsToSave = body.responsaveis!.map((assignment) => ({ ...assignment, nota: grades.get(assignment.userId) ?? null }))
    }
  }
  const task = await prisma.$transaction(async (tx) => { if (responsaveisProvided) { await tx.taskAssignment.deleteMany({ where: { taskId: String(req.params.id) } }); await tx.taskAssignment.createMany({ data: assignmentsToSave!.map((a) => ({ taskId: String(req.params.id), userId: a.userId, nota: a.nota })) }) } const { responsaveis, ...data } = body; return tx.task.update({ where: { id: String(req.params.id) }, data, include: taskInclude }) })
  res.json(serializeTask(task, req.user!.perfil === 'GERENTE'))
}))
kanbanRouter.patch('/tasks/:id/move', asyncRoute(async (req, res) => { const body = z.object({ colunaId: z.string().uuid(), ordem: z.number().int().min(0).default(0) }).parse(req.body); res.json(await prisma.task.update({ where: { id: String(req.params.id) }, data: body })) }))
kanbanRouter.delete('/tasks/:id', asyncRoute(async (req, res) => { await prisma.task.delete({ where: { id: String(req.params.id) } }); res.status(204).send() }))

export const calendarRouter = Router(); calendarRouter.use(authenticate)
const eventBody = z.object({ titulo: z.string().trim().min(1), data: z.coerce.date(), horario: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), horarioFim: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable().optional(), tipo: z.enum(['REUNIAO','DEADLINE','TASK']), canal: z.enum(['INSTAGRAM','LINKEDIN','SITE','EMAIL']).nullable().optional(), formatoLocal: z.enum(['MEET','PRESENCIAL']).nullable().optional(), sala: z.string().trim().min(1).nullable().optional(), participantIds: z.array(z.string().uuid()).default([]) })
const normalizeSala = <T extends { formatoLocal?: 'MEET' | 'PRESENCIAL' | null; sala?: string | null }>(body: T): T => ({ ...body, sala: body.formatoLocal === 'PRESENCIAL' ? (body.sala ?? null) : null })
const eventInclude = { participantes: { where: { user: { ativo: true } }, include: { user: true } } } as const
const serializeEvent = (event: any, manager=false) => ({ ...event,
  registroPresencaConfirmado:event.tipo==='REUNIAO'&&event.participantes.some((p:any)=>p.user.perfil==='ANALISTA'&&p.statusPresenca!==null),
  participantes:event.participantes.map((p:any)=>({userId:p.userId,nome:p.user.nomeCompleto,email:p.user.email,avaliavelPresenca:p.user.perfil==='ANALISTA',...(manager&&p.user.perfil==='ANALISTA'?{statusPresenca:p.statusPresenca}:{})})),
})
async function assertParticipantsValid(participantIds: string[]) {
  const count = await prisma.user.count({ where: { id: { in: participantIds }, ativo: true } })
  if (count !== new Set(participantIds).size) throw new ApiError(422, 'INVALID_PARTICIPANT', 'Somente usuários ativos podem participar do evento')
}
calendarRouter.get('/participants', asyncRoute(async (_req, res) => {
  const users = await prisma.user.findMany({ where: { ativo: true }, select: { id: true, nomeCompleto: true, cargo: true, perfil: true }, orderBy: { nomeCompleto: 'asc' } })
  res.json(users)
}))
calendarRouter.get('/events', asyncRoute(async (req, res) => { const q = z.object({ inicio: z.coerce.date().optional(), fim: z.coerce.date().optional(), canal: z.enum(['INSTAGRAM','LINKEDIN','SITE','EMAIL']).optional() }).parse(req.query); const events = await prisma.calendarEvent.findMany({ where: { ...(q.canal?{canal:q.canal}:{}), ...(q.inicio||q.fim?{data:{gte:q.inicio,lte:q.fim}}:{}) }, orderBy: [{data:'asc'},{horario:'asc'}], include: eventInclude }); res.json(events.map((event)=>serializeEvent(event,req.user!.perfil==='GERENTE'))) }))
const googleInput = (event: any) => ({
  titulo: event.titulo,
  dataISO: event.data.toISOString().slice(0, 10),
  horario: event.horario,
  horarioFim: event.horarioFim,
  attendeeEmails: event.participantes.map((p: any) => p.user.email),
  location: event.formatoLocal === 'PRESENCIAL' ? event.sala ?? undefined : event.formatoLocal === 'MEET' ? 'Google Meet' : undefined,
})
async function refreshTokenFor(userId: string | null): Promise<string | null> {
  if (!userId) return null
  const account = await prisma.googleAccount.findUnique({ where: { userId } })
  return account?.refreshToken ?? null
}
calendarRouter.post('/events', asyncRoute(async (req, res) => {
  const body = normalizeSala(eventBody.parse(req.body))
  const participantIds = Array.from(new Set([...body.participantIds, req.user!.id]))
  await assertParticipantsValid(participantIds)
  const { participantIds: _ignored, ...data } = body
  let event = await prisma.calendarEvent.create({ data: { ...data, criadorId: req.user!.id, participantes: { create: participantIds.map((userId) => ({ userId })) } }, include: eventInclude })
  const refreshToken = await refreshTokenFor(req.user!.id)
  if (refreshToken) {
    const googleEventId = await createGoogleEvent(refreshToken, googleInput(event))
    if (googleEventId) event = await prisma.calendarEvent.update({ where: { id: event.id }, data: { googleEventId }, include: eventInclude })
  }
  res.status(201).json(serializeEvent(event,req.user!.perfil==='GERENTE'))
}))
calendarRouter.patch('/events/:id', asyncRoute(async (req, res) => {
  const body = req.body.formatoLocal !== undefined ? normalizeSala(eventBody.partial().parse(req.body)) : eventBody.partial().parse(req.body)
  const participantsProvided = req.body.participantIds !== undefined
  const existing = await prisma.calendarEvent.findUniqueOrThrow({ where: { id: String(req.params.id) } })
  if (participantsProvided) {
    await assertParticipantsValid(body.participantIds!)
    if (existing.criadorId && !body.participantIds!.includes(existing.criadorId)) throw new ApiError(422, 'CREATOR_REQUIRED', 'O criador do evento não pode ser removido dos participantes — para isso, apague o evento inteiro.')
  }
  const { participantIds, ...data } = body
  const adoptingCreator = !existing.criadorId
  const dataWithCreator = adoptingCreator ? { ...data, criadorId: req.user!.id } : data
  let event = await prisma.$transaction(async (tx) => {
    if (participantsProvided) { await tx.calendarEventAttendee.deleteMany({ where: { eventId: String(req.params.id) } }); await tx.calendarEventAttendee.createMany({ data: participantIds!.map((userId) => ({ eventId: String(req.params.id), userId })) }) }
    return tx.calendarEvent.update({ where: { id: String(req.params.id) }, data: dataWithCreator, include: eventInclude })
  })
  const refreshToken = await refreshTokenFor(event.criadorId)
  // Ao "adotar" um evento sem criador, o googleEventId antigo pode pertencer à conta de outra pessoa
  // (ex.: era da conta compartilhada usada antes da conexão por usuário) — trata como sincronização nova.
  if (refreshToken) {
    if (existing.googleEventId && !adoptingCreator) {
      await updateGoogleEvent(refreshToken, existing.googleEventId, googleInput(event))
    } else {
      const googleEventId = await createGoogleEvent(refreshToken, googleInput(event))
      if (googleEventId) event = await prisma.calendarEvent.update({ where: { id: event.id }, data: { googleEventId }, include: eventInclude })
    }
  }
  res.json(serializeEvent(event,req.user!.perfil==='GERENTE'))
}))
calendarRouter.delete('/events/:id', asyncRoute(async (req, res) => {
  const existing = await prisma.calendarEvent.findUniqueOrThrow({ where: { id: String(req.params.id) } })
  await prisma.calendarEvent.delete({ where: { id: existing.id } })
  if (existing.googleEventId) {
    const refreshToken = await refreshTokenFor(existing.criadorId)
    if (refreshToken) await deleteGoogleEvent(refreshToken, existing.googleEventId)
  }
  res.status(204).send()
}))
