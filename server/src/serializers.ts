export const publicUser = (user: any) => ({
  id: user.id,
  nomeCompleto: user.nomeCompleto,
  email: user.email,
  perfil: user.perfil,
  cargo: user.cargo,
  primeiroAcesso: user.primeiroAcesso,
})
export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
