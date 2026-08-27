import "dotenv/config"
import bcrypt from "bcryptjs"
import { PrismaClient, PerfilUsuario } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não configurada")
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
})

async function main() {
  const managerEmail = process.env.MANAGER_EMAIL?.trim().toLowerCase()
  const managerPassword = process.env.MANAGER_PASSWORD
  if (Boolean(managerEmail) !== Boolean(managerPassword))
    throw new Error(
      "Defina MANAGER_EMAIL e MANAGER_PASSWORD juntos para criar a gerente inicial",
    )
  if (managerEmail && managerPassword) {
    if (managerPassword.length < 12)
      throw new Error("MANAGER_PASSWORD deve ter ao menos 12 caracteres")
    await prisma.user.upsert({
      where: { email: managerEmail },
      update: {},
      create: {
        nomeCompleto: process.env.MANAGER_NAME?.trim() || "Gerente",
        email: managerEmail,
        senhaHash: await bcrypt.hash(managerPassword, 12),
        perfil: PerfilUsuario.GERENTE,
        cargo: "Gerente de Marketing",
        primeiroAcesso: true,
      },
    })
  }
  const columns = [
    ["A Fazer", "#8b5cf6", false],
    ["Em Andamento", "#507AE6", false],
    ["Em Revisão", "#FFB300", false],
    ["Aprovado", "#50E678", true],
    ["Publicado", "#00C853", true],
  ] as const
  for (const [ordem, [nome, cor, isDone]] of columns.entries()) {
    const existing = await prisma.kanbanColumn.findFirst({ where: { nome } })
    if (!existing)
      await prisma.kanbanColumn.create({ data: { nome, cor, isDone, ordem } })
  }

  const daysAgo = (n: number) => new Date(Date.now() - n * 86400000)
  const dashboardKpis = [
    {
      plataforma: "INSTAGRAM" as const,
      nome: "Alcance & Impressões",
      valor: "48,2K",
      variacaoPct: 14,
      descricao: "Últimos 30 dias",
      atualizadoEm: daysAgo(2),
    },
    {
      plataforma: "INSTAGRAM" as const,
      nome: "Taxa de Engajamento",
      valor: "4,8%",
      variacaoPct: 0.3,
      descricao: "(Curtidas + Comentários + Saves) / Alcance",
      atualizadoEm: daysAgo(1),
    },
    // Propositalmente desatualizada (>20 dias) para demonstrar o aviso de métricas obsoletas no dashboard
    {
      plataforma: "INSTAGRAM" as const,
      nome: "CTR — Link na Bio",
      valor: "2,1%",
      variacaoPct: -0.4,
      descricao: "Cliques no link da bio",
      atualizadoEm: daysAgo(25),
    },
    {
      plataforma: "INSTAGRAM" as const,
      nome: "Crescimento de Seguidores",
      valor: "+342",
      variacaoPct: 5.2,
      descricao: "Novos seguidores menos unfollows",
      atualizadoEm: daysAgo(3),
    },
    {
      plataforma: "LINKEDIN" as const,
      nome: "Impressões & Alcance Único",
      valor: "28,4K",
      variacaoPct: 3.1,
      descricao: "Impressões orgânicas + patrocinadas no período",
      atualizadoEm: daysAgo(1),
    },
    {
      plataforma: "LINKEDIN" as const,
      nome: "Taxa de Engajamento Geral",
      valor: "4,2%",
      variacaoPct: 1.8,
      descricao: "(Cliques + Reações + Comentários + Reposts) / Impressões",
      atualizadoEm: daysAgo(2),
    },
    {
      plataforma: "LINKEDIN" as const,
      nome: "Cliques no Website / CTA",
      valor: "+624",
      variacaoPct: 6.4,
      descricao: "Cliques no botão principal da página LinkedIn",
      atualizadoEm: daysAgo(4),
    },
    {
      plataforma: "LINKEDIN" as const,
      nome: "Crescimento de Seguidores",
      valor: "+127",
      variacaoPct: 14.7,
      descricao: "Novos seguidores orgânicos + patrocinados",
      atualizadoEm: daysAgo(1),
    },
  ]
  for (const kpi of dashboardKpis) {
    await prisma.dashboardKpi.upsert({
      where: {
        plataforma_nome: { plataforma: kpi.plataforma, nome: kpi.nome },
      },
      update: {
        valor: kpi.valor,
        variacaoPct: kpi.variacaoPct,
        descricao: kpi.descricao,
        atualizadoEm: kpi.atualizadoEm,
      },
      create: kpi,
    })
  }

  const contentFormats = [
    {
      plataforma: "INSTAGRAM" as const,
      formato: "REELS" as const,
      alcanceMedio: 12400,
      taxaEngajamento: 6.8,
      saves: 892,
      compartilhamentos: 241,
      atualizadoEm: daysAgo(3),
    },
    {
      plataforma: "INSTAGRAM" as const,
      formato: "CARROSSEL" as const,
      alcanceMedio: 4800,
      taxaEngajamento: 5.2,
      saves: 634,
      compartilhamentos: 118,
      atualizadoEm: daysAgo(6),
    },
    {
      plataforma: "INSTAGRAM" as const,
      formato: "POST_ESTATICO" as const,
      alcanceMedio: 3100,
      taxaEngajamento: 3.1,
      saves: 220,
      compartilhamentos: 64,
      atualizadoEm: daysAgo(4),
    },
    // Propositalmente desatualizado (>20 dias), para provar que o aviso cobre formatos e não só os 4 KPIs do topo
    {
      plataforma: "INSTAGRAM" as const,
      formato: "STORIES" as const,
      alcanceMedio: 2200,
      taxaEngajamento: 4.4,
      saves: 0,
      compartilhamentos: 0,
      atualizadoEm: daysAgo(26),
    },
    {
      plataforma: "LINKEDIN" as const,
      formato: "PDF_DOCUMENTO" as const,
      taxaEngajamento: 7.2,
      impressoes: 14200,
      ctr: 4.8,
      taxaReacao: 7.2,
      reposts: 187,
      comentarios: 86,
      atualizadoEm: daysAgo(4),
    },
    {
      plataforma: "LINKEDIN" as const,
      formato: "TEXTO_IMAGEM" as const,
      taxaEngajamento: 5.8,
      impressoes: 9800,
      ctr: 3.6,
      taxaReacao: 5.8,
      reposts: 134,
      comentarios: 72,
      atualizadoEm: daysAgo(6),
    },
    // Propositalmente desatualizado (>20 dias)
    {
      plataforma: "LINKEDIN" as const,
      formato: "VIDEO" as const,
      taxaEngajamento: 6.1,
      impressoes: 7300,
      ctr: 2.9,
      taxaReacao: 6.1,
      reposts: 98,
      comentarios: 54,
      atualizadoEm: daysAgo(29),
    },
    {
      plataforma: "LINKEDIN" as const,
      formato: "ARTIGO_NEWSLETTER" as const,
      taxaEngajamento: 2.8,
      impressoes: 5600,
      ctr: 6.4,
      taxaReacao: 2.8,
      reposts: 150,
      comentarios: 130,
      atualizadoEm: daysAgo(3),
    },
    {
      plataforma: "LINKEDIN" as const,
      formato: "ENQUETE" as const,
      taxaEngajamento: 6.1,
      impressoes: 4800,
      ctr: 8.2,
      taxaReacao: 6.1,
      reposts: 32,
      comentarios: 240,
      atualizadoEm: daysAgo(5),
    },
  ]
  for (const row of contentFormats) {
    await prisma.contentFormatPerformance.upsert({
      where: {
        plataforma_formato: {
          plataforma: row.plataforma,
          formato: row.formato,
        },
      },
      update: row,
      create: row,
    })
  }

  // Distribuição de alcance (Instagram: seguidores vs. não seguidores; LinkedIn: orgânico vs. patrocinado)
  const distributions = [
    { plataforma: "INSTAGRAM" as const, principalPct: 62, secundarioPct: 38 },
    { plataforma: "LINKEDIN" as const, principalPct: 68, secundarioPct: 32 },
  ]
  for (const row of distributions) {
    await prisma.dashboardDistribution.upsert({
      where: { plataforma: row.plataforma },
      update: {},
      create: row,
    })
  }

  // Funil de retenção de Stories (Instagram)
  const storyViews = [3410, 2890, 2410, 1980, 1640, 1320]
  for (const [index, espectadores] of storyViews.entries()) {
    await prisma.storyFunnelStep.upsert({
      where: {
        plataforma_ordem: { plataforma: "INSTAGRAM", ordem: index + 1 },
      },
      update: {},
      create: {
        plataforma: "INSTAGRAM",
        ordem: index + 1,
        espectadores,
        percentual: Math.round((espectadores / storyViews[0]) * 100),
      },
    })
  }

  // Heatmap de atividade (Instagram)
  const heatmapRows = [
    [10, 18, 40, 62, 48, 55, 80, 72, 30],
    [12, 22, 55, 70, 60, 58, 88, 90, 42],
    [8, 16, 48, 64, 52, 60, 82, 78, 35],
    [14, 20, 50, 68, 55, 62, 86, 85, 40],
    [10, 18, 42, 60, 50, 52, 72, 68, 28],
    [6, 10, 22, 40, 38, 50, 65, 60, 45],
    [4, 8, 18, 32, 30, 44, 58, 54, 38],
  ]
  const heatmapHours = [6, 8, 10, 12, 14, 16, 18, 20, 22]
  for (const [diaSemana, row] of heatmapRows.entries()) {
    for (const [column, intensidade] of row.entries()) {
      await prisma.activityHeatmapCell.upsert({
        where: {
          plataforma_diaSemana_faixaHora: {
            plataforma: "INSTAGRAM",
            diaSemana,
            faixaHora: heatmapHours[column],
          },
        },
        update: {},
        create: {
          plataforma: "INSTAGRAM",
          diaSemana,
          faixaHora: heatmapHours[column],
          intensidade,
        },
      })
    }
  }

  // Demografia de audiência (LinkedIn)
  const audienceSeed = {
    CARGO: [
      { label: "Marketing & Comunicação", value: 28 },
      { label: "Engenharia & Tecnologia", value: 22 },
      { label: "Vendas & Negócios", value: 18 },
      { label: "Liderança (C-Level, VP)", value: 12 },
      { label: "RH & Gestão de Pessoas", value: 8 },
      { label: "Financeiro", value: 7 },
      { label: "Outros", value: 5 },
    ],
    SENIORIDADE: [
      { label: "Pleno", value: 31 },
      { label: "Sênior", value: 27 },
      { label: "Gerência", value: 19 },
      { label: "Diretoria", value: 12 },
      { label: "C-Level", value: 7 },
      { label: "Júnior", value: 4 },
    ],
    SETOR: [
      { label: "Tecnologia", value: 32 },
      { label: "Serviços profissionais", value: 23 },
      { label: "Educação", value: 16 },
      { label: "Varejo", value: 12 },
      { label: "Indústria", value: 10 },
      { label: "Outros", value: 7 },
    ],
    LOCALIZACAO: [
      { label: "São Paulo", value: 38 },
      { label: "Recife", value: 19 },
      { label: "Rio de Janeiro", value: 16 },
      { label: "Belo Horizonte", value: 11 },
      { label: "Curitiba", value: 9 },
      { label: "Outros", value: 7 },
    ],
  } as const
  for (const [tab, segments] of Object.entries(audienceSeed)) {
    for (const [ordem, segment] of segments.entries()) {
      await prisma.audienceSegment.upsert({
        where: {
          tab_label: {
            tab: tab as "CARGO" | "SENIORIDADE" | "SETOR" | "LOCALIZACAO",
            label: segment.label,
          },
        },
        update: {},
        create: {
          tab: tab as "CARGO" | "SENIORIDADE" | "SETOR" | "LOCALIZACAO",
          label: segment.label,
          value: segment.value,
          ordem,
        },
      })
    }
  }

  // Campanhas de exemplo. dailyEntries armazena o incremento de cada dia (não o acumulado) porque
  // alcanceAtual/interacoesAtual são calculados no backend como soma de todas as métricas diárias.
  const campaignsSeed = [
    {
      nome: "Lançamento Produto Q3",
      status: "ATIVA" as const,
      objetivo: "Gerar awareness e leads para o novo produto da empresa",
      publico:
        "Marketing managers e C-level de empresas B2B com 50+ funcionários",
      dataInicio: new Date("2026-07-01"),
      dataFim: new Date("2026-08-31"),
      metas: [
        { nome: "Alcance", valor: 50000, ordem: 0 },
        { nome: "Interações", valor: 3000, ordem: 1 },
      ],
      canais: ["INSTAGRAM", "LINKEDIN"] as const,
      dailyEntries: [
        { data: new Date("2026-07-05"), alcance: 4200, interacoes: 180 },
        { data: new Date("2026-07-12"), alcance: 5600, interacoes: 240 },
        { data: new Date("2026-07-19"), alcance: 8600, interacoes: 470 },
        { data: new Date("2026-07-26"), alcance: 9200, interacoes: 450 },
        { data: new Date("2026-07-31"), alcance: 6600, interacoes: 480 },
      ],
    },
    {
      nome: "Black November",
      status: "PLANEJADA" as const,
      objetivo:
        "Converter leads qualificados com oferta especial de final de ano",
      publico: "Leads na base com score > 60, segmento PME",
      dataInicio: new Date("2026-11-01"),
      dataFim: new Date("2026-11-30"),
      metas: [
        { nome: "Alcance", valor: 100000, ordem: 0 },
        { nome: "Interações", valor: 8000, ordem: 1 },
      ],
      canais: ["INSTAGRAM", "EMAIL"] as const,
      dailyEntries: [],
    },
    {
      nome: "Cases de Sucesso",
      status: "ATIVA" as const,
      objetivo: "Construir autoridade de marca e gerar MQLs qualificados",
      publico: "Decision makers em tech e serviços financeiros",
      dataInicio: new Date("2026-06-15"),
      dataFim: new Date("2026-08-15"),
      metas: [
        { nome: "Alcance", valor: 20000, ordem: 0 },
        { nome: "Interações", valor: 1000, ordem: 1 },
      ],
      canais: ["LINKEDIN", "SITE"] as const,
      dailyEntries: [
        { data: new Date("2026-06-20"), alcance: 2100, interacoes: 95 },
        { data: new Date("2026-06-27"), alcance: 3700, interacoes: 145 },
        { data: new Date("2026-07-04"), alcance: 3400, interacoes: 170 },
        { data: new Date("2026-07-11"), alcance: 3700, interacoes: 180 },
        { data: new Date("2026-07-18"), alcance: 2800, interacoes: 150 },
        { data: new Date("2026-07-25"), alcance: 2700, interacoes: 180 },
      ],
    },
  ]
  for (const { canais, dailyEntries, metas, ...data } of campaignsSeed) {
    const existing = await prisma.campaign.findFirst({
      where: { nome: data.nome },
    })
    if (existing) continue
    await prisma.campaign.create({
      data: {
        ...data,
        canais: { create: canais.map((canal) => ({ canal })) },
        metricasDiarias: { create: dailyEntries },
        metas: { create: metas },
      },
    })
  }

  // Prompts de exemplo
  const promptsSeed = [
    {
      titulo: "Caption engajante com CTA",
      categoria: "INSTAGRAM" as const,
      conteudo:
        "Crie uma legenda para Instagram sobre [TEMA] no formato:\n1. Gancho impactante (1ª linha)\n2. Desenvolvimento em 3-4 pontos com emojis\n3. CTA claro e específico\n4. 3-5 hashtags\nTom: [PROFISSIONAL/DESCONTRAÍDO]",
      tags: ["caption", "cta", "engajamento"],
      favorito: true,
      usos: 47,
    },
    {
      titulo: "Post de Thought Leadership",
      categoria: "LINKEDIN" as const,
      conteudo:
        "Escreva um post de LinkedIn sobre [TEMA] para [CARGO]:\n- Afirmação contraintuitiva ou dado surpresa\n- 3 parágrafos curtos (max 3 linhas)\n- Pergunta que gere comentários\n- Tom: autoridade sem arrogância · 150-200 palavras",
      tags: ["thought leadership", "autoridade"],
      favorito: true,
      usos: 31,
    },
    {
      titulo: "Subject lines de alto CTR",
      categoria: "EMAIL" as const,
      conteudo:
        "Gere 5 assuntos de email para [OBJETIVO]:\n- Curiosidade/mistério\n- Benefício direto + número\n- Urgência/escassez\n- Pergunta pessoal\n- Controverso\nPúblico: [PERSONA] · Meta: +20% vs taxa atual.",
      tags: ["email", "subject line", "conversão"],
      favorito: false,
      usos: 28,
    },
    {
      titulo: "Estrutura de carrossel educativo",
      categoria: "CARROSSEL" as const,
      conteudo:
        "Crie um carrossel com 8 slides sobre [TEMA]:\nSlide 1: Capa — título + promessa\nSlide 2: O problema\nSlides 3-7: Uma dica por slide\nSlide 8: CTA + marca",
      tags: ["carrossel", "educativo"],
      favorito: true,
      usos: 52,
    },
    {
      titulo: "Meta description para SEO",
      categoria: "SITE" as const,
      conteudo:
        "Escreva 3 meta descriptions para [PÁGINA] sobre [TEMA]:\n- Inclua keyword: [KEYWORD]\n- Máximo 155 caracteres\n- Verbo de ação\n- Destaque o diferencial",
      tags: ["seo", "meta description"],
      favorito: false,
      usos: 19,
    },
    {
      titulo: "Anúncio de vaga atrativo",
      categoria: "LINKEDIN" as const,
      conteudo:
        "Post de LinkedIn anunciando vaga de [CARGO]:\n- Abra com o impacto do cargo\n- Missão em uma frase\n- 3-5 responsabilidades como desafios\n- 1 benefício inusitado\n- CTA: marcar alguém ideal",
      tags: ["recrutamento", "employer branding"],
      favorito: false,
      usos: 12,
    },
    {
      titulo: "Script de Reels 30 segundos",
      categoria: "INSTAGRAM" as const,
      conteudo:
        "Script de Reels 30s sobre [TEMA]:\n0-3s: Hook + frase impacto\n3-10s: Setup do problema\n10-25s: Solução em 3 passos\n25-30s: CTA + texto na tela",
      tags: ["reels", "script", "video"],
      favorito: true,
      usos: 38,
    },
    {
      titulo: "Email de nutrição de lead",
      categoria: "EMAIL" as const,
      conteudo:
        "Email de nutrição para leads que baixaram [MATERIAL] há [X] dias:\n- Assunto: referência ao material\n- 1 insight adicional prático\n- CTA: próximo passo na jornada\n- Máximo 200 palavras",
      tags: ["nurturing", "automação"],
      favorito: false,
      usos: 22,
    },
  ]
  for (const { tags, ...data } of promptsSeed) {
    const existing = await prisma.prompt.findFirst({
      where: { titulo: data.titulo },
    })
    if (existing) continue
    await prisma.prompt.create({
      data: { ...data, tags: { create: tags.map((tag) => ({ tag })) } },
    })
  }

  // Métrica personalizada de exemplo, propositalmente desatualizada — demonstra que o aviso também cobre métricas do usuário
  const staleCustomMetricNome = "Taxa de Conversão de Leads"
  const existingCustomMetric = await prisma.customMetric.findFirst({
    where: { nome: staleCustomMetricNome },
  })
  if (!existingCustomMetric) {
    await prisma.customMetric.create({
      data: {
        nome: staleCustomMetricNome,
        canal: "INSTAGRAM",
        formula: "Leads convertidos / Leads totais × 100",
        valor: 12.4,
        unidade: "PERCENT",
        atualizadoEm: daysAgo(24),
        createdAt: daysAgo(40),
      },
    })
  }
}

main().finally(() => prisma.$disconnect())
