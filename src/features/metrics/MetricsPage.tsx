import { useEffect, useState } from "react"
import type { Channel } from "@/app/App"
import type { CustomMetric } from "@/shared/model/domain"
import { mqlData } from "@/shared/model/domain"
import BrandMark from "@/shared/ui/BrandMark"
import { usePosts } from "@/features/library/posts"
import { metricsApi } from "./api"
import { TabNav, type Tab } from "./components/shared"
import { DashboardFigma, type GlobalMetricsState } from "./dashboard/DashboardFeature"
import { InsertMetrics, mapMetric, METRIC_COLORS } from "./custom/CustomMetricsFeature"
import { MQLView } from "./mql/MqlFeature"

interface Props { channel: Channel; setChannel: (channel: Channel) => void }

const defaultGlobalMetrics: GlobalMetricsState = {
  instagram: { followersTotal: 18420, followersGrowth: 342, channelClicks: 624, profileVisits: 27130, roi: 184.5, conversions: 93, reachOverride: 48200, impressionsOverride: 0, engagementRateOverride: 4.8, followerReachShare: 62 },
  linkedin: { followersTotal: 9780, followersGrowth: 127, channelClicks: 624, profileVisits: 14860, roi: 163.2, conversions: 61, reachOverride: 0, impressionsOverride: 28400, engagementRateOverride: 4.2, followerReachShare: 68 },
}

export default function MetricsPage({ channel, setChannel }: Props) {
  const { posts } = usePosts()
  const [tab, setTab] = useState<Tab>("dashboard")
  const [metrics, setMetrics] = useState<CustomMetric[]>([])
  const [mql, setMql] = useState(mqlData)
  const [globalMetrics, setGlobalMetrics] = useState(defaultGlobalMetrics)

  useEffect(() => {
    metricsApi.metrics.custom().then((rows) => setMetrics(rows.map((row, index) => ({ ...mapMetric(row), color: METRIC_COLORS[index % METRIC_COLORS.length] })))).catch(console.error)
    metricsApi.metrics.mql().then((saved) => setMql({ jobTitles: saved.cargosAlvo, companySize: saved.tamanhoEmpresa, industries: saved.segmentos, behaviors: saved.comportamentos, score: saved.scoreMinimo, monthlyMQLs: saved.mqlsEsteMes, mqlToSQLRate: saved.taxaMqlSql })).catch(console.error)
  }, [])

  return <div className="flex flex-col h-full">
    <header className="page-header bg-[#17171A] flex-shrink-0" style={{ borderBottom: "1.5px solid rgba(255,255,255,0.1)" }}>
      <div className="px-4 md:px-6 pt-4 md:pt-5 pb-0 flex items-start gap-4"><BrandMark /><div><span className="page-eyebrow">Inteligência de performance</span><h1 className="text-lg md:text-xl font-semibold text-[#F0F0F5] leading-tight">Métricas</h1><p className="text-xs md:text-sm text-[#8A8A9A] mt-0.5">Dashboard consolidado · {new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" }).replace(/^\w/, (value) => value.toUpperCase())}</p></div></div>
      <div className="px-4 md:px-6 pt-2 md:pt-3 pb-0 overflow-x-auto"><TabNav active={tab} setTab={setTab} /></div>
    </header>
    <div className="module-stage flex-1 overflow-hidden">
      {tab === "dashboard" && <DashboardFigma posts={posts} metrics={metrics} channel={channel} setChannel={setChannel} globalMetrics={globalMetrics} setGlobalMetrics={setGlobalMetrics} />}
      {tab === "inserir" && <InsertMetrics metrics={metrics} setMetrics={setMetrics} />}
      {tab === "mql" && <MQLView mql={mql} setMql={setMql} />}
    </div>
  </div>
}
