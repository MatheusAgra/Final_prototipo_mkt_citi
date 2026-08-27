import { useState, useMemo, useEffect, useRef } from "react"
import {
  BarChart2,
  TrendingUp,
  Users,
  Globe,
  Plus,
  X,
  Edit2,
  Check,
  Info,
  ArrowUp,
  ArrowDown,
  Trash2,
  Eye,
  AlertTriangle,
} from "lucide-react"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
import type { Channel } from "@/app/App"
import type { ChannelType, Post, CustomMetric } from "@/shared/model/domain"
import { mqlData, getWeekLabel } from "@/shared/model/domain"
import { metricsApi as api } from "../api"
import BrandMark from "@/shared/ui/BrandMark"

// Seleciona todo o conteúdo ao focar um campo numérico — evita o bug de "0" seguido de dígitos concatenados (ex: "0190")
const selectOnFocus = (e: React.FocusEvent<HTMLInputElement>) =>
  e.target.select()

// Input numérico com rascunho de texto próprio: permite apagar o campo inteiro (ficar vazio) sem que
// Number('') vire 0 e "prenda" o valor — o pai só recebe um número novo quando o texto digitado é válido.
import { KpiCard, Modal, NumericInput } from "../components/shared"
type MQLState = typeof mqlData
export function MQLView({
  mql,
  setMql,
}: {
  mql: MQLState
  setMql: (fn: (prev: MQLState) => MQLState) => void
}) {
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newBehavior, setNewBehavior] = useState("")
  const [newIndustry, setNewIndustry] = useState("")

  function removeItem<K extends "jobTitles" | "behaviors" | "industries">(
    key: K,
    idx: number,
  ) {
    setMql((m) => ({
      ...m,
      [key]: (m[key] as string[]).filter((_, i) => i !== idx),
    }))
  }

  function addItem(key: "jobTitles" | "behaviors" | "industries", val: string) {
    if (!val.trim()) return
    setMql((m) => ({ ...m, [key]: [...m[key] as string[], val.trim()] }))
  }

  async function toggleEdit() {
    if (!editMode) {
      setEditMode(true)
      return
    }
    setSaving(true)
    try {
      const saved = await api.metrics.saveMql({
        scoreMinimo: mql.score,
        taxaMqlSql: mql.mqlToSQLRate,
        mqlsEsteMes: mql.monthlyMQLs,
        tamanhoEmpresa: mql.companySize,
        cargosAlvo: mql.jobTitles,
        segmentos: mql.industries,
        comportamentos: mql.behaviors,
      })
      setMql(() => ({
        jobTitles: saved.cargosAlvo,
        companySize: saved.tamanhoEmpresa,
        industries: saved.segmentos,
        behaviors: saved.comportamentos,
        score: saved.scoreMinimo,
        monthlyMQLs: saved.mqlsEsteMes,
        mqlToSQLRate: saved.taxaMqlSql,
      }))
      setEditMode(false)
    } catch (error) {
      console.error(error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="h-full overflow-auto p-5">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold text-[#F0F0F5]">
              Definição do MQL Ideal
            </h2>
            <p className="text-sm text-[#8A8A9A] mt-0.5">
              Critérios de qualificação e conversão
            </p>
          </div>
          <button
            onClick={toggleEdit}
            disabled={saving}
            className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl transition-all disabled:opacity-50"
            style={
              editMode
                ? { background: "#00C853", color: "#fff" }
                : { background: "rgba(125,26,215,0.08)", color: "#507AE6" }
            }
          >
            {editMode ? (
              <>
                <Check size={15} /> {saving ? "Salvando…" : "Salvar"}
              </>
            ) : (
              <>
                <Edit2 size={15} /> Editar
              </>
            )}
          </button>
        </div>

        {/* Editable stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          {[
            {
              label: "MQLs este mês",
              key: "monthlyMQLs" as keyof MQLState,
              color: "#7D1AD7",
              suffix: "",
            },
            {
              label: "Taxa MQL → SQL",
              key: "mqlToSQLRate" as keyof MQLState,
              color: "#00C853",
              suffix: "%",
            },
            {
              label: "Score mínimo",
              key: "score" as keyof MQLState,
              color: "#FFB300",
              suffix: "/100",
            },
          ].map((kpi) => (
            <div
              key={kpi.key}
              className="kpi-card bg-[#17171A] rounded-xl p-4"
              style={{ border: "1.5px solid rgba(255,255,255,0.1)" }}
            >
              <p className="text-xs font-medium text-[#8A8A9A] mb-2">
                {kpi.label}
              </p>
              {editMode ? (
                <NumericInput
                  value={mql[kpi.key] as number}
                  onChange={(n) => setMql((m) => ({ ...m, [kpi.key]: n }))}
                  className="text-2xl font-bold w-full focus:outline-none bg-transparent border-b-2 border-[rgba(125,26,215,0.3)]"
                  style={{ color: kpi.color }}
                />
              ) : (
                <div
                  className="text-2xl font-bold"
                  style={{ color: kpi.color }}
                >
                  {mql[kpi.key] as number}
                  {kpi.suffix}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Job titles */}
          <div
            className="analytic-card bg-[#17171A] rounded-2xl p-5"
            style={{ border: "1.5px solid rgba(255,255,255,0.1)" }}
          >
            <h3 className="text-sm font-semibold text-[#F0F0F5] mb-3">
              Cargos-alvo
            </h3>
            <div className="flex flex-wrap gap-2">
              {mql.jobTitles.map((t, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium"
                  style={{
                    background: "rgba(125,26,215,0.08)",
                    color: "#507AE6",
                  }}
                >
                  {t}
                  {editMode && (
                    <button
                      onClick={() => removeItem("jobTitles", i)}
                      className="hover:opacity-70"
                    >
                      <X size={10} />
                    </button>
                  )}
                </span>
              ))}
            </div>
            {editMode && (
              <div className="flex gap-2 mt-3">
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Novo cargo..."
                  className="flex-1 text-xs px-2 py-1.5 rounded-lg border border-[rgba(255,255,255,0.1)] focus:outline-none focus:border-[#7D1AD7]"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      addItem("jobTitles", newTitle)
                      setNewTitle("")
                    }
                  }}
                />
                <button
                  onClick={() => {
                    addItem("jobTitles", newTitle)
                    setNewTitle("")
                  }}
                  className="text-xs px-2 py-1.5 rounded-lg bg-[rgba(125,26,215,0.15)] text-[#7D1AD7]"
                >
                  <Plus size={12} />
                </button>
              </div>
            )}
          </div>

          {/* Industries */}
          <div
            className="analytic-card bg-[#17171A] rounded-2xl p-5"
            style={{ border: "1.5px solid rgba(255,255,255,0.1)" }}
          >
            <h3 className="text-sm font-semibold text-[#F0F0F5] mb-3">
              Segmentos
            </h3>
            <div className="flex flex-wrap gap-2">
              {mql.industries.map((ind, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium"
                  style={{
                    background: "rgba(0,200,83,0.15)",
                    color: "#00C853",
                  }}
                >
                  {ind}
                  {editMode && (
                    <button
                      onClick={() => removeItem("industries", i)}
                      className="hover:opacity-70"
                    >
                      <X size={10} />
                    </button>
                  )}
                </span>
              ))}
            </div>
            {editMode && (
              <div className="flex gap-2 mt-3">
                <input
                  value={newIndustry}
                  onChange={(e) => setNewIndustry(e.target.value)}
                  placeholder="Nova indústria..."
                  className="flex-1 text-xs px-2 py-1.5 rounded-lg border border-[rgba(255,255,255,0.1)] focus:outline-none focus:border-[#7D1AD7]"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      addItem("industries", newIndustry)
                      setNewIndustry("")
                    }
                  }}
                />
                <button
                  onClick={() => {
                    addItem("industries", newIndustry)
                    setNewIndustry("")
                  }}
                  className="text-xs px-2 py-1.5 rounded-lg bg-[rgba(0,200,83,0.15)] text-[#00C853]"
                >
                  <Plus size={12} />
                </button>
              </div>
            )}
          </div>

          {/* Company size */}
          <div
            className="analytic-card bg-[#17171A] rounded-2xl p-5"
            style={{ border: "1.5px solid rgba(255,255,255,0.1)" }}
          >
            <h3 className="text-sm font-semibold text-[#F0F0F5] mb-3">
              Tamanho da empresa
            </h3>
            {editMode ? (
              <input
                value={mql.companySize}
                onChange={(e) =>
                  setMql((m) => ({ ...m, companySize: e.target.value }))
                }
                className="w-full text-sm px-3 py-2 rounded-lg border border-[rgba(255,255,255,0.1)] focus:outline-none focus:border-[#7D1AD7]"
              />
            ) : (
              <span
                className="text-sm px-3 py-1.5 rounded-full font-medium inline-block"
                style={{ background: "rgba(255,179,0,0.15)", color: "#FFB300" }}
              >
                {mql.companySize}
              </span>
            )}
          </div>

          {/* Behaviors */}
          <div
            className="analytic-card bg-[#17171A] rounded-2xl p-5"
            style={{ border: "1.5px solid rgba(255,255,255,0.1)" }}
          >
            <h3 className="text-sm font-semibold text-[#F0F0F5] mb-3">
              Comportamentos qualificadores
            </h3>
            <div className="space-y-1.5">
              {mql.behaviors.map((beh, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-1.5 px-2 rounded-lg"
                  style={{ background: "#202024" }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#7D1AD7] flex-shrink-0" />
                    <span className="text-xs text-[#F0F0F5]">{beh}</span>
                  </div>
                  {editMode && (
                    <button
                      onClick={() => removeItem("behaviors", i)}
                      className="text-[#555566] hover:text-[#FF5252]"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {editMode && (
              <div className="flex gap-2 mt-2">
                <input
                  value={newBehavior}
                  onChange={(e) => setNewBehavior(e.target.value)}
                  placeholder="Novo comportamento..."
                  className="flex-1 text-xs px-2 py-1.5 rounded-lg border border-[rgba(255,255,255,0.1)] focus:outline-none focus:border-[#7D1AD7]"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      addItem("behaviors", newBehavior)
                      setNewBehavior("")
                    }
                  }}
                />
                <button
                  onClick={() => {
                    addItem("behaviors", newBehavior)
                    setNewBehavior("")
                  }}
                  className="text-xs px-2 py-1.5 rounded-lg bg-[rgba(125,26,215,0.15)] text-[#7D1AD7]"
                >
                  <Plus size={12} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────
