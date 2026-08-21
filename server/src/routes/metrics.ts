import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma.js'
import { asyncRoute } from '../http.js'
import { authenticate } from '../auth.js'
import { brWeekBounds } from '../dateUtils.js'

// Métricas são estado compartilhado: qualquer conta autenticada pode consultar e atualizar.
const managerOnly = authenticate

export const metricsRouter=Router();metricsRouter.use(authenticate)
const customBody=z.object({nome:z.string().trim().min(1),canal:z.enum(['INSTAGRAM','LINKEDIN']).nullable().optional(),formula:z.string(),valor:z.number(),unidade:z.enum(['PERCENT','LEADS','SESSOES','NUMERO'])})
metricsRouter.get('/custom',asyncRoute(async(_req,res)=>res.json(await prisma.customMetric.findMany({orderBy:{createdAt:'asc'}}))))
metricsRouter.post('/custom',asyncRoute(async(req,res)=>res.status(201).json(await prisma.customMetric.create({data:customBody.parse(req.body)}))))
metricsRouter.patch('/custom/:id',asyncRoute(async(req,res)=>{const body=customBody.partial().parse(req.body);res.json(await prisma.customMetric.update({where:{id:String(req.params.id)},data:{...body,...(body.valor!==undefined?{atualizadoEm:new Date()}: {})}}))}))
metricsRouter.delete('/custom/:id',asyncRoute(async(req,res)=>{await prisma.customMetric.delete({where:{id:String(req.params.id)}});res.status(204).send()}))

