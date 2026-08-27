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
import { AvatarStack, AttendanceSummary, CH, ChannelBadge, ChannelFilter, DIFFICULTY_FROM_API, DIFFICULTY_TO_API, FormField, Inp, mapCampaign, mapEvent, mapTask, Modal, TaskMember, TIPO_FROM_API, TIPO_TO_API, Tab, CHANNEL_TO_API } from "../components/shared"
function ProgressBar({
  value,
  target,
  color,
}: {
  value: number
  target: number
  color: string
}) {
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0
  return (
    <div className="min-w-0">
      <div className="flex justify-between gap-1.5 text-xs mb-1">
        <span className="truncate" style={{ color: "#8A8A9A" }}>
          {value.toLocaleString("pt-BR")}
        </span>
        <span className="truncate flex-shrink-0" style={{ color: "#555566" }}>
          meta: {target.toLocaleString("pt-BR")}
        </span>
      </div>
      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{ background: "rgba(255,255,255,0.06)" }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <div className="text-xs mt-0.5" style={{ color: "#555566" }}>
        {pct}%
      </div>
    </div>
  )
}

const statusStyle = {
  ativa: { label: "Ativa", bg: "rgba(0,200,83,0.15)", color: "#00C853" },
  planejada: {
    label: "Planejada",
    bg: "rgba(125,26,215,0.08)",
    color: "#7D1AD7",
  },
  encerrada: {
    label: "Encerrada",
    bg: "rgba(255,255,255,0.06)",
    color: "#8A8A9A",
  },
}
const GOAL_COLORS = [
  "#7D1AD7",
  "#00C853",
  "#FFB300",
  "#00E5C8",
  "#E1306C",
  "#507AE6",
  "#FF5252",
  "#40C4FF",
]

