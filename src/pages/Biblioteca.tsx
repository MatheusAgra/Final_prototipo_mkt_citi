import { useState, useMemo, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  BookOpen, FileText, MessageSquare, Download, Star, Copy, Check,
  ChevronLeft, ChevronRight, ChevronDown, Hash, Eye, Plus, Edit2, Trash2, X, Search, Link as LinkIcon,
  Calendar,
} from 'lucide-react'
import type { Channel } from '../App'
import type { ChannelType, Prompt, Material, Post, PostMedia } from '../data'
import { api } from '../api'
import BrandMark from '../BrandMark'

function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ─── Shared ────────────────────────────────────────────────────────────────

const CH: Record<ChannelType, { label: string; color: string; bg: string; dot: string }> = {
  instagram: { label: 'Instagram', color: '#E1306C', bg: 'rgba(225,48,108,0.15)', dot: '#E1306C' },
  linkedin: { label: 'LinkedIn', color: '#0A66C2', bg: 'rgba(10,102,194,0.15)', dot: '#0A66C2' },
  site: { label: 'Site', color: '#00C853', bg: 'rgba(0,200,83,0.15)', dot: '#00C853' },
  email: { label: 'Email', color: '#FFB300', bg: 'rgba(255,179,0,0.15)', dot: '#FFB300' },
}

function ChannelBadge({ ch }: { ch: ChannelType }) {
  const c = CH[ch]
  return (
    <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: c.bg, color: c.color }}>
      <span className="w-1.5 h-1.5 rounded-full mr-1.5" style={{ background: c.dot }} />
      {c.label}
    </span>
  )
}

