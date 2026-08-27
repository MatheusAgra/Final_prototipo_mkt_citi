import fs from "node:fs/promises"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { config } from "./config.js"

export type StorageCategory = "posts" | "materials"

const bucketByCategory: Record<StorageCategory, string> = {
  posts: "posts",
  materials: "materials",
}

let client: SupabaseClient | undefined

export function isStorageConfigured(): boolean {
  return Boolean(config.SUPABASE_URL && config.SUPABASE_SECRET_KEY)
}

function getStorageClient(): SupabaseClient {
  if (!config.SUPABASE_URL || !config.SUPABASE_SECRET_KEY)
    throw new Error("Supabase Storage não está configurado")
  return (client ??= createClient(
    config.SUPABASE_URL,
    config.SUPABASE_SECRET_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  ))
}

function bucket(category: StorageCategory) {
  return getStorageClient().storage.from(bucketByCategory[category])
}

export async function uploadStoredFile(
  category: StorageCategory,
  filename: string,
  localPath: string,
  contentType: string,
): Promise<void> {
  const file = await fs.readFile(localPath)
  const { error } = await bucket(category).upload(filename, file, {
    contentType,
    upsert: false,
  })
  if (error) throw new Error(`Falha ao enviar arquivo para o Storage: ${error.message}`)
}

export async function signedStorageUrl(
  category: StorageCategory,
  filename: string,
  options: { expiresIn: number; download?: boolean },
): Promise<string> {
  const { data, error } = await bucket(category).createSignedUrl(
    filename,
    options.expiresIn,
    options.download ? { download: filename } : undefined,
  )
  if (error || !data?.signedUrl)
    throw new Error(
      `Falha ao gerar URL assinada do Storage: ${error?.message ?? "URL ausente"}`,
    )
  return data.signedUrl
}
