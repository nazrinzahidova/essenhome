-- Existing user and campaign values stay unchanged. PostgreSQL unique indexes
-- continue protecting supplied values while allowing multiple absent values.
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "CampaignEntry" ALTER COLUMN "finHash" DROP NOT NULL;
ALTER TABLE "CampaignEntry" ALTER COLUMN "finMasked" DROP NOT NULL;

CREATE OR REPLACE FUNCTION protect_campaign_entry() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM "value" FROM "CampaignCounter" WHERE "id"=1 FOR UPDATE;
    INSERT INTO "CampaignRetiredNumber" ("number") VALUES (OLD."number") ON CONFLICT DO NOTHING;
    RETURN OLD;
  END IF;
  IF NEW."number" IS DISTINCT FROM OLD."number" OR NEW."finHash" IS DISTINCT FROM OLD."finHash" OR NEW."campaignId" IS DISTINCT FROM OLD."campaignId" OR NEW."scanId" IS DISTINCT FROM OLD."scanId" OR NEW."finMasked" IS DISTINCT FROM OLD."finMasked" OR NEW."finEncrypted" IS DISTINCT FROM OLD."finEncrypted" OR (NEW."userId" IS DISTINCT FROM OLD."userId" AND NEW."userId" IS NOT NULL) THEN
    RAISE EXCEPTION 'Campaign identity is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
