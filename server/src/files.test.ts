import express from "express"
import request from "supertest"
import { describe, expect, it } from "vitest"
import {
  filesRouter,
  internalFileReference,
  parseInternalFileReference,
  signedFileUrl,
} from "./files.js"

const app = express().use("/api/v1/files", filesRouter)
const fakeRequest = {
  protocol: "http",
  get: () => "localhost:3001",
} as unknown as Parameters<typeof signedFileUrl>[0]
const reference = internalFileReference(
  "posts",
  "123e4567-e89b-12d3-a456-426614174000.png",
)

function pathOf(value: string | null): string {
  const url = new URL(value!)
  return `${url.pathname}${url.search}`
}

describe("signed files", () => {
  it("normalizes legacy and current internal references", () => {
    expect(
      parseInternalFileReference(
        "http://localhost:3001/uploads/posts/123e4567-e89b-12d3-a456-426614174000.png",
      ),
    ).toEqual({
      category: "posts",
      filename: "123e4567-e89b-12d3-a456-426614174000.png",
    })
    expect(parseInternalFileReference("file:posts/../../secret")).toBeNull()
  })

  it("rejects an expired signature before touching disk", async () => {
    const url = signedFileUrl(fakeRequest, reference, { ttlSeconds: -1 })
    const response = await request(app).get(pathOf(url))
    expect(response.status).toBe(410)
    expect(response.body.error.code).toBe("FILE_URL_EXPIRED")
  })

  it("rejects a tampered signature", async () => {
    const url = new URL(signedFileUrl(fakeRequest, reference)!)
    url.searchParams.set("signature", `${url.searchParams.get("signature")}x`)
    const response = await request(app).get(`${url.pathname}${url.search}`)
    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe("FILE_SIGNATURE_INVALID")
  })

  it("requires download-scoped signatures for materials", async () => {
    const material = internalFileReference(
      "materials",
      "123e4567-e89b-12d3-a456-426614174000.pdf",
    )
    const response = await request(app).get(
      pathOf(signedFileUrl(fakeRequest, material)),
    )
    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe("DOWNLOAD_SIGNATURE_REQUIRED")
  })
})
