import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma.js'
import { ApiError, asyncRoute } from '../http.js'
import { authenticate, managerOnly } from '../auth.js'

const campaignBodyBase = z.object({ nome: z.string().trim().min(1), status: z.enum(['ATIVA','PLANEJADA','ENCERRADA']), objetivo: z.string().trim().min(1), publico: z.string().trim().min(1), dataInicio: z.coerce.date(), dataFim: z.coerce.date(), alcanceMeta: z.number().int().min(0), interacoesMeta: z.number().int().min(0), canais: z.array(z.enum(['INSTAGRAM','LINKEDIN','SITE','EMAIL'])).min(1) })
// .partial() não é suportado em schemas com .refine() (Zod v4) — o PATCH usa campaignBodyBase.partial() e valida a ordem das datas manualmente após o parse
const campaignBody = campaignBodyBase.refine((value) => value.dataFim >= value.dataInicio, { message: 'dataFim deve ser posterior à dataInicio' })
const campaignInclude = { canais: true, metricasDiarias: { orderBy: { data: 'asc' as const } } } as const
const serializeCampaign = (campaign: any) => {
  const alcanceAtual = campaign.metricasDiarias.reduce((sum: number, metric: any) => sum + metric.alcance, 0)
  const interacoesAtual = campaign.metricasDiarias.reduce((sum: number, metric: any) => sum + metric.interacoes, 0)
  const end = Math.min(Date.now(), new Date(campaign.dataFim).getTime())
  return { ...campaign, canais: campaign.canais.map((entry: any) => entry.canal), alcanceAtual, interacoesAtual, progressoAlcance: campaign.alcanceMeta ? Math.min(1, alcanceAtual / campaign.alcanceMeta) : 0, progressoInteracoes: campaign.interacoesMeta ? Math.min(1, interacoesAtual / campaign.interacoesMeta) : 0, diasNoAr: Math.max(0, Math.floor((end - new Date(campaign.dataInicio).getTime()) / 86400000)), totalRegistrosMetricas: campaign.metricasDiarias.length }
}

export const campaignsRouter = Router(); campaignsRouter.use(authenticate)
campaignsRouter.get('/', asyncRoute(async (req, res) => {
  const q = z.object({ ordenar: z.enum(['alcance','interacao']).optional(), canal: z.enum(['INSTAGRAM','LINKEDIN','SITE','EMAIL']).optional() }).parse(req.query)
  let rows = (await prisma.campaign.findMany({ where: q.canal ? { canais: { some: { canal: q.canal } } } : {}, include: campaignInclude, orderBy: { dataInicio: 'desc' } })).map(serializeCampaign)
  if (q.ordenar === 'alcance') rows.sort((a,b) => b.alcanceAtual-a.alcanceAtual); if (q.ordenar === 'interacao') rows.sort((a,b) => b.interacoesAtual-a.interacoesAtual)
  res.json(rows)
}))
campaignsRouter.post('/', asyncRoute(async (req, res) => { const body=campaignBody.parse(req.body); const {canais,...data}=body; const row=await prisma.campaign.create({data:{...data,canais:{create:canais.map((canal)=>({canal}))}},include:campaignInclude}); res.status(201).json(serializeCampaign(row)) }))
campaignsRouter.patch('/:id', asyncRoute(async (req,res)=>{ const current=await prisma.campaign.findUnique({where:{id:String(req.params.id)}}); if(!current) throw new ApiError(404,'NOT_FOUND'); const body=campaignBodyBase.partial().parse(req.body); const dataInicio=body.dataInicio??current.dataInicio; const dataFim=body.dataFim??current.dataFim; if(dataFim<dataInicio) throw new ApiError(422,'INVALID_DATE_RANGE','dataFim deve ser posterior à dataInicio'); const {canais,...data}=body; const row=await prisma.$transaction(async(tx)=>{if(canais){await tx.campaignChannel.deleteMany({where:{campaignId:String(req.params.id)}});await tx.campaignChannel.createMany({data:canais.map((canal)=>({campaignId:String(req.params.id),canal}))})}return tx.campaign.update({where:{id:String(req.params.id)},data,include:campaignInclude})});res.json(serializeCampaign(row)) }))
campaignsRouter.delete('/:id',asyncRoute(async(req,res)=>{await prisma.campaign.delete({where:{id:String(req.params.id)}});res.status(204).send()}))
campaignsRouter.get('/:id/metrics',asyncRoute(async(req,res)=>res.json(await prisma.campaignDailyMetric.findMany({where:{campaignId:String(req.params.id)},orderBy:{data:'asc'}}))))
campaignsRouter.post('/:id/metrics',asyncRoute(async(req,res)=>{if(!await prisma.campaign.findUnique({where:{id:String(req.params.id)}}))throw new ApiError(404,'NOT_FOUND');const body=z.object({data:z.coerce.date(),alcance:z.number().int().min(0),interacoes:z.number().int().min(0)}).parse(req.body);const metric=await prisma.campaignDailyMetric.upsert({where:{campaignId_data:{campaignId:String(req.params.id),data:body.data}},create:{campaignId:String(req.params.id),...body},update:{alcance:body.alcance,interacoes:body.interacoes}});res.status(201).json(metric)}))
campaignsRouter.delete('/:id/metrics/:metricId',asyncRoute(async(req,res)=>{await prisma.campaignDailyMetric.delete({where:{id:String(req.params.metricId)}});res.status(204).send()}))

