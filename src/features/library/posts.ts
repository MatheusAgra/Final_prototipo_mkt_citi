import { useEffect, useState } from "react"
import { libraryApi as api } from "./api"
import type { ChannelType, Post } from "@/shared/model/domain"

interface PostDto {
  id: string
  titulo: string
  canal: Uppercase<ChannelType>
  campanhaNome: string | null
  imagens: { url: string; tipo: "IMAGEM" | "VIDEO" }[]
  linkUrl: string | null
  ctr: number | null
  visitasPerfil: number | null
  conteudo: string
  formato: string
  curtidas: number
  alcance: number
  impressoes: number
  engajamento: number
  saves: number
  compartilhamentos: number
  comentarios: number
  dataPublicacao: string | null
  dataLimite: string | null
}

const formatByApi: Record<string, Post["format"]> = {
  REELS: "reel",
  CARROSSEL: "carousel",
  POST_ESTATICO: "static",
  STORIES: "story",
  PDF_DOCUMENTO: "document",
  TEXTO_IMAGEM: "static",
  VIDEO: "video",
  ARTIGO_NEWSLETTER: "article",
  ENQUETE: "poll",
}

const formatToApi: Record<Post["format"], string> = {
  reel: "REELS",
  carousel: "CARROSSEL",
  static: "POST_ESTATICO",
  story: "STORIES",
  document: "PDF_DOCUMENTO",
  video: "VIDEO",
  article: "ARTIGO_NEWSLETTER",
  poll: "ENQUETE",
}

export function toPost(post: PostDto): Post {
  return {
    id: post.id,
    title: post.titulo,
    channel: post.canal.toLowerCase() as ChannelType,
    campaign: post.campanhaNome ?? "",
    images: post.imagens.map((image) => ({
      url: image.url,
      tipo: image.tipo === "VIDEO" ? "video" : "imagem",
    })),
    linkUrl: post.linkUrl ?? undefined,
    ctr: post.ctr ?? undefined,
    profileVisits: post.visitasPerfil ?? undefined,
    caption: post.conteudo,
    format: formatByApi[post.formato] ?? "static",
    insights: {
      likes: post.curtidas,
      reach: post.alcance,
      impressions: post.impressoes,
      engagement: post.engajamento,
      saves: post.saves,
      shares: post.compartilhamentos,
      comments: post.comentarios,
    },
    publishedAt: post.dataPublicacao?.slice(0, 10) ?? "",
    validUntil: post.dataLimite?.slice(0, 10) ?? "",
  }
}

export function toPostPayload(post: Post) {
  return {
    canal: post.channel.toUpperCase(),
    titulo: post.title,
    conteudo: post.caption,
    formato: formatToApi[post.format],
    dataPublicacao: post.publishedAt || new Date().toISOString(),
    dataLimite: post.validUntil || null,
    imagens: post.images.map((image) => ({
      url: image.url,
      tipo: image.tipo === "video" ? "VIDEO" : "IMAGEM",
    })),
    linkUrl: post.linkUrl || null,
    alcance: post.insights.reach,
    impressoes: post.insights.impressions,
    engajamento: post.insights.engagement,
    curtidas: post.insights.likes,
    comentarios: post.insights.comments,
    saves: post.insights.saves,
    compartilhamentos: post.insights.shares,
    ...(post.channel === "linkedin"
      ? { ctr: post.ctr ?? 0 }
      : { visitasPerfil: post.profileVisits ?? 0 }),
  }
}

export async function fetchPosts() {
  return (await api.posts.list() as PostDto[]).map(toPost)
}

export function usePosts() {
  const [posts, setPostsState] = useState<Post[]>([])

  useEffect(() => {
    fetchPosts().then(setPostsState).catch(console.error)
  }, [])

  function setPosts(update: (previous: Post[]) => Post[]) {
    setPostsState((previous) => {
      const next = update(previous)
      const before = new Map(previous.map((post) => [post.id, post]))
      const after = new Map(next.map((post) => [post.id, post]))
      for (const post of previous) {
        if (!after.has(post.id)) api.posts.remove(post.id).catch(console.error)
      }
      for (const post of next) {
        const old = before.get(post.id)
        if (!old) {
          api.posts.create(toPostPayload(post)).then((created) =>
            setPostsState((current) =>
              current.map((item) => item.id === post.id ? toPost(created as PostDto) : item),
            ),
          ).catch(console.error)
        } else if (old !== post) {
          api.posts.update(post.id, toPostPayload(post)).then((saved) =>
            setPostsState((current) =>
              current.map((item) => item.id === post.id ? toPost(saved as PostDto) : item),
            ),
          ).catch(console.error)
        }
      }
      return next
    })
  }

  return { posts, setPosts }
}
