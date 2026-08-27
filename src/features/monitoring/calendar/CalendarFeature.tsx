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
import { isSafeHttpsUrl } from "@/shared/lib/url"
import {
  AvatarStack,
  AttendanceSummary,
  CH,
  ChannelBadge,
  ChannelFilter,
  DIFFICULTY_FROM_API,
  DIFFICULTY_TO_API,
  FormField,
  Inp,
  mapCampaign,
  mapEvent,
  mapTask,
  Modal,
  TaskMember,
  timeRange,
  TIPO_FROM_API,
  TIPO_TO_API,
  Tab,
} from "../components/shared"
type CalView = "week" | "month" | "year"
type AttendanceStatus = "PRESENTE" | "AUSENTE" | "ATRASADO"
const PT_MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
]
const PT_MONTHS_SHORT = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
]
const PT_DAYS_SHORT = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]

function dateStr(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
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
  meeting: {
    bg: "rgba(125,26,215,0.08)",
    border: "#7D1AD7",
    color: "#507AE6",
    icon: <Clock size={11} />,
  },
  deadline: {
    bg: "rgba(255,82,82,0.15)",
    border: "#FF5252",
    color: "#FF5252",
    icon: <Flame size={11} />,
  },
  task: {
    bg: "rgba(0,200,83,0.15)",
    border: "#00C853",
    color: "#00C853",
    icon: <Check size={11} />,
  },
}

interface EventForm {
  id?: string
  date: string
  title: string
  time: string
  endTime: string
  type: "meeting" | "deadline" | "task"
  local: "meet" | "presencial" | ""
  sala: string
  linkMeet: string
  participantIds: string[]
}

interface EventParticipant {
  id: string
  name: string
  role: string
  initials: string
  color: string
}

