import { api } from "@/shared/api/client"
import type { AuthUserDto, LoginResponseDto } from "./model"

export const authApi = {
  get hasToken() {
    return api.hasToken
  },
  setToken: (value: string | null) => api.setToken(value),
  login: (email: string, senha: string) =>
    api.login(email, senha) as Promise<LoginResponseDto>,
  me: () => api.me() as Promise<AuthUserDto>,
  changePassword: (senhaAtual: string, novaSenha: string) =>
    api.changePassword(senhaAtual, novaSenha) as Promise<{
      ok: true
      token: string
    }>,
  logout: () => api.logout(),
  forgotPassword: (email: string) => api.forgotPassword(email),
  verifyCode: (email: string, codigo: string) => api.verifyCode(email, codigo),
  resetPassword: (resetToken: string, novaSenha: string) =>
    api.resetPassword(resetToken, novaSenha),
}
