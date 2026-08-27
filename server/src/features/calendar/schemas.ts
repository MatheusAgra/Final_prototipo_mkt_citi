import { z } from "zod"
import { httpsUrlSchema } from "../../security/url.js"

export const eventBody = z.object({
  titulo: z.string().trim().min(1),
  data: z.coerce.date(),
  horario: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  horarioFim: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .nullable()
    .optional(),
  tipo: z.enum(["REUNIAO", "DEADLINE", "TASK"]),
  canal: z
    .enum(["INSTAGRAM", "LINKEDIN", "SITE", "EMAIL"])
    .nullable()
    .optional(),
  formatoLocal: z.enum(["MEET", "PRESENCIAL"]).nullable().optional(),
  sala: z.string().trim().min(1).nullable().optional(),
  linkMeet: httpsUrlSchema.nullable().optional(),
  participantIds: z.array(z.string().uuid()).default([]),
})

export function normalizeSala<T extends {
  formatoLocal?: "MEET" | "PRESENCIAL" | null
  sala?: string | null
  linkMeet?: string | null
},>(body: T): T {
  return {
    ...body,
    sala: body.formatoLocal === "PRESENCIAL" ? (body.sala ?? null) : null,
    linkMeet: body.formatoLocal === "MEET" ? (body.linkMeet ?? null) : null,
  }
}
