import { useState, useMemo, useEffect, useRef } from "react"
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
export function NumericInput({
  value,
  onChange,
  className,
  style,
  ...rest
}: {
  value: number
  onChange: (n: number) => void
  className?: string
  style?: React.CSSProperties
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type" | "className" | "style">) {
  const [draft, setDraft] = useState(String(value))
  useEffect(() => {
    setDraft(String(value))
  }, [value])
  return (
    <input
      {...rest}
      type="number"
      value={draft}
      className={className}
      style={style}
      onFocus={(e) => {
        e.target.select()
        rest.onFocus?.(e)
      }}
      onChange={(e) => {
        const raw = e.target.value
        setDraft(raw)
        if (raw === "" || raw === "-") return
        const parsed = Number(raw)
        if (!Number.isNaN(parsed)) onChange(parsed)
      }}
      onBlur={(e) => {
        if (draft === "" || Number.isNaN(Number(draft))) setDraft(String(value))
        rest.onBlur?.(e)
      }}
      onWheel={(e) => {
        e.currentTarget.blur()
        rest.onWheel?.(e)
      }}
    />
  )
}

// ─── Tab nav ──────────────────────────────────────────────────────────────

export type Tab = "dashboard" | "inserir" | "mql"

export function TabNav({ active, setTab }: { active: Tab; setTab: (t: Tab) => void }) {
  const tabs = [
    {
      id: "dashboard" as Tab,
      label: "Dashboard",
      icon: <BarChart2 size={14} />,
    },
    {
      id: "inserir" as Tab,
      label: "Inserir Métricas",
      icon: <Plus size={14} />,
    },
    { id: "mql" as Tab, label: "MQL Ideal", icon: <Users size={14} /> },
  ]
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

export function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
  wide?: boolean
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className={`bg-[#17171A] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden ${
          wide ? "w-full max-w-2xl" : "w-full max-w-md"
        }`}
        style={{ margin: 16 }}
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
        <div className="overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  )
}

export function KpiCard({
  label,
  value,
  sub,
  delta,
  color,
  icon,
}: {
  label: string
  value: string | number
  sub?: string
  delta?: number
  color: string
  icon: React.ReactNode
}) {
  return (
    <div
      className="analytic-card bg-[#17171A] rounded-2xl p-5"
      style={{
        border: "1.5px solid rgba(255,255,255,0.1)",
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-[#8A8A9A] mb-1">{label}</p>
          <p className="text-2xl font-bold text-[#F0F0F5]" style={{ color }}>
            {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
          </p>
          {sub && <p className="text-xs text-[#555566] mt-0.5">{sub}</p>}
        </div>
        <div
          className="p-2 rounded-xl flex-shrink-0"
          style={{ background: color + "18" }}
        >
          <span style={{ color }}>{icon}</span>
        </div>
      </div>
      {delta !== undefined && (
        <div className="mt-2 flex items-center gap-1 text-xs">
          {delta >= 0 ? (
            <>
              <ArrowUp size={11} className="text-[#00C853]" />
              <span className="text-[#00C853] font-medium">+{delta}%</span>
            </>
          ) : (
            <>
              <ArrowDown size={11} className="text-[#FF5252]" />
              <span className="text-[#FF5252] font-medium">{delta}%</span>
            </>
          )}
          <span className="text-[#555566]">vs mês anterior</span>
        </div>
      )}
    </div>
  )
}

// ─── Dashboard ─────────────────────────────────────────────────────────────

export const channelDist = [
  { name: "Instagram", value: 45, color: "#E1306C" },
  { name: "LinkedIn", value: 30, color: "#0A66C2" },
  { name: "Email", value: 15, color: "#FFB300" },
  { name: "Site", value: 10, color: "#00C853" },
]
