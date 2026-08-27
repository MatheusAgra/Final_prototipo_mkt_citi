import { describe, expect, it } from "vitest"
import { toAppUser } from "./model"

describe("toAppUser", () => {
  it("converts the API user into the UI session model", () => {
    expect(toAppUser({
      id: "a1",
      nomeCompleto: "Ana Lima",
      email: "ana@example.com",
      perfil: "GERENTE",
      cargo: "Gerente",
      primeiroAcesso: true,
    })).toMatchObject({
      id: "a1",
      name: "Ana Lima",
      initials: "AL",
      role: "gerente",
      mustChangePassword: true,
    })
  })
})
