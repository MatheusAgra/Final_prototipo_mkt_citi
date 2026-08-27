import { useState, useMemo, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import {
  BookOpen,
  FileText,
  MessageSquare,
  Download,
  Star,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Hash,
  Eye,
  Plus,
  Edit2,
  Trash2,
  X,
  Search,
  Link as LinkIcon,
} from "lucide-react"
import type { Channel } from "@/app/App"
import type { ChannelType, Prompt, Material, Post, PostMedia } from "@/shared/model/domain"
import { libraryApi as api } from "../api"
import BrandMark from "@/shared/ui/BrandMark"

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return ""
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ─── Shared ────────────────────────────────────────────────────────────────

export const CH: Record<ChannelType, {
  label: string
  color: string
  bg: string
  dot: string
}> = {
  instagram: {
    label: "Instagram",
    color: "#E1306C",
    bg: "rgba(225,48,108,0.15)",
    dot: "#E1306C",
  },
  linkedin: {
    label: "LinkedIn",
    color: "#0A66C2",
    bg: "rgba(10,102,194,0.15)",
    dot: "#0A66C2",
  },
  site: {
    label: "Site",
    color: "#00C853",
    bg: "rgba(0,200,83,0.15)",
    dot: "#00C853",
  },
  email: {
    label: "Email",
    color: "#FFB300",
    bg: "rgba(255,179,0,0.15)",
    dot: "#FFB300",
  },
}

export function ChannelBadge({ ch }: { ch: ChannelType }) {
  const c = CH[ch]
  return (
    <span
      className="inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ background: c.bg, color: c.color }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full mr-1.5"
        style={{ background: c.dot }}
      />
      {c.label}
    </span>
  )
}

export function ChannelFilter({
  channel,
  setChannel,
}: {
  channel: Channel
  setChannel: (c: Channel) => void
}) {
  const opts: { id: Channel; label: string }[] = [
    { id: "todos", label: "Todos" },
    { id: "instagram", label: "Instagram" },
    { id: "linkedin", label: "LinkedIn" },
    { id: "site", label: "Site" },
    { id: "email", label: "Email" },
  ]
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {opts.map((o) => {
        const active = channel === o.id
        const c = o.id !== "todos" ? CH[(o.id as ChannelType)] : null
        return (
          <button
            key={o.id}
            onClick={() => setChannel(o.id)}
            className="filter-pill text-xs px-3 py-1.5 rounded-full font-medium transition-all"
            style={
              active
                ? { background: c ? c.dot : "#7D1AD7", color: "#fff" }
                : { background: "rgba(255,255,255,0.06)", color: "#8A8A9A" }
            }
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export type Tab = "posts" | "materiais" | "prompts"

export function TabNav({ active, setTab }: { active: Tab; setTab: (t: Tab) => void }) {
  const tabs = [
    { id: "posts" as Tab, label: "Posts", icon: <Eye size={14} /> },
    {
      id: "materiais" as Tab,
      label: "Materiais Ricos",
      icon: <FileText size={14} />,
    },
    {
      id: "prompts" as Tab,
      label: "Prompts",
      icon: <MessageSquare size={14} />,
    },
  ]
  return (
    <div className="flex gap-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => setTab(t.id)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-all"
          style={
            active === t.id
              ? { background: "rgba(125,26,215,0.08)", color: "#507AE6" }
              : { color: "#8A8A9A", background: "transparent" }
          }
        >
          {t.icon}
          {t.label}
        </button>
      ))}
    </div>
  )
}

export function Modal({
  title,
  onClose,
  children,
  footer,
  wide,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
  wide?: boolean
}) {
  // Renderizado via portal direto no <body>: um ancestral (.module-stage) usa overflow+backdrop-filter,
  // o que cria um containing block para position:fixed e corta o modal. O portal escapa disso de vez.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className={`bg-[#17171A] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden ${
          wide ? "w-full max-w-2xl" : "w-full max-w-md"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <h3 className="font-semibold text-[#F0F0F5]">{title}</h3>
          <button
            onClick={onClose}
            className="text-[#555566] hover:text-[#8A8A9A]"
          >
            <X size={18} />
          </button>
        </div>
        {/* min-h-0 é necessário: sem ele, um flex item cresce para caber o conteúdo em vez de respeitar max-h-[90vh] do pai e rolar internamente */}
        <div className="overflow-y-auto flex-1 min-h-0">{children}</div>
        {footer && <div className="flex-shrink-0">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

export function FormRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#8A8A9A] mb-1">
        {label}
      </label>
      {children}
    </div>
  )
}

export function Inp({
  value,
  onChange,
  placeholder,
  type = "text",
  as,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  as?: "textarea"
}) {
  const cls =
    "w-full text-sm px-3 py-2 rounded-lg border border-[rgba(255,255,255,0.1)] focus:outline-none focus:border-[#7D1AD7] focus:ring-2 focus:ring-[rgba(125,26,215,0.1)]"
  if (as === "textarea")
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cls}
        rows={4}
      />
    )
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cls}
    />
  )
}

// ─── Posts ─────────────────────────────────────────────────────────────────

export interface PostFormData {
  title: string
  channel: ChannelType
  campaign: string
  format: Post["format"]
  images: PostMedia[]
  linkUrl: string
  ctr: string
  profileVisits: string
  caption: string
  publishedAt: string
  validUntil: string
  likes: string
  reach: string
  impressions: string
  engagement: string
  saves: string
  shares: string
  comments: string
}
