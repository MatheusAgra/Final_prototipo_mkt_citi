import { useState, useMemo, useEffect } from "react"
import {
  BarChart2,
  TrendingUp,
  Users,
  Globe,
  Plus,
  X,
  Edit2,
  Check,
  Info,
  ArrowUp,
  ArrowDown,
  Trash2,
  Eye,
  AlertTriangle,
} from "lucide-react"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
import type { Channel } from "@/app/App"
import type { ChannelType, Post, CustomMetric } from "@/shared/model/domain"
import { mqlData, getWeekLabel } from "@/shared/model/domain"
import { metricsApi as api } from "../api"
import BrandMark from "@/shared/ui/BrandMark"

// Seleciona todo o conteúdo ao focar um campo numérico — evita o bug de "0" seguido de dígitos concatenados (ex: "0190")
const selectOnFocus = (e: React.FocusEvent<HTMLInputElement>) =>
  e.target.select()

// Input numérico com rascunho de texto próprio: permite apagar o campo inteiro (ficar vazio) sem que
// Number('') vire 0 e "prenda" o valor — o pai só recebe um número novo quando o texto digitado é válido.
import { channelDist, KpiCard, Modal, NumericInput } from "../components/shared"
import { UNIT_LABELS } from "../custom/CustomMetricsFeature"
function Dashboard({
  posts,
  metrics,
  mql,
}: {
  posts: Post[]
  metrics: CustomMetric[]
  mql: typeof mqlData
}) {
  // Compute weekly reach from posts (auto-calculated)
  const weeklyReach = useMemo(() => {
    const buckets: Record<string, { Instagram: number; LinkedIn: number }> = {
      "Sem 1": { Instagram: 0, LinkedIn: 0 },
      "Sem 2": { Instagram: 0, LinkedIn: 0 },
      "Sem 3": { Instagram: 0, LinkedIn: 0 },
      "Sem 4": { Instagram: 0, LinkedIn: 0 },
    }
    posts.forEach((post) => {
      const week = getWeekLabel(post.publishedAt)
      if (!buckets[week]) return
      if (post.channel === "instagram")
        buckets[week].Instagram += post.insights.reach
      else if (post.channel === "linkedin")
        buckets[week].LinkedIn += post.insights.reach
    })
    return Object.entries(buckets).map(([week, data]) => ({ week, ...data }))
  }, [posts])

  const igReach = posts
    .filter((p) => p.channel === "instagram")
    .reduce((a, p) => a + p.insights.reach, 0)
  const liImpressions = posts
    .filter((p) => p.channel === "linkedin")
    .reduce((a, p) => a + p.insights.impressions, 0)
  const igEngRate =
    posts.filter((p) => p.channel === "instagram").length > 0
      ? (
          (posts
            .filter((p) => p.channel === "instagram")
            .reduce((a, p) => a + p.insights.engagement, 0) /
            igReach) *
          100
        ).toFixed(1)
      : "0"

  return (
    <div className="h-full overflow-auto p-5">
      <div className="max-w-5xl mx-auto space-y-5">
        {/* KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <KpiCard
            label="Alcance Instagram"
            value={igReach}
            sub="soma posts publicados"
            delta={14}
            color="#E1306C"
            icon={<TrendingUp size={18} />}
          />
          <KpiCard
            label="Impressões LinkedIn"
            value={liImpressions}
            sub="soma posts publicados"
            delta={8.2}
            color="#0A66C2"
            icon={<Globe size={18} />}
          />
          <KpiCard
            label="Taxa de Engajamento IG"
            value={`${igEngRate}%`}
            sub="eng / alcance × 100"
            delta={0.3}
            color="#00C853"
            icon={<BarChart2 size={18} />}
          />
          <KpiCard
            label="MQLs este mês"
            value={mql.monthlyMQLs}
            sub={`Taxa MQL→SQL: ${mql.mqlToSQLRate}%`}
            delta={12}
            color="#7D1AD7"
            icon={<Users size={18} />}
          />
        </div>

        {/* Custom metrics */}
        {metrics.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-[#F0F0F5] mb-3">
              Métricas personalizadas
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {metrics.map((m) => (
                <div
                  key={m.id}
                  className="kpi-card bg-[#17171A] rounded-xl p-4"
                  style={{ border: "1.5px solid rgba(255,255,255,0.1)" }}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-xs text-[#8A8A9A] leading-snug flex-1">
                      {m.name}
                    </p>
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0 mt-0.5"
                      style={{ background: m.color }}
                    />
                  </div>
                  <p className="text-xl font-bold" style={{ color: m.color }}>
                    {typeof m.value === "number"
                      ? m.value.toLocaleString("pt-BR")
                      : m.value}
                    <span className="text-sm font-normal ml-1 text-[#555566]">
                      {UNIT_LABELS[m.unit] ?? m.unit}
                    </span>
                  </p>
                  <p className="text-xs text-[#555566] mt-1 leading-snug">
                    {m.formula}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Weekly reach chart — auto-calculated */}
        <div
          className="analytic-card bg-[#17171A] rounded-2xl p-5"
          style={{ border: "1.5px solid rgba(255,255,255,0.1)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-sm font-semibold text-[#F0F0F5]">
              Alcance semanal — calculado automaticamente pelos posts
            </h3>
            <div
              className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
              style={{ background: "rgba(125,26,215,0.08)", color: "#507AE6" }}
            >
              <Check size={10} /> auto
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart
              data={weeklyReach}
              margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="igGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E1306C" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#E1306C" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="liGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0A66C2" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#0A66C2" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.06)"
              />
              <XAxis
                dataKey="week"
                tick={{ fontSize: 11, fill: "#555566" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#555566" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "#17171A",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12,
                  fontSize: 12,
                  color: "#F0F0F5",
                }}
                formatter={(v) => Number(v ?? 0).toLocaleString("pt-BR")}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: "#8A8A9A" }} />
              <Area
                type="monotone"
                dataKey="Instagram"
                stroke="#E1306C"
                strokeWidth={2}
                fill="url(#igGrad)"
              />
              <Area
                type="monotone"
                dataKey="LinkedIn"
                stroke="#0A66C2"
                strokeWidth={2}
                fill="url(#liGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Channel mix + post breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            className="analytic-card bg-[#17171A] rounded-2xl p-5"
            style={{ border: "1.5px solid rgba(255,255,255,0.1)" }}
          >
            <h3 className="text-sm font-semibold text-[#F0F0F5] mb-4">
              Mix de canais
            </h3>
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie
                  data={channelDist}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={65}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {channelDist.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => `${v}%`}
                  contentStyle={{
                    background: "#17171A",
                    fontSize: 12,
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    color: "#F0F0F5",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-2">
              {channelDist.map((c) => (
                <div
                  key={c.name}
                  className="flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-2.5 h-2.5 rounded-sm"
                      style={{ background: c.color }}
                    />
                    <span className="text-[#8A8A9A]">{c.name}</span>
                  </div>
                  <span style={{ color: "#8A8A9A" }}>{c.value}%</span>
                </div>
              ))}
            </div>
          </div>

          <div
            className="md:col-span-2 bg-[#17171A] rounded-2xl p-5"
            style={{ border: "1.5px solid rgba(255,255,255,0.1)" }}
          >
            <h3 className="text-sm font-semibold text-[#F0F0F5] mb-4">
              Alcance por post (julho)
            </h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={posts.slice(0, 6).map((p) => ({
                  name: p.title.slice(0, 20) + "…",
                  reach: p.insights.reach,
                  channel: p.channel,
                }))}
                margin={{
                  top: 0,
                  right: 0,
                  left: -20,
                  bottom: 0,
                }}
                barSize={20}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.06)"
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 9, fill: "#555566" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#555566" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "#17171A",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                    fontSize: 12,
                    color: "#F0F0F5",
                  }}
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  formatter={(v) => Number(v ?? 0).toLocaleString("pt-BR")}
                />
                <Bar
                  dataKey="reach"
                  name="Alcance"
                  radius={[4, 4, 0, 0]}
                  fill="#7D1AD7"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

interface GlobalChannelMetrics {
  followersTotal: number
  followersGrowth: number
  channelClicks: number
  profileVisits: number
  roi: number
  conversions: number
  reachOverride: number
  impressionsOverride: number
  engagementRateOverride: number
  followerReachShare: number
}

export type GlobalMetricsState = Record<"instagram" | "linkedin", GlobalChannelMetrics>

function GlobalMetricsModal({
  channel,
  values,
  onSave,
  onClose,
}: {
  channel: "instagram" | "linkedin"
  values: GlobalChannelMetrics
  onSave: (values: GlobalChannelMetrics) => Promise<void>
  onClose: () => void
}) {
  const [draft, setDraft] = useState(values)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const fields: {
    key: keyof GlobalChannelMetrics
    label: string
    suffix?: string
  }[] = [
    {
      key: "reachOverride",
      label: channel === "instagram" ? "Alcance" : "Alcance único",
    },
    { key: "impressionsOverride", label: "Impressões" },
    {
      key: "engagementRateOverride",
      label: "Taxa de engajamento",
      suffix: "%",
    },
    { key: "followersTotal", label: "Seguidores totais" },
    { key: "followersGrowth", label: "Novos seguidores no período" },
    {
      key: "channelClicks",
      label:
        channel === "instagram"
          ? "Cliques no link da bio"
          : "Cliques no website / CTA",
    },
    { key: "profileVisits", label: "Visitas ao perfil" },
    { key: "roi", label: "ROI", suffix: "%" },
    { key: "conversions", label: "Conversões" },
  ]
  async function save() {
    setSaving(true)
    setError("")
    try {
      await onSave(draft)
      onClose()
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível salvar os dados.",
      )
      setSaving(false)
    }
  }
  return (
    <Modal
      title={`Editar dados globais · ${
        channel === "instagram" ? "Instagram" : "LinkedIn"
      }`}
      onClose={onClose}
      wide
    >
      <div className="px-6 py-5">
        <p className="text-xs text-[#8A8A9A] mb-5">
          Dados gerais do canal que não pertencem a um post individual. Salvos
          para todas as contas.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fields.map((field) => (
            <label
              key={field.key}
              className="text-xs font-medium text-[#8A8A9A]"
            >
              {field.label}
              <div className="relative mt-1">
                <NumericInput
                  min={0}
                  step={field.key === "roi" ? ".1" : "1"}
                  value={draft[field.key]}
                  onChange={(n) =>
                    setDraft((current) => ({ ...current, [field.key]: n }))
                  }
                  className="w-full text-sm px-3 py-2.5 rounded-xl border border-[rgba(255,255,255,.1)] focus:outline-none focus:border-[#507AE6]"
                />
                {field.suffix && (
                  <span className="absolute right-3 top-2.5 text-xs text-[#777]">
                    {field.suffix}
                  </span>
                )}
              </div>
            </label>
          ))}
        </div>
        {error && (
          <p
            className="text-xs text-[#FF5252] rounded-lg px-3 py-2 mt-4"
            style={{ background: "rgba(255,82,82,0.15)" }}
          >
            {error}
          </p>
        )}
      </div>
      <div className="px-6 py-4 flex gap-3 border-t border-[rgba(255,255,255,.06)]">
        <button
          onClick={save}
          disabled={saving}
          className="px-5 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-50"
          style={{
            background: "linear-gradient(135deg, #7D1AD7, #507AE6, #50E678)",
          }}
        >
          {saving ? "Salvando…" : "Salvar dados"}
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-xl text-sm text-[#8A8A9A]"
        >
          Cancelar
        </button>
      </div>
    </Modal>
  )
}

const AUDIENCE_TAB_TO_API: Record<string, string> = {
  "Cargo / Função": "CARGO",
  Senioridade: "SENIORIDADE",
  Setor: "SETOR",
  Localização: "LOCALIZACAO",
}
const AUDIENCE_TAB_FROM_API: Record<string, string> = {
  CARGO: "Cargo / Função",
  SENIORIDADE: "Senioridade",
  SETOR: "Setor",
  LOCALIZACAO: "Localização",
}
const STALE_THRESHOLD_DAYS = 20
const DASHBOARD_FORMAT_LABELS: Record<string, string> = {
  REELS: "Reels",
  CARROSSEL: "Carrossel",
  POST_ESTATICO: "Post Estático",
  STORIES: "Stories",
  PDF_DOCUMENTO: "PDF / Documento",
  TEXTO_IMAGEM: "Texto + Imagem",
  VIDEO: "Vídeo",
  ARTIGO_NEWSLETTER: "Artigo / Newsletter",
  ENQUETE: "Enquete",
}
const DASHBOARD_FORMAT_ENUM: Record<string, string> = Object.fromEntries(
  Object.entries(DASHBOARD_FORMAT_LABELS).map(([enumKey, label]) => [
    label,
    enumKey,
  ]),
)
const ageInDays = (iso: string) =>
  Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)

const emptyInstagramFormats = () => [
  { format: "Reels", reach: 0, engagement: 0, saves: 0, shares: 0 },
  { format: "Carrossel", reach: 0, engagement: 0, saves: 0, shares: 0 },
  { format: "Post Estático", reach: 0, engagement: 0, saves: 0, shares: 0 },
  { format: "Stories", reach: 0, engagement: 0, saves: 0, shares: 0 },
]

const emptyLinkedinFormats = () =>
  [
    "PDF / Documento",
    "Texto + Imagem",
    "Vídeo",
    "Artigo / Newsletter",
    "Enquete",
  ].map((format) => ({
    format,
    impressions: 0,
    ctr: 0,
    reactions: 0,
    reposts: 0,
    comments: 0,
  }))

const emptyActivityHeatmap = () =>
  Array.from({ length: 7 }, () => Array(9).fill(0) as number[])

const emptyAudienceData = () => ({
  "Cargo / Função": [],
  Senioridade: [],
  Setor: [],
  Localização: [],
})

export function DashboardFigma({
  posts,
  metrics,
  channel,
  setChannel,
  globalMetrics,
  setGlobalMetrics,
}: {
  posts: Post[]
  metrics: CustomMetric[]
  channel: Channel
  setChannel: (c: Channel) => void
  globalMetrics: GlobalMetricsState
  setGlobalMetrics: React.Dispatch<React.SetStateAction<GlobalMetricsState>>
}) {
  const [editingGlobal, setEditingGlobal] = useState(false)
  const [inlineEdit, setInlineEdit] =
    useState<"reach" | "engagement" | "clicks" | "followers" | "audience" | null>(
      null,
    )
  const [editMode, setEditMode] = useState(false)
  const [savingDashboard, setSavingDashboard] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [instagramFormats, setInstagramFormats] = useState(
    emptyInstagramFormats,
  )
  const [storyViews, setStoryViews] = useState([0, 0, 0, 0, 0, 0])
  const [activityHeatmap, setActivityHeatmap] = useState(emptyActivityHeatmap)
  const [instagramDistributionExists, setInstagramDistributionExists] =
    useState(false)
  const [organicShare, setOrganicShare] = useState(0)
  const [linkedinDistributionExists, setLinkedinDistributionExists] =
    useState(false)
  const [linkedinFormats, setLinkedinFormats] = useState(emptyLinkedinFormats)
  const [audienceTab, setAudienceTab] =
    useState<"Cargo / Função" | "Senioridade" | "Setor" | "Localização">(
      "Cargo / Função",
    )
  const [audienceData, setAudienceData] =
    useState<Record<string, { label: string; value: number }[]>>(
      emptyAudienceData,
    )
  const activeChannel: "instagram" | "linkedin" =
    channel === "linkedin" ? "linkedin" : "instagram"
  const filteredPosts = useMemo(
    () => posts.filter((post) => post.channel === activeChannel),
    [posts, activeChannel],
  )
  const visibleMetrics = metrics.filter(
    (metric) => !metric.channel || metric.channel === activeChannel,
  )
  const global = globalMetrics[activeChannel]

  const [dashboardMeta, setDashboardMeta] = useState<{
    kpis: { nome: string; idadeDias: number }[]
    formatos: { formato: string; idadeDias: number }[]
    desatualizadas: {
      count: number
      itens: { nome: string; idadeDias: number }[]
    }
  } | null>(null)
  useEffect(() => {
    let active = true
    const hours = [6, 8, 10, 12, 14, 16, 18, 20, 22]
    const load = async () => {
      if (editMode) return
      try {
        const [dashboard, globalRow] = await Promise.all([
          api.metrics.dashboard(activeChannel.toUpperCase()),
          api.metrics.global(activeChannel.toUpperCase()),
        ])
        if (!active) return
        setDashboardMeta(dashboard)
        setGlobalMetrics((current) => ({
          ...current,
          [activeChannel]: {
            ...current[activeChannel],
            ...globalRow,
            ...(activeChannel === "instagram"
              ? {
                  followerReachShare:
                    dashboard.alcanceSeguidores?.seguidores ?? 0,
                }
              : {}),
          },
        }))
        if (activeChannel === "instagram") {
          setInstagramDistributionExists(Boolean(dashboard.alcanceSeguidores))
          setInstagramFormats(
            dashboard.formatos?.length
              ? dashboard.formatos.map((row: any) => ({
                  format: DASHBOARD_FORMAT_LABELS[row.formato] ?? row.formato,
                  reach: row.alcanceMedio ?? 0,
                  engagement: row.taxaEngajamento ?? 0,
                  saves: row.saves ?? 0,
                  shares: row.compartilhamentos ?? 0,
                }))
              : emptyInstagramFormats(),
          )
          const storiesByOrder = new Map<number, number>(
            (dashboard.funilStories ?? []).map((row: any) => [
              Number(row.ordem),
              Number(row.espectadores ?? 0),
            ]),
          )
          setStoryViews(
            Array.from({ length: 6 }, (_, index) =>
              Number(storiesByOrder.get(index + 1) ?? 0),
            ),
          )
          const cells = new Map(
            (dashboard.heatmap ?? []).map((cell: any) => [
              `${cell.diaSemana}:${cell.faixaHora}`,
              cell.intensidade,
            ]),
          )
          setActivityHeatmap(
            Array.from({ length: 7 }, (_, day) =>
              hours.map((hour) => Number(cells.get(`${day}:${hour}`) ?? 0)),
            ),
          )
        } else {
          setLinkedinDistributionExists(Boolean(dashboard.alcanceSeguidores))
          setOrganicShare(dashboard.alcanceSeguidores?.seguidores ?? 0)
          setLinkedinFormats(
            dashboard.formatos?.length
              ? dashboard.formatos.map((row: any) => ({
                  format: DASHBOARD_FORMAT_LABELS[row.formato] ?? row.formato,
                  impressions: row.impressoes ?? row.alcanceMedio ?? 0,
                  ctr: row.ctr ?? 0,
                  reactions: row.taxaReacao ?? row.taxaEngajamento ?? 0,
                  reposts: row.reposts ?? 0,
                  comments: row.comentarios ?? 0,
                }))
              : emptyLinkedinFormats(),
          )
          const audience = await api.metrics.linkedinAudience()
          if (!active) return
          setAudienceData(() => {
            const next: Record<string, { label: string; value: number }[]> =
              emptyAudienceData()
            for (const [apiTab, segments] of Object.entries<{
              label: string
              value: number
            }[]>(audience)) {
              const label = AUDIENCE_TAB_FROM_API[apiTab]
              if (label) next[label] = segments ?? []
            }
            return next
          })
        }
      } catch {
        if (active) setDashboardMeta(null)
      }
    }
    void load()
    const interval = window.setInterval(load, 15000)
    const onFocus = () => {
      void load()
    }
    window.addEventListener("focus", onFocus)
    return () => {
      active = false
      window.clearInterval(interval)
      window.removeEventListener("focus", onFocus)
    }
  }, [activeChannel, editMode])

  // Cobre as 3 fontes de métrica do dashboard: KPIs executivos, matriz de formatos (backend) e métricas personalizadas (atualizadoEm do usuário)
  const staleKpiNomes = new Set(
    (dashboardMeta?.kpis ?? [])
      .filter((k) => k.idadeDias > STALE_THRESHOLD_DAYS)
      .map((k) => k.nome),
  )
  const staleFormatNomes = new Set(
    (dashboardMeta?.formatos ?? [])
      .filter((f) => f.idadeDias > STALE_THRESHOLD_DAYS)
      .map((f) => DASHBOARD_FORMAT_LABELS[f.formato] ?? f.formato),
  )
  const staleCustomMetrics = visibleMetrics.filter(
    (m) => m.updatedAt && ageInDays(m.updatedAt) > STALE_THRESHOLD_DAYS,
  )
  const isStaleCard = (label: string) => staleKpiNomes.has(label)
  const isStaleFormat = (label: string) => staleFormatNomes.has(label)
  const isStaleMetric = (metric: CustomMetric) =>
    staleCustomMetrics.some((m) => m.id === metric.id)

  const staleItems = [
    ...(dashboardMeta?.desatualizadas.itens ?? []).map((item) => ({
      nome: DASHBOARD_FORMAT_LABELS[item.nome] ?? item.nome,
      idadeDias: item.idadeDias,
    })),
    ...staleCustomMetrics.map((m) => ({
      nome: m.name,
      idadeDias: ageInDays(m.updatedAt!),
    })),
  ]
  const staleBanner = staleItems.length > 0 && (
    <div
      className="rounded-xl px-4 py-3 flex items-start gap-3"
      style={{
        background: "rgba(255,82,82,0.08)",
        border: "1px solid rgba(255,82,82,0.3)",
      }}
    >
      <AlertTriangle
        size={16}
        className="text-[#FF5252] flex-shrink-0 mt-0.5"
      />
      <div className="text-xs space-y-1">
        <p className="font-semibold text-[#FF5252]">
          Métricas desatualizadas —{" "}
          {activeChannel === "instagram" ? "Instagram" : "LinkedIn"}
        </p>
        {staleItems.map((item) => (
          <p key={item.nome} className="text-[#FF9F9F]">
            {item.nome} — desatualizado há {item.idadeDias} dias
          </p>
        ))}
      </div>
    </div>
  )

  const weekly = useMemo(() => {
    const values = ["Sem 1", "Sem 2", "Sem 3", "Sem 4"].map((week) => ({
      week,
      reach: 0,
      previous: 0,
    }))
    filteredPosts.forEach((post) => {
      const index = Math.max(
        0,
        Number(getWeekLabel(post.publishedAt).slice(-1)) - 1,
      )
      values[index].reach += post.insights.reach
    })
    return values.map((item, index) => ({
      ...item,
      previous:
        index === 0 ? Math.round(item.reach * 0.92) : values[index - 1].reach,
    }))
  }, [filteredPosts])

  const totals = useMemo(
    () =>
      filteredPosts.reduce(
        (acc, post) => ({
          reach: acc.reach + post.insights.reach,
          impressions: acc.impressions + post.insights.impressions,
          engagement: acc.engagement + post.insights.engagement,
        }),
        { reach: 0, impressions: 0, engagement: 0 },
      ),
    [filteredPosts],
  )

  const engagementRate = totals.reach
    ? (totals.engagement / totals.reach) * 100
    : 0
  const channelCtr = global.profileVisits
    ? (global.channelClicks / global.profileVisits) * 100
    : 0
  const compact = (value: number) =>
    Intl.NumberFormat("pt-BR", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value)

  async function persistGlobal(
    channelKey: "instagram" | "linkedin",
    values: GlobalChannelMetrics,
  ) {
    const saved = await api.metrics.saveGlobal(channelKey.toUpperCase(), {
      followersTotal: values.followersTotal,
      followersGrowth: values.followersGrowth,
      channelClicks: values.channelClicks,
      profileVisits: values.profileVisits,
      roi: values.roi,
      conversions: values.conversions,
      reachOverride: values.reachOverride,
      impressionsOverride: values.impressionsOverride,
      engagementRateOverride: values.engagementRateOverride,
    })
    setGlobalMetrics((current) => ({
      ...current,
      [channelKey]: { ...current[channelKey], ...saved },
    }))
  }

  // Persiste todos os campos editáveis antes de sair do modo de edição.
  async function finishEditing() {
    const kpisPayload =
      activeChannel === "instagram"
        ? [
            {
              nome: "Alcance & Impressões",
              valor: compact(global.reachOverride),
            },
            {
              nome: "Taxa de Engajamento",
              valor: `${Number(global.engagementRateOverride).toFixed(1)}%`,
            },
            { nome: "CTR — Link na Bio", valor: `${channelCtr.toFixed(1)}%` },
            {
              nome: "Crescimento de Seguidores",
              valor: `+${global.followersGrowth}`,
            },
          ]
        : [
            {
              nome: "Impressões & Alcance Único",
              valor: compact(global.impressionsOverride),
            },
            {
              nome: "Taxa de Engajamento Geral",
              valor: `${global.engagementRateOverride.toFixed(1)}%`,
            },
            {
              nome: "Cliques no Website / CTA",
              valor: `+${global.channelClicks}`,
            },
            {
              nome: "Crescimento de Seguidores",
              valor: `+${global.followersGrowth}`,
            },
          ]
    const formatosPayload =
      activeChannel === "instagram"
        ? instagramFormats.map((row) => ({
            formato: DASHBOARD_FORMAT_ENUM[row.format],
            alcanceMedio: Math.round(row.reach),
            taxaEngajamento: row.engagement,
            saves: row.saves,
            compartilhamentos: row.shares,
          }))
        : linkedinFormats.map((row) => ({
            formato: DASHBOARD_FORMAT_ENUM[row.format],
            taxaEngajamento: row.reactions,
            impressoes: row.impressions,
            ctr: row.ctr,
            taxaReacao: row.reactions,
            reposts: row.reposts,
            comentarios: row.comments,
          }))
    const sharedPayload =
      activeChannel === "instagram"
        ? {
            ...(instagramDistributionExists
              ? {
                  alcanceSeguidores: {
                    seguidores: global.followerReachShare,
                    naoSeguidores: 100 - global.followerReachShare,
                  },
                }
              : {}),
            funilStories: storyViews.map((espectadores, index) => ({
              ordem: index + 1,
              espectadores,
              percentual: Math.round(
                (espectadores / Math.max(1, storyViews[0])) * 100,
              ),
            })),
            heatmap: activityHeatmap.flatMap((row, diaSemana) =>
              row.map((intensidade, column) => ({
                diaSemana,
                faixaHora: [6, 8, 10, 12, 14, 16, 18, 20, 22][column],
                intensidade,
              })),
            ),
          }
        : {
            ...(linkedinDistributionExists
              ? {
                  alcanceSeguidores: {
                    seguidores: organicShare,
                    naoSeguidores: 100 - organicShare,
                  },
                }
              : {}),
          }
    await api.metrics.saveDashboard(activeChannel.toUpperCase(), {
      kpis: kpisPayload,
      formatos: formatosPayload,
      ...sharedPayload,
    })
    await persistGlobal(activeChannel, global)
    if (activeChannel === "linkedin") {
      const apiTab = AUDIENCE_TAB_TO_API[audienceTab]
      if (apiTab)
        await api.metrics.saveLinkedinAudience(
          apiTab,
          audienceData[audienceTab],
        )
    }
    setDashboardMeta(await api.metrics.dashboard(activeChannel.toUpperCase()))
  }

  async function toggleEditing() {
    if (!editMode) {
      setSaveError("")
      setEditMode(true)
      return
    }
    setSavingDashboard(true)
    setSaveError("")
    try {
      await finishEditing()
      setInlineEdit(null)
      setEditMode(false)
    } catch (cause) {
      setSaveError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível salvar as métricas.",
      )
    } finally {
      setSavingDashboard(false)
    }
  }

  async function switchDashboardChannel(nextChannel: "instagram" | "linkedin") {
    if (nextChannel === activeChannel || savingDashboard) return
    if (editMode) {
      setSavingDashboard(true)
      setSaveError("")
      try {
        await finishEditing()
        setEditMode(false)
        setInlineEdit(null)
      } catch (cause) {
        setSaveError(
          cause instanceof Error
            ? cause.message
            : "Não foi possível salvar as métricas.",
        )
        setSavingDashboard(false)
        return
      }
      setSavingDashboard(false)
    }
    setChannel(nextChannel)
  }

  const formatLabel: Record<Post["format"], string> = {
    reel: "Reels",
    carousel: "Carrossel",
    static: "Post estático",
    story: "Stories",
    document: "PDF / Documento",
    video: "Vídeo",
    article: "Artigo",
    poll: "Enquete",
  }
  const formatRows = Object.entries(
    filteredPosts.reduce<Record<string, Post[]>>((acc, post) => {
      ;(acc[post.format] ||= []).push(post)
      return acc
    }, {}),
  ).map(([format, grouped]) => ({
    format: formatLabel[(format as Post["format"])],
    reach:
      grouped.reduce((sum, post) => sum + post.insights.reach, 0) /
      grouped.length,
    engagement:
      (grouped.reduce((sum, post) => sum + post.insights.engagement, 0) /
        Math.max(
          1,
          grouped.reduce((sum, post) => sum + post.insights.reach, 0),
        )) *
      100,
    saves: grouped.reduce((sum, post) => sum + post.insights.saves, 0),
    shares: grouped.reduce((sum, post) => sum + post.insights.shares, 0),
  }))

  const cards =
    activeChannel === "instagram"
      ? [
          {
            label: "Alcance & Impressões",
            value: compact(totals.reach),
            sub: `${compact(totals.impressions)} impressões`,
            delta: undefined,
            color: "#50E678",
            icon: <Globe size={18} />,
          },
          {
            label: "Taxa de Engajamento",
            value: `${engagementRate.toFixed(1)}%`,
            sub: "interações ÷ alcance",
            delta: undefined,
            color: "#507AE6",
            icon: <BarChart2 size={18} />,
          },
          {
            label: "CTR — Link na Bio",
            value: `${channelCtr.toFixed(1)}%`,
            sub: `${global.channelClicks.toLocaleString("pt-BR")} cliques`,
            delta: undefined,
            color: "#7D1AD7",
            icon: <TrendingUp size={18} />,
          },
          {
            label: "Crescimento de Seguidores",
            value: `+${global.followersGrowth}`,
            sub: `${global.followersTotal.toLocaleString("pt-BR")} seguidores totais`,
            delta: undefined,
            color: "#50E678",
            icon: <Users size={18} />,
          },
        ]
      : [
          {
            label: "Impressões & Alcance Único",
            value: compact(totals.impressions),
            sub: `${compact(totals.reach)} pessoas`,
            delta: undefined,
            color: "#507AE6",
            icon: <Globe size={18} />,
          },
          {
            label: "Taxa de Engajamento Geral",
            value: `${engagementRate.toFixed(1)}%`,
            sub: "interações ÷ alcance",
            delta: undefined,
            color: "#50E678",
            icon: <BarChart2 size={18} />,
          },
          {
            label: "Cliques Website / CTA",
            value: `+${global.channelClicks}`,
            sub: `${channelCtr.toFixed(1)}% CTR do canal`,
            delta: undefined,
            color: "#7D1AD7",
            icon: <TrendingUp size={18} />,
          },
          {
            label: "Crescimento de Seguidores",
            value: `+${global.followersGrowth}`,
            sub: `${global.followersTotal.toLocaleString("pt-BR")} seguidores totais`,
            delta: undefined,
            color: "#50E678",
            icon: <Users size={18} />,
          },
        ]

  if (activeChannel === "instagram") {
    const shownReach = global.reachOverride
    const shownImpressions = global.impressionsOverride
    const shownEngagement = global.engagementRateOverride
    const updateGlobal = (patch: Partial<GlobalChannelMetrics>) =>
      setGlobalMetrics((current) => ({
        ...current,
        instagram: { ...current.instagram, ...patch },
      }))
    const storyPercent = storyViews.map((value) =>
      Math.round((value / Math.max(1, storyViews[0])) * 100),
    )
    const storyRetention = storyViews[0] > 0 ? (storyPercent.at(-1) ?? 0) : 0
    const storyDropOff =
      storyViews[0] > 0
        ? Math.max(
            0,
            Math.round(
              (100 - storyRetention) / Math.max(1, storyViews.length - 1),
            ),
          )
        : 0
    const bestStoryTransition = storyViews.reduce<{
      label: string
      drop: number
    } | null>((best, value, index) => {
      if (index === 0 || storyViews[index - 1] <= 0) return best
      const previous = storyViews[index - 1]
      const drop = Math.max(0, ((previous - value) / previous) * 100)
      return !best || drop < best.drop
        ? { label: `Story ${index}→${index + 1}`, drop }
        : best
    }, null)
    const days = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]
    const hours = ["6h", "8h", "10h", "12h", "14h", "16h", "18h", "20h", "22h"]
    const manualIg = visibleMetrics.filter(
      (metric) => metric.channel === "instagram" || !metric.channel,
    )

    return (
      <div className="h-full overflow-auto p-4 md:p-6">
        <div className="max-w-6xl mx-auto space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl p-4 bg-[#17171A] border border-[rgba(255,255,255,.08)]">
            <div className="flex items-center gap-4">
              <div className="inline-flex rounded-xl p-1 bg-[rgba(255,255,255,.04)]">
                <button
                  className="px-4 py-2 rounded-lg text-xs font-medium text-white"
                  style={{
                    background: "linear-gradient(120deg, #E43678, #7D1AD7)",
                  }}
                >
                  Instagram
                </button>
                <button
                  onClick={() => void switchDashboardChannel("linkedin")}
                  disabled={savingDashboard}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-[#999]"
                >
                  LinkedIn
                </button>
              </div>
              <h2 className="text-sm font-semibold text-[#F0F0F5]">
                Instagram Analytics
              </h2>
            </div>
            <button
              onClick={() => void toggleEditing()}
              disabled={savingDashboard}
              className="px-4 py-2.5 rounded-xl text-xs font-medium text-white border border-[rgba(255,255,255,.1)] disabled:opacity-50"
              style={{
                background: editMode
                  ? "linear-gradient(135deg,#7D1AD7,#507AE6)"
                  : "rgba(255,255,255,.06)",
              }}
            >
              <Edit2 size={13} className="inline mr-1.5" />
              {savingDashboard
                ? "Salvando…"
                : editMode
                  ? "Concluir edição"
                  : "Editar dados"}
            </button>
          </div>
          {editMode && (
            <div className="rounded-xl px-4 py-3 text-xs text-[#A99BEF] border border-[rgba(125,26,215,.25)] bg-[rgba(125,26,215,.07)]">
              <Edit2 size={13} className="inline mr-2" />
              Modo de edição ativo — altere os valores diretamente nos cards,
              tabelas e células.
            </div>
          )}
          {saveError && (
            <div className="rounded-xl px-4 py-3 text-xs text-[#FF9F9F] border border-[rgba(255,82,82,.3)] bg-[rgba(255,82,82,.08)]">
              {saveError}
            </div>
          )}
          {staleBanner}

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {[
              {
                key: "reach" as const,
                label: "Alcance & Impressões",
                value: shownReach,
                secondary: `${compact(shownImpressions)} impressões`,
                field: "reachOverride" as const,
              },
              {
                key: "engagement" as const,
                label: "Taxa de Engajamento",
                value: shownEngagement,
                secondary: "(Curtidas + Comentários + Saves) / Alcance",
                field: "engagementRateOverride" as const,
                percent: true,
              },
              {
                key: "clicks" as const,
                label: "CTR — Link na Bio",
                value: channelCtr,
                secondary: `${global.channelClicks} cliques no link da bio`,
                field: "channelClicks" as const,
                percent: true,
              },
              {
                key: "followers" as const,
                label: "Crescimento de Seguidores",
                value: global.followersGrowth,
                secondary: "Novos seguidores menos unfollows",
                field: "followersGrowth" as const,
              },
            ].map((card) => (
              <div
                key={card.key}
                className="bg-[#17171A] rounded-2xl p-4 border border-[rgba(255,255,255,.1)]"
                style={
                  isStaleCard(card.label)
                    ? { borderColor: "#FF5252" }
                    : undefined
                }
              >
                <div className="flex justify-between gap-2">
                  <p className="text-xs font-semibold text-[#999]">
                    {card.label}
                  </p>
                  {editMode && (
                    <button
                      onClick={() =>
                        setInlineEdit(inlineEdit === card.key ? null : card.key)
                      }
                      className="text-[#777] hover:text-[#D9D9D9]"
                      aria-label={`Editar ${card.label}`}
                    >
                      <Edit2 size={13} />
                    </button>
                  )}
                </div>
                {inlineEdit === card.key ? (
                  <div className="flex items-center gap-2 mt-3">
                    <NumericInput
                      autoFocus
                      step={card.percent ? ".1" : "1"}
                      value={
                        card.key === "clicks"
                          ? global.channelClicks
                          : Number(card.value)
                      }
                      onChange={(n) => updateGlobal({ [card.field]: n })}
                      className="w-full text-xl font-bold px-2 py-1 rounded-lg border border-[#507AE6] bg-[rgba(255,255,255,.04)]"
                    />
                    <button
                      onClick={() => setInlineEdit(null)}
                      className="p-2 text-[#50E678]"
                      aria-label="Concluir edição"
                    >
                      <Check size={16} />
                    </button>
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-[#F0F0F5] mt-3">
                    {card.key === "reach"
                      ? compact(Number(card.value))
                      : Number(card.value).toLocaleString("pt-BR", {
                          maximumFractionDigits: 1,
                        })}
                    {card.percent ? "%" : ""}
                  </p>
                )}
                <p className="text-[11px] text-[#777] mt-2">{card.secondary}</p>
              </div>
            ))}
          </div>

          <section className="bg-[#17171A] rounded-2xl p-5 border border-[rgba(255,255,255,.1)]">
            <h3 className="text-sm font-semibold text-[#F0F0F5]">
              Alcance: Seguidores vs. Não Seguidores
            </h3>
            <p className="text-xs text-[#777] mt-1 mb-4">
              Proporção de usuários que viram via discovery vs. feed
            </p>
            {editMode && (
              <div className="flex items-center gap-3 mb-4">
                <input
                  aria-label="Percentual de seguidores"
                  type="range"
                  min="0"
                  max="100"
                  value={global.followerReachShare}
                  onChange={(event) => {
                    setInstagramDistributionExists(true)
                    updateGlobal({
                      followerReachShare: Number(event.target.value),
                    })
                  }}
                  className="flex-1 accent-[#E43678]"
                />
                <strong className="text-sm text-[#F0F0F5] w-10 text-right">
                  {global.followerReachShare}%
                </strong>
              </div>
            )}
            {[
              ["Seguidores", global.followerReachShare, "#E43678"],
              [
                "Não seguidores (Descoberta)",
                instagramDistributionExists
                  ? 100 - global.followerReachShare
                  : 0,
                "#FF9F1A",
              ],
            ].map(([label, value, color]) => (
              <div key={String(label)} className="mb-3 last:mb-0">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-[#C9C9D2] flex items-center gap-2">
                    <i
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: String(color) }}
                    />
                    {label}
                  </span>
                  <strong className="text-[#F0F0F5]">{value}%</strong>
                </div>
                <div className="h-2 rounded-full bg-[rgba(255,255,255,.06)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${value}%`, background: String(color) }}
                  />
                </div>
              </div>
            ))}
          </section>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <BarChart2 size={14} className="text-[#6C63FF]" />
              <h3 className="text-sm font-semibold text-[#F0F0F5]">
                Performance por Formato de Conteúdo
              </h3>
              <span className="text-[10px] px-2 py-1 rounded-md text-[#8C82FF] bg-[rgba(108,99,255,.12)]">
                Nível tático
              </span>
            </div>
            <section className="bg-[#17171A] rounded-2xl p-5 border border-[rgba(255,255,255,.1)] overflow-x-auto">
              <h3 className="text-sm font-semibold text-[#F0F0F5]">
                Matriz de Formatos
              </h3>
              <p className="text-xs text-[#777] mt-1 mb-4">
                Alcance médio · Engajamento · Saves · Compartilhamentos por tipo
                de publicação
              </p>
              <table className="w-full min-w-[620px] text-xs">
                <thead>
                  <tr className="text-left text-[#777] border-b border-[rgba(255,255,255,.06)]">
                    <th className="pb-3">Formato</th>
                    <th>Alcance Médio</th>
                    <th>Taxa de Eng.</th>
                    <th>Saves</th>
                    <th>Compartilhamentos</th>
                  </tr>
                </thead>
                <tbody>
                  {instagramFormats.map((row, rowIndex) => (
                    <tr
                      key={row.format}
                      className="border-b border-[rgba(255,255,255,.04)]"
                      style={
                        isStaleFormat(row.format)
                          ? {
                              borderColor: "#FF5252",
                              background: "rgba(255,82,82,0.06)",
                            }
                          : undefined
                      }
                    >
                      <td className="py-4">
                        <span className="px-2 py-1 rounded-md border border-[rgba(255,255,255,.1)] text-[#D9D9D9]">
                          {row.format}
                        </span>
                      </td>
                      {([
                        "reach",
                        "engagement",
                        "saves",
                        "shares",
                      ] as const).map((field) => (
                        <td key={field}>
                          {editMode ? (
                            <NumericInput
                              step={field === "engagement" ? ".1" : "1"}
                              value={row[field]}
                              onChange={(n) =>
                                setInstagramFormats((current) =>
                                  current.map((item, index) =>
                                    index === rowIndex
                                      ? { ...item, [field]: n }
                                      : item,
                                  ),
                                )
                              }
                              className="w-20 px-2 py-1.5 rounded-md border border-[rgba(255,255,255,.12)] bg-[rgba(255,255,255,.04)] text-[#F0F0F5]"
                            />
                          ) : (
                            <div className="flex items-center gap-2">
                              {field === "reach" || field === "engagement" ? (
                                <div className="w-16 h-1.5 rounded-full bg-[rgba(255,255,255,.06)]">
                                  <div
                                    className="h-full rounded-full"
                                    style={{
                                      width: `${
                                        field === "reach"
                                          ? Math.min(100, row.reach / 124)
                                          : row.engagement * 10
                                      }%`,
                                      background:
                                        field === "reach"
                                          ? "#E43678"
                                          : "#6C63FF",
                                    }}
                                  />
                                </div>
                              ) : null}
                              <strong>
                                {field === "reach"
                                  ? compact(row[field])
                                  : field === "engagement"
                                    ? `${row[field].toFixed(1)}%`
                                    : row[field]}
                              </strong>
                            </div>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>

          <section className="bg-[#17171A] rounded-2xl p-5 border border-[rgba(255,255,255,.1)]">
            <h3 className="text-sm font-semibold text-[#F0F0F5]">
              Funil de Retenção — Stories
            </h3>
            <p className="text-xs text-[#777] mt-1 mb-4">
              Progressão de espectadores · valores editáveis em modo edição
            </p>
            <div className="space-y-2">
              {storyViews.map((value, index) => (
                <div
                  key={index}
                  className="grid grid-cols-[52px_1fr_72px_44px] items-center gap-3 text-xs"
                >
                  <span className="text-[#999]">Story {index + 1}</span>
                  <div className="h-5 rounded-full bg-[rgba(255,255,255,.06)] overflow-hidden">
                    <div
                      className="h-full rounded-full flex items-center px-2 text-[10px] font-semibold text-white"
                      style={{
                        width: `${storyPercent[index]}%`,
                        background: `rgba(228,54,120,${1 - index * 0.1})`,
                      }}
                    >
                      {storyPercent[index]}%
                    </div>
                  </div>
                  {editMode ? (
                    <NumericInput
                      value={value}
                      onChange={(n) =>
                        setStoryViews((current) =>
                          current.map((item, i) => (i === index ? n : item)),
                        )
                      }
                      className="w-[72px] px-2 py-1 rounded-md border border-[rgba(255,255,255,.12)] bg-[rgba(255,255,255,.04)] text-right"
                    />
                  ) : (
                    <strong className="text-[#D9D9D9] text-right">
                      {value.toLocaleString("pt-BR")}
                    </strong>
                  )}
                  <span className="text-[#FF5252] text-right">
                    {index
                      ? Math.max(
                          0,
                          storyViews[index - 1] - value,
                        ).toLocaleString("pt-BR")
                      : ""}
                  </span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
              {[
                [`${storyRetention}%`, "Retenção total", "#50E678"],
                [`${storyDropOff}%`, "Drop-off médio/slide", "#FF5252"],
                [bestStoryTransition?.label ?? "—", "Melhor trecho", "#6C63FF"],
              ].map(([value, label, color]) => (
                <div
                  key={label}
                  className="rounded-xl p-3 text-center bg-[rgba(255,255,255,.025)] border border-[rgba(255,255,255,.08)]"
                >
                  <strong style={{ color }}>{value}</strong>
                  <p className="text-[11px] text-[#777] mt-1">{label}</p>
                </div>
              ))}
            </div>
          </section>

          {manualIg.length > 0 && (
            <div
              className="grid gap-3"
              style={{
                gridTemplateColumns: `repeat(${manualIg.length}, minmax(0, 1fr))`,
              }}
            >
              {manualIg.map((metric) => (
                <div
                  key={metric.id}
                  className="bg-[#17171A] rounded-xl p-4 border"
                  style={{
                    borderColor: isStaleMetric(metric)
                      ? "#FF5252"
                      : metric.color + "55",
                  }}
                >
                  <p className="text-xs text-[#999]">{metric.name}</p>
                  <p
                    className="text-xl font-semibold mt-2"
                    style={{ color: metric.color }}
                  >
                    {metric.value.toLocaleString("pt-BR")}{" "}
                    <span className="text-xs text-[#777]">
                      {UNIT_LABELS[metric.unit] ?? metric.unit}
                    </span>
                  </p>
                </div>
              ))}
            </div>
          )}

          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={14} className="text-[#6C63FF]" />
              <h3 className="text-sm font-semibold text-[#F0F0F5]">
                Heatmap de Atividade
              </h3>
              <span className="text-[10px] px-2 py-1 rounded-md text-[#8C82FF] bg-[rgba(108,99,255,.12)]">
                Dias & Horários
              </span>
            </div>
            <section className="bg-[#17171A] rounded-2xl p-5 border border-[rgba(255,255,255,.1)] overflow-x-auto">
              <h3 className="text-sm font-semibold text-[#F0F0F5]">
                Intensidade de Engajamento
              </h3>
              <p className="text-xs text-[#777] mt-1 mb-4">
                {editMode
                  ? "Clique em qualquer célula para editar o valor (0–100)"
                  : "Intensidade por dia da semana e faixa horária"}
              </p>
              <div className="min-w-[620px]">
                <div className="grid grid-cols-[28px_repeat(9,1fr)] gap-1 mb-1">
                  <span />
                  {hours.map((hour) => (
                    <span
                      key={hour}
                      className="text-[10px] text-[#777] text-center"
                    >
                      {hour}
                    </span>
                  ))}
                </div>
                {activityHeatmap.map((row, r) => (
                  <div
                    key={days[r]}
                    className="grid grid-cols-[28px_repeat(9,1fr)] gap-1 mb-1"
                  >
                    <span className="text-[10px] text-[#777] self-center">
                      {days[r]}
                    </span>
                    {row.map((value, c) =>
                      editMode ? (
                        <NumericInput
                          key={c}
                          aria-label={`${days[r]} ${hours[c]}`}
                          min={0}
                          max={100}
                          value={value}
                          onChange={(n) =>
                            setActivityHeatmap((current) =>
                              current.map((line, lineIndex) =>
                                lineIndex === r
                                  ? line.map((item, columnIndex) =>
                                      columnIndex === c
                                        ? Math.max(0, Math.min(100, n))
                                        : item,
                                    )
                                  : line,
                              ),
                            )
                          }
                          className="h-7 min-w-0 rounded text-center text-[9px] font-semibold text-white border border-[rgba(255,255,255,.12)] heatmap-cell"
                          style={
                            {
                              ["--heatmap-cell-color" as string]: `rgba(228,54,120,${0.12 + value / 115})`,
                            } as React.CSSProperties
                          }
                        />
                      ) : (
                        <div
                          key={c}
                          className="h-7 rounded flex items-center justify-center text-[9px] font-semibold text-white"
                          style={{
                            background: `rgba(228,54,120,${0.12 + value / 115})`,
                          }}
                        >
                          {value}
                        </div>
                      ),
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
        {editingGlobal && (
          <GlobalMetricsModal
            channel="instagram"
            values={global}
            onClose={() => setEditingGlobal(false)}
            onSave={(values) => persistGlobal("instagram", values)}
          />
        )}
      </div>
    )
  }

  if (activeChannel === "linkedin") {
    const linkedUpdate = (patch: Partial<GlobalChannelMetrics>) =>
      setGlobalMetrics((current) => ({
        ...current,
        linkedin: { ...current.linkedin, ...patch },
      }))
    const linkedAudience = audienceData[audienceTab]
    return (
      <div className="h-full overflow-auto p-4 md:p-6">
        <div className="max-w-6xl mx-auto space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl p-4 bg-[#17171A] border border-[rgba(255,255,255,.08)]">
            <div className="flex items-center gap-4">
              <div className="inline-flex rounded-xl p-1 bg-[rgba(255,255,255,.04)]">
                <button
                  onClick={() => void switchDashboardChannel("instagram")}
                  disabled={savingDashboard}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-[#999]"
                >
                  Instagram
                </button>
                <button
                  className="px-4 py-2 rounded-lg text-xs font-medium text-white"
                  style={{
                    background: "linear-gradient(120deg,#0A66C2,#507AE6)",
                  }}
                >
                  LinkedIn
                </button>
              </div>
              <h2 className="text-sm font-semibold text-[#F0F0F5]">
                LinkedIn Analytics
              </h2>
            </div>
            <button
              onClick={() => void toggleEditing()}
              disabled={savingDashboard}
              className="px-4 py-2.5 rounded-xl text-xs font-medium text-white border border-[rgba(255,255,255,.1)] disabled:opacity-50"
              style={{
                background: editMode
                  ? "linear-gradient(135deg,#7D1AD7,#507AE6)"
                  : "rgba(255,255,255,.06)",
              }}
            >
              <Edit2 size={13} className="inline mr-1.5" />
              {savingDashboard
                ? "Salvando…"
                : editMode
                  ? "Concluir edição"
                  : "Editar dados"}
            </button>
          </div>
          {editMode && (
            <div className="rounded-xl px-4 py-3 text-xs text-[#A99BEF] border border-[rgba(125,26,215,.25)] bg-[rgba(125,26,215,.07)]">
              <Edit2 size={13} className="inline mr-2" />
              Modo de edição ativo — altere os valores diretamente nos cards,
              tabelas e células.
            </div>
          )}
          {saveError && (
            <div className="rounded-xl px-4 py-3 text-xs text-[#FF9F9F] border border-[rgba(255,82,82,.3)] bg-[rgba(255,82,82,.08)]">
              {saveError}
            </div>
          )}
          {staleBanner}

          <div>
            <div className="flex items-center gap-2 mb-3">
              <BarChart2 size={14} className="text-[#507AE6]" />
              <h3 className="text-sm font-semibold text-[#F0F0F5]">
                KPIs Executivos — LinkedIn B2B
              </h3>
              <span className="text-[10px] px-2 py-1 rounded-md text-[#8C82FF] bg-[rgba(108,99,255,.12)]">
                Alta prioridade
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              {[
                {
                  label: "Impressões & Alcance Único",
                  value: global.impressionsOverride,
                  sub: "Impressões orgânicas + patrocinadas no período",
                  delta: null,
                },
                {
                  label: "Taxa de Engajamento Geral",
                  value: `${global.engagementRateOverride.toFixed(1)}%`,
                  sub: "(Cliques + Reações + Comentários + Reposts) / Impressões",
                  delta: null,
                },
                {
                  label: "Cliques no Website / CTA",
                  value: `+${global.channelClicks}`,
                  sub: "Cliques no botão principal da página LinkedIn",
                  delta: null,
                },
                {
                  label: "Crescimento de Seguidores",
                  value: `+${global.followersGrowth}`,
                  sub: "Novos seguidores orgânicos + patrocinados",
                  delta: null,
                },
              ].map((card) => (
                <div
                  key={card.label}
                  className="relative bg-[#17171A] rounded-2xl p-4 border border-[rgba(255,255,255,.1)]"
                  style={
                    isStaleCard(card.label)
                      ? { borderColor: "#FF5252" }
                      : undefined
                  }
                >
                  <div className="flex justify-between">
                    <p className="text-xs font-semibold text-[#999]">
                      {card.label}
                    </p>
                    {editMode && (
                      <button
                        onClick={() => setEditingGlobal(true)}
                        aria-label={`Editar ${card.label}`}
                        className="text-[#777]"
                      >
                        <Edit2 size={13} />
                      </button>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-[#F0F0F5] mt-3">
                    {typeof card.value === "number"
                      ? compact(card.value)
                      : card.value}{" "}
                    {card.delta && (
                      <span className="text-xs text-[#50E678]">
                        ↗ {card.delta}
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-[#777] mt-2 leading-relaxed">
                    {card.sub}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <section className="bg-[#17171A] rounded-2xl p-5 border border-[rgba(255,255,255,.1)]">
            <div className="flex justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-[#F0F0F5]">
                  Impressões: Orgânico vs. Patrocinado
                </h3>
                <p className="text-xs text-[#777] mt-1 mb-4">
                  Proporção do alcance por tipo de distribuição
                </p>
              </div>
              <span className="text-xs text-[#507AE6]">
                {compact(global.impressionsOverride)} impressões totais
              </span>
            </div>
            {editMode && (
              <div className="flex items-center gap-3 mb-4">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={organicShare}
                  onChange={(event) => {
                    setLinkedinDistributionExists(true)
                    setOrganicShare(Number(event.target.value))
                  }}
                  className="flex-1 accent-[#0A66C2]"
                />
                <strong>{organicShare}%</strong>
              </div>
            )}
            {[
              ["Orgânico", organicShare, "#0A66C2"],
              [
                "Patrocinado (Sponsored)",
                linkedinDistributionExists ? 100 - organicShare : 0,
                "#FF9F1A",
              ],
            ].map(([label, value, color]) => (
              <div key={String(label)} className="mb-3">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-[#C9C9D2] flex items-center gap-2">
                    <i
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: String(color) }}
                    />
                    {label}
                  </span>
                  <strong>{value}%</strong>
                </div>
                <div className="h-2 rounded-full bg-[rgba(255,255,255,.06)]">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${value}%`, background: String(color) }}
                  />
                </div>
              </div>
            ))}
          </section>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <BarChart2 size={14} className="text-[#507AE6]" />
              <h3 className="text-sm font-semibold text-[#F0F0F5]">
                Performance por Formato de Conteúdo
              </h3>
              <span className="text-[10px] px-2 py-1 rounded-md text-[#8C82FF] bg-[rgba(108,99,255,.12)]">
                Nível tático
              </span>
            </div>
            <section className="bg-[#17171A] rounded-2xl p-5 border border-[rgba(255,255,255,.1)] overflow-x-auto">
              <h3 className="text-sm font-semibold text-[#F0F0F5]">
                Matriz de Formatos LinkedIn
              </h3>
              <p className="text-xs text-[#777] mt-1 mb-4">
                Impressões · CTR · Taxa de Reação · Reposts · Comentários
              </p>
              <table className="w-full min-w-[760px] text-xs">
                <thead>
                  <tr className="text-left text-[#777] border-b border-[rgba(255,255,255,.06)]">
                    <th className="pb-3">Formato</th>
                    <th>Impressões</th>
                    <th>CTR</th>
                    <th>Taxa de Reação</th>
                    <th>Reposts</th>
                    <th>Comentários</th>
                  </tr>
                </thead>
                <tbody>
                  {linkedinFormats.map((row, rowIndex) => (
                    <tr
                      key={row.format}
                      className="border-b border-[rgba(255,255,255,.04)]"
                      style={
                        isStaleFormat(row.format)
                          ? {
                              borderColor: "#FF5252",
                              background: "rgba(255,82,82,0.06)",
                            }
                          : undefined
                      }
                    >
                      <td className="py-4">
                        <span className="px-2 py-1 rounded-md border border-[rgba(80,122,230,.25)] text-[#AFC5FF]">
                          {row.format}
                        </span>
                      </td>
                      {([
                        "impressions",
                        "ctr",
                        "reactions",
                        "reposts",
                        "comments",
                      ] as const).map((field) => (
                        <td key={field}>
                          {editMode ? (
                            <NumericInput
                              step={
                                field === "ctr" || field === "reactions"
                                  ? ".1"
                                  : "1"
                              }
                              value={row[field]}
                              onChange={(n) =>
                                setLinkedinFormats((current) =>
                                  current.map((item, index) =>
                                    index === rowIndex
                                      ? { ...item, [field]: n }
                                      : item,
                                  ),
                                )
                              }
                              className="w-20 px-2 py-1.5 rounded-md border border-[rgba(255,255,255,.12)] bg-[rgba(255,255,255,.04)]"
                            />
                          ) : (
                            <span>
                              {field === "impressions"
                                ? compact(row[field])
                                : field === "ctr" || field === "reactions"
                                  ? `${row[field].toFixed(1)}%`
                                  : row[field]}
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[
              {
                title: "Top Posts por CTR",
                color: "#0A66C2",
                items: [...filteredPosts]
                  .filter((post) => post.ctr != null)
                  .sort((a, b) => (b.ctr ?? 0) - (a.ctr ?? 0))
                  .slice(0, 3)
                  .map((post) => [
                    post.title,
                    `${(post.ctr ?? 0).toLocaleString("pt-BR")} CTR · ${post.insights.reach.toLocaleString("pt-BR")} alcance`,
                  ]),
              },
              {
                title: "Top Posts por Reposts",
                color: "#7D1AD7",
                items: [...filteredPosts]
                  .sort((a, b) => b.insights.shares - a.insights.shares)
                  .slice(0, 3)
                  .map((post) => [
                    post.title,
                    `${post.insights.shares.toLocaleString("pt-BR")} reposts · ${post.insights.impressions.toLocaleString("pt-BR")} impressões`,
                  ]),
              },
            ].map((group) => (
              <section
                key={group.title}
                className="bg-[#17171A] rounded-2xl p-5 border border-[rgba(255,255,255,.1)]"
              >
                <h3 className="text-sm font-semibold text-[#F0F0F5]">
                  {group.title}
                </h3>
                <div className="mt-4 space-y-3">
                  {group.items.length === 0 && (
                    <p className="text-xs text-[#777]">
                      Nenhum post com dados disponível.
                    </p>
                  )}
                  {group.items.map(([title, meta], index) => (
                    <div key={title} className="flex gap-3">
                      <span
                        className="w-6 h-6 rounded-lg text-white text-xs flex items-center justify-center"
                        style={{ background: group.color }}
                      >
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-xs font-medium text-[#D9D9D9]">
                          {title}
                        </p>
                        <p className="text-[11px] text-[#777] mt-1">{meta}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Eye size={14} className="text-[#8C82FF]" />
              <h3 className="text-sm font-semibold text-[#F0F0F5]">
                Vídeo & Documento — Analytics
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <section className="bg-[#17171A] rounded-2xl p-5 border border-[rgba(255,255,255,.1)]">
                <p className="text-xs font-semibold text-[#D9D9D9]">
                  Vídeo — Taxa de Conclusão
                </p>
                <p className="text-3xl font-bold text-[#507AE6] mt-3">
                  0<span className="text-sm">%</span>
                </p>
                <p className="text-xs text-[#777] mt-2">
                  Visualizações que chegaram ao final
                </p>
              </section>
              <section className="bg-[#17171A] rounded-2xl p-5 border border-[rgba(255,255,255,.1)]">
                <p className="text-xs font-semibold text-[#D9D9D9]">
                  Documento PDF — Swipe-through
                </p>
                <p className="text-3xl font-bold text-[#7D1AD7] mt-3">
                  0<span className="text-sm">%</span>
                </p>
                <p className="text-xs text-[#777] mt-2">
                  Leitores que chegaram até o fim
                </p>
              </section>
            </div>
          </div>

          {visibleMetrics.length > 0 && (
            <div
              className="grid gap-3"
              style={{
                gridTemplateColumns: `repeat(${visibleMetrics.length}, minmax(0, 1fr))`,
              }}
            >
              {visibleMetrics.map((metric) => (
                <div
                  key={metric.id}
                  className="bg-[#17171A] rounded-xl p-4 border"
                  style={{
                    borderColor: isStaleMetric(metric)
                      ? "#FF5252"
                      : metric.color + "55",
                  }}
                >
                  <p className="text-xs text-[#999]">{metric.name}</p>
                  <p
                    className="text-xl font-semibold mt-2"
                    style={{ color: metric.color }}
                  >
                    {metric.value.toLocaleString("pt-BR")}{" "}
                    <span className="text-xs text-[#777]">
                      {UNIT_LABELS[metric.unit] ?? metric.unit}
                    </span>
                  </p>
                </div>
              ))}
            </div>
          )}

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users size={14} className="text-[#507AE6]" />
              <h3 className="text-sm font-semibold text-[#F0F0F5]">
                Audiência Profissional — Demographics
              </h3>
              <span className="text-[10px] px-2 py-1 rounded-md text-[#8C82FF] bg-[rgba(108,99,255,.12)]">
                LinkedIn B2B
              </span>
            </div>
            <section className="bg-[#17171A] rounded-2xl p-5 border border-[rgba(255,255,255,.1)]">
              <h3 className="text-sm font-semibold text-[#F0F0F5]">
                Perfil da Audiência
              </h3>
              <p className="text-xs text-[#777] mt-1">
                Segmentação por cargo, senioridade, setor e localização
              </p>
              <div className="flex flex-wrap gap-1.5 my-4">
                {([
                  "Cargo / Função",
                  "Senioridade",
                  "Setor",
                  "Localização",
                ] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setAudienceTab(tab)}
                    className="px-3 py-2 rounded-lg text-xs"
                    style={
                      audienceTab === tab
                        ? { background: "#0A66C2", color: "#fff" }
                        : { background: "rgba(255,255,255,.05)", color: "#999" }
                    }
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="space-y-3">
                {linkedAudience.map((item, index) => (
                  <div
                    key={item.label}
                    className="grid grid-cols-[170px_1fr_54px] items-center gap-3"
                  >
                    <span className="text-xs text-[#999]">{item.label}</span>
                    <div className="h-2 rounded-full bg-[rgba(255,255,255,.06)]">
                      <div
                        className="h-full rounded-full bg-[#318ACB]"
                        style={{
                          width: `${(item.value / Math.max(...linkedAudience.map((entry) => entry.value))) * 100}%`,
                        }}
                      />
                    </div>
                    {editMode ? (
                      <NumericInput
                        min={0}
                        max={100}
                        value={item.value}
                        onChange={(n) =>
                          setAudienceData((current) => ({
                            ...current,
                            [audienceTab]: current[audienceTab].map(
                              (entry, i) =>
                                i === index ? { ...entry, value: n } : entry,
                            ),
                          }))
                        }
                        className="w-14 px-2 py-1 rounded-md text-xs border border-[rgba(255,255,255,.12)] bg-[rgba(255,255,255,.04)]"
                      />
                    ) : (
                      <strong className="text-xs text-right">
                        {item.value}%
                      </strong>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
        {editingGlobal && (
          <GlobalMetricsModal
            channel="linkedin"
            values={global}
            onClose={() => setEditingGlobal(false)}
            onSave={(values) => persistGlobal("linkedin", values)}
          />
        )}
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs text-[#999999] uppercase tracking-[.18em]">
              Visão por plataforma
            </p>
            <h2 className="text-lg font-semibold text-[#F0F0F5] mt-1">
              {activeChannel === "instagram" ? "Instagram" : "LinkedIn"}{" "}
              Analytics
            </h2>
          </div>
          <div className="flex items-center gap-2 self-start">
            <div className="inline-flex rounded-xl p-1 bg-[rgba(255,255,255,.04)] border border-[rgba(255,255,255,.08)]">
              {(["instagram", "linkedin"] as const).map((item) => (
                <button
                  key={item}
                  onClick={() => setChannel(item)}
                  className="px-4 py-2 rounded-lg text-xs font-medium transition-all"
                  style={
                    activeChannel === item
                      ? {
                          background:
                            "linear-gradient(120deg, rgba(125,26,215,.7), rgba(80,122,230,.7))",
                          color: "#fff",
                        }
                      : { color: "#999" }
                  }
                >
                  {item === "instagram" ? "Instagram" : "LinkedIn"}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                setEditMode((value) => !value)
                setInlineEdit(null)
              }}
              className="px-4 py-2.5 rounded-xl text-xs font-medium text-white border border-[rgba(255,255,255,.08)]"
              style={{
                background: editMode
                  ? "linear-gradient(135deg,#7D1AD7,#507AE6)"
                  : "rgba(255,255,255,.04)",
              }}
            >
              <Edit2 size={13} className="inline mr-1.5" />
              {editMode ? "Concluir edição" : "Editar dados"}
            </button>
          </div>
        </div>

        {editMode && (
          <div className="rounded-xl px-4 py-3 text-xs text-[#A99BEF] border border-[rgba(125,26,215,.25)] bg-[rgba(125,26,215,.07)]">
            <Edit2 size={13} className="inline mr-2" />
            Modo de edição ativo — clique no lápis de qualquer card para
            atualizar os dados.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
          {cards.map((card) => (
            <div key={card.label} className="relative">
              <KpiCard {...card} />
              {editMode && (
                <button
                  onClick={() => setEditingGlobal(true)}
                  aria-label={`Editar ${card.label}`}
                  className="absolute right-4 top-4 text-[#777] hover:text-[#D9D9D9]"
                >
                  <Edit2 size={13} />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="analytic-card bg-[#17171A] rounded-2xl p-4 md:p-5 border border-[rgba(255,255,255,.1)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-[#F0F0F5]">
                Alcance semanal
              </h3>
              <p className="text-xs text-[#777] mt-1">
                Atualização automática com os posts da Biblioteca
              </p>
            </div>
            <div className="flex gap-4 text-xs text-[#999]">
              <span className="flex items-center gap-1.5">
                <i className="w-2 h-2 rounded-full bg-[#507AE6]" />
                Período atual
              </span>
              <span className="flex items-center gap-1.5">
                <i className="w-2 h-2 rounded-full bg-[#555]" />
                Anterior
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart
              data={weekly}
              margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
            >
              <defs>
                <linearGradient id="citiReach" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#7D1AD7" stopOpacity={0.42} />
                  <stop offset=".5" stopColor="#507AE6" stopOpacity={0.18} />
                  <stop offset="1" stopColor="#50E678" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,.06)" />
              <XAxis
                dataKey="week"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#777", fontSize: 11 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#777", fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  background: "#1C1C1C",
                  border: "1px solid rgba(255,255,255,.1)",
                  borderRadius: 12,
                  color: "#fff",
                }}
                formatter={(v) => Number(v).toLocaleString("pt-BR")}
              />
              <Area
                type="monotone"
                dataKey="previous"
                name="Período anterior"
                stroke="#555"
                strokeDasharray="5 5"
                fill="transparent"
              />
              <Area
                type="monotone"
                dataKey="reach"
                name="Período atual"
                stroke="#507AE6"
                strokeWidth={2.5}
                fill="url(#citiReach)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-[#17171A] rounded-2xl p-4 md:p-5 border border-[rgba(255,255,255,.1)] overflow-x-auto">
            <h3 className="text-sm font-semibold text-[#F0F0F5] mb-4">
              Desempenho por formato
            </h3>
            <table className="w-full min-w-[560px] text-left text-xs">
              <thead className="text-[#777]">
                <tr>
                  <th className="pb-3 font-medium">Formato</th>
                  <th className="pb-3 font-medium">Alcance médio</th>
                  <th className="pb-3 font-medium">Engajamento</th>
                  <th className="pb-3 font-medium">Salvos</th>
                  <th className="pb-3 font-medium">Compart.</th>
                </tr>
              </thead>
              <tbody>
                {formatRows.map((row) => (
                  <tr
                    key={row.format}
                    className="border-t border-[rgba(255,255,255,.06)] text-[#D9D9D9]"
                  >
                    <td className="py-3 font-medium text-white">
                      {row.format}
                    </td>
                    <td>{compact(row.reach)}</td>
                    <td>{row.engagement.toFixed(1)}%</td>
                    <td>{row.saves}</td>
                    <td>{row.shares}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {formatRows.length === 0 && (
              <p className="text-sm text-[#777] py-8 text-center">
                Cadastre posts deste canal para preencher a análise.
              </p>
            )}
          </div>
          <div className="bg-[#17171A] rounded-2xl p-4 md:p-5 border border-[rgba(255,255,255,.1)]">
            <h3 className="text-sm font-semibold text-[#F0F0F5]">
              Top conteúdos
            </h3>
            <p className="text-xs text-[#777] mt-1 mb-4">
              Ordenados por alcance
            </p>
            <div className="space-y-3">
              {[...filteredPosts]
                .sort((a, b) => b.insights.reach - a.insights.reach)
                .slice(0, 4)
                .map((post, index) => (
                  <div key={post.id} className="flex gap-3 items-center">
                    <span className="w-7 h-7 rounded-lg bg-[rgba(125,26,215,.14)] text-[#9A65E8] text-xs font-semibold flex items-center justify-center">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-[#F0F0F5] truncate">
                        {post.title}
                      </p>
                      <p className="text-[11px] text-[#777] mt-0.5">
                        {post.insights.reach.toLocaleString("pt-BR")} alcance ·{" "}
                        {post.insights.engagement.toLocaleString("pt-BR")}{" "}
                        interações
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            ["Visitas ao perfil", global.profileVisits.toLocaleString("pt-BR")],
            [
              "Seguidores totais",
              global.followersTotal.toLocaleString("pt-BR"),
            ],
            ["ROI", `${global.roi.toFixed(1)}%`],
            ["Conversões", global.conversions.toLocaleString("pt-BR")],
          ].map(([label, value]) => (
            <div
              key={label}
              className="bg-[#17171A] rounded-xl p-4 border border-[rgba(255,255,255,.1)]"
            >
              <p className="text-xs text-[#999]">{label}</p>
              <p className="text-xl font-semibold text-[#F0F0F5] mt-2">
                {value}
              </p>
              <p className="text-[11px] text-[#666] mt-1">
                Entrada manual do canal
              </p>
            </div>
          ))}
        </div>

        {visibleMetrics.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-[#F0F0F5] mb-3">
              Métricas adicionadas manualmente
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {visibleMetrics.map((metric) => (
                <div
                  key={metric.id}
                  className="bg-[#17171A] rounded-xl p-4 border border-[rgba(255,255,255,.1)]"
                >
                  <p className="text-xs text-[#999]">{metric.name}</p>
                  <p
                    className="text-xl font-semibold mt-2"
                    style={{ color: metric.color }}
                  >
                    {metric.value.toLocaleString("pt-BR")}{" "}
                    <span className="text-xs text-[#777]">{metric.unit}</span>
                  </p>
                  <p className="text-[11px] text-[#666] mt-1">
                    {metric.formula || "Entrada manual"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {editingGlobal && (
        <GlobalMetricsModal
          channel={activeChannel}
          values={global}
          onClose={() => setEditingGlobal(false)}
          onSave={(values) => persistGlobal(activeChannel, values)}
        />
      )}
    </div>
  )
}

// ─── Custom Metrics (Inserir) ─────────────────────────────────────────────