export function CampaignsView({
  channel,
  setChannel,
}: {
  channel: Channel
  setChannel: (c: Channel) => void
}) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [showForm, setShowForm] = useState(false)
  const [expandedMetrics, setExpandedMetrics] =
    useState<Record<string, boolean>>({})
  const [metricForms, setMetricForms] = useState<Record<string, {
    date: string
    reach: string
    interactions: string
    customValues: Record<string, string>
  }>>({})
  const emptyCampaignForm = {
    name: "",
    objective: "",
    audience: "",
    startDate: "",
    endDate: "",
    channels: [] as ChannelType[],
    goals: [] as { name: string; value: string }[],
  }
  const emptyNewGoal = { name: "", value: "" }
  const [form, setForm] = useState(emptyCampaignForm)
  const [newGoal, setNewGoal] = useState(emptyNewGoal)
  const [editingGoalIndex, setEditingGoalIndex] = useState<number | null>(null)
  const [editingLiveGoalId, setEditingLiveGoalId] = useState<string | null>(
    null,
  )
  const [editingId, setEditingId] = useState<string | null>(null)
  const editingCampaign = editingId
    ? (campaigns.find((c) => c.id === editingId) ?? null)
    : null
  const [goalLinesVisible, setGoalLinesVisible] =
    useState<Record<string, boolean>>({})
  const [confirmDelete, setConfirmDelete] = useState<{
    kind: "campaign" | "goal" | "metric"
    campId: string
    id: string
    label: string
  } | null>(null)

  function reload() {
    api.campaigns
      .list()
      .then((rows) => setCampaigns(rows.map(mapCampaign)))
      .catch(console.error)
  }
  useEffect(() => {
    reload()
  }, [])

  const filtered =
    channel === "todos"
      ? campaigns
      : campaigns.filter((c) => c.channels.includes(channel as ChannelType))

  function toggleChannel(ch: ChannelType) {
    setForm((f) => ({
      ...f,
      channels: f.channels.includes(ch)
        ? f.channels.filter((c) => c !== ch)
        : [...f.channels, ch],
    }))
  }

  function addFormGoal() {
    if (!newGoal.name.trim() || !newGoal.value) return
    if (editingGoalIndex !== null) {
      setForm((f) => ({
        ...f,
        goals: f.goals.map((g, i) => (i === editingGoalIndex ? newGoal : g)),
      }))
      setEditingGoalIndex(null)
    } else {
      setForm((f) => ({ ...f, goals: [...f.goals, newGoal] }))
    }
    setNewGoal(emptyNewGoal)
  }

  function editFormGoal(index: number) {
    setNewGoal(form.goals[index])
    setEditingGoalIndex(index)
  }

  function removeFormGoal(index: number) {
    setForm((f) => ({ ...f, goals: f.goals.filter((_, i) => i !== index) }))
    if (editingGoalIndex === index) {
      setEditingGoalIndex(null)
      setNewGoal(emptyNewGoal)
    }
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(emptyCampaignForm)
    setNewGoal(emptyNewGoal)
    setEditingGoalIndex(null)
    setEditingLiveGoalId(null)
  }

  function openCreate() {
    setEditingId(null)
    setForm(emptyCampaignForm)
    setNewGoal(emptyNewGoal)
    setEditingGoalIndex(null)
    setEditingLiveGoalId(null)
    setShowForm(true)
  }

  function openEdit(camp: Campaign) {
    setEditingId(camp.id)
    setForm({
      name: camp.name,
      objective: camp.objective,
      audience: camp.audience,
      startDate: camp.startDate,
      endDate: camp.endDate,
      channels: camp.channels,
      goals: [],
    })
    setNewGoal(emptyNewGoal)
    setEditingGoalIndex(null)
    setEditingLiveGoalId(null)
    setShowForm(true)
  }

  async function submitCampaign() {
    if (!form.name.trim()) return
    const payload = {
      nome: form.name,
      objetivo: form.objective.trim() || form.name,
      publico: form.audience.trim() || "Não definido",
      dataInicio: form.startDate || new Date().toISOString().slice(0, 10),
      dataFim: form.endDate || new Date().toISOString().slice(0, 10),
      canais: (form.channels.length
        ? form.channels
        : ["instagram"] as ChannelType[]
      ).map((ch) => CHANNEL_TO_API[ch]),
    }
    if (editingId) {
      const updated = await api.campaigns
        .update(editingId, payload)
        .catch((cause) => {
          console.error(cause)
          return null
        })
      if (!updated) return
      setCampaigns((prev) =>
        prev.map((c) => (c.id === editingId ? mapCampaign(updated) : c)),
      )
      closeForm()
      return
    }
    const created = await api.campaigns
      .create({
        ...payload,
        metas: form.goals.map((g) => ({
          nome: g.name.trim(),
          valor: parseFloat(g.value) || 0,
        })),
      })
      .catch((cause) => {
        console.error(cause)
        return null
      })
    if (!created) return
    setCampaigns((prev) => [mapCampaign(created), ...prev])
    closeForm()
  }

  async function deleteCampaign(id: string) {
    setCampaigns((prev) => prev.filter((c) => c.id !== id))
    await api.campaigns.remove(id).catch((cause) => {
      console.error(cause)
      reload()
    })
  }

  async function addGoalLive(campId: string) {
    if (!newGoal.name.trim() || !newGoal.value) return
    if (editingLiveGoalId) {
      await api.campaigns
        .updateGoal(campId, editingLiveGoalId, {
          nome: newGoal.name.trim(),
          valor: parseFloat(newGoal.value) || 0,
        })
        .catch(console.error)
      setEditingLiveGoalId(null)
    } else {
      await api.campaigns
        .addGoal(campId, {
          nome: newGoal.name.trim(),
          valor: parseFloat(newGoal.value) || 0,
        })
        .catch(console.error)
    }
    setNewGoal(emptyNewGoal)
    reload()
  }

  function editGoalLive(goal: CampaignGoal) {
    setNewGoal({ name: goal.name, value: String(goal.value) })
    setEditingLiveGoalId(goal.id)
  }

  async function deleteGoalLive(campId: string, goalId: string) {
    await api.campaigns.removeGoal(campId, goalId).catch(console.error)
    if (editingLiveGoalId === goalId) {
      setEditingLiveGoalId(null)
      setNewGoal(emptyNewGoal)
    }
    reload()
  }

  async function addMetricEntry(campId: string) {
    const mf = metricForms[campId]
    if (!mf?.date) return
    const valores = Object.entries(mf.customValues ?? {})
      .filter(([, v]) => v !== "")
      .map(([nome, v]) => ({ nome, valor: parseFloat(v) || 0 }))
    await api.campaigns
      .addMetric(campId, {
        data: mf.date,
        alcance: parseInt(mf.reach) || 0,
        interacoes: parseInt(mf.interactions) || 0,
        mostrarGrafico: true,
        valores,
      })
      .catch(console.error)
    setMetricForms((prev) => ({
      ...prev,
      [campId]: { date: "", reach: "", interactions: "", customValues: {} },
    }))
    reload()
  }

  function editEntry(campId: string, entry: CampaignMetricEntry) {
    const customValues: Record<string, string> = {}
    for (const v of entry.values) customValues[v.name] = String(v.value)
    setMetricForms((prev) => ({
      ...prev,
      [campId]: {
        date: entry.date,
        reach: entry.reach ? String(entry.reach) : "",
        interactions: entry.interactions ? String(entry.interactions) : "",
        customValues,
      },
    }))
    setExpandedMetrics((p) => ({ ...p, [campId]: true }))
  }

  async function toggleEntryInChart(
    campId: string,
    entry: CampaignMetricEntry,
  ) {
    const valores = entry.values.map((v) => ({ nome: v.name, valor: v.value }))
    await api.campaigns
      .addMetric(campId, {
        data: entry.date,
        alcance: entry.reach,
        interacoes: entry.interactions,
        mostrarGrafico: !entry.showInChart,
        valores,
      })
      .catch(console.error)
    reload()
  }

  async function deleteMetricEntry(campId: string, metricId: string) {
    await api.campaigns.removeMetric(campId, metricId).catch(console.error)
    reload()
  }

  async function confirmDeleteAction() {
    if (!confirmDelete) return
    if (confirmDelete.kind === "campaign")
      await deleteCampaign(confirmDelete.id)
    else if (confirmDelete.kind === "goal")
      await deleteGoalLive(confirmDelete.campId, confirmDelete.id)
    else await deleteMetricEntry(confirmDelete.campId, confirmDelete.id)
    setConfirmDelete(null)
  }

  return (
    <div className="h-full overflow-auto p-5">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-base font-semibold text-[#F0F0F5]">
                Campanhas
              </h2>
              <p className="text-sm text-[#8A8A9A]">
                {filtered.length} campanha{filtered.length !== 1 ? "s" : ""}
              </p>
            </div>
            <ChannelFilter channel={channel} setChannel={setChannel} />
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl text-white transition-all hover:opacity-90 btn-glow"
            style={{ background: "linear-gradient(135deg, #7D1AD7, #50E678)" }}
          >
            <Plus size={16} /> Nova Campanha
          </button>
        </div>

        {showForm && (
          <div
            className="bg-[#17171A] rounded-2xl p-6 mb-5"
            style={{
              border: "1.5px solid rgba(255,255,255,0.1)",
              boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[#F0F0F5]">
                {editingId ? "Editar Campanha" : "Nova Campanha"}
              </h3>
              <button
                onClick={closeForm}
                className="text-[#555566] hover:text-[#8A8A9A]"
              >
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <FormField label="Nome *">
                  <Inp
                    value={form.name}
                    onChange={(v) => setForm((f) => ({ ...f, name: v }))}
                    placeholder="Ex: Lançamento Q4"
                  />
                </FormField>
              </div>
              <div className="col-span-2">
                <FormField label="Objetivo">
                  <Inp
                    value={form.objective}
                    onChange={(v) => setForm((f) => ({ ...f, objective: v }))}
                    placeholder="Gerar awareness para o produto"
                  />
                </FormField>
              </div>
              <div className="col-span-2">
                <FormField label="Público-alvo">
                  <Inp
                    value={form.audience}
                    onChange={(v) => setForm((f) => ({ ...f, audience: v }))}
                    placeholder="Gerentes de marketing B2B"
                  />
                </FormField>
              </div>
              <FormField label="Início">
                <Inp
                  type="date"
                  value={form.startDate}
                  onChange={(v) => setForm((f) => ({ ...f, startDate: v }))}
                />
              </FormField>
              <FormField label="Término">
                <Inp
                  type="date"
                  value={form.endDate}
                  onChange={(v) => setForm((f) => ({ ...f, endDate: v }))}
                />
              </FormField>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-[#8A8A9A] mb-2">
                  Canais
                </label>
                <div className="flex gap-2 flex-wrap">
                  {([
                    "instagram",
                    "linkedin",
                    "site",
                    "email",
                  ] as ChannelType[]).map((ch) => (
                    <button
                      key={ch}
                      onClick={() => toggleChannel(ch)}
                      className="filter-pill text-xs px-3 py-1.5 rounded-full font-medium transition-all"
                      style={
                        form.channels.includes(ch)
                          ? { background: CH[ch].dot, color: "#fff" }
                          : { background: CH[ch].bg, color: CH[ch].color }
                      }
                    >
                      {CH[ch].label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div
              className="mt-5 pt-4"
              style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
            >
              <label className="block text-xs font-medium text-[#8A8A9A] mb-2 flex items-center gap-1.5">
                <Target size={12} className="text-[#7D1AD7]" /> Metas da
                campanha (opcional)
              </label>
              <p className="text-xs text-[#555566] mb-3">
                Crie quantas metas quiser, com qualquer insight (Alcance, CTR,
                Leads...).
              </p>
              <div className="flex gap-3 items-end flex-wrap mb-3">
                <div className="flex-1 min-w-32">
                  <label className="block text-xs text-[#8A8A9A] mb-1">
                    Nome do insight
                  </label>
                  <input
                    value={newGoal.name}
                    onChange={(e) =>
                      setNewGoal((g) => ({ ...g, name: e.target.value }))
                    }
                    placeholder="Ex: Alcance, CTR, Leads..."
                    className="w-full text-xs px-2.5 py-2 rounded-lg border border-[rgba(255,255,255,0.1)] focus:outline-none focus:border-[#7D1AD7]"
                  />
                </div>
                <div className="flex-1 min-w-24">
                  <label className="block text-xs text-[#8A8A9A] mb-1">
                    Valor da meta
                  </label>
                  <input
                    type="number"
                    value={newGoal.value}
                    onChange={(e) =>
                      setNewGoal((g) => ({ ...g, value: e.target.value }))
                    }
                    placeholder="0"
                    className="w-full text-xs px-2.5 py-2 rounded-lg border border-[rgba(255,255,255,0.1)] focus:outline-none focus:border-[#7D1AD7]"
                  />
                </div>
                <button
                  onClick={() =>
                    editingCampaign
                      ? addGoalLive(editingCampaign.id)
                      : addFormGoal()
                  }
                  className="flex items-center gap-1 text-xs px-3 py-2 rounded-xl font-medium text-white hover:opacity-90 btn-glow"
                  style={{ background: "#7D1AD7" }}
                >
                  {(
                    editingCampaign
                      ? editingLiveGoalId
                      : editingGoalIndex !== null
                  ) ? (
                    <>
                      <Edit2 size={12} /> Salvar meta
                    </>
                  ) : (
                    <>
                      <Plus size={12} /> Adicionar meta
                    </>
                  )}
                </button>
              </div>
              {editingCampaign ? (
                editingCampaign.goals.length > 0 ? (
                  <div
                    className="rounded-lg overflow-hidden"
                    style={{ border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    {editingCampaign.goals.map((g, i) => (
                      <div
                        key={g.id}
                        className="flex items-center justify-between px-3 py-2 text-xs"
                        style={{
                          background: i % 2 === 0 ? "#202024" : "#17171A",
                          borderTop:
                            i > 0
                              ? "1px solid rgba(255,255,255,0.06)"
                              : undefined,
                        }}
                      >
                        <span style={{ color: "#F0F0F5" }}>{g.name}</span>
                        <span style={{ color: "#8A8A9A" }}>
                          Meta: {g.value.toLocaleString("pt-BR")}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => editGoalLive(g)}
                            className="p-1.5 rounded-lg text-[#555566] transition-all hover:text-[#7D1AD7] hover:bg-[rgba(125,26,215,0.12)]"
                            title="Editar meta"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() =>
                              setConfirmDelete({
                                kind: "goal",
                                campId: editingCampaign.id,
                                id: g.id,
                                label: `a meta "${g.name}"`,
                              })
                            }
                            className="p-1.5 rounded-lg text-[#FF5252] transition-all hover:bg-[rgba(255,82,82,0.15)]"
                            title="Apagar meta"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#555566] text-center py-2">
                    Nenhuma meta criada ainda
                  </p>
                )
              ) : (
                form.goals.length > 0 && (
                  <div
                    className="rounded-lg overflow-hidden"
                    style={{ border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    {form.goals.map((g, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between px-3 py-2 text-xs"
                        style={{
                          background: i % 2 === 0 ? "#202024" : "#17171A",
                          borderTop:
                            i > 0
                              ? "1px solid rgba(255,255,255,0.06)"
                              : undefined,
                        }}
                      >
                        <span style={{ color: "#F0F0F5" }}>{g.name}</span>
                        <span style={{ color: "#8A8A9A" }}>
                          Meta: {g.value}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => editFormGoal(i)}
                            className="p-1.5 rounded-lg text-[#555566] transition-all hover:text-[#7D1AD7] hover:bg-[rgba(125,26,215,0.12)]"
                            title="Editar meta"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => removeFormGoal(i)}
                            className="p-1.5 rounded-lg text-[#FF5252] transition-all hover:bg-[rgba(255,82,82,0.15)]"
                            title="Remover meta"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>

            <div
              className="flex gap-3 mt-5 pt-4"
              style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
            >
              <button
                onClick={submitCampaign}
                className="px-5 py-2 rounded-xl text-sm font-medium text-white hover:opacity-90 btn-glow"
                style={{
                  background: "linear-gradient(135deg, #7D1AD7, #50E678)",
                }}
              >
                {editingId ? "Salvar alterações" : "Criar Campanha"}
              </button>
              <button
                onClick={closeForm}
                className="px-4 py-2 rounded-xl text-sm font-medium text-[#8A8A9A] hover:bg-[rgba(255,255,255,0.08)]"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {filtered.map((camp) => {
            const st = statusStyle[camp.status]
            const expanded = expandedMetrics[camp.id]
            const mf = metricForms[camp.id] ?? {
              date: "",
              reach: "",
              interactions: "",
              customValues: {},
            }
            const goalLinesOn = goalLinesVisible[camp.id] ?? true
            const alcanceGoal = camp.goals.find(
              (g) => g.name.trim().toLowerCase() === "alcance",
            )
            const interacoesGoal = camp.goals.find((g) =>
              ["interações", "interacoes"].includes(
                g.name.trim().toLowerCase(),
              ),
            )
            const otherGoals = camp.goals.filter(
              (g) => g !== alcanceGoal && g !== interacoesGoal,
            )
            const visibleGoalsCount =
              (alcanceGoal ? 1 : 0) +
              (interacoesGoal ? 1 : 0) +
              otherGoals.length
            const chartSeries = [
              "reach",
              "interactions",
              ...otherGoals.map((g) => g.name),
            ]
            const colorFor = (key: string) =>
              GOAL_COLORS[
                Math.max(0, chartSeries.indexOf(key)) % GOAL_COLORS.length
              ]
            const goalKey = (g: CampaignGoal) =>
              g === alcanceGoal
                ? "reach"
                : g === interacoesGoal
                  ? "interactions"
                  : g.name
            // 0 significa "não preenchido" nesse registro — não plotamos o ponto para não sugerir que o valor real foi zero
            const chartData = camp.dailyEntries
              .filter((e) => e.showInChart)
              .map((e) => {
                const row: Record<string, string | number> = {
                  date: `${e.date.slice(8, 10)}/${e.date.slice(5, 7)}`,
                }
                if (e.reach !== 0) row.reach = e.reach
                if (e.interactions !== 0) row.interactions = e.interactions
                for (const v of e.values) row[v.name] = v.value
                return row
              })

            return (
              <div
                key={camp.id}
                className="analytic-card bg-[#17171A] rounded-2xl p-5"
                style={{
                  border: "1.5px solid rgba(255,255,255,0.1)",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                }}
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-[#F0F0F5]">
                        {camp.name}
                      </h3>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: st.bg, color: st.color }}
                      >
                        {st.label}
                      </span>
                    </div>
                    <p className="text-sm text-[#8A8A9A]">{camp.objective}</p>
                    <p className="text-xs text-[#555566] mt-0.5">
                      Público: {camp.audience}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {camp.daysRunning > 0 && (
                      <span className="text-xs" style={{ color: "#555566" }}>
                        <span style={{ color: "#7D1AD7", fontWeight: 600 }}>
                          {camp.daysRunning}d
                        </span>{" "}
                        no ar
                      </span>
                    )}
                    <button
                      onClick={() => openEdit(camp)}
                      className="p-1.5 rounded-lg text-[#555566] hover:text-[#7D1AD7] hover:bg-[rgba(125,26,215,0.12)] transition-all"
                      title="Editar campanha"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={() =>
                        setConfirmDelete({
                          kind: "campaign",
                          campId: camp.id,
                          id: camp.id,
                          label: `a campanha "${camp.name}" e todos os seus dados`,
                        })
                      }
                      className="p-1.5 rounded-lg text-[#555566] hover:text-[#FF5252] hover:bg-[rgba(255,82,82,0.12)] transition-all"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className="flex gap-1.5 mb-4">
                  {camp.channels.map((ch) => (
                    <ChannelBadge key={ch} ch={ch} small />
                  ))}
                  <span className="text-xs text-[#555566] ml-1">
                    {formatDateBR(camp.startDate)} →{" "}
                    {formatDateBR(camp.endDate)}
                  </span>
                </div>

                {visibleGoalsCount > 0 && (
                  <div
                    className="grid gap-y-3 mb-4"
                    style={{
                      gridTemplateColumns: `repeat(${visibleGoalsCount}, minmax(0, 1fr))`,
                      columnGap: visibleGoalsCount > 4 ? 12 : 24,
                    }}
                  >
                    {alcanceGoal && (
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-[#8A8A9A] mb-1.5 flex items-center gap-1 truncate">
                          <Target size={11} className="flex-shrink-0" /> Alcance
                        </div>
                        <ProgressBar
                          value={camp.reach}
                          target={alcanceGoal.value}
                          color={colorFor("reach")}
                        />
                      </div>
                    )}
                    {interacoesGoal && (
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-[#8A8A9A] mb-1.5 flex items-center gap-1 truncate">
                          <BarChart2 size={11} className="flex-shrink-0" />{" "}
                          Interações
                        </div>
                        <ProgressBar
                          value={camp.interactions}
                          target={interacoesGoal.value}
                          color={colorFor("interactions")}
                        />
                      </div>
                    )}
                    {otherGoals.map((g) => {
                      const current = camp.dailyEntries.reduce(
                        (sum, e) =>
                          sum +
                          (e.values.find((v) => v.name === g.name)?.value ?? 0),
                        0,
                      )
                      return (
                        <div key={g.id} className="min-w-0">
                          <div className="text-xs font-medium text-[#8A8A9A] mb-1.5 flex items-center gap-1 truncate">
                            <Target size={11} className="flex-shrink-0" />{" "}
                            {g.name}
                          </div>
                          <ProgressBar
                            value={current}
                            target={g.value}
                            color={colorFor(g.name)}
                          />
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Daily metrics section */}
                <div
                  className="rounded-xl overflow-hidden"
                  style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  <button
                    onClick={() =>
                      setExpandedMetrics((p) => ({
                        ...p,
                        [camp.id]: !expanded,
                      }))
                    }
                    className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-[#F0F0F5] hover:bg-[#202024] transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <BarChart2 size={14} className="text-[#7D1AD7]" />{" "}
                      Métricas diárias ({camp.dailyEntries.length} registros)
                    </span>
                    <ChevronRight
                      size={14}
                      className="text-[#555566] transition-transform"
                      style={{ transform: expanded ? "rotate(90deg)" : "none" }}
                    />
                  </button>

                  {expanded && (
                    <div
                      className="px-4 pb-4"
                      style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
                    >
                      {/* Add entry form */}
                      <div className="pt-3 pb-3 flex gap-2 items-end">
                        <div className="flex-1 min-w-0">
                          <label className="block text-xs text-[#8A8A9A] mb-1 truncate">
                            Data
                          </label>
                          <input
                            type="date"
                            value={mf.date}
                            onChange={(e) =>
                              setMetricForms((p) => ({
                                ...p,
                                [camp.id]: { ...mf, date: e.target.value },
                              }))
                            }
                            className="w-full text-xs px-2.5 py-2 rounded-lg border border-[rgba(255,255,255,0.1)] focus:outline-none focus:border-[#7D1AD7]"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <label className="block text-xs text-[#8A8A9A] mb-1 truncate">
                            Alcance
                          </label>
                          <input
                            type="number"
                            value={mf.reach}
                            onChange={(e) =>
                              setMetricForms((p) => ({
                                ...p,
                                [camp.id]: { ...mf, reach: e.target.value },
                              }))
                            }
                            placeholder="0"
                            className="w-full text-xs px-2.5 py-2 rounded-lg border border-[rgba(255,255,255,0.1)] focus:outline-none focus:border-[#7D1AD7]"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <label className="block text-xs text-[#8A8A9A] mb-1 truncate">
                            Interações
                          </label>
                          <input
                            type="number"
                            value={mf.interactions}
                            onChange={(e) =>
                              setMetricForms((p) => ({
                                ...p,
                                [camp.id]: {
                                  ...mf,
                                  interactions: e.target.value,
                                },
                              }))
                            }
                            placeholder="0"
                            className="w-full text-xs px-2.5 py-2 rounded-lg border border-[rgba(255,255,255,0.1)] focus:outline-none focus:border-[#7D1AD7]"
                          />
                        </div>
                        {otherGoals.map((g) => (
                          <div key={g.id} className="flex-1 min-w-0">
                            <label className="block text-xs text-[#8A8A9A] mb-1 truncate">
                              {g.name}
                            </label>
                            <input
                              type="number"
                              value={mf.customValues[g.name] ?? ""}
                              onChange={(e) =>
                                setMetricForms((p) => ({
                                  ...p,
                                  [camp.id]: {
                                    ...mf,
                                    customValues: {
                                      ...mf.customValues,
                                      [g.name]: e.target.value,
                                    },
                                  },
                                }))
                              }
                              placeholder="0"
                              className="w-full text-xs px-2.5 py-2 rounded-lg border border-[rgba(255,255,255,0.1)] focus:outline-none focus:border-[#7D1AD7]"
                            />
                          </div>
                        ))}
                        <button
                          onClick={() => addMetricEntry(camp.id)}
                          className="flex items-center gap-1 text-xs px-3 py-2 rounded-xl font-medium text-white hover:opacity-90 btn-glow flex-shrink-0 whitespace-nowrap"
                          style={{ background: "#7D1AD7" }}
                        >
                          {camp.dailyEntries.some((e) => e.date === mf.date) ? (
                            <>
                              <Edit2 size={12} /> Salvar alterações
                            </>
                          ) : (
                            <>
                              <Plus size={12} /> Registrar
                            </>
                          )}
                        </button>
                      </div>
                      {/* Chart */}
                      {chartData.length > 0 && (
                        <>
                          {camp.goals.length > 0 && (
                            <label className="flex items-center gap-2 text-xs text-[#8A8A9A] mb-3 cursor-pointer w-fit">
                              <input
                                type="checkbox"
                                checked={goalLinesOn}
                                onChange={(e) =>
                                  setGoalLinesVisible((p) => ({
                                    ...p,
                                    [camp.id]: e.target.checked,
                                  }))
                                }
                                className="accent-[#7D1AD7]"
                              />
                              Mostrar linhas de meta no gráfico
                            </label>
                          )}
                          <div style={{ height: 160, marginBottom: 12 }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart
                                data={chartData}
                                margin={{
                                  top: 4,
                                  right: 8,
                                  left: -24,
                                  bottom: 0,
                                }}
                              >
                                <CartesianGrid
                                  strokeDasharray="3 3"
                                  stroke="rgba(255,255,255,0.06)"
                                />
                                <XAxis
                                  dataKey="date"
                                  tick={{ fontSize: 10, fill: "#555566" }}
                                  axisLine={false}
                                  tickLine={false}
                                />
                                <YAxis
                                  tick={{ fontSize: 10, fill: "#555566" }}
                                  axisLine={false}
                                  tickLine={false}
                                />
                                <Tooltip
                                  contentStyle={{
                                    background: "#17171A",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    borderRadius: 10,
                                    fontSize: 11,
                                    color: "#F0F0F5",
                                  }}
                                  formatter={(v) =>
                                    Number(v ?? 0).toLocaleString("pt-BR")
                                  }
                                />
                                {goalLinesOn &&
                                  camp.goals.map((g) => (
                                    <ReferenceLine
                                      key={g.id}
                                      y={g.value}
                                      stroke={colorFor(goalKey(g))}
                                      strokeDasharray="4 4"
                                      label={{
                                        value: `Meta ${g.name}`,
                                        fill: colorFor(goalKey(g)),
                                        fontSize: 10,
                                      }}
                                    />
                                  ))}
                                <Line
                                  type="monotone"
                                  dataKey="reach"
                                  name="Alcance"
                                  stroke={colorFor("reach")}
                                  strokeWidth={2}
                                  dot={{ r: 3 }}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="interactions"
                                  name="Interações"
                                  stroke={colorFor("interactions")}
                                  strokeWidth={2}
                                  dot={{ r: 3 }}
                                />
                                {otherGoals.map((g) => (
                                  <Line
                                    key={g.id}
                                    type="monotone"
                                    dataKey={g.name}
                                    name={g.name}
                                    stroke={colorFor(g.name)}
                                    strokeWidth={2}
                                    dot={{ r: 3 }}
                                  />
                                ))}
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </>
                      )}

                      {/* Entries table */}
                      {camp.dailyEntries.length > 0 && (
                        <div
                          className="rounded-lg overflow-hidden"
                          style={{ border: "1px solid rgba(255,255,255,0.06)" }}
                        >
                          {camp.dailyEntries.map((entry, i) => (
                            <div
                              key={entry.date}
                              className="flex items-center justify-between px-3 py-2 text-xs group"
                              style={{
                                background: i % 2 === 0 ? "#202024" : "#17171A",
                                borderTop:
                                  i > 0
                                    ? "1px solid rgba(255,255,255,0.06)"
                                    : undefined,
                              }}
                            >
                              <span style={{ color: "#8A8A9A" }}>
                                {formatDateBR(entry.date)}
                              </span>
                              {entry.reach !== 0 && (
                                <span style={{ color: colorFor("reach") }}>
                                  Alcance: {entry.reach.toLocaleString("pt-BR")}
                                </span>
                              )}
                              {entry.interactions !== 0 && (
                                <span
                                  style={{ color: colorFor("interactions") }}
                                >
                                  Interações:{" "}
                                  {entry.interactions.toLocaleString("pt-BR")}
                                </span>
                              )}
                              {entry.values
                                .filter((v) => v.value !== 0)
                                .map((v) => (
                                  <span
                                    key={v.name}
                                    style={{ color: colorFor(v.name) }}
                                  >
                                    {v.name}: {v.value.toLocaleString("pt-BR")}
                                  </span>
                                ))}
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => editEntry(camp.id, entry)}
                                  className="p-1.5 rounded-lg text-[#555566] transition-all hover:text-[#7D1AD7] hover:bg-[rgba(125,26,215,0.12)]"
                                  title="Editar registro"
                                >
                                  <Edit2 size={15} />
                                </button>
                                <button
                                  onClick={() =>
                                    toggleEntryInChart(camp.id, entry)
                                  }
                                  className="p-1.5 rounded-lg transition-all hover:bg-[rgba(255,255,255,0.08)]"
                                  style={{
                                    color: entry.showInChart
                                      ? "#7D1AD7"
                                      : "#8A8A9A",
                                    background: entry.showInChart
                                      ? "rgba(125,26,215,0.12)"
                                      : "rgba(255,255,255,0.05)",
                                  }}
                                  title={
                                    entry.showInChart
                                      ? "Ocultar do gráfico"
                                      : "Mostrar no gráfico"
                                  }
                                >
                                  {entry.showInChart ? (
                                    <Eye size={15} />
                                  ) : (
                                    <EyeOff size={15} />
                                  )}
                                </button>
                                <button
                                  onClick={() =>
                                    entry.id &&
                                    setConfirmDelete({
                                      kind: "metric",
                                      campId: camp.id,
                                      id: entry.id,
                                      label: `o registro de ${formatDateBR(entry.date)}`,
                                    })
                                  }
                                  className="p-1.5 rounded-lg text-[#FF5252] transition-all hover:bg-[rgba(255,82,82,0.15)]"
                                  title="Apagar registro"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {camp.dailyEntries.length === 0 && (
                        <p className="text-xs text-[#555566] text-center py-2">
                          Nenhum registro ainda
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="bg-[#17171A] rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-semibold text-[#F0F0F5] mb-1">
              Apagar {confirmDelete.label}?
            </p>
            <p className="text-sm text-[#8A8A9A] mb-4">
              Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-2">
              <button
                onClick={confirmDeleteAction}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-[#FF5252] hover:bg-[#E64545]"
              >
                Apagar
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-[#8A8A9A] hover:bg-[rgba(255,255,255,0.08)]"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Engagement ────────────────────────────────────────────────────────────

type NoteCategory = "feedbacks" | "alertas" | "outros"
interface MemberNotes {
  feedbacks: string
  alertas: string
  outros: string
}
interface EngagementCriterion {
  id: string
  nome: string
  ordem: number
}
interface EngagementRow {
  memberId: string
  name: string
  role: string
  initials: string
  color: string
  scores: Record<string, number>
  quality: number
  presence: number
  punctuality: number
  registeredEvents: number
  attendances: number
  tasksCompleted: number
  tasksTotal: number
}
type AttendanceStatus = "PRESENTE" | "AUSENTE" | "ATRASADO"
interface AttendanceEvent {
  id: string
  titulo: string
  data: string
  horario: string
  horarioFim: string | null
  pendente: boolean
  participantes: {
    userId: string
    nome: string
    status: AttendanceStatus | null
  }[]
}
