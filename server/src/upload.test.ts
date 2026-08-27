import { describe, expect, it } from "vitest"
import { allowedUploadType } from "./upload.js"

describe("upload type allowlist", () => {
  it.each([
    ["posts", "jpg", "image/jpeg", "photo.jpg", "jpg"],
    ["posts", "png", "image/png", "photo.png", "png"],
    ["posts", "webp", "image/webp", "photo.webp", "webp"],
    ["posts", "gif", "image/gif", "photo.gif", "gif"],
    ["posts", "avif", "image/avif", "photo.avif", "avif"],
    ["posts", "mp4", "video/mp4", "video.mp4", "mp4"],
    ["posts", "webm", "video/webm", "video.webm", "webm"],
    ["posts", "mov", "video/quicktime", "video.mov", "mov"],
    ["materials", "pdf", "application/pdf", "file.pdf", "pdf"],
    [
      "materials",
      "docx",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "file.docx",
      "docx",
    ],
    [
      "materials",
      "pptx",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "file.pptx",
      "pptx",
    ],
    [
      "materials",
      "xlsx",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "file.xlsx",
      "xlsx",
    ],
  ] as const)("allows %s %s", (category, ext, mime, name, expected) => {
    expect(allowedUploadType(category, { ext, mime }, name)?.ext).toBe(expected)
  })

  it("allows compound Office files only with an expected original extension", () => {
    expect(
      allowedUploadType(
        "materials",
        { ext: "cfb", mime: "application/x-cfb" },
        "file.doc",
      )?.ext,
    ).toBe("doc")
    expect(
      allowedUploadType(
        "materials",
        { ext: "cfb", mime: "application/x-cfb" },
        "payload.html",
      ),
    ).toBeNull()
  })

  it.each([
    { ext: "svg", mime: "image/svg+xml" },
    { ext: "html", mime: "text/html" },
    { ext: "exe", mime: "application/x-msdownload" },
  ])("rejects executable or active content $mime", (detected) => {
    expect(
      allowedUploadType("posts", detected, `file.${detected.ext}`),
    ).toBeNull()
    expect(
      allowedUploadType("materials", detected, `file.${detected.ext}`),
    ).toBeNull()
  })

  it("rejects a safe signature hidden behind a conflicting extension", () => {
    expect(
      allowedUploadType(
        "posts",
        { ext: "png", mime: "image/png" },
        "payload.html",
      ),
    ).toBeNull()
  })
})
