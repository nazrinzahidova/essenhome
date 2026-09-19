-- Legacy FIN hashes cannot be reversed. Only new registrations have encrypted FINs.
ALTER TABLE "CampaignEntry" ADD COLUMN "finEncrypted" TEXT;

CREATE TABLE "CampaignRetiredNumber" (
  "number" BIGINT PRIMARY KEY,
  "retiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE OR REPLACE FUNCTION protect_campaign_entry() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM "value" FROM "CampaignCounter" WHERE "id"=1 FOR UPDATE;
    INSERT INTO "CampaignRetiredNumber" ("number") VALUES (OLD."number") ON CONFLICT DO NOTHING;
    RETURN OLD;
  END IF;
  IF NEW."number" <> OLD."number" OR NEW."finHash" <> OLD."finHash" OR NEW."campaignId" <> OLD."campaignId" OR NEW."scanId" <> OLD."scanId" OR NEW."finMasked" <> OLD."finMasked" OR NEW."finEncrypted" IS DISTINCT FROM OLD."finEncrypted" OR (NEW."userId" IS DISTINCT FROM OLD."userId" AND NEW."userId" IS NOT NULL) THEN
    RAISE EXCEPTION 'Campaign identity is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE FUNCTION prevent_retired_campaign_number() RETURNS trigger AS $$
BEGIN
  PERFORM "value" FROM "CampaignCounter" WHERE "id"=1 FOR UPDATE;
  IF EXISTS (SELECT 1 FROM "CampaignRetiredNumber" WHERE "number"=NEW."number") THEN
    RAISE EXCEPTION 'Retired campaign numbers cannot be reused';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "CampaignEntry_retired" BEFORE INSERT ON "CampaignEntry" FOR EACH ROW EXECUTE FUNCTION prevent_retired_campaign_number();
