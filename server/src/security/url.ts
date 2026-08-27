import { z } from "zod"
import { parseInternalFileReference } from "../files.js"

export function isSafeHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return (
      url.protocol === "https:" && url.username === "" && url.password === ""
    )
  } catch {
    return false
  }
}

export const httpsUrlSchema = z
  .string()
  .trim()
  .refine(isSafeHttpsUrl, "Informe uma URL HTTPS válida")

export const storedFileUrlSchema = z
  .string()
  .trim()
  .refine(
    (value) =>
      isSafeHttpsUrl(value) || Boolean(parseInternalFileReference(value)),
    "Informe uma URL HTTPS válida ou um arquivo enviado pelo sistema",
  )
  .transform((value) => {
    const internal = parseInternalFileReference(value)
    return internal ? `file:${internal.category}/${internal.filename}` : value
  })
