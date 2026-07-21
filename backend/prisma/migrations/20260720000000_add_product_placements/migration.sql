CREATE TABLE "ProductPlacement" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,

    CONSTRAINT "ProductPlacement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductPlacement_productId_category_subcategory_key"
ON "ProductPlacement"("productId", "category", "subcategory");

CREATE INDEX "ProductPlacement_category_subcategory_idx"
ON "ProductPlacement"("category", "subcategory");

ALTER TABLE "ProductPlacement"
ADD CONSTRAINT "ProductPlacement_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "ProductPlacement" ("productId", "category", "subcategory")
SELECT "id", "category", "subcategory"
FROM "Product";
