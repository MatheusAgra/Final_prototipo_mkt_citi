import { useEffect, useState } from "react"
import { Calendar, Columns3, Target, Users } from "lucide-react"
import type { Channel, Profile } from "@/app/App"
import type { KanbanColumn } from "@/shared/model/domain"
import BrandMark from "@/shared/ui/BrandMark"
import { monitoringApi } from "./api"
import { CalendarView } from "./calendar/CalendarFeature"
import { CampaignsView } from "./campaigns/CampaignsFeature"
import { EngagementView } from "./engagement/EngagementFeature"
import { KanbanBoard } from "./kanban/KanbanFeature"
import { mapColumn, TabNav, type Tab, type TaskMember } from "./components/shared"

interface Props {
  profile: Profile
  isManager: boolean
  channel: Channel
  setChannel: (channel: Channel) => void
  currentUserId: string | number
}

export default function MonitoringPage({
  profile: _profile,
  isManager,
  channel,
  setChannel,
  currentUserId,
}: Props) {
  const [tab, setTab] = useState<Tab>("kanban")
  const [columns, setColumns] = useState<KanbanColumn[]>([])
  const [members, setMembers] = useState<TaskMember[]>([])

  useEffect(() => {
    Promise.all([monitoringApi.kanban.columns(), monitoringApi.kanban.assignees()])
      .then(([rawColumns, rawMembers]) => {
        setColumns(rawColumns.map(mapColumn))
        setMembers(rawMembers.map((member: { id: string; nomeCompleto: string; cargo: string }, index: number) => ({
          id: member.id,
          name: member.nomeCompleto,
          role: member.cargo,
          initials: member.nomeCompleto.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase(),
          color: ["#507AE6", "#50E678", "#E1306C", "#FFB300", "#7D1AD7"][index % 5],
        })))
      })
      .catch(console.error)
  }, [])

  const tabs = [
    { id: "kanban" as const, label: "Kanban", icon: <Columns3 size={14} /> },
    { id: "calendario" as const, label: "Calendário", icon: <Calendar size={14} /> },
    { id: "campanhas" as const, label: "Campanhas", icon: <Target size={14} /> },
    { id: "engajamento" as const, label: "Engajamento", icon: <Users size={14} />, gOnly: true },
  ].filter((item) => !item.gOnly || isManager)

  return <div className="flex flex-col h-full">
    <header className="page-header bg-[#17171A] flex-shrink-0" style={{ borderBottom: "1.5px solid rgba(255,255,255,0.1)" }}>
      <div className="px-4 md:px-6 pt-4 md:pt-5 pb-0 flex items-start gap-4"><BrandMark /><div><span className="page-eyebrow">Operação de marketing</span><h1 className="text-lg md:text-xl font-semibold text-[#F0F0F5] leading-tight">Monitoramento</h1><p className="text-xs md:text-sm text-[#8A8A9A] mt-0.5 hidden sm:block">Gerencie tasks, calendário e campanhas do time</p></div></div>
      <div className="px-4 md:px-6 pt-2 md:pt-3 pb-0 overflow-x-auto"><TabNav tabs={tabs} active={tab} setTab={setTab} /></div>
    </header>
    <div className="module-stage flex-1 overflow-hidden">
      {tab === "kanban" && <KanbanBoard channel={channel} setChannel={setChannel} isManager={isManager} members={members} setMembers={setMembers} columns={columns} setColumns={setColumns} />}
      {tab === "calendario" && <CalendarView currentUserId={String(currentUserId)} isManager={isManager} />}
      {tab === "campanhas" && <CampaignsView channel={channel} setChannel={setChannel} />}
      {tab === "engajamento" && isManager && <EngagementView columns={columns} />}
    </div>
  </div>
}