// Marca qualquer registro com atualizadoEm como desatualizado após 20 dias sem edição
const STALE_THRESHOLD_DAYS=20
const withAge=<T extends {atualizadoEm:Date}>(rows:T[])=>{const now=Date.now();return rows.map((row)=>({...row,idadeDias:Math.floor((now-row.atualizadoEm.getTime())/86400000)}))}
const dashboardPayload=async(plataforma:'INSTAGRAM'|'LINKEDIN')=>{
  const [kpis,formatos,funilStories,heatmap,distribution]=await Promise.all([prisma.dashboardKpi.findMany({where:{plataforma}}),prisma.contentFormatPerformance.findMany({where:{plataforma}}),prisma.storyFunnelStep.findMany({where:{plataforma},orderBy:{ordem:'asc'}}),prisma.activityHeatmapCell.findMany({where:{plataforma},orderBy:[{diaSemana:'asc'},{faixaHora:'asc'}]}),prisma.dashboardDistribution.findUnique({where:{plataforma}})])
  const decoratedKpis=withAge(kpis)
  const decoratedFormatos=withAge(formatos)
  const staleItems=[
    ...decoratedKpis.filter((kpi)=>kpi.idadeDias>STALE_THRESHOLD_DAYS).map((kpi)=>({nome:kpi.nome,idadeDias:kpi.idadeDias})),
    ...decoratedFormatos.filter((f)=>f.idadeDias>STALE_THRESHOLD_DAYS).map((f)=>({nome:f.formato,idadeDias:f.idadeDias})),
    ...(distribution&&Math.floor((Date.now()-distribution.updatedAt.getTime())/86400000)>STALE_THRESHOLD_DAYS?[{nome:'Distribuição de alcance',idadeDias:Math.floor((Date.now()-distribution.updatedAt.getTime())/86400000)}]:[]),
  ]
  const {start,end}=brWeekBounds()
  const aggregate=await prisma.post.aggregate({where:{canal:plataforma,dataPublicacao:{gte:start,lt:end}},_sum:{alcance:true}})
  return{plataforma,desatualizadas:{count:staleItems.length,itens:staleItems},kpis:decoratedKpis,alcanceSemanal:aggregate._sum.alcance??0,alcanceSeguidores:distribution?{seguidores:distribution.principalPct,naoSeguidores:distribution.secundarioPct}:null,formatos:decoratedFormatos,funilStories,heatmap}
}
metricsRouter.get('/dashboard',asyncRoute(async(req,res)=>{const plataforma=z.enum(['INSTAGRAM','LINKEDIN']).parse(req.query.plataforma);res.json(await dashboardPayload(plataforma))}))
metricsRouter.put('/dashboard',managerOnly,asyncRoute(async(req,res)=>{const plataforma=z.enum(['INSTAGRAM','LINKEDIN']).parse(req.query.plataforma);const body=z.object({kpis:z.array(z.object({nome:z.string(),valor:z.string(),variacaoPct:z.number().nullable().optional(),descricao:z.string().nullable().optional()})).optional(),alcanceSeguidores:z.object({seguidores:z.number().min(0).max(100),naoSeguidores:z.number().min(0).max(100)}).refine((v)=>Math.round(v.seguidores+v.naoSeguidores)===100).optional(),formatos:z.array(z.object({formato:z.enum(['REELS','CARROSSEL','POST_ESTATICO','STORIES','PDF_DOCUMENTO','TEXTO_IMAGEM','VIDEO','ARTIGO_NEWSLETTER','ENQUETE']),alcanceMedio:z.number().int().min(0).default(0),taxaEngajamento:z.number().min(0).default(0),saves:z.number().int().nullable().optional(),compartilhamentos:z.number().int().nullable().optional(),impressoes:z.number().int().nullable().optional(),ctr:z.number().nullable().optional(),taxaReacao:z.number().nullable().optional(),reposts:z.number().int().nullable().optional(),comentarios:z.number().int().nullable().optional()})).optional(),funilStories:z.array(z.object({ordem:z.number().int().positive(),percentual:z.number().min(0).max(100),espectadores:z.number().int().min(0)})).optional(),heatmap:z.array(z.object({diaSemana:z.number().int().min(0).max(6),faixaHora:z.number().int().min(0).max(23),intensidade:z.number().int().min(0).max(100)})).optional()}).parse(req.body);// "Desatualizada" só pode voltar a ficar "em dia" quando o valor de fato muda — o front reenvia o
// snapshot inteiro (todos os KPIs, todos os formatos) a cada salvamento, então carimbar atualizadoEm
// incondicionalmente aqui reviveria silenciosamente itens que não foram tocados nesse salvamento.
await prisma.$transaction(async(tx)=>{
  for(const kpi of body.kpis??[]){
    const current=await tx.dashboardKpi.findUnique({where:{plataforma_nome:{plataforma,nome:kpi.nome}}})
    const changed=!current||current.valor!==kpi.valor
    await tx.dashboardKpi.upsert({where:{plataforma_nome:{plataforma,nome:kpi.nome}},create:{plataforma,...kpi,atualizadoEm:new Date()},update:changed?{...kpi,atualizadoEm:new Date()}:kpi})
  }
  if(body.alcanceSeguidores){
    const current=await tx.dashboardDistribution.findUnique({where:{plataforma}})
    if(!current)await tx.dashboardDistribution.create({data:{plataforma,principalPct:body.alcanceSeguidores.seguidores,secundarioPct:body.alcanceSeguidores.naoSeguidores}})
    else if(current.principalPct!==body.alcanceSeguidores.seguidores||current.secundarioPct!==body.alcanceSeguidores.naoSeguidores)await tx.dashboardDistribution.update({where:{plataforma},data:{principalPct:body.alcanceSeguidores.seguidores,secundarioPct:body.alcanceSeguidores.naoSeguidores}})
    // se nada mudou, não escreve — updatedAt é @updatedAt e seria carimbado de novo mesmo com os mesmos valores
  }
  for(const row of body.formatos??[]){
    const current=await tx.contentFormatPerformance.findUnique({where:{plataforma_formato:{plataforma,formato:row.formato}}})
    const changed=!current||current.alcanceMedio!==row.alcanceMedio||current.taxaEngajamento!==row.taxaEngajamento||current.saves!==(row.saves??null)||current.compartilhamentos!==(row.compartilhamentos??null)||current.impressoes!==(row.impressoes??null)||current.ctr!==(row.ctr??null)||current.taxaReacao!==(row.taxaReacao??null)||current.reposts!==(row.reposts??null)||current.comentarios!==(row.comentarios??null)
    await tx.contentFormatPerformance.upsert({where:{plataforma_formato:{plataforma,formato:row.formato}},create:{plataforma,...row},update:changed?{...row,atualizadoEm:new Date()}:row})
  }
  for(const row of body.funilStories??[])await tx.storyFunnelStep.upsert({where:{plataforma_ordem:{plataforma,ordem:row.ordem}},create:{plataforma,...row},update:row})
  for(const row of body.heatmap??[])await tx.activityHeatmapCell.upsert({where:{plataforma_diaSemana_faixaHora:{plataforma,diaSemana:row.diaSemana,faixaHora:row.faixaHora}},create:{plataforma,...row},update:row})
})
res.json(await dashboardPayload(plataforma))}))
metricsRouter.get('/dashboard/export',asyncRoute(async(req,res)=>{const plataforma=z.enum(['INSTAGRAM','LINKEDIN']).parse(req.query.plataforma);const formato=z.enum(['csv','pdf']).default('csv').parse(req.query.formato);const data=await dashboardPayload(plataforma);if(formato==='pdf')return res.status(501).json({error:{code:'PDF_EXPORT_NOT_CONFIGURED',message:'Use formato CSV neste ambiente'}});const lines=['Métrica,Valor,Variação,Atualizado em',...data.kpis.map((kpi)=>`"${kpi.nome}","${kpi.valor}",${kpi.variacaoPct??''},${kpi.atualizadoEm.toISOString()}`)];res.type('text/csv').attachment(`citi-hubspot-${plataforma.toLowerCase()}.csv`).send(lines.join('\n'))}))

