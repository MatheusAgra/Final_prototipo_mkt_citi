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
import { isSafeHttpsUrl, openTrustedUrl } from "@/shared/lib/url"
import {
  ChannelBadge,
  ChannelFilter,
  CH,
  FormRow,
  formatBytes,
  Inp,
  Modal,
  Tab,
} from "../components/shared"
const matTypeStyle = {
  ebook: { label: "E-book", color: "#7D1AD7", bg: "rgba(125,26,215,0.15)" },
  newsletter: {
    label: "Newsletter",
    color: "#00C853",
    bg: "rgba(0,200,83,0.15)",
  },
  case: { label: "Case", color: "#FFB300", bg: "rgba(255,179,0,0.15)" },
}
interface MatForm {
  type: Material["type"]
  title: string
  description: string
  cover: string
  downloads: string
  arquivoUrl: string
  arquivoNome: string
  arquivoTamanho: number | null
}
function MaterialModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: Material
  onSave: (m: Material, isNew: boolean) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<MatForm>({
    type: initial?.type ?? "ebook",
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    cover: initial?.cover ?? "",
    downloads: String(initial?.downloads ?? "0"),
    arquivoUrl: initial?.arquivoUrl ?? "",
    arquivoNome: initial?.arquivoNome ?? "",
    arquivoTamanho: initial?.arquivoTamanho ?? null,
  })
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState("")
  const [coverError, setCoverError] = useState("")

  async function handleFile(file: File | undefined) {
    if (!file) return
    setUploading(true)
    setUploadError("")
    try {
      const result = await api.materials.upload(file)
      setForm((f) => ({
        ...f,
        arquivoUrl: result.arquivoUrl,
        arquivoNome: result.nomeArquivo,
        arquivoTamanho: result.tamanhoBytes,
      }))
    } catch {
      setUploadError("Falha ao enviar o arquivo. Tente novamente.")
    } finally {
      setUploading(false)
    }
  }

  function save() {
    if (!form.title.trim()) return
    if (form.cover && !isSafeHttpsUrl(form.cover)) {
      setCoverError("Informe uma URL HTTPS válida, sem usuário ou senha.")
      return
    }
    setCoverError("")
    onSave(
      {
        id: initial?.id ?? Date.now(),
        type: form.type,
        title: form.title,
        description: form.description,
        cover:
          form.cover ||
          "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=250&fit=crop&auto=format",
        downloads: parseInt(form.downloads) || 0,
        createdAt: initial?.createdAt ?? new Date().toISOString().slice(0, 10),
        arquivoUrl: form.arquivoUrl || undefined,
        arquivoNome: form.arquivoNome || undefined,
        arquivoTamanho: form.arquivoTamanho ?? undefined,
      },
      !initial,
    )
    onClose()
  }

  return (
    <Modal
      title={initial ? "Editar material" : "Novo material"}
      onClose={onClose}
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
            {initial ? "Salvar" : "Criar material"}
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
        <FormRow label="Tipo">
          <div className="flex gap-2">
            {(["ebook", "newsletter", "case"] as const).map((t) => {
              const s = matTypeStyle[t]
              return (
                <button
                  key={t}
                  onClick={() => setForm((f) => ({ ...f, type: t }))}
                  className="flex-1 text-xs py-2 rounded-lg font-medium transition-all"
                  style={
                    form.type === t
                      ? { background: s.color, color: "#fff" }
                      : { background: s.bg, color: s.color }
                  }
                >
                  {s.label}
                </button>
              )
            })}
          </div>
        </FormRow>
        <FormRow label="Título *">
          <Inp
            value={form.title}
            onChange={(v) => setForm((f) => ({ ...f, title: v }))}
            placeholder="Título do material"
          />
        </FormRow>
        <FormRow label="Descrição">
          <Inp
            value={form.description}
            onChange={(v) => setForm((f) => ({ ...f, description: v }))}
            placeholder="Breve descrição..."
          />
        </FormRow>
        <FormRow label="URL da capa">
          <Inp
            value={form.cover}
            onChange={(v) => setForm((f) => ({ ...f, cover: v }))}
            placeholder="https://..."
          />
          {coverError && (
            <p className="text-xs text-[#FF5252] mt-1">{coverError}</p>
          )}
        </FormRow>
        <FormRow label="Arquivo (PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX)">
          <input
            type="file"
            accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
            disabled={uploading}
            onChange={(e) => {
              handleFile(e.target.files?.[0])
              e.target.value = ""
            }}
            className="w-full text-xs text-[#8A8A9A] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-[rgba(125,26,215,0.08)] file:text-[#507AE6] file:cursor-pointer"
          />
          {uploading && (
            <p className="text-xs text-[#8A8A9A] mt-1">Enviando...</p>
          )}
          {uploadError && (
            <p className="text-xs text-[#FF5252] mt-1">{uploadError}</p>
          )}
          {form.arquivoNome && !uploading && (
            <p className="text-xs text-[#8A8A9A] mt-1">
              {form.arquivoNome} · {formatBytes(form.arquivoTamanho)}
            </p>
          )}
        </FormRow>
        <FormRow label="Downloads">
          <Inp
            type="number"
            value={form.downloads}
            onChange={(v) => setForm((f) => ({ ...f, downloads: v }))}
            placeholder="0"
          />
        </FormRow>
      </div>
    </Modal>
  )
}

