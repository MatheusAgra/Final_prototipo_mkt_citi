import request from "supertest"
import { describe, expect, it } from "vitest"
import { app } from "./app.js"

describe("HTTP application shell", () => {
  it("exposes the health contract without accessing application data", async () => {
    const response = await request(app).get("/health")
    expect(response.status).toBe(200)
    expect(response.body).toEqual({ ok: true })
  })

  it("keeps the JSON not-found contract", async () => {
    const response = await request(app).get("/api/v1/does-not-exist")
    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe("NOT_FOUND")
  })

  it("does not expose the legacy uploads directory", async () => {
    const response = await request(app).get("/uploads/posts/example.png")
    expect(response.status).toBe(404)
  })
})
