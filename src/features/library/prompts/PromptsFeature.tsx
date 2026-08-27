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
import { ChannelBadge, ChannelFilter, CH, FormRow, formatBytes, Inp, Modal, Tab } from "../components/shared"
const catStyle: Record<string, { bg: string; color: string }> = {
  Instagram: { bg: "rgba(225,48,108,0.15)", color: "#E1306C" },
  LinkedIn: { bg: "rgba(10,102,194,0.15)", color: "#0A66C2" },
  Email: { bg: "rgba(255,179,0,0.15)", color: "#FFB300" },
  Carrossel: { bg: "rgba(255,179,0,0.15)", color: "#FFB300" },
  Site: { bg: "rgba(0,200,83,0.15)", color: "#00C853" },
}
function getCatStyle(cat: string) {
  return catStyle[cat] ?? { bg: "rgba(255,255,255,0.06)", color: "#8A8A9A" }
}

const PROMPT_CAT_TO_API: Record<string, string> = {
  Instagram: "INSTAGRAM",
  LinkedIn: "LINKEDIN",
  Email: "EMAIL",
  Carrossel: "CARROSSEL",
  Site: "SITE",
}
const PROMPT_CAT_FROM_API: Record<string, string> = {
  INSTAGRAM: "Instagram",
  LINKEDIN: "LinkedIn",
  EMAIL: "Email",
  CARROSSEL: "Carrossel",
  SITE: "Site",
}

function mapPrompt(row: any): Prompt {
  return {
    id: row.id,
    category: PROMPT_CAT_FROM_API[row.categoria] ?? row.categoria,
    title: row.titulo,
    content: row.conteudo,
    tags: row.tags ?? [],
    favorited: row.favorito,
    usageCount: row.usos,
  }
}

interface PromptFormData {
  category: string
  title: string
  content: string
  tags: string
}

interface PromptDraft {
  id?: string
  category: string
  title: string
  content: string
  tags: string[]
}

function PromptModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: Prompt
  onSave: (p: PromptDraft) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState<PromptFormData>({
    category: initial?.category ?? "Instagram",
    title: initial?.title ?? "",
    content: initial?.content ?? "",
    tags: initial?.tags.join(", ") ?? "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const cats = ["Instagram", "LinkedIn", "Email", "Carrossel", "Site"]

  async function save() {
    if (!form.title.trim()) return
    setSaving(true)
    setError("")
    try {
      await onSave({
        id: initial?.id,
        category: form.category,
        title: form.title,
        content: form.content,
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      })
      onClose()
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível salvar o prompt.",
      )
      setSaving(false)
    }
  }

  return (
    <Modal
      title={initial ? "Editar prompt" : "Novo prompt"}
      onClose={onClose}
      wide
      footer={
        <div
          className="px-6 py-4 flex flex-col gap-3"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          {error && (
            <p
              className="text-xs text-[#FF5252] rounded-lg px-3 py-2"
              style={{ background: "rgba(255,82,82,0.15)" }}
            >
              {error}
            </p>
          )}
          <div className="flex gap-3">
            <button
              onClick={save}
              disabled={saving}
              className="px-5 py-2 rounded-xl text-sm font-medium text-white hover:opacity-90 btn-glow disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #7D1AD7, #50E678)",
              }}
            >
              {saving
                ? "Salvando…"
                : initial
                  ? "Salvar alterações"
                  : "Criar prompt"}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-[#8A8A9A] hover:bg-[rgba(255,255,255,0.08)]"
            >
              Cancelar
            </button>
          </div>
        </div>
      }
    >
      <div className="px-6 py-4 space-y-4">
        <FormRow label="Categoria">
          <div className="flex gap-2 flex-wrap">
            {cats.map((c) => {
              const s = getCatStyle(c)
              return (
                <button
                  key={c}
                  onClick={() => setForm((f) => ({ ...f, category: c }))}
                  className="filter-pill text-xs px-3 py-1.5 rounded-full font-medium transition-all"
                  style={
                    form.category === c
                      ? { background: s.color, color: "#fff" }
                      : { background: s.bg, color: s.color }
                  }
                >
                  {c}
                </button>
              )
            })}
          </div>
        </FormRow>
        <FormRow label="Título *">
          <Inp
            value={form.title}
            onChange={(v) => setForm((f) => ({ ...f, title: v }))}
            placeholder="Ex: Caption engajante com CTA"
          />
        </FormRow>
        <FormRow label="Conteúdo do prompt *">
          <textarea
            value={form.content}
            onChange={(e) =>
              setForm((f) => ({ ...f, content: e.target.value }))
            }
            placeholder="Escreva o prompt aqui..."
            rows={8}
            className="w-full text-sm px-3 py-2 rounded-lg border border-[rgba(255,255,255,0.1)] focus:outline-none focus:border-[#7D1AD7] font-mono"
            style={{ fontSize: 12 }}
          />
        </FormRow>
        <FormRow label="Tags (separadas por vírgula)">
          <Inp
            value={form.tags}
            onChange={(v) => setForm((f) => ({ ...f, tags: v }))}
            placeholder="caption, cta, engajamento"
          />
        </FormRow>
      </div>
    </Modal>
  )
}

