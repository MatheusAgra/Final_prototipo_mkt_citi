import { google } from "googleapis"
import { randomUUID } from "node:crypto"
import { config } from "./config.js"

const TIME_ZONE = "America/Sao_Paulo"

function addMinutes(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(":").map(Number)
  const total = (h * 60 + m + minutes + 1440) % 1440
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`
}

interface GoogleEventInput {
  titulo: string
  dataISO: string // YYYY-MM-DD
  horario: string // HH:MM
  horarioFim?: string | null
  attendeeEmails: string[]
  location?: string
  // Quando true, pede ao Google para gerar uma sala de Meet de verdade (com conferenceData), em vez de
  // só colocar um link como texto em "location" — só assim o Calendar renderiza o botão nativo "Entrar
  // com o Google Meet" em vez do link cru. Um link colado manualmente pelo usuário nunca ganha esse
  // botão: o Google só permite o visual nativo para conferências que ele mesmo criou.
  autoGenerateMeet?: boolean
}

function toRequestBody(input: GoogleEventInput) {
  const endTime = input.horarioFim ?? addMinutes(input.horario, 30)
  return {
    summary: input.titulo,
    location: input.autoGenerateMeet ? undefined : input.location,
    start: {
      dateTime: `${input.dataISO}T${input.horario}:00`,
      timeZone: TIME_ZONE,
    },
    end: { dateTime: `${input.dataISO}T${endTime}:00`, timeZone: TIME_ZONE },
    attendees: input.attendeeEmails.map((email) => ({ email })),
    ...(input.autoGenerateMeet
      ? {
          conferenceData: {
            createRequest: {
              requestId: randomUUID(),
              conferenceSolutionKey: { type: "hangoutsMeet" },
            },
          },
        }
      : {}),
  }
}

function calendarClientFor(refreshToken: string) {
  const oauth2Client = new google.auth.OAuth2(
    config.GMAIL_CLIENT_ID,
    config.GMAIL_CLIENT_SECRET,
  )
  oauth2Client.setCredentials({ refresh_token: refreshToken })
  return google.calendar({ version: "v3", auth: oauth2Client })
}

function extractMeetLink(data: {
  hangoutLink?: string | null
  conferenceData?: {
    entryPoints?: {
      entryPointType?: string | null
      uri?: string | null
    }[] | null
  } | null
}): string | null {
  return (
    data.conferenceData?.entryPoints?.find(
      (entry) => entry.entryPointType === "video",
    )?.uri ??
    data.hangoutLink ??
    null
  )
}

export interface GoogleEventResult {
  id: string | null
  meetLink: string | null
}

export async function createGoogleEvent(
  refreshToken: string,
  input: GoogleEventInput,
): Promise<GoogleEventResult> {
  try {
    const res = await calendarClientFor(refreshToken).events.insert({
      calendarId: "primary",
      sendUpdates: "all",
      requestBody: toRequestBody(input),
      conferenceDataVersion: input.autoGenerateMeet ? 1 : undefined,
    })
    return { id: res.data.id ?? null, meetLink: extractMeetLink(res.data) }
  } catch (error) {
    console.error(
      "[calendar-google] Falha ao criar evento no Google Calendar:",
      error instanceof Error ? error.message : error,
    )
    return { id: null, meetLink: null }
  }
}

export async function updateGoogleEvent(
  refreshToken: string,
  googleEventId: string,
  input: GoogleEventInput,
): Promise<GoogleEventResult> {
  try {
    // events.patch (não events.update) — update substitui o recurso inteiro e apagaria a conferência de
    // Meet já gerada sempre que o evento fosse editado sem mexer no local; patch só toca o que é enviado.
    const res = await calendarClientFor(refreshToken).events.patch({
      calendarId: "primary",
      eventId: googleEventId,
      sendUpdates: "all",
      requestBody: toRequestBody(input),
      conferenceDataVersion: input.autoGenerateMeet ? 1 : undefined,
    })
    return {
      id: res.data.id ?? googleEventId,
      meetLink: extractMeetLink(res.data),
    }
  } catch (error) {
    console.error(
      "[calendar-google] Falha ao atualizar evento no Google Calendar:",
      error instanceof Error ? error.message : error,
    )
    return { id: null, meetLink: null }
  }
}

export async function deleteGoogleEvent(
  refreshToken: string,
  googleEventId: string,
): Promise<void> {
  try {
    await calendarClientFor(refreshToken).events.delete({
      calendarId: "primary",
      eventId: googleEventId,
      sendUpdates: "all",
    })
  } catch (error) {
    console.error(
      "[calendar-google] Falha ao apagar evento no Google Calendar:",
      error instanceof Error ? error.message : error,
    )
  }
}
