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
import { KpiCard, Modal, NumericInput } from "../components/shared"
export const METRIC_COLORS = [
  "#7D1AD7",
  "#E1306C",
  "#0A66C2",
  "#00C853",
  "#FFB300",
  "#40C4FF",
  "#FF5252",
  "#507AE6",
]
const CH_LABELS: Record<ChannelType, string> = {
  instagram: "Instagram",
  linkedin: "LinkedIn",
  site: "Site",
  email: "Email",
}
// Canais aceitos para métricas personalizadas: apenas Instagram, LinkedIn ou Todos (canal nulo)
const METRIC_CHANNELS: Extract<ChannelType, "instagram" | "linkedin">[] = [
  "instagram",
  "linkedin",
]
const UNIT_OPTIONS = [
  { value: "PERCENT", label: "%" },
  { value: "LEADS", label: "Leads" },
  { value: "SESSOES", label: "Sessões" },
  { value: "NUMERO", label: "Número" },
] as const
export const UNIT_LABELS: Record<string, string> = Object.fromEntries(
  UNIT_OPTIONS.map((u) => [u.value, u.label]),
)

interface MetricForm {
  name: string
  value: string
  unit: string
  formula: string
  channel: ChannelType | ""
}

function MetricModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: CustomMetric
  onSave: (m: CustomMetric) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<MetricForm>({
    name: initial?.name ?? "",
    value: String(initial?.value ?? ""),
    unit: initial?.unit ?? "PERCENT",
    formula: initial?.formula ?? "",
    channel: initial?.channel ?? "",
  })

  function save() {
    if (!form.name.trim()) return
    onSave({
      id: initial?.id ?? `m-${Date.now()}`,
      name: form.name,
      value: parseFloat(form.value) || 0,
      unit: form.unit,
      formula: form.formula,
      channel: form.channel ? form.channel as ChannelType : undefined,
      color: initial?.color ?? "#7D1AD7",
    })
    onClose()
  }

  return (
    <Modal
      title={initial ? "Editar métrica" : "Nova métrica"}
      onClose={onClose}
      wide
    >
      <div className="px-6 py-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-[#8A8A9A] mb-1">
              Nome da métrica *
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ex: Taxa de Engajamento IG"
              className="w-full text-sm px-3 py-2 rounded-lg border border-[rgba(255,255,255,0.1)] focus:outline-none focus:border-[#7D1AD7]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#8A8A9A] mb-1">
              Valor atual
            </label>
            <input
              type="number"
              value={form.value}
              onFocus={selectOnFocus}
              onChange={(e) =>
                setForm((f) => ({ ...f, value: e.target.value }))
              }
              placeholder="0"
              className="w-full text-sm px-3 py-2 rounded-lg border border-[rgba(255,255,255,0.1)] focus:outline-none focus:border-[#7D1AD7]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#8A8A9A] mb-1">
              Unidade
            </label>
            <select
              value={form.unit}
              onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
              className="w-full text-sm px-3 py-2 rounded-lg border border-[rgba(255,255,255,0.1)] focus:outline-none focus:border-[#7D1AD7] bg-[#17171A]"
            >
              {UNIT_OPTIONS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-[#8A8A9A] mb-1">
              Regra de cálculo / fórmula
            </label>
            <textarea
              value={form.formula}
              onChange={(e) =>
                setForm((f) => ({ ...f, formula: e.target.value }))
              }
              rows={3}
              placeholder="Ex: (Curtidas + Comentários + Saves) / Alcance × 100"
              className="w-full text-sm px-3 py-2 rounded-lg border border-[rgba(255,255,255,0.1)] focus:outline-none focus:border-[#7D1AD7] resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#8A8A9A] mb-1">
              Canal
            </label>
            <select
              value={form.channel}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  channel: e.target.value as ChannelType | "",
                }))
              }
              className="w-full text-sm px-3 py-2 rounded-lg border border-[rgba(255,255,255,0.1)] focus:outline-none focus:border-[#7D1AD7] bg-[#17171A]"
            >
              <option value="">Todos</option>
              {METRIC_CHANNELS.map((ch) => (
                <option key={ch} value={ch}>
                  {CH_LABELS[ch]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <div
        className="px-6 py-4 flex gap-3"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <button
          onClick={save}
          className="px-5 py-2 rounded-xl text-sm font-medium text-white hover:opacity-90 btn-glow"
          style={{ background: "linear-gradient(135deg, #7D1AD7, #50E678)" }}
        >
          {initial ? "Salvar" : "Criar métrica"}
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-xl text-sm font-medium text-[#8A8A9A] hover:bg-[rgba(255,255,255,0.08)]"
        >
          Cancelar
        </button>
      </div>
    </Modal>
  )
}

export function mapMetric(row: any): CustomMetric {
  return {
    id: row.id,
    name: row.nome,
    value: row.valor,
    unit: row.unidade,
    formula: row.formula,
    channel: row.canal ? row.canal.toLowerCase() as ChannelType : undefined,
    color: "#7D1AD7",
    updatedAt: row.atualizadoEm,
  }
}
function toApiMetric(m: CustomMetric) {
  return {
    nome: m.name,
    canal:
      m.channel === "instagram" || m.channel === "linkedin"
        ? m.channel.toUpperCase()
        : null,
    formula: m.formula,
    valor: m.value,
    unidade: m.unit,
  }
}

export function InsertMetrics({
  metrics,
  setMetrics,
}: {
  metrics: CustomMetric[]
  setMetrics: (fn: (prev: CustomMetric[]) => CustomMetric[]) => void
}) {
  const [modal, setModal] = useState<{ metric?: CustomMetric } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editVal, setEditVal] = useState("")
  const [deleteId, setDeleteId] = useState<string | null>(null)

  async function saveMetric(m: CustomMetric) {
    const isNew = !metrics.some((x) => x.id === m.id)
    try {
      if (isNew) {
        const created = mapMetric(
          await api.metrics.createCustom(toApiMetric(m)),
        )
        setMetrics((prev) => [
          ...prev,
          {
            ...created,
            color: METRIC_COLORS[prev.length % METRIC_COLORS.length],
          },
        ])
      } else {
        const updated = mapMetric(
          await api.metrics.updateCustom(m.id, toApiMetric(m)),
        )
        setMetrics((prev) =>
          prev.map((x) => (x.id === m.id ? { ...updated, color: x.color } : x)),
        )
      }
    } catch (error) {
      console.error(error)
    }
  }

  async function deleteMetric(id: string) {
    try {
      await api.metrics.removeCustom(id)
      setMetrics((prev) => prev.filter((m) => m.id !== id))
    } catch (error) {
      console.error(error)
    }
    setDeleteId(null)
  }

  async function commitValueEdit(id: string) {
    const metric = metrics.find((m) => m.id === id)
    setEditingId(null)
    if (!metric) return
    const parsed = parseFloat(editVal)
    const value = Number.isNaN(parsed) ? metric.value : parsed
    try {
      const updated = mapMetric(
        await api.metrics.updateCustom(id, toApiMetric({ ...metric, value })),
      )
      setMetrics((prev) =>
        prev.map((m) => (m.id === id ? { ...updated, color: m.color } : m)),
      )
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <div className="h-full overflow-auto p-5">
      <div className="max-w-3xl mx-auto">
        <div
          className="rounded-xl p-4 mb-5 flex items-start gap-3"
          style={{
            background: "rgba(125,26,215,0.08)",
            border: "1px solid #7D1AD7",
          }}
        >
          <Info size={16} className="text-[#7D1AD7] flex-shrink-0 mt-0.5" />
          <p className="text-sm text-[#7D1AD7]">
            Gerencie métricas personalizadas com regras de cálculo. Cada métrica
            tem um valor (inserido manualmente) e uma fórmula que documenta como
            ela é calculada. O alcance semanal no dashboard é calculado
            automaticamente a partir dos posts da Biblioteca.
          </p>
        </div>

        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-[#F0F0F5]">
            Métricas personalizadas ({metrics.length})
          </h3>
          <button
            onClick={() => setModal({})}
            className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl text-white hover:opacity-90 btn-glow"
            style={{ background: "linear-gradient(135deg, #7D1AD7, #50E678)" }}
          >
            <Plus size={15} /> Nova métrica
          </button>
        </div>

        <div className="space-y-3">
          {metrics.map((m) => (
            <div
              key={m.id}
              className="editorial-card bg-[#17171A] rounded-xl overflow-hidden group"
              style={{
                border: "1.5px solid rgba(255,255,255,0.1)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}
            >
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                      style={{ background: m.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-semibold text-[#F0F0F5]">
                          {m.name}
                        </p>
                        {m.channel && (
                          <span
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{
                              background: "rgba(255,255,255,0.06)",
                              color: "#8A8A9A",
                            }}
                          >
                            {CH_LABELS[m.channel]}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#8A8A9A]">{m.formula}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {editingId === m.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={editVal}
                          onFocus={selectOnFocus}
                          onChange={(e) => setEditVal(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitValueEdit(m.id)
                            if (e.key === "Escape") setEditingId(null)
                          }}
                          className="w-20 text-sm px-2 py-1 rounded border border-[rgba(125,26,215,0.3)] focus:outline-none text-center"
                          autoFocus
                        />
                        <button
                          onClick={() => commitValueEdit(m.id)}
                          className="text-[#00C853] hover:text-[#00C853]"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-[#555566] hover:text-[#8A8A9A]"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingId(m.id)
                          setEditVal(String(m.value))
                        }}
                        className="text-lg font-bold cursor-pointer hover:opacity-70 transition-opacity"
                        style={{ color: m.color }}
                      >
                        {m.value.toLocaleString("pt-BR")}{" "}
                        <span className="text-sm font-normal text-[#555566]">
                          {UNIT_LABELS[m.unit] ?? m.unit}
                        </span>
                      </button>
                    )}
                    <button
                      onClick={() => setModal({ metric: m })}
                      className="p-1.5 rounded-lg text-[#555566] hover:text-[#7D1AD7] hover:bg-[rgba(125,26,215,0.08)] opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => setDeleteId(m.id)}
                      className="p-1.5 rounded-lg text-[#555566] hover:text-[#FF5252] hover:bg-[rgba(255,82,82,0.12)] opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {metrics.length === 0 && (
            <div className="empty-state text-center py-12 text-[#8A8A9A]">
              Nenhuma métrica. Clique em "Nova métrica" para começar.
            </div>
          )}
        </div>

        {modal && (
          <MetricModal
            initial={modal.metric}
            onSave={saveMetric}
            onClose={() => setModal(null)}
          />
        )}
        {deleteId !== null && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onClick={() => setDeleteId(null)}
          >
            <div
              className="bg-[#17171A] rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="font-semibold text-[#F0F0F5] mb-1">
                Apagar métrica?
              </p>
              <p className="text-sm text-[#8A8A9A] mb-4">
                Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => deleteMetric(deleteId)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-[#FF5252]"
                >
                  Apagar
                </button>
                <button
                  onClick={() => setDeleteId(null)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-[#8A8A9A] hover:bg-[rgba(255,255,255,0.08)]"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── MQL Ideal ─────────────────────────────────────────────────────────────

type MQLState = typeof mqlData
