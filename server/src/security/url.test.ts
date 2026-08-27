import { describe, expect, it } from "vitest"
import { httpsUrlSchema, storedFileUrlSchema } from "./url.js"

describe("safe URLs", () => {
  it.each([
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "http://example.com/file",
    "https://user:password@example.com/file",
  ])("rejects unsafe URL %s", (value) => {
    expect(httpsUrlSchema.safeParse(value).success).toBe(false)
  })

  it("accepts HTTPS and normalizes signed internal file URLs", () => {
    expect(httpsUrlSchema.parse("https://example.com/file")).toBe(
      "https://example.com/file",
    )
    expect(
      storedFileUrlSchema.parse(
        "http://localhost:3001/api/v1/files/posts/123e4567-e89b-12d3-a456-426614174000.png?expires=1&signature=x",
      ),
    ).toBe("file:posts/123e4567-e89b-12d3-a456-426614174000.png")
  })
})
