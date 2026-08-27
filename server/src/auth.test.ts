import { beforeEach, describe, expect, it, vi } from "vitest"
import type { NextFunction, Request, Response } from "express"

const { findFirst } = vi.hoisted(() => ({ findFirst: vi.fn() }))
vi.mock("./prisma.js", () => ({
  prisma: { user: { findFirst } },
}))

import {
  authenticate,
  managerOnly,
  signGoogleStateToken,
  signToken,
} from "./auth.js"
import { ApiError } from "./http.js"

function authenticateWith(token: string): Promise<unknown> {
  return new Promise((resolve) => {
    const req = {
      header: (name: string) =>
        name.toLowerCase() === "authorization" ? `Bearer ${token}` : undefined,
      path: "/me",
    } as Request
    authenticate(req, {} as Response, resolve as NextFunction)
  })
}

describe("authentication token separation", () => {
  beforeEach(() => findFirst.mockReset())

  it("accepts only a current access token", async () => {
    findFirst.mockResolvedValue({
      id: "123e4567-e89b-12d3-a456-426614174000",
      perfil: "GERENTE",
      primeiroAcesso: false,
      sessionVersion: 4,
    })
    const token = signToken(
      "123e4567-e89b-12d3-a456-426614174000",
      "GERENTE",
      4,
    )
    expect(await authenticateWith(token)).toBeUndefined()
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        id: "123e4567-e89b-12d3-a456-426614174000",
        ativo: true,
        sessionVersion: 4,
      },
    })
  })

  it("rejects Google state and opaque reset tokens as Bearer credentials", async () => {
    const googleState = signGoogleStateToken(
      "123e4567-e89b-12d3-a456-426614174000",
    )
    await expect(authenticateWith(googleState)).resolves.toMatchObject({
      code: "TOKEN_INVALID",
    })
    await expect(authenticateWith("opaque-reset-token")).resolves.toMatchObject(
      {
        code: "TOKEN_INVALID",
      },
    )
    expect(findFirst).not.toHaveBeenCalled()
  })

  it("rejects a token whose session version is no longer current", async () => {
    findFirst.mockResolvedValue(null)
    const token = signToken(
      "123e4567-e89b-12d3-a456-426614174000",
      "ANALISTA",
      1,
    )
    await expect(authenticateWith(token)).resolves.toMatchObject({
      code: "TOKEN_INVALID",
    })
  })
})

describe("manager authorization", () => {
  it("rejects an analyst", () => {
    const next = vi.fn()
    managerOnly(
      {
        user: { id: "id", perfil: "ANALISTA", primeiroAcesso: false },
      } as Request,
      {} as Response,
      next,
    )
    expect(next).toHaveBeenCalledWith(expect.any(ApiError))
  })
})
