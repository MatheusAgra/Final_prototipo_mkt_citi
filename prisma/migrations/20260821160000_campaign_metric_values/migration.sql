CREATE TABLE "CampaignMetricValue" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "dailyMetricId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "CampaignMetricValue_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CampaignMetricValue_dailyMetricId_nome_key" ON "CampaignMetricValue"("dailyMetricId", "nome");

ALTER TABLE "CampaignMetricValue" ADD CONSTRAINT "CampaignMetricValue_dailyMetricId_fkey" FOREIGN KEY ("dailyMetricId") REFERENCES "CampaignDailyMetric"("id") ON DELETE CASCADE ON UPDATE CASCADE;
