ALTER TABLE "User"
ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "PasswordResetCode"
ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "resetTokenHash" TEXT,
ADD COLUMN "resetTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN "resetUsedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "PasswordResetCode_resetTokenHash_key"
ON "PasswordResetCode"("resetTokenHash");
