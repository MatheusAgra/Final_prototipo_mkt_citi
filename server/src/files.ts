import crypto from "node:crypto"
import path from "node:path"
import { Router, type Request } from "express"
import { z } from "zod"
import { config } from "./config.js"

const categories = ["posts", "materials"] as const
type FileCategory = typeof categories[number]
const safeFilename = /^[0-9a-f-]{36}\.[a-z0-9]{2,5}$/i
const categoryExtensions: Record<FileCategory, Set<string>> = {
  posts: new Set([
    "jpg",
    "jpeg",
    "png",
    "gif",
    "webp",
    "avif",
    "mp4",
    "webm",
    "mov",
  ]),
  materials: new Set(["pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx"]),
}

export const internalFileReference = (
  category: FileCategory,
  filename: string,
) => `file:${category}/${filename}`

export function parseInternalFileReference(
  value: string | null | undefined,
): { category: FileCategory; filename: string } | null {
  if (!value) return null
  let pathname = value
  try {
    if (/^https?:\/\//i.test(value)) pathname = new URL(value).pathname
  } catch {
    return null
  }
  pathname = pathname.split("?")[0]
  const match = pathname.match(
    /^(?:file:|\/?uploads\/|\/?api\/v1\/files\/)(posts|materials)\/([^/]+)$/i,
  )
  if (!match || !safeFilename.test(match[2])) return null
  const category = match[1].toLowerCase() as FileCategory
  const extension = path.extname(match[2]).slice(1).toLowerCase()
  if (!categoryExtensions[category].has(extension)) return null
  return {
    category,
    filename: match[2],
  }
}

const fileSignature = (
  category: FileCategory,
  filename: string,
  expires: number,
  download: boolean,
) =>
  crypto
    .createHmac("sha256", config.FILE_SIGNING_SECRET)
    .update(`${category}/${filename}:${expires}:${download ? 1 : 0}`)
    .digest("base64url")

export function signedFileUrl(
  req: Request,
  value: string | null | undefined,
  options: { download?: boolean; ttlSeconds?: number } = {},
): string | null {
  if (!value) return null
  const internal = parseInternalFileReference(value)
  if (!internal) return value
  const download = options.download ?? false
  const expires =
    Math.floor(Date.now() / 1000) +
    (options.ttlSeconds ??
      (download
        ? config.FILE_DOWNLOAD_TTL_SECONDS
        : config.FILE_VIEW_TTL_SECONDS))
  const signature = fileSignature(
    internal.category,
    internal.filename,
    expires,
    download,
  )
  const query = new URLSearchParams({
    expires: String(expires),
    signature,
    ...(download ? { download: "1" } : {}),
  })
  return `${req.protocol}://${req.get("host")}/api/v1/files/${internal.category}/${internal.filename}?${query}`
}

export const filesRouter = Router()
filesRouter.get("/:category/:filename", (req, res) => {
  const params = z
    .object({
      category: z.enum(categories),
      filename: z.string().regex(safeFilename),
    })
    .safeParse(req.params)
  const query = z
    .object({
      expires: z.coerce.number().int().positive(),
      signature: z.string().min(32),
      download: z.enum(["1"]).optional(),
    })
    .safeParse(req.query)
  if (!params.success || !query.success)
    return res.status(404).json({ error: { code: "FILE_NOT_FOUND" } })
  const { category, filename } = params.data
  if (!parseInternalFileReference(internalFileReference(category, filename)))
    return res.status(404).json({ error: { code: "FILE_NOT_FOUND" } })
  const { expires, signature } = query.data
  const download = query.data.download === "1"
  if (expires < Math.floor(Date.now() / 1000))
    return res.status(410).json({ error: { code: "FILE_URL_EXPIRED" } })
  const expected = fileSignature(category, filename, expires, download)
  const actualBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  )
    return res.status(403).json({ error: { code: "FILE_SIGNATURE_INVALID" } })
  if (category === "materials" && !download)
    return res
      .status(403)
      .json({ error: { code: "DOWNLOAD_SIGNATURE_REQUIRED" } })

  const root = path.resolve(process.cwd(), config.UPLOAD_DIR, category)
  res.setHeader("Cache-Control", "private, max-age=60")
  res.setHeader("X-Content-Type-Options", "nosniff")
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'none'; sandbox; style-src 'none'; script-src 'none'",
  )
  if (download)
    res.setHeader(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    )
  return res.sendFile(filename, { root }, (error) => {
    const statusCode = (error as Error & { statusCode?: number } | undefined)
      ?.statusCode
    if (error && !res.headersSent)
      res.status(statusCode === 404 ? 404 : 500).json({
        error: { code: statusCode === 404 ? "FILE_NOT_FOUND" : "FILE_ERROR" },
      })
  })
})
