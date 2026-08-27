import crypto from "node:crypto"
import { config } from "../config.js"

const PREFIX = "enc:v1"

function encryptionKey(): Buffer {
  if (config.GOOGLE_TOKEN_ENCRYPTION_KEY) {
    const decoded = Buffer.from(config.GOOGLE_TOKEN_ENCRYPTION_KEY, "base64")
    if (decoded.length === 32) return decoded
    if (config.IS_PRODUCTION)
      throw new Error(
        "GOOGLE_TOKEN_ENCRYPTION_KEY deve ser uma chave base64 de 32 bytes",
      )
    return crypto
      .createHash("sha256")
      .update(config.GOOGLE_TOKEN_ENCRYPTION_KEY)
      .digest()
  }
  return crypto.createHash("sha256").update(config.ACCESS_TOKEN_SECRET).digest()
}

export function isEncryptedGoogleToken(value: string): boolean {
  return value.startsWith(`${PREFIX}:`)
}

export function encryptGoogleToken(value: string): string {
  if (isEncryptedGoogleToken(value)) return value
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv)
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()
  return [
    PREFIX,
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(":")
}

export function decryptGoogleToken(value: string): string {
  if (!isEncryptedGoogleToken(value)) {
    if (config.ALLOW_LEGACY_GOOGLE_TOKENS && !config.IS_PRODUCTION) return value
    throw new Error("Refresh token Google legado não criptografado")
  }
  const [, version, ivValue, tagValue, encryptedValue] = value.split(":")
  if (`enc:${version}` !== PREFIX || !ivValue || !tagValue || !encryptedValue)
    throw new Error("Refresh token Google criptografado inválido")
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivValue, "base64url"),
  )
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"))
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8")
}
