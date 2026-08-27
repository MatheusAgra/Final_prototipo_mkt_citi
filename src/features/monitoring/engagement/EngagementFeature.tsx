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
import { AvatarStack, AttendanceSummary, CH, ChannelBadge, ChannelFilter, DIFFICULTY_FROM_API, DIFFICULTY_TO_API, FormField, Inp, mapCampaign, mapEvent, mapTask, Modal, TaskMember, TIPO_FROM_API, TIPO_TO_API, Tab } from "../components/shared"
type NoteCategory = "feedbacks" | "alertas" | "outros"
interface MemberNotes { feedbacks: string; alertas: string; outros: string }
interface EngagementCriterion { id: string; nome: string; ordem: number }
interface EngagementRow { memberId: string; name: string; role: string; initials: string; color: string; scores: Record<string, number>; quality: number; presence: number; punctuality: number; registeredEvents: number; attendances: number; tasksCompleted: number; tasksTotal: number }
type AttendanceStatus = "PRESENTE" | "AUSENTE" | "ATRASADO"
interface AttendanceEvent { id: string; titulo: string; data: string; horario: string; horarioFim: string | null; pendente: boolean; participantes: { userId: string; nome: string; status: AttendanceStatus | null }[] }
const CRITERION_COLORS = [
  "#7D1AD7",
  "#FFB300",
  "#00E5C8",
  "#E1306C",
  "#507AE6",
  "#50E678",
]

function StarDisplay({ val, color }: { val: number; color: string }) {
  const full = Math.floor(val)
  const frac = val - full
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg key={s} width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M6 1l1.2 3.6H11L8.2 6.9l1 3.1L6 8.4 2.8 10l1-3.1L1 4.6h3.8z"
            fill={
              s <= full
                ? color
                : s === full + 1 && frac >= 0.5
                  ? color
                  : "rgba(255,255,255,0.1)"
            }
            opacity={s === full + 1 && frac > 0 && frac < 0.5 ? 0.4 : 1}
          />
        </svg>
      ))}
    </div>
  )
}

// Componente de nível de módulo (não aninhado em EngagementView): se fosse recriado a cada render,
// o React trocaria a identidade do componente a cada tecla digitada e o <input> perderia o foco no meio
// da digitação.
function StarScore({
  editMode,
  isQuality,
  val,
  autoVal,
  color,
  draftValue,
  onChange,
  onBlur,
}: {
  editMode: boolean
  isQuality: boolean
  val: number
  autoVal: number | null
  color: string
  draftValue: string
  onChange: (raw: string) => void
  onBlur: () => void
}) {
  if (editMode && isQuality) {
    return (
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          <StarDisplay val={val} color={color} />
          <span className="text-xs text-[#8A8A9A]">{val.toFixed(1)}</span>
        </div>
        <span className="text-xs text-[#00C853]">
          calculada pelas notas das tasks
        </span>
      </div>
    )
  }

  if (editMode) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          min={0}
          max={5}
          step={0.1}
          value={draftValue}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          onFocus={(e) => e.target.select()}
          className="w-16 text-xs px-2 py-1 rounded border border-[rgba(255,255,255,0.1)] focus:outline-none focus:border-[#7D1AD7] text-center"
        />
        <span className="text-xs text-[#555566]">/ 5</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5">
        <StarDisplay val={val} color={color} />
        <span className="text-xs" style={{ color: "#8A8A9A" }}>
          {val.toFixed(1)}
        </span>
      </div>
      {isQuality && autoVal !== null && (
        <div className="text-xs">
          <span className="text-[#00C853]">auto</span>
        </div>
      )}
    </div>
  )
}