function ChannelFilter({ channel, setChannel }: { channel: Channel; setChannel: (c: Channel) => void }) {
  const opts: { id: Channel; label: string }[] = [
    { id: 'todos', label: 'Todos' }, { id: 'instagram', label: 'Instagram' },
    { id: 'linkedin', label: 'LinkedIn' }, { id: 'site', label: 'Site' }, { id: 'email', label: 'Email' },
  ]
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {opts.map((o) => {
        const active = channel === o.id
        const c = o.id !== 'todos' ? CH[o.id as ChannelType] : null
        return (
          <button key={o.id} onClick={() => setChannel(o.id)} className="filter-pill text-xs px-3 py-1.5 rounded-full font-medium transition-all"
            style={active ? { background: c ? c.dot : '#7D1AD7', color: '#fff' } : { background: 'rgba(255,255,255,0.06)', color: '#8A8A9A' }}>
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

type Tab = 'posts' | 'materiais' | 'prompts'

function TabNav({ active, setTab }: { active: Tab; setTab: (t: Tab) => void }) {
  const tabs = [
    { id: 'posts' as Tab, label: 'Posts', icon: <Eye size={14} /> },
    { id: 'materiais' as Tab, label: 'Materiais Ricos', icon: <FileText size={14} /> },
    { id: 'prompts' as Tab, label: 'Prompts', icon: <MessageSquare size={14} /> },
  ]
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

function Modal({ title, onClose, children, footer, wide }: { title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean }) {
  // Renderizado via portal direto no <body>: um ancestral (.module-stage) usa overflow+backdrop-filter,
  // o que cria um containing block para position:fixed e corta o modal. O portal escapa disso de vez.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className={`bg-[#17171A] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden ${wide ? 'w-full max-w-2xl' : 'w-full max-w-md'}`}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 className="font-semibold text-[#F0F0F5]">{title}</h3>
          <button onClick={onClose} className="text-[#555566] hover:text-[#8A8A9A]"><X size={18} /></button>
        </div>
        {/* min-h-0 é necessário: sem ele, um flex item cresce para caber o conteúdo em vez de respeitar max-h-[90vh] do pai e rolar internamente */}
        <div className="overflow-y-auto flex-1 min-h-0">{children}</div>
        {footer && <div className="flex-shrink-0">{footer}</div>}
      </div>
    </div>,
    document.body
  )
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#8A8A9A] mb-1">{label}</label>
      {children}
    </div>
  )
}

function Inp({ value, onChange, placeholder, type = 'text', as }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string; as?: 'textarea' }) {
  const cls = "w-full text-sm px-3 py-2 rounded-lg border border-[rgba(255,255,255,0.1)] focus:outline-none focus:border-[#7D1AD7] focus:ring-2 focus:ring-[rgba(125,26,215,0.1)]"
  if (as === 'textarea') return <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cls} rows={4} />
  return <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cls} />
}

// ─── Posts ─────────────────────────────────────────────────────────────────

interface PostFormData {
  title: string; channel: ChannelType; campaign: string
  format: Post['format']
  images: PostMedia[]; linkUrl: string; ctr: string; profileVisits: string; caption: string
  publishedAt: string; validUntil: string
  likes: string; reach: string; impressions: string; engagement: string; saves: string
  shares: string; comments: string
}

function PostModal({ initial, onSave, onClose }: {
  initial?: Post
  onSave: (post: Post) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<PostFormData>({
    title: initial?.title ?? '',
    channel: initial?.channel ?? 'instagram',
    campaign: initial?.campaign ?? '',
    format: initial?.format ?? 'carousel',
    images: initial?.images ?? [],
    linkUrl: initial?.linkUrl ?? '',
    ctr: initial?.ctr !== undefined ? String(initial.ctr) : '',
    profileVisits: initial?.profileVisits !== undefined ? String(initial.profileVisits) : '',
    caption: initial?.caption ?? '',
    publishedAt: initial?.publishedAt ?? '',
    validUntil: initial?.validUntil ?? '',
    likes: String(initial?.insights.likes ?? ''),
    reach: String(initial?.insights.reach ?? ''),
    impressions: String(initial?.insights.impressions ?? ''),
    engagement: String(initial?.insights.engagement ?? ''),
    saves: String(initial?.insights.saves ?? ''),
    shares: String(initial?.insights.shares ?? ''),
    comments: String(initial?.insights.comments ?? ''),
  })
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [linkError, setLinkError] = useState('')
  const [metricError, setMetricError] = useState('')

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return
    setUploading(true); setUploadError('')
    try {
      const uploaded = await Promise.all(Array.from(fileList).map((file) => api.posts.uploadMedia(file)))
      setForm((f) => ({ ...f, images: [...f.images, ...uploaded.map((u): PostMedia => ({ url: u.url, tipo: u.tipo === 'VIDEO' ? 'video' : 'imagem' }))] }))
    } catch {
      setUploadError('Falha ao enviar arquivo. Tente novamente.')
    } finally { setUploading(false) }
  }

  function removeImage(idx: number) {
    setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== idx) }))
  }

  function validateLink(value: string) {
    if (!value) { setLinkError(''); return true }
    try { new URL(value); setLinkError(''); return true }
    catch { setLinkError('Informe uma URL válida (ex: https://...)'); return false }
  }

  function save() {
    if (!form.title.trim()) return
    if (!validateLink(form.linkUrl)) return
    let ctr: number | undefined
    let profileVisits: number | undefined
    if (form.channel === 'linkedin' && form.ctr.trim() !== '') {
      ctr = parseFloat(form.ctr.replace(',', '.'))
      if (Number.isNaN(ctr)) { setMetricError('Informe um CTR numérico válido (ex: 2.5).'); return }
    } else if (form.channel === 'instagram' && form.profileVisits.trim() !== '') {
      profileVisits = parseInt(form.profileVisits, 10)
      if (Number.isNaN(profileVisits)) { setMetricError('Informe uma quantidade numérica válida de visitas ao perfil (ex: 150).'); return }
    }
    setMetricError('')
    const post: Post = {
      id: initial?.id ?? Date.now(),
      title: form.title, channel: form.channel, campaign: form.campaign, format: form.format,
      images: form.images.length ? form.images : [{ url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=400&fit=crop&auto=format', tipo: 'imagem' }],
      linkUrl: form.linkUrl || undefined,
      ctr, profileVisits,
      caption: form.caption, publishedAt: form.publishedAt, validUntil: form.validUntil,
      insights: {
        likes: parseInt(form.likes) || 0, reach: parseInt(form.reach) || 0, impressions: parseInt(form.impressions) || 0,
        engagement: parseInt(form.engagement) || 0, saves: parseInt(form.saves) || 0,
        shares: parseInt(form.shares) || 0, comments: parseInt(form.comments) || 0,
      },
    }
    onSave(post); onClose()
  }

  const channels: ChannelType[] = ['instagram', 'linkedin']

  return (
    <Modal title={initial ? 'Editar post' : 'Novo post'} onClose={onClose} wide footer={
      <div className="px-6 py-4 flex gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={save} className="px-5 py-2 rounded-xl text-sm font-medium text-white hover:opacity-90 btn-glow"
          style={{ background: 'linear-gradient(135deg, #7D1AD7, #50E678)' }}>
          {initial ? 'Salvar alterações' : 'Criar post'}
        </button>
        <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-[#8A8A9A] hover:bg-[rgba(255,255,255,0.08)]">Cancelar</button>
      </div>
    }>
      <div className="px-6 py-4 space-y-4">
        <FormRow label="Título *">
          <Inp value={form.title} onChange={(v) => setForm((f) => ({ ...f, title: v }))} placeholder="Título do post" />
        </FormRow>
        <FormRow label="Canal">
          <div className="flex gap-2 flex-wrap">
            {channels.map((ch) => (
              <button key={ch} onClick={() => setForm((f) => ({ ...f, channel: ch }))} className="filter-pill text-xs px-3 py-1.5 rounded-full font-medium transition-all"
                style={form.channel === ch ? { background: CH[ch].dot, color: '#fff' } : { background: CH[ch].bg, color: CH[ch].color }}>
                {CH[ch].label}
              </button>
            ))}
          </div>
        </FormRow>
        <FormRow label="Campanha">
          <Inp value={form.campaign} onChange={(v) => setForm((f) => ({ ...f, campaign: v }))} placeholder="Ex: Lançamento Produto Q3" />
        </FormRow>
        <FormRow label="Formato do conteúdo">
          <select value={form.format} onChange={(e) => setForm((f) => ({ ...f, format: e.target.value as Post['format'] }))}
            className="w-full text-sm px-3 py-2 rounded-lg border border-[rgba(255,255,255,0.1)] focus:outline-none focus:border-[#7D1AD7]">
            <option value="reel">Reel</option><option value="carousel">Carrossel</option><option value="static">Post estático</option>
            <option value="story">Story</option><option value="document">Documento / PDF</option><option value="video">Vídeo</option>
            <option value="article">Artigo</option><option value="poll">Enquete</option>
          </select>
        </FormRow>
        <FormRow label="Imagens / vídeos do post">
          <div className="space-y-2">
            {form.images.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {form.images.map((img, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0" style={{ background: '#202024' }}>
                    {img.tipo === 'video'
                      ? <video src={img.url} className="w-full h-full object-cover" muted />
                      : <img src={img.url} className="w-full h-full object-cover" alt="" />}
                    <button type="button" onClick={() => removeImage(i)}
                      className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 text-white flex items-center justify-center">
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <input type="file" multiple accept="image/*,video/*" disabled={uploading}
              onChange={(e) => { handleFiles(e.target.files); e.target.value = '' }}
              className="w-full text-xs text-[#8A8A9A] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-[rgba(125,26,215,0.08)] file:text-[#507AE6] file:cursor-pointer" />
            {uploading && <p className="text-xs text-[#8A8A9A]">Enviando...</p>}
            {uploadError && <p className="text-xs text-[#FF5252]">{uploadError}</p>}
          </div>
        </FormRow>
        <FormRow label="Link do post (opcional)">
          <Inp value={form.linkUrl} onChange={(v) => { setForm((f) => ({ ...f, linkUrl: v })); validateLink(v) }} placeholder="https://..." />
          {linkError && <p className="text-xs text-[#FF5252] mt-1">{linkError}</p>}
        </FormRow>
        <FormRow label="Legenda / Texto">
          <Inp as="textarea" value={form.caption} onChange={(v) => setForm((f) => ({ ...f, caption: v }))} placeholder="Texto do post..." />
        </FormRow>
        <div className="grid grid-cols-2 gap-4">
          <FormRow label="Data de publicação">
            <Inp type="date" value={form.publishedAt} onChange={(v) => setForm((f) => ({ ...f, publishedAt: v }))} />
          </FormRow>
          <FormRow label="Válido até">
            <Inp type="date" value={form.validUntil} onChange={(v) => setForm((f) => ({ ...f, validUntil: v }))} />
          </FormRow>
        </div>
        <div className="pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-xs font-semibold text-[#8A8A9A] uppercase tracking-wide mb-3">Insights</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {([['likes', 'Curtidas'], ['comments', 'Comentários'], ['saves', 'Salvamentos'], ['shares', 'Compartilhamentos'], ['reach', 'Alcance'], ['impressions', 'Impressões'], ['engagement', 'Engajamento do post']] as [keyof PostFormData, string][]).map(([k, l]) => (
              <FormRow key={k} label={l}>
                <Inp type="number" value={form[k] as string} onChange={(v) => setForm((f) => ({ ...f, [k]: v }))} placeholder="0" />
              </FormRow>
            ))}
            {form.channel === 'linkedin' && (
              <FormRow label="CTR do post (%)">
                <Inp type="number" value={form.ctr} onChange={(v) => { setForm((f) => ({ ...f, ctr: v })); setMetricError('') }} placeholder="2.5" />
              </FormRow>
            )}
            {form.channel === 'instagram' && (
              <FormRow label="Visitas ao perfil">
                <Inp type="number" value={form.profileVisits} onChange={(v) => { setForm((f) => ({ ...f, profileVisits: v })); setMetricError('') }} placeholder="150" />
              </FormRow>
            )}
          </div>
          {metricError && <p className="text-xs text-[#FF5252] mt-2">{metricError}</p>}
        </div>
      </div>
    </Modal>
  )
}

type PostChannelOption = 'instagram' | 'linkedin' | 'todos'

function PostChannelDropdown({ value, onChange }: { value: PostChannelOption; onChange: (c: PostChannelOption) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const opts: { id: PostChannelOption; label: string }[] = [
    { id: 'todos', label: 'Todos' }, { id: 'instagram', label: 'Instagram' }, { id: 'linkedin', label: 'LinkedIn' },
  ]
  const current = opts.find((o) => o.id === value)!
  const currentColor = value !== 'todos' ? CH[value as ChannelType].dot : '#7D1AD7'

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}
        className="flex items-center gap-2 text-sm font-semibold pl-3.5 pr-3 py-2 rounded-xl transition-all"
        style={{ background: '#1A1A25', border: `1.5px solid ${open ? currentColor : 'rgba(255,255,255,0.14)'}`, color: '#F0F0F5' }}>
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: currentColor }} />
        {current.label}
        <ChevronDown size={14} className="transition-transform" style={{ color: '#8A8A9A', transform: open ? 'rotate(180deg)' : undefined }} />
      </button>
      {open && (
        <div role="menu" className="absolute left-0 top-full mt-1.5 w-40 rounded-xl overflow-hidden shadow-2xl z-10"
          style={{ background: '#1A1A25', border: '1px solid rgba(255,255,255,0.1)' }}>
          {opts.map((o) => {
            const active = value === o.id
            const c = o.id !== 'todos' ? CH[o.id as ChannelType].dot : '#7D1AD7'
            return (
              <button key={o.id} role="menuitem" onClick={() => { onChange(o.id); setOpen(false) }}
                className="w-full flex items-center gap-2 px-3.5 py-2.5 text-sm text-left transition-all hover:bg-white/10"
                style={active ? { background: 'rgba(255,255,255,0.06)', color: '#F0F0F5', fontWeight: 600 } : { color: '#8A8A9A' }}>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c }} />
                {o.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

const POST_SORT_OPTIONS: Record<PostChannelOption, { id: string; label: string }[]> = {
  instagram: [{ id: 'alcance', label: 'Alcance' }, { id: 'engajamento', label: 'Engajamento' }, { id: 'visitas', label: 'Visitas ao perfil' }],
  linkedin: [{ id: 'alcance', label: 'Alcance' }, { id: 'engajamento', label: 'Engajamento' }, { id: 'ctr', label: 'CTR' }],
  todos: [{ id: '', label: 'Sem filtro' }, { id: 'alcance', label: 'Alcance' }, { id: 'engajamento', label: 'Engajamento' }, { id: 'ctr', label: 'CTR' }, { id: 'visitas', label: 'Visitas ao perfil' }],
}
const POST_SORT_VALUE: Record<string, (p: Post) => number> = {
  alcance: (p) => p.insights.reach,
  engajamento: (p) => p.insights.engagement,
  ctr: (p) => p.ctr ?? 0,
  visitas: (p) => p.profileVisits ?? 0,
}

function PostSortFilter({ channel, sortBy, setSortBy }: { channel: PostChannelOption; sortBy: string; setSortBy: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {POST_SORT_OPTIONS[channel].map((o) => (
        <button key={o.id} onClick={() => setSortBy(o.id)} className="text-xs px-3 py-1.5 rounded-full font-medium transition-all"
          style={sortBy === o.id ? { background: '#7D1AD7', color: '#fff' } : { background: 'rgba(255,255,255,0.06)', color: '#8A8A9A' }}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

function PostsView({ channel, setChannel, posts, setPosts }: { channel: Channel; setChannel: (c: Channel) => void; posts: Post[]; setPosts: (fn: (prev: Post[]) => Post[]) => void }) {
  const [slides, setSlides] = useState<Record<string, number>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [modal, setModal] = useState<{ post?: Post } | null>(null)
  const [deleteId, setDeleteId] = useState<Post['id'] | null>(null)
  const [sortBy, setSortBy] = useState('')

  const postChannel: PostChannelOption = channel === 'instagram' || channel === 'linkedin' ? channel : 'todos'
  useEffect(() => { setSortBy('') }, [postChannel])

  const filtered = postChannel === 'todos' ? posts : posts.filter((p) => p.channel === postChannel)
  const sorted = sortBy && POST_SORT_VALUE[sortBy] ? [...filtered].sort((a, b) => POST_SORT_VALUE[sortBy](b) - POST_SORT_VALUE[sortBy](a)) : filtered

  function setSlide(id: Post['id'], idx: number) { setSlides((s) => ({ ...s, [String(id)]: idx })) }
  function toggleExpand(id: Post['id']) { setExpanded((e) => ({ ...e, [String(id)]: !e[String(id)] })) }

  function savePost(post: Post) {
    setPosts((prev) => {
      const idx = prev.findIndex((p) => p.id === post.id)
      if (idx >= 0) return prev.map((p, i) => i === idx ? post : p)
      return [post, ...prev]
    })
  }

  function deletePost(id: Post['id']) {
    setPosts((prev) => prev.filter((p) => p.id !== id))
    setDeleteId(null)
  }

  return (
    <div className="h-full overflow-auto p-5">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-sm text-[#8A8A9A]">{sorted.length} post{sorted.length !== 1 ? 's' : ''}</p>
          <PostSortFilter channel={postChannel} sortBy={sortBy} setSortBy={setSortBy} />
        </div>
        <div className="flex items-center gap-2">
          <PostChannelDropdown value={postChannel} onChange={setChannel} />
          <button onClick={() => setModal({})} className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl text-white hover:opacity-90 btn-glow"
            style={{ background: 'linear-gradient(135deg, #7D1AD7, #50E678)' }}>
            <Plus size={15} /> Adicionar post
          </button>
        </div>
      </div>

      <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {sorted.map((post) => {
          const slide = slides[String(post.id)] ?? 0
          const isExpanded = expanded[String(post.id)]
          const caption = isExpanded ? post.caption : post.caption.slice(0, 120) + (post.caption.length > 120 ? '…' : '')
          const media = post.images[slide]
          return (
            <div key={post.id} className="editorial-card bg-[#17171A] rounded-2xl overflow-hidden flex flex-col group"
              style={{ border: '1.5px solid rgba(255,255,255,0.1)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <div className="relative" style={{ background: '#202024', aspectRatio: '1/1' }}>
                {media?.tipo === 'video'
                  ? <video src={media.url} className="w-full h-full object-cover" controls />
                  : <img src={media?.url} alt={post.title} className="w-full h-full object-cover" />}
                <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 20%, transparent 75%, rgba(0,0,0,0.45) 100%)' }} />
                {post.images.length > 1 && (
                  <>
                    <button onClick={() => setSlide(post.id, Math.max(0, slide - 1))} disabled={slide === 0}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center">
                      <ChevronLeft size={14} />
                    </button>
                    <button onClick={() => setSlide(post.id, Math.min(post.images.length - 1, slide + 1))} disabled={slide === post.images.length - 1}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center">
                      <ChevronRight size={14} />
                    </button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                      {post.images.map((_, i) => (
                        <button key={i} onClick={() => setSlide(post.id, i)} className="rounded-full transition-all"
                          style={{ width: i === slide ? 16 : 6, height: 6, background: i === slide ? '#fff' : 'rgba(255,255,255,0.5)' }} />
                      ))}
                    </div>
                  </>
                )}
                <div className="absolute top-2 left-2"><ChannelBadge ch={post.channel} /></div>
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setModal({ post })} className="w-7 h-7 rounded-lg bg-[#17171A]/90 flex items-center justify-center text-[#7D1AD7] hover:bg-[#17171A] shadow-sm">
                    <Edit2 size={12} />
                  </button>
                  <button onClick={() => setDeleteId(post.id)} className="w-7 h-7 rounded-lg bg-[#17171A]/90 flex items-center justify-center text-[#FF5252] hover:bg-[#17171A] shadow-sm">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              <div className="p-4 flex flex-col flex-1">
                {(post.campaign || post.validUntil) && (
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    {post.campaign
                      ? <span className="text-xs px-2 py-0.5 rounded-full font-medium truncate" style={{ background: 'rgba(255,255,255,0.06)', color: '#8A8A9A' }}>{post.campaign}</span>
                      : <span />}
                    {post.validUntil && (
                      <span className="flex items-center gap-1 text-xs text-[#555566] flex-shrink-0">
                        <Calendar size={11} /> até {post.validUntil.slice(5).split('-').reverse().join('/')}
                      </span>
                    )}
                  </div>
                )}
                <h3 className="text-base font-semibold text-[#F0F0F5] mb-2 leading-snug text-center">{post.title}</h3>
                {post.linkUrl && (
                  <a href={post.linkUrl} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[#7D1AD7] hover:underline mb-2">
                    <LinkIcon size={11} /> Ver post original
                  </a>
                )}
                <p className="text-sm text-[#8A8A9A] leading-relaxed whitespace-pre-line flex-1">{caption}</p>
                {post.caption.length > 120 && (
                  <button onClick={() => toggleExpand(post.id)} className="text-xs text-[#7D1AD7] hover:text-[#7D1AD7] mt-1 text-left">
                    {isExpanded ? 'Ver menos' : 'Ver mais'}
                  </button>
                )}
                <div className="mt-4 pt-3 grid grid-cols-3 gap-2 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  {[
                    { label: 'Alcance', value: post.insights.reach, suffix: '' },
                    { label: 'Engajamento', value: post.insights.engagement, suffix: '' },
                    post.channel === 'linkedin'
                      ? { label: 'CTR', value: post.ctr ?? 0, suffix: '%' }
                      : { label: 'Visitas ao perfil', value: post.profileVisits ?? 0, suffix: '' },
                  ].map((kpi) => (
                    <div key={kpi.label}>
                      <div className="text-sm font-semibold text-[#F0F0F5]">{kpi.value.toLocaleString('pt-BR')}{kpi.suffix}</div>
                      <div className="text-xs text-[#555566]">{kpi.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
        {sorted.length === 0 && <div className="empty-state col-span-full text-center py-16 text-[#8A8A9A]">Nenhum post neste canal</div>}
      </div>

      {modal && <PostModal initial={modal.post} onSave={savePost} onClose={() => setModal(null)} />}

      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDeleteId(null)}>
          <div className="bg-[#17171A] rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <p className="font-semibold text-[#F0F0F5] mb-1">Apagar post?</p>
            <p className="text-sm text-[#8A8A9A] mb-4">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-2">
              <button onClick={() => deletePost(deleteId)} className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-[#FF5252] hover:bg-[#E64545]">Apagar</button>
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 rounded-xl text-sm font-medium text-[#8A8A9A] hover:bg-[rgba(255,255,255,0.08)]">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Materials ─────────────────────────────────────────────────────────────

const matTypeStyle = {
  ebook: { label: 'Ebook', bg: 'rgba(125,26,215,0.08)', color: '#507AE6' },
  newsletter: { label: 'Newsletter', bg: 'rgba(255,179,0,0.15)', color: '#FFB300' },
  case: { label: 'Case', bg: 'rgba(0,200,83,0.15)', color: '#00C853' },
}

interface MatForm {
  type: 'ebook' | 'newsletter' | 'case'
  title: string; description: string; cover: string; downloads: string
  arquivoUrl: string; arquivoNome: string; arquivoTamanho: number | null
}

function MaterialModal({ initial, onSave, onClose }: { initial?: Material; onSave: (m: Material, isNew: boolean) => void; onClose: () => void }) {
  const [form, setForm] = useState<MatForm>({
    type: initial?.type ?? 'ebook',
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    cover: initial?.cover ?? '',
    downloads: String(initial?.downloads ?? '0'),
    arquivoUrl: initial?.arquivoUrl ?? '',
    arquivoNome: initial?.arquivoNome ?? '',
    arquivoTamanho: initial?.arquivoTamanho ?? null,
  })
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  async function handleFile(file: File | undefined) {
    if (!file) return
    setUploading(true); setUploadError('')
    try {
      const result = await api.materials.upload(file)
      setForm((f) => ({ ...f, arquivoUrl: result.arquivoUrl, arquivoNome: result.nomeArquivo, arquivoTamanho: result.tamanhoBytes }))
    } catch {
      setUploadError('Falha ao enviar o arquivo. Tente novamente.')
    } finally { setUploading(false) }
  }

  function save() {
    if (!form.title.trim()) return
    onSave({
      id: initial?.id ?? Date.now(),
      type: form.type, title: form.title, description: form.description,
      cover: form.cover || 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=250&fit=crop&auto=format',
      downloads: parseInt(form.downloads) || 0,
      createdAt: initial?.createdAt ?? new Date().toISOString().slice(0, 10),
      arquivoUrl: form.arquivoUrl || undefined,
      arquivoNome: form.arquivoNome || undefined,
      arquivoTamanho: form.arquivoTamanho ?? undefined,
    }, !initial)
    onClose()
  }

  return (
    <Modal title={initial ? 'Editar material' : 'Novo material'} onClose={onClose} footer={
      <div className="px-6 py-4 flex gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={save} className="px-5 py-2 rounded-xl text-sm font-medium text-white hover:opacity-90 btn-glow"
          style={{ background: 'linear-gradient(135deg, #7D1AD7, #50E678)' }}>
          {initial ? 'Salvar' : 'Criar material'}
        </button>
        <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-[#8A8A9A] hover:bg-[rgba(255,255,255,0.08)]">Cancelar</button>
      </div>
    }>
      <div className="px-6 py-4 space-y-4">
        <FormRow label="Tipo">
          <div className="flex gap-2">
            {(['ebook', 'newsletter', 'case'] as const).map((t) => {
              const s = matTypeStyle[t]
              return (
                <button key={t} onClick={() => setForm((f) => ({ ...f, type: t }))} className="flex-1 text-xs py-2 rounded-lg font-medium transition-all"
                  style={form.type === t ? { background: s.color, color: '#fff' } : { background: s.bg, color: s.color }}>
                  {s.label}
                </button>
              )
            })}
          </div>
        </FormRow>
        <FormRow label="Título *">
          <Inp value={form.title} onChange={(v) => setForm((f) => ({ ...f, title: v }))} placeholder="Título do material" />
        </FormRow>
        <FormRow label="Descrição">
          <Inp value={form.description} onChange={(v) => setForm((f) => ({ ...f, description: v }))} placeholder="Breve descrição..." />
        </FormRow>
        <FormRow label="URL da capa">
          <Inp value={form.cover} onChange={(v) => setForm((f) => ({ ...f, cover: v }))} placeholder="https://..." />
        </FormRow>
        <FormRow label="Arquivo (PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX)">
          <input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx" disabled={uploading}
            onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = '' }}
            className="w-full text-xs text-[#8A8A9A] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-[rgba(125,26,215,0.08)] file:text-[#507AE6] file:cursor-pointer" />
          {uploading && <p className="text-xs text-[#8A8A9A] mt-1">Enviando...</p>}
          {uploadError && <p className="text-xs text-[#FF5252] mt-1">{uploadError}</p>}
          {form.arquivoNome && !uploading && (
            <p className="text-xs text-[#8A8A9A] mt-1">{form.arquivoNome} · {formatBytes(form.arquivoTamanho)}</p>
          )}
        </FormRow>
        <FormRow label="Downloads">
          <Inp type="number" value={form.downloads} onChange={(v) => setForm((f) => ({ ...f, downloads: v }))} placeholder="0" />
        </FormRow>
      </div>
    </Modal>
  )
}

function mapMaterial(row: any): Material {
  return {
    id: row.id,
    type: row.tipo.toLowerCase() as Material['type'],
    title: row.titulo,
    description: row.descricao,
    cover: row.capaUrl || '',
    downloads: row.downloads,
    createdAt: row.createdAt?.slice(0, 10) ?? '',
    arquivoUrl: row.arquivoUrl ?? undefined,
    arquivoNome: row.nomeArquivo ?? undefined,
    arquivoTamanho: row.tamanhoBytes ?? undefined,
  }
}

function MaterialsView() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<'todos' | 'ebook' | 'newsletter' | 'case'>('todos')
  const [modal, setModal] = useState<{ mat?: Material } | null>(null)
  const [deleteId, setDeleteId] = useState<Material['id'] | null>(null)

  useEffect(() => {
    api.materials.list().then((rows) => setMaterials(rows.map(mapMaterial))).catch(console.error).finally(() => setLoading(false))
  }, [])

  const filtered = typeFilter === 'todos' ? materials : materials.filter((m) => m.type === typeFilter)

  async function saveMaterial(mat: Material, isNew: boolean) {
    const payload = {
      titulo: mat.title, descricao: mat.description, tipo: mat.type.toUpperCase(),
      capaUrl: mat.cover || null, arquivoUrl: mat.arquivoUrl || null,
      nomeArquivo: mat.arquivoNome || null, tamanhoBytes: mat.arquivoTamanho ?? null, mimeType: null,
    }
    try {
      if (isNew) {
        const created = mapMaterial(await api.materials.create(payload))
        setMaterials((prev) => [created, ...prev])
      } else {
        const updated = mapMaterial(await api.materials.update(mat.id, payload))
        setMaterials((prev) => prev.map((m) => m.id === mat.id ? updated : m))
      }
    } catch (error) { console.error(error) }
  }

  async function deleteMaterial(id: Material['id']) {
    try {
      await api.materials.remove(id)
      setMaterials((prev) => prev.filter((m) => m.id !== id))
    } catch (error) { console.error(error) }
    setDeleteId(null)
  }

  async function downloadMaterial(mat: Material) {
    try {
      const result = await api.materials.download(mat.id)
      setMaterials((prev) => prev.map((m) => m.id === mat.id ? { ...m, downloads: result.downloads } : m))
      if (result.arquivoUrl) window.open(result.arquivoUrl, '_blank')
    } catch (error) { console.error(error) }
  }

  return (
    <div className="h-full overflow-auto p-5">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div className="flex gap-2">
            {(['todos', 'ebook', 'newsletter', 'case'] as const).map((t) => {
              const s = t !== 'todos' ? matTypeStyle[t] : null
              return (
                <button key={t} onClick={() => setTypeFilter(t)} className="text-xs px-3 py-1.5 rounded-full font-medium capitalize transition-all"
                  style={typeFilter === t ? { background: s ? s.color : '#7D1AD7', color: '#fff' } : { background: 'rgba(255,255,255,0.06)', color: '#8A8A9A' }}>
                  {t === 'todos' ? 'Todos' : matTypeStyle[t].label}
                </button>
              )
            })}
          </div>
          <button onClick={() => setModal({})} className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl text-white hover:opacity-90 btn-glow"
            style={{ background: 'linear-gradient(135deg, #7D1AD7, #50E678)' }}>
            <Plus size={15} /> Adicionar
          </button>
        </div>

        {loading ? (
          <div className="text-center py-16 text-[#555566]">Carregando...</div>
        ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {filtered.map((mat) => {
            const s = matTypeStyle[mat.type]
            return (
              <div key={mat.id} className="editorial-card bg-[#17171A] rounded-2xl overflow-hidden flex flex-col group"
                style={{ border: '1.5px solid rgba(255,255,255,0.1)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <div className="relative" style={{ height: 140, background: '#202024' }}>
                  <img src={mat.cover} alt={mat.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.3))' }} />
                  <span className="absolute top-3 left-3 text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: s.bg, color: s.color }}>{s.label}</span>
                  <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setModal({ mat })} className="w-7 h-7 rounded-lg bg-[#17171A]/90 flex items-center justify-center text-[#7D1AD7] hover:bg-[#17171A] shadow-sm">
                      <Edit2 size={12} />
                    </button>
                    <button onClick={() => setDeleteId(mat.id)} className="w-7 h-7 rounded-lg bg-[#17171A]/90 flex items-center justify-center text-[#FF5252] hover:bg-[#17171A] shadow-sm">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="text-sm font-semibold text-[#F0F0F5] mb-1 leading-snug">{mat.title}</h3>
                  <p className="text-xs text-[#8A8A9A] flex-1">{mat.description}</p>
                  {mat.arquivoNome && (
                    <p className="text-xs text-[#555566] mt-1 truncate">{mat.arquivoNome} · {formatBytes(mat.arquivoTamanho)}</p>
                  )}
                  <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center gap-1 text-xs text-[#555566]">
                      <Download size={11} />
                      <span>{mat.downloads.toLocaleString('pt-BR')}</span>
                    </div>
                    <button onClick={() => downloadMaterial(mat)} disabled={!mat.arquivoUrl}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-medium hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ background: 'rgba(125,26,215,0.08)', color: '#507AE6' }}>
                      <Download size={11} /> Baixar
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && <div className="empty-state col-span-full text-center py-16 text-[#8A8A9A]">Nenhum material encontrado</div>}
        </div>
        )}

        {modal && <MaterialModal initial={modal.mat} onSave={saveMaterial} onClose={() => setModal(null)} />}
        {deleteId !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDeleteId(null)}>
            <div className="bg-[#17171A] rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <p className="font-semibold text-[#F0F0F5] mb-1">Apagar material?</p>
              <p className="text-sm text-[#8A8A9A] mb-4">Esta ação não pode ser desfeita.</p>
              <div className="flex gap-2">
                <button onClick={() => deleteMaterial(deleteId)} className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-[#FF5252]">Apagar</button>
                <button onClick={() => setDeleteId(null)} className="px-4 py-2 rounded-xl text-sm font-medium text-[#8A8A9A] hover:bg-[rgba(255,255,255,0.08)]">Cancelar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Prompts ───────────────────────────────────────────────────────────────

// TODO: Validar padrão visual — "Carrossel" não é um canal oficial do design system;
// usa o token --warning por ser o mais próximo (categoria original em laranja).
const catStyle: Record<string, { bg: string; color: string }> = {
  Instagram: { bg: 'rgba(225,48,108,0.15)', color: '#E1306C' },
  LinkedIn: { bg: 'rgba(10,102,194,0.15)', color: '#0A66C2' },
  Email: { bg: 'rgba(255,179,0,0.15)', color: '#FFB300' },
  Carrossel: { bg: 'rgba(255,179,0,0.15)', color: '#FFB300' },
  Site: { bg: 'rgba(0,200,83,0.15)', color: '#00C853' },
}

function getCatStyle(cat: string) {
  return catStyle[cat] ?? { bg: 'rgba(255,255,255,0.06)', color: '#8A8A9A' }
}

const PROMPT_CAT_TO_API: Record<string, string> = { Instagram: 'INSTAGRAM', LinkedIn: 'LINKEDIN', Email: 'EMAIL', Carrossel: 'CARROSSEL', Site: 'SITE' }
const PROMPT_CAT_FROM_API: Record<string, string> = { INSTAGRAM: 'Instagram', LINKEDIN: 'LinkedIn', EMAIL: 'Email', CARROSSEL: 'Carrossel', SITE: 'Site' }

function mapPrompt(row: any): Prompt {
  return { id: row.id, category: PROMPT_CAT_FROM_API[row.categoria] ?? row.categoria, title: row.titulo, content: row.conteudo, tags: row.tags ?? [], favorited: row.favorito, usageCount: row.usos }
}

interface PromptFormData {
  category: string; title: string; content: string; tags: string
}

interface PromptDraft {
  id?: string; category: string; title: string; content: string; tags: string[]
}

function PromptModal({ initial, onSave, onClose }: { initial?: Prompt; onSave: (p: PromptDraft) => Promise<void>; onClose: () => void }) {
  const [form, setForm] = useState<PromptFormData>({
    category: initial?.category ?? 'Instagram',
    title: initial?.title ?? '',
    content: initial?.content ?? '',
    tags: initial?.tags.join(', ') ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const cats = ['Instagram', 'LinkedIn', 'Email', 'Carrossel', 'Site']

  async function save() {
    if (!form.title.trim()) return
    setSaving(true); setError('')
    try {
      await onSave({
        id: initial?.id,
        category: form.category, title: form.title, content: form.content,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      })
      onClose()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar o prompt.')
      setSaving(false)
    }
  }

  return (
    <Modal title={initial ? 'Editar prompt' : 'Novo prompt'} onClose={onClose} wide footer={
      <div className="px-6 py-4 flex flex-col gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        {error && <p className="text-xs text-[#FF5252] rounded-lg px-3 py-2" style={{ background: 'rgba(255,82,82,0.15)' }}>{error}</p>}
        <div className="flex gap-3">
          <button onClick={save} disabled={saving} className="px-5 py-2 rounded-xl text-sm font-medium text-white hover:opacity-90 btn-glow disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #7D1AD7, #50E678)' }}>
            {saving ? 'Salvando…' : initial ? 'Salvar alterações' : 'Criar prompt'}
          </button>
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-[#8A8A9A] hover:bg-[rgba(255,255,255,0.08)]">Cancelar</button>
        </div>
      </div>
    }>
      <div className="px-6 py-4 space-y-4">
        <FormRow label="Categoria">
          <div className="flex gap-2 flex-wrap">
            {cats.map((c) => {
              const s = getCatStyle(c)
              return (
                <button key={c} onClick={() => setForm((f) => ({ ...f, category: c }))} className="filter-pill text-xs px-3 py-1.5 rounded-full font-medium transition-all"
                  style={form.category === c ? { background: s.color, color: '#fff' } : { background: s.bg, color: s.color }}>
                  {c}
                </button>
              )
            })}
          </div>
        </FormRow>
        <FormRow label="Título *">
          <Inp value={form.title} onChange={(v) => setForm((f) => ({ ...f, title: v }))} placeholder="Ex: Caption engajante com CTA" />
        </FormRow>
        <FormRow label="Conteúdo do prompt *">
          <textarea value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            placeholder="Escreva o prompt aqui..." rows={8}
            className="w-full text-sm px-3 py-2 rounded-lg border border-[rgba(255,255,255,0.1)] focus:outline-none focus:border-[#7D1AD7] font-mono"
            style={{ fontSize: 12 }} />
        </FormRow>
        <FormRow label="Tags (separadas por vírgula)">
          <Inp value={form.tags} onChange={(v) => setForm((f) => ({ ...f, tags: v }))} placeholder="caption, cta, engajamento" />
        </FormRow>
      </div>
    </Modal>
  )
}

function PromptsView() {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [catFilter, setCatFilter] = useState('Todos')
  const [search, setSearch] = useState('')
  const [onlyFav, setOnlyFav] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [copied, setCopied] = useState<string | null>(null)
  const [modal, setModal] = useState<{ prompt?: Prompt } | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => {
    api.prompts.list().then((rows) => setPrompts(rows.map(mapPrompt))).catch(console.error)
  }, [])

  const categories = useMemo(() => ['Todos', ...Array.from(new Set(prompts.map((p) => p.category)))], [prompts])

  const filtered = useMemo(() => prompts.filter((p) => {
    if (catFilter !== 'Todos' && p.category !== catFilter) return false
    if (onlyFav && !p.favorited) return false
    if (search && !p.title.toLowerCase().includes(search.toLowerCase()) && !p.content.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }), [prompts, catFilter, onlyFav, search])

  async function toggleFav(id: string) {
    const current = prompts.find((p) => p.id === id)
    if (!current) return
    setPrompts((prev) => prev.map((p) => p.id === id ? { ...p, favorited: !p.favorited } : p))
    try {
      const res = await api.prompts.favorite(id, !current.favorited)
      setPrompts((prev) => prev.map((p) => p.id === id ? { ...p, favorited: res.favorito } : p))
    } catch (cause) { console.error(cause); setPrompts((prev) => prev.map((p) => p.id === id ? { ...p, favorited: current.favorited } : p)) }
  }

  async function copyPrompt(id: string, content: string) {
    navigator.clipboard.writeText(content).catch(() => {})
    setCopied(id); setTimeout(() => setCopied(null), 2000)
    try {
      const res = await api.prompts.copy(id)
      setPrompts((prev) => prev.map((p) => p.id === id ? { ...p, usageCount: res.usos } : p))
    } catch (cause) { console.error(cause) }
  }

  async function savePrompt(p: PromptDraft) {
    const payload = { titulo: p.title, categoria: PROMPT_CAT_TO_API[p.category] ?? 'INSTAGRAM', conteudo: p.content, tags: p.tags }
    const saved = mapPrompt(p.id ? await api.prompts.update(p.id, payload) : await api.prompts.create(payload))
    setPrompts((prev) => {
      const idx = prev.findIndex((x) => x.id === saved.id)
      if (idx >= 0) return prev.map((x, i) => i === idx ? saved : x)
      return [saved, ...prev]
    })
  }

  async function deletePrompt(id: string) {
    setDeleteId(null)
    try {
      await api.prompts.remove(id)
      setPrompts((prev) => prev.filter((p) => p.id !== id))
    } catch (cause) { console.error(cause) }
  }

  return (
    <div className="h-full overflow-auto p-5">
      <div className="max-w-4xl mx-auto">
        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 min-w-48" style={{ background: '#202024', border: '1.5px solid rgba(255,255,255,0.1)' }}>
            <Search size={14} className="text-[#555566] flex-shrink-0" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar prompts..."
              className="flex-1 text-sm bg-transparent focus:outline-none text-[#F0F0F5] placeholder-[#555566]" />
            {search && <button onClick={() => setSearch('')} className="text-[#555566] hover:text-[#8A8A9A]"><X size={13} /></button>}
          </div>

          {/* Favorites toggle */}
          <button onClick={() => setOnlyFav((f) => !f)} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-medium transition-all"
            style={onlyFav ? { background: 'rgba(255,179,0,0.15)', color: '#FFB300', border: '1.5px solid rgba(255,179,0,0.4)' } : { background: '#202024', color: '#8A8A9A', border: '1.5px solid rgba(255,255,255,0.1)' }}>
            <Star size={13} style={{ fill: onlyFav ? '#FFB300' : 'none', color: onlyFav ? '#FFB300' : '#555566' }} />
            Favoritos · {prompts.filter((p) => p.favorited).length}
          </button>

          {/* Add button */}
          <button onClick={() => setModal({})} className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl text-white hover:opacity-90 btn-glow"
            style={{ background: 'linear-gradient(135deg, #7D1AD7, #50E678)' }}>
            <Plus size={15} /> Novo prompt
          </button>
        </div>

        {/* Category filter */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {categories.map((cat) => {
            const s = cat !== 'Todos' ? getCatStyle(cat) : null
            return (
              <button key={cat} onClick={() => setCatFilter(cat)} className="filter-pill text-xs px-3 py-1.5 rounded-full font-medium transition-all"
                style={catFilter === cat ? { background: s ? s.color : '#7D1AD7', color: '#fff' } : { background: 'rgba(255,255,255,0.06)', color: '#8A8A9A' }}>
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
              <div key={prompt.id} className="editorial-card bg-[#17171A] rounded-xl overflow-hidden group"
                style={{ border: '1.5px solid rgba(255,255,255,0.1)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: s.bg, color: s.color }}>{prompt.category}</span>
                        <span className="text-xs text-[#555566]">usado {prompt.usageCount}×</span>
                      </div>
                      <h3 className="text-sm font-semibold text-[#F0F0F5]">{prompt.title}</h3>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => setModal({ prompt })} className="p-1.5 rounded-lg text-[#555566] hover:text-[#7D1AD7] hover:bg-[rgba(125,26,215,0.08)] opacity-0 group-hover:opacity-100 transition-all">
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => setDeleteId(prompt.id)} className="p-1.5 rounded-lg text-[#555566] hover:text-[#FF5252] hover:bg-[rgba(255,82,82,0.12)] opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 size={13} />
                      </button>
                      <button onClick={() => toggleFav(prompt.id)} className="p-1.5 rounded-lg transition-colors hover:bg-[#202024]">
                        <Star size={16} style={{ fill: prompt.favorited ? '#FFB300' : 'none', color: prompt.favorited ? '#FFB300' : '#555566' }} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 rounded-lg p-3 cursor-pointer" style={{ background: '#202024', border: '1px solid rgba(255,255,255,0.1)' }}
                    onClick={() => setExpanded((e) => ({ ...e, [prompt.id]: !e[prompt.id] }))}>
                    <p className="text-xs text-[#8A8A9A] leading-relaxed whitespace-pre-line">
                      {isExp ? prompt.content : prompt.content.slice(0, 100) + (prompt.content.length > 100 ? '…' : '')}
                      {prompt.content.length > 100 && <span className="text-[#7D1AD7] ml-1">{isExp ? ' ▲' : ' ▼'}</span>}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex gap-1.5 flex-wrap">
                      {prompt.tags.map((tag) => (
                        <span key={tag} className="flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: '#8A8A9A' }}>
                          <Hash size={9} />{tag}
                        </span>
                      ))}
                    </div>
                    <button onClick={() => copyPrompt(prompt.id, prompt.content)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium hover:opacity-80"
                      style={copied === prompt.id ? { background: 'rgba(0,200,83,0.15)', color: '#00C853' } : { background: 'rgba(125,26,215,0.08)', color: '#507AE6' }}>
                      {copied === prompt.id ? <><Check size={11} /> Copiado!</> : <><Copy size={11} /> Copiar</>}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div className="empty-state text-center py-12 text-[#8A8A9A]">
              {search ? `Nenhum resultado para "${search}"` : 'Nenhum prompt encontrado'}
            </div>
          )}
        </div>

        {modal && <PromptModal initial={modal.prompt} onSave={savePrompt} onClose={() => setModal(null)} />}
        {deleteId !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDeleteId(null)}>
            <div className="bg-[#17171A] rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <p className="font-semibold text-[#F0F0F5] mb-1">Apagar prompt?</p>
              <p className="text-sm text-[#8A8A9A] mb-4">Esta ação não pode ser desfeita.</p>
              <div className="flex gap-2">
                <button onClick={() => deletePrompt(deleteId)} className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-[#FF5252]">Apagar</button>
                <button onClick={() => setDeleteId(null)} className="px-4 py-2 rounded-xl text-sm font-medium text-[#8A8A9A] hover:bg-[rgba(255,255,255,0.08)]">Cancelar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────

interface Props {
  channel: Channel
  setChannel: (c: Channel) => void
  posts: Post[]
  setPosts: (fn: (prev: Post[]) => Post[]) => void
  isManager?: boolean
}

export default function Biblioteca({ channel, setChannel, posts, setPosts }: Props) {
  const [tab, setTab] = useState<Tab>('posts')

  return (
    <div className="flex flex-col h-full">
      <header className="page-header bg-[#17171A] flex-shrink-0" style={{ borderBottom: '1.5px solid rgba(255,255,255,0.1)' }}>
        <div className="px-4 md:px-6 pt-4 md:pt-5 pb-0 flex items-start gap-4">
          <BrandMark />
          <div className="flex-1 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
            <div>
              <span className="page-eyebrow">Acervo de conteúdo</span>
              <h1 className="text-lg md:text-xl font-semibold text-[#F0F0F5] leading-tight">Biblioteca</h1>
              <p className="text-xs md:text-sm text-[#8A8A9A] mt-0.5 hidden sm:block">Posts publicados, materiais ricos e biblioteca de prompts</p>
            </div>
          </div>
        </div>
        <div className="px-4 md:px-6 pt-2 md:pt-3 pb-0 overflow-x-auto">
          <TabNav active={tab} setTab={setTab} />
        </div>
      </header>
      <div className="module-stage flex-1 overflow-hidden">
        {tab === 'posts' && <PostsView channel={channel} setChannel={setChannel} posts={posts} setPosts={setPosts} />}
        {tab === 'materiais' && <MaterialsView />}
        {tab === 'prompts' && <PromptsView />}
      </div>
    </div>
  )
}
