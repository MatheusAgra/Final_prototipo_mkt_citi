import { Router } from "express"
import { z } from "zod"
import { prisma } from "../../prisma.js"
import { config } from "../../config.js"
import { ApiError, asyncRoute } from "../../http.js"
import { authenticate } from "../../auth.js"
import {
  materialUpload,
  mediaUpload,
  mediaTipoFromMime,
  fileReferenceFromUpload,
} from "../../upload.js"
import { signedFileUrl } from "../../files.js"
import { httpsUrlSchema, storedFileUrlSchema } from "../../security/url.js"

export const libraryRouter = Router()
libraryRouter.use(authenticate)
const postBodyBase = z.object({
  canal: z.enum(["INSTAGRAM", "LINKEDIN"]),
  campaignId: z.string().uuid().nullable().optional(),
  titulo: z.string().trim().min(1),
  conteudo: z.string(),
  formato: z
    .enum([
      "REELS",
      "CARROSSEL",
      "POST_ESTATICO",
      "STORIES",
      "PDF_DOCUMENTO",
      "TEXTO_IMAGEM",
      "VIDEO",
      "ARTIGO_NEWSLETTER",
      "ENQUETE",
    ])
    .nullable()
    .optional(),
  dataPublicacao: z.coerce.date().optional(),
  dataLimite: z.coerce.date().nullable().optional(),
  imagens: z
    .array(
      z.object({
        url: storedFileUrlSchema,
        tipo: z.enum(["IMAGEM", "VIDEO"]).default("IMAGEM"),
      }),
    )
    .default([]),
  linkUrl: httpsUrlSchema.nullable().optional(),
  alcance: z.number().int().min(0).default(0),
  impressoes: z.number().int().min(0).default(0),
  engajamento: z.number().int().min(0).default(0),
  curtidas: z.number().int().min(0).default(0),
  comentarios: z.number().int().min(0).default(0),
  saves: z.number().int().min(0).default(0),
  compartilhamentos: z.number().int().min(0).default(0),
  ctr: z.number().min(0).nullable().optional(),
  visitasPerfil: z.number().int().min(0).nullable().optional(),
})
const postInclude = {
  imagens: { orderBy: { ordem: "asc" as const } },
  campaign: true,
} as const
const serializePost = (
  req: Parameters<typeof signedFileUrl>[0],
  post: any,
) => ({
  ...post,
  campanhaNome: post.campaign?.nome ?? null,
  imagens: post.imagens.map((image: any) => ({
    url: signedFileUrl(req, image.url),
    tipo: image.tipo,
    ordem: image.ordem,
  })),
  ctr: post.canal === "LINKEDIN" ? post.ctr : null,
  visitasPerfil: post.canal === "INSTAGRAM" ? post.visitasPerfil : null,
})
libraryRouter.post(
  "/posts/upload",
  ...mediaUpload,
  asyncRoute(async (req, res) => {
    if (!req.file)
      throw new ApiError(400, "FILE_REQUIRED", "Selecione um arquivo")
    res.status(201).json({
      url: signedFileUrl(
        req,
        fileReferenceFromUpload("posts", req.file.filename),
      ),
      tipo: mediaTipoFromMime(req.file.mimetype),
    })
  }),
)
libraryRouter.get(
  "/posts",
  asyncRoute(async (req, res) => {
    const q = z
      .object({
        canal: z.enum(["INSTAGRAM", "LINKEDIN"]).optional(),
        ordenar: z.enum(["alcance", "engajamento", "visitas"]).optional(),
      })
      .parse(req.query)
    const orderBy =
      q.ordenar === "alcance"
        ? { alcance: "desc" as const }
        : q.ordenar === "engajamento"
          ? { engajamento: "desc" as const }
          : q.ordenar === "visitas"
            ? { visitasPerfil: "desc" as const }
            : { createdAt: "desc" as const }
    res.json(
      (
        await prisma.post.findMany({
          where: q.canal ? { canal: q.canal } : {},
          orderBy,
          include: postInclude,
        })
      ).map((post) => serializePost(req, post)),
    )
  }),
)
libraryRouter.post(
  "/posts",
  asyncRoute(async (req, res) => {
    const body = postBodyBase.parse(req.body)
    const { imagens, ...data } = body
    if (data.canal === "LINKEDIN") data.visitasPerfil = null
    else data.ctr = null
    const row = await prisma.post.create({
      data: {
        ...data,
        imagens: {
          create: imagens.map((image, ordem) => ({
            url: image.url,
            tipo: image.tipo,
            ordem,
          })),
        },
      },
      include: postInclude,
    })
    res.status(201).json(serializePost(req, row))
  }),
)
libraryRouter.patch(
  "/posts/:id",
  asyncRoute(async (req, res) => {
    const current = await prisma.post.findUnique({
      where: { id: String(req.params.id) },
    })
    if (!current) throw new ApiError(404, "NOT_FOUND")
    const body = postBodyBase.partial().parse(req.body)
    const canal = body.canal ?? current.canal
    const { imagens, ...data } = body
    const row = await prisma.$transaction(async (tx) => {
      if (imagens) {
        await tx.postImage.deleteMany({
          where: { postId: String(req.params.id) },
        })
        await tx.postImage.createMany({
          data: imagens.map((image, ordem) => ({
            postId: String(req.params.id),
            url: image.url,
            tipo: image.tipo,
            ordem,
          })),
        })
      }
      return tx.post.update({
        where: { id: String(req.params.id) },
        data: {
          ...data,
          ...(canal === "LINKEDIN" ? { visitasPerfil: null } : { ctr: null }),
        },
        include: postInclude,
      })
    })
    res.json(serializePost(req, row))
  }),
)
libraryRouter.delete(
  "/posts/:id",
  asyncRoute(async (req, res) => {
    await prisma.post.delete({ where: { id: String(req.params.id) } })
    res.status(204).send()
  }),
)

