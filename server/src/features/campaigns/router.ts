import { Router } from "express"
import { z } from "zod"
import { prisma } from "../../prisma.js"
import { ApiError, asyncRoute } from "../../http.js"
import { authenticate, managerOnly } from "../../auth.js"
import { brToday, utcDateStr, brMonthBounds } from "../../dateUtils.js"

const campaignGoalBody = z.object({
  nome: z.string().trim().min(1),
  valor: z.number().min(0),
  mostrarGrafico: z.boolean().default(true),
})
// status não é mais informado pela pessoa: é sempre derivado da data atual em relação a dataInicio/dataFim (ver deriveStatus)
const campaignBodyBase = z.object({
  nome: z.string().trim().min(1),
  objetivo: z.string().trim().min(1),
  publico: z.string().trim().min(1),
  dataInicio: z.coerce.date(),
  dataFim: z.coerce.date(),
  canais: z.array(z.enum(["INSTAGRAM", "LINKEDIN", "SITE", "EMAIL"])).min(1),
})
// .partial() não é suportado em schemas com .refine() (Zod v4) — o PATCH usa campaignBodyBase.partial() e valida a ordem das datas manualmente após o parse
// metas é aceito só na criação: permite já nascer com as metas personalizadas escolhidas no próprio formulário de "Nova Campanha"
const campaignBody = campaignBodyBase
  .extend({ metas: z.array(campaignGoalBody).optional().default([]) })
  .refine((value) => value.dataFim >= value.dataInicio, {
    message: "dataFim deve ser posterior à dataInicio",
  })
const campaignInclude = {
  canais: true,
  metricasDiarias: {
    orderBy: { data: "asc" as const },
    include: { valores: true },
  },
  metas: { orderBy: { ordem: "asc" as const } },
} as const
const deriveStatus = (dataInicio: Date, dataFim: Date) => {
  const today = brToday()
  if (today < utcDateStr(dataInicio)) return "PLANEJADA"
  if (today > utcDateStr(dataFim)) return "ENCERRADA"
  return "ATIVA"
}
const serializeCampaign = (campaign: any) => {
  const alcanceAtual = campaign.metricasDiarias.reduce(
    (sum: number, metric: any) => sum + metric.alcance,
    0,
  )
  const interacoesAtual = campaign.metricasDiarias.reduce(
    (sum: number, metric: any) => sum + metric.interacoes,
    0,
  )
  const end = Math.min(Date.now(), new Date(campaign.dataFim).getTime())
  return {
    ...campaign,
    status: deriveStatus(campaign.dataInicio, campaign.dataFim),
    canais: campaign.canais.map((entry: any) => entry.canal),
    alcanceAtual,
    interacoesAtual,
    diasNoAr: Math.max(
      0,
      Math.floor((end - new Date(campaign.dataInicio).getTime()) / 86400000),
    ),
    totalRegistrosMetricas: campaign.metricasDiarias.length,
  }
}

