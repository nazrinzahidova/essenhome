CREATE TABLE IF NOT EXISTS "Vacancy" (
  "id" SERIAL PRIMARY KEY,
  "title" VARCHAR(160) NOT NULL,
  "department" VARCHAR(120) NOT NULL DEFAULT '',
  "location" VARCHAR(160) NOT NULL DEFAULT '',
  "employmentType" VARCHAR(80) NOT NULL DEFAULT '',
  "salary" VARCHAR(120) NOT NULL DEFAULT '',
  "description" TEXT NOT NULL DEFAULT '',
  "requirements" TEXT NOT NULL DEFAULT '',
  "benefits" TEXT NOT NULL DEFAULT '',
  "contactEmail" VARCHAR(254) NOT NULL DEFAULT '',
  "contactPhone" VARCHAR(20) NOT NULL DEFAULT '',
  "status" VARCHAR(12) NOT NULL DEFAULT 'draft' CHECK ("status" IN ('draft', 'published', 'closed', 'archived')),
  "position" INTEGER NOT NULL DEFAULT 1000 CHECK ("position" >= 0 AND "position" <= 100000),
  "deadline" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "Vacancy_status_position_id_idx" ON "Vacancy"("status", "position", "id");
ALTER TABLE "Vacancy" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "Vacancy" FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON "Vacancy" FROM anon; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON "Vacancy" FROM authenticated; END IF;
END $$;