function CriteriaManagerModal({
  criteria,
  onClose,
  onCreate,
  onRename,
  onDelete,
}: {
  criteria: EngagementCriterion[]
  onClose: () => void
  onCreate: (nome: string) => Promise<void>
  onRename: (id: string, nome: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [newName, setNewName] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  async function submitCreate() {
    if (!newName.trim()) return
    setBusy(true)
    setError("")
    try {
      await onCreate(newName.trim())
      setNewName("")
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível criar o critério.",
      )
    } finally {
      setBusy(false)
    }
  }
  async function submitRename(id: string) {
    if (!editValue.trim()) {
      setEditingId(null)
      return
    }
    setBusy(true)
    setError("")
    try {
      await onRename(id, editValue.trim())
      setEditingId(null)
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Não foi possível renomear.",
      )
    } finally {
      setBusy(false)
    }
  }
  async function confirmDelete(id: string) {
    setBusy(true)
    setError("")
    try {
      await onDelete(id)
      setDeleteId(null)
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Não foi possível apagar.",
      )
    } finally {
      setBusy(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-[#17171A] rounded-2xl shadow-2xl max-w-sm w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <h3 className="font-semibold text-[#F0F0F5]">
            Critérios de avaliação
          </h3>
          <button
            onClick={onClose}
            className="text-[#555566] hover:text-[#8A8A9A]"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-4 space-y-2 max-h-80 overflow-y-auto">
          {criteria.map((c) => (
            <div key={c.id}>
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{
                  background: "#202024",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                {editingId === c.id ? (
                  <input
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") submitRename(c.id)
                    }}
                    className="flex-1 text-sm bg-transparent focus:outline-none text-[#F0F0F5]"
                  />
                ) : (
                  <span className="flex-1 text-sm text-[#F0F0F5] truncate">
                    {c.nome}
                  </span>
                )}
                {editingId === c.id ? (
                  <>
                    <button
                      onClick={() => submitRename(c.id)}
                      disabled={busy}
                      className="text-[#00C853] hover:opacity-80 disabled:opacity-50"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-[#555566] hover:text-[#8A8A9A]"
                    >
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setEditingId(c.id)
                        setEditValue(c.nome)
                        setError("")
                      }}
                      className="text-[#555566] hover:text-[#7D1AD7]"
                      aria-label={`Renomear ${c.nome}`}
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => setDeleteId(c.id)}
                      className="text-[#555566] hover:text-[#FF5252]"
                      aria-label={`Apagar ${c.nome}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </>
                )}
              </div>
              {deleteId === c.id && (
                <div
                  className="mt-1 px-3 py-2.5 rounded-xl flex items-center justify-between gap-3"
                  style={{
                    background: "rgba(255,82,82,0.15)",
                    border: "1px solid #FF5252",
                  }}
                >
                  <p className="text-xs text-[#FF5252] flex-1">
                    Apagar <strong>{c.nome}</strong>? As notas dadas nele se
                    perdem.
                  </p>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => confirmDelete(c.id)}
                      disabled={busy}
                      className="text-xs px-2.5 py-1 rounded-lg font-medium text-white bg-[#FF5252] hover:bg-[#E64545] disabled:opacity-50"
                    >
                      Apagar
                    </button>
                    <button
                      onClick={() => setDeleteId(null)}
                      className="text-xs px-2.5 py-1 rounded-lg font-medium text-[#8A8A9A] hover:bg-[rgba(255,255,255,0.08)]"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {criteria.length === 0 && (
            <p className="text-xs text-[#555566] text-center py-2">
              Nenhum critério ainda.
            </p>
          )}
        </div>
        <div
          className="px-6 pb-6 pt-2"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          {error && (
            <p className="text-xs text-[#FF5252] rounded-lg px-3 py-2 mt-3">
              {error}
            </p>
          )}
          <div className="flex gap-2 mt-3">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitCreate()
              }}
              placeholder="Novo critério…"
              className="flex-1 text-sm px-3 py-2 rounded-xl border border-[rgba(255,255,255,0.1)] focus:outline-none focus:border-[#7D1AD7]"
            />
            <button
              onClick={submitCreate}
              disabled={busy}
              className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl font-medium text-white btn-glow disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #7D1AD7, #50E678)",
              }}
            >
              <Plus size={14} /> Adicionar
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export function EngagementView({ columns }: { columns: KanbanColumn[] }) {
  const period = new Date().toISOString().slice(0, 7)
  const [data, setData] = useState<EngagementRow[]>([])
  const [criteria, setCriteria] = useState<EngagementCriterion[]>([])
  const [editMode, setEditMode] = useState(false)
  const [criteriaModalOpen, setCriteriaModalOpen] = useState(false)
  const [attendanceEvents, setAttendanceEvents] = useState<AttendanceEvent[]>(
    [],
  )
  const [attendanceDrafts, setAttendanceDrafts] =
    useState<Record<string, Record<string, AttendanceStatus | null>>>({})
  const [savingAttendance, setSavingAttendance] = useState<string | null>(null)
  const [attendanceError, setAttendanceError] = useState("")
  const [expandedMember, setExpandedMember] = useState<number | string | null>(
    null,
  )
  const [notes, setNotes] = useState<Record<string, MemberNotes>>({})
  async function loadEngagement() {
    const [result, attendanceResult] = await Promise.all([
      api.engagement.get(period),
      api.engagement.attendance(period),
    ])
    setCriteria(result.criterios)
    setAttendanceEvents(attendanceResult.eventos)
    setAttendanceDrafts(
      Object.fromEntries(
        attendanceResult.eventos.map((event: AttendanceEvent) => [
          event.id,
          Object.fromEntries(
            event.participantes.map((participant) => [
              participant.userId,
              participant.status,
            ]),
          ),
        ]),
      ),
    )
    const nextNotes: Record<string, MemberNotes> = {}
    const rows = result.membros.map((member: any, index: number) => {
      let observation: MemberNotes = { feedbacks: "", alertas: "", outros: "" }
      if (member.observacoes) {
        try {
          observation = { ...observation, ...JSON.parse(member.observacoes) }
        } catch {
          observation.feedbacks = member.observacoes
        }
      }
      nextNotes[member.userId] = observation
      const scores: Record<string, number> = {}
      for (const c of result.criterios) scores[c.id] = member.scores[c.id] ?? 0
      return {
        memberId: member.userId,
        name: member.nome,
        role: member.cargo ?? "Analista",
        initials: member.nome
          .split(/\s+/)
          .slice(0, 2)
          .map((part: string) => part[0])
          .join("")
          .toUpperCase(),
        color: ["#507AE6", "#50E678", "#E1306C", "#FFB300", "#7D1AD7"][
          index % 5
        ],
        scores,
        quality: member.qualidade ?? 0,
        presence: member.presenca ?? 0,
        punctuality: member.pontualidade ?? 0,
        registeredEvents: member.eventosRegistrados,
        attendances: member.comparecimentos,
        tasksCompleted: member.tasksConcluidas,
        tasksTotal: member.tasksTotal,
      }
    })
    setData(rows)
    setNotes(nextNotes)
  }

  useEffect(() => {
    loadEngagement().catch(console.error)
    const refresh = window.setInterval(
      () => loadEngagement().catch(console.error),
      60_000,
    )
    return () => window.clearInterval(refresh)
  }, [])

  async function createCriterion(nome: string) {
    await api.engagement.createCriterion(nome)
    await loadEngagement()
  }
  async function renameCriterion(id: string, nome: string) {
    await api.engagement.updateCriterion(id, nome)
    await loadEngagement()
  }
  async function deleteCriterion(id: string) {
    await api.engagement.removeCriterion(id)
    await loadEngagement()
  }

  function setAttendance(
    eventId: string,
    userId: string,
    status: AttendanceStatus,
  ) {
    setAttendanceDrafts((current) => ({
      ...current,
      [eventId]: { ...current[eventId], [userId]: status },
    }))
  }

  async function saveEventAttendance(event: AttendanceEvent) {
    const draft = attendanceDrafts[event.id] ?? {}
    if (event.participantes.some((participant) => !draft[participant.userId])) {
      setAttendanceError("Marque todos os membros antes de salvar.")
      return
    }
    setSavingAttendance(event.id)
    setAttendanceError("")
    try {
      await api.engagement.saveAttendance(
        event.id,
        event.participantes.map((participant) => ({
          userId: participant.userId,
          status: draft[participant.userId],
        })),
      )
      await loadEngagement()
    } catch (cause) {
      setAttendanceError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível salvar a presença.",
      )
    } finally {
      setSavingAttendance(null)
    }
  }

  async function toggleEditMode() {
    if (editMode) {
      // Um campo deixado vazio (rascunho pendente sem valor válido) conta como 0 ao salvar, em vez de
      // reverter para o valor anterior — o rascunho nunca chegou a ser comprometido em `data`.
      const draftAsZero = (
        memberId: number | string,
        criterionId: string,
        committed: number,
      ) => {
        const key = scoreDraftKey(memberId, criterionId)
        if (!(key in scoreDrafts)) return committed
        const raw = scoreDrafts[key]
        return raw === "" || raw === "-" || Number.isNaN(parseFloat(raw))
          ? 0
          : committed
      }
      const resolved = data.map((row) => ({
        ...row,
        scores: Object.fromEntries(
          criteria.map((c) => [
            c.id,
            draftAsZero(row.memberId, c.id, row.scores[c.id] ?? 0),
          ]),
        ),
      }))
      setData(resolved)
      setScoreDrafts({})
      await Promise.all(
        resolved.map((row) =>
          api.engagement.update(row.memberId, period, {
            scores: criteria.map((c) => ({
              criterionId: c.id,
              valor: row.scores[c.id] ?? 0,
            })),
            observacoes: JSON.stringify(notes[String(row.memberId)] ?? {}),
          }),
        ),
      )
      await loadEngagement()
    }
    setEditMode((value) => !value)
  }

  function calcQuality(memberId: number | string): number | null {
    const rated: number[] = []
    columns.forEach((col) =>
      col.tasks.forEach((task) => {
        const a = task.assignees.find((x) => x.memberId === memberId)
        if (a && a.note !== null) rated.push(a.note)
      }),
    )
    if (rated.length === 0) return null
    return parseFloat(
      (rated.reduce((s, v) => s + v, 0) / rated.length).toFixed(2),
    )
  }

  function effectiveQuality(memberId: number | string): number {
    return (
      data.find((r) => r.memberId === memberId)?.quality ??
      calcQuality(memberId) ??
      0
    )
  }

  function updateScore(
    memberId: number | string,
    criterionId: string,
    value: string,
  ) {
    const num = Math.max(0, Math.min(5, parseFloat(value) || 0))
    setData((prev) =>
      prev.map((r) =>
        r.memberId !== memberId
          ? r
          : { ...r, scores: { ...r.scores, [criterionId]: num } },
      ),
    )
  }

  // Rascunho de texto separado do valor numérico comprometido: permite apagar o campo inteiro (ficar
  // vazio) sem que parseFloat('') vire 0 e "prenda" o campo mostrando 0 enquanto o usuário ainda digita.
  const [scoreDrafts, setScoreDrafts] = useState<Record<string, string>>({})
  function scoreDraftKey(memberId: number | string, criterionId: string) {
    return `${memberId}:${criterionId}`
  }
  function scoreDraftValue(
    memberId: number | string,
    criterionId: string,
    committed: number,
  ) {
    const key = scoreDraftKey(memberId, criterionId)
    return key in scoreDrafts ? scoreDrafts[key] : String(committed)
  }
  function onScoreChange(
    memberId: number | string,
    criterionId: string,
    raw: string,
  ) {
    const key = scoreDraftKey(memberId, criterionId)
    setScoreDrafts((prev) => ({ ...prev, [key]: raw }))
    if (raw === "" || raw === "-") return
    if (!Number.isNaN(parseFloat(raw))) updateScore(memberId, criterionId, raw)
  }
  function onScoreBlur(memberId: number | string, criterionId: string) {
    const key = scoreDraftKey(memberId, criterionId)
    const raw = scoreDrafts[key]
    // Clicar no botão "Salvar" tira o foco do campo (blur) antes do clique em si ser processado — se o
    // rascunho ficar vazio/inválido aqui sem ser resolvido, o botão Salvar nunca chega a ver que o campo
    // estava vazio e reenvia o valor antigo. Por isso resolve para 0 aqui, não só no clique de salvar.
    if (
      raw !== undefined &&
      (raw === "" || raw === "-" || Number.isNaN(parseFloat(raw)))
    )
      updateScore(memberId, criterionId, "0")
    setScoreDrafts((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  function updateNote(
    memberId: number | string,
    cat: NoteCategory,
    value: string,
  ) {
    const key = String(memberId)
    setNotes((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] ?? { feedbacks: "", alertas: "", outros: "" }),
        [cat]: value,
      },
    }))
  }

  const avgQuality = (
    data.length
      ? data.reduce((a, r) => a + effectiveQuality(r.memberId), 0) / data.length
      : 0
  ).toFixed(1)
  const avgPresence = (
    data.length ? data.reduce((a, r) => a + r.presence, 0) / data.length : 0
  ).toFixed(1)
  const avgPunctuality = (
    data.length ? data.reduce((a, r) => a + r.punctuality, 0) / data.length : 0
  ).toFixed(1)
  const avgFor = (criterionId: string) =>
    (data.length
      ? data.reduce((a, r) => a + (r.scores[criterionId] ?? 0), 0) / data.length
      : 0
    ).toFixed(1)

  const NOTE_CATS: {
    key: NoteCategory
    label: string
    color: string
    bg: string
  }[] = [
    {
      key: "feedbacks",
      label: "Feedbacks",
      color: "#507AE6",
      bg: "rgba(125,26,215,0.08)",
    },
    {
      key: "alertas",
      label: "Alertas",
      color: "#FFB300",
      bg: "rgba(255,179,0,0.15)",
    },
    {
      key: "outros",
      label: "Outros",
      color: "#555566",
      bg: "rgba(255,255,255,0.08)",
    },
  ]

  return (
    <div className="h-full overflow-auto p-5">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold text-[#F0F0F5] flex items-center gap-2">
              <Users size={18} className="text-[#7D1AD7]" /> Engajamento do Time
            </h2>
            <p className="text-sm text-[#8A8A9A] mt-0.5">
              Visível apenas para a Gerente ·{" "}
              {new Date(`${period}-02`).toLocaleDateString("pt-BR", {
                month: "long",
                year: "numeric",
              })}{" "}
              · Escala 0–5
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCriteriaModalOpen(true)}
              className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl transition-all hover:border-[rgba(255,255,255,0.2)]"
              style={{
                background: "rgba(255,255,255,0.04)",
                color: "#8A8A9A",
                border: "1.5px solid rgba(255,255,255,0.1)",
              }}
            >
              <Settings size={15} /> Critérios
            </button>
            <button
              onClick={toggleEditMode}
              className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl transition-all"
              style={
                editMode
                  ? {
                      background: "#00C853",
                      color: "#fff",
                      border: "1.5px solid transparent",
                    }
                  : {
                      background: "rgba(125,26,215,0.08)",
                      color: "#507AE6",
                      border: "1.5px solid rgba(125,26,215,0.2)",
                    }
              }
            >
              {editMode ? (
                <>
                  <Check size={15} /> Salvar
                </>
              ) : (
                <>
                  <Edit2 size={15} /> Editar
                </>
              )}
            </button>
          </div>
        </div>

        {attendanceEvents.some((event) => event.pendente) && (
          <div
            className="mb-5 rounded-2xl px-5 py-4 flex items-center gap-3"
            style={{
              background: "rgba(255,179,0,0.12)",
              border: "1px solid rgba(255,179,0,0.35)",
            }}
          >
            <Clock size={20} className="text-[#FFB300]" />
            <div>
              <p className="text-sm font-semibold text-[#F0F0F5]">
                Registro de presença pendente
              </p>
              <p className="text-xs text-[#B9B9C5]">
                {attendanceEvents.filter((event) => event.pendente).length}{" "}
                evento(s) encerrado(s) aguardando confirmação.
              </p>
            </div>
          </div>
        )}

        {attendanceEvents.length > 0 && (
          <section
            className="mb-6 rounded-2xl p-5 bg-[#17171A]"
            style={{ border: "1.5px solid rgba(255,255,255,0.1)" }}
          >
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-[#F0F0F5]">
                Presença após eventos
              </h3>
              <p className="text-xs text-[#8A8A9A] mt-1">
                Disponível somente para a gerente. Os registros continuam
                editáveis após salvar.
              </p>
            </div>
            <div className="space-y-3">
              {attendanceEvents.map((event) => (
                <div
                  key={event.id}
                  className="rounded-xl p-4 bg-[#202024]"
                  style={{
                    border: event.pendente
                      ? "1px solid rgba(255,179,0,.35)"
                      : "1px solid rgba(255,255,255,.08)",
                  }}
                >
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                      <p className="text-sm font-medium text-[#F0F0F5]">
                        {event.titulo}
                      </p>
                      <p className="text-xs text-[#8A8A9A]">
                        {new Date(event.data).toLocaleDateString("pt-BR", {
                          timeZone: "UTC",
                        })}{" "}
                        · {event.horario}
                        {event.horarioFim ? `–${event.horarioFim}` : ""}
                      </p>
                    </div>
                    {event.pendente && (
                      <span className="text-[10px] font-semibold px-2 py-1 rounded-full text-[#FFB300] bg-[rgba(255,179,0,.12)]">
                        Pendente
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {event.participantes.map((participant) => {
                      const selected =
                        attendanceDrafts[event.id]?.[participant.userId]
                      return (
                        <div
                          key={participant.userId}
                          className="flex items-center justify-between gap-3"
                        >
                          <span className="text-xs text-[#D5D5DE]">
                            {participant.nome}
                          </span>
                          <div className="flex gap-1.5">
                            {([
                              {
                                status: "PRESENTE",
                                label: "Presente",
                                icon: <Check size={14} />,
                                color: "#00C853",
                              },
                              {
                                status: "AUSENTE",
                                label: "Ausente",
                                icon: <X size={14} />,
                                color: "#FF5252",
                              },
                              {
                                status: "ATRASADO",
                                label: "Atrasado",
                                icon: <Clock size={14} />,
                                color: "#FFB300",
                              },
                            ] as const).map((option) => (
                              <button
                                key={option.status}
                                onClick={() =>
                                  setAttendance(
                                    event.id,
                                    participant.userId,
                                    option.status,
                                  )
                                }
                                aria-label={`${option.label}: ${participant.nome}`}
                                title={option.label}
                                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                                style={{
                                  color: option.color,
                                  background:
                                    selected === option.status
                                      ? `${option.color}26`
                                      : "rgba(255,255,255,.04)",
                                  border: `1px solid ${
                                    selected === option.status
                                      ? option.color
                                      : "rgba(255,255,255,.08)"
                                  }`,
                                }}
                              >
                                {option.icon}
                              </button>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex justify-end mt-3">
                    <button
                      onClick={() => saveEventAttendance(event)}
                      disabled={
                        savingAttendance === event.id ||
                        event.participantes.length === 0
                      }
                      className="text-xs font-semibold px-3 py-2 rounded-lg text-white bg-[#7D1AD7] disabled:opacity-50"
                    >
                      {savingAttendance === event.id
                        ? "Salvando…"
                        : event.pendente
                          ? "Confirmar registro"
                          : "Salvar edição"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {attendanceError && (
              <p className="text-xs text-[#FF5252] mt-3" role="alert">
                {attendanceError}
              </p>
            )}
          </section>
        )}

        <div
          className="grid gap-4 mb-6"
          style={{
            gridTemplateColumns: `repeat(${criteria.length + 3}, minmax(0, 1fr))`,
          }}
        >
          <div
            className="kpi-card bg-[#17171A] rounded-xl p-4"
            style={{ border: "1.5px solid rgba(255,255,255,0.1)" }}
          >
            <div className="text-2xl font-bold mb-1 text-[#00C853]">
              {avgPresence}
              <span className="text-sm font-normal text-[#555566]">/5</span>
            </div>
            <div className="text-xs text-[#8A8A9A]">Média Presença</div>
          </div>
          <div
            className="kpi-card bg-[#17171A] rounded-xl p-4"
            style={{ border: "1.5px solid rgba(255,255,255,0.1)" }}
          >
            <div className="text-2xl font-bold mb-1 text-[#FFB300]">
              {avgPunctuality}
              <span className="text-sm font-normal text-[#555566]">/5</span>
            </div>
            <div className="text-xs text-[#8A8A9A]">Média Pontualidade</div>
          </div>
          {criteria.map((c, i) => (
            <div
              key={c.id}
              className="kpi-card bg-[#17171A] rounded-xl p-4"
              style={{ border: "1.5px solid rgba(255,255,255,0.1)" }}
            >
              <div
                className="text-2xl font-bold mb-1"
                style={{ color: CRITERION_COLORS[i % CRITERION_COLORS.length] }}
              >
                {avgFor(c.id)}
                <span className="text-sm font-normal text-[#555566]">/5</span>
              </div>
              <div className="text-xs text-[#8A8A9A]">Média {c.nome}</div>
            </div>
          ))}
          <div
            className="kpi-card bg-[#17171A] rounded-xl p-4"
            style={{ border: "1.5px solid rgba(255,255,255,0.1)" }}
          >
            <div
              className="text-2xl font-bold mb-1"
              style={{ color: "#00C853" }}
            >
              {avgQuality}
              <span className="text-sm font-normal text-[#555566]">/5</span>
            </div>
            <div className="text-xs text-[#8A8A9A]">Média Qualidade</div>
          </div>
        </div>

        <div className="space-y-3">
          {data.map((row) => {
            const member = row
            const isExpanded = expandedMember === row.memberId
            const memberNotes = notes[String(row.memberId)] ?? {
              feedbacks: "",
              alertas: "",
              outros: "",
            }
            const hasNotes =
              memberNotes.feedbacks || memberNotes.alertas || memberNotes.outros

            return (
              <div
                key={row.memberId}
                className="bg-[#17171A] rounded-2xl overflow-hidden"
                style={{ border: "1.5px solid rgba(255,255,255,0.1)" }}
              >
                {/* Main row */}
                <div className="px-5 py-4">
                  <div className="flex items-center gap-4">
                    {/* Avatar + name */}
                    <div className="flex items-center gap-2.5 w-44 flex-shrink-0">
                      <div
                        className="flex items-center justify-center rounded-full text-white font-bold text-xs flex-shrink-0"
                        style={{
                          width: 32,
                          height: 32,
                          background: member.color,
                        }}
                      >
                        {member.initials}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-[#F0F0F5]">
                          {member.name}
                        </div>
                        <div className="text-xs text-[#555566]">
                          {member.role}
                        </div>
                      </div>
                    </div>

                    {/* Scores */}
                    <div className="flex items-center gap-6 flex-1 flex-wrap">
                      <div className="min-w-0">
                        <div className="text-xs text-[#555566] mb-1">
                          Presença
                        </div>
                        <StarScore
                          editMode={false}
                          isQuality={false}
                          val={row.presence}
                          autoVal={null}
                          color="#00C853"
                          draftValue=""
                          onChange={() => undefined}
                          onBlur={() => undefined}
                        />
                        <div className="text-[10px] text-[#555566]">
                          {row.attendances}/{row.registeredEvents} eventos
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs text-[#555566] mb-1">
                          Pontualidade
                        </div>
                        <StarScore
                          editMode={false}
                          isQuality={false}
                          val={row.punctuality}
                          autoVal={null}
                          color="#FFB300"
                          draftValue=""
                          onChange={() => undefined}
                          onBlur={() => undefined}
                        />
                      </div>
                      {criteria.map((c, i) => (
                        <div key={c.id} className="min-w-0">
                          <div className="text-xs text-[#555566] mb-1">
                            {c.nome}
                          </div>
                          <StarScore
                            editMode={editMode}
                            isQuality={false}
                            val={row.scores[c.id] ?? 0}
                            autoVal={null}
                            color={
                              CRITERION_COLORS[i % CRITERION_COLORS.length]
                            }
                            draftValue={scoreDraftValue(
                              row.memberId,
                              c.id,
                              row.scores[c.id] ?? 0,
                            )}
                            onChange={(raw) =>
                              onScoreChange(row.memberId, c.id, raw)
                            }
                            onBlur={() => onScoreBlur(row.memberId, c.id)}
                          />
                        </div>
                      ))}
                      <div className="min-w-0">
                        <div className="text-xs text-[#555566] mb-1">
                          Qualidade
                        </div>
                        <StarScore
                          editMode={editMode}
                          isQuality={true}
                          val={effectiveQuality(row.memberId)}
                          autoVal={calcQuality(row.memberId)}
                          color="#00C853"
                          draftValue=""
                          onChange={() => undefined}
                          onBlur={() => undefined}
                        />
                      </div>
                    </div>

                    {/* Tasks */}
                    <div className="flex-shrink-0 w-36">
                      <div className="text-xs text-[#555566] mb-1">Tasks</div>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-1.5 w-20 rounded-full overflow-hidden"
                          style={{ background: "rgba(255,255,255,0.06)" }}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${
                                row.tasksTotal
                                  ? (row.tasksCompleted / row.tasksTotal) * 100
                                  : 0
                              }%`,
                              background: "#7D1AD7",
                            }}
                          />
                        </div>
                        <span className="text-xs" style={{ color: "#8A8A9A" }}>
                          {row.tasksCompleted}/{row.tasksTotal}
                        </span>
                      </div>
                    </div>

                    {/* Expand button */}
                    <button
                      onClick={() =>
                        setExpandedMember(isExpanded ? null : row.memberId)
                      }
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium flex-shrink-0 transition-all"
                      style={
                        isExpanded
                          ? {
                              background: "rgba(125,26,215,0.08)",
                              color: "#507AE6",
                            }
                          : { background: "#202024", color: "#8A8A9A" }
                      }
                    >
                      <Edit2 size={11} />
                      Obs.
                      {hasNotes && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#7D1AD7] ml-0.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expandable observations panel */}
                {isExpanded && (
                  <div
                    className="px-5 pb-5 pt-1"
                    style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <p className="text-xs font-semibold text-[#8A8A9A] uppercase tracking-wide mb-3">
                      Observações do gerente
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      {NOTE_CATS.map((cat) => (
                        <div key={cat.key}>
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <span
                              className="text-xs font-semibold px-2 py-0.5 rounded-full"
                              style={{ background: cat.bg, color: cat.color }}
                            >
                              {cat.label}
                            </span>
                          </div>
                          <textarea
                            value={memberNotes[cat.key]}
                            onChange={(e) =>
                              updateNote(row.memberId, cat.key, e.target.value)
                            }
                            placeholder={`${cat.label} sobre ${member.name.split(" ")[0]}…`}
                            rows={4}
                            className="w-full text-xs px-3 py-2 rounded-xl border resize-none focus:outline-none transition-colors"
                            style={{
                              border: `1.5px solid ${
                                memberNotes[cat.key]
                                  ? cat.color + "50"
                                  : "rgba(255,255,255,0.1)"
                              }`,
                              background: memberNotes[cat.key]
                                ? cat.bg
                                : "#202024",
                              color: "#F0F0F5",
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
      {criteriaModalOpen && (
        <CriteriaManagerModal
          criteria={criteria}
          onClose={() => setCriteriaModalOpen(false)}
          onCreate={createCriterion}
          onRename={renameCriterion}
          onDelete={deleteCriterion}
        />
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────
