import type { AppUser } from "@/shared/model/domain"

export interface AuthUserDto {
  id: string
  nomeCompleto: string
  email: string
  perfil: "GERENTE" | "ANALISTA"
  cargo: string | null
  primeiroAcesso: boolean
}

export interface LoginResponseDto {
  token: string
  user: AuthUserDto
}

export function toAppUser(user: AuthUserDto): AppUser {
  return {
    id: user.id,
    name: user.nomeCompleto,
    initials: user.nomeCompleto
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase(),
    color: user.perfil === "GERENTE" ? "#7D1AD7" : "#507AE6",
    email: user.email,
    password: "",
    role: user.perfil === "GERENTE" ? "gerente" : "analista",
    mustChangePassword: user.primeiroAcesso,
  }
}
