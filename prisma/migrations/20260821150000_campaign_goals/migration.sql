-- CreateTable
CREATE TABLE "CampaignGoal" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "mostrarGrafico" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CampaignGoal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CampaignGoal_campaignId_idx" ON "CampaignGoal"("campaignId");

-- AddForeignKey
ALTER TABLE "CampaignGoal" ADD CONSTRAINT "CampaignGoal_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migra metas existentes (alcanceMeta/interacoesMeta) para o novo formato livre, preservando dados
INSERT INTO "CampaignGoal" ("id", "campaignId", "nome", "valor", "mostrarGrafico", "ordem")
SELECT gen_random_uuid(), "id", 'Alcance', "alcanceMeta", "alcanceMetaGrafico", 0
FROM "Campaign" WHERE "alcanceMeta" > 0;

INSERT INTO "CampaignGoal" ("id", "campaignId", "nome", "valor", "mostrarGrafico", "ordem")
SELECT gen_random_uuid(), "id", 'Interações', "interacoesMeta", "interacoesMetaGrafico", 1
FROM "Campaign" WHERE "interacoesMeta" > 0;

-- AlterTable
ALTER TABLE "Campaign" DROP COLUMN "alcanceMeta";
ALTER TABLE "Campaign" DROP COLUMN "interacoesMeta";
ALTER TABLE "Campaign" DROP COLUMN "alcanceMetaGrafico";
ALTER TABLE "Campaign" DROP COLUMN "interacoesMetaGrafico";