const globalBody=z.object({followersTotal:z.number().int().min(0),followersGrowth:z.number().int(),channelClicks:z.number().int().min(0),profileVisits:z.number().int().min(0),roi:z.number(),conversions:z.number().int().min(0),reachOverride:z.number().int().min(0),impressionsOverride:z.number().int().min(0),engagementRateOverride:z.number().min(0)})
const globalDefaults:Record<'INSTAGRAM'|'LINKEDIN',z.infer<typeof globalBody>>={
  INSTAGRAM:{followersTotal:18420,followersGrowth:342,channelClicks:624,profileVisits:27130,roi:184.5,conversions:93,reachOverride:48200,impressionsOverride:0,engagementRateOverride:4.8},
  LINKEDIN:{followersTotal:9780,followersGrowth:127,channelClicks:624,profileVisits:14860,roi:163.2,conversions:61,reachOverride:0,impressionsOverride:28400,engagementRateOverride:4.2},
}
const serializeGlobal=(row:any,plataforma:'INSTAGRAM'|'LINKEDIN')=>row?{followersTotal:row.followersTotal,followersGrowth:row.followersGrowth,channelClicks:row.channelClicks,profileVisits:row.profileVisits,roi:row.roi,conversions:row.conversions,reachOverride:row.reachOverride,impressionsOverride:row.impressionsOverride,engagementRateOverride:row.engagementRateOverride}:globalDefaults[plataforma]
metricsRouter.get('/global',asyncRoute(async(req,res)=>{const plataforma=z.enum(['INSTAGRAM','LINKEDIN']).parse(req.query.plataforma);res.json(serializeGlobal(await prisma.channelGlobalMetrics.findUnique({where:{plataforma}}),plataforma))}))
metricsRouter.put('/global',managerOnly,asyncRoute(async(req,res)=>{const plataforma=z.enum(['INSTAGRAM','LINKEDIN']).parse(req.query.plataforma);const body=globalBody.parse(req.body);const row=await prisma.channelGlobalMetrics.upsert({where:{plataforma},create:{plataforma,...body},update:body});res.json(serializeGlobal(row,plataforma))}))