export const engagementRouter = Router(); engagementRouter.use(authenticate,managerOnly)
const monthBounds=(period:string)=>{if(!/^\d{4}-\d{2}$/.test(period))throw new ApiError(422,'INVALID_PERIOD');const start=new Date(`${period}-01T00:00:00.000Z`);const end=new Date(Date.UTC(start.getUTCFullYear(),start.getUTCMonth()+1,1));return{start,end}}
const manualCriterionWhere={nome:{notIn:['Pontualidade','Presença']}}
const eventEnd=(event:{data:Date;horario:string;horarioFim:string|null})=>{
  const date=event.data.toISOString().slice(0,10)
  const endTime=event.horarioFim??`${String((Number(event.horario.slice(0,2))+1)%24).padStart(2,'0')}:${event.horario.slice(3)}`
  const endDate=endTime<event.horario?new Date(new Date(`${date}T12:00:00.000Z`).getTime()+86400000).toISOString().slice(0,10):date
  return new Date(`${endDate}T${endTime}:00-03:00`)
}

// Critérios de avaliação configuráveis pela Gerente (ex.: Pontualidade, Presença, Autonomia).
// "Qualidade" não é um critério aqui — continua calculada automaticamente a partir das notas das tasks.
engagementRouter.get('/criteria',asyncRoute(async(_req,res)=>res.json(await prisma.engagementCriterion.findMany({where:manualCriterionWhere,orderBy:{ordem:'asc'}}))))
engagementRouter.post('/criteria',asyncRoute(async(req,res)=>{const body=z.object({nome:z.string().trim().min(1).refine((nome)=>!['pontualidade','presença','presenca'].includes(nome.toLocaleLowerCase('pt-BR')),{message:'Pontualidade e Presença são calculadas automaticamente'})}).parse(req.body);const max=await prisma.engagementCriterion.aggregate({_max:{ordem:true}});res.status(201).json(await prisma.engagementCriterion.create({data:{nome:body.nome,ordem:(max._max.ordem??-1)+1}}))}))
engagementRouter.patch('/criteria/:id',asyncRoute(async(req,res)=>{const body=z.object({nome:z.string().trim().min(1).optional(),ordem:z.number().int().optional()}).parse(req.body);res.json(await prisma.engagementCriterion.update({where:{id:String(req.params.id)},data:body}))}))
engagementRouter.delete('/criteria/:id',asyncRoute(async(req,res)=>{await prisma.engagementCriterion.delete({where:{id:String(req.params.id)}});res.status(204).send()}))

engagementRouter.get('/attendance/events',asyncRoute(async(req,res)=>{
  const period=z.string().default(new Date().toISOString().slice(0,7)).parse(req.query.periodo)
  const {start,end}=monthBounds(period)
  const events=await prisma.calendarEvent.findMany({
    where:{data:{gte:start,lt:end},tipo:'REUNIAO'},orderBy:[{data:'desc'},{horario:'desc'}],
    include:{participantes:{where:{user:{ativo:true,perfil:'ANALISTA'}},include:{user:true}}},
  })
  const finalized=events.filter((event)=>eventEnd(event)<=new Date()).map((event)=>({
    id:event.id,titulo:event.titulo,data:event.data,horario:event.horario,horarioFim:event.horarioFim,
    encerradoEm:eventEnd(event),
    pendente:event.participantes.some((participant)=>participant.statusPresenca===null),
    participantes:event.participantes.map((participant)=>({userId:participant.userId,nome:participant.user.nomeCompleto,status:participant.statusPresenca})),
  }))
  const pending=finalized.filter((event)=>event.pendente)
  res.json({pendentes:pending.length,eventos:pending})
}))

