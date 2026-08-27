import { describe, expect, it } from "vitest"
import { toPost, toPostPayload } from "./posts"

describe("post mappers", () => {
  it("maps a post response without leaking API enums to the UI", () => {
    const post = toPost({
      id: "p1", titulo: "Post", canal: "INSTAGRAM", campanhaNome: null,
      imagens: [{ url: "https://example.com/a.png", tipo: "IMAGEM" }], linkUrl: null,
      ctr: null, visitasPerfil: 12, conteudo: "Texto", formato: "REELS",
      curtidas: 1, alcance: 2, impressoes: 3, engajamento: 4, saves: 5,
      compartilhamentos: 6, comentarios: 7, dataPublicacao: "2026-08-01T00:00:00.000Z", dataLimite: null,
    })

    expect(post).toMatchObject({ channel: "instagram", format: "reel", profileVisits: 12 })
    expect(toPostPayload(post)).toMatchObject({ canal: "INSTAGRAM", formato: "REELS" })
  })
})
