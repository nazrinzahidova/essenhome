CREATE TABLE "Campaign" (
  "id" SERIAL PRIMARY KEY, "name" TEXT NOT NULL, "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "QrSource" (
  "id" TEXT PRIMARY KEY, "campaignId" INTEGER NOT NULL REFERENCES "Campaign"("id"),
  "name" TEXT NOT NULL, "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "QrScan" (
  "id" TEXT PRIMARY KEY, "sourceId" TEXT NOT NULL REFERENCES "QrSource"("id"),
  "visitId" TEXT NOT NULL, "userId" INTEGER REFERENCES "User"("id") ON DELETE SET NULL,
  "device" TEXT NOT NULL, "browser" TEXT NOT NULL, "os" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'scanned' CHECK ("status" IN ('scanned','registered','activated')),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("sourceId", "visitId")
);
CREATE INDEX "QrScan_sourceId_createdAt_idx" ON "QrScan"("sourceId", "createdAt");
CREATE INDEX "QrScan_userId_idx" ON "QrScan"("userId");
CREATE TABLE "CampaignCounter" ("id" INTEGER PRIMARY KEY CHECK ("id" = 1), "value" BIGINT NOT NULL DEFAULT 0);
INSERT INTO "CampaignCounter" ("id", "value") VALUES (1,0);
CREATE TABLE "CampaignConfig" ("id" INTEGER PRIMARY KEY CHECK ("id" = 1), "keyFingerprint" TEXT NOT NULL);
CREATE TABLE "CampaignEntry" (
  "id" SERIAL PRIMARY KEY, "campaignId" INTEGER NOT NULL REFERENCES "Campaign"("id"),
  "userId" INTEGER REFERENCES "User"("id") ON DELETE SET NULL,
  "scanId" TEXT NOT NULL UNIQUE REFERENCES "QrScan"("id"),
  "finHash" TEXT NOT NULL CHECK ("finHash" ~ '^[a-f0-9]{64}$'),
  "finMasked" TEXT NOT NULL CHECK ("finMasked" ~ '^\*{5}[A-HJ-NP-Z0-9]{2}$'),
  "number" BIGINT NOT NULL UNIQUE CHECK ("number" > 0),
  "status" TEXT NOT NULL DEFAULT 'active' CHECK ("status" IN ('active','cancelled')),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("campaignId", "finHash"), UNIQUE ("campaignId", "userId")
);
CREATE INDEX "CampaignEntry_campaignId_createdAt_idx" ON "CampaignEntry"("campaignId", "createdAt");
CREATE TABLE "CampaignRateLimit" ("key" TEXT PRIMARY KEY, "count" INTEGER NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL);
CREATE INDEX "CampaignRateLimit_expiresAt_idx" ON "CampaignRateLimit"("expiresAt");
-- Entries are permanent reservations. Cancellation never releases a FIN or number.
CREATE FUNCTION protect_campaign_entry() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Campaign entries must be cancelled, never deleted'; END IF;
  IF NEW."number" <> OLD."number" OR NEW."finHash" <> OLD."finHash" OR NEW."campaignId" <> OLD."campaignId" OR NEW."scanId" <> OLD."scanId" OR NEW."finMasked" <> OLD."finMasked" OR (NEW."userId" IS DISTINCT FROM OLD."userId" AND NEW."userId" IS NOT NULL) THEN
    RAISE EXCEPTION 'Campaign identity is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "CampaignEntry_protect" BEFORE UPDATE OR DELETE ON "CampaignEntry" FOR EACH ROW EXECUTE FUNCTION protect_campaign_entry();
