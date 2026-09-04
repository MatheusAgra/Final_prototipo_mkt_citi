import "dotenv/config"
import bcrypt from "bcryptjs"
import { PrismaClient, PerfilUsuario } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não configurada")
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
})

async function main() {
  const managerEmail = process.env.MANAGER_EMAIL?.trim().toLowerCase()
  const managerPassword = process.env.MANAGER_PASSWORD
  if (Boolean(managerEmail) !== Boolean(managerPassword))
    throw new Error(
      "Defina MANAGER_EMAIL e MANAGER_PASSWORD juntos para criar a gerente inicial",
    )
  if (managerEmail && managerPassword) {
    if (managerPassword.length < 12)
      throw new Error("MANAGER_PASSWORD deve ter ao menos 12 caracteres")
    await prisma.user.upsert({
      where: { email: managerEmail },
      update: {},
      create: {
        nomeCompleto: process.env.MANAGER_NAME?.trim() || "Gerente",
        email: managerEmail,
        senhaHash: await bcrypt.hash(managerPassword, 12),
        perfil: PerfilUsuario.GERENTE,
        cargo: "Gerente de Marketing",
        primeiroAcesso: true,
      },
    })
  }

  const columns = [
    ["A Fazer", "#8b5cf6", false],
    ["Em Andamento", "#507AE6", false],
    ["Em Revisão", "#FFB300", false],
    ["Aprovado", "#50E678", true],
    ["Publicado", "#00C853", true],
  ] as const
  for (const [ordem, [nome, cor, isDone]] of columns.entries()) {
    const existing = await prisma.kanbanColumn.findFirst({ where: { nome } })
    if (!existing)
      await prisma.kanbanColumn.create({ data: { nome, cor, isDone, ordem } })
  }
}

main().finally(() => prisma.$disconnect())