export function CalendarView({
  currentUserId,
  isManager,
}: {
  currentUserId: string
  isManager: boolean
}) {
  const TODAY = dateStr(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [participants, setParticipants] = useState<EventParticipant[]>([])
  const [view, setView] = useState<CalView>("week")
  const [navDate, setNavDate] = useState(new Date())
  const [dayDetail, setDayDetail] = useState<string | null>(null)
  const [addModal, setAddModal] = useState<string | null>(null)
  const [form, setForm] = useState<EventForm>({
    date: "",
    title: "",
    time: "09:00",
    endTime: "09:30",
    type: "meeting",
    local: "",
    sala: "",
    linkMeet: "",
    participantIds: [],
  })
  const [saving, setSaving] = useState(false)
  const [savingAttendance, setSavingAttendance] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null)

  function loadParticipants() {
    return api.calendar.participants().then((rawParticipants) => {
      setParticipants(
        rawParticipants.map((p: any, index: number) => ({
          id: p.id,
          name: p.nomeCompleto,
          role: p.cargo ?? (p.perfil === "GERENTE" ? "Gerente" : "Analista"),
          initials: p.nomeCompleto
            .split(/\s+/)
            .slice(0, 2)
            .map((part: string) => part[0])
            .join("")
            .toUpperCase(),
          color: ["#507AE6", "#50E678", "#E1306C", "#FFB300", "#7D1AD7"][
            index % 5
          ],
        })),
      )
    })
  }

  function loadEvents() {
    return api.calendar.list().then((rawEvents) => {
      setEvents(rawEvents.map(mapEvent))
    })
  }

  useEffect(() => {
    Promise.all([loadEvents(), loadParticipants()]).catch(() =>
      setError("Não foi possível carregar o calendário."),
    )
  }, [])

  function navigate(dir: -1 | 1) {
    setNavDate((d) => {
      const nd = new Date(d)
      if (view === "week") nd.setDate(nd.getDate() + dir * 7)
      else if (view === "month") nd.setMonth(nd.getMonth() + dir)
      else nd.setFullYear(nd.getFullYear() + dir)
      return nd
    })
  }

  function openDayDetail(date: string) {
    setDayDetail(date)
    loadEvents().catch(() =>
      setError("Não foi possível atualizar o calendário."),
    )
  }

  function openAdd(date: string) {
    setForm({
      date,
      title: "",
      time: "09:00",
      endTime: "09:30",
      type: "meeting",
      local: "",
      sala: "",
      linkMeet: "",
      participantIds: [currentUserId],
    })
    setError("")
    setAddModal(date)
    loadParticipants().catch(() =>
      setError("Não foi possível carregar a lista de participantes."),
    )
  }

  function openEdit(ev: CalendarEvent) {
    setForm({
      id: ev.id,
      date: ev.date,
      title: ev.title,
      time: ev.time,
      endTime: ev.endTime,
      type: ev.type,
      local: ev.local,
      sala: ev.sala,
      linkMeet: ev.linkMeet,
      participantIds: ev.attendees.map((a) => a.userId),
    })
    setError("")
    setAddModal(ev.date)
    loadParticipants().catch(() =>
      setError("Não foi possível carregar a lista de participantes."),
    )
  }

  function toggleParticipant(userId: string) {
    setForm((f) => ({
      ...f,
      participantIds: f.participantIds.includes(userId)
        ? f.participantIds.filter((id) => id !== userId)
        : [...f.participantIds, userId],
    }))
  }

  async function saveEvent() {
    if (!form.title.trim()) return
    if (
      form.local === "meet" &&
      form.linkMeet.trim() &&
      !isSafeHttpsUrl(form.linkMeet.trim())
    ) {
      setError("Informe uma URL HTTPS válida para a reunião.")
      return
    }
    setSaving(true)
    setError("")
    try {
      const eventBeingEdited = form.id
        ? events.find((event) => event.id === form.id)
        : undefined
      const attendanceToKeep =
        eventBeingEdited?.attendanceConfirmed && form.type === "meeting"
          ? eventBeingEdited.attendees
              .filter(
                (attendee) =>
                  attendee.attendanceEligible &&
                  attendee.attendanceStatus &&
                  form.participantIds.includes(attendee.userId),
              )
              .map((attendee) => ({
                userId: attendee.userId,
                status: attendee.attendanceStatus,
              }))
          : []
      const payload = {
        titulo: form.title,
        data: form.date,
        horario: form.time,
        horarioFim: form.endTime || null,
        tipo: TIPO_TO_API[form.type],
        formatoLocal: form.local
          ? form.local === "meet"
            ? "MEET"
            : "PRESENCIAL"
          : null,
        sala: form.local === "presencial" ? form.sala || null : null,
        linkMeet: form.local === "meet" ? form.linkMeet.trim() || null : null,
        participantIds: form.participantIds,
      }
      const saved = form.id
        ? await api.calendar.update(form.id, payload)
        : await api.calendar.create(payload)
      if (form.id && attendanceToKeep.length > 0)
        await api.engagement.saveAttendance(form.id, attendanceToKeep)
      if (form.id) await loadEvents()
      else setEvents((prev) => [...prev, mapEvent(saved)])
      setAddModal(null)
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível salvar o evento.",
      )
    } finally {
      setSaving(false)
    }
  }

  async function deleteEvent(id: string) {
    setEvents((prev) => prev.filter((e) => e.id !== id))
    await api.calendar
      .remove(id)
      .catch(() => setError("Não foi possível apagar o evento."))
    setDeleteEventId(null)
  }

  function setCalendarAttendance(
    eventId: string,
    userId: string,
    status: AttendanceStatus,
  ) {
    setEvents((current) =>
      current.map((event) =>
        event.id !== eventId
          ? event
          : {
              ...event,
              attendees: event.attendees.map((attendee) =>
                attendee.userId === userId
                  ? { ...attendee, attendanceStatus: status }
                  : attendee,
              ),
            },
      ),
    )
  }

  async function saveCalendarAttendance(event: CalendarEvent) {
    const attendees = event.attendees.filter(
      (attendee) => attendee.attendanceEligible,
    )
    if (attendees.some((attendee) => !attendee.attendanceStatus)) {
      setError("Marque todos os membros antes de salvar.")
      return
    }
    setSavingAttendance(event.id)
    setError("")
    try {
      await api.engagement.saveAttendance(
        event.id,
        attendees.map((attendee) => ({
          userId: attendee.userId,
          status: attendee.attendanceStatus,
        })),
      )
      await loadEvents()
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível atualizar a presença.",
      )
    } finally {
      setSavingAttendance(null)
    }
  }

  const eventsOnDate = (d: string) => events.filter((e) => e.date === d)

  // ── Day detail modal ──
  function DayDetailModal({ date }: { date: string }) {
    const dayEvents = eventsOnDate(date)
    const [d, m, y] = [
      new Date(date + "T12:00:00").getDate(),
      PT_MONTHS[new Date(date + "T12:00:00").getMonth()],
      new Date(date + "T12:00:00").getFullYear(),
    ]
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        onClick={() => setDayDetail(null)}
      >
        <div
          className="bg-[#17171A] rounded-2xl shadow-2xl w-full max-w-sm flex flex-col max-h-[85vh] overflow-hidden"
          style={{ margin: 16 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="flex items-center justify-between px-6 py-4 flex-shrink-0"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div>
              <h3 className="font-semibold text-[#F0F0F5]">
                {d} de {m}
              </h3>
              <p className="text-xs text-[#555566]">
                {y} · {dayEvents.length} evento
                {dayEvents.length !== 1 ? "s" : ""}
              </p>
            </div>
            <button
              onClick={() => setDayDetail(null)}
              className="text-[#555566] hover:text-[#8A8A9A]"
            >
              <X size={18} />
            </button>
          </div>
          <div className="overflow-y-auto flex-1 px-6 py-4 space-y-2">
            {dayEvents.length === 0 && (
              <p className="text-sm text-[#555566] text-center py-4">
                Nenhum evento neste dia.
              </p>
            )}
            {dayEvents.map((ev) => {
              const s = typeStyle[ev.type]
              return (
                <div
                  key={ev.id}
                  className="group rounded-xl px-3 py-2.5 flex items-start justify-between gap-2"
                  style={{
                    background: s.bg,
                    border: `1.5px solid ${s.border}`,
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span style={{ color: s.color }}>{s.icon}</span>
                      <span
                        className="text-xs font-semibold"
                        style={{ color: s.color }}
                      >
                        {timeRange(ev)}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-[#F0F0F5] leading-snug">
                      {ev.title}
                    </p>
                    {ev.local && (
                      <p
                        className="text-xs mt-0.5"
                        style={{ color: "#8A8A9A" }}
                      >
                        {ev.local === "meet" ? (
                          ev.linkMeet ? (
                            <a
                              href={ev.linkMeet}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="underline hover:text-[#7D1AD7]"
                              style={{ color: "#7D1AD7" }}
                            >
                              Entrar no Google Meet
                            </a>
                          ) : (
                            "Google Meet"
                          )
                        ) : (
                          `Presencial${ev.sala ? ` — ${ev.sala}` : ""}`
                        )}
                      </p>
                    )}
                    {ev.attendees.length > 0 && (
                      <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                        {ev.attendees.map((a) => (
                          <span
                            key={a.userId}
                            title={a.nome}
                            className="flex items-center justify-center rounded-full text-white font-bold flex-shrink-0"
                            style={{
                              width: 18,
                              height: 18,
                              fontSize: 8,
                              background: "rgba(255,255,255,0.15)",
                            }}
                          >
                            {a.nome
                              .split(/\s+/)
                              .slice(0, 2)
                              .map((part) => part[0])
                              .join("")
                              .toUpperCase()}
                          </span>
                        ))}
                        <span className="text-xs text-[#8A8A9A] ml-0.5">
                          {ev.attendees
                            .map((a) => a.nome.split(/\s+/)[0])
                            .join(", ")}
                        </span>
                      </div>
                    )}
                    {isManager && <AttendanceSummary event={ev} />}
                    {isManager &&
                      ev.type === "meeting" &&
                      ev.attendanceConfirmed && (
                        <div
                          className="mt-3 pt-3"
                          style={{
                            borderTop: "1px solid rgba(255,255,255,.08)",
                          }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-[#D5D5DE]">
                              Presença e pontualidade
                            </p>
                            <span className="text-[10px] text-[#00C853]">
                              Registro confirmado
                            </span>
                          </div>
                          <div className="space-y-2">
                            {ev.attendees
                              .filter((attendee) => attendee.attendanceEligible)
                              .map((attendee) => (
                                <div
                                  key={attendee.userId}
                                  className="flex items-center justify-between gap-2"
                                >
                                  <span className="text-xs text-[#B9B9C5]">
                                    {attendee.nome}
                                  </span>
                                  <div className="flex gap-1">
                                    {([
                                      {
                                        status: "PRESENTE",
                                        label: "Presente",
                                        icon: <Check size={13} />,
                                        color: "#00C853",
                                      },
                                      {
                                        status: "AUSENTE",
                                        label: "Ausente",
                                        icon: <X size={13} />,
                                        color: "#FF5252",
                                      },
                                      {
                                        status: "ATRASADO",
                                        label: "Atrasado",
                                        icon: <Clock size={13} />,
                                        color: "#FFB300",
                                      },
                                    ] as const).map((option) => (
                                      <button
                                        key={option.status}
                                        onClick={() =>
                                          setCalendarAttendance(
                                            ev.id,
                                            attendee.userId,
                                            option.status,
                                          )
                                        }
                                        title={option.label}
                                        aria-label={`${option.label}: ${attendee.nome}`}
                                        className="w-7 h-7 rounded-lg flex items-center justify-center"
                                        style={{
                                          color: option.color,
                                          background:
                                            attendee.attendanceStatus ===
                                            option.status
                                              ? `${option.color}26`
                                              : "rgba(255,255,255,.04)",
                                          border: `1px solid ${
                                            attendee.attendanceStatus ===
                                            option.status
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
                              ))}
                          </div>
                          <div className="flex justify-end mt-2">
                            <button
                              onClick={() => saveCalendarAttendance(ev)}
                              disabled={savingAttendance === ev.id}
                              className="text-[11px] font-semibold px-3 py-1.5 rounded-lg text-white bg-[#7D1AD7] disabled:opacity-50"
                            >
                              {savingAttendance === ev.id
                                ? "Salvando…"
                                : "Salvar edição"}
                            </button>
                          </div>
                        </div>
                      )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all mt-0.5">
                    <button
                      onClick={() => {
                        setDayDetail(null)
                        openEdit(ev)
                      }}
                      className="text-[#8A8A9A] hover:text-[#F0F0F5]"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => setDeleteEventId(ev.id)}
                      className="text-[#FF5252] hover:text-[#FF5252]"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
          <div
            className="px-6 py-4 flex-shrink-0"
            style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
          >
            <button
              onClick={() => {
                setDayDetail(null)
                openAdd(date)
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-white hover:opacity-90 transition-opacity"
              style={{
                background: "linear-gradient(135deg, #7D1AD7, #50E678)",
              }}
            >
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
      const d = new Date(monday)
      d.setDate(d.getDate() + i)
      return d
    })
    return (
      <div className="overflow-x-auto -mx-1 px-1">
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: "repeat(7, minmax(130px, 1fr))",
            minWidth: 700,
          }}
        >
          {days.map((day) => {
            const ds = dateStr(day)
            const dayEvents = eventsOnDate(ds)
            const isToday = ds === TODAY
            return (
              <div
                key={ds}
                className="rounded-xl overflow-hidden"
                style={{
                  background: isToday ? "#202024" : "#17171A",
                  border: isToday
                    ? "2px solid #7D1AD7"
                    : "1.5px solid rgba(255,255,255,0.1)",
                  minHeight: 180,
                }}
              >
                <button
                  className="w-full px-3 py-2.5 flex items-center gap-2 text-left hover:bg-[rgba(125,26,215,0.08)]/60 transition-colors"
                  style={{
                    background: isToday ? "rgba(125,26,215,0.08)" : "#202024",
                    borderBottom: "1px solid rgba(255,255,255,0.1)",
                  }}
                  onClick={() => openDayDetail(ds)}
                >
                  <div
                    className="text-sm font-bold flex items-center justify-center rounded-lg flex-shrink-0"
                    style={{
                      width: 28,
                      height: 28,
                      background: isToday ? "#7D1AD7" : "transparent",
                      color: isToday ? "#fff" : "#F0F0F5",
                    }}
                  >
                    {day.getDate()}
                  </div>
                  <div>
                    <div
                      className="text-xs font-semibold"
                      style={{ color: isToday ? "#507AE6" : "#8A8A9A" }}
                    >
                      {PT_DAYS_SHORT[(day.getDay() + 6) % 7]}
                    </div>
                    <div className="text-xs text-[#555566]">
                      {PT_MONTHS_SHORT[day.getMonth()]}
                    </div>
                  </div>
                  {isToday && (
                    <span
                      className="ml-auto text-xs px-1.5 py-0.5 rounded font-medium"
                      style={{ background: "#7D1AD7", color: "#fff" }}
                    >
                      Hoje
                    </span>
                  )}
                </button>
                <div className="p-2 space-y-1.5">
                  {dayEvents.map((ev) => {
                    const s = typeStyle[ev.type]
                    return (
                      <div
                        key={ev.id}
                        className="group rounded-lg px-2.5 py-1.5"
                        style={{
                          background: s.bg,
                          borderLeft: `3px solid ${s.border}`,
                        }}
                      >
                        <div className="flex items-center gap-1 mb-0.5">
                          <span style={{ color: s.color }}>{s.icon}</span>
                          <span
                            className="text-xs font-medium"
                            style={{ color: s.color }}
                          >
                            {timeRange(ev)}
                          </span>
                        </div>
                        <div className="flex items-start justify-between gap-1">
                          <p className="text-xs font-medium text-[#F0F0F5] leading-snug flex-1">
                            {ev.title}
                          </p>
                          <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all">
                            <button
                              onClick={() => openEdit(ev)}
                              className="text-[#8A8A9A] hover:text-[#F0F0F5]"
                            >
                              <Edit2 size={11} />
                            </button>
                            <button
                              onClick={() => setDeleteEventId(ev.id)}
                              className="text-[#FF5252] hover:text-[#FF5252]"
                            >
                              <X size={11} />
                            </button>
                          </div>
                        </div>
                        {isManager && ev.attendanceConfirmed && (
                          <button
                            onClick={() => openDayDetail(ev.date)}
                            className="text-left"
                            title="Abrir registro de presença para edição"
                          >
                            <AttendanceSummary event={ev} compact />
                          </button>
                        )}
                      </div>
                    )
                  })}
                  <button
                    onClick={() => openAdd(ds)}
                    className="w-full text-xs text-[#555566] hover:text-[#7D1AD7] hover:bg-[rgba(125,26,215,0.08)] rounded-lg py-1 transition-colors text-center border border-dashed border-[rgba(255,255,255,0.1)] hover:border-[rgba(125,26,215,0.3)]"
                  >
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
            <div
              key={d}
              className="text-center text-xs font-semibold text-[#555566] py-2"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (!day)
              return (
                <div key={i} className="rounded-lg" style={{ minHeight: 80 }} />
              )
            const ds = dateStr(day)
            const dayEvents = eventsOnDate(ds)
            const isToday = ds === TODAY
            const isCurrentMonth = day.getMonth() === month
            return (
              <div
                key={ds}
                className="rounded-lg overflow-hidden cursor-pointer hover:shadow-sm transition-all group"
                style={{
                  minHeight: 80,
                  background: isToday ? "rgba(125,26,215,0.08)" : "#17171A",
                  border: isToday
                    ? "1.5px solid #7D1AD7"
                    : "1.5px solid rgba(255,255,255,0.06)",
                  opacity: isCurrentMonth ? 1 : 0.4,
                }}
                onClick={() => openDayDetail(ds)}
              >
                <div className="flex items-center justify-between px-2 pt-2 pb-1">
                  <span
                    className="text-xs font-bold"
                    style={{ color: isToday ? "#7D1AD7" : "#8A8A9A" }}
                  >
                    {day.getDate()}
                  </span>
                  {dayEvents.length > 0 && (
                    <span
                      className="text-xs font-medium rounded-full px-1.5"
                      style={{
                        background: "#7D1AD7",
                        color: "#fff",
                        fontSize: 10,
                      }}
                    >
                      {dayEvents.length}
                    </span>
                  )}
                </div>
                <div className="px-1.5 pb-1.5 space-y-0.5">
                  {dayEvents.slice(0, 2).map((ev) => {
                    const s = typeStyle[ev.type]
                    return (
                      <div
                        key={ev.id}
                        className="flex items-center justify-between group/ev rounded px-1.5 py-0.5 gap-1"
                        style={{ background: s.bg }}
                      >
                        <div className="min-w-0 flex-1 flex items-baseline gap-1">
                          <span
                            className="flex-shrink-0"
                            style={{
                              fontSize: 9,
                              color: s.color,
                              opacity: 0.8,
                            }}
                          >
                            {timeRange(ev)}
                          </span>
                          <p
                            className="text-xs truncate leading-snug"
                            style={{ color: s.color }}
                          >
                            {ev.title}
                          </p>
                          {isManager && ev.attendanceConfirmed && (
                            <span className="ml-auto flex-shrink-0">
                              <AttendanceSummary event={ev} compact />
                            </span>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteEventId(ev.id)
                          }}
                          className="flex-shrink-0 opacity-0 group-hover/ev:opacity-100 text-[#FF5252]"
                        >
                          <X size={9} />
                        </button>
                      </div>
                    )
                  })}
                  {dayEvents.length > 2 && (
                    <p className="text-xs text-[#555566] px-1">
                      +{dayEvents.length - 2}
                    </p>
                  )}
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
          const monthEvents = events.filter((e) =>
            e.date.startsWith(`${year}-${String(m + 1).padStart(2, "0")}`),
          )
          return (
            <div
              key={m}
              className="bg-[#17171A] rounded-xl p-3"
              style={{ border: "1.5px solid rgba(255,255,255,0.1)" }}
            >
              <div className="text-xs font-semibold text-[#F0F0F5] mb-2 text-center">
                {PT_MONTHS_SHORT[m]}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {PT_DAYS_SHORT.map((d) => (
                  <div
                    key={d}
                    className="text-center"
                    style={{ fontSize: 8, color: "#555566" }}
                  >
                    {d[0]}
                  </div>
                ))}
                {cells.map((day, i) => {
                  if (!day) return <div key={i} />
                  const ds = dateStr(day)
                  const hasEv = eventsOnDate(ds).length > 0
                  const isToday = ds === TODAY
                  return (
                    <button
                      key={ds}
                      onClick={() => {
                        setView("month")
                        setNavDate(new Date(year, m, 1))
                      }}
                      className="flex items-center justify-center rounded transition-all"
                      style={{
                        height: 18,
                        fontSize: 9,
                        background: isToday
                          ? "#7D1AD7"
                          : hasEv
                            ? "rgba(125,26,215,0.08)"
                            : "transparent",
                        color: isToday ? "#fff" : "#8A8A9A",
                      }}
                    >
                      {day.getDate()}
                    </button>
                  )
                })}
              </div>
              {monthEvents.length > 0 && (
                <div className="mt-2 text-center">
                  <span className="text-xs" style={{ color: "#7D1AD7" }}>
                    {monthEvents.length} evento
                    {monthEvents.length > 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  const navLabel =
    view === "week"
      ? `${PT_MONTHS_SHORT[navDate.getMonth()]} ${navDate.getFullYear()}`
      : view === "month"
        ? `${PT_MONTHS[navDate.getMonth()]} ${navDate.getFullYear()}`
        : String(navDate.getFullYear())

  return (
    <div className="h-full overflow-auto p-5">
      <div className="max-w-6xl mx-auto">
        {/* Controls */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.08)] text-[#8A8A9A]"
            >
              <ChevronLeft size={16} />
            </button>
            <h2 className="text-base font-semibold text-[#F0F0F5] min-w-32 text-center">
              {navLabel}
            </h2>
            <button
              onClick={() => navigate(1)}
              className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.08)] text-[#8A8A9A]"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="flex rounded-lg overflow-hidden"
              style={{ border: "1.5px solid rgba(255,255,255,0.1)" }}
            >
              {(["week", "month", "year"] as CalView[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className="text-xs px-3 py-1.5 font-medium transition-all capitalize"
                  style={
                    view === v
                      ? { background: "#7D1AD7", color: "#fff" }
                      : { color: "#8A8A9A" }
                  }
                >
                  {v === "week" ? "Semana" : v === "month" ? "Mês" : "Ano"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {view === "week" && <WeekView />}
        {view === "month" && <MonthView />}
        {view === "year" && <YearView />}
      </div>

      {/* Day detail modal */}
      {dayDetail && <DayDetailModal date={dayDetail} />}

      {/* Add event modal */}
      {addModal && (
        <Modal
          title={form.id ? "Editar evento" : "Novo evento"}
          onClose={() => setAddModal(null)}
          wide
          footer={
            <div
              className="px-6 py-4 flex gap-3"
              style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
            >
              <button
                onClick={saveEvent}
                disabled={saving}
                className="px-5 py-2 rounded-xl text-sm font-medium text-white hover:opacity-90 btn-glow disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, #7D1AD7, #50E678)",
                }}
              >
                {saving
                  ? "Salvando…"
                  : form.id
                    ? "Salvar alterações"
                    : "Salvar evento"}
              </button>
              <button
                onClick={() => setAddModal(null)}
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
                value={form.title}
                onChange={(v) => setForm((f) => ({ ...f, title: v }))}
                placeholder="Ex: Reunião de planning"
              />
            </FormField>
            <div className="grid grid-cols-3 gap-4">
              <FormField label="Data">
                <Inp
                  type="date"
                  value={form.date}
                  onChange={(v) => setForm((f) => ({ ...f, date: v }))}
                />
              </FormField>
              <FormField label="Horário de início">
                <Inp
                  type="time"
                  value={form.time}
                  onChange={(v) => setForm((f) => ({ ...f, time: v }))}
                />
              </FormField>
              <FormField label="Horário de término">
                <Inp
                  type="time"
                  value={form.endTime}
                  onChange={(v) => setForm((f) => ({ ...f, endTime: v }))}
                />
              </FormField>
            </div>
            <FormField label="Tipo">
              <div className="flex gap-2">
                {(["meeting", "deadline", "task"] as const).map((t) => {
                  const s = typeStyle[t]
                  const label =
                    t === "meeting"
                      ? "Reunião"
                      : t === "deadline"
                        ? "Deadline"
                        : "Task"
                  return (
                    <button
                      key={t}
                      onClick={() => setForm((f) => ({ ...f, type: t }))}
                      className="flex-1 text-xs py-2 rounded-lg font-medium transition-all"
                      style={
                        form.type === t
                          ? { background: s.border, color: "#fff" }
                          : { background: s.bg, color: s.color }
                      }
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </FormField>
            <FormField label="Local">
              <div className="flex gap-2 flex-wrap">
                {([
                  ["", "Nenhum"],
                  ["meet", "Meet"],
                  ["presencial", "Presencial"],
                ] as const).map(([value, label]) => (
                  <button
                    key={value || "nenhum"}
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        local: value,
                        sala: value === "presencial" ? f.sala : "",
                        linkMeet: value === "meet" ? f.linkMeet : "",
                      }))
                    }
                    className="text-xs px-3 py-1 rounded-full font-medium transition-all"
                    style={
                      form.local === value
                        ? { background: "#7D1AD7", color: "#fff" }
                        : {
                            background: "rgba(255,255,255,0.06)",
                            color: "#8A8A9A",
                          }
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
              {form.local === "presencial" && (
                <div className="mt-2">
                  <Inp
                    value={form.sala}
                    onChange={(v) => setForm((f) => ({ ...f, sala: v }))}
                    placeholder="Ex: Sala de reunião 3"
                  />
                </div>
              )}
              {form.local === "meet" && (
                <div className="mt-2">
                  {form.linkMeet ? (
                    <a
                      href={form.linkMeet}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-sm px-3 py-2.5 rounded-xl border truncate hover:opacity-80"
                      style={{
                        border: "1px solid rgba(255,255,255,0.1)",
                        background: "#1A1A25",
                        color: "#7D1AD7",
                      }}
                    >
                      {form.linkMeet}
                    </a>
                  ) : (
                    <p className="text-xs text-[#555566]">
                      O link do Google Meet será gerado automaticamente pelo
                      Google ao salvar o evento.
                    </p>
                  )}
                </div>
              )}
            </FormField>
            <FormField label="Participantes">
              <div className="space-y-2">
                {participants.length === 0 && (
                  <div className="text-sm text-[#8A8A9A] rounded-xl px-3 py-3 bg-[#202024]">
                    Nenhum usuário ativo cadastrado.
                  </div>
                )}
                {participants.map((p) => {
                  const selected = form.participantIds.includes(p.id)
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleParticipant(p.id)}
                      className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all text-left"
                      style={{
                        background: selected
                          ? "rgba(125,26,215,0.08)"
                          : "#202024",
                        border: `1.5px solid ${
                          selected ? "#7D1AD7" : "rgba(255,255,255,0.1)"
                        }`,
                      }}
                    >
                      <div
                        className="flex items-center justify-center rounded-full text-white font-bold flex-shrink-0"
                        style={{
                          width: 28,
                          height: 28,
                          background: p.color,
                          fontSize: 10,
                        }}
                      >
                        {p.initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-[#F0F0F5]">
                          {p.name}
                        </div>
                        <div className="text-xs text-[#555566]">{p.role}</div>
                      </div>
                      {selected ? (
                        <Check size={16} style={{ color: "#7D1AD7" }} />
                      ) : (
                        <span className="text-xs text-[#555566] flex-shrink-0">
                          clique para convidar
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </FormField>
            {isManager &&
              form.type === "meeting" &&
              form.id &&
              events.find((event) => event.id === form.id)
                ?.attendanceConfirmed &&
              (() => {
                const event = events.find((item) => item.id === form.id)!
                return (
                  <FormField label="Presença e pontualidade confirmadas">
                    <div
                      className="rounded-xl p-4 space-y-2 bg-[#202024]"
                      style={{ border: "1.5px solid rgba(255,255,255,.1)" }}
                    >
                      <p className="text-xs text-[#8A8A9A] mb-3">
                        Confira quem esteve presente, faltou ou chegou atrasado.
                        As alterações serão salvas junto com a reunião.
                      </p>
                      {event.attendees
                        .filter((attendee) => attendee.attendanceEligible)
                        .map((attendee) => (
                          <div
                            key={attendee.userId}
                            className="flex items-center justify-between gap-3 py-1"
                          >
                            <span className="text-sm text-[#D5D5DE]">
                              {attendee.nome}
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
                                  type="button"
                                  onClick={() =>
                                    setCalendarAttendance(
                                      event.id,
                                      attendee.userId,
                                      option.status,
                                    )
                                  }
                                  aria-label={`${option.label}: ${attendee.nome}`}
                                  title={option.label}
                                  className="flex items-center gap-1.5 px-2.5 h-8 rounded-lg text-xs font-medium transition-all"
                                  style={{
                                    color: option.color,
                                    background:
                                      attendee.attendanceStatus ===
                                      option.status
                                        ? `${option.color}26`
                                        : "rgba(255,255,255,.04)",
                                    border: `1px solid ${
                                      attendee.attendanceStatus ===
                                      option.status
                                        ? option.color
                                        : "rgba(255,255,255,.08)"
                                    }`,
                                  }}
                                >
                                  {option.icon}
                                  <span>{option.label}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                    </div>
                  </FormField>
                )
              })()}
            {error && (
              <p className="text-xs text-[#FF6B6B]" role="alert">
                {error}
              </p>
            )}
          </div>
        </Modal>
      )}
      {deleteEventId !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setDeleteEventId(null)}
        >
          <div
            className="bg-[#17171A] rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-semibold text-[#F0F0F5] mb-1">
              Apagar este evento?
            </p>
            <p className="text-sm text-[#8A8A9A] mb-4">
              Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => deleteEvent(deleteEventId)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-[#FF5252] hover:bg-[#E64545]"
              >
                Apagar
              </button>
              <button
                onClick={() => setDeleteEventId(null)}
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

// ─── Campaigns ────────────────────────────────────────────────────────────