const materialBody = z.object({
  titulo: z.string().trim().min(1),
  descricao: z.string(),
  tipo: z.enum(["EBOOK", "NEWSLETTER", "CASE"]),
  arquivoUrl: storedFileUrlSchema.nullable().optional(),
  capaUrl: httpsUrlSchema.nullable().optional(),
  nomeArquivo: z.string().nullable().optional(),
  tamanhoBytes: z.number().int().min(0).nullable().optional(),
  mimeType: z.string().nullable().optional(),
})
const serializeMaterial = (
  req: Parameters<typeof signedFileUrl>[0],
  material: any,
) => ({
  ...material,
  arquivoUrl: signedFileUrl(req, material.arquivoUrl, {
    download: true,
    ttlSeconds: config.FILE_VIEW_TTL_SECONDS,
  }),
})
libraryRouter.post(
  "/materials/upload",
  ...materialUpload,
  asyncRoute(async (req, res) => {
    if (!req.file)
      throw new ApiError(400, "FILE_REQUIRED", "Selecione um arquivo")
    res.status(201).json({
      arquivoUrl: signedFileUrl(
        req,
        fileReferenceFromUpload("materials", req.file.filename),
        { download: true, ttlSeconds: config.FILE_VIEW_TTL_SECONDS },
      ),
      nomeArquivo: req.file.originalname,
      tamanhoBytes: req.file.size,
      mimeType: req.file.mimetype,
    })
  }),
)
libraryRouter.get(
  "/materials",
  asyncRoute(async (req, res) => {
    const tipo = z
      .enum(["EBOOK", "NEWSLETTER", "CASE"])
      .optional()
      .parse(req.query.tipo)
    res.json(
      (
        await prisma.richMaterial.findMany({
          where: tipo ? { tipo } : {},
          orderBy: { createdAt: "desc" },
        })
      ).map((material) => serializeMaterial(req, material)),
    )
  }),
)
libraryRouter.post(
  "/materials",
  asyncRoute(async (req, res) => {
    const material = await prisma.richMaterial.create({
      data: materialBody.parse(req.body),
    })
    res.status(201).json(serializeMaterial(req, material))
  }),
)
libraryRouter.patch(
  "/materials/:id",
  asyncRoute(async (req, res) => {
    const material = await prisma.richMaterial.update({
      where: { id: String(req.params.id) },
      data: materialBody.partial().parse(req.body),
    })
    res.json(serializeMaterial(req, material))
  }),
)
libraryRouter.delete(
  "/materials/:id",
  asyncRoute(async (req, res) => {
    await prisma.richMaterial.delete({ where: { id: String(req.params.id) } })
    res.status(204).send()
  }),
)
libraryRouter.post(
  "/materials/:id/download",
  asyncRoute(async (req, res) => {
    const material = await prisma.richMaterial.update({
      where: { id: String(req.params.id) },
      data: { downloads: { increment: 1 } },
    })
    res.json({
      arquivoUrl: signedFileUrl(req, material.arquivoUrl, { download: true }),
      downloads: material.downloads,
    })
  }),
)

