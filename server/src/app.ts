import express from "express"
import cors from "cors"
import { config } from "./config.js"
import { errorHandler } from "./http.js"
import { authRouter } from "./features/auth/router.js"
import { usersRouter } from "./features/users/router.js"
import { kanbanRouter } from "./features/kanban/router.js"
import { calendarRouter } from "./features/calendar/router.js"
import { campaignsRouter } from "./features/campaigns/router.js"
import { engagementRouter } from "./features/engagement/router.js"
import { libraryRouter } from "./features/library/router.js"
import { metricsRouter } from "./features/metrics/router.js"
import { googleRouter } from "./features/google/router.js"
import { filesRouter } from "./files.js"
import {
  generalLimiter,
  loginLimiter,
  resetLimiter,
  uploadLimiter,
} from "./security/rate-limit.js"

export const app = express()
app.disable("x-powered-by")
if (config.TRUST_PROXY !== false) app.set("trust proxy", config.TRUST_PROXY)
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff")
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin")
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  )
  res.setHeader("X-Frame-Options", "DENY")
  next()
})
app.use(
  cors({
    origin: config.CORS_ORIGIN.split(",").map((origin) => origin.trim()),
    credentials: false,
  }),
)
app.use("/api", generalLimiter)
app.use("/api/v1/auth/login", loginLimiter)
app.use("/api/v1/auth/forgot-password", resetLimiter)
app.use("/api/v1/auth/verify-code", resetLimiter)
app.use("/api/v1/auth/reset-password", resetLimiter)
app.use("/api/v1/library/posts/upload", uploadLimiter)
app.use("/api/v1/library/materials/upload", uploadLimiter)
app.use(express.json({ limit: "2mb" }))
app.get("/health", (_req, res) => res.json({ ok: true }))
app.use("/api/v1/auth", authRouter)
app.use("/api/v1/files", filesRouter)
app.use("/api/v1/users", usersRouter)
app.use("/api/v1/kanban", kanbanRouter)
app.use("/api/v1/calendar", calendarRouter)
app.use("/api/v1/campaigns", campaignsRouter)
app.use("/api/v1/engagement", engagementRouter)
app.use("/api/v1/library", libraryRouter)
app.use("/api/v1/metrics", metricsRouter)
app.use("/api/v1/google", googleRouter)
app.use((_req, res) =>
  res
    .status(404)
    .json({ error: { code: "NOT_FOUND", message: "Rota não encontrada" } }),
)
app.use(errorHandler)
