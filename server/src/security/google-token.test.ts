import { describe, expect, it } from "vitest"
import {
  decryptGoogleToken,
  encryptGoogleToken,
  isEncryptedGoogleToken,
} from "./google-token.js"

describe("Google token encryption", () => {
  it("round-trips with authenticated encryption", () => {
    const encrypted = encryptGoogleToken("refresh-token-sensitive")
    expect(isEncryptedGoogleToken(encrypted)).toBe(true)
    expect(encrypted).not.toContain("refresh-token-sensitive")
    expect(decryptGoogleToken(encrypted)).toBe("refresh-token-sensitive")
  })

  it("rejects tampered ciphertext", () => {
    const encrypted = encryptGoogleToken("refresh-token-sensitive")
    expect(() => decryptGoogleToken(`${encrypted.slice(0, -1)}A`)).toThrow()
  })
})
