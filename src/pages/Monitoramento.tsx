import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Plus, Calendar, Columns3, Users, Target, Edit2, Check, X, Settings,
  Clock, Flame, Trash2, BarChart2, ChevronLeft, ChevronRight,
} from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts'
import type { Profile, Channel } from '../App'
import type { KanbanColumn, Task, TaskAssignee, ChannelType, Campaign, CampaignStatus, CalendarEvent, CampaignMetricEntry } from '../data'
import { type Difficulty } from '../data'
import { api } from '../api'
import BrandMark from '../BrandMark'

interface TaskMember {
  id: string
  name: string
  role: string
  initials: string
  color: string
}

const CHANNEL_TO_API: Record<ChannelType, string> = { instagram: 'INSTAGRAM', linkedin: 'LINKEDIN', site: 'SITE', email: 'EMAIL' }
const DIFFICULTY_TO_API: Record<Difficulty, string> = { fácil: 'FACIL', médio: 'MEDIO', difícil: 'DIFICIL' }
const DIFFICULTY_FROM_API: Record<string, Difficulty> = { FACIL: 'fácil', MEDIO: 'médio', DIFICIL: 'difícil' }

function mapTask(task: any): Task {
  return {
    id: task.id,
    title: task.titulo,
    channel: task.redeSocial.toLowerCase() as ChannelType,
    assignees: (task.responsaveis ?? []).map((assignment: any) => ({ memberId: assignment.userId, note: assignment.nota ?? null })),
    priority: 'média',
    difficulty: DIFFICULTY_FROM_API[task.dificuldade] ?? 'médio',
    startDate: task.dataInicio?.slice(0, 10) ?? '',
    dueDate: task.dataEntrega?.slice(0, 10) ?? '',
  }
}

function mapColumn(column: any): KanbanColumn {
  return { id: column.id, name: column.nome, tasks: (column.tasks ?? []).map(mapTask) }
}

function mapCampaign(row: any): Campaign {
  return {
    id: row.id,
    name: row.nome,
    channels: (row.canais ?? []).map((c: string) => CHANNEL_FROM_API[c]),
    objective: row.objetivo,
    audience: row.publico,
    startDate: String(row.dataInicio).slice(0, 10),
    endDate: String(row.dataFim).slice(0, 10),
    reach: row.alcanceAtual,
    targetReach: row.alcanceMeta,
    interactions: row.interacoesAtual,
    targetInteractions: row.interacoesMeta,
    status: row.status.toLowerCase() as CampaignStatus,
    daysRunning: row.diasNoAr,
    dailyEntries: (row.metricasDiarias ?? []).map((m: any) => ({ id: m.id, date: String(m.data).slice(0, 10), reach: m.alcance, interactions: m.interacoes })),
  }
}

function timeRange(ev: CalendarEvent): string {
  return ev.endTime ? `${ev.time} - ${ev.endTime}` : ev.time
}

function AttendanceSummary({ event, compact=false }: { event: CalendarEvent; compact?: boolean }) {
  const eligible = event.attendees.filter((attendee) => attendee.attendanceEligible)
  const present = eligible.filter((attendee) => attendee.attendanceStatus === 'PRESENTE').length
  const absent = eligible.filter((attendee) => attendee.attendanceStatus === 'AUSENTE').length
  const late = eligible.filter((attendee) => attendee.attendanceStatus === 'ATRASADO').length
  if (!event.attendanceConfirmed) return null
  return (
    <div className={`flex items-center ${compact ? 'gap-1 mt-1' : 'gap-2 mt-2 flex-wrap'}`} aria-label="Registro de presença confirmado">
      <span className="inline-flex items-center gap-0.5 text-[#00C853]" title={`${present} presente(s)`}><Check size={compact ? 10 : 12} /><span className="text-[10px]">{present}</span></span>
      <span className="inline-flex items-center gap-0.5 text-[#FF5252]" title={`${absent} ausente(s)`}><X size={compact ? 10 : 12} /><span className="text-[10px]">{absent}</span></span>
      <span className="inline-flex items-center gap-0.5 text-[#FFB300]" title={`${late} atrasado(s)`}><Clock size={compact ? 10 : 12} /><span className="text-[10px]">{late}</span></span>
      {!compact && <span className="text-[10px] text-[#8A8A9A]">Presença confirmada</span>}
    </div>
  )
}

const TIPO_TO_API: Record<CalendarEvent['type'], string> = { meeting: 'REUNIAO', deadline: 'DEADLINE', task: 'TASK' }
const TIPO_FROM_API: Record<string, CalendarEvent['type']> = { REUNIAO: 'meeting', DEADLINE: 'deadline', TASK: 'task' }
const CHANNEL_FROM_API: Record<string, ChannelType> = { INSTAGRAM: 'instagram', LINKEDIN: 'linkedin', SITE: 'site', EMAIL: 'email' }

function mapEvent(ev: any): CalendarEvent {
  return {
    id: ev.id,
    date: String(ev.data).slice(0, 10),
    title: ev.titulo,
    time: ev.horario,
    endTime: ev.horarioFim ?? '',
    type: TIPO_FROM_API[ev.tipo] ?? 'meeting',
    channel: ev.canal ? CHANNEL_FROM_API[ev.canal] : null,
    local: ev.formatoLocal === 'MEET' ? 'meet' : ev.formatoLocal === 'PRESENCIAL' ? 'presencial' : '',
    sala: ev.sala ?? '',
    attendanceConfirmed: Boolean(ev.registroPresencaConfirmado),
    attendees: (ev.participantes ?? []).map((p: any) => ({ userId: p.userId, nome: p.nome, attendanceEligible: Boolean(p.avaliavelPresenca), attendanceStatus: p.statusPresenca ?? null })),
  }
}

// ─── Shared ────────────────────────────────────────────────────────────────

const CH: Record<ChannelType, { label: string; color: string; bg: string; dot: string }> = {
  instagram: { label: 'Instagram', color: '#E1306C', bg: 'rgba(225,48,108,0.15)', dot: '#E1306C' },
  linkedin: { label: 'LinkedIn', color: '#0A66C2', bg: 'rgba(10,102,194,0.15)', dot: '#0A66C2' },
  site: { label: 'Site', color: '#00C853', bg: 'rgba(0,200,83,0.15)', dot: '#00C853' },
  email: { label: 'Email', color: '#FFB300', bg: 'rgba(255,179,0,0.15)', dot: '#FFB300' },
}

const DIFF: Record<Difficulty, { label: string; bg: string; color: string }> = {
  fácil: { label: 'Fácil', bg: 'rgba(0,200,83,0.15)', color: '#00C853' },
  médio: { label: 'Médio', bg: 'rgba(255,179,0,0.15)', color: '#FFB300' },
  difícil: { label: 'Difícil', bg: 'rgba(255,82,82,0.15)', color: '#FF5252' },
}

function ChannelBadge({ ch, small }: { ch: ChannelType; small?: boolean }) {
  const c = CH[ch]
  return (
    <span className={`inline-flex items-center font-medium rounded-full ${small ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1'}`} style={{ background: c.bg, color: c.color }}>
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 flex-shrink-0" style={{ background: c.dot }} />
      {c.label}
    </span>
  )
}

