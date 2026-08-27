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
import { taskBody, taskPatch } from "./schemas.js"

const taskInclude = {
  coluna: true,
  atribuicoes: { include: { user: true } },
} as const
const serializeTask = (task: any, includeGrades: boolean) => ({
  ...task,
  responsaveis: task.atribuicoes.map((a: any) => ({
    userId: a.userId,
    nome: a.user.nomeCompleto,
    ...(includeGrades ? { nota: a.nota } : {}),
  })),
})

export const kanbanRouter = Router()
kanbanRouter.use(authenticate)
kanbanRouter.get(
  "/assignees",
  asyncRoute(async (_req, res) => {
    const users = await prisma.user.findMany({
      where: { ativo: true, perfil: "ANALISTA" },
      select: { id: true, nomeCompleto: true, cargo: true },
      orderBy: { nomeCompleto: "asc" },
    })
    res.json(users)
  }),
)
kanbanRouter.get(
  "/columns",
  asyncRoute(async (req, res) => {
    const canal = z
      .enum(["INSTAGRAM", "LINKEDIN", "SITE", "EMAIL"])
      .optional()
      .parse(req.query.canal)
    const columns = await prisma.kanbanColumn.findMany({
      orderBy: { ordem: "asc" },
      include: {
        tasks: {
          where: canal ? { redeSocial: canal } : {},
          orderBy: { ordem: "asc" },
          include: taskInclude,
        },
      },
    })
    const includeGrades = req.user!.perfil === "GERENTE"
    res.json(
      columns.map((column) => ({
        ...column,
        tasks: column.tasks.map((task) => serializeTask(task, includeGrades)),
      })),
    )
  }),
)
kanbanRouter.post(
  "/columns",
  asyncRoute(async (req, res) => {
    const body = z
      .object({
        nome: z.string().trim().min(1),
        cor: z.string().optional(),
        isDone: z.boolean().default(false),
      })
      .parse(req.body)
    const max = await prisma.kanbanColumn.aggregate({ _max: { ordem: true } })
    res
      .status(201)
      .json(
        await prisma.kanbanColumn.create({
          data: { ...body, ordem: (max._max.ordem ?? -1) + 1 },
        }),
      )
  }),
)
kanbanRouter.patch(
  "/columns/:id",
  asyncRoute(async (req, res) =>
    res.json(
      await prisma.kanbanColumn.update({
        where: { id: String(req.params.id) },
        data: z
          .object({
            nome: z.string().min(1).optional(),
            cor: z.string().nullable().optional(),
            ordem: z.number().int().min(0).optional(),
            isDone: z.boolean().optional(),
          })
          .parse(req.body),
      }),
    ),
  ),
)
kanbanRouter.delete(
  "/columns/:id",
  asyncRoute(async (req, res) => {
    if (await prisma.task.count({ where: { colunaId: String(req.params.id) } }))
      throw new ApiError(409, "COLUMN_NOT_EMPTY")
    await prisma.kanbanColumn.delete({ where: { id: String(req.params.id) } })
    res.status(204).send()
  }),
)
kanbanRouter.post(
  "/tasks",
  asyncRoute(async (req, res) => {
    const body = taskBody.parse(req.body)
    const ordem = await prisma.task.count({
      where: { colunaId: body.colunaId },
    })
    if (body.responsaveis.some((assignment) => assignment.nota != null))
      throw new ApiError(
        422,
        "GRADE_ONLY_AFTER_CREATION",
        "As notas devem ser atribuídas somente ao editar a task",
      )
    const analystCount = await prisma.user.count({
      where: {
        id: { in: body.responsaveis.map((assignment) => assignment.userId) },
        perfil: "ANALISTA",
        ativo: true,
      },
    })
    if (
      analystCount !==
      new Set(body.responsaveis.map((assignment) => assignment.userId)).size
    )
      throw new ApiError(
        422,
        "INVALID_ASSIGNEE",
        "Somente analistas ativos podem ser responsáveis por tasks",
      )
    const task = await prisma.task.create({
      data: {
        titulo: body.titulo,
        redeSocial: body.redeSocial,
        dificuldade: body.dificuldade,
        dataInicio: body.dataInicio,
        dataEntrega: body.dataEntrega,
        colunaId: body.colunaId,
        ordem,
        atribuicoes: {
          create: body.responsaveis.map((a) => ({
            userId: a.userId,
            nota: a.nota,
          })),
        },
      },
      include: taskInclude,
    })
    res.status(201).json(serializeTask(task, req.user!.perfil === "GERENTE"))
  }),
)
kanbanRouter.patch(
  "/tasks/:id",
  asyncRoute(async (req, res) => {
    const body = taskPatch.parse(req.body)
    const responsaveisProvided = req.body.responsaveis !== undefined
    let assignmentsToSave = body.responsaveis
    if (responsaveisProvided) {
      const analystCount = await prisma.user.count({
        where: {
          id: { in: body.responsaveis!.map((assignment) => assignment.userId) },
          perfil: "ANALISTA",
          ativo: true,
        },
      })
      if (
        analystCount !==
        new Set(body.responsaveis!.map((assignment) => assignment.userId)).size
      )
        throw new ApiError(
          422,
          "INVALID_ASSIGNEE",
          "Somente analistas ativos podem ser responsáveis por tasks",
        )
      if (req.user!.perfil !== "GERENTE") {
        const current = await prisma.taskAssignment.findMany({
          where: { taskId: String(req.params.id) },
        })
        const grades = new Map(
          current.map((assignment) => [assignment.userId, assignment.nota]),
        )
        if (body.responsaveis!.some((assignment) => assignment.nota != null))
          throw new ApiError(
            403,
            "MANAGER_ONLY_GRADING",
            "Somente a gerente pode avaliar a execução da task",
          )
        assignmentsToSave = body.responsaveis!.map((assignment) => ({
          ...assignment,
          nota: grades.get(assignment.userId) ?? null,
        }))
      }
    }
    const task = await prisma.$transaction(async (tx) => {
      if (responsaveisProvided) {
        await tx.taskAssignment.deleteMany({
          where: { taskId: String(req.params.id) },
        })
        await tx.taskAssignment.createMany({
          data: assignmentsToSave!.map((a) => ({
            taskId: String(req.params.id),
            userId: a.userId,
            nota: a.nota,
          })),
        })
      }
      const { responsaveis, ...data } = body
      return tx.task.update({
        where: { id: String(req.params.id) },
        data,
        include: taskInclude,
      })
    })
    res.json(serializeTask(task, req.user!.perfil === "GERENTE"))
  }),
)
kanbanRouter.patch(
  "/tasks/:id/move",
  asyncRoute(async (req, res) => {
    const body = z
      .object({
        colunaId: z.string().uuid(),
        ordem: z.number().int().min(0).default(0),
      })
      .parse(req.body)
    res.json(
      await prisma.task.update({
        where: { id: String(req.params.id) },
        data: body,
      }),
    )
  }),
)
kanbanRouter.delete(
  "/tasks/:id",
  asyncRoute(async (req, res) => {
    await prisma.task.delete({ where: { id: String(req.params.id) } })
    res.status(204).send()
  }),
)