const promptBody = z.object({
  titulo: z.string().trim().min(1),
  categoria: z.enum(["INSTAGRAM", "LINKEDIN", "EMAIL", "CARROSSEL", "SITE"]),
  conteudo: z.string().min(1),
  tags: z.array(z.string().trim().min(1)).default([]),
})
const promptInclude = { tags: true } as const
const serializePrompt = (p: any) => ({
  ...p,
  tags: p.tags.map((tag: any) => tag.tag),
})
libraryRouter.get(
  "/prompts",
  asyncRoute(async (req, res) => {
    const q = z
      .object({
        categoria: z
          .enum(["INSTAGRAM", "LINKEDIN", "EMAIL", "CARROSSEL", "SITE"])
          .optional(),
        busca: z.string().optional(),
        favoritos: z.coerce.boolean().optional(),
      })
      .parse(req.query)
    const rows = await prisma.prompt.findMany({
      where: {
        ...(q.categoria ? { categoria: q.categoria } : {}),
        ...(q.favoritos ? { favorito: true } : {}),
        ...(q.busca
          ? {
              OR: [
                { titulo: { contains: q.busca, mode: "insensitive" } },
                {
                  tags: {
                    some: { tag: { contains: q.busca, mode: "insensitive" } },
                  },
                },
              ],
            }
          : {}),
      },
      include: promptInclude,
      orderBy: { createdAt: "desc" },
    })
    res.json(rows.map(serializePrompt))
  }),
)
libraryRouter.post(
  "/prompts",
  asyncRoute(async (req, res) => {
    const { tags, ...data } = promptBody.parse(req.body)
    res.status(201).json(
      serializePrompt(
        await prisma.prompt.create({
          data: { ...data, tags: { create: tags.map((tag) => ({ tag })) } },
          include: promptInclude,
        }),
      ),
    )
  }),
)
libraryRouter.patch(
  "/prompts/:id",
  asyncRoute(async (req, res) => {
    const body = promptBody.partial().parse(req.body)
    const { tags, ...data } = body
    const row = await prisma.$transaction(async (tx) => {
      if (tags) {
        await tx.promptTag.deleteMany({
          where: { promptId: String(req.params.id) },
        })
        await tx.promptTag.createMany({
          data: tags.map((tag) => ({ promptId: String(req.params.id), tag })),
        })
      }
      return tx.prompt.update({
        where: { id: String(req.params.id) },
        data,
        include: promptInclude,
      })
    })
    res.json(serializePrompt(row))
  }),
)
libraryRouter.delete(
  "/prompts/:id",
  asyncRoute(async (req, res) => {
    await prisma.prompt.delete({ where: { id: String(req.params.id) } })
    res.status(204).send()
  }),
)
libraryRouter.post(
  "/prompts/:id/copy",
  asyncRoute(async (req, res) => {
    const prompt = await prisma.prompt.update({
      where: { id: String(req.params.id) },
      data: { usos: { increment: 1 } },
    })
    res.json({ id: prompt.id, usos: prompt.usos, conteudo: prompt.conteudo })
  }),
)
libraryRouter.patch(
  "/prompts/:id/favorite",
  asyncRoute(async (req, res) => {
    const body = z.object({ favorito: z.boolean().optional() }).parse(req.body)
    const current = await prisma.prompt.findUnique({
      where: { id: String(req.params.id) },
    })
    if (!current) throw new ApiError(404, "NOT_FOUND")
    const prompt = await prisma.prompt.update({
      where: { id: current.id },
      data: { favorito: body.favorito ?? !current.favorito },
    })
    res.json({ favorito: prompt.favorito })
  }),
)