export const campaignsRouter = Router()
campaignsRouter.use(authenticate)
campaignsRouter.get(
  "/",
  asyncRoute(async (req, res) => {
    const q = z
      .object({
        ordenar: z.enum(["alcance", "interacao"]).optional(),
        canal: z.enum(["INSTAGRAM", "LINKEDIN", "SITE", "EMAIL"]).optional(),
      })
      .parse(req.query)
    let rows = (
      await prisma.campaign.findMany({
        where: q.canal ? { canais: { some: { canal: q.canal } } } : {},
        include: campaignInclude,
        orderBy: { createdAt: "desc" },
      })
    ).map(serializeCampaign)
    if (q.ordenar === "alcance")
      rows.sort((a, b) => b.alcanceAtual - a.alcanceAtual)
    if (q.ordenar === "interacao")
      rows.sort((a, b) => b.interacoesAtual - a.interacoesAtual)
    res.json(rows)
  }),
)
campaignsRouter.post(
  "/",
  asyncRoute(async (req, res) => {
    const body = campaignBody.parse(req.body)
    const { canais, metas, ...data } = body
    const row = await prisma.campaign.create({
      data: {
        ...data,
        canais: { create: canais.map((canal) => ({ canal })) },
        metas: { create: metas.map((m, i) => ({ ...m, ordem: i })) },
      },
      include: campaignInclude,
    })
    res.status(201).json(serializeCampaign(row))
  }),
)
campaignsRouter.patch(
  "/:id",
  asyncRoute(async (req, res) => {
    const current = await prisma.campaign.findUnique({
      where: { id: String(req.params.id) },
    })
    if (!current) throw new ApiError(404, "NOT_FOUND")
    const body = campaignBodyBase.partial().parse(req.body)
    const dataInicio = body.dataInicio ?? current.dataInicio
    const dataFim = body.dataFim ?? current.dataFim
    if (dataFim < dataInicio)
      throw new ApiError(
        422,
        "INVALID_DATE_RANGE",
        "dataFim deve ser posterior à dataInicio",
      )
    const { canais, ...data } = body
    const row = await prisma.$transaction(async (tx) => {
      if (canais) {
        await tx.campaignChannel.deleteMany({
          where: { campaignId: String(req.params.id) },
        })
        await tx.campaignChannel.createMany({
          data: canais.map((canal) => ({
            campaignId: String(req.params.id),
            canal,
          })),
        })
      }
      return tx.campaign.update({
        where: { id: String(req.params.id) },
        data,
        include: campaignInclude,
      })
    })
    res.json(serializeCampaign(row))
  }),
)
campaignsRouter.delete(
  "/:id",
  asyncRoute(async (req, res) => {
    await prisma.campaign.delete({ where: { id: String(req.params.id) } })
    res.status(204).send()
  }),
)
campaignsRouter.get(
  "/:id/metrics",
  asyncRoute(async (req, res) =>
    res.json(
      await prisma.campaignDailyMetric.findMany({
        where: { campaignId: String(req.params.id) },
        orderBy: { data: "asc" },
        include: { valores: true },
      }),
    ),
  ),
)
// valores: pares {nome,valor} para os insights personalizados (metas livres) naquela data, permitindo
// plotar a evolução de qualquer meta (não só alcance/interações) no gráfico de métricas diárias
campaignsRouter.post(
  "/:id/metrics",
  asyncRoute(async (req, res) => {
    if (
      !(await prisma.campaign.findUnique({
        where: { id: String(req.params.id) },
      }))
    )
      throw new ApiError(404, "NOT_FOUND")
    const body = z
      .object({
        data: z.coerce.date(),
        alcance: z.number().int().min(0),
        interacoes: z.number().int().min(0),
        mostrarGrafico: z.boolean().default(true),
        valores: z
          .array(
            z.object({ nome: z.string().trim().min(1), valor: z.number() }),
          )
          .optional()
          .default([]),
      })
      .parse(req.body)
    const metric = await prisma.$transaction(async (tx) => {
      const row = await tx.campaignDailyMetric.upsert({
        where: {
          campaignId_data: {
            campaignId: String(req.params.id),
            data: body.data,
          },
        },
        create: {
          campaignId: String(req.params.id),
          data: body.data,
          alcance: body.alcance,
          interacoes: body.interacoes,
          mostrarGrafico: body.mostrarGrafico,
        },
        update: {
          alcance: body.alcance,
          interacoes: body.interacoes,
          mostrarGrafico: body.mostrarGrafico,
        },
      })
      await tx.campaignMetricValue.deleteMany({
        where: { dailyMetricId: row.id },
      })
      if (body.valores.length)
        await tx.campaignMetricValue.createMany({
          data: body.valores.map((v) => ({
            dailyMetricId: row.id,
            nome: v.nome,
            valor: v.valor,
          })),
        })
      return tx.campaignDailyMetric.findUniqueOrThrow({
        where: { id: row.id },
        include: { valores: true },
      })
    })
    res.status(201).json(metric)
  }),
)
campaignsRouter.delete(
  "/:id/metrics/:metricId",
  asyncRoute(async (req, res) => {
    await prisma.campaignDailyMetric.delete({
      where: { id: String(req.params.metricId) },
    })
    res.status(204).send()
  }),
)

// Metas de campanha: livres, quantas a pessoa quiser, cada uma com um nome escolhido por ela (Alcance,
// Interações, CTR, o que for relevante para aquela campanha específica).
campaignsRouter.post(
  "/:id/goals",
  asyncRoute(async (req, res) => {
    if (
      !(await prisma.campaign.findUnique({
        where: { id: String(req.params.id) },
      }))
    )
      throw new ApiError(404, "NOT_FOUND")
    const body = campaignGoalBody.parse(req.body)
    const max = await prisma.campaignGoal.aggregate({
      where: { campaignId: String(req.params.id) },
      _max: { ordem: true },
    })
    const goal = await prisma.campaignGoal.create({
      data: {
        campaignId: String(req.params.id),
        ...body,
        ordem: (max._max.ordem ?? -1) + 1,
      },
    })
    res.status(201).json(goal)
  }),
)
campaignsRouter.patch(
  "/:id/goals/:goalId",
  asyncRoute(async (req, res) => {
    const body = campaignGoalBody.partial().parse(req.body)
    res.json(
      await prisma.campaignGoal.update({
        where: { id: String(req.params.goalId) },
        data: body,
      }),
    )
  }),
)
campaignsRouter.delete(
  "/:id/goals/:goalId",
  asyncRoute(async (req, res) => {
    await prisma.campaignGoal.delete({
      where: { id: String(req.params.goalId) },
    })
    res.status(204).send()
  }),
)

