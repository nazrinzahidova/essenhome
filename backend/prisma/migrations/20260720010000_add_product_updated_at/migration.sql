ALTER TABLE "Product"
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "Product"
SET "updatedAt" = "createdAt";

UPDATE "Product"
SET "updatedAt" = CURRENT_TIMESTAMP
WHERE (
  SELECT COUNT(*)
  FROM "ProductPlacement"
  WHERE "ProductPlacement"."productId" = "Product"."id"
) > 1;
