import express from "express"
import request from "supertest"
import bcrypt from "bcryptjs"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  userFindFirst: vi.fn(),
  userUpdate: vi.fn(),
  resetFindFirst: vi.fn(),
  resetFindUnique: vi.fn(),
  resetUpdateMany: vi.fn(),
  transaction: vi.fn(),
}))

vi.mock("../../prisma.js", () => ({
  prisma: {
    user: {
      findFirst: mocks.userFindFirst,
      update: mocks.userUpdate,
    },
    passwordResetCode: {
      findFirst: mocks.resetFindFirst,
      findUnique: mocks.resetFindUnique,
      updateMany: mocks.resetUpdateMany,
    },
    $transaction: mocks.transaction,
  },
}))

import { authRouter } from "./router.js"
import { errorHandler } from "../../http.js"

const app = express()
  .use(express.json())
  .use("/auth", authRouter)
  .use(errorHandler)

describe("password reset grants", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("locks a code after five failed attempts", async () => {
    mocks.userFindFirst.mockResolvedValue({ id: "user-id" })
    mocks.resetFindFirst.mockResolvedValue({
      id: "reset-id",
      attempts: 5,
      expiresAt: new Date(Date.now() + 60_000),
      codeHash: await bcrypt.hash("123456", 4),
    })
    const response = await request(app).post("/auth/verify-code").send({
      email: "user@example.com",
      codigo: "123456",
    })
    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe("CODE_INVALID")
    expect(mocks.resetUpdateMany).not.toHaveBeenCalled()
  })

  it("issues an opaque, single-use reset grant", async () => {
    mocks.userFindFirst.mockResolvedValue({ id: "user-id" })
    mocks.resetFindFirst.mockResolvedValue({
      id: "reset-id",
      attempts: 0,
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      codeHash: await bcrypt.hash("123456", 4),
    })
    mocks.resetUpdateMany.mockResolvedValue({ count: 1 })
    const response = await request(app).post("/auth/verify-code").send({
      email: "user@example.com",
      codigo: "123456",
    })
    expect(response.status).toBe(200)
    expect(response.body.resetToken).toMatch(/^[A-Za-z0-9_-]{40,}$/)
    expect(response.body.resetToken.split(".")).toHaveLength(1)
  })

  it("allows only one concurrent consumption of a reset grant", async () => {
    mocks.resetFindUnique.mockResolvedValue({
      id: "reset-id",
      userId: "user-id",
      resetUsedAt: null,
      resetTokenExpiresAt: new Date(Date.now() + 60_000),
    })
    let available = true
    mocks.transaction.mockImplementation(async (operation) =>
      operation({
        passwordResetCode: {
          updateMany: vi.fn(async () => {
            if (!available) return { count: 0 }
            available = false
            return { count: 1 }
          }),
        },
        user: { update: vi.fn(async () => ({ id: "user-id" })) },
      }),
    )
    const payload = {
      resetToken: "opaque-reset-token-with-enough-entropy",
      novaSenha: "new-password-123",
      confirmarSenha: "new-password-123",
    }
    const responses = await Promise.all([
      request(app).post("/auth/reset-password").send(payload),
      request(app).post("/auth/reset-password").send(payload),
    ])
    expect(responses.map((response) => response.status).sort()).toEqual([
      200, 401,
    ])
  })
})
