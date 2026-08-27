import { useEffect, useRef, useState } from "react"
import { Menu, LayoutDashboard, BookOpen, BarChart2 } from "lucide-react"
import type { Module } from "../App"

interface Props {
  activeModule: Module
  setModule: (m: Module) => void
}

const navItems: {
  id: Module
  label: string
  Icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>
}[] = [
  { id: "monitoramento", label: "Monitoramento", Icon: LayoutDashboard },
  { id: "biblioteca", label: "Biblioteca", Icon: BookOpen },
  { id: "metricas", label: "Métricas", Icon: BarChart2 },
]

export default function TopBar({ activeModule, setModule }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [])

  return (
    <div
      ref={ref}
      className="fixed top-4 right-[72px] md:top-8 md:right-[88px] z-40"
      style={{ zIndex: 40 }}
    >
      <div className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Navegar entre módulos"
          className="flex items-center justify-center rounded-full transition-all hover:opacity-90"
          style={{
            width: 44,
            height: 44,
            background: "rgba(18,18,20,.9)",
            border: "1px solid rgba(255,255,255,0.1)",
            backdropFilter: "blur(16px)",
            boxShadow: open ? "0 0 0 3px rgba(125,26,215,0.28)" : "none",
          }}
        >
          <Menu size={20} style={{ color: open ? "#7D1AD7" : "#8A8A9A" }} />
        </button>
        {open && (
          <div
            role="menu"
            className="absolute right-full top-0 mr-2 w-56 rounded-2xl overflow-hidden shadow-2xl"
            style={{
              background: "#17171A",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {navItems.map(({ id, label, Icon }) => {
              const active = activeModule === id
              return (
                <button
                  key={id}
                  role="menuitem"
                  onClick={() => {
                    setModule(id)
                    setOpen(false)
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-3.5 text-left transition-all hover:bg-white/10"
                  style={
                    active ? { background: "rgba(125,26,215,0.12)" } : undefined
                  }
                >
                  <Icon
                    size={18}
                    style={{ color: active ? "#B69AEF" : "#6F6F7B" }}
                  />
                  <span
                    className="text-sm font-medium"
                    style={{ color: active ? "#F0F0F5" : "#8A8A9A" }}
                  >
                    {label}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
