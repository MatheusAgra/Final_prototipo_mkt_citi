import { useState } from "react"
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
} from "lucide-react"
import type { AppUser } from "@/shared/model/domain"
import citiLogo from "@/assets/citi-logo-green.png"
import LiquidBackground from "@/shared/ui/LiquidBackground"

// ─── Change Password ────────────────────────────────────────────────────────

interface ChangePwProps {
  user: AppUser
  onSave: (currentPw: string, newPw: string) => Promise<void>
  onBack?: () => void
}

export function ChangePasswordScreen({ user, onSave, onBack }: ChangePwProps) {
  const [currentPw, setCurrentPw] = useState("")
  const [pw, setPw] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!currentPw) {
      setError("Informe sua senha atual.")
      return
    }
    if (pw.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.")
      return
    }
    if (pw !== confirm) {
      setError("As senhas não coincidem.")
      return
    }
    setSaving(true)
    setError("")
    try {
      await onSave(currentPw, pw)
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível salvar a senha.",
      )
      setSaving(false)
    }
  }

  return (
    <div
      className="login-scene min-h-screen flex items-center justify-center px-4"
      style={{
        background:
          "linear-gradient(135deg, rgba(125,26,215,0.08) 0%, #202024 100%)",
      }}
    >
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2.5 mb-6">
          <div>
            <img src={citiLogo} alt="CITi" className="h-8 w-auto mx-auto" />
            <div className="text-[10px] uppercase tracking-[.2em] text-[#6F6F7B] text-center mt-1.5">
              Gerenciamento de Marketing
            </div>
          </div>
        </div>

        <div
          className="glass-panel rounded-3xl p-8"
          style={{ border: "1.5px solid rgba(255,255,255,0.1)" }}
        >
          <div className="flex items-start gap-3 mb-5">
            {onBack && (
              <button
                onClick={onBack}
                className="flex-shrink-0 p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.08)] text-[#555566] hover:text-[#8A8A9A] transition-colors mt-0.5"
                aria-label="Voltar"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <div
              className="p-2.5 rounded-xl flex-shrink-0"
              style={{ background: "rgba(125,26,215,0.08)" }}
            >
              <ShieldCheck size={20} className="text-[#7D1AD7]" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-[#F0F0F5]">
                Criar nova senha
              </h1>
              <p className="text-xs text-[#8A8A9A]">
                Olá, {user.name.split(" ")[0]}! Defina sua senha de acesso.
              </p>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#8A8A9A] mb-1">
                Senha atual
              </label>
              <div className="relative">
                <Lock
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555566]"
                />
                <input
                  type={showPw ? "text" : "password"}
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  required
                  placeholder="Sua senha atual"
                  className="w-full text-sm pl-9 pr-3 py-2.5 rounded-xl border border-[rgba(255,255,255,0.1)] focus:outline-none focus:border-[#7D1AD7] focus:ring-2 focus:ring-[rgba(125,26,215,0.1)]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#8A8A9A] mb-1">
                Nova senha
              </label>
              <div className="relative">
                <Lock
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555566]"
                />
                <input
                  type={showPw ? "text" : "password"}
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full text-sm pl-9 pr-10 py-2.5 rounded-xl border border-[rgba(255,255,255,0.1)] focus:outline-none focus:border-[#7D1AD7] focus:ring-2 focus:ring-[rgba(125,26,215,0.1)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555566] hover:text-[#8A8A9A]"
                >
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#8A8A9A] mb-1">
                Confirmar senha
              </label>
              <div className="relative">
                <Lock
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555566]"
                />
                <input
                  type={showPw ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  placeholder="Repita a nova senha"
                  className="w-full text-sm pl-9 pr-3 py-2.5 rounded-xl border border-[rgba(255,255,255,0.1)] focus:outline-none focus:border-[#7D1AD7] focus:ring-2 focus:ring-[rgba(125,26,215,0.1)]"
                />
              </div>
            </div>

            {error && (
              <p
                className="text-xs text-[#FF5252] rounded-lg px-3 py-2"
                style={{ background: "rgba(255,82,82,0.15)" }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-opacity btn-glow disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #7D1AD7, #50E678)",
              }}
            >
              {saving ? "Salvando…" : "Salvar e entrar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

// ─── Forgot password (esqueci minha senha) ─────────────────────────────────

type ForgotStep = "email" | "code" | "newpw"

interface ForgotPasswordPanelProps {
  onDone: (message: string) => void
  onCancel: () => void
  forgotPassword: (email: string) => Promise<void>
  verifyCode: (email: string, code: string) => Promise<string>
  resetPassword: (resetToken: string, newPassword: string) => Promise<void>
}

function ForgotPasswordPanel({
  onDone,
  onCancel,
  forgotPassword,
  verifyCode,
  resetPassword,
}: ForgotPasswordPanelProps) {
  const [step, setStep] = useState<ForgotStep>("email")
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [resetToken, setResetToken] = useState("")
  const [newPw, setNewPw] = useState("")
  const [confirmPw, setConfirmPw] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      await forgotPassword(email)
      setStep("code")
    } catch {
      setError("Não foi possível enviar o código. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      setResetToken(await verifyCode(email, code))
      setStep("newpw")
    } catch {
      setError("Código inválido ou expirado.")
    } finally {
      setLoading(false)
    }
  }

  async function submitNewPassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPw.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.")
      return
    }
    if (newPw !== confirmPw) {
      setError("As senhas não coincidem.")
      return
    }
    setLoading(true)
    setError("")
    try {
      await resetPassword(resetToken, newPw)
      onDone("Senha redefinida! Faça login com sua nova senha.")
    } catch {
      setError("Não foi possível redefinir a senha. Solicite um novo código.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="original-login__panel-heading">
        <div>
          <span>Recuperação de acesso</span>
          <h2>
            Esqueceu a<br />
            senha?
          </h2>
          <p>
            {step === "email" &&
              "Informe seu e-mail para receber um código de verificação."}
            {step === "code" &&
              `Digite o código de 6 dígitos enviado para ${email}.`}
            {step === "newpw" && "Defina uma nova senha para sua conta."}
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="original-login__lock"
          aria-label="Voltar ao login"
          style={{ cursor: "pointer" }}
        >
          <ArrowLeft size={19} />
        </button>
      </div>

      {step === "email" && (
        <form onSubmit={submitEmail} className="original-login__form">
          <div>
            <label>E-mail corporativo</label>
            <div className="relative">
              <Mail size={15} />
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError("")
                }}
                required
                placeholder="nome@citi.org.br"
                autoComplete="email"
              />
            </div>
          </div>
          {error && <div className="original-login__error">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="original-login__submit"
          >
            <span>{loading ? "Enviando…" : "Enviar código"}</span>
            <ArrowRight size={19} />
          </button>
        </form>
      )}

      {step === "code" && (
        <form onSubmit={submitCode} className="original-login__form">
          <div>
            <label>Código de verificação</label>
            <div className="relative">
              <ShieldCheck size={15} />
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.replace(/\D/g, ""))
                  setError("")
                }}
                required
                placeholder="000000"
                autoComplete="one-time-code"
              />
            </div>
          </div>
          {error && <div className="original-login__error">{error}</div>}
          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="original-login__submit"
          >
            <span>{loading ? "Validando…" : "Validar código"}</span>
            <ArrowRight size={19} />
          </button>
        </form>
      )}

      {step === "newpw" && (
        <form onSubmit={submitNewPassword} className="original-login__form">
          <div>
            <label>Nova senha</label>
            <div className="relative">
              <Lock size={15} />
              <input
                type="password"
                value={newPw}
                onChange={(e) => {
                  setNewPw(e.target.value)
                  setError("")
                }}
                required
                minLength={8}
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
              />
            </div>
          </div>
          <div>
            <label>Confirmar nova senha</label>
            <div className="relative">
              <Lock size={15} />
              <input
                type="password"
                value={confirmPw}
                onChange={(e) => {
                  setConfirmPw(e.target.value)
                  setError("")
                }}
                required
                minLength={8}
                placeholder="Repita a nova senha"
                autoComplete="new-password"
              />
            </div>
          </div>
          {error && <div className="original-login__error">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="original-login__submit"
          >
            <span>{loading ? "Salvando…" : "Confirmar nova senha"}</span>
            <ArrowRight size={19} />
          </button>
        </form>
      )}
    </>
  )
}

// ─── Login ─────────────────────────────────────────────────────────────────

interface LoginProps {
  users: AppUser[]
  onLogin: (user: AppUser) => void
  authenticate?: (email: string, password: string) => Promise<AppUser>
  forgotPassword: (email: string) => Promise<void>
  verifyCode: (email: string, code: string) => Promise<string>
  resetPassword: (resetToken: string, newPassword: string) => Promise<void>
}

export default function Login({
  users,
  onLogin,
  authenticate,
  forgotPassword,
  verifyCode,
  resetPassword,
}: LoginProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [screen, setScreen] = useState<"login" | "forgot">("login")
  const [notice, setNotice] = useState("")

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const user = authenticate
        ? await authenticate(email, password)
        : users.find(
            (u) =>
              u.email.toLowerCase() === email.toLowerCase() &&
              u.password === password,
          )
      if (!user) {
        setError("E-mail ou senha incorretos.")
        setLoading(false)
        return
      }
      setError("")
      onLogin(user)
    } catch {
      setError("E-mail ou senha incorretos.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="original-login min-h-screen">
      <LiquidBackground />
      <div className="original-login__aurora" aria-hidden="true" />
      <img className="original-login__logo" src={citiLogo} alt="CITi" />
      <section className="original-login__hero">
        <div className="original-login__eyebrow">
          <span />
          CITi HubSpot
        </div>
        <h1>
          Estratégia em
          <br />
          <strong className="original-login__movement">Movimento.</strong>
        </h1>
        <p>
          Dados, conteúdo e performance conectados em uma única
          <br className="hidden xl:block" /> experiência de marketing.
        </p>
        <div
          className="original-login__pillars"
          aria-label="Pilares da plataforma"
        >
          <div>
            <b>01</b>
            <span>Visão integrada</span>
          </div>
          <div>
            <b>02</b>
            <span>Decisões ágeis</span>
          </div>
          <div>
            <b>03</b>
            <span>Impacto real</span>
          </div>
        </div>
      </section>

      <section className="original-login__panel" aria-label="Área de acesso">
        <div className="original-login__panel-glow" aria-hidden="true" />

        {screen === "forgot" ? (
          <ForgotPasswordPanel
            onCancel={() => setScreen("login")}
            onDone={(message) => {
              setScreen("login")
              setNotice(message)
            }}
            forgotPassword={forgotPassword}
            verifyCode={verifyCode}
            resetPassword={resetPassword}
          />
        ) : (
          <>
            <div className="original-login__panel-heading">
              <div>
                <span>Área restrita</span>
                <h2>
                  Bem-vindo de
                  <br />
                  volta
                </h2>
                <p>Entre para continuar sua jornada.</p>
              </div>
              <div className="original-login__lock">
                <Lock size={19} />
              </div>
            </div>

            <form onSubmit={submit} className="original-login__form">
              <div>
                <label>E-mail corporativo</label>
                <div className="relative">
                  <Mail size={15} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      setError("")
                    }}
                    required
                    placeholder="nome@citi.org.br"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="!mb-0">Senha</label>
                  <button
                    type="button"
                    onClick={() => {
                      setScreen("forgot")
                      setNotice("")
                    }}
                    style={{
                      background: "none",
                      border: 0,
                      padding: 0,
                      marginBottom: ".65rem",
                      color: "#a76cff",
                      fontSize: "11px",
                      cursor: "pointer",
                    }}
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative">
                  <Lock size={15} />
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      setError("")
                    }}
                    required
                    placeholder="Digite sua senha"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    className="original-login__eye"
                    aria-label={showPw ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {notice && (
                <div
                  className="original-login__error"
                  style={{
                    color: "#50e678",
                    background: "rgba(80,230,120,.1)",
                    borderColor: "rgba(80,230,120,.25)",
                  }}
                >
                  {notice}
                </div>
              )}
              {error && <div className="original-login__error">{error}</div>}

              <button
                type="submit"
                disabled={loading}
                className="original-login__submit"
              >
                <span>{loading ? "Entrando…" : "Entrar na plataforma"}</span>
                <ArrowRight size={19} />
              </button>
            </form>
          </>
        )}
      </section>

      <footer>
        CITi HubSpot © 2026 <span>•</span> Gerenciamento de Marketing
      </footer>
    </main>
  )
}
