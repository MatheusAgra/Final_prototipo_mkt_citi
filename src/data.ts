export interface AppUser {
  id: number | string
  name: string
  initials: string
  color: string
  email: string
  password: string
  role: 'gerente' | 'analista'
  mustChangePassword: boolean
}

export const initialUsers: AppUser[] = [
  { id: 1, name: 'Ana Lima', initials: 'AL', color: '#00E5C8', email: 'ana@marketops.com', password: 'admin123', role: 'gerente', mustChangePassword: false },
  { id: 2, name: 'Carlos Melo', initials: 'CM', color: '#00C853', email: 'carlos@marketops.com', password: 'senha123', role: 'analista', mustChangePassword: false },
  { id: 3, name: 'Beatriz Santos', initials: 'BS', color: '#FFB300', email: 'beatriz@marketops.com', password: 'senha123', role: 'analista', mustChangePassword: true },
  { id: 4, name: 'Rafael Costa', initials: 'RC', color: '#E1306C', email: 'rafael@marketops.com', password: 'senha123', role: 'analista', mustChangePassword: false },
]

export type ChannelType = 'instagram' | 'linkedin' | 'site' | 'email'
export type Priority = 'alta' | 'média' | 'baixa'
export type Difficulty = 'fácil' | 'médio' | 'difícil'
export type CampaignStatus = 'ativa' | 'planejada' | 'encerrada'

export interface TaskAssignee {
  memberId: number | string
  note: number | null
}

export interface Task {
  id: string
  title: string
  channel: ChannelType
  assignees: TaskAssignee[]
  priority: Priority
  difficulty: Difficulty
  startDate?: string
  dueDate: string
}

export interface KanbanColumn {
  id: string
  name: string
  tasks: Task[]
}

export interface CampaignMetricEntry {
  id?: string
  date: string
  reach: number
  interactions: number
}

export interface Campaign {
  id: string
  name: string
  channels: ChannelType[]
  objective: string
  audience: string
  startDate: string
  endDate: string
  reach: number
  targetReach: number
  interactions: number
  targetInteractions: number
  status: CampaignStatus
  daysRunning: number
  dailyEntries: CampaignMetricEntry[]
}

export interface TeamMember {
  id: number
  name: string
  role: string
  initials: string
  color: string
}


export interface CalendarEvent {
  id: string
  date: string // YYYY-MM-DD
  title: string
  time: string
  endTime: string
  type: 'meeting' | 'deadline' | 'task'
  channel: ChannelType | null
  local: 'meet' | 'presencial' | ''
  sala: string
  attendanceConfirmed: boolean
  attendees: { userId: string; nome: string; attendanceEligible: boolean; attendanceStatus: 'PRESENTE' | 'AUSENTE' | 'ATRASADO' | null }[]
}

export interface PostMedia {
  url: string
  tipo: 'imagem' | 'video'
}

export interface Post {
  id: number | string
  title: string
  channel: ChannelType
  campaign: string
  images: PostMedia[]
  linkUrl?: string
  ctr?: number
  profileVisits?: number
  caption: string
  format: 'reel' | 'carousel' | 'static' | 'story' | 'document' | 'video' | 'article' | 'poll'
  insights: {
    likes: number
    reach: number
    impressions: number
    engagement: number
    saves: number
    shares: number
    comments: number
  }
  publishedAt: string
  validUntil: string
}

export interface Material {
  id: number | string
  type: 'ebook' | 'newsletter' | 'case'
  title: string
  description: string
  cover: string
  downloads: number
  createdAt: string
  arquivoUrl?: string
  arquivoNome?: string
  arquivoTamanho?: number
}

export interface Prompt {
  id: string
  category: string
  title: string
  content: string
  tags: string[]
  favorited: boolean
  usageCount: number
}

export interface CustomMetric {
  id: string
  name: string
  value: number
  unit: string
  formula: string
  channel?: ChannelType
  color: string
  updatedAt?: string
}

