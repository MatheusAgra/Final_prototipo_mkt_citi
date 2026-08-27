import { z } from "zod"

const assignment = z.object({ userId: z.string().uuid(), nota: z.number().min(0).max(5).nullable().optional() })
const taskFields = z.object({ titulo: z.string().trim().min(1), redeSocial: z.enum(["INSTAGRAM", "LINKEDIN", "SITE", "EMAIL"]), dificuldade: z.enum(["FACIL", "MEDIO", "DIFICIL"]), dataInicio: z.coerce.date().nullable().optional(), dataEntrega: z.coerce.date().nullable().optional(), colunaId: z.string().uuid(), responsaveis: z.array(assignment).default([]) })
const validDates = (value: { dataInicio?: Date | null; dataEntrega?: Date | null }) => !value.dataInicio || !value.dataEntrega || value.dataEntrega >= value.dataInicio
export const taskBody = taskFields.refine(validDates, { message: "O prazo deve ser igual ou posterior à data de início", path: ["dataEntrega"] })
export const taskPatch = taskFields.partial().refine(validDates, { message: "O prazo deve ser igual ou posterior à data de início", path: ["dataEntrega"] })
