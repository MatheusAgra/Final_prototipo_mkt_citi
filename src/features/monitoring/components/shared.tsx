import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import {
  Plus,
  Calendar,
  Columns3,
  Users,
  Target,
  Edit2,
  Check,
  X,
  Settings,
  Eye,
  EyeOff,
  Clock,
  Flame,
  Trash2,
  BarChart2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts"
import type { Profile, Channel } from "@/app/App"
import type {
  KanbanColumn,
  Task,
  TaskAssignee,
  ChannelType,
  Campaign,
  CampaignStatus,
  CalendarEvent,
  CampaignMetricEntry,
  CampaignGoal,
} from "@/shared/model/domain"
import { type Difficulty } from "@/shared/model/domain"
import { monitoringApi as api } from "../api"
import BrandMark from "@/shared/ui/BrandMark"
import { formatDateBR } from "@/shared/lib/date"

export interface TaskMember {
  id: string
  name: string
  role: string
  initials: string
  color: string
}

export const CHANNEL_TO_API: Record<ChannelType, string> = {
  instagram: "INSTAGRAM",
  linkedin: "LINKEDIN",
  site: "SITE",
  email: "EMAIL",
}
export const DIFFICULTY_TO_API: Record<Difficulty, string> = {
  fácil: "FACIL",
  médio: "MEDIO",
  difícil: "DIFICIL",
}
export const DIFFICULTY_FROM_API: Record<string, Difficulty> = {
  FACIL: "fácil",
  MEDIO: "médio",
  DIFICIL: "difícil",
}

export function mapTask(task: any): Task {
  return {
    id: task.id,
    title: task.titulo,
    channel: task.redeSocial.toLowerCase() as ChannelType,
    assignees: (task.responsaveis ?? []).map((assignment: any) => ({
      memberId: assignment.userId,
      note: assignment.nota ?? null,
    })),
    priority: "média",
    difficulty: DIFFICULTY_FROM_API[task.dificuldade] ?? "médio",
    startDate: task.dataInicio?.slice(0, 10) ?? "",
    dueDate: task.dataEntrega?.slice(0, 10) ?? "",
  }
}

export function mapColumn(column: any): KanbanColumn {
  return {
    id: column.id,
    name: column.nome,
    tasks: (column.tasks ?? []).map(mapTask),
  }
}

export function mapCampaign(row: any): Campaign {
  return {
    id: row.id,
    name: row.nome,
    channels: (row.canais ?? []).map((c: string) => CHANNEL_FROM_API[c]),
    objective: row.objetivo,
    audience: row.publico,
    startDate: String(row.dataInicio).slice(0, 10),
    endDate: String(row.dataFim).slice(0, 10),
    reach: row.alcanceAtual,
    interactions: row.interacoesAtual,
    goals: (row.metas ?? []).map((g: any) => ({
      id: g.id,
      name: g.nome,
      value: g.valor,
      showInChart: g.mostrarGrafico,
    })),
    status: row.status.toLowerCase() as CampaignStatus,
    daysRunning: row.diasNoAr,
    dailyEntries: (row.metricasDiarias ?? []).map((m: any) => ({
      id: m.id,
      date: String(m.data).slice(0, 10),
      reach: m.alcance,
      interactions: m.interacoes,
      showInChart: m.mostrarGrafico ?? true,
      values: (m.valores ?? []).map((v: any) => ({
        name: v.nome,
        value: v.valor,
      })),
    })),
  }
}

export function timeRange(ev: CalendarEvent): string {
  return ev.endTime ? `${ev.time} - ${ev.endTime}` : ev.time
}

export function AttendanceSummary({
  event,
  compact = false,
}: {
  event: CalendarEvent
  compact?: boolean
}) {
  const eligible = event.attendees.filter(
    (attendee) => attendee.attendanceEligible,
  )
  const present = eligible.filter(
    (attendee) => attendee.attendanceStatus === "PRESENTE",
  ).length
  const absent = eligible.filter(
    (attendee) => attendee.attendanceStatus === "AUSENTE",
  ).length
  const late = eligible.filter(
    (attendee) => attendee.attendanceStatus === "ATRASADO",
  ).length
  if (!event.attendanceConfirmed) return null
  return (
    <div
      className={`flex items-center ${
        compact ? "gap-1 mt-1" : "gap-2 mt-2 flex-wrap"
      }`}
      aria-label="Registro de presença confirmado"
    >
      <span
        className="inline-flex items-center gap-0.5 text-[#00C853]"
        title={`${present} presente(s)`}
      >
        <Check size={compact ? 10 : 12} />
        <span className="text-[10px]">{present}</span>
      </span>
      <span
        className="inline-flex items-center gap-0.5 text-[#FF5252]"
        title={`${absent} ausente(s)`}
      >
        <X size={compact ? 10 : 12} />
        <span className="text-[10px]">{absent}</span>
      </span>
      <span
        className="inline-flex items-center gap-0.5 text-[#FFB300]"
        title={`${late} atrasado(s)`}
      >
        <Clock size={compact ? 10 : 12} />
        <span className="text-[10px]">{late}</span>
      </span>
      {!compact && (
        <span className="text-[10px] text-[#8A8A9A]">Presença confirmada</span>
      )}
    </div>
  )
}

export const TIPO_TO_API: Record<CalendarEvent["type"], string> = {
  meeting: "REUNIAO",
  deadline: "DEADLINE",
  task: "TASK",
}
export const TIPO_FROM_API: Record<string, CalendarEvent["type"]> = {
  REUNIAO: "meeting",
  DEADLINE: "deadline",
  TASK: "task",
}
export const CHANNEL_FROM_API: Record<string, ChannelType> = {
  INSTAGRAM: "instagram",
  LINKEDIN: "linkedin",
  SITE: "site",
  EMAIL: "email",
}

export function mapEvent(ev: any): CalendarEvent {
  return {
    id: ev.id,
    date: String(ev.data).slice(0, 10),
    title: ev.titulo,
    time: ev.horario,
    endTime: ev.horarioFim ?? "",
    type: TIPO_FROM_API[ev.tipo] ?? "meeting",
    channel: ev.canal ? CHANNEL_FROM_API[ev.canal] : null,
    local:
      ev.formatoLocal === "MEET"
        ? "meet"
        : ev.formatoLocal === "PRESENCIAL"
          ? "presencial"
          : "",
    sala: ev.sala ?? "",
    linkMeet: ev.linkMeet ?? "",
    attendanceConfirmed: Boolean(ev.registroPresencaConfirmado),
    attendees: (ev.participantes ?? []).map((p: any) => ({
      userId: p.userId,
      nome: p.nome,
      attendanceEligible: Boolean(p.avaliavelPresenca),
      attendanceStatus: p.statusPresenca ?? null,
    })),
  }
}

// ─── Shared ────────────────────────────────────────────────────────────────

export const CH: Record<ChannelType, {
  label: string
  color: string
  bg: string
  dot: string
}> = {
  instagram: {
    label: "Instagram",
    color: "#E1306C",
    bg: "rgba(225,48,108,0.15)",
    dot: "#E1306C",
  },
  linkedin: {
    label: "LinkedIn",
    color: "#0A66C2",
    bg: "rgba(10,102,194,0.15)",
    dot: "#0A66C2",
  },
  site: {
    label: "Site",
    color: "#00C853",
    bg: "rgba(0,200,83,0.15)",
    dot: "#00C853",
  },
  email: {
    label: "Email",
    color: "#FFB300",
    bg: "rgba(255,179,0,0.15)",
    dot: "#FFB300",
  },
}

export const DIFF: Record<Difficulty, { label: string; bg: string; color: string }> = {
  fácil: { label: "Fácil", bg: "rgba(0,200,83,0.15)", color: "#00C853" },
  médio: { label: "Médio", bg: "rgba(255,179,0,0.15)", color: "#FFB300" },
  difícil: { label: "Difícil", bg: "rgba(255,82,82,0.15)", color: "#FF5252" },
}

export function ChannelBadge({ ch, small }: { ch: ChannelType; small?: boolean }) {
  const c = CH[ch]
  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${
        small ? "text-xs px-2 py-0.5" : "text-xs px-2.5 py-1"
      }`}
      style={{ background: c.bg, color: c.color }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full mr-1.5 flex-shrink-0"
        style={{ background: c.dot }}
      />
      {c.label}
    </span>
  )
}

// Card individual por filtro, em linha — mesma estética/espaçamento dos filtros de Materiais Ricos e Prompts
export function ChannelFilter({
  channel,
  setChannel,
}: {
  channel: Channel
  setChannel: (c: Channel) => void
}) {
  const opts: { id: Channel; label: string }[] = [
    { id: "todos", label: "Todos" },
    { id: "instagram", label: "Instagram" },
    { id: "linkedin", label: "LinkedIn" },
    { id: "site", label: "Site" },
    { id: "email", label: "Email" },
  ]
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {opts.map((o) => {
        const active = channel === o.id
        const c = o.id !== "todos" ? CH[(o.id as ChannelType)] : null
        return (
          <button
            key={o.id}
            onClick={() => setChannel(o.id)}
            className="text-xs px-3 py-1.5 rounded-full font-medium transition-all"
            style={
              active
                ? { background: c ? c.dot : "#7D1AD7", color: "#fff" }
                : { background: "rgba(255,255,255,0.06)", color: "#8A8A9A" }
            }
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export function AvatarStack({
  assignees,
  members,
}: {
  assignees: TaskAssignee[]
  members: TaskMember[]
}) {
  return (
    <div className="flex items-center">
      {assignees.slice(0, 4).map((a, i) => {
        const member = members.find((t) => t.id === String(a.memberId))
        if (!member) return null
        return (
          <div
            key={a.memberId}
            title={`${member.name}${
              a.note !== null ? ` — nota: ${a.note}` : ""
            }`}
            className="flex items-center justify-center rounded-full text-white font-bold ring-2 ring-[#17171A] flex-shrink-0"
            style={{
              width: 22,
              height: 22,
              background: member.color,
              fontSize: 9,
              marginLeft: i > 0 ? -6 : 0,
            }}
          >
            {member.initials}
          </div>
        )
      })}
      {assignees.length > 4 && (
        <div
          className="flex items-center justify-center rounded-full ring-2 ring-[#17171A] flex-shrink-0 text-[#8A8A9A] font-bold"
          style={{
            width: 22,
            height: 22,
            fontSize: 9,
            background: "rgba(255,255,255,0.1)",
            marginLeft: -6,
          }}
        >
          +{assignees.length - 4}
        </div>
      )}
    </div>
  )
}

export function Modal({
  title,
  onClose,
  children,
  footer,
  wide,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
  wide?: boolean
}) {
  // Renderizado via portal direto no <body>: .module-stage usa overflow+backdrop-filter,
  // o que cria um containing block para position:fixed e corta o modal. O portal escapa disso.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className={`bg-[#17171A] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden ${
          wide ? "w-full max-w-2xl" : "w-full max-w-md"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <h3 className="font-semibold text-[#F0F0F5]">{title}</h3>
          <button
            onClick={onClose}
            className="text-[#555566] hover:text-[#8A8A9A]"
          >
            <X size={18} />
          </button>
        </div>
        {/* min-h-0: sem isso, o flex item cresce pra caber o conteúdo em vez de respeitar max-h-[90vh] e rolar internamente */}
        <div className="overflow-y-auto flex-1 min-h-0">{children}</div>
        {footer && <div className="flex-shrink-0">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

export function FormField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#8A8A9A] mb-1">
        {label}
      </label>
      {children}
    </div>
  )
}

export function Inp({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full text-sm px-3 py-2 rounded-lg border border-[rgba(255,255,255,0.1)] focus:outline-none focus:border-[#7D1AD7] focus:ring-2 focus:ring-[rgba(125,26,215,0.1)]"
    />
  )
}

export type Tab = "kanban" | "calendario" | "campanhas" | "engajamento"

export function TabNav({
  tabs,
  active,
  setTab,
}: {
  tabs: { id: Tab; label: string; icon: React.ReactNode }[]
  active: Tab
  setTab: (t: Tab) => void
}) {
  return (
    <div className="flex gap-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => setTab(t.id)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-all"
          style={
            active === t.id
              ? { background: "rgba(125,26,215,0.08)", color: "#507AE6" }
              : { color: "#8A8A9A", background: "transparent" }
          }
        >
          {t.icon}
          {t.label}
        </button>
      ))}
    </div>
  )
}

// ─── Task Form ─────────────────────────────────────────────────────────────

