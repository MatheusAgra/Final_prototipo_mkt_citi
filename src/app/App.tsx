import { lazy, Suspense, useState } from "react"
import Login, { ChangePasswordScreen } from "@/features/auth/LoginPage"
import { useSession } from "@/features/auth/useSession"
import SettingsMenu from "@/features/settings/SettingsMenu"
import LiquidBackground from "@/shared/ui/LiquidBackground"
import TopBar from "./shell/TopBar"

const Monitoramento = lazy(() => import("@/features/monitoring/MonitoringPage"))
const Biblioteca = lazy(() => import("@/features/library/LibraryPage"))
const Metricas = lazy(() => import("@/features/metrics/MetricsPage"))

export type Profile = "gerente" | "analista"
export type Module = "monitoramento" | "biblioteca" | "metricas"
export type Channel = "todos" | "instagram" | "linkedin" | "site" | "email"

export default function App() {
  const [activeModule, setActiveModule] = useState<Module>("monitoramento")
  const [channel, setChannel] = useState<Channel>("todos")
  const session = useSession()

  if (!session.currentUser) {
    return <Login users={[]} onLogin={session.login} authenticate={session.authenticate} forgotPassword={session.forgotPassword} verifyCode={session.verifyResetCode} resetPassword={session.resetPassword} />
  }

  if (session.changingPassword) {
    return <ChangePasswordScreen user={session.currentUser} onSave={session.changePassword} onBack={session.changingPasswordVoluntarily ? session.cancelPasswordChange : session.logout} />
  }

  const isManager = session.currentUser.role === "gerente"
  return (
    <div className="internal-app app-shell h-screen overflow-hidden bg-[#101010] relative">
      <LiquidBackground interactive={false} className="internal-liquid-background" />
      <TopBar activeModule={activeModule} setModule={setActiveModule} />
      <SettingsMenu currentUser={session.currentUser} isManager={isManager} onLogout={session.logout} onChangePassword={session.startVoluntaryPasswordChange} />
      <div className="absolute inset-0"><div className="h-full overflow-hidden"><Suspense fallback={<div className="h-full flex items-center justify-center text-sm text-[#8A8A9A]">Carregando…</div>}>
        {activeModule === "monitoramento" && <Monitoramento profile={session.currentUser.role} isManager={isManager} channel={channel} setChannel={setChannel} currentUserId={session.currentUser.id} />}
        {activeModule === "biblioteca" && <Biblioteca channel={channel} setChannel={setChannel} />}
        {activeModule === "metricas" && <Metricas channel={channel} setChannel={setChannel} />}
      </Suspense></div></div>
    </div>
  )
}
