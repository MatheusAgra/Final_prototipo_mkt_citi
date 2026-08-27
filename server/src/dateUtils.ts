// Toda a solução opera no fuso de Brasília (America/Sao_Paulo, sem horário de verão desde 2019 —
// sempre UTC-3). Datas armazenadas via input tipo "date" (ex.: "2026-08-21") são coagidas para meia-
// noite UTC pelo Zod e representam o dia de calendário escolhido — não devem ser reconvertidas para
// outro fuso. Já "agora" é um instante real e precisa virar o dia/mês de calendário certo em Brasília,
// senão à noite no horário local (quando o relógio UTC já virou o dia seguinte) cálculos de "hoje" saem
// errados.
const BR_TZ = "America/Sao_Paulo"

export const brToday = (): string =>
  new Date().toLocaleDateString("en-CA", { timeZone: BR_TZ })

export const utcDateStr = (value: Date | string): string =>
  new Date(value).toISOString().slice(0, 10)

export const brWeekBounds = (): { start: Date; end: Date } => {
  const [y, m, d] = brToday().split("-").map(Number)
  const dayOfWeek = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7 // segunda = 0
  const monday = new Date(Date.UTC(y, m - 1, d - dayOfWeek))
  const start = new Date(`${monday.toISOString().slice(0, 10)}T00:00:00-03:00`)
  return { start, end: new Date(start.getTime() + 7 * 86400000) }
}

export const brMonthBounds = (period: string): { start: Date; end: Date } => {
  const [y, m] = period.split("-").map(Number)
  const start = new Date(`${period}-01T00:00:00-03:00`)
  const nextPeriod =
    m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`
  const end = new Date(`${nextPeriod}-01T00:00:00-03:00`)
  return { start, end }
}
