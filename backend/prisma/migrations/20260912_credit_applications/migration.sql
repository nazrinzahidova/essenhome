CREATE TABLE IF NOT EXISTS "CreditApplication" (
  "id" TEXT PRIMARY KEY,
  "requestKey" TEXT NOT NULL UNIQUE,
  "requestHash" TEXT NOT NULL,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "fatherName" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "fin" TEXT NOT NULL,
  "hasSima" BOOLEAN NOT NULL,
  "items" JSONB NOT NULL,
  "total" DOUBLE PRECISION NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'new',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "CreditApplication_createdAt_idx" ON "CreditApplication"("createdAt");
ALTER TABLE "CreditApplication" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "CreditApplication" FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN REVOKE ALL ON "CreditApplication" FROM anon; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN REVOKE ALL ON "CreditApplication" FROM authenticated; END IF;
END $$;
