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
import type {
  ChannelType,
  Prompt,
  Material,
  Post,
  PostMedia,
} from "@/shared/model/domain"
import { libraryApi as api } from "../api"
import BrandMark from "@/shared/ui/BrandMark"
import { isSafeHttpsUrl } from "@/shared/lib/url"
import {
  ChannelBadge,
  ChannelFilter,
  CH,
  FormRow,
  formatBytes,
  Inp,
  Modal,
  Tab,
  type PostFormData,
} from "../components/shared"
function PostModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: Post
  onSave: (post: Post) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<PostFormData>({
    title: initial?.title ?? "",
    channel: initial?.channel ?? "instagram",
    campaign: initial?.campaign ?? "",
    format: initial?.format ?? "carousel",
    images: initial?.images ?? [],
    linkUrl: initial?.linkUrl ?? "",
    ctr: initial?.ctr !== undefined ? String(initial.ctr) : "",
    profileVisits:
      initial?.profileVisits !== undefined ? String(initial.profileVisits) : "",
    caption: initial?.caption ?? "",
    publishedAt: initial?.publishedAt ?? "",
    validUntil: initial?.validUntil ?? "",
    likes: String(initial?.insights.likes ?? ""),
    reach: String(initial?.insights.reach ?? ""),
    impressions: String(initial?.insights.impressions ?? ""),
    engagement: String(initial?.insights.engagement ?? ""),
    saves: String(initial?.insights.saves ?? ""),
    shares: String(initial?.insights.shares ?? ""),
    comments: String(initial?.insights.comments ?? ""),
  })
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState("")
  const [linkError, setLinkError] = useState("")
  const [metricError, setMetricError] = useState("")

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return
    setUploading(true)
    setUploadError("")
    try {
      const uploaded = await Promise.all(
        Array.from(fileList).map((file) => api.posts.uploadMedia(file)),
      )
      setForm((f) => ({
        ...f,
        images: [
          ...f.images,
          ...uploaded.map(
            (u): PostMedia => ({
              url: u.url,
              tipo: u.tipo === "VIDEO" ? "video" : "imagem",
            }),
          ),
        ],
      }))
    } catch {
      setUploadError("Falha ao enviar arquivo. Tente novamente.")
    } finally {
      setUploading(false)
    }
  }

  function removeImage(idx: number) {
    setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== idx) }))
  }

  function validateLink(value: string) {
    if (!value) {
      setLinkError("")
      return true
    }
    if (isSafeHttpsUrl(value)) {
      setLinkError("")
      return true
    }
    setLinkError("Informe uma URL HTTPS válida, sem usuário ou senha.")
    return false
  }

  function save() {
    if (!form.title.trim()) return
    if (!validateLink(form.linkUrl)) return
    let ctr: number | undefined
    let profileVisits: number | undefined
    if (form.channel === "linkedin" && form.ctr.trim() !== "") {
      ctr = parseFloat(form.ctr.replace(",", "."))
      if (Number.isNaN(ctr)) {
        setMetricError("Informe um CTR numérico válido (ex: 2.5).")
        return
      }
    } else if (
      form.channel === "instagram" &&
      form.profileVisits.trim() !== ""
    ) {
      profileVisits = parseInt(form.profileVisits, 10)
      if (Number.isNaN(profileVisits)) {
        setMetricError(
          "Informe uma quantidade numérica válida de visitas ao perfil (ex: 150).",
        )
        return
      }
    }
    setMetricError("")
    const post: Post = {
      id: initial?.id ?? Date.now(),
      title: form.title,
      channel: form.channel,
      campaign: form.campaign,
      format: form.format,
      images: form.images.length
        ? form.images
        : [
            {
              url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=400&fit=crop&auto=format",
              tipo: "imagem",
            },
          ],
      linkUrl: form.linkUrl || undefined,
      ctr,
      profileVisits,
      caption: form.caption,
      publishedAt: form.publishedAt,
      validUntil: form.validUntil,
      insights: {
        likes: parseInt(form.likes) || 0,
        reach: parseInt(form.reach) || 0,
        impressions: parseInt(form.impressions) || 0,
        engagement: parseInt(form.engagement) || 0,
        saves: parseInt(form.saves) || 0,
        shares: parseInt(form.shares) || 0,
        comments: parseInt(form.comments) || 0,
      },
    }
    onSave(post)
    onClose()
  }

  const channels: ChannelType[] = ["instagram", "linkedin"]

  return (
    <Modal
      title={initial ? "Editar post" : "Novo post"}
      onClose={onClose}
      wide
      footer={
        <div
          className="px-6 py-4 flex gap-3"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <button
            onClick={save}
            className="px-5 py-2 rounded-xl text-sm font-medium text-white hover:opacity-90 btn-glow"
            style={{ background: "linear-gradient(135deg, #7D1AD7, #50E678)" }}
          >
            {initial ? "Salvar alterações" : "Criar post"}
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
        <FormRow label="Título *">
          <Inp
            value={form.title}
            onChange={(v) => setForm((f) => ({ ...f, title: v }))}
            placeholder="Título do post"
          />
        </FormRow>
        <FormRow label="Canal">
          <div className="flex gap-2 flex-wrap">
            {channels.map((ch) => (
              <button
                key={ch}
                onClick={() => setForm((f) => ({ ...f, channel: ch }))}
                className="filter-pill text-xs px-3 py-1.5 rounded-full font-medium transition-all"
                style={
                  form.channel === ch
                    ? { background: CH[ch].dot, color: "#fff" }
                    : { background: CH[ch].bg, color: CH[ch].color }
                }
              >
                {CH[ch].label}
              </button>
            ))}
          </div>
        </FormRow>
        <FormRow label="Campanha">
          <Inp
            value={form.campaign}
            onChange={(v) => setForm((f) => ({ ...f, campaign: v }))}
            placeholder="Ex: Lançamento Produto Q3"
          />
        </FormRow>
        <FormRow label="Formato do conteúdo">
          <select
            value={form.format}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                format: e.target.value as Post["format"],
              }))
            }
            className="w-full text-sm px-3 py-2 rounded-lg border border-[rgba(255,255,255,0.1)] focus:outline-none focus:border-[#7D1AD7]"
          >
            <option value="reel">Reel</option>
            <option value="carousel">Carrossel</option>
            <option value="static">Post estático</option>
            <option value="story">Story</option>
            <option value="document">Documento / PDF</option>
            <option value="video">Vídeo</option>
            <option value="article">Artigo</option>
            <option value="poll">Enquete</option>
          </select>
        </FormRow>
        <FormRow label="Imagens / vídeos do post">
          <div className="space-y-2">
            {form.images.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {form.images.map((img, i) => (
                  <div
                    key={i}
                    className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0"
                    style={{ background: "#202024" }}
                  >
                    {img.tipo === "video" ? (
                      <video
                        src={img.url}
                        className="w-full h-full object-cover"
                        muted
                      />
                    ) : (
                      <img
                        src={img.url}
                        className="w-full h-full object-cover"
                        alt=""
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 text-white flex items-center justify-center"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              disabled={uploading}
              onChange={(e) => {
                handleFiles(e.target.files)
                e.target.value = ""
              }}
              className="w-full text-xs text-[#8A8A9A] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-[rgba(125,26,215,0.08)] file:text-[#507AE6] file:cursor-pointer"
            />
            {uploading && <p className="text-xs text-[#8A8A9A]">Enviando...</p>}
            {uploadError && (
              <p className="text-xs text-[#FF5252]">{uploadError}</p>
            )}
          </div>
        </FormRow>
        <FormRow label="Link do post (opcional)">
          <Inp
            value={form.linkUrl}
            onChange={(v) => {
              setForm((f) => ({ ...f, linkUrl: v }))
              validateLink(v)
            }}
            placeholder="https://..."
          />
          {linkError && (
            <p className="text-xs text-[#FF5252] mt-1">{linkError}</p>
          )}
        </FormRow>
        <FormRow label="Legenda / Texto">
          <Inp
            as="textarea"
            value={form.caption}
            onChange={(v) => setForm((f) => ({ ...f, caption: v }))}
            placeholder="Texto do post..."
          />
        </FormRow>
        <div className="grid grid-cols-2 gap-4">
          <FormRow label="Data de publicação">
            <Inp
              type="date"
              value={form.publishedAt}
              onChange={(v) => setForm((f) => ({ ...f, publishedAt: v }))}
            />
          </FormRow>
          <FormRow label="Válido até">
            <Inp
              type="date"
              value={form.validUntil}
              onChange={(v) => setForm((f) => ({ ...f, validUntil: v }))}
            />
          </FormRow>
        </div>
        <div
          className="pt-2"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <p className="text-xs font-semibold text-[#8A8A9A] uppercase tracking-wide mb-3">
            Insights
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {([
              ["likes", "Curtidas"],
              ["comments", "Comentários"],
              ["saves", "Salvamentos"],
              ["shares", "Compartilhamentos"],
              ["reach", "Alcance"],
              ["impressions", "Impressões"],
              ["engagement", "Engajamento do post"],
            ] as [keyof PostFormData, string][]).map(([k, l]) => (
              <FormRow key={k} label={l}>
                <Inp
                  type="number"
                  value={form[k] as string}
                  onChange={(v) => setForm((f) => ({ ...f, [k]: v }))}
                  placeholder="0"
                />
              </FormRow>
            ))}
            {form.channel === "linkedin" && (
              <FormRow label="CTR do post (%)">
                <Inp
                  type="number"
                  value={form.ctr}
                  onChange={(v) => {
                    setForm((f) => ({ ...f, ctr: v }))
                    setMetricError("")
                  }}
                  placeholder="2.5"
                />
              </FormRow>
            )}
            {form.channel === "instagram" && (
              <FormRow label="Visitas ao perfil">
                <Inp
                  type="number"
                  value={form.profileVisits}
                  onChange={(v) => {
                    setForm((f) => ({ ...f, profileVisits: v }))
                    setMetricError("")
                  }}
                  placeholder="150"
                />
              </FormRow>
            )}
          </div>
          {metricError && (
            <p className="text-xs text-[#FF5252] mt-2">{metricError}</p>
          )}
        </div>
      </div>
    </Modal>
  )
}

type PostChannelOption = "instagram" | "linkedin" | "todos"

function PostChannelDropdown({
  value,
  onChange,
}: {
  value: PostChannelOption
  onChange: (c: PostChannelOption) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const opts: { id: PostChannelOption; label: string }[] = [
    { id: "todos", label: "Todos" },
    { id: "instagram", label: "Instagram" },
    { id: "linkedin", label: "LinkedIn" },
  ]
  const current = opts.find((o) => o.id === value)!
  const currentColor =
    value !== "todos" ? CH[(value as ChannelType)].dot : "#7D1AD7"

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 text-sm font-semibold pl-3.5 pr-3 py-2 rounded-xl transition-all"
        style={{
          background: "#1A1A25",
          border: `1.5px solid ${
            open ? currentColor : "rgba(255,255,255,0.14)"
          }`,
          color: "#F0F0F5",
        }}
      >
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: currentColor }}
        />
        {current.label}
        <ChevronDown
          size={14}
          className="transition-transform"
          style={{
            color: "#8A8A9A",
            transform: open ? "rotate(180deg)" : undefined,
          }}
        />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full mt-1.5 w-40 rounded-xl overflow-hidden shadow-2xl z-10"
          style={{
            background: "#1A1A25",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          {opts.map((o) => {
            const active = value === o.id
            const c =
              o.id !== "todos" ? CH[(o.id as ChannelType)].dot : "#7D1AD7"
            return (
              <button
                key={o.id}
                role="menuitem"
                onClick={() => {
                  onChange(o.id)
                  setOpen(false)
                }}
                className="w-full flex items-center gap-2 px-3.5 py-2.5 text-sm text-left transition-all hover:bg-white/10"
                style={
                  active
                    ? {
                        background: "rgba(255,255,255,0.06)",
                        color: "#F0F0F5",
                        fontWeight: 600,
                      }
                    : { color: "#8A8A9A" }
                }
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: c }}
                />
                {o.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

const POST_SORT_OPTIONS: Record<PostChannelOption, {
  id: string
  label: string
}[]> = {
  instagram: [
    { id: "alcance", label: "Alcance" },
    { id: "engajamento", label: "Engajamento" },
    { id: "visitas", label: "Visitas ao perfil" },
  ],
  linkedin: [
    { id: "alcance", label: "Alcance" },
    { id: "engajamento", label: "Engajamento" },
    { id: "ctr", label: "CTR" },
  ],
  todos: [
    { id: "", label: "Sem filtro" },
    { id: "alcance", label: "Alcance" },
    { id: "engajamento", label: "Engajamento" },
    { id: "ctr", label: "CTR" },
    { id: "visitas", label: "Visitas ao perfil" },
  ],
}
const POST_SORT_VALUE: Record<string, (p: Post) => number> = {
  alcance: (p) => p.insights.reach,
  engajamento: (p) => p.insights.engagement,
  ctr: (p) => p.ctr ?? 0,
  visitas: (p) => p.profileVisits ?? 0,
}

function PostSortFilter({
  channel,
  sortBy,
  setSortBy,
}: {
  channel: PostChannelOption
  sortBy: string
  setSortBy: (v: string) => void
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {POST_SORT_OPTIONS[channel].map((o) => (
        <button
          key={o.id}
          onClick={() => setSortBy(o.id)}
          className="text-xs px-3 py-1.5 rounded-full font-medium transition-all"
          style={
            sortBy === o.id
              ? { background: "#7D1AD7", color: "#fff" }
              : { background: "rgba(255,255,255,0.06)", color: "#8A8A9A" }
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function PostsView({
  channel,
  setChannel,
  posts,
  setPosts,
}: {
  channel: Channel
  setChannel: (c: Channel) => void
  posts: Post[]
  setPosts: (fn: (prev: Post[]) => Post[]) => void
}) {
  const [slides, setSlides] = useState<Record<string, number>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [modal, setModal] = useState<{ post?: Post } | null>(null)
  const [deleteId, setDeleteId] = useState<Post["id"] | null>(null)
  const [sortBy, setSortBy] = useState("")

  const postChannel: PostChannelOption =
    channel === "instagram" || channel === "linkedin" ? channel : "todos"
  useEffect(() => {
    setSortBy("")
  }, [postChannel])

  const filtered =
    postChannel === "todos"
      ? posts
      : posts.filter((p) => p.channel === postChannel)
  const sorted =
    sortBy && POST_SORT_VALUE[sortBy]
      ? [...filtered].sort(
          (a, b) => POST_SORT_VALUE[sortBy](b) - POST_SORT_VALUE[sortBy](a),
        )
      : filtered

  function setSlide(id: Post["id"], idx: number) {
    setSlides((s) => ({ ...s, [String(id)]: idx }))
  }
  function toggleExpand(id: Post["id"]) {
    setExpanded((e) => ({ ...e, [String(id)]: !e[String(id)] }))
  }

  function savePost(post: Post) {
    setPosts((prev) => {
      const idx = prev.findIndex((p) => p.id === post.id)
      if (idx >= 0) return prev.map((p, i) => (i === idx ? post : p))
      return [post, ...prev]
    })
  }

  function deletePost(id: Post["id"]) {
    setPosts((prev) => prev.filter((p) => p.id !== id))
    setDeleteId(null)
  }

  return (
    <div className="h-full overflow-auto p-5">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-sm text-[#8A8A9A]">
            {sorted.length} post{sorted.length !== 1 ? "s" : ""}
          </p>
          <PostSortFilter
            channel={postChannel}
            sortBy={sortBy}
            setSortBy={setSortBy}
          />
        </div>
        <div className="flex items-center gap-2">
          <PostChannelDropdown value={postChannel} onChange={setChannel} />
          <button
            onClick={() => setModal({})}
            className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl text-white hover:opacity-90 btn-glow"
            style={{ background: "linear-gradient(135deg, #7D1AD7, #50E678)" }}
          >
            <Plus size={15} /> Adicionar post
          </button>
        </div>
      </div>

      <div
        className="grid gap-5"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}
      >
        {sorted.map((post) => {
          const slide = slides[String(post.id)] ?? 0
          const isExpanded = expanded[String(post.id)]
          const caption = isExpanded
            ? post.caption
            : post.caption.slice(0, 120) +
              (post.caption.length > 120 ? "…" : "")
          const media = post.images[slide]
          return (
            <div
              key={post.id}
              className="editorial-card bg-[#17171A] rounded-2xl overflow-hidden flex flex-col group"
              style={{
                border: "1.5px solid rgba(255,255,255,0.1)",
                boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
              }}
            >
              <div
                className="relative"
                style={{ background: "#202024", aspectRatio: "1/1" }}
              >
                {media?.tipo === "video" ? (
                  <video
                    src={media.url}
                    className="w-full h-full object-cover"
                    controls
                  />
                ) : (
                  <img
                    src={media?.url}
                    alt={post.title}
                    className="w-full h-full object-cover"
                  />
                )}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 20%, transparent 75%, rgba(0,0,0,0.45) 100%)",
                  }}
                />
                {post.images.length > 1 && (
                  <>
                    <button
                      onClick={() => setSlide(post.id, Math.max(0, slide - 1))}
                      disabled={slide === 0}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      onClick={() =>
                        setSlide(
                          post.id,
                          Math.min(post.images.length - 1, slide + 1),
                        )
                      }
                      disabled={slide === post.images.length - 1}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center"
                    >
                      <ChevronRight size={14} />
                    </button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                      {post.images.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setSlide(post.id, i)}
                          className="rounded-full transition-all"
                          style={{
                            width: i === slide ? 16 : 6,
                            height: 6,
                            background:
                              i === slide ? "#fff" : "rgba(255,255,255,0.5)",
                          }}
                        />
                      ))}
                    </div>
                  </>
                )}
                <div className="absolute top-2 left-2">
                  <ChannelBadge ch={post.channel} />
                </div>
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setModal({ post })}
                    className="w-7 h-7 rounded-lg bg-[#17171A]/90 flex items-center justify-center text-[#7D1AD7] hover:bg-[#17171A] shadow-sm"
                  >
                    <Edit2 size={12} />
                  </button>
                  <button
                    onClick={() => setDeleteId(post.id)}
                    className="w-7 h-7 rounded-lg bg-[#17171A]/90 flex items-center justify-center text-[#FF5252] hover:bg-[#17171A] shadow-sm"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              <div className="p-4 flex flex-col flex-1">
                {post.campaign && (
                  <div className="mb-2.5">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium truncate"
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        color: "#8A8A9A",
                      }}
                    >
                      {post.campaign}
                    </span>
                  </div>
                )}
                <h3 className="text-base font-semibold text-[#F0F0F5] mb-2 leading-snug">
                  {post.title}
                </h3>
                {post.linkUrl && (
                  <a
                    href={post.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[#7D1AD7] hover:underline mb-2"
                  >
                    <LinkIcon size={11} /> Ver post original
                  </a>
                )}
                <p className="text-sm text-[#8A8A9A] leading-relaxed whitespace-pre-line flex-1">
                  {caption}
                </p>
                {post.caption.length > 120 && (
                  <button
                    onClick={() => toggleExpand(post.id)}
                    className="text-xs text-[#7D1AD7] hover:text-[#7D1AD7] mt-1 text-left"
                  >
                    {isExpanded ? "Ver menos" : "Ver mais"}
                  </button>
                )}
                <div
                  className="mt-4 pt-3 grid grid-cols-3 gap-2 text-center"
                  style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
                >
                  {[
                    {
                      label: "Alcance",
                      value: post.insights.reach,
                      suffix: "",
                    },
                    {
                      label: "Engajamento",
                      value: post.insights.engagement,
                      suffix: "",
                    },
                    post.channel === "linkedin"
                      ? { label: "CTR", value: post.ctr ?? 0, suffix: "%" }
                      : {
                          label: "Visitas ao perfil",
                          value: post.profileVisits ?? 0,
                          suffix: "",
                        },
                  ].map((kpi) => (
                    <div key={kpi.label}>
                      <div className="text-sm font-semibold text-[#F0F0F5]">
                        {kpi.value.toLocaleString("pt-BR")}
                        {kpi.suffix}
                      </div>
                      <div className="text-xs text-[#555566]">{kpi.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
        {sorted.length === 0 && (
          <div className="empty-state col-span-full text-center py-16 text-[#8A8A9A]">
            Nenhum post neste canal
          </div>
        )}
      </div>

      {modal && (
        <PostModal
          initial={modal.post}
          onSave={savePost}
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
            <p className="font-semibold text-[#F0F0F5] mb-1">Apagar post?</p>
            <p className="text-sm text-[#8A8A9A] mb-4">
              Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => deletePost(deleteId)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-[#FF5252] hover:bg-[#E64545]"
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
  )
}

// ─── Materials ─────────────────────────────────────────────────────────────

const matTypeStyle = {
  ebook: { label: "Ebook", bg: "rgba(125,26,215,0.08)", color: "#507AE6" },
  newsletter: {
    label: "Newsletter",
    bg: "rgba(255,179,0,0.15)",
    color: "#FFB300",
  },
  case: { label: "Case", bg: "rgba(0,200,83,0.15)", color: "#00C853" },
}

interface MatForm {
  type: "ebook" | "newsletter" | "case"
  title: string
  description: string
  cover: string
  downloads: string
  arquivoUrl: string
  arquivoNome: string
  arquivoTamanho: number | null
}
