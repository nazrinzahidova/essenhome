DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'CreditApplication' AND column_name = 'number') THEN
    LOCK TABLE "CreditApplication" IN ACCESS EXCLUSIVE MODE;
    CREATE SEQUENCE "CreditApplication_number_seq" START 1;
    ALTER TABLE "CreditApplication" ADD COLUMN "number" INTEGER;
    WITH numbered AS (SELECT id, row_number() OVER (ORDER BY "createdAt", id)::integer AS n FROM "CreditApplication")
    UPDATE "CreditApplication" c SET "number" = numbered.n FROM numbered WHERE c.id = numbered.id;
    PERFORM setval('"CreditApplication_number_seq"', COALESCE((SELECT MAX("number") FROM "CreditApplication"), 0) + 1, false);
    ALTER SEQUENCE "CreditApplication_number_seq" OWNED BY "CreditApplication"."number";
    ALTER TABLE "CreditApplication" ALTER COLUMN "number" SET DEFAULT nextval('"CreditApplication_number_seq"');
    ALTER TABLE "CreditApplication" ALTER COLUMN "number" SET NOT NULL;
    CREATE UNIQUE INDEX "CreditApplication_number_key" ON "CreditApplication"("number");
  END IF;
END $$;
