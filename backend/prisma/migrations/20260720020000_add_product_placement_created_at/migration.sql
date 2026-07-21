ALTER TABLE "ProductPlacement"
ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "ProductPlacement"
SET "createdAt" = "Product"."createdAt"
FROM "Product"
WHERE "ProductPlacement"."productId" = "Product"."id";
