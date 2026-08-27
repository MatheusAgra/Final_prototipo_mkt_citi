import { prisma } from "../src/prisma.js"
import {
  internalFileReference,
  parseInternalFileReference,
} from "../src/files.js"

const normalize = (value: string | null) => {
  const parsed = parseInternalFileReference(value)
  return parsed ? internalFileReference(parsed.category, parsed.filename) : null
}

async function main() {
  const [images, materials] = await Promise.all([
    prisma.postImage.findMany(),
    prisma.richMaterial.findMany({ where: { arquivoUrl: { not: null } } }),
  ])
  let updated = 0
  for (const image of images) {
    const normalized = normalize(image.url)
    if (!normalized || normalized === image.url) continue
    await prisma.postImage.update({
      where: { id: image.id },
      data: { url: normalized },
    })
    updated += 1
  }
  for (const material of materials) {
    const normalized = normalize(material.arquivoUrl)
    if (!normalized || normalized === material.arquivoUrl) continue
    await prisma.richMaterial.update({
      where: { id: material.id },
      data: { arquivoUrl: normalized },
    })
    updated += 1
  }
  console.log(`${updated} referência(s) interna(s) normalizada(s).`)
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