function mapMaterial(row: any): Material {
  return {
    id: row.id,
    type: row.tipo.toLowerCase() as Material["type"],
    title: row.titulo,
    description: row.descricao,
    cover: row.capaUrl || "",
    downloads: row.downloads,
    createdAt: row.createdAt?.slice(0, 10) ?? "",
    arquivoUrl: row.arquivoUrl ?? undefined,
    arquivoNome: row.nomeArquivo ?? undefined,
    arquivoTamanho: row.tamanhoBytes ?? undefined,
  }
}

export function MaterialsView() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] =
    useState<"todos" | "ebook" | "newsletter" | "case">("todos")
  const [modal, setModal] = useState<{ mat?: Material } | null>(null)
  const [deleteId, setDeleteId] = useState<Material["id"] | null>(null)

  useEffect(() => {
    api.materials
      .list()
      .then((rows) => setMaterials(rows.map(mapMaterial)))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered =
    typeFilter === "todos"
      ? materials
      : materials.filter((m) => m.type === typeFilter)

  async function saveMaterial(mat: Material, isNew: boolean) {
    const payload = {
      titulo: mat.title,
      descricao: mat.description,
      tipo: mat.type.toUpperCase(),
      capaUrl: mat.cover || null,
      arquivoUrl: mat.arquivoUrl || null,
      nomeArquivo: mat.arquivoNome || null,
      tamanhoBytes: mat.arquivoTamanho ?? null,
      mimeType: null,
    }
    try {
      if (isNew) {
        const created = mapMaterial(await api.materials.create(payload))
        setMaterials((prev) => [created, ...prev])
      } else {
        const updated = mapMaterial(await api.materials.update(mat.id, payload))
        setMaterials((prev) => prev.map((m) => (m.id === mat.id ? updated : m)))
      }
    } catch (error) {
      console.error(error)
    }
  }

  async function deleteMaterial(id: Material["id"]) {
    try {
      await api.materials.remove(id)
      setMaterials((prev) => prev.filter((m) => m.id !== id))
    } catch (error) {
      console.error(error)
    }
    setDeleteId(null)
  }

  async function downloadMaterial(mat: Material) {
    try {
      const result = await api.materials.download(mat.id)
      setMaterials((prev) =>
        prev.map((m) =>
          m.id === mat.id ? { ...m, downloads: result.downloads } : m,
        ),
      )
      if (result.arquivoUrl) openTrustedUrl(result.arquivoUrl)
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <div className="h-full overflow-auto p-5">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div className="flex gap-2">
            {(["todos", "ebook", "newsletter", "case"] as const).map((t) => {
              const s = t !== "todos" ? matTypeStyle[t] : null
              return (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className="text-xs px-3 py-1.5 rounded-full font-medium capitalize transition-all"
                  style={
                    typeFilter === t
                      ? { background: s ? s.color : "#7D1AD7", color: "#fff" }
                      : {
                          background: "rgba(255,255,255,0.06)",
                          color: "#8A8A9A",
                        }
                  }
                >
                  {t === "todos" ? "Todos" : matTypeStyle[t].label}
                </button>
              )
            })}
          </div>
          <button
            onClick={() => setModal({})}
            className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl text-white hover:opacity-90 btn-glow"
            style={{ background: "linear-gradient(135deg, #7D1AD7, #50E678)" }}
          >
            <Plus size={15} /> Adicionar
          </button>
        </div>

        {loading ? (
          <div className="text-center py-16 text-[#555566]">Carregando...</div>
        ) : (
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            }}
          >
            {filtered.map((mat) => {
              const s = matTypeStyle[mat.type]
              return (
                <div
                  key={mat.id}
                  className="editorial-card bg-[#17171A] rounded-2xl overflow-hidden flex flex-col group"
                  style={{
                    border: "1.5px solid rgba(255,255,255,0.1)",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                  }}
                >
                  <div
                    className="relative"
                    style={{ height: 140, background: "#202024" }}
                  >
                    <img
                      src={mat.cover}
                      alt={mat.title}
                      className="w-full h-full object-cover"
                    />
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.3))",
                      }}
                    />
                    <span
                      className="absolute top-3 left-3 text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: s.bg, color: s.color }}
                    >
                      {s.label}
                    </span>
                    <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setModal({ mat })}
                        className="w-7 h-7 rounded-lg bg-[#17171A]/90 flex items-center justify-center text-[#7D1AD7] hover:bg-[#17171A] shadow-sm"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={() => setDeleteId(mat.id)}
                        className="w-7 h-7 rounded-lg bg-[#17171A]/90 flex items-center justify-center text-[#FF5252] hover:bg-[#17171A] shadow-sm"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="text-sm font-semibold text-[#F0F0F5] mb-1 leading-snug">
                      {mat.title}
                    </h3>
                    <p className="text-xs text-[#8A8A9A] flex-1">
                      {mat.description}
                    </p>
                    {mat.arquivoNome && (
                      <p className="text-xs text-[#555566] mt-1 truncate">
                        {mat.arquivoNome} · {formatBytes(mat.arquivoTamanho)}
                      </p>
                    )}
                    <div
                      className="flex items-center justify-between mt-3 pt-3"
                      style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
                    >
                      <div className="flex items-center gap-1 text-xs text-[#555566]">
                        <Download size={11} />
                        <span>{mat.downloads.toLocaleString("pt-BR")}</span>
                      </div>
                      <button
                        onClick={() => downloadMaterial(mat)}
                        disabled={!mat.arquivoUrl}
                        className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-medium hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{
                          background: "rgba(125,26,215,0.08)",
                          color: "#507AE6",
                        }}
                      >
                        <Download size={11} /> Baixar
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
            {filtered.length === 0 && (
              <div className="empty-state col-span-full text-center py-16 text-[#8A8A9A]">
                Nenhum material encontrado
              </div>
            )}
          </div>
        )}

        {modal && (
          <MaterialModal
            initial={modal.mat}
            onSave={saveMaterial}
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
                Apagar material?
              </p>
              <p className="text-sm text-[#8A8A9A] mb-4">
                Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => deleteMaterial(deleteId)}
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

// ─── Prompts ───────────────────────────────────────────────────────────────

// TODO: Validar padrão visual — "Carrossel" não é um canal oficial do design system;
// usa o token --warning por ser o mais próximo (categoria original em laranja).
const catStyle: Record<string, { bg: string; color: string }> = {
  Instagram: { bg: "rgba(225,48,108,0.15)", color: "#E1306C" },
  LinkedIn: { bg: "rgba(10,102,194,0.15)", color: "#0A66C2" },
  Email: { bg: "rgba(255,179,0,0.15)", color: "#FFB300" },
  Carrossel: { bg: "rgba(255,179,0,0.15)", color: "#FFB300" },
  Site: { bg: "rgba(0,200,83,0.15)", color: "#00C853" },
}