engagementRouter.put('/attendance/events/:eventId',asyncRoute(async(req,res)=>{
  const eventId=String(req.params.eventId)
  const event=await prisma.calendarEvent.findUnique({where:{id:eventId},include:{participantes:{include:{user:true}}}})
  if(!event)throw new ApiError(404,'NOT_FOUND','Evento não encontrado')
  if(event.tipo!=='REUNIAO')throw new ApiError(422,'NOT_A_MEETING','Presença e pontualidade só podem ser registradas em reuniões')
  if(eventEnd(event)>new Date())throw new ApiError(422,'EVENT_NOT_FINISHED','A presença só pode ser registrada após o encerramento do evento')
  const body=z.object({participantes:z.array(z.object({userId:z.string().uuid(),status:z.enum(['PRESENTE','AUSENTE','ATRASADO'])})).min(1)}).parse(req.body)
  const analystIds=new Set(event.participantes.filter((participant)=>participant.user.ativo&&participant.user.perfil==='ANALISTA').map((participant)=>participant.userId))
  if(body.participantes.some((participant)=>!analystIds.has(participant.userId)))throw new ApiError(422,'INVALID_PARTICIPANT','Somente analistas participantes do evento podem ser avaliados')
  await prisma.$transaction(body.participantes.map((participant)=>prisma.calendarEventAttendee.update({
    where:{eventId_userId:{eventId,userId:participant.userId}},data:{statusPresenca:participant.status,presencaRegistradaEm:new Date()},
  })))
  res.json({ok:true})
}))

engagementRouter.get('/',asyncRoute(async(req,res)=>{
  const period=z.string().default(new Date().toISOString().slice(0,7)).parse(req.query.periodo)
  const {start,end}=monthBounds(period)
  const [criterios,users]=await Promise.all([
    prisma.engagementCriterion.findMany({where:manualCriterionWhere,orderBy:{ordem:'asc'}}),
    prisma.user.findMany({where:{ativo:true,perfil:'ANALISTA'},include:{
      engajamentos:{where:{periodo:period}},
      pontuacoesEngajamento:{where:{periodo:period}},
      atribuicoes:{where:{task:{OR:[{dataEntrega:{gte:start,lt:end}},{dataEntrega:null,createdAt:{gte:start,lt:end}}]}},include:{task:{include:{coluna:true}}}},
      participacoes:{where:{event:{data:{gte:start,lt:end},tipo:'REUNIAO'}},include:{event:true}},
    }}),
  ])
  const membros=users.map((user)=>{
    const manual=user.engajamentos[0]
    const graded=user.atribuicoes.map((a)=>a.nota).filter((n):n is number=>n!==null)
    const scores:Record<string,number|null>={}
    for(const c of criterios){const s=user.pontuacoesEngajamento.find((p)=>p.criterionId===c.id);scores[c.id]=s?.valor??null}
    const attendance=user.participacoes.filter((participation)=>eventEnd(participation.event)<=new Date()&&participation.statusPresenca!==null)
    const attended=attendance.filter((participation)=>participation.statusPresenca!=='AUSENTE')
    const onTime=attendance.filter((participation)=>participation.statusPresenca==='PRESENTE')
    const presenca=attendance.length?Math.round(attended.length/attendance.length*50)/10:null
    const pontualidade=attended.length?Math.round(onTime.length/attended.length*50)/10:null
    return{userId:user.id,nome:user.nomeCompleto,cargo:user.cargo,observacoes:manual?.observacoes??null,qualidade:graded.length?Math.round(graded.reduce((a,b)=>a+b,0)/graded.length*10)/10:null,presenca,pontualidade,eventosRegistrados:attendance.length,comparecimentos:attended.length,scores,tasksTotal:user.atribuicoes.length,tasksConcluidas:user.atribuicoes.filter((a)=>a.task.coluna.isDone).length}
  })
  const avg=(values:(number|null)[])=>{const nums=values.filter((v):v is number=>v!==null);return nums.length?Math.round(nums.reduce((a,b)=>a+b,0)/nums.length*10)/10:null}
  const porCriterio:Record<string,number|null>={}
  for(const c of criterios)porCriterio[c.id]=avg(membros.map((m)=>m.scores[c.id]))
  res.json({periodo:period,criterios,medias:{qualidade:avg(membros.map((m)=>m.qualidade)),presenca:avg(membros.map((m)=>m.presenca)),pontualidade:avg(membros.map((m)=>m.pontualidade)),porCriterio},membros})
}))
engagementRouter.put('/:userId',asyncRoute(async(req,res)=>{
  const periodo=z.string().parse(req.query.periodo);monthBounds(periodo)
  const userId=String(req.params.userId)
  const body=z.object({observacoes:z.string().nullable().optional(),scores:z.array(z.object({criterionId:z.string(),valor:z.number().min(0).max(5).nullable()})).optional()}).parse(req.body)
  await prisma.$transaction(async(tx)=>{
    if(body.observacoes!==undefined)await tx.teamEngagement.upsert({where:{userId_periodo:{userId,periodo}},create:{userId,periodo,observacoes:body.observacoes},update:{observacoes:body.observacoes}})
    for(const s of body.scores??[])await tx.engagementScore.upsert({where:{criterionId_userId_periodo:{criterionId:s.criterionId,userId,periodo}},create:{criterionId:s.criterionId,userId,periodo,valor:s.valor},update:{valor:s.valor}})
  })
  res.json({ok:true})
}))
