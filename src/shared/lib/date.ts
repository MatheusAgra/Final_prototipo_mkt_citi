// Converte uma data ISO ("2026-08-21" ou "2026-08-21T00:00:00.000Z") para o formato brasileiro
// "21/08/2026". Usado em toda exibição de data da aplicação — inputs type="date" continuam em ISO
// internamente (exigência do próprio elemento HTML), só a leitura para o usuário muda.
export function formatDateBR(value: string | null | undefined): string {
  if (!value) return ""
  const [y, m, d] = value.slice(0, 10).split("-")
  if (!y || !m || !d) return value
  return `${d}/${m}/${y}`
}