export interface SEOState {
  domainAuthority: number
  organicTraffic: number
  organicTrafficGrowth: number
  keywords: number
  backlinks: number
  coreWebVitals: { lcp: number; fid: number; cls: number }
  topKeywords: { keyword: string; position: number; volume: number; difficulty: number }[]
  monthlyTraffic: { month: string; traffic: number }[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getWeekLabel(dateStr: string): string {
  const day = new Date(dateStr).getDate()
  if (day <= 7) return 'Sem 1'
  if (day <= 14) return 'Sem 2'
  if (day <= 21) return 'Sem 3'
  return 'Sem 4'
}

// ─── Team ───────────────────────────────────────────────────────────────────

export const team: TeamMember[] = [
  { id: 1, name: 'Ana Lima', role: 'Gerente de Marketing', initials: 'AL', color: '#00E5C8' },
  { id: 2, name: 'Carlos Melo', role: 'Analista de Conteúdo', initials: 'CM', color: '#00C853' },
  { id: 3, name: 'Beatriz Santos', role: 'Analista de Redes Sociais', initials: 'BS', color: '#FFB300' },
  { id: 4, name: 'Rafael Costa', role: 'Designer', initials: 'RC', color: '#FF5252' },
]

// ─── Kanban ──────────────────────────────────────────────────────────────────

export const initialKanban: KanbanColumn[] = [
  {
    id: 'todo',
    name: 'A Fazer',
    tasks: [
      { id: 't1', title: 'Post carrossel — Cases de sucesso', channel: 'linkedin', assignees: [{ memberId: 2, note: 4.5 }], priority: 'alta', difficulty: 'médio', dueDate: '2026-08-05' },
      { id: 't2', title: 'Newsletter agosto — Tendências Q3', channel: 'email', assignees: [{ memberId: 3, note: 4.0 }, { memberId: 2, note: 4.2 }], priority: 'média', difficulty: 'fácil', dueDate: '2026-08-10' },
      { id: 't3', title: 'Artigo SEO — Marketing B2B 2026', channel: 'site', assignees: [{ memberId: 4, note: 4.8 }], priority: 'baixa', difficulty: 'difícil', dueDate: '2026-08-12' },
    ],
  },
  {
    id: 'doing',
    name: 'Em Andamento',
    tasks: [
      { id: 't4', title: 'Reels — Lançamento Produto Q3', channel: 'instagram', assignees: [{ memberId: 3, note: 4.5 }, { memberId: 4, note: 3.8 }], priority: 'alta', difficulty: 'difícil', dueDate: '2026-08-02' },
      { id: 't5', title: 'Post LinkedIn — Thought Leadership', channel: 'linkedin', assignees: [{ memberId: 2, note: 5.0 }], priority: 'média', difficulty: 'médio', dueDate: '2026-08-03' },
    ],
  },
  {
    id: 'review',
    name: 'Em Revisão',
    tasks: [
      { id: 't6', title: 'Carrossel — 5 dicas de produtividade', channel: 'instagram', assignees: [{ memberId: 4, note: 4.6 }], priority: 'média', difficulty: 'médio', dueDate: '2026-08-01' },
      { id: 't7', title: 'Email Black November — Oferta especial', channel: 'email', assignees: [{ memberId: 3, note: null }], priority: 'alta', difficulty: 'fácil', dueDate: '2026-07-31' },
    ],
  },
  {
    id: 'approved',
    name: 'Aprovado',
    tasks: [
      { id: 't8', title: 'Story — Bastidores da equipe', channel: 'instagram', assignees: [{ memberId: 2, note: 4.0 }], priority: 'baixa', difficulty: 'fácil', dueDate: '2026-07-30' },
    ],
  },
  {
    id: 'published',
    name: 'Publicado',
    tasks: [
      { id: 't9', title: 'Post Q2 Results — LinkedIn', channel: 'linkedin', assignees: [{ memberId: 2, note: 4.7 }], priority: 'alta', difficulty: 'médio', dueDate: '2026-07-25' },
      { id: 't10', title: 'Campanha Julho — Instagram Grid', channel: 'instagram', assignees: [{ memberId: 3, note: 4.9 }, { memberId: 2, note: null }], priority: 'alta', difficulty: 'difícil', dueDate: '2026-07-20' },
    ],
  },
]

// ─── Team Engagement ─────────────────────────────────────────────────────────

// ─── Posts Library ───────────────────────────────────────────────────────────

export const postsData: Post[] = [
  {
    id: 1,
    title: '5 estratégias de marketing B2B',
    channel: 'linkedin',
    campaign: 'Cases de Sucesso',
    images: [
      { url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=400&fit=crop&auto=format', tipo: 'imagem' },
      { url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=400&fit=crop&auto=format', tipo: 'imagem' },
      { url: 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=400&h=400&fit=crop&auto=format', tipo: 'imagem' },
    ],
    caption: 'O mercado B2B está mudando rapidamente. Separamos as 5 estratégias que estão gerando mais resultado em 2026...\n\n✅ Account-Based Marketing\n✅ SEO técnico para decisores\n✅ LinkedIn Thought Leadership\n✅ Email nurturing segmentado\n✅ Cases de sucesso em vídeo\n\nQual você já aplica? 👇\n\n#MarketingB2B #EstrategiaDigital',
    format: 'carousel',
    insights: { likes: 238, reach: 4820, impressions: 7340, engagement: 312, saves: 89, shares: 46, comments: 28 },
    publishedAt: '2026-07-25',
    validUntil: '2026-08-15',
  },
  {
    id: 2,
    title: 'Reels — Bastidores do lançamento Q3',
    channel: 'instagram',
    campaign: 'Lançamento Produto Q3',
    images: [
      { url: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=400&fit=crop&auto=format', tipo: 'imagem' },
      { url: 'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=400&h=400&fit=crop&auto=format', tipo: 'imagem' },
    ],
    caption: 'Vai, vai, vai! 🚀 Tá chegando!\n\nQ3 chegando com novidades que vão transformar sua gestão de marketing. Fica ligado! 👀\n\n#Lançamento #MarketingDigital',
    format: 'reel',
    insights: { likes: 940, reach: 12400, impressions: 18900, engagement: 1240, saves: 334, shares: 207, comments: 91 },
    publishedAt: '2026-07-20',
    validUntil: '2026-08-31',
  },
  {
    id: 3,
    title: 'ROI do Marketing de Conteúdo',
    channel: 'linkedin',
    campaign: 'Cases de Sucesso',
    images: [
      { url: 'https://images.unsplash.com/photo-1543286386-713bdd548da4?w=400&h=400&fit=crop&auto=format', tipo: 'imagem' },
      { url: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&h=400&fit=crop&auto=format', tipo: 'imagem' },
      { url: 'https://images.unsplash.com/photo-1553484771-371a605b060b?w=400&h=400&fit=crop&auto=format', tipo: 'imagem' },
    ],
    caption: 'Content marketing gera 3x mais leads com 62% menos custo.\n\n📊 +340% tráfego orgânico · 127 MQLs · CAC -28%\n\n#ContentMarketing #ROI',
    format: 'document',
    insights: { likes: 351, reach: 6230, impressions: 9810, engagement: 498, saves: 201, shares: 103, comments: 44 },
    publishedAt: '2026-07-18',
    validUntil: '2026-08-15',
  },
  {
    id: 4,
    title: 'Newsletter — Tendências de Agosto',
    channel: 'email',
    campaign: 'Lançamento Produto Q3',
    images: [
      { url: 'https://images.unsplash.com/photo-1586339949916-3e9457bef6d3?w=600&h=200&fit=crop&auto=format', tipo: 'imagem' },
    ],
    caption: 'Assunto: 🔥 As 3 tendências de marketing que vão dominar agosto\n\nOlá [Nome],\nEste mês trouxemos análises e insights exclusivos...',
    format: 'article',
    insights: { likes: 0, reach: 2840, impressions: 2840, engagement: 0, saves: 0, shares: 0, comments: 0 },
    publishedAt: '2026-07-15',
    validUntil: '2026-08-31',
  },
]

// ─── Materials ───────────────────────────────────────────────────────────────

export const materialsData: Material[] = [
  {
    id: 1, type: 'ebook',
    title: 'Guia Definitivo de Marketing B2B 2026',
    description: 'Estratégias, ferramentas e táticas para times modernos',
    cover: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=250&fit=crop&auto=format',
    downloads: 1240, createdAt: '2026-06-01',
  },
  {
    id: 2, type: 'newsletter',
    title: 'Marketing Insights — Julho 2026',
    description: 'Tendências e novidades do marketing digital',
    cover: 'https://images.unsplash.com/photo-1586339949916-3e9457bef6d3?w=400&h=250&fit=crop&auto=format',
    downloads: 892, createdAt: '2026-07-15',
  },
  {
    id: 3, type: 'case',
    title: 'Case: TechCorp triplicou MQLs em 90 dias',
    description: 'Estratégia, execução e resultados reais',
    cover: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=250&fit=crop&auto=format',
    downloads: 567, createdAt: '2026-07-01',
  },
  {
    id: 4, type: 'ebook',
    title: 'LinkedIn para Times de Marketing',
    description: 'Da criação de perfil à geração de leads B2B',
    cover: 'https://images.unsplash.com/photo-1611944212129-29977ae1398c?w=400&h=250&fit=crop&auto=format',
    downloads: 843, createdAt: '2026-05-15',
  },
]

// ─── Prompts ─────────────────────────────────────────────────────────────────

// ─── Default Custom Metrics ───────────────────────────────────────────────────

export const defaultMetrics: CustomMetric[] = [
  { id: 'm1', name: 'Taxa de Engajamento IG', value: 3.8, unit: '%', formula: '(Curtidas + Comentários + Saves) / Alcance × 100', channel: 'instagram', color: '#E1306C' },
  { id: 'm2', name: 'CTR LinkedIn', value: 2.18, unit: '%', formula: 'Cliques / Impressões × 100', channel: 'linkedin', color: '#0A66C2' },
  { id: 'm3', name: 'Taxa de Abertura Email', value: 28.4, unit: '%', formula: 'Emails Abertos / Emails Enviados × 100', channel: 'email', color: '#FFB300' },
  { id: 'm4', name: 'MQLs Gerados', value: 28, unit: 'leads', formula: 'Contagem manual de leads com score ≥ 65 no período', color: '#00E5C8' },
  { id: 'm5', name: 'Tráfego Orgânico', value: 8240, unit: 'sessões', formula: 'Soma de sessões via busca orgânica (Google Analytics)', channel: 'site', color: '#00C853' },
]

// ─── SEO Default State ────────────────────────────────────────────────────────

export const defaultSEO: SEOState = {
  domainAuthority: 42,
  organicTraffic: 8240,
  organicTrafficGrowth: 18.4,
  keywords: 234,
  backlinks: 342,
  coreWebVitals: { lcp: 2.1, fid: 18, cls: 0.08 },
  topKeywords: [
    { keyword: 'gestão de marketing', position: 4, volume: 1900, difficulty: 62 },
    { keyword: 'marketing b2b estratégia', position: 7, volume: 880, difficulty: 45 },
    { keyword: 'plataforma marketing digital', position: 12, volume: 590, difficulty: 58 },
    { keyword: 'kanban marketing', position: 2, volume: 320, difficulty: 28 },
    { keyword: 'métricas instagram empresa', position: 9, volume: 1200, difficulty: 51 },
  ],
  monthlyTraffic: [
    { month: 'Mar', traffic: 5200 },
    { month: 'Abr', traffic: 5800 },
    { month: 'Mai', traffic: 6400 },
    { month: 'Jun', traffic: 7100 },
    { month: 'Jul', traffic: 8240 },
  ],
}

// ─── MQL Default ─────────────────────────────────────────────────────────────

export const mqlData = {
  jobTitles: ['CMO', 'Gerente de Marketing', 'Diretor de Marketing', 'Head de Growth'],
  companySize: '50-500 funcionários',
  industries: ['SaaS', 'Serviços Financeiros', 'Consultorias', 'Tecnologia'],
  behaviors: ['Baixou 2+ materiais ricos', 'Visitou página de preços 3x+', 'Abriu 4+ emails', 'Participou de webinar'],
  score: 65,
  monthlyMQLs: 28,
  mqlToSQLRate: 34,
}
