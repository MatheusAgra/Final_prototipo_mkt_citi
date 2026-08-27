import { rateLimit } from "express-rate-limit"
import { config } from "../config.js"

const windowMs = config.RATE_LIMIT_WINDOW_MINUTES * 60_000
const makeLimiter = (max: number, code: string) =>
  rateLimit({
    windowMs,
    limit: max,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skip: () => config.NODE_ENV === "test",
    handler: (_req, res) => res.status(429).json({
        error: {
          code,
          message: "Muitas tentativas. Aguarde antes de tentar novamente.",
        },
      }),
  })

export const generalLimiter = makeLimiter(
  config.RATE_LIMIT_GENERAL_MAX,
  "RATE_LIMITED",
)
export const loginLimiter = makeLimiter(
  config.RATE_LIMIT_LOGIN_MAX,
  "LOGIN_RATE_LIMITED",
)
export const resetLimiter = makeLimiter(
  config.RATE_LIMIT_RESET_MAX,
  "RESET_RATE_LIMITED",
)
export const uploadLimiter = makeLimiter(
  config.RATE_LIMIT_UPLOAD_MAX,
  "UPLOAD_RATE_LIMITED",
)
