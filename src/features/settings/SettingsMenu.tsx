import { useEffect, useRef, useState } from "react"
import {
  Users,
  KeyRound,
  LogOut,
  Plus,
  X,
  Eye,
  EyeOff,
  ChevronDown,
  Trash2,
  CalendarDays,
  Link2Off,
} from "lucide-react"
import type { AppUser } from "@/shared/model/domain"
import { settingsApi as api } from "./api"
import { toAppUser, type AuthUserDto } from "@/features/auth/model"

// ─── User Management Modal ─────────────────────────────────────────────────

interface UserModalProps {
  users: AppUser[]
  setUsers: React.Dispatch<React.SetStateAction<AppUser[]>>
  currentUserId: number | string
  onClose: () => void
}

function UserManagementModal({
  users,
  setUsers,
  currentUserId,
  onClose,
}: UserModalProps) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "analista" as "gerente" | "analista",
    password: "",
  })
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] =
    useState<number | string | null>(null)

  async function deleteUser(id: number | string) {
    try {
      await api.users.remove(id)
      setUsers((prev) => prev.filter((u) => u.id !== id))
      setDeleteConfirmId(null)
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível remover o usuário.",
      )
    }
  }

  async function saveUser() {
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setError("Preencha todos os campos.")
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError("Informe um e-mail válido.")
      return
    }
    if (form.password.length < 8) {
      setError("A senha inicial deve ter pelo menos 8 caracteres.")
      return
    }
    if (users.find((u) => u.email.toLowerCase() === form.email.toLowerCase())) {
      setError("E-mail já cadastrado.")
      return
    }
    setSaving(true)
    setError("")
    try {
      const created = await api.users.create({
        nomeCompleto: form.name.trim(),
        email: form.email.trim(),
        perfil: form.role === "gerente" ? "GERENTE" : "ANALISTA",
        cargo:
          form.role === "gerente"
            ? "Gerente de Marketing"
            : "Analista de Marketing",
        senhaInicial: form.password,
      })
      const initials = created.nomeCompleto
        .split(/\s+/)
        .slice(0, 2)
        .map((part: string) => part[0])
        .join("")
        .toUpperCase()
      const colors = [
        "#7D1AD7",
        "#00C853",
        "#FFB300",
        "#E1306C",
        "#0A66C2",
        "#40C4FF",
        "#507AE6",
      ]
      const newUser: AppUser = {
        id: created.id,
        name: created.nomeCompleto,
        initials,
        color: colors[users.length % colors.length],
        email: created.email,
        password: "",
        role: created.perfil === "GERENTE" ? "gerente" : "analista",
        mustChangePassword: created.primeiroAcesso,
      }
      setUsers((prev) => [...prev, newUser])
      setForm({ name: "", email: "", role: "analista", password: "" })
      setShowForm(false)
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível criar a conta.",
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-0 sm:px-4"
      onClick={onClose}
    >
      <div
        className="bg-[#17171A] w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden"
        style={{ maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center gap-2">
            <Users size={16} className="text-[#7D1AD7]" />
            <h2 className="font-semibold text-[#F0F0F5]">Gerenciar usuários</h2>
          </div>
          <button
            onClick={onClose}
            className="text-[#555566] hover:text-[#8A8A9A]"
          >
            <X size={18} />
          </button>
        </div>

        <div
          className="overflow-y-auto"
          style={{ maxHeight: "calc(90vh - 64px)" }}
        >
          {/* User list */}
          <div className="px-6 py-4 space-y-2">
            {users.map((u) => {
              const isSelf = u.id === currentUserId
              const isConfirming = deleteConfirmId === u.id
              return (
                <div key={u.id}>
                  <div
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                    style={{
                      background: "#202024",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    <div
                      className="flex items-center justify-center rounded-full text-white text-xs font-bold flex-shrink-0"
                      style={{ width: 32, height: 32, background: u.color }}
                    >
                      {u.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[#F0F0F5] truncate">
                        {u.name}
                        {isSelf && (
                          <span className="ml-1.5 text-xs text-[#555566]">
                            (você)
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#555566] truncate">
                        {u.email}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {u.mustChangePassword && (
                        <span
                          className="text-xs px-1.5 py-0.5 rounded-full hidden sm:block"
                          style={{
                            background: "rgba(255,179,0,0.15)",
                            color: "#FFB300",
                          }}
                        >
                          1º acesso
                        </span>
                      )}
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={
                          u.role === "gerente"
                            ? {
                                background: "rgba(125,26,215,0.08)",
                                color: "#507AE6",
                              }
                            : {
                                background: "rgba(0,200,83,0.15)",
                                color: "#00C853",
                              }
                        }
                      >
                        {u.role === "gerente" ? "Gerente" : "Analista"}
                      </span>
                      {!isSelf && (
                        <button
                          onClick={() => setDeleteConfirmId(u.id)}
                          className="p-1.5 rounded-lg text-[#555566] hover:text-[#FF5252] hover:bg-[rgba(255,82,82,0.12)] transition-all"
                          title="Apagar usuário"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                  {isConfirming && (
                    <div
                      className="mt-1 px-3 py-2.5 rounded-xl flex items-center justify-between gap-3"
                      style={{
                        background: "rgba(255,82,82,0.15)",
                        border: "1px solid #FF5252",
                      }}
                    >
                      <p className="text-xs text-[#FF5252] flex-1">
                        Apagar <strong>{u.name}</strong> permanentemente?
                      </p>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => deleteUser(u.id)}
                          className="text-xs px-2.5 py-1 rounded-lg font-medium text-white bg-[#FF5252] hover:bg-[#E64545]"
                        >
                          Apagar
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="text-xs px-2.5 py-1 rounded-lg font-medium text-[#8A8A9A] hover:bg-[rgba(255,255,255,0.08)]"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Add user form toggle */}
          <div className="px-6 pb-2">
            <button
              onClick={() => {
                setShowForm((s) => !s)
                setError("")
              }}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all${
                showForm ? "" : " btn-glow"
              }`}
              style={
                showForm
                  ? { background: "rgba(255,255,255,0.06)", color: "#8A8A9A" }
                  : {
                      background: "linear-gradient(135deg, #7D1AD7, #50E678)",
                      color: "#fff",
                    }
              }
            >
              {showForm ? (
                <>
                  <ChevronDown size={15} /> Cancelar
                </>
              ) : (
                <>
                  <Plus size={15} /> Novo usuário
                </>
              )}
            </button>
          </div>

          {/* Add user form */}
          {showForm && (
            <div className="px-6 pb-6 space-y-3">
              <div
                className="pt-3"
                style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#8A8A9A] mb-1">
                      Nome completo *
                    </label>
                    <input
                      value={form.name}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, name: e.target.value }))
                      }
                      placeholder="João Silva"
                      className="w-full text-sm px-3 py-2 rounded-xl border border-[rgba(255,255,255,0.1)] focus:outline-none focus:border-[#7D1AD7]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#8A8A9A] mb-1">
                      E-mail *
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, email: e.target.value }))
                      }
                      placeholder="joao@empresa.com"
                      className="w-full text-sm px-3 py-2 rounded-xl border border-[rgba(255,255,255,0.1)] focus:outline-none focus:border-[#7D1AD7]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#8A8A9A] mb-1">
                      Perfil *
                    </label>
                    <select
                      value={form.role}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          role: e.target.value as "gerente" | "analista",
                        }))
                      }
                      className="w-full text-sm px-3 py-2 rounded-xl border border-[rgba(255,255,255,0.1)] focus:outline-none focus:border-[#7D1AD7] bg-[#17171A]"
                    >
                      <option value="analista">Analista</option>
                      <option value="gerente">Gerente</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#8A8A9A] mb-1">
                      Senha inicial *
                    </label>
                    <div className="relative">
                      <input
                        type={showPw ? "text" : "password"}
                        value={form.password}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, password: e.target.value }))
                        }
                        placeholder="••••••"
                        className="w-full text-sm px-3 py-2 pr-9 rounded-xl border border-[rgba(255,255,255,0.1)] focus:outline-none focus:border-[#7D1AD7]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555566] hover:text-[#8A8A9A]"
                      >
                        {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>
                  </div>
                </div>

                {error && (
                  <p className="text-xs text-[#FF5252] mt-2 px-1">{error}</p>
                )}

                <button
                  onClick={saveUser}
                  disabled={saving}
                  className="mt-4 w-full py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-opacity btn-glow disabled:opacity-50"
                  style={{
                    background: "linear-gradient(135deg, #7D1AD7, #50E678)",
                  }}
                >
                  {saving ? "Criando conta…" : "Criar conta"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Google Calendar connection ─────────────────────────────────────────────

function GoogleCalendarConnect() {
  const [status, setStatus] = useState<{
    connected: boolean
    email: string | null
  } | null>(null)
  const [notice, setNotice] = useState("")
  const [busy, setBusy] = useState(false)

  function load() {
    api.google
      .status()
      .then(setStatus)
      .catch(() => undefined)
  }

  useEffect(() => {
    load()
    const params = new URLSearchParams(window.location.search)
    const result = params.get("google")
    if (result === "connected") setNotice("Conta Google conectada com sucesso.")
    else if (result === "error")
      setNotice("Não foi possível conectar a conta Google. Tente de novo.")
    if (result) {
      params.delete("google")
      window.history.replaceState(
        {},
        "",
        `${window.location.pathname}${params.toString() ? `?${params}` : ""}`,
      )
    }
  }, [])

  async function connect() {
    setBusy(true)
    try {
      const { url } = await api.google.connect()
      window.location.href = url
    } catch {
      setNotice("Não foi possível iniciar a conexão com o Google.")
      setBusy(false)
    }
  }

  async function disconnect() {
    setBusy(true)
    try {
      await api.google.disconnect()
      setNotice("Conta Google desconectada.")
      load()
    } catch {
      setNotice("Não foi possível desconectar.")
    } finally {
      setBusy(false)
    }
  }

  if (!status) return null

  return (
    <div>
      {status.connected ? (
        <button
          onClick={disconnect}
          disabled={busy}
          title={status.email ?? ""}
          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-all hover:bg-white/10 disabled:opacity-50"
        >
          <Link2Off size={15} style={{ color: "#00C853" }} />
          <div className="min-w-0 flex-1">
            <div className="text-sm" style={{ color: "#8A8A9A" }}>
              Google Calendar conectado
            </div>
            <div className="text-xs truncate" style={{ color: "#555566" }}>
              {status.email}
            </div>
          </div>
        </button>
      ) : (
        <button
          onClick={connect}
          disabled={busy}
          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-all hover:bg-white/10 disabled:opacity-50"
        >
          <CalendarDays size={15} style={{ color: "#555566" }} />
          <span className="text-sm" style={{ color: "#8A8A9A" }}>
            {busy ? "Conectando…" : "Conectar Google Calendar"}
          </span>
        </button>
      )}
      {notice && (
        <p className="text-xs px-4 pb-2" style={{ color: "#8A8A9A" }}>
          {notice}
        </p>
      )}
    </div>
  )
}

// ─── Settings menu ──────────────────────────────────────────────────────────

interface Props {
  currentUser: AppUser
  isManager: boolean
  onLogout: () => void
  onChangePassword: () => void
}

export default function SettingsMenu({
  currentUser,
  isManager,
  onLogout,
  onChangePassword,
}: Props) {
  const [open, setOpen] = useState(false)
  const [userModalOpen, setUserModalOpen] = useState(false)
  const [users, setUsers] = useState<AppUser[]>([])
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isManager) return
    api.users
      .list()
      .then((rows) => setUsers((rows as AuthUserDto[]).map(toAppUser)))
      .catch(console.error)
  }, [isManager])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [])

  return (
    <>
      <div
        ref={ref}
        className="fixed top-4 right-4 md:top-8 md:right-8 z-40"
        style={{ zIndex: 40 }}
      >
        <div className="relative">
          <button
            onClick={() => setOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label="Configurações"
            className="flex items-center justify-center rounded-full text-white font-bold text-sm transition-all hover:opacity-90"
            style={{
              width: 44,
              height: 44,
              background: currentUser.color,
              boxShadow: open ? "0 0 0 3px rgba(125,26,215,0.28)" : "none",
            }}
          >
            {currentUser.initials}
          </button>
          {open && (
            <div
              role="menu"
              className="absolute right-0 top-full mt-2 w-64 rounded-2xl overflow-hidden shadow-2xl"
              style={{
                background: "#17171A",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div
                className="px-4 py-3"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
              >
                <div
                  className="text-sm font-medium truncate"
                  style={{ color: "#F0F0F5" }}
                >
                  {currentUser.name}
                </div>
                <div className="text-xs" style={{ color: "#555566" }}>
                  {isManager ? "Gerente" : "Analista"}
                </div>
              </div>
              <div className="py-1.5">
                {isManager && (
                  <button
                    onClick={() => {
                      setUserModalOpen(true)
                      setOpen(false)
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-all hover:bg-white/10"
                  >
                    <Users size={15} style={{ color: "#555566" }} />
                    <span className="text-sm" style={{ color: "#8A8A9A" }}>
                      Gerenciar usuários
                    </span>
                  </button>
                )}
                <GoogleCalendarConnect />
                <button
                  onClick={() => {
                    onChangePassword()
                    setOpen(false)
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-all hover:bg-white/10"
                >
                  <KeyRound size={15} style={{ color: "#555566" }} />
                  <span className="text-sm" style={{ color: "#8A8A9A" }}>
                    Alterar senha
                  </span>
                </button>
                <button
                  onClick={() => {
                    setOpen(false)
                    onLogout()
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-all hover:bg-[#FF5252]/15 group"
                >
                  <LogOut
                    size={15}
                    style={{ color: "#555566" }}
                    className="group-hover:text-[#FF5252]"
                  />
                  <span
                    className="text-sm group-hover:text-[#FF5252] transition-colors"
                    style={{ color: "#8A8A9A" }}
                  >
                    Sair
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {userModalOpen && (
        <UserManagementModal
          users={users}
          setUsers={setUsers}
          currentUserId={currentUser.id}
          onClose={() => setUserModalOpen(false)}
        />
      )}
    </>
  )
}
