import { useEffect, useState } from "react"
import type { AppUser } from "@/shared/model/domain"
import { authApi } from "./api"
import { toAppUser } from "./model"

export function useSession() {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null)
  const [changingPassword, setChangingPassword] = useState(false)
  const [changingPasswordVoluntarily, setChangingPasswordVoluntarily] =
    useState(false)

  useEffect(() => {
    if (!authApi.hasToken) return
    authApi
      .me()
      .then((user) => {
        const mapped = toAppUser(user)
        setCurrentUser(mapped)
        setChangingPassword(mapped.mustChangePassword)
      })
      .catch(() => authApi.setToken(null))
  }, [])

  async function authenticate(email: string, password: string) {
    const result = await authApi.login(email, password)
    authApi.setToken(result.token)
    return toAppUser(result.user)
  }

  function login(user: AppUser) {
    setCurrentUser(user)
    setChangingPassword(user.mustChangePassword)
    setChangingPasswordVoluntarily(false)
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    const result = await authApi.changePassword(currentPassword, newPassword)
    authApi.setToken(result.token)
    setCurrentUser((user) =>
      user
        ? { ...user, password: newPassword, mustChangePassword: false }
        : user,
    )
    setChangingPassword(false)
  }

  function startVoluntaryPasswordChange() {
    setChangingPassword(true)
    setChangingPasswordVoluntarily(true)
  }

  function cancelPasswordChange() {
    setChangingPassword(false)
  }

  function logout() {
    authApi.logout().catch(() => undefined)
    authApi.setToken(null)
    setCurrentUser(null)
    setChangingPassword(false)
  }

  return {
    currentUser,
    changingPassword,
    changingPasswordVoluntarily,
    authenticate,
    login,
    changePassword,
    cancelPasswordChange,
    startVoluntaryPasswordChange,
    logout,
    forgotPassword: async (email: string) => {
      await authApi.forgotPassword(email)
    },
    verifyResetCode: async (email: string, code: string) =>
      (await authApi.verifyCode(email, code)).resetToken,
    resetPassword: async (resetToken: string, newPassword: string) => {
      await authApi.resetPassword(resetToken, newPassword)
    },
  }
}
