CREATE TABLE IF NOT EXISTS "PopularCategory" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(160) NOT NULL,
  "category" VARCHAR(160) NOT NULL,
  "subcategory" VARCHAR(160) NOT NULL DEFAULT '',
  "image" TEXT,
  "imageData" BYTEA,
  "imageMime" TEXT,
  "position" INTEGER NOT NULL DEFAULT 1000,
  "active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "PopularCategory_category_subcategory_key" UNIQUE ("category","subcategory")
);
CREATE INDEX IF NOT EXISTS "PopularCategory_active_position_id_idx" ON "PopularCategory"("active","position","id");
ALTER TABLE "PopularCategory" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "PopularCategory" FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN REVOKE ALL ON "PopularCategory" FROM anon; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN REVOKE ALL ON "PopularCategory" FROM authenticated; END IF;
END $$;
