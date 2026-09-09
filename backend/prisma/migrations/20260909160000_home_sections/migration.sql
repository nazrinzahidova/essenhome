CREATE TABLE IF NOT EXISTS "HomeSection" (
 "id" SERIAL PRIMARY KEY,
 "name" VARCHAR(120) NOT NULL,
 "active" BOOLEAN NOT NULL DEFAULT true,
 "position" INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS "HomeSectionProduct" (
 "sectionId" INTEGER NOT NULL REFERENCES "HomeSection"("id") ON DELETE CASCADE,
 "productId" INTEGER NOT NULL REFERENCES "Product"("id") ON DELETE CASCADE,
 PRIMARY KEY ("sectionId", "productId")
);
CREATE INDEX IF NOT EXISTS "HomeSection_position_id_idx" ON "HomeSection"("position", "id");
CREATE INDEX IF NOT EXISTS "HomeSectionProduct_productId_idx" ON "HomeSectionProduct"("productId");
