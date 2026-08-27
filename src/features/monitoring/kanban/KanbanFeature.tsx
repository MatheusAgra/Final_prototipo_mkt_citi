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
import { AvatarStack, AttendanceSummary, CH, ChannelBadge, ChannelFilter, DIFF, DIFFICULTY_FROM_API, DIFFICULTY_TO_API, FormField, Inp, mapCampaign, mapColumn, mapEvent, mapTask, Modal, TaskMember, TIPO_FROM_API, TIPO_TO_API, Tab, CHANNEL_TO_API } from "../components/shared"
function TaskModal({
  initial,
  colId,
  isManager,
  members,
  onMembersLoaded,
  onSave,
  onClose,
}: {
  initial?: Task
  colId: string
  isManager: boolean
  members: TaskMember[]
  onMembersLoaded: (members: TaskMember[]) => void
  onSave: (
    colId: string,
    task: Omit<Task, "id"> & { id?: string },
  ) => Promise<void>
  onClose: () => void
}) {
  const [title, setTitle] = useState(initial?.title ?? "")
  const [channel, setChannel] = useState<ChannelType>(
    initial?.channel ?? "instagram",
  )
  const [difficulty, setDifficulty] = useState<Difficulty>(
    initial?.difficulty ?? "médio",
  )
  const [startDate, setStartDate] = useState(initial?.startDate ?? "")
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? "")
  const [assignees, setAssignees] = useState<TaskAssignee[]>(
    initial?.assignees ?? [],
  )
  const [availableMembers, setAvailableMembers] =
    useState<TaskMember[]>(members)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    api.kanban
      .assignees()
      .then((rawMembers) => {
        const mapped = rawMembers.map((member: any, index: number) => ({
          id: member.id,
          name: member.nomeCompleto,
          role: member.cargo ?? "Analista",
          initials: member.nomeCompleto
            .split(/\s+/)
            .slice(0, 2)
            .map((part: string) => part[0])
            .join("")
            .toUpperCase(),
          color: ["#507AE6", "#50E678", "#E1306C", "#FFB300", "#7D1AD7"][
            index % 5
          ],
        }))
        setAvailableMembers(mapped)
        onMembersLoaded(mapped)
      })
      .catch(() => setError("Não foi possível carregar as analistas."))
  }, [])

  function toggleMember(memberId: string) {
    setAssignees((prev) => {
      const exists = prev.find((a) => a.memberId === memberId)
      if (exists) return prev.filter((a) => a.memberId !== memberId)
      return [...prev, { memberId, note: null }]
    })
  }

  function setNote(memberId: string, val: string) {
    const num =
      val === "" ? null : Math.max(0, Math.min(5, parseFloat(val) || 0))
    setAssignees((prev) =>
      prev.map((a) => (a.memberId === memberId ? { ...a, note: num } : a)),
    )
  }

  async function save() {
    if (!title.trim()) return
    if (startDate && dueDate && dueDate < startDate) {
      setError("O prazo deve ser igual ou posterior à data de início.")
      return
    }
    setSaving(true)
    setError("")
    try {
      await onSave(colId, {
        title,
        channel,
        assignees,
        difficulty,
        startDate,
        dueDate,
        priority: "média",
        id: initial?.id,
      })
      onClose()
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível salvar a task.",
      )
      setSaving(false)
    }
  }

  const difficulties: Difficulty[] = ["fácil", "médio", "difícil"]
  const channels: ChannelType[] = ["instagram", "linkedin", "site", "email"]

  return (
    <Modal
      title={initial ? "Editar task" : "Nova task"}
      onClose={onClose}
      wide
      footer={
        <div
          className="px-6 py-4 flex gap-3"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <button
            onClick={save}
            disabled={saving}
            className="px-5 py-2 rounded-xl text-sm font-medium text-white hover:opacity-90 btn-glow disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #7D1AD7, #50E678)" }}
          >
            {saving
              ? "Salvando…"
              : initial
                ? "Salvar alterações"
                : "Criar task"}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-[#8A8A9A] hover:bg-[rgba(255,255,255,0.08)]"
          >
            Cancelar
          </button>
        </div>
      }
    >
      <div className="px-6 py-4 space-y-4">
        <FormField label="Título *">
          <Inp
            value={title}
            onChange={setTitle}
            placeholder="Ex: Carrossel — 5 dicas de produtividade"
          />
        </FormField>

        <FormField label="Rede social">
          <div className="flex gap-2 flex-wrap">
            {channels.map((ch) => (
              <button
                key={ch}
                onClick={() => setChannel(ch)}
                className="filter-pill text-xs px-3 py-1.5 rounded-full font-medium transition-all"
                style={
                  channel === ch
                    ? { background: CH[ch].dot, color: "#fff" }
                    : { background: CH[ch].bg, color: CH[ch].color }
                }
              >
                {CH[ch].label}
              </button>
            ))}
          </div>
        </FormField>

        <FormField
          label={
            isManager
              ? "Responsáveis e notas individuais (0–5)"
              : "Analistas responsáveis"
          }
        >
          <div className="space-y-2">
            {availableMembers.length === 0 && (
              <div className="text-sm text-[#8A8A9A] rounded-xl px-3 py-3 bg-[#202024]">
                Nenhuma analista ativa cadastrada. Use “Gerenciar usuários” para
                criar uma conta de Analista.
              </div>
            )}
            {availableMembers.map((m) => {
              const a = assignees.find((x) => x.memberId === m.id)
              const selected = !!a
              return (
                <div
                  key={m.id}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all"
                  style={{
                    background: selected ? "rgba(125,26,215,0.08)" : "#202024",
                    border: `1.5px solid ${
                      selected ? "#7D1AD7" : "rgba(255,255,255,0.1)"
                    }`,
                  }}
                >
                  <button
                    onClick={() => toggleMember(m.id)}
                    className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
                  >
                    <div
                      className="flex items-center justify-center rounded-full text-white font-bold flex-shrink-0"
                      style={{
                        width: 28,
                        height: 28,
                        background: m.color,
                        fontSize: 10,
                      }}
                    >
                      {m.initials}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[#F0F0F5]">
                        {m.name}
                      </div>
                      <div className="text-xs text-[#555566]">{m.role}</div>
                    </div>
                  </button>
                  {selected ? (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isManager && (
                        <>
                          <label className="text-xs text-[#8A8A9A] whitespace-nowrap">
                            Nota:
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={5}
                            step={0.1}
                            value={initial ? (a!.note ?? "") : ""}
                            placeholder="—"
                            disabled={!initial}
                            onChange={(e) =>
                              initial && setNote(m.id, e.target.value)
                            }
                            onClick={(e) => e.stopPropagation()}
                            title={
                              initial
                                ? "Avaliar execução da task"
                                : "A nota fica disponível após criar a task"
                            }
                            className="w-16 text-xs px-2 py-1 rounded-lg border border-[rgba(125,26,215,0.2)] focus:outline-none focus:border-[#7D1AD7] text-center bg-[#17171A] disabled:opacity-50"
                          />
                          <span className="text-xs text-[#555566]">/5</span>
                        </>
                      )}
                      <button
                        onClick={() => toggleMember(m.id)}
                        className="text-[#555566] hover:text-[#FF5252] ml-1"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-[#555566] flex-shrink-0">
                      clique para atribuir
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </FormField>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField label="Nível de dificuldade">
            <div className="flex gap-2">
              {difficulties.map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className="flex-1 text-xs py-2 rounded-lg font-medium capitalize transition-all"
                  style={
                    difficulty === d
                      ? { background: DIFF[d].color, color: "#fff" }
                      : { background: DIFF[d].bg, color: DIFF[d].color }
                  }
                >
                  {DIFF[d].label}
                </button>
              ))}
            </div>
          </FormField>
          <FormField label="Data de início">
            <Inp type="date" value={startDate} onChange={setStartDate} />
          </FormField>
          <FormField label="Prazo">
            <Inp type="date" value={dueDate} onChange={setDueDate} />
          </FormField>
        </div>
        {error && (
          <p className="text-xs text-[#FF6B6B]" role="alert">
            {error}
          </p>
        )}
      </div>
    </Modal>
  )
}

// ─── Kanban ───────────────────────────────────────────────────────────────

export function KanbanBoard({
  channel,
  setChannel,
  isManager,
  members,
  setMembers,
  columns,
  setColumns,
}: {
  channel: Channel
  setChannel: (c: Channel) => void
  isManager: boolean
  members: TaskMember[]
  setMembers: React.Dispatch<React.SetStateAction<TaskMember[]>>
  columns: KanbanColumn[]
  setColumns: React.Dispatch<React.SetStateAction<KanbanColumn[]>>
}) {
  const [dragging, setDragging] = useState<{
    taskId: string
    fromColId: string
  } | null>(null)
  const [dragOverColId, setDragOverColId] = useState<string | null>(null)
  const [editingColId, setEditingColId] = useState<string | null>(null)
  const [editingColName, setEditingColName] = useState("")
  const [taskModal, setTaskModal] = useState<{
    colId: string
    task?: Task
  } | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: "task" | "col"
    id: string
    colId?: string
  } | null>(null)

  async function handleDrop(toColId: string) {
    if (!dragging) return
    const { taskId, fromColId } = dragging
    if (fromColId === toColId) {
      setDragging(null)
      return
    }
    const targetOrder =
      columns.find((column) => column.id === toColId)?.tasks.length ?? 0
    try {
      await api.kanban.moveTask(taskId, {
        colunaId: toColId,
        ordem: targetOrder,
      })
    } catch {
      setDragging(null)
      setDragOverColId(null)
      return
    }
    setColumns((prev) => {
      const task = prev
        .find((c) => c.id === fromColId)
        ?.tasks.find((t) => t.id === taskId)
      if (!task) return prev
      return prev.map((col) => {
        if (col.id === fromColId)
          return { ...col, tasks: col.tasks.filter((t) => t.id !== taskId) }
        if (col.id === toColId) return { ...col, tasks: [...col.tasks, task] }
        return col
      })
    })
    setDragging(null)
    setDragOverColId(null)
  }

  async function commitRename() {
    if (editingColId && editingColName.trim()) {
      await api.kanban
        .updateColumn(editingColId, { nome: editingColName.trim() })
        .catch(() => undefined)
      setColumns((prev) =>
        prev.map((c) =>
          c.id === editingColId ? { ...c, name: editingColName.trim() } : c,
        ),
      )
    }
    setEditingColId(null)
  }

  async function saveTask(
    colId: string,
    data: Omit<Task, "id"> & { id?: string },
  ) {
    const payload = {
      titulo: data.title,
      redeSocial: CHANNEL_TO_API[data.channel],
      dificuldade: DIFFICULTY_TO_API[data.difficulty],
      dataInicio: data.startDate || null,
      dataEntrega: data.dueDate || null,
      colunaId: colId,
      responsaveis: data.assignees.map((assignment) => ({
        userId: String(assignment.memberId),
        nota: assignment.note,
      })),
    }
    const saved = data.id
      ? await api.kanban.updateTask(data.id, payload)
      : await api.kanban.createTask(payload)
    const mapped = mapTask(saved)
    setColumns((prev) =>
      prev.map((col) => {
        if (col.id !== colId)
          return data.id
            ? { ...col, tasks: col.tasks.filter((task) => task.id !== data.id) }
            : col
        if (data.id)
          return {
            ...col,
            tasks: col.tasks.map((task) =>
              task.id === data.id ? mapped : task,
            ),
          }
        return { ...col, tasks: [...col.tasks, mapped] }
      }),
    )
  }

  async function deleteTask(taskId: string) {
    await api.kanban.removeTask(taskId)
    setColumns((prev) =>
      prev.map((col) => ({
        ...col,
        tasks: col.tasks.filter((t) => t.id !== taskId),
      })),
    )
    setDeleteConfirm(null)
  }

  async function deleteColumn(colId: string) {
    await api.kanban.removeColumn(colId)
    setColumns((prev) => prev.filter((c) => c.id !== colId))
    setDeleteConfirm(null)
  }

  async function addColumn() {
    const created = await api.kanban.createColumn({ nome: "Nova Coluna" })
    setColumns((prev) => [...prev, mapColumn({ ...created, tasks: [] })])
  }

  const filterTasks = (tasks: Task[]) =>
    channel === "todos" ? tasks : tasks.filter((t) => t.channel === channel)
  const colColors = [
    "#7D1AD7",
    "#0A66C2",
    "#FFB300",
    "#00C853",
    "#40C4FF",
    "#E1306C",
    "#507AE6",
  ]

  return (
    <>
      <div className="h-full overflow-x-auto">
        <div className="flex items-center gap-2 px-5 pt-4">
          <ChannelFilter channel={channel} setChannel={setChannel} />
        </div>
        <div className="flex gap-4 h-full p-5 items-start min-w-max">
          {columns.map((col, ci) => {
            const tasks = filterTasks(col.tasks)
            const isOver = dragOverColId === col.id
            return (
              <div
                key={col.id}
                data-empty={tasks.length === 0 ? "true" : "false"}
                className="kanban-column flex flex-col rounded-xl flex-shrink-0 transition-all"
                style={{
                  width: 276,
                  background: isOver ? "rgba(125,26,215,0.08)" : "#202024",
                  border: `1.5px solid ${
                    isOver ? "#7D1AD7" : "rgba(255,255,255,0.1)"
                  }`,
                  minHeight: 400,
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOverColId(col.id)
                }}
                onDrop={() => handleDrop(col.id)}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node))
                    setDragOverColId(null)
                }}
              >
                {/* Header */}
                <div
                  className="flex items-center gap-2 px-4 py-3"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: colColors[ci % colColors.length] }}
                  />
                  {editingColId === col.id ? (
                    <input
                      value={editingColName}
                      onChange={(e) => setEditingColName(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRename()
                        if (e.key === "Escape") setEditingColId(null)
                      }}
                      className="flex-1 text-sm font-semibold text-[#F0F0F5] bg-[#17171A] border border-[rgba(125,26,215,0.3)] rounded px-2 py-0.5 focus:outline-none"
                      autoFocus
                    />
                  ) : (
                    <button
                      className="flex-1 text-sm font-semibold text-left text-[#F0F0F5] hover:text-[#F0F0F5] truncate"
                      onClick={() => {
                        setEditingColId(col.id)
                        setEditingColName(col.name)
                      }}
                    >
                      {col.name}
                    </button>
                  )}
                  <span
                    className="text-xs rounded-full px-2 py-0.5 flex-shrink-0"
                    style={{
                      background: colColors[ci % colColors.length] + "18",
                      color: colColors[ci % colColors.length],
                    }}
                  >
                    {tasks.length}
                  </span>
                  <button
                    onClick={() =>
                      setDeleteConfirm({ type: "col", id: col.id })
                    }
                    className="flex-shrink-0 text-[#555566] hover:text-[#FF5252] transition-colors ml-1"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* Tasks */}
                <div className="flex-1 p-3 space-y-2 overflow-y-auto">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() =>
                        setDragging({ taskId: task.id, fromColId: col.id })
                      }
                      className="bg-[#17171A] rounded-xl p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-all group"
                      style={{
                        border: "1.5px solid rgba(255,255,255,0.06)",
                        opacity: dragging?.taskId === task.id ? 0.4 : 1,
                        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                      }}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <ChannelBadge ch={task.channel} small />
                        <span
                          className="text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0"
                          style={{
                            background: DIFF[task.difficulty].bg,
                            color: DIFF[task.difficulty].color,
                          }}
                        >
                          {DIFF[task.difficulty].label}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-[#F0F0F5] leading-snug mb-3">
                        {task.title}
                      </p>
                      <div className="flex items-center justify-between">
                        <AvatarStack
                          assignees={task.assignees}
                          members={members}
                        />
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() =>
                              setTaskModal({ colId: col.id, task })
                            }
                            className="p-1 rounded hover:bg-[rgba(255,255,255,0.08)] text-[#555566] hover:text-[#7D1AD7]"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={() =>
                              setDeleteConfirm({ type: "task", id: task.id })
                            }
                            className="p-1 rounded hover:bg-[rgba(255,82,82,0.12)] text-[#555566] hover:text-[#FF5252]"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                        {task.dueDate && (
                          <span
                            className="text-xs"
                            style={{ color: "#555566" }}
                          >
                            {formatDateBR(task.dueDate)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {tasks.length === 0 && (
                    <div className="empty-state text-center py-6 text-[#8A8A9A] text-sm">
                      Solte aqui
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setTaskModal({ colId: col.id })}
                  className="flex items-center gap-1.5 text-xs text-[#555566] hover:text-[#7D1AD7] hover:bg-[rgba(125,26,215,0.08)] rounded-xl mx-3 mb-3 px-3 py-2.5 transition-colors font-medium border border-dashed border-[rgba(255,255,255,0.1)] hover:border-[rgba(125,26,215,0.3)]"
                >
                  <Plus size={13} /> Adicionar task
                </button>
              </div>
            )
          })}
          <button
            onClick={addColumn}
            className="flex-shrink-0 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-[#555566] hover:text-[#8A8A9A] transition-all"
            style={{
              border: "1.5px dashed #555566",
              background: "transparent",
              minWidth: 160,
            }}
          >
            <Plus size={16} /> Nova coluna
          </button>
        </div>
      </div>

      {/* Task modal */}
      {taskModal && (
        <TaskModal
          colId={taskModal.colId}
          initial={taskModal.task}
          isManager={isManager}
          members={members}
          onMembersLoaded={setMembers}
          onSave={saveTask}
          onClose={() => setTaskModal(null)}
        />
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            className="bg-[#17171A] rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-semibold text-[#F0F0F5] mb-1">
              Confirmar exclusão
            </p>
            <p className="text-sm text-[#8A8A9A] mb-4">
              {deleteConfirm.type === "col"
                ? "Apagar esta coluna e todas as tasks nela?"
                : "Apagar esta task permanentemente?"}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  deleteConfirm.type === "task"
                    ? deleteTask(deleteConfirm.id)
                    : deleteColumn(deleteConfirm.id)
                }
                className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-[#FF5252] hover:bg-[#E64545]"
              >
                Apagar
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-[#8A8A9A] hover:bg-[rgba(255,255,255,0.08)]"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Calendar ─────────────────────────────────────────────────────────────

type CalView = "week" | "month" | "year"