const AUDIENCE_TABS=['CARGO','SENIORIDADE','SETOR','LOCALIZACAO'] as const
const audienceDefaults:Record<typeof AUDIENCE_TABS[number],{label:string;value:number}[]>={
  CARGO:[{label:'Marketing & Comunicação',value:28},{label:'Engenharia & Tecnologia',value:22},{label:'Vendas & Negócios',value:18},{label:'Liderança (C-Level, VP)',value:12},{label:'RH & Gestão de Pessoas',value:8},{label:'Financeiro',value:7},{label:'Outros',value:5}],
  SENIORIDADE:[{label:'Pleno',value:31},{label:'Sênior',value:27},{label:'Gerência',value:19},{label:'Diretoria',value:12},{label:'C-Level',value:7},{label:'Júnior',value:4}],
  SETOR:[{label:'Tecnologia',value:32},{label:'Serviços profissionais',value:23},{label:'Educação',value:16},{label:'Varejo',value:12},{label:'Indústria',value:10},{label:'Outros',value:7}],
  LOCALIZACAO:[{label:'São Paulo',value:38},{label:'Recife',value:19},{label:'Rio de Janeiro',value:16},{label:'Belo Horizonte',value:11},{label:'Curitiba',value:9},{label:'Outros',value:7}],
}
metricsRouter.get('/linkedin-audience',asyncRoute(async(_req,res)=>{
  const rows=await prisma.audienceSegment.findMany({orderBy:{ordem:'asc'}})
  const grouped:Record<string,{label:string;value:number}[]>={}
  for(const tab of AUDIENCE_TABS)grouped[tab]=rows.filter((r)=>r.tab===tab).length?rows.filter((r)=>r.tab===tab).map((r)=>({label:r.label,value:r.value})):audienceDefaults[tab]
  res.json(grouped)
}))
metricsRouter.put('/linkedin-audience',managerOnly,asyncRoute(async(req,res)=>{
  const body=z.object({tab:z.enum(AUDIENCE_TABS),segmentos:z.array(z.object({label:z.string().trim().min(1),value:z.number().int().min(0)})).min(1)}).parse(req.body)
  await prisma.$transaction([
    prisma.audienceSegment.deleteMany({where:{tab:body.tab}}),
    prisma.audienceSegment.createMany({data:body.segmentos.map((s,ordem)=>({tab:body.tab,label:s.label,value:s.value,ordem}))}),
  ])
  res.json({tab:body.tab,segmentos:body.segmentos})
}))

const mqlBody=z.object({scoreMinimo:z.number().int().min(0).max(100),taxaMqlSql:z.number().min(0).max(100),mqlsEsteMes:z.number().int().min(0),tamanhoEmpresa:z.string(),cargosAlvo:z.array(z.string()),segmentos:z.array(z.string()),comportamentos:z.array(z.string())})
const serializeMql=(mql:any)=>mql?{id:mql.id,scoreMinimo:mql.scoreMinimo,taxaMqlSql:mql.taxaMqlSql,mqlsEsteMes:mql.mqlsEsteMes,tamanhoEmpresa:mql.tamanhoEmpresa,cargosAlvo:mql.cargosAlvo.map((x:any)=>x.nome),segmentos:mql.segmentos.map((x:any)=>x.nome),comportamentos:mql.comportamentos.map((x:any)=>x.descricao)}:{scoreMinimo:65,taxaMqlSql:0,mqlsEsteMes:0,tamanhoEmpresa:'',cargosAlvo:[],segmentos:[],comportamentos:[]}
const mqlInclude={cargosAlvo:true,segmentos:true,comportamentos:true} as const
metricsRouter.get('/mql',asyncRoute(async(_req,res)=>res.json(serializeMql(await prisma.mqlDefinition.findFirst({include:mqlInclude})))))
metricsRouter.put('/mql',managerOnly,asyncRoute(async(req,res)=>{const body=mqlBody.parse(req.body);const current=await prisma.mqlDefinition.findFirst();const row=await prisma.$transaction(async(tx)=>{if(current){await Promise.all([tx.mqlTargetRole.deleteMany({where:{mqlId:current.id}}),tx.mqlSegment.deleteMany({where:{mqlId:current.id}}),tx.mqlBehavior.deleteMany({where:{mqlId:current.id}})]);return tx.mqlDefinition.update({where:{id:current.id},data:{scoreMinimo:body.scoreMinimo,taxaMqlSql:body.taxaMqlSql,mqlsEsteMes:body.mqlsEsteMes,tamanhoEmpresa:body.tamanhoEmpresa,cargosAlvo:{create:body.cargosAlvo.map((nome)=>({nome}))},segmentos:{create:body.segmentos.map((nome)=>({nome}))},comportamentos:{create:body.comportamentos.map((descricao)=>({descricao}))}},include:mqlInclude})}return tx.mqlDefinition.create({data:{scoreMinimo:body.scoreMinimo,taxaMqlSql:body.taxaMqlSql,mqlsEsteMes:body.mqlsEsteMes,tamanhoEmpresa:body.tamanhoEmpresa,cargosAlvo:{create:body.cargosAlvo.map((nome)=>({nome}))},segmentos:{create:body.segmentos.map((nome)=>({nome}))},comportamentos:{create:body.comportamentos.map((descricao)=>({descricao}))}},include:mqlInclude})});res.json(serializeMql(row))}))