export function PromptsView() {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [catFilter, setCatFilter] = useState("Todos")
  const [search, setSearch] = useState("")
  const [onlyFav, setOnlyFav] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [copied, setCopied] = useState<string | null>(null)
  const [modal, setModal] = useState<{ prompt?: Prompt } | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => {
    api.prompts
      .list()
      .then((rows) => setPrompts(rows.map(mapPrompt)))
      .catch(console.error)
  }, [])

  const categories = useMemo(
    () => ["Todos", ...Array.from(new Set(prompts.map((p) => p.category)))],
    [prompts],
  )

  const filtered = useMemo(
    () =>
      prompts.filter((p) => {
        if (catFilter !== "Todos" && p.category !== catFilter) return false
        if (onlyFav && !p.favorited) return false
        if (
          search &&
          !p.title.toLowerCase().includes(search.toLowerCase()) &&
          !p.content.toLowerCase().includes(search.toLowerCase())
        )
          return false
        return true
      }),
    [prompts, catFilter, onlyFav, search],
  )

  async function toggleFav(id: string) {
    const current = prompts.find((p) => p.id === id)
    if (!current) return
    setPrompts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, favorited: !p.favorited } : p)),
    )
    try {
      const res = await api.prompts.favorite(id, !current.favorited)
      setPrompts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, favorited: res.favorito } : p)),
      )
    } catch (cause) {
      console.error(cause)
      setPrompts((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, favorited: current.favorited } : p,
        ),
      )
    }
  }

  async function copyPrompt(id: string, content: string) {
    navigator.clipboard.writeText(content).catch(() => {})
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
    try {
      const res = await api.prompts.copy(id)
      setPrompts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, usageCount: res.usos } : p)),
      )
    } catch (cause) {
      console.error(cause)
    }
  }

  async function savePrompt(p: PromptDraft) {
    const payload = {
      titulo: p.title,
      categoria: PROMPT_CAT_TO_API[p.category] ?? "INSTAGRAM",
      conteudo: p.content,
      tags: p.tags,
    }
    const saved = mapPrompt(
      p.id
        ? await api.prompts.update(p.id, payload)
        : await api.prompts.create(payload),
    )
    setPrompts((prev) => {
      const idx = prev.findIndex((x) => x.id === saved.id)
      if (idx >= 0) return prev.map((x, i) => (i === idx ? saved : x))
      return [saved, ...prev]
    })
  }

  async function deletePrompt(id: string) {
    setDeleteId(null)
    try {
      await api.prompts.remove(id)
      setPrompts((prev) => prev.filter((p) => p.id !== id))
    } catch (cause) {
      console.error(cause)
    }
  }

  return (
    <div className="h-full overflow-auto p-5">
      <div className="max-w-4xl mx-auto">
        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          {/* Search */}
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 min-w-48"
            style={{
              background: "#202024",
              border: "1.5px solid rgba(255,255,255,0.1)",
            }}
          >
            <Search size={14} className="text-[#555566] flex-shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar prompts..."
              className="flex-1 text-sm bg-transparent focus:outline-none text-[#F0F0F5] placeholder-[#555566]"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="text-[#555566] hover:text-[#8A8A9A]"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Favorites toggle */}
          <button
            onClick={() => setOnlyFav((f) => !f)}
            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-medium transition-all"
            style={
              onlyFav
                ? {
                    background: "rgba(255,179,0,0.15)",
                    color: "#FFB300",
                    border: "1.5px solid rgba(255,179,0,0.4)",
                  }
                : {
                    background: "#202024",
                    color: "#8A8A9A",
                    border: "1.5px solid rgba(255,255,255,0.1)",
                  }
            }
          >
            <Star
              size={13}
              style={{
                fill: onlyFav ? "#FFB300" : "none",
                color: onlyFav ? "#FFB300" : "#555566",
              }}
            />
            Favoritos · {prompts.filter((p) => p.favorited).length}
          </button>

          {/* Add button */}
          <button
            onClick={() => setModal({})}
            className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl text-white hover:opacity-90 btn-glow"
            style={{ background: "linear-gradient(135deg, #7D1AD7, #50E678)" }}
          >
            <Plus size={15} /> Novo prompt
          </button>
        </div>

        {/* Category filter */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {categories.map((cat) => {
            const s = cat !== "Todos" ? getCatStyle(cat) : null
            return (
              <button
                key={cat}
                onClick={() => setCatFilter(cat)}
                className="filter-pill text-xs px-3 py-1.5 rounded-full font-medium transition-all"
                style={
                  catFilter === cat
                    ? { background: s ? s.color : "#7D1AD7", color: "#fff" }
                    : { background: "rgba(255,255,255,0.06)", color: "#8A8A9A" }
                }
              >
                {cat}
              </button>
            )
          })}
        </div>

        <div className="space-y-3">
          {filtered.map((prompt) => {
            const s = getCatStyle(prompt.category)
            const isExp = expanded[prompt.id]
            return (
              <div
                key={prompt.id}
                className="editorial-card bg-[#17171A] rounded-xl overflow-hidden group"
                style={{
                  border: "1.5px solid rgba(255,255,255,0.1)",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                }}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: s.bg, color: s.color }}
                        >
                          {prompt.category}
                        </span>
                        <span className="text-xs text-[#555566]">
                          usado {prompt.usageCount}×
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-[#F0F0F5]">
                        {prompt.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => setModal({ prompt })}
                        className="p-1.5 rounded-lg text-[#555566] hover:text-[#7D1AD7] hover:bg-[rgba(125,26,215,0.08)] opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => setDeleteId(prompt.id)}
                        className="p-1.5 rounded-lg text-[#555566] hover:text-[#FF5252] hover:bg-[rgba(255,82,82,0.12)] opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 size={13} />
                      </button>
                      <button
                        onClick={() => toggleFav(prompt.id)}
                        className="p-1.5 rounded-lg transition-colors hover:bg-[#202024]"
                      >
                        <Star
                          size={16}
                          style={{
                            fill: prompt.favorited ? "#FFB300" : "none",
                            color: prompt.favorited ? "#FFB300" : "#555566",
                          }}
                        />
                      </button>
                    </div>
                  </div>
                  <div
                    className="mt-3 rounded-lg p-3 cursor-pointer"
                    style={{
                      background: "#202024",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                    onClick={() =>
                      setExpanded((e) => ({ ...e, [prompt.id]: !e[prompt.id] }))
                    }
                  >
                    <p className="text-xs text-[#8A8A9A] leading-relaxed whitespace-pre-line">
                      {isExp
                        ? prompt.content
                        : prompt.content.slice(0, 100) +
                          (prompt.content.length > 100 ? "…" : "")}
                      {prompt.content.length > 100 && (
                        <span className="text-[#7D1AD7] ml-1">
                          {isExp ? " ▲" : " ▼"}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex gap-1.5 flex-wrap">
                      {prompt.tags.map((tag) => (
                        <span
                          key={tag}
                          className="flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full"
                          style={{
                            background: "rgba(255,255,255,0.06)",
                            color: "#8A8A9A",
                          }}
                        >
                          <Hash size={9} />
                          {tag}
                        </span>
                      ))}
                    </div>
                    <button
                      onClick={() => copyPrompt(prompt.id, prompt.content)}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium hover:opacity-80"
                      style={
                        copied === prompt.id
                          ? {
                              background: "rgba(0,200,83,0.15)",
                              color: "#00C853",
                            }
                          : {
                              background: "rgba(125,26,215,0.08)",
                              color: "#507AE6",
                            }
                      }
                    >
                      {copied === prompt.id ? (
                        <>
                          <Check size={11} /> Copiado!
                        </>
                      ) : (
                        <>
                          <Copy size={11} /> Copiar
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div className="empty-state text-center py-12 text-[#8A8A9A]">
              {search
                ? `Nenhum resultado para "${search}"`
                : "Nenhum prompt encontrado"}
            </div>
          )}
        </div>

        {modal && (
          <PromptModal
            initial={modal.prompt}
            onSave={savePrompt}
            onClose={() => setModal(null)}
          />
        )}
        {deleteId !== null && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onClick={() => setDeleteId(null)}
          >
            <div
              className="bg-[#17171A] rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="font-semibold text-[#F0F0F5] mb-1">
                Apagar prompt?
              </p>
              <p className="text-sm text-[#8A8A9A] mb-4">
                Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => deletePrompt(deleteId)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-[#FF5252]"
                >
                  Apagar
                </button>
                <button
                  onClick={() => setDeleteId(null)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-[#8A8A9A] hover:bg-[rgba(255,255,255,0.08)]"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────
