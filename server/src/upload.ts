import fs from "node:fs"
import path from "node:path"
import crypto from "node:crypto"
import multer from "multer"
import { fileTypeFromFile } from "file-type"
import type { RequestHandler } from "express"
import { config } from "./config.js"
import { ApiError } from "./http.js"
import { internalFileReference } from "./files.js"

type UploadCategory = "posts" | "materials"
type AllowedType = { ext: string; mime: string }

const MEDIA_TYPES = new Map<string, AllowedType>([
  ["image/jpeg", { ext: "jpg", mime: "image/jpeg" }],
  ["image/png", { ext: "png", mime: "image/png" }],
  ["image/gif", { ext: "gif", mime: "image/gif" }],
  ["image/webp", { ext: "webp", mime: "image/webp" }],
  ["image/avif", { ext: "avif", mime: "image/avif" }],
  ["video/mp4", { ext: "mp4", mime: "video/mp4" }],
  ["video/webm", { ext: "webm", mime: "video/webm" }],
  ["video/quicktime", { ext: "mov", mime: "video/quicktime" }],
])

const MATERIAL_TYPES = new Map<string, AllowedType>([
  ["application/pdf", { ext: "pdf", mime: "application/pdf" }],
  ["application/msword", { ext: "doc", mime: "application/msword" }],
  [
    "application/vnd.ms-powerpoint",
    { ext: "ppt", mime: "application/vnd.ms-powerpoint" },
  ],
  [
    "application/vnd.ms-excel",
    { ext: "xls", mime: "application/vnd.ms-excel" },
  ],
  [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    {
      ext: "docx",
      mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    },
  ],
  [
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    {
      ext: "pptx",
      mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    },
  ],
  [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    {
      ext: "xlsx",
      mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  ],
])

const oldOfficeTypes: Record<string, AllowedType> = {
  doc: { ext: "doc", mime: "application/msword" },
  ppt: { ext: "ppt", mime: "application/vnd.ms-powerpoint" },
  xls: { ext: "xls", mime: "application/vnd.ms-excel" },
}

const tempDir = path.resolve(process.cwd(), config.UPLOAD_DIR, ".tmp")
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      fs.mkdirSync(tempDir, { recursive: true })
      cb(null, tempDir)
    },
    filename: (_req, _file, cb) => cb(null, `${crypto.randomUUID()}.upload`),
  }),
  limits: { fileSize: config.MAX_UPLOAD_MB * 1024 * 1024, files: 1 },
})

async function detectedType(
  file: Express.Multer.File,
  category: UploadCategory,
): Promise<AllowedType | null> {
  const detected = await fileTypeFromFile(file.path)
  if (!detected) return null
  return allowedUploadType(category, detected, file.originalname)
}

export function allowedUploadType(
  category: UploadCategory,
  detected: { ext: string; mime: string },
  originalName: string,
): AllowedType | null {
  const originalExtension = path.extname(originalName).slice(1).toLowerCase()
  if (category === "posts") {
    const type = MEDIA_TYPES.get(detected.mime) ?? null
    if (!type) return null
    const acceptedExtensions =
      type.ext === "jpg" ? new Set(["jpg", "jpeg"]) : new Set([type.ext])
    return acceptedExtensions.has(originalExtension) ? type : null
  }
  const direct = MATERIAL_TYPES.get(detected.mime)
  if (direct) return direct.ext === originalExtension ? direct : null
  if (detected.ext === "cfb" || detected.mime === "application/x-cfb") {
    return oldOfficeTypes[originalExtension] ?? null
  }
  return null
}

function finalizeUpload(category: UploadCategory): RequestHandler {
  return async (req, _res, next) => {
    if (!req.file) return next()
    try {
      const type = await detectedType(req.file, category)
      if (!type)
        throw new ApiError(
          415,
          "UNSUPPORTED_FILE_TYPE",
          category === "posts"
            ? "Tipo de arquivo não suportado. Envie PNG, JPEG, WebP, GIF, AVIF, MP4, WebM ou MOV."
            : "Tipo de arquivo não suportado. Envie PDF, DOC, DOCX, PPT, PPTX, XLS ou XLSX.",
        )
      const destination = path.resolve(
        process.cwd(),
        config.UPLOAD_DIR,
        category,
      )
      await fs.promises.mkdir(destination, { recursive: true })
      const filename = `${crypto.randomUUID()}.${type.ext}`
      const finalPath = path.join(destination, filename)
      await fs.promises.rename(req.file.path, finalPath)
      req.file.filename = filename
      req.file.path = finalPath
      req.file.mimetype = type.mime
      next()
    } catch (error) {
      await fs.promises.unlink(req.file.path).catch(() => undefined)
      next(error)
    }
  }
}

export const materialUpload = [
  upload.single("arquivo"),
  finalizeUpload("materials"),
]
export const mediaUpload = [upload.single("arquivo"), finalizeUpload("posts")]

export const mediaTipoFromMime = (mimetype: string): "IMAGEM" | "VIDEO" =>
  mimetype.startsWith("video/") ? "VIDEO" : "IMAGEM"

export const fileReferenceFromUpload = (
  category: UploadCategory,
  filename: string,
) => internalFileReference(category, filename)
