import "dotenv/config"
import { z } from "zod"

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value
const optionalString = z.preprocess(
  emptyToUndefined,
  z.string().min(1).optional(),
)
const optionalEmail = z.preprocess(
  emptyToUndefined,
  z.string().email().optional(),
)
const envBoolean = (fallback: boolean) =>
  z.preprocess((value) => {
    if (value === undefined || value === "") return fallback
    if (typeof value === "string") return value.toLowerCase() === "true"
    return value
  }, z.boolean())

const raw = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    DATABASE_URL: z.string().min(1),
    JWT_SECRET: optionalString,
    ACCESS_TOKEN_SECRET: optionalString,
    OAUTH_STATE_SECRET: optionalString,
    FILE_SIGNING_SECRET: optionalString,
    GOOGLE_TOKEN_ENCRYPTION_KEY: optionalString,
    JWT_EXPIRES_IN: z.string().default("8h"),
    JWT_ISSUER: z.string().default("citi-hubspot-api"),
    JWT_AUDIENCE: z.string().default("citi-hubspot-web"),
    PORT: z.coerce.number().int().positive().default(3001),
    CORS_ORIGIN: z
      .string()
      .default("http://localhost:8443,http://localhost:5174"),
    TRUST_PROXY: z.string().default("false"),
    GMAIL_CLIENT_ID: optionalString,
    GMAIL_CLIENT_SECRET: optionalString,
    GMAIL_REFRESH_TOKEN: optionalString,
    GMAIL_SENDER: optionalEmail,
    EMAIL_FROM_NAME: z.string().default("CITi HubSpot"),
    GOOGLE_OAUTH_REDIRECT_URI: z
      .string()
      .default("http://localhost:3001/api/v1/google/callback"),
    FRONTEND_URL: z.string().default("http://localhost:5174"),
    RESET_CODE_TTL_MINUTES: z.coerce.number().int().positive().default(15),
    RESET_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(15),
    ALLOW_RESET_CODE_LOG: envBoolean(false),
    ALLOW_LEGACY_GOOGLE_TOKENS: envBoolean(true),
    UPLOAD_DIR: z.string().default("uploads"),
    MAX_UPLOAD_MB: z.coerce.number().int().positive().default(20),
    FILE_VIEW_TTL_SECONDS: z.coerce.number().int().positive().default(3600),
    FILE_DOWNLOAD_TTL_SECONDS: z.coerce.number().int().positive().default(60),
    RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().int().positive().default(15),
    RATE_LIMIT_GENERAL_MAX: z.coerce.number().int().positive().default(1000),
    RATE_LIMIT_LOGIN_MAX: z.coerce.number().int().positive().default(30),
    RATE_LIMIT_RESET_MAX: z.coerce.number().int().positive().default(20),
    RATE_LIMIT_UPLOAD_MAX: z.coerce.number().int().positive().default(60),
  })
  .parse(process.env)

const developmentSecret =
  raw.JWT_SECRET ?? "development-only-secret-change-before-production-123456"
const resolved = {
  ACCESS_TOKEN_SECRET: raw.ACCESS_TOKEN_SECRET ?? developmentSecret,
  OAUTH_STATE_SECRET: raw.OAUTH_STATE_SECRET ?? developmentSecret,
  FILE_SIGNING_SECRET: raw.FILE_SIGNING_SECRET ?? developmentSecret,
}

const productionErrors: string[] = []
if (raw.NODE_ENV === "production") {
  for (const [name, value] of Object.entries({
    ACCESS_TOKEN_SECRET: raw.ACCESS_TOKEN_SECRET,
    OAUTH_STATE_SECRET: raw.OAUTH_STATE_SECRET,
    FILE_SIGNING_SECRET: raw.FILE_SIGNING_SECRET,
    GOOGLE_TOKEN_ENCRYPTION_KEY: raw.GOOGLE_TOKEN_ENCRYPTION_KEY,
  }))
    if (!value || value.length < 32)
      productionErrors.push(`${name} deve ter ao menos 32 caracteres`)
  if (
    raw.GOOGLE_TOKEN_ENCRYPTION_KEY &&
    Buffer.from(raw.GOOGLE_TOKEN_ENCRYPTION_KEY, "base64").length !== 32
  )
    productionErrors.push(
      "GOOGLE_TOKEN_ENCRYPTION_KEY deve ser base64 de exatamente 32 bytes",
    )
  if (
    !raw.GMAIL_CLIENT_ID ||
    !raw.GMAIL_CLIENT_SECRET ||
    !raw.GMAIL_REFRESH_TOKEN ||
    !raw.GMAIL_SENDER
  )
    productionErrors.push("Gmail deve estar completamente configurado")
  for (const [name, value] of [
    ["FRONTEND_URL", raw.FRONTEND_URL],
    ["GOOGLE_OAUTH_REDIRECT_URI", raw.GOOGLE_OAUTH_REDIRECT_URI],
  ] as const)
    if (!value.startsWith("https://"))
      productionErrors.push(`${name} deve usar HTTPS`)
  if (
    raw.CORS_ORIGIN.split(",").some(
      (origin) => !origin.trim().startsWith("https://"),
    )
  )
    productionErrors.push("CORS_ORIGIN deve conter somente origens HTTPS")
  if (raw.ALLOW_RESET_CODE_LOG)
    productionErrors.push(
      "ALLOW_RESET_CODE_LOG não pode ser habilitado em produção",
    )
  if (raw.ALLOW_LEGACY_GOOGLE_TOKENS)
    productionErrors.push(
      "ALLOW_LEGACY_GOOGLE_TOKENS não pode ser habilitado em produção",
    )
}
if (productionErrors.length)
  throw new Error(
    `Configuração insegura de produção:\n- ${productionErrors.join("\n- ")}`,
  )

const trustProxy = /^\d+$/.test(raw.TRUST_PROXY)
  ? Number(raw.TRUST_PROXY)
  : raw.TRUST_PROXY.toLowerCase() === "true"

export const config = {
  ...raw,
  ...resolved,
  TRUST_PROXY: trustProxy,
  IS_PRODUCTION: raw.NODE_ENV === "production",
}