// Card individual por filtro, em linha — mesma estética/espaçamento dos filtros de Materiais Ricos e Prompts
function ChannelFilter({ channel, setChannel }: { channel: Channel; setChannel: (c: Channel) => void }) {
  const opts: { id: Channel; label: string }[] = [
    { id: 'todos', label: 'Todos' }, { id: 'instagram', label: 'Instagram' },
    { id: 'linkedin', label: 'LinkedIn' }, { id: 'site', label: 'Site' }, { id: 'email', label: 'Email' },
  ]
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {opts.map((o) => {
        const active = channel === o.id
        const c = o.id !== 'todos' ? CH[o.id as ChannelType] : null
        return (
          <button key={o.id} onClick={() => setChannel(o.id)} className="text-xs px-3 py-1.5 rounded-full font-medium transition-all"
            style={active ? { background: c ? c.dot : '#7D1AD7', color: '#fff' } : { background: 'rgba(255,255,255,0.06)', color: '#8A8A9A' }}>
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function AvatarStack({ assignees, members }: { assignees: TaskAssignee[]; members: TaskMember[] }) {
  return (
    <div className="flex items-center">
      {assignees.slice(0, 4).map((a, i) => {
        const member = members.find((t) => t.id === String(a.memberId))
        if (!member) return null
        return (
          <div key={a.memberId} title={`${member.name}${a.note !== null ? ` — nota: ${a.note}` : ''}`}
            className="flex items-center justify-center rounded-full text-white font-bold ring-2 ring-[#17171A] flex-shrink-0"
            style={{ width: 22, height: 22, background: member.color, fontSize: 9, marginLeft: i > 0 ? -6 : 0 }}>
            {member.initials}
          </div>
        )
      })}
      {assignees.length > 4 && (
        <div className="flex items-center justify-center rounded-full ring-2 ring-[#17171A] flex-shrink-0 text-[#8A8A9A] font-bold"
          style={{ width: 22, height: 22, fontSize: 9, background: 'rgba(255,255,255,0.1)', marginLeft: -6 }}>
          +{assignees.length - 4}
        </div>
      )}
    </div>
  )
}

function Modal({ title, onClose, children, footer, wide }: { title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean }) {
  // Renderizado via portal direto no <body>: .module-stage usa overflow+backdrop-filter,
  // o que cria um containing block para position:fixed e corta o modal. O portal escapa disso.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className={`bg-[#17171A] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden ${wide ? 'w-full max-w-2xl' : 'w-full max-w-md'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 className="font-semibold text-[#F0F0F5]">{title}</h3>
          <button onClick={onClose} className="text-[#555566] hover:text-[#8A8A9A]"><X size={18} /></button>
        </div>
        {/* min-h-0: sem isso, o flex item cresce pra caber o conteúdo em vez de respeitar max-h-[90vh] e rolar internamente */}
        <div className="overflow-y-auto flex-1 min-h-0">{children}</div>
        {footer && <div className="flex-shrink-0">{footer}</div>}
      </div>
    </div>,
    document.body
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#8A8A9A] mb-1">{label}</label>
      {children}
    </div>
  )
}

function Inp({ value, onChange, placeholder, type = 'text' }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className="w-full text-sm px-3 py-2 rounded-lg border border-[rgba(255,255,255,0.1)] focus:outline-none focus:border-[#7D1AD7] focus:ring-2 focus:ring-[rgba(125,26,215,0.1)]" />
  )
}

type Tab = 'kanban' | 'calendario' | 'campanhas' | 'engajamento'

function TabNav({ tabs, active, setTab }: { tabs: { id: Tab; label: string; icon: React.ReactNode }[]; active: Tab; setTab: (t: Tab) => void }) {
  return (
    <div className="flex gap-1">
      {tabs.map((t) => (
        <button key={t.id} onClick={() => setTab(t.id)} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-all"
          style={active === t.id ? { background: 'rgba(125,26,215,0.08)', color: '#507AE6' } : { color: '#8A8A9A', background: 'transparent' }}>
          {t.icon}{t.label}
        </button>
      ))}
    </div>
  )
}

// ─── Task Form ─────────────────────────────────────────────────────────────

function TaskModal({ initial, colId, isManager, members, onMembersLoaded, onSave, onClose }: {
  initial?: Task
  colId: string
  isManager: boolean
  members: TaskMember[]
  onMembersLoaded: (members: TaskMember[]) => void
  onSave: (colId: string, task: Omit<Task, 'id'> & { id?: string }) => Promise<void>
  onClose: () => void
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [channel, setChannel] = useState<ChannelType>(initial?.channel ?? 'instagram')
  const [difficulty, setDifficulty] = useState<Difficulty>(initial?.difficulty ?? 'médio')
  const [startDate, setStartDate] = useState(initial?.startDate ?? '')
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? '')
  const [assignees, setAssignees] = useState<TaskAssignee[]>(initial?.assignees ?? [])
  const [availableMembers, setAvailableMembers] = useState<TaskMember[]>(members)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.kanban.assignees().then((rawMembers) => {
      const mapped = rawMembers.map((member: any, index: number) => ({ id: member.id, name: member.nomeCompleto, role: member.cargo ?? 'Analista', initials: member.nomeCompleto.split(/\s+/).slice(0, 2).map((part: string) => part[0]).join('').toUpperCase(), color: ['#507AE6', '#50E678', '#E1306C', '#FFB300', '#7D1AD7'][index % 5] }))
      setAvailableMembers(mapped); onMembersLoaded(mapped)
    }).catch(() => setError('Não foi possível carregar as analistas.'))
  }, [])

  function toggleMember(memberId: string) {
    setAssignees((prev) => {
      const exists = prev.find((a) => a.memberId === memberId)
      if (exists) return prev.filter((a) => a.memberId !== memberId)
      return [...prev, { memberId, note: null }]
    })
  }

  function setNote(memberId: string, val: string) {
    const num = val === '' ? null : Math.max(0, Math.min(5, parseFloat(val) || 0))
    setAssignees((prev) => prev.map((a) => a.memberId === memberId ? { ...a, note: num } : a))
  }

  async function save() {
    if (!title.trim()) return
    if (startDate && dueDate && dueDate < startDate) { setError('O prazo deve ser igual ou posterior à data de início.'); return }
    setSaving(true); setError('')
    try {
      await onSave(colId, { title, channel, assignees, difficulty, startDate, dueDate, priority: 'média', id: initial?.id })
      onClose()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar a task.')
      setSaving(false)
    }
  }

  const difficulties: Difficulty[] = ['fácil', 'médio', 'difícil']
  const channels: ChannelType[] = ['instagram', 'linkedin', 'site', 'email']

  return (
    <Modal title={initial ? 'Editar task' : 'Nova task'} onClose={onClose} wide
      footer={
        <div className="px-6 py-4 flex gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={save} disabled={saving} className="px-5 py-2 rounded-xl text-sm font-medium text-white hover:opacity-90 btn-glow disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #7D1AD7, #50E678)' }}>
            {saving ? 'Salvando…' : initial ? 'Salvar alterações' : 'Criar task'}
          </button>
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-[#8A8A9A] hover:bg-[rgba(255,255,255,0.08)]">Cancelar</button>
        </div>
      }>
      <div className="px-6 py-4 space-y-4">
        <FormField label="Título *">
          <Inp value={title} onChange={setTitle} placeholder="Ex: Carrossel — 5 dicas de produtividade" />
        </FormField>

        <FormField label="Rede social">
          <div className="flex gap-2 flex-wrap">
            {channels.map((ch) => (
              <button key={ch} onClick={() => setChannel(ch)} className="filter-pill text-xs px-3 py-1.5 rounded-full font-medium transition-all"
                style={channel === ch ? { background: CH[ch].dot, color: '#fff' } : { background: CH[ch].bg, color: CH[ch].color }}>
                {CH[ch].label}
              </button>
            ))}
          </div>
        </FormField>

        <FormField label={isManager ? 'Responsáveis e notas individuais (0–5)' : 'Analistas responsáveis'}>
          <div className="space-y-2">
            {availableMembers.length === 0 && <div className="text-sm text-[#8A8A9A] rounded-xl px-3 py-3 bg-[#202024]">Nenhuma analista ativa cadastrada. Use “Gerenciar usuários” para criar uma conta de Analista.</div>}
            {availableMembers.map((m) => {
              const a = assignees.find((x) => x.memberId === m.id)
              const selected = !!a
              return (
                <div key={m.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all"
                  style={{ background: selected ? 'rgba(125,26,215,0.08)' : '#202024', border: `1.5px solid ${selected ? '#7D1AD7' : 'rgba(255,255,255,0.1)'}` }}>
                  <button onClick={() => toggleMember(m.id)} className="flex items-center gap-2.5 flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-center rounded-full text-white font-bold flex-shrink-0"
                      style={{ width: 28, height: 28, background: m.color, fontSize: 10 }}>
                      {m.initials}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[#F0F0F5]">{m.name}</div>
                      <div className="text-xs text-[#555566]">{m.role}</div>
                    </div>
                  </button>
                  {selected ? (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isManager && (
                        <>
                          <label className="text-xs text-[#8A8A9A] whitespace-nowrap">Nota:</label>
                          <input type="number" min={0} max={5} step={0.1}
                            value={initial ? (a!.note ?? '') : ''} placeholder="—" disabled={!initial}
                            onChange={(e) => initial && setNote(m.id, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            title={initial ? 'Avaliar execução da task' : 'A nota fica disponível após criar a task'}
                            className="w-16 text-xs px-2 py-1 rounded-lg border border-[rgba(125,26,215,0.2)] focus:outline-none focus:border-[#7D1AD7] text-center bg-[#17171A] disabled:opacity-50" />
                          <span className="text-xs text-[#555566]">/5</span>
                        </>
                      )}
                      <button onClick={() => toggleMember(m.id)} className="text-[#555566] hover:text-[#FF5252] ml-1"><X size={14} /></button>
                    </div>
                  ) : (
                    <span className="text-xs text-[#555566] flex-shrink-0">clique para atribuir</span>
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
                <button key={d} onClick={() => setDifficulty(d)} className="flex-1 text-xs py-2 rounded-lg font-medium capitalize transition-all"
                  style={difficulty === d ? { background: DIFF[d].color, color: '#fff' } : { background: DIFF[d].bg, color: DIFF[d].color }}>
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
        {error && <p className="text-xs text-[#FF6B6B]" role="alert">{error}</p>}
      </div>
    </Modal>
  )
}

// ─── Kanban ───────────────────────────────────────────────────────────────

function KanbanBoard({ channel, setChannel, isManager, members, setMembers, columns, setColumns }: { channel: Channel; setChannel: (c: Channel) => void; isManager: boolean; members: TaskMember[]; setMembers: React.Dispatch<React.SetStateAction<TaskMember[]>>; columns: KanbanColumn[]; setColumns: React.Dispatch<React.SetStateAction<KanbanColumn[]>> }) {
  const [dragging, setDragging] = useState<{ taskId: string; fromColId: string } | null>(null)
  const [dragOverColId, setDragOverColId] = useState<string | null>(null)
  const [editingColId, setEditingColId] = useState<string | null>(null)
  const [editingColName, setEditingColName] = useState('')
  const [taskModal, setTaskModal] = useState<{ colId: string; task?: Task } | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'task' | 'col'; id: string; colId?: string } | null>(null)

  async function handleDrop(toColId: string) {
    if (!dragging) return
    const { taskId, fromColId } = dragging
    if (fromColId === toColId) { setDragging(null); return }
    const targetOrder = columns.find((column) => column.id === toColId)?.tasks.length ?? 0
    try { await api.kanban.moveTask(taskId, { colunaId: toColId, ordem: targetOrder }) } catch { setDragging(null); setDragOverColId(null); return }
    setColumns((prev) => {
      const task = prev.find((c) => c.id === fromColId)?.tasks.find((t) => t.id === taskId)
      if (!task) return prev
      return prev.map((col) => {
        if (col.id === fromColId) return { ...col, tasks: col.tasks.filter((t) => t.id !== taskId) }
        if (col.id === toColId) return { ...col, tasks: [...col.tasks, task] }
        return col
      })
    })
    setDragging(null); setDragOverColId(null)
  }

  async function commitRename() {
    if (editingColId && editingColName.trim()) {
      await api.kanban.updateColumn(editingColId, { nome: editingColName.trim() }).catch(() => undefined)
      setColumns((prev) => prev.map((c) => c.id === editingColId ? { ...c, name: editingColName.trim() } : c))
    }
    setEditingColId(null)
  }

  async function saveTask(colId: string, data: Omit<Task, 'id'> & { id?: string }) {
    const payload = {
      titulo: data.title,
      redeSocial: CHANNEL_TO_API[data.channel],
      dificuldade: DIFFICULTY_TO_API[data.difficulty],
      dataInicio: data.startDate || null,
      dataEntrega: data.dueDate || null,
      colunaId: colId,
      responsaveis: data.assignees.map((assignment) => ({ userId: String(assignment.memberId), nota: assignment.note })),
    }
    const saved = data.id ? await api.kanban.updateTask(data.id, payload) : await api.kanban.createTask(payload)
    const mapped = mapTask(saved)
    setColumns((prev) => prev.map((col) => {
      if (col.id !== colId) return data.id ? { ...col, tasks: col.tasks.filter((task) => task.id !== data.id) } : col
      if (data.id) return { ...col, tasks: col.tasks.map((task) => task.id === data.id ? mapped : task) }
      return { ...col, tasks: [...col.tasks, mapped] }
    }))
  }

  async function deleteTask(taskId: string) {
    await api.kanban.removeTask(taskId)
    setColumns((prev) => prev.map((col) => ({ ...col, tasks: col.tasks.filter((t) => t.id !== taskId) })))
    setDeleteConfirm(null)
  }

  async function deleteColumn(colId: string) {
    await api.kanban.removeColumn(colId)
    setColumns((prev) => prev.filter((c) => c.id !== colId))
    setDeleteConfirm(null)
  }

  async function addColumn() {
    const created = await api.kanban.createColumn({ nome: 'Nova Coluna' })
    setColumns((prev) => [...prev, mapColumn({ ...created, tasks: [] })])
  }

  const filterTasks = (tasks: Task[]) => channel === 'todos' ? tasks : tasks.filter((t) => t.channel === channel)
  const colColors = ['#7D1AD7', '#0A66C2', '#FFB300', '#00C853', '#40C4FF', '#E1306C', '#507AE6']

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
              <div key={col.id} data-empty={tasks.length === 0 ? 'true' : 'false'} className="kanban-column flex flex-col rounded-xl flex-shrink-0 transition-all"
                style={{ width: 276, background: isOver ? 'rgba(125,26,215,0.08)' : '#202024', border: `1.5px solid ${isOver ? '#7D1AD7' : 'rgba(255,255,255,0.1)'}`, minHeight: 400 }}
                onDragOver={(e) => { e.preventDefault(); setDragOverColId(col.id) }}
                onDrop={() => handleDrop(col.id)}
                onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverColId(null) }}>

                {/* Header */}
                <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: colColors[ci % colColors.length] }} />
                  {editingColId === col.id ? (
                    <input value={editingColName} onChange={(e) => setEditingColName(e.target.value)}
                      onBlur={commitRename} onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditingColId(null) }}
                      className="flex-1 text-sm font-semibold text-[#F0F0F5] bg-[#17171A] border border-[rgba(125,26,215,0.3)] rounded px-2 py-0.5 focus:outline-none" autoFocus />
                  ) : (
                    <button className="flex-1 text-sm font-semibold text-left text-[#F0F0F5] hover:text-[#F0F0F5] truncate" onClick={() => { setEditingColId(col.id); setEditingColName(col.name) }}>
                      {col.name}
                    </button>
                  )}
                  <span className="text-xs rounded-full px-2 py-0.5 flex-shrink-0"
                    style={{ background: colColors[ci % colColors.length] + '18', color: colColors[ci % colColors.length] }}>
                    {tasks.length}
                  </span>
                  <button onClick={() => setDeleteConfirm({ type: 'col', id: col.id })}
                    className="flex-shrink-0 text-[#555566] hover:text-[#FF5252] transition-colors ml-1">
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* Tasks */}
                <div className="flex-1 p-3 space-y-2 overflow-y-auto">
                  {tasks.map((task) => (
                    <div key={task.id} draggable onDragStart={() => setDragging({ taskId: task.id, fromColId: col.id })}
                      className="bg-[#17171A] rounded-xl p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-all group"
                      style={{ border: '1.5px solid rgba(255,255,255,0.06)', opacity: dragging?.taskId === task.id ? 0.4 : 1, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <ChannelBadge ch={task.channel} small />
                        <span className="text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0"
                          style={{ background: DIFF[task.difficulty].bg, color: DIFF[task.difficulty].color }}>
                          {DIFF[task.difficulty].label}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-[#F0F0F5] leading-snug mb-3">{task.title}</p>
                      <div className="flex items-center justify-between">
                        <AvatarStack assignees={task.assignees} members={members} />
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setTaskModal({ colId: col.id, task })} className="p-1 rounded hover:bg-[rgba(255,255,255,0.08)] text-[#555566] hover:text-[#7D1AD7]">
                            <Edit2 size={12} />
                          </button>
                          <button onClick={() => setDeleteConfirm({ type: 'task', id: task.id })} className="p-1 rounded hover:bg-[rgba(255,82,82,0.12)] text-[#555566] hover:text-[#FF5252]">
                            <Trash2 size={12} />
                          </button>
                        </div>
                        {task.dueDate && (
                          <span className="text-xs" style={{ color: '#555566' }}>
                            {task.dueDate.slice(5).split('-').reverse().join('/')}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {tasks.length === 0 && (
                    <div className="empty-state text-center py-6 text-[#8A8A9A] text-sm">Solte aqui</div>
                  )}
                </div>

                <button type="button" onClick={() => setTaskModal({ colId: col.id })}
                  className="flex items-center gap-1.5 text-xs text-[#555566] hover:text-[#7D1AD7] hover:bg-[rgba(125,26,215,0.08)] rounded-xl mx-3 mb-3 px-3 py-2.5 transition-colors font-medium border border-dashed border-[rgba(255,255,255,0.1)] hover:border-[rgba(125,26,215,0.3)]">
                  <Plus size={13} /> Adicionar task
                </button>
              </div>
            )
          })}
          <button onClick={addColumn} className="flex-shrink-0 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-[#555566] hover:text-[#8A8A9A] transition-all"
            style={{ border: '1.5px dashed #555566', background: 'transparent', minWidth: 160 }}>
            <Plus size={16} /> Nova coluna
          </button>
        </div>
      </div>

      {/* Task modal */}
      {taskModal && (
        <TaskModal colId={taskModal.colId} initial={taskModal.task} isManager={isManager} members={members} onMembersLoaded={setMembers} onSave={saveTask} onClose={() => setTaskModal(null)} />
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-[#17171A] rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <p className="font-semibold text-[#F0F0F5] mb-1">Confirmar exclusão</p>
            <p className="text-sm text-[#8A8A9A] mb-4">
              {deleteConfirm.type === 'col' ? 'Apagar esta coluna e todas as tasks nela?' : 'Apagar esta task permanentemente?'}
            </p>
            <div className="flex gap-2">
              <button onClick={() => deleteConfirm.type === 'task' ? deleteTask(deleteConfirm.id) : deleteColumn(deleteConfirm.id)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-[#FF5252] hover:bg-[#E64545]">Apagar</button>
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 rounded-xl text-sm font-medium text-[#8A8A9A] hover:bg-[rgba(255,255,255,0.08)]">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Calendar ─────────────────────────────────────────────────────────────

type CalView = 'week' | 'month' | 'year'

const PT_MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const PT_MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const PT_DAYS_SHORT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

function dateStr(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getMonthGrid(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1)
  const startOffset = (firstDay.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (Date | null)[] = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

const typeStyle = {
  meeting: { bg: 'rgba(125,26,215,0.08)', border: '#7D1AD7', color: '#507AE6', icon: <Clock size={11} /> },
  deadline: { bg: 'rgba(255,82,82,0.15)', border: '#FF5252', color: '#FF5252', icon: <Flame size={11} /> },
  task: { bg: 'rgba(0,200,83,0.15)', border: '#00C853', color: '#00C853', icon: <Check size={11} /> },
}

interface EventForm {
  id?: string; date: string; title: string; time: string; endTime: string
  type: 'meeting' | 'deadline' | 'task'; local: 'meet' | 'presencial' | ''; sala: string; participantIds: string[]
}

interface EventParticipant { id: string; name: string; role: string; initials: string; color: string }

function CalendarView({ currentUserId, isManager }: { currentUserId: string; isManager: boolean }) {
  const TODAY = dateStr(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [participants, setParticipants] = useState<EventParticipant[]>([])
  const [view, setView] = useState<CalView>('week')
  const [navDate, setNavDate] = useState(new Date())
  const [dayDetail, setDayDetail] = useState<string | null>(null)
  const [addModal, setAddModal] = useState<string | null>(null)
  const [form, setForm] = useState<EventForm>({ date: '', title: '', time: '09:00', endTime: '09:30', type: 'meeting', local: '', sala: '', participantIds: [] })
  const [saving, setSaving] = useState(false)
  const [savingAttendance, setSavingAttendance] = useState<string | null>(null)
  const [error, setError] = useState('')

  function loadParticipants() {
    return api.calendar.participants().then((rawParticipants) => {
      setParticipants(rawParticipants.map((p: any, index: number) => ({
        id: p.id, name: p.nomeCompleto, role: p.cargo ?? (p.perfil === 'GERENTE' ? 'Gerente' : 'Analista'),
        initials: p.nomeCompleto.split(/\s+/).slice(0, 2).map((part: string) => part[0]).join('').toUpperCase(),
        color: ['#507AE6', '#50E678', '#E1306C', '#FFB300', '#7D1AD7'][index % 5],
      })))
    })
  }

  function loadEvents() {
    return api.calendar.list().then((rawEvents) => {
      setEvents(rawEvents.map(mapEvent))
    })
  }

  useEffect(() => {
    Promise.all([loadEvents(), loadParticipants()]).catch(() => setError('Não foi possível carregar o calendário.'))
  }, [])

  function navigate(dir: -1 | 1) {
    setNavDate((d) => {
      const nd = new Date(d)
      if (view === 'week') nd.setDate(nd.getDate() + dir * 7)
      else if (view === 'month') nd.setMonth(nd.getMonth() + dir)
      else nd.setFullYear(nd.getFullYear() + dir)
      return nd
    })
  }

  function openDayDetail(date: string) {
    setDayDetail(date)
    loadEvents().catch(() => setError('Não foi possível atualizar o calendário.'))
  }

  function openAdd(date: string) {
    setForm({ date, title: '', time: '09:00', endTime: '09:30', type: 'meeting', local: '', sala: '', participantIds: [currentUserId] })
    setError('')
    setAddModal(date)
    loadParticipants().catch(() => setError('Não foi possível carregar a lista de participantes.'))
  }

  function openEdit(ev: CalendarEvent) {
    setForm({ id: ev.id, date: ev.date, title: ev.title, time: ev.time, endTime: ev.endTime, type: ev.type, local: ev.local, sala: ev.sala, participantIds: ev.attendees.map((a) => a.userId) })
    setError('')
    setAddModal(ev.date)
    loadParticipants().catch(() => setError('Não foi possível carregar a lista de participantes.'))
  }

  function toggleParticipant(userId: string) {
    setForm((f) => ({ ...f, participantIds: f.participantIds.includes(userId) ? f.participantIds.filter((id) => id !== userId) : [...f.participantIds, userId] }))
  }

  async function saveEvent() {
    if (!form.title.trim()) return
    setSaving(true); setError('')
    try {
      const eventBeingEdited = form.id ? events.find((event) => event.id === form.id) : undefined
      const attendanceToKeep = eventBeingEdited?.attendanceConfirmed && form.type === 'meeting'
        ? eventBeingEdited.attendees.filter((attendee) => attendee.attendanceEligible && attendee.attendanceStatus && form.participantIds.includes(attendee.userId)).map((attendee) => ({ userId: attendee.userId, status: attendee.attendanceStatus }))
        : []
      const payload = {
        titulo: form.title, data: form.date, horario: form.time, horarioFim: form.endTime || null,
        tipo: TIPO_TO_API[form.type],
        formatoLocal: form.local ? (form.local === 'meet' ? 'MEET' : 'PRESENCIAL') : null,
        sala: form.local === 'presencial' ? (form.sala || null) : null,
        participantIds: form.participantIds,
      }
      const saved = form.id ? await api.calendar.update(form.id, payload) : await api.calendar.create(payload)
      if (form.id && attendanceToKeep.length > 0) await api.engagement.saveAttendance(form.id, attendanceToKeep)
      if (form.id) await loadEvents()
      else setEvents((prev) => [...prev, mapEvent(saved)])
      setAddModal(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar o evento.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteEvent(id: string) {
    setEvents((prev) => prev.filter((e) => e.id !== id))
    await api.calendar.remove(id).catch(() => setError('Não foi possível apagar o evento.'))
  }

  function setCalendarAttendance(eventId: string, userId: string, status: AttendanceStatus) {
    setEvents((current) => current.map((event) => event.id !== eventId ? event : { ...event, attendees: event.attendees.map((attendee) => attendee.userId === userId ? { ...attendee, attendanceStatus: status } : attendee) }))
  }

  async function saveCalendarAttendance(event: CalendarEvent) {
    const attendees = event.attendees.filter((attendee) => attendee.attendanceEligible)
    if (attendees.some((attendee) => !attendee.attendanceStatus)) { setError('Marque todos os membros antes de salvar.'); return }
    setSavingAttendance(event.id); setError('')
    try {
      await api.engagement.saveAttendance(event.id, attendees.map((attendee) => ({ userId: attendee.userId, status: attendee.attendanceStatus })))
      await loadEvents()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível atualizar a presença.') }
    finally { setSavingAttendance(null) }
  }

  const eventsOnDate = (d: string) => events.filter((e) => e.date === d)

  // ── Day detail modal ──
  function DayDetailModal({ date }: { date: string }) {
    const dayEvents = eventsOnDate(date)
    const [d, m, y] = [
      new Date(date + 'T12:00:00').getDate(),
      PT_MONTHS[new Date(date + 'T12:00:00').getMonth()],
      new Date(date + 'T12:00:00').getFullYear(),
    ]
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDayDetail(null)}>
        <div className="bg-[#17171A] rounded-2xl shadow-2xl w-full max-w-sm flex flex-col max-h-[85vh] overflow-hidden" style={{ margin: 16 }} onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div>
              <h3 className="font-semibold text-[#F0F0F5]">{d} de {m}</h3>
              <p className="text-xs text-[#555566]">{y} · {dayEvents.length} evento{dayEvents.length !== 1 ? 's' : ''}</p>
            </div>
            <button onClick={() => setDayDetail(null)} className="text-[#555566] hover:text-[#8A8A9A]"><X size={18} /></button>
          </div>
          <div className="overflow-y-auto flex-1 px-6 py-4 space-y-2">
            {dayEvents.length === 0 && (
              <p className="text-sm text-[#555566] text-center py-4">Nenhum evento neste dia.</p>
            )}
            {dayEvents.map((ev) => {
              const s = typeStyle[ev.type]
              return (
                <div key={ev.id} className="group rounded-xl px-3 py-2.5 flex items-start justify-between gap-2" style={{ background: s.bg, border: `1.5px solid ${s.border}` }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span style={{ color: s.color }}>{s.icon}</span>
                      <span className="text-xs font-semibold" style={{ color: s.color }}>{timeRange(ev)}</span>
                    </div>
                    <p className="text-sm font-medium text-[#F0F0F5] leading-snug">{ev.title}</p>
                    {ev.local && (
                      <p className="text-xs mt-0.5" style={{ color: '#8A8A9A' }}>
                        {ev.local === 'meet' ? 'Google Meet' : `Presencial${ev.sala ? ` — ${ev.sala}` : ''}`}
                      </p>
                    )}
                    {ev.attendees.length > 0 && (
                      <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                        {ev.attendees.map((a) => (
                          <span key={a.userId} title={a.nome} className="flex items-center justify-center rounded-full text-white font-bold flex-shrink-0"
                            style={{ width: 18, height: 18, fontSize: 8, background: 'rgba(255,255,255,0.15)' }}>
                            {a.nome.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}
                          </span>
                        ))}
                        <span className="text-xs text-[#8A8A9A] ml-0.5">{ev.attendees.map((a) => a.nome.split(/\s+/)[0]).join(', ')}</span>
                      </div>
                    )}
                    {isManager && <AttendanceSummary event={ev} />}
                    {isManager && ev.type === 'meeting' && ev.attendanceConfirmed && (
                      <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,.08)' }}>
                        <div className="flex items-center justify-between mb-2"><p className="text-xs font-semibold text-[#D5D5DE]">Presença e pontualidade</p><span className="text-[10px] text-[#00C853]">Registro confirmado</span></div>
                        <div className="space-y-2">
                          {ev.attendees.filter((attendee) => attendee.attendanceEligible).map((attendee) => (
                            <div key={attendee.userId} className="flex items-center justify-between gap-2"><span className="text-xs text-[#B9B9C5]">{attendee.nome}</span><div className="flex gap-1">
                              {([{ status: 'PRESENTE', label: 'Presente', icon: <Check size={13} />, color: '#00C853' }, { status: 'AUSENTE', label: 'Ausente', icon: <X size={13} />, color: '#FF5252' }, { status: 'ATRASADO', label: 'Atrasado', icon: <Clock size={13} />, color: '#FFB300' }] as const).map((option) => <button key={option.status} onClick={() => setCalendarAttendance(ev.id, attendee.userId, option.status)} title={option.label} aria-label={`${option.label}: ${attendee.nome}`} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ color: option.color, background: attendee.attendanceStatus === option.status ? `${option.color}26` : 'rgba(255,255,255,.04)', border: `1px solid ${attendee.attendanceStatus === option.status ? option.color : 'rgba(255,255,255,.08)'}` }}>{option.icon}</button>)}
                            </div></div>
                          ))}
                        </div>
                        <div className="flex justify-end mt-2"><button onClick={() => saveCalendarAttendance(ev)} disabled={savingAttendance === ev.id} className="text-[11px] font-semibold px-3 py-1.5 rounded-lg text-white bg-[#7D1AD7] disabled:opacity-50">{savingAttendance === ev.id ? 'Salvando…' : 'Salvar edição'}</button></div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all mt-0.5">
                    <button onClick={() => { setDayDetail(null); openEdit(ev) }} className="text-[#8A8A9A] hover:text-[#F0F0F5]">
                      <Edit2 size={13} />
                    </button>
                    <button onClick={() => deleteEvent(ev.id)} className="text-[#FF5252] hover:text-[#FF5252]">
                      <X size={13} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="px-6 py-4 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <button onClick={() => { setDayDetail(null); openAdd(date) }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-white hover:opacity-90 transition-opacity"
              style={{ background: 'linear-gradient(135deg, #7D1AD7, #50E678)' }}>
              <Plus size={15} /> Adicionar evento
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Week view ──
  function WeekView() {
    const monday = new Date(navDate)
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday); d.setDate(d.getDate() + i); return d
    })
    return (
      <div className="overflow-x-auto -mx-1 px-1">
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(7, minmax(130px, 1fr))', minWidth: 700 }}>
          {days.map((day) => {
            const ds = dateStr(day)
            const dayEvents = eventsOnDate(ds)
            const isToday = ds === TODAY
            return (
              <div key={ds} className="rounded-xl overflow-hidden"
                style={{ background: isToday ? '#202024' : '#17171A', border: isToday ? '2px solid #7D1AD7' : '1.5px solid rgba(255,255,255,0.1)', minHeight: 180 }}>
                <button className="w-full px-3 py-2.5 flex items-center gap-2 text-left hover:bg-[rgba(125,26,215,0.08)]/60 transition-colors"
                  style={{ background: isToday ? 'rgba(125,26,215,0.08)' : '#202024', borderBottom: '1px solid rgba(255,255,255,0.1)' }}
                  onClick={() => openDayDetail(ds)}>
                  <div className="text-sm font-bold flex items-center justify-center rounded-lg flex-shrink-0"
                    style={{ width: 28, height: 28, background: isToday ? '#7D1AD7' : 'transparent', color: isToday ? '#fff' : '#F0F0F5' }}>
                    {day.getDate()}
                  </div>
                  <div>
                    <div className="text-xs font-semibold" style={{ color: isToday ? '#507AE6' : '#8A8A9A' }}>
                      {PT_DAYS_SHORT[(day.getDay() + 6) % 7]}
                    </div>
                    <div className="text-xs text-[#555566]">{PT_MONTHS_SHORT[day.getMonth()]}</div>
                  </div>
                  {isToday && <span className="ml-auto text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: '#7D1AD7', color: '#fff' }}>Hoje</span>}
                </button>
                <div className="p-2 space-y-1.5">
                  {dayEvents.map((ev) => {
                    const s = typeStyle[ev.type]
                    return (
                      <div key={ev.id} className="group rounded-lg px-2.5 py-1.5" style={{ background: s.bg, borderLeft: `3px solid ${s.border}` }}>
                        <div className="flex items-center gap-1 mb-0.5">
                          <span style={{ color: s.color }}>{s.icon}</span>
                          <span className="text-xs font-medium" style={{ color: s.color }}>{timeRange(ev)}</span>
                        </div>
                        <div className="flex items-start justify-between gap-1">
                          <p className="text-xs font-medium text-[#F0F0F5] leading-snug flex-1">{ev.title}</p>
                          <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={() => openEdit(ev)} className="text-[#8A8A9A] hover:text-[#F0F0F5]">
                              <Edit2 size={11} />
                            </button>
                            <button onClick={() => deleteEvent(ev.id)} className="text-[#FF5252] hover:text-[#FF5252]">
                              <X size={11} />
                            </button>
                          </div>
                        </div>
                        {isManager && ev.attendanceConfirmed && <button onClick={() => openDayDetail(ev.date)} className="text-left" title="Abrir registro de presença para edição"><AttendanceSummary event={ev} compact /></button>}
                      </div>
                    )
                  })}
                  <button onClick={() => openAdd(ds)} className="w-full text-xs text-[#555566] hover:text-[#7D1AD7] hover:bg-[rgba(125,26,215,0.08)] rounded-lg py-1 transition-colors text-center border border-dashed border-[rgba(255,255,255,0.1)] hover:border-[rgba(125,26,215,0.3)]">
                    + Evento
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Month view ──
  function MonthView() {
    const year = navDate.getFullYear()
    const month = navDate.getMonth()
    const cells = getMonthGrid(year, month)
    return (
      <div>
        <div className="grid grid-cols-7 mb-1">
          {PT_DAYS_SHORT.map((d) => (
            <div key={d} className="text-center text-xs font-semibold text-[#555566] py-2">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (!day) return <div key={i} className="rounded-lg" style={{ minHeight: 80 }} />
            const ds = dateStr(day)
            const dayEvents = eventsOnDate(ds)
            const isToday = ds === TODAY
            const isCurrentMonth = day.getMonth() === month
            return (
              <div key={ds} className="rounded-lg overflow-hidden cursor-pointer hover:shadow-sm transition-all group"
                style={{ minHeight: 80, background: isToday ? 'rgba(125,26,215,0.08)' : '#17171A', border: isToday ? '1.5px solid #7D1AD7' : '1.5px solid rgba(255,255,255,0.06)', opacity: isCurrentMonth ? 1 : 0.4 }}
                onClick={() => openDayDetail(ds)}>
                <div className="flex items-center justify-between px-2 pt-2 pb-1">
                  <span className="text-xs font-bold" style={{ color: isToday ? '#7D1AD7' : '#8A8A9A' }}>{day.getDate()}</span>
                  {dayEvents.length > 0 && (
                    <span className="text-xs font-medium rounded-full px-1.5" style={{ background: '#7D1AD7', color: '#fff', fontSize: 10 }}>
                      {dayEvents.length}
                    </span>
                  )}
                </div>
                <div className="px-1.5 pb-1.5 space-y-0.5">
                  {dayEvents.slice(0, 2).map((ev) => {
                    const s = typeStyle[ev.type]
                    return (
                      <div key={ev.id} className="flex items-center justify-between group/ev rounded px-1.5 py-0.5 gap-1" style={{ background: s.bg }}>
                        <div className="min-w-0 flex-1 flex items-baseline gap-1">
                          <span className="flex-shrink-0" style={{ fontSize: 9, color: s.color, opacity: 0.8 }}>{timeRange(ev)}</span>
                          <p className="text-xs truncate leading-snug" style={{ color: s.color }}>{ev.title}</p>
                          {isManager && ev.attendanceConfirmed && <span className="ml-auto flex-shrink-0"><AttendanceSummary event={ev} compact /></span>}
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); deleteEvent(ev.id) }} className="flex-shrink-0 opacity-0 group-hover/ev:opacity-100 text-[#FF5252]">
                          <X size={9} />
                        </button>
                      </div>
                    )
                  })}
                  {dayEvents.length > 2 && <p className="text-xs text-[#555566] px-1">+{dayEvents.length - 2}</p>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Year view ──
  function YearView() {
    const year = navDate.getFullYear()
    return (
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 12 }, (_, m) => {
          const cells = getMonthGrid(year, m)
          const monthEvents = events.filter((e) => e.date.startsWith(`${year}-${String(m + 1).padStart(2, '0')}`))
          return (
            <div key={m} className="bg-[#17171A] rounded-xl p-3" style={{ border: '1.5px solid rgba(255,255,255,0.1)' }}>
              <div className="text-xs font-semibold text-[#F0F0F5] mb-2 text-center">
                {PT_MONTHS_SHORT[m]}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {PT_DAYS_SHORT.map((d) => (
                  <div key={d} className="text-center" style={{ fontSize: 8, color: '#555566' }}>{d[0]}</div>
                ))}
                {cells.map((day, i) => {
                  if (!day) return <div key={i} />
                  const ds = dateStr(day)
                  const hasEv = eventsOnDate(ds).length > 0
                  const isToday = ds === TODAY
                  return (
                    <button key={ds} onClick={() => { setView('month'); setNavDate(new Date(year, m, 1)) }}
                      className="flex items-center justify-center rounded transition-all"
                      style={{ height: 18, fontSize: 9, background: isToday ? '#7D1AD7' : hasEv ? 'rgba(125,26,215,0.08)' : 'transparent', color: isToday ? '#fff' : '#8A8A9A' }}>
                      {day.getDate()}
                    </button>
                  )
                })}
              </div>
              {monthEvents.length > 0 && (
                <div className="mt-2 text-center">
                  <span className="text-xs" style={{ color: '#7D1AD7' }}>{monthEvents.length} evento{monthEvents.length > 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  const navLabel = view === 'week'
    ? `${PT_MONTHS_SHORT[navDate.getMonth()]} ${navDate.getFullYear()}`
    : view === 'month'
    ? `${PT_MONTHS[navDate.getMonth()]} ${navDate.getFullYear()}`
    : String(navDate.getFullYear())

  return (
    <div className="h-full overflow-auto p-5">
      <div className="max-w-6xl mx-auto">
        {/* Controls */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.08)] text-[#8A8A9A]"><ChevronLeft size={16} /></button>
            <h2 className="text-base font-semibold text-[#F0F0F5] min-w-32 text-center">{navLabel}</h2>
            <button onClick={() => navigate(1)} className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.08)] text-[#8A8A9A]"><ChevronRight size={16} /></button>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg overflow-hidden" style={{ border: '1.5px solid rgba(255,255,255,0.1)' }}>
              {(['week', 'month', 'year'] as CalView[]).map((v) => (
                <button key={v} onClick={() => setView(v)}
                  className="text-xs px-3 py-1.5 font-medium transition-all capitalize"
                  style={view === v ? { background: '#7D1AD7', color: '#fff' } : { color: '#8A8A9A' }}>
                  {v === 'week' ? 'Semana' : v === 'month' ? 'Mês' : 'Ano'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {view === 'week' && <WeekView />}
        {view === 'month' && <MonthView />}
        {view === 'year' && <YearView />}
      </div>

      {/* Day detail modal */}
      {dayDetail && <DayDetailModal date={dayDetail} />}

      {/* Add event modal */}
      {addModal && (
        <Modal title={form.id ? 'Editar evento' : 'Novo evento'} onClose={() => setAddModal(null)} wide
          footer={
            <div className="px-6 py-4 flex gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <button onClick={saveEvent} disabled={saving} className="px-5 py-2 rounded-xl text-sm font-medium text-white hover:opacity-90 btn-glow disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #7D1AD7, #50E678)' }}>
                {saving ? 'Salvando…' : form.id ? 'Salvar alterações' : 'Salvar evento'}
              </button>
              <button onClick={() => setAddModal(null)} className="px-4 py-2 rounded-xl text-sm font-medium text-[#8A8A9A] hover:bg-[rgba(255,255,255,0.08)]">Cancelar</button>
            </div>
          }>
          <div className="px-6 py-4 space-y-4">
            <FormField label="Título *">
              <Inp value={form.title} onChange={(v) => setForm((f) => ({ ...f, title: v }))} placeholder="Ex: Reunião de planning" />
            </FormField>
            <div className="grid grid-cols-3 gap-4">
              <FormField label="Data">
                <Inp type="date" value={form.date} onChange={(v) => setForm((f) => ({ ...f, date: v }))} />
              </FormField>
              <FormField label="Horário de início">
                <Inp type="time" value={form.time} onChange={(v) => setForm((f) => ({ ...f, time: v }))} />
              </FormField>
              <FormField label="Horário de término">
                <Inp type="time" value={form.endTime} onChange={(v) => setForm((f) => ({ ...f, endTime: v }))} />
              </FormField>
            </div>
            <FormField label="Tipo">
              <div className="flex gap-2">
                {(['meeting', 'deadline', 'task'] as const).map((t) => {
                  const s = typeStyle[t]
                  const label = t === 'meeting' ? 'Reunião' : t === 'deadline' ? 'Deadline' : 'Task'
                  return (
                    <button key={t} onClick={() => setForm((f) => ({ ...f, type: t }))}
                      className="flex-1 text-xs py-2 rounded-lg font-medium transition-all"
                      style={form.type === t ? { background: s.border, color: '#fff' } : { background: s.bg, color: s.color }}>
                      {label}
                    </button>
                  )
                })}
              </div>
            </FormField>
            <FormField label="Local">
              <div className="flex gap-2 flex-wrap">
                {([['', 'Nenhum'], ['meet', 'Meet'], ['presencial', 'Presencial']] as const).map(([value, label]) => (
                  <button key={value || 'nenhum'} onClick={() => setForm((f) => ({ ...f, local: value, sala: value === 'presencial' ? f.sala : '' }))}
                    className="text-xs px-3 py-1 rounded-full font-medium transition-all"
                    style={form.local === value ? { background: '#7D1AD7', color: '#fff' } : { background: 'rgba(255,255,255,0.06)', color: '#8A8A9A' }}>
                    {label}
                  </button>
                ))}
              </div>
              {form.local === 'presencial' && (
                <div className="mt-2">
                  <Inp value={form.sala} onChange={(v) => setForm((f) => ({ ...f, sala: v }))} placeholder="Ex: Sala de reunião 3" />
                </div>
              )}
            </FormField>
            <FormField label="Participantes">
              <div className="space-y-2">
                {participants.length === 0 && <div className="text-sm text-[#8A8A9A] rounded-xl px-3 py-3 bg-[#202024]">Nenhum usuário ativo cadastrado.</div>}
                {participants.map((p) => {
                  const selected = form.participantIds.includes(p.id)
                  return (
                    <button key={p.id} type="button" onClick={() => toggleParticipant(p.id)}
                      className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all text-left"
                      style={{ background: selected ? 'rgba(125,26,215,0.08)' : '#202024', border: `1.5px solid ${selected ? '#7D1AD7' : 'rgba(255,255,255,0.1)'}` }}>
                      <div className="flex items-center justify-center rounded-full text-white font-bold flex-shrink-0"
                        style={{ width: 28, height: 28, background: p.color, fontSize: 10 }}>
                        {p.initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-[#F0F0F5]">{p.name}</div>
                        <div className="text-xs text-[#555566]">{p.role}</div>
                      </div>
                      {selected ? <Check size={16} style={{ color: '#7D1AD7' }} /> : <span className="text-xs text-[#555566] flex-shrink-0">clique para convidar</span>}
                    </button>
                  )
                })}
              </div>
            </FormField>
            {isManager && form.type === 'meeting' && form.id && events.find((event) => event.id === form.id)?.attendanceConfirmed && (() => {
              const event = events.find((item) => item.id === form.id)!
              return (
                <FormField label="Presença e pontualidade confirmadas">
                  <div className="rounded-xl p-4 space-y-2 bg-[#202024]" style={{ border: '1.5px solid rgba(255,255,255,.1)' }}>
                    <p className="text-xs text-[#8A8A9A] mb-3">Confira quem esteve presente, faltou ou chegou atrasado. As alterações serão salvas junto com a reunião.</p>
                    {event.attendees.filter((attendee) => attendee.attendanceEligible).map((attendee) => (
                      <div key={attendee.userId} className="flex items-center justify-between gap-3 py-1">
                        <span className="text-sm text-[#D5D5DE]">{attendee.nome}</span>
                        <div className="flex gap-1.5">
                          {([{ status: 'PRESENTE', label: 'Presente', icon: <Check size={14} />, color: '#00C853' }, { status: 'AUSENTE', label: 'Ausente', icon: <X size={14} />, color: '#FF5252' }, { status: 'ATRASADO', label: 'Atrasado', icon: <Clock size={14} />, color: '#FFB300' }] as const).map((option) => (
                            <button key={option.status} type="button" onClick={() => setCalendarAttendance(event.id, attendee.userId, option.status)} aria-label={`${option.label}: ${attendee.nome}`} title={option.label}
                              className="flex items-center gap-1.5 px-2.5 h-8 rounded-lg text-xs font-medium transition-all"
                              style={{ color: option.color, background: attendee.attendanceStatus === option.status ? `${option.color}26` : 'rgba(255,255,255,.04)', border: `1px solid ${attendee.attendanceStatus === option.status ? option.color : 'rgba(255,255,255,.08)'}` }}>
                              {option.icon}<span>{option.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </FormField>
              )
            })()}
            {error && <p className="text-xs text-[#FF6B6B]" role="alert">{error}</p>}
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── Campaigns ────────────────────────────────────────────────────────────

function ProgressBar({ value, target, color }: { value: number; target: number; color: string }) {
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span style={{ color: '#8A8A9A' }}>{value.toLocaleString('pt-BR')}</span>
        <span style={{ color: '#555566' }}>meta: {target.toLocaleString('pt-BR')}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="text-xs mt-0.5" style={{ color: '#555566' }}>{pct}%</div>
    </div>
  )
}

const statusStyle = {
  ativa: { label: 'Ativa', bg: 'rgba(0,200,83,0.15)', color: '#00C853' },
  planejada: { label: 'Planejada', bg: 'rgba(125,26,215,0.08)', color: '#7D1AD7' },
  encerrada: { label: 'Encerrada', bg: 'rgba(255,255,255,0.06)', color: '#8A8A9A' },
}

function CampaignsView({ channel, setChannel }: { channel: Channel; setChannel: (c: Channel) => void }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [showForm, setShowForm] = useState(false)
  const [expandedMetrics, setExpandedMetrics] = useState<Record<string, boolean>>({})
  const [metricForms, setMetricForms] = useState<Record<string, { date: string; reach: string; interactions: string }>>({})
  const [form, setForm] = useState({ name: '', objective: '', audience: '', startDate: '', endDate: '', targetReach: '', targetInteractions: '', channels: [] as ChannelType[] })

  function reload() {
    api.campaigns.list().then((rows) => setCampaigns(rows.map(mapCampaign))).catch(console.error)
  }
  useEffect(() => { reload() }, [])

  const filtered = channel === 'todos' ? campaigns : campaigns.filter((c) => c.channels.includes(channel as ChannelType))

  function toggleChannel(ch: ChannelType) {
    setForm((f) => ({ ...f, channels: f.channels.includes(ch) ? f.channels.filter((c) => c !== ch) : [...f.channels, ch] }))
  }

  async function submitCampaign() {
    if (!form.name.trim()) return
    const created = await api.campaigns.create({
      nome: form.name,
      status: 'PLANEJADA',
      objetivo: form.objective.trim() || form.name,
      publico: form.audience.trim() || 'Não definido',
      dataInicio: form.startDate || new Date().toISOString().slice(0, 10),
      dataFim: form.endDate || new Date().toISOString().slice(0, 10),
      alcanceMeta: parseInt(form.targetReach) || 10000,
      interacoesMeta: parseInt(form.targetInteractions) || 500,
      canais: (form.channels.length ? form.channels : (['instagram'] as ChannelType[])).map((ch) => CHANNEL_TO_API[ch]),
    }).catch((cause) => { console.error(cause); return null })
    if (!created) return
    setCampaigns((prev) => [...prev, mapCampaign(created)])
    setShowForm(false)
    setForm({ name: '', objective: '', audience: '', startDate: '', endDate: '', targetReach: '', targetInteractions: '', channels: [] })
  }

  async function deleteCampaign(id: string) {
    setCampaigns((prev) => prev.filter((c) => c.id !== id))
    await api.campaigns.remove(id).catch((cause) => { console.error(cause); reload() })
  }

  async function addMetricEntry(campId: string) {
    const mf = metricForms[campId]
    if (!mf?.date) return
    await api.campaigns.addMetric(campId, { data: mf.date, alcance: parseInt(mf.reach) || 0, interacoes: parseInt(mf.interactions) || 0 }).catch(console.error)
    setMetricForms((prev) => ({ ...prev, [campId]: { date: '', reach: '', interactions: '' } }))
    reload()
  }

  async function deleteMetricEntry(campId: string, metricId: string) {
    await api.campaigns.removeMetric(campId, metricId).catch(console.error)
    reload()
  }

  return (
    <div className="h-full overflow-auto p-5">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-base font-semibold text-[#F0F0F5]">Campanhas</h2>
              <p className="text-sm text-[#8A8A9A]">{filtered.length} campanha{filtered.length !== 1 ? 's' : ''}</p>
            </div>
            <ChannelFilter channel={channel} setChannel={setChannel} />
          </div>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl text-white transition-all hover:opacity-90 btn-glow"
            style={{ background: 'linear-gradient(135deg, #7D1AD7, #50E678)' }}>
            <Plus size={16} /> Nova Campanha
          </button>
        </div>

        {showForm && (
          <div className="bg-[#17171A] rounded-2xl p-6 mb-5" style={{ border: '1.5px solid rgba(255,255,255,0.1)', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[#F0F0F5]">Nova Campanha</h3>
              <button onClick={() => setShowForm(false)} className="text-[#555566] hover:text-[#8A8A9A]"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><FormField label="Nome *"><Inp value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="Ex: Lançamento Q4" /></FormField></div>
              <div className="col-span-2"><FormField label="Objetivo"><Inp value={form.objective} onChange={(v) => setForm((f) => ({ ...f, objective: v }))} placeholder="Gerar awareness para o produto" /></FormField></div>
              <div className="col-span-2"><FormField label="Público-alvo"><Inp value={form.audience} onChange={(v) => setForm((f) => ({ ...f, audience: v }))} placeholder="Gerentes de marketing B2B" /></FormField></div>
              <FormField label="Início"><Inp type="date" value={form.startDate} onChange={(v) => setForm((f) => ({ ...f, startDate: v }))} /></FormField>
              <FormField label="Término"><Inp type="date" value={form.endDate} onChange={(v) => setForm((f) => ({ ...f, endDate: v }))} /></FormField>
              <FormField label="Meta de alcance"><Inp type="number" value={form.targetReach} onChange={(v) => setForm((f) => ({ ...f, targetReach: v }))} placeholder="50000" /></FormField>
              <FormField label="Meta de interações"><Inp type="number" value={form.targetInteractions} onChange={(v) => setForm((f) => ({ ...f, targetInteractions: v }))} placeholder="3000" /></FormField>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-[#8A8A9A] mb-2">Canais</label>
                <div className="flex gap-2 flex-wrap">
                  {(['instagram', 'linkedin', 'site', 'email'] as ChannelType[]).map((ch) => (
                    <button key={ch} onClick={() => toggleChannel(ch)} className="filter-pill text-xs px-3 py-1.5 rounded-full font-medium transition-all"
                      style={form.channels.includes(ch) ? { background: CH[ch].dot, color: '#fff' } : { background: CH[ch].bg, color: CH[ch].color }}>
                      {CH[ch].label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <button onClick={submitCampaign} className="px-5 py-2 rounded-xl text-sm font-medium text-white hover:opacity-90 btn-glow"
                style={{ background: 'linear-gradient(135deg, #7D1AD7, #50E678)' }}>Criar Campanha</button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-sm font-medium text-[#8A8A9A] hover:bg-[rgba(255,255,255,0.08)]">Cancelar</button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {filtered.map((camp) => {
            const st = statusStyle[camp.status]
            const expanded = expandedMetrics[camp.id]
            const mf = metricForms[camp.id] ?? { date: '', reach: '', interactions: '' }
            const chartData = camp.dailyEntries.map((e) => ({
              date: e.date.slice(5), reach: e.reach, interactions: e.interactions,
            }))

            return (
              <div key={camp.id} className="analytic-card bg-[#17171A] rounded-2xl p-5" style={{ border: '1.5px solid rgba(255,255,255,0.1)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-[#F0F0F5]">{camp.name}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                    </div>
                    <p className="text-sm text-[#8A8A9A]">{camp.objective}</p>
                    <p className="text-xs text-[#555566] mt-0.5">Público: {camp.audience}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {camp.daysRunning > 0 && (
                      <span className="text-xs" style={{ color: '#555566' }}>
                        <span style={{ color: '#7D1AD7', fontWeight: 600 }}>{camp.daysRunning}</span>d no ar
                      </span>
                    )}
                    <button onClick={() => deleteCampaign(camp.id)} className="p-1.5 rounded-lg text-[#555566] hover:text-[#FF5252] hover:bg-[rgba(255,82,82,0.12)] transition-all">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className="flex gap-1.5 mb-4">
                  {camp.channels.map((ch) => <ChannelBadge key={ch} ch={ch} small />)}
                  <span className="text-xs text-[#555566] ml-1">{camp.startDate} → {camp.endDate}</span>
                </div>

                {camp.status !== 'planejada' && (
                  <div className="grid grid-cols-2 gap-6 mb-4">
                    <div><div className="text-xs font-medium text-[#8A8A9A] mb-1.5 flex items-center gap-1"><Target size={11} /> Alcance</div>
                      <ProgressBar value={camp.reach} target={camp.targetReach} color="#7D1AD7" /></div>
                    <div><div className="text-xs font-medium text-[#8A8A9A] mb-1.5 flex items-center gap-1"><BarChart2 size={11} /> Interações</div>
                      <ProgressBar value={camp.interactions} target={camp.targetInteractions} color="#00C853" /></div>
                  </div>
                )}

                {/* Daily metrics section */}
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                  <button onClick={() => setExpandedMetrics((p) => ({ ...p, [camp.id]: !expanded }))}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-[#F0F0F5] hover:bg-[#202024] transition-colors">
                    <span className="flex items-center gap-2"><BarChart2 size={14} className="text-[#7D1AD7]" /> Métricas diárias ({camp.dailyEntries.length} registros)</span>
                    <ChevronRight size={14} className="text-[#555566] transition-transform" style={{ transform: expanded ? 'rotate(90deg)' : 'none' }} />
                  </button>

                  {expanded && (
                    <div className="px-4 pb-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      {/* Add entry form */}
                      <div className="pt-3 pb-3 flex gap-3 items-end flex-wrap">
                        <div className="flex-1 min-w-32">
                          <label className="block text-xs text-[#8A8A9A] mb-1">Data</label>
                          <input type="date" value={mf.date} onChange={(e) => setMetricForms((p) => ({ ...p, [camp.id]: { ...mf, date: e.target.value } }))}
                            className="w-full text-xs px-2.5 py-2 rounded-lg border border-[rgba(255,255,255,0.1)] focus:outline-none focus:border-[#7D1AD7]" />
                        </div>
                        <div className="flex-1 min-w-24">
                          <label className="block text-xs text-[#8A8A9A] mb-1">Alcance</label>
                          <input type="number" value={mf.reach} onChange={(e) => setMetricForms((p) => ({ ...p, [camp.id]: { ...mf, reach: e.target.value } }))}
                            placeholder="0" className="w-full text-xs px-2.5 py-2 rounded-lg border border-[rgba(255,255,255,0.1)] focus:outline-none focus:border-[#7D1AD7]" />
                        </div>
                        <div className="flex-1 min-w-24">
                          <label className="block text-xs text-[#8A8A9A] mb-1">Interações</label>
                          <input type="number" value={mf.interactions} onChange={(e) => setMetricForms((p) => ({ ...p, [camp.id]: { ...mf, interactions: e.target.value } }))}
                            placeholder="0" className="w-full text-xs px-2.5 py-2 rounded-lg border border-[rgba(255,255,255,0.1)] focus:outline-none focus:border-[#7D1AD7]" />
                        </div>
                        <button onClick={() => addMetricEntry(camp.id)} className="flex items-center gap-1 text-xs px-3 py-2 rounded-xl font-medium text-white hover:opacity-90 btn-glow"
                          style={{ background: '#7D1AD7' }}>
                          <Plus size={12} /> Registrar
                        </button>
                      </div>

                      {/* Chart */}
                      {chartData.length > 0 && (
                        <div style={{ height: 160, marginBottom: 12 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#555566' }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fontSize: 10, fill: '#555566' }} axisLine={false} tickLine={false} />
                              <Tooltip contentStyle={{ background: '#17171A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 11, color: '#F0F0F5' }}
                                formatter={(v) => Number(v ?? 0).toLocaleString('pt-BR')} />
                              <ReferenceLine y={camp.targetReach} stroke="#7D1AD7" strokeDasharray="4 4" label={{ value: 'Meta alcance', fill: '#7D1AD7', fontSize: 10 }} />
                              <Line type="monotone" dataKey="reach" name="Alcance" stroke="#7D1AD7" strokeWidth={2} dot={{ r: 3 }} />
                              <Line type="monotone" dataKey="interactions" name="Interações" stroke="#00C853" strokeWidth={2} dot={{ r: 3 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      {/* Entries table */}
                      {camp.dailyEntries.length > 0 && (
                        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                          {camp.dailyEntries.map((entry, i) => (
                            <div key={entry.date} className="flex items-center justify-between px-3 py-2 text-xs group"
                              style={{ background: i % 2 === 0 ? '#202024' : '#17171A', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.06)' : undefined }}>
                              <span style={{ color: '#8A8A9A' }}>{entry.date}</span>
                              <span style={{ color: '#7D1AD7' }}>Alcance: {entry.reach.toLocaleString('pt-BR')}</span>
                              <span style={{ color: '#00C853' }}>Interações: {entry.interactions.toLocaleString('pt-BR')}</span>
                              <button onClick={() => entry.id && deleteMetricEntry(camp.id, entry.id)} className="opacity-0 group-hover:opacity-100 text-[#FF5252] hover:text-[#FF5252]">
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      {camp.dailyEntries.length === 0 && (
                        <p className="text-xs text-[#555566] text-center py-2">Nenhum registro ainda</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Engagement ────────────────────────────────────────────────────────────

type NoteCategory = 'feedbacks' | 'alertas' | 'outros'
interface MemberNotes { feedbacks: string; alertas: string; outros: string }
interface EngagementCriterion { id: string; nome: string; ordem: number }
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
type AttendanceStatus = 'PRESENTE' | 'AUSENTE' | 'ATRASADO'
interface AttendanceEvent {
  id: string
  titulo: string
  data: string
  horario: string
  horarioFim: string | null
  pendente: boolean
  participantes: { userId: string; nome: string; status: AttendanceStatus | null }[]
}
const CRITERION_COLORS = ['#7D1AD7', '#FFB300', '#00E5C8', '#E1306C', '#507AE6', '#50E678']

function StarDisplay({ val, color }: { val: number; color: string }) {
  const full = Math.floor(val)
  const frac = val - full
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg key={s} width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M6 1l1.2 3.6H11L8.2 6.9l1 3.1L6 8.4 2.8 10l1-3.1L1 4.6h3.8z"
            fill={s <= full ? color : s === full + 1 && frac >= 0.5 ? color : 'rgba(255,255,255,0.1)'}
            opacity={s === full + 1 && frac > 0 && frac < 0.5 ? 0.4 : 1} />
        </svg>
      ))}
    </div>
  )
}

// Componente de nível de módulo (não aninhado em EngagementView): se fosse recriado a cada render,
// o React trocaria a identidade do componente a cada tecla digitada e o <input> perderia o foco no meio
// da digitação.
function StarScore({ editMode, isQuality, val, autoVal, color, draftValue, onChange, onBlur }: {
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
        <div className="flex items-center gap-1.5"><StarDisplay val={val} color={color} /><span className="text-xs text-[#8A8A9A]">{val.toFixed(1)}</span></div>
        <span className="text-xs text-[#00C853]">calculada pelas notas das tasks</span>
      </div>
    )
  }

  if (editMode) {
    return (
      <div className="flex items-center gap-1.5">
        <input type="number" min={0} max={5} step={0.1} value={draftValue}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          onFocus={(e) => e.target.select()}
          className="w-16 text-xs px-2 py-1 rounded border border-[rgba(255,255,255,0.1)] focus:outline-none focus:border-[#7D1AD7] text-center" />
        <span className="text-xs text-[#555566]">/ 5</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5">
        <StarDisplay val={val} color={color} />
        <span className="text-xs" style={{ color: '#8A8A9A' }}>{val.toFixed(1)}</span>
      </div>
      {isQuality && autoVal !== null && (
        <div className="text-xs"><span className="text-[#00C853]">auto</span></div>
      )}
    </div>
  )
}

function CriteriaManagerModal({ criteria, onClose, onCreate, onRename, onDelete }: {
  criteria: EngagementCriterion[]
  onClose: () => void
  onCreate: (nome: string) => Promise<void>
  onRename: (id: string, nome: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submitCreate() {
    if (!newName.trim()) return
    setBusy(true); setError('')
    try { await onCreate(newName.trim()); setNewName('') }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível criar o critério.') }
    finally { setBusy(false) }
  }
  async function submitRename(id: string) {
    if (!editValue.trim()) { setEditingId(null); return }
    setBusy(true); setError('')
    try { await onRename(id, editValue.trim()); setEditingId(null) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível renomear.') }
    finally { setBusy(false) }
  }
  async function confirmDelete(id: string) {
    setBusy(true); setError('')
    try { await onDelete(id); setDeleteId(null) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível apagar.') }
    finally { setBusy(false) }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-[#17171A] rounded-2xl shadow-2xl max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 className="font-semibold text-[#F0F0F5]">Critérios de avaliação</h3>
          <button onClick={onClose} className="text-[#555566] hover:text-[#8A8A9A]"><X size={18} /></button>
        </div>
        <div className="px-6 py-4 space-y-2 max-h-80 overflow-y-auto">
          {criteria.map((c) => (
            <div key={c.id}>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: '#202024', border: '1px solid rgba(255,255,255,0.1)' }}>
                {editingId === c.id ? (
                  <input autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') submitRename(c.id) }}
                    className="flex-1 text-sm bg-transparent focus:outline-none text-[#F0F0F5]" />
                ) : (
                  <span className="flex-1 text-sm text-[#F0F0F5] truncate">{c.nome}</span>
                )}
                {editingId === c.id ? (
                  <>
                    <button onClick={() => submitRename(c.id)} disabled={busy} className="text-[#00C853] hover:opacity-80 disabled:opacity-50"><Check size={14} /></button>
                    <button onClick={() => setEditingId(null)} className="text-[#555566] hover:text-[#8A8A9A]"><X size={14} /></button>
                  </>
                ) : (
                  <>
                    <button onClick={() => { setEditingId(c.id); setEditValue(c.nome); setError('') }} className="text-[#555566] hover:text-[#7D1AD7]" aria-label={`Renomear ${c.nome}`}><Edit2 size={13} /></button>
                    <button onClick={() => setDeleteId(c.id)} className="text-[#555566] hover:text-[#FF5252]" aria-label={`Apagar ${c.nome}`}><Trash2 size={13} /></button>
                  </>
                )}
              </div>
              {deleteId === c.id && (
                <div className="mt-1 px-3 py-2.5 rounded-xl flex items-center justify-between gap-3" style={{ background: 'rgba(255,82,82,0.15)', border: '1px solid #FF5252' }}>
                  <p className="text-xs text-[#FF5252] flex-1">Apagar <strong>{c.nome}</strong>? As notas dadas nele se perdem.</p>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button onClick={() => confirmDelete(c.id)} disabled={busy} className="text-xs px-2.5 py-1 rounded-lg font-medium text-white bg-[#FF5252] hover:bg-[#E64545] disabled:opacity-50">Apagar</button>
                    <button onClick={() => setDeleteId(null)} className="text-xs px-2.5 py-1 rounded-lg font-medium text-[#8A8A9A] hover:bg-[rgba(255,255,255,0.08)]">Cancelar</button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {criteria.length === 0 && <p className="text-xs text-[#555566] text-center py-2">Nenhum critério ainda.</p>}
        </div>
        <div className="px-6 pb-6 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {error && <p className="text-xs text-[#FF5252] rounded-lg px-3 py-2 mt-3">{error}</p>}
          <div className="flex gap-2 mt-3">
            <input value={newName} onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submitCreate() }}
              placeholder="Novo critério…" className="flex-1 text-sm px-3 py-2 rounded-xl border border-[rgba(255,255,255,0.1)] focus:outline-none focus:border-[#7D1AD7]" />
            <button onClick={submitCreate} disabled={busy} className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl font-medium text-white btn-glow disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #7D1AD7, #50E678)' }}><Plus size={14} /> Adicionar</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

function EngagementView({ columns }: { columns: KanbanColumn[] }) {
  const period = new Date().toISOString().slice(0, 7)
  const [data, setData] = useState<EngagementRow[]>([])
  const [criteria, setCriteria] = useState<EngagementCriterion[]>([])
  const [editMode, setEditMode] = useState(false)
  const [criteriaModalOpen, setCriteriaModalOpen] = useState(false)
  const [attendanceEvents, setAttendanceEvents] = useState<AttendanceEvent[]>([])
  const [attendanceDrafts, setAttendanceDrafts] = useState<Record<string, Record<string, AttendanceStatus | null>>>({})
  const [savingAttendance, setSavingAttendance] = useState<string | null>(null)
  const [attendanceError, setAttendanceError] = useState('')
  const [expandedMember, setExpandedMember] = useState<number | string | null>(null)
  const [notes, setNotes] = useState<Record<string, MemberNotes>>({})
  async function loadEngagement() {
    const [result, attendanceResult] = await Promise.all([api.engagement.get(period), api.engagement.attendance(period)])
    setCriteria(result.criterios)
    setAttendanceEvents(attendanceResult.eventos)
    setAttendanceDrafts(Object.fromEntries(attendanceResult.eventos.map((event: AttendanceEvent) => [event.id, Object.fromEntries(event.participantes.map((participant) => [participant.userId, participant.status]))])))
    const nextNotes: Record<string, MemberNotes> = {}
    const rows = result.membros.map((member: any, index: number) => {
      let observation: MemberNotes = { feedbacks: '', alertas: '', outros: '' }
      if (member.observacoes) {
        try { observation = { ...observation, ...JSON.parse(member.observacoes) } } catch { observation.feedbacks = member.observacoes }
      }
      nextNotes[member.userId] = observation
      const scores: Record<string, number> = {}
      for (const c of result.criterios) scores[c.id] = member.scores[c.id] ?? 0
      return { memberId: member.userId, name: member.nome, role: member.cargo ?? 'Analista', initials: member.nome.split(/\s+/).slice(0, 2).map((part: string) => part[0]).join('').toUpperCase(), color: ['#507AE6', '#50E678', '#E1306C', '#FFB300', '#7D1AD7'][index % 5], scores, quality: member.qualidade ?? 0, presence: member.presenca ?? 0, punctuality: member.pontualidade ?? 0, registeredEvents: member.eventosRegistrados, attendances: member.comparecimentos, tasksCompleted: member.tasksConcluidas, tasksTotal: member.tasksTotal }
    })
    setData(rows); setNotes(nextNotes)
  }

  useEffect(() => {
    loadEngagement().catch(console.error)
    const refresh = window.setInterval(() => loadEngagement().catch(console.error), 60_000)
    return () => window.clearInterval(refresh)
  }, [])

  async function createCriterion(nome: string) { await api.engagement.createCriterion(nome); await loadEngagement() }
  async function renameCriterion(id: string, nome: string) { await api.engagement.updateCriterion(id, nome); await loadEngagement() }
  async function deleteCriterion(id: string) { await api.engagement.removeCriterion(id); await loadEngagement() }

  function setAttendance(eventId: string, userId: string, status: AttendanceStatus) {
    setAttendanceDrafts((current) => ({ ...current, [eventId]: { ...current[eventId], [userId]: status } }))
  }

  async function saveEventAttendance(event: AttendanceEvent) {
    const draft = attendanceDrafts[event.id] ?? {}
    if (event.participantes.some((participant) => !draft[participant.userId])) { setAttendanceError('Marque todos os membros antes de salvar.'); return }
    setSavingAttendance(event.id); setAttendanceError('')
    try {
      await api.engagement.saveAttendance(event.id, event.participantes.map((participant) => ({ userId: participant.userId, status: draft[participant.userId] })))
      await loadEngagement()
    } catch (cause) { setAttendanceError(cause instanceof Error ? cause.message : 'Não foi possível salvar a presença.') }
    finally { setSavingAttendance(null) }
  }

  async function toggleEditMode() {
    if (editMode) {
      // Um campo deixado vazio (rascunho pendente sem valor válido) conta como 0 ao salvar, em vez de
      // reverter para o valor anterior — o rascunho nunca chegou a ser comprometido em `data`.
      const draftAsZero = (memberId: number | string, criterionId: string, committed: number) => {
        const key = scoreDraftKey(memberId, criterionId)
        if (!(key in scoreDrafts)) return committed
        const raw = scoreDrafts[key]
        return raw === '' || raw === '-' || Number.isNaN(parseFloat(raw)) ? 0 : committed
      }
      const resolved = data.map((row) => ({
        ...row,
        scores: Object.fromEntries(criteria.map((c) => [c.id, draftAsZero(row.memberId, c.id, row.scores[c.id] ?? 0)])),
      }))
      setData(resolved)
      setScoreDrafts({})
      await Promise.all(resolved.map((row) => api.engagement.update(row.memberId, period, {
        scores: criteria.map((c) => ({ criterionId: c.id, valor: row.scores[c.id] ?? 0 })),
        observacoes: JSON.stringify(notes[String(row.memberId)] ?? {}),
      })))
      await loadEngagement()
    }
    setEditMode((value) => !value)
  }

  function calcQuality(memberId: number | string): number | null {
    const rated: number[] = []
    columns.forEach((col) => col.tasks.forEach((task) => {
      const a = task.assignees.find((x) => x.memberId === memberId)
      if (a && a.note !== null) rated.push(a.note)
    }))
    if (rated.length === 0) return null
    return parseFloat((rated.reduce((s, v) => s + v, 0) / rated.length).toFixed(2))
  }

  function effectiveQuality(memberId: number | string): number {
    return data.find((r) => r.memberId === memberId)?.quality ?? calcQuality(memberId) ?? 0
  }

  function updateScore(memberId: number | string, criterionId: string, value: string) {
    const num = Math.max(0, Math.min(5, parseFloat(value) || 0))
    setData((prev) => prev.map((r) => r.memberId !== memberId ? r : { ...r, scores: { ...r.scores, [criterionId]: num } }))
  }

  // Rascunho de texto separado do valor numérico comprometido: permite apagar o campo inteiro (ficar
  // vazio) sem que parseFloat('') vire 0 e "prenda" o campo mostrando 0 enquanto o usuário ainda digita.
  const [scoreDrafts, setScoreDrafts] = useState<Record<string, string>>({})
  function scoreDraftKey(memberId: number | string, criterionId: string) { return `${memberId}:${criterionId}` }
  function scoreDraftValue(memberId: number | string, criterionId: string, committed: number) {
    const key = scoreDraftKey(memberId, criterionId)
    return key in scoreDrafts ? scoreDrafts[key] : String(committed)
  }
  function onScoreChange(memberId: number | string, criterionId: string, raw: string) {
    const key = scoreDraftKey(memberId, criterionId)
    setScoreDrafts((prev) => ({ ...prev, [key]: raw }))
    if (raw === '' || raw === '-') return
    if (!Number.isNaN(parseFloat(raw))) updateScore(memberId, criterionId, raw)
  }
  function onScoreBlur(memberId: number | string, criterionId: string) {
    const key = scoreDraftKey(memberId, criterionId)
    const raw = scoreDrafts[key]
    // Clicar no botão "Salvar" tira o foco do campo (blur) antes do clique em si ser processado — se o
    // rascunho ficar vazio/inválido aqui sem ser resolvido, o botão Salvar nunca chega a ver que o campo
    // estava vazio e reenvia o valor antigo. Por isso resolve para 0 aqui, não só no clique de salvar.
    if (raw !== undefined && (raw === '' || raw === '-' || Number.isNaN(parseFloat(raw)))) updateScore(memberId, criterionId, '0')
    setScoreDrafts((prev) => { const next = { ...prev }; delete next[key]; return next })
  }

  function updateNote(memberId: number | string, cat: NoteCategory, value: string) {
    const key = String(memberId)
    setNotes((prev) => ({ ...prev, [key]: { ...(prev[key] ?? { feedbacks: '', alertas: '', outros: '' }), [cat]: value } }))
  }

  const avgQuality = (data.length ? data.reduce((a, r) => a + effectiveQuality(r.memberId), 0) / data.length : 0).toFixed(1)
  const avgPresence = (data.length ? data.reduce((a, r) => a + r.presence, 0) / data.length : 0).toFixed(1)
  const avgPunctuality = (data.length ? data.reduce((a, r) => a + r.punctuality, 0) / data.length : 0).toFixed(1)
  const avgFor = (criterionId: string) => (data.length ? data.reduce((a, r) => a + (r.scores[criterionId] ?? 0), 0) / data.length : 0).toFixed(1)

  const NOTE_CATS: { key: NoteCategory; label: string; color: string; bg: string }[] = [
    { key: 'feedbacks', label: 'Feedbacks', color: '#507AE6', bg: 'rgba(125,26,215,0.08)' },
    { key: 'alertas', label: 'Alertas', color: '#FFB300', bg: 'rgba(255,179,0,0.15)' },
    { key: 'outros', label: 'Outros', color: '#555566', bg: 'rgba(255,255,255,0.08)' },
  ]

  return (
    <div className="h-full overflow-auto p-5">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold text-[#F0F0F5] flex items-center gap-2">
              <Users size={18} className="text-[#7D1AD7]" /> Engajamento do Time
            </h2>
            <p className="text-sm text-[#8A8A9A] mt-0.5">Visível apenas para a Gerente · {new Date(`${period}-02`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })} · Escala 0–5</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setCriteriaModalOpen(true)} className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl transition-all hover:border-[rgba(255,255,255,0.2)]"
              style={{ background: 'rgba(255,255,255,0.04)', color: '#8A8A9A', border: '1.5px solid rgba(255,255,255,0.1)' }}>
              <Settings size={15} /> Critérios
            </button>
            <button onClick={toggleEditMode} className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl transition-all"
              style={editMode ? { background: '#00C853', color: '#fff', border: '1.5px solid transparent' } : { background: 'rgba(125,26,215,0.08)', color: '#507AE6', border: '1.5px solid rgba(125,26,215,0.2)' }}>
              {editMode ? <><Check size={15} /> Salvar</> : <><Edit2 size={15} /> Editar</>}
            </button>
          </div>
        </div>

        {attendanceEvents.some((event) => event.pendente) && (
          <div className="mb-5 rounded-2xl px-5 py-4 flex items-center gap-3" style={{ background: 'rgba(255,179,0,0.12)', border: '1px solid rgba(255,179,0,0.35)' }}>
            <Clock size={20} className="text-[#FFB300]" />
            <div><p className="text-sm font-semibold text-[#F0F0F5]">Registro de presença pendente</p><p className="text-xs text-[#B9B9C5]">{attendanceEvents.filter((event) => event.pendente).length} evento(s) encerrado(s) aguardando confirmação.</p></div>
          </div>
        )}

        {attendanceEvents.length > 0 && (
          <section className="mb-6 rounded-2xl p-5 bg-[#17171A]" style={{ border: '1.5px solid rgba(255,255,255,0.1)' }}>
            <div className="mb-4"><h3 className="text-sm font-semibold text-[#F0F0F5]">Presença após eventos</h3><p className="text-xs text-[#8A8A9A] mt-1">Disponível somente para a gerente. Os registros continuam editáveis após salvar.</p></div>
            <div className="space-y-3">
              {attendanceEvents.map((event) => (
                <div key={event.id} className="rounded-xl p-4 bg-[#202024]" style={{ border: event.pendente ? '1px solid rgba(255,179,0,.35)' : '1px solid rgba(255,255,255,.08)' }}>
                  <div className="flex items-center justify-between gap-3 mb-3"><div><p className="text-sm font-medium text-[#F0F0F5]">{event.titulo}</p><p className="text-xs text-[#8A8A9A]">{new Date(event.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} · {event.horario}{event.horarioFim ? `–${event.horarioFim}` : ''}</p></div>{event.pendente && <span className="text-[10px] font-semibold px-2 py-1 rounded-full text-[#FFB300] bg-[rgba(255,179,0,.12)]">Pendente</span>}</div>
                  <div className="space-y-2">
                    {event.participantes.map((participant) => { const selected = attendanceDrafts[event.id]?.[participant.userId]; return (
                      <div key={participant.userId} className="flex items-center justify-between gap-3"><span className="text-xs text-[#D5D5DE]">{participant.nome}</span><div className="flex gap-1.5">
                        {([{ status: 'PRESENTE', label: 'Presente', icon: <Check size={14} />, color: '#00C853' }, { status: 'AUSENTE', label: 'Ausente', icon: <X size={14} />, color: '#FF5252' }, { status: 'ATRASADO', label: 'Atrasado', icon: <Clock size={14} />, color: '#FFB300' }] as const).map((option) => <button key={option.status} onClick={() => setAttendance(event.id, participant.userId, option.status)} aria-label={`${option.label}: ${participant.nome}`} title={option.label} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all" style={{ color: option.color, background: selected === option.status ? `${option.color}26` : 'rgba(255,255,255,.04)', border: `1px solid ${selected === option.status ? option.color : 'rgba(255,255,255,.08)'}` }}>{option.icon}</button>)}
                      </div></div>
                    )})}
                  </div>
                  <div className="flex justify-end mt-3"><button onClick={() => saveEventAttendance(event)} disabled={savingAttendance === event.id || event.participantes.length === 0} className="text-xs font-semibold px-3 py-2 rounded-lg text-white bg-[#7D1AD7] disabled:opacity-50">{savingAttendance === event.id ? 'Salvando…' : event.pendente ? 'Confirmar registro' : 'Salvar edição'}</button></div>
                </div>
              ))}
            </div>
            {attendanceError && <p className="text-xs text-[#FF5252] mt-3" role="alert">{attendanceError}</p>}
          </section>
        )}

        <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: `repeat(${criteria.length + 3}, minmax(0, 1fr))` }}>
          <div className="kpi-card bg-[#17171A] rounded-xl p-4" style={{ border: '1.5px solid rgba(255,255,255,0.1)' }}><div className="text-2xl font-bold mb-1 text-[#00C853]">{avgPresence}<span className="text-sm font-normal text-[#555566]">/5</span></div><div className="text-xs text-[#8A8A9A]">Média Presença</div></div>
          <div className="kpi-card bg-[#17171A] rounded-xl p-4" style={{ border: '1.5px solid rgba(255,255,255,0.1)' }}><div className="text-2xl font-bold mb-1 text-[#FFB300]">{avgPunctuality}<span className="text-sm font-normal text-[#555566]">/5</span></div><div className="text-xs text-[#8A8A9A]">Média Pontualidade</div></div>
          {criteria.map((c, i) => (
            <div key={c.id} className="kpi-card bg-[#17171A] rounded-xl p-4" style={{ border: '1.5px solid rgba(255,255,255,0.1)' }}>
              <div className="text-2xl font-bold mb-1" style={{ color: CRITERION_COLORS[i % CRITERION_COLORS.length] }}>{avgFor(c.id)}<span className="text-sm font-normal text-[#555566]">/5</span></div>
              <div className="text-xs text-[#8A8A9A]">Média {c.nome}</div>
            </div>
          ))}
          <div className="kpi-card bg-[#17171A] rounded-xl p-4" style={{ border: '1.5px solid rgba(255,255,255,0.1)' }}>
            <div className="text-2xl font-bold mb-1" style={{ color: '#00C853' }}>{avgQuality}<span className="text-sm font-normal text-[#555566]">/5</span></div>
            <div className="text-xs text-[#8A8A9A]">Média Qualidade</div>
          </div>
        </div>

        <div className="space-y-3">
          {data.map((row) => {
            const member = row
            const isExpanded = expandedMember === row.memberId
            const memberNotes = notes[String(row.memberId)] ?? { feedbacks: '', alertas: '', outros: '' }
            const hasNotes = memberNotes.feedbacks || memberNotes.alertas || memberNotes.outros

            return (
              <div key={row.memberId} className="bg-[#17171A] rounded-2xl overflow-hidden" style={{ border: '1.5px solid rgba(255,255,255,0.1)' }}>
                {/* Main row */}
                <div className="px-5 py-4">
                  <div className="flex items-center gap-4">
                    {/* Avatar + name */}
                    <div className="flex items-center gap-2.5 w-44 flex-shrink-0">
                      <div className="flex items-center justify-center rounded-full text-white font-bold text-xs flex-shrink-0"
                        style={{ width: 32, height: 32, background: member.color }}>
                        {member.initials}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-[#F0F0F5]">{member.name}</div>
                        <div className="text-xs text-[#555566]">{member.role}</div>
                      </div>
                    </div>

                    {/* Scores */}
                    <div className="flex items-center gap-6 flex-1 flex-wrap">
                      <div className="min-w-0"><div className="text-xs text-[#555566] mb-1">Presença</div><StarScore editMode={false} isQuality={false} val={row.presence} autoVal={null} color="#00C853" draftValue="" onChange={() => undefined} onBlur={() => undefined} /><div className="text-[10px] text-[#555566]">{row.attendances}/{row.registeredEvents} eventos</div></div>
                      <div className="min-w-0"><div className="text-xs text-[#555566] mb-1">Pontualidade</div><StarScore editMode={false} isQuality={false} val={row.punctuality} autoVal={null} color="#FFB300" draftValue="" onChange={() => undefined} onBlur={() => undefined} /></div>
                      {criteria.map((c, i) => (
                        <div key={c.id} className="min-w-0">
                          <div className="text-xs text-[#555566] mb-1">{c.nome}</div>
                          <StarScore editMode={editMode} isQuality={false} val={row.scores[c.id] ?? 0} autoVal={null} color={CRITERION_COLORS[i % CRITERION_COLORS.length]}
                            draftValue={scoreDraftValue(row.memberId, c.id, row.scores[c.id] ?? 0)}
                            onChange={(raw) => onScoreChange(row.memberId, c.id, raw)}
                            onBlur={() => onScoreBlur(row.memberId, c.id)} />
                        </div>
                      ))}
                      <div className="min-w-0">
                        <div className="text-xs text-[#555566] mb-1">Qualidade</div>
                        <StarScore editMode={editMode} isQuality={true} val={effectiveQuality(row.memberId)} autoVal={calcQuality(row.memberId)} color="#00C853"
                          draftValue="" onChange={() => undefined} onBlur={() => undefined} />
                      </div>
                    </div>

                    {/* Tasks */}
                    <div className="flex-shrink-0 w-36">
                      <div className="text-xs text-[#555566] mb-1">Tasks</div>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                          <div className="h-full rounded-full" style={{ width: `${row.tasksTotal ? (row.tasksCompleted / row.tasksTotal) * 100 : 0}%`, background: '#7D1AD7' }} />
                        </div>
                        <span className="text-xs" style={{ color: '#8A8A9A' }}>{row.tasksCompleted}/{row.tasksTotal}</span>
                      </div>
                    </div>

                    {/* Expand button */}
                    <button
                      onClick={() => setExpandedMember(isExpanded ? null : row.memberId)}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium flex-shrink-0 transition-all"
                      style={isExpanded ? { background: 'rgba(125,26,215,0.08)', color: '#507AE6' } : { background: '#202024', color: '#8A8A9A' }}>
                      <Edit2 size={11} />
                      Obs.
                      {hasNotes && <span className="w-1.5 h-1.5 rounded-full bg-[#7D1AD7] ml-0.5" />}
                    </button>
                  </div>
                </div>

                {/* Expandable observations panel */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <p className="text-xs font-semibold text-[#8A8A9A] uppercase tracking-wide mb-3">Observações do gerente</p>
                    <div className="grid grid-cols-3 gap-3">
                      {NOTE_CATS.map((cat) => (
                        <div key={cat.key}>
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: cat.bg, color: cat.color }}>
                              {cat.label}
                            </span>
                          </div>
                          <textarea
                            value={memberNotes[cat.key]}
                            onChange={(e) => updateNote(row.memberId, cat.key, e.target.value)}
                            placeholder={`${cat.label} sobre ${member.name.split(' ')[0]}…`}
                            rows={4}
                            className="w-full text-xs px-3 py-2 rounded-xl border resize-none focus:outline-none transition-colors"
                            style={{
                              border: `1.5px solid ${memberNotes[cat.key] ? cat.color + '50' : 'rgba(255,255,255,0.1)'}`,
                              background: memberNotes[cat.key] ? cat.bg : '#202024',
                              color: '#F0F0F5',
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
        <CriteriaManagerModal criteria={criteria} onClose={() => setCriteriaModalOpen(false)}
          onCreate={createCriterion} onRename={renameCriterion} onDelete={deleteCriterion} />
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────

interface Props {
  profile: Profile
  isManager: boolean
  channel: Channel
  setChannel: (c: Channel) => void
  currentUserId: string | number
}

export default function Monitoramento({ profile, isManager, channel, setChannel, currentUserId }: Props) {
  const [tab, setTab] = useState<Tab>('kanban')
  const [columns, setColumns] = useState<KanbanColumn[]>([])
  const [members, setMembers] = useState<TaskMember[]>([])

  useEffect(() => {
    Promise.all([api.kanban.columns(), api.kanban.assignees()]).then(([rawColumns, rawMembers]) => {
      setColumns(rawColumns.map(mapColumn))
      setMembers(rawMembers.map((member: any, index: number) => ({
        id: member.id,
        name: member.nomeCompleto,
        role: member.cargo,
        initials: member.nomeCompleto.split(/\s+/).slice(0, 2).map((part: string) => part[0]).join('').toUpperCase(),
        color: ['#507AE6', '#50E678', '#E1306C', '#FFB300', '#7D1AD7'][index % 5],
      })))
    }).catch(console.error)
  }, [])

  const allTabs: { id: Tab; label: string; icon: React.ReactNode; gOnly?: boolean }[] = [
    { id: 'kanban', label: 'Kanban', icon: <Columns3 size={14} /> },
    { id: 'calendario', label: 'Calendário', icon: <Calendar size={14} /> },
    { id: 'campanhas', label: 'Campanhas', icon: <Target size={14} /> },
    { id: 'engajamento', label: 'Engajamento', icon: <Users size={14} />, gOnly: true },
  ]

  const tabs = allTabs.filter((t) => !t.gOnly || isManager)

  return (
    <div className="flex flex-col h-full">
      <header className="page-header bg-[#17171A] flex-shrink-0" style={{ borderBottom: '1.5px solid rgba(255,255,255,0.1)' }}>
        <div className="px-4 md:px-6 pt-4 md:pt-5 pb-0 flex items-start gap-4">
          <BrandMark />
          <div className="flex-1 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
            <div>
              <span className="page-eyebrow">Operação de marketing</span>
              <h1 className="text-lg md:text-xl font-semibold text-[#F0F0F5] leading-tight">Monitoramento</h1>
              <p className="text-xs md:text-sm text-[#8A8A9A] mt-0.5 hidden sm:block">Gerencie tasks, calendário e campanhas do time</p>
            </div>
          </div>
        </div>
        <div className="px-4 md:px-6 pt-2 md:pt-3 pb-0 overflow-x-auto">
          <TabNav tabs={tabs} active={tab} setTab={setTab} />
        </div>
      </header>
      <div className="module-stage flex-1 overflow-hidden">
        {tab === 'kanban' && <KanbanBoard channel={channel} setChannel={setChannel} isManager={isManager} members={members} setMembers={setMembers} columns={columns} setColumns={setColumns} />}
        {tab === 'calendario' && <CalendarView currentUserId={String(currentUserId)} isManager={isManager} />}
        {tab === 'campanhas' && <CampaignsView channel={channel} setChannel={setChannel} />}
        {tab === 'engajamento' && isManager && <EngagementView columns={columns} />}
      </div>
    </div>
  )
}
