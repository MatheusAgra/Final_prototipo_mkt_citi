import { prisma } from "../src/prisma.js"
import {
  encryptGoogleToken,
  isEncryptedGoogleToken,
} from "../src/security/google-token.js"

async function main() {
  const accounts = await prisma.googleAccount.findMany()
  let updated = 0
  for (const account of accounts) {
    if (isEncryptedGoogleToken(account.refreshToken)) continue
    await prisma.googleAccount.update({
      where: { id: account.id },
      data: { refreshToken: encryptGoogleToken(account.refreshToken) },
    })
    updated += 1
  }
  console.log(`${updated} token(s) Google criptografado(s).`)
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
