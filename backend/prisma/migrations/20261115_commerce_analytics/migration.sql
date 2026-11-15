CREATE TABLE IF NOT EXISTS "AnalyticsCommerceStart" (
  id INTEGER PRIMARY KEY CHECK(id=1), "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "AnalyticsCommerceStart" (id) VALUES(1) ON CONFLICT(id) DO NOTHING;
CREATE TABLE IF NOT EXISTS "AnalyticsEvent" (
  id UUID PRIMARY KEY,
  kind VARCHAR(32) NOT NULL CHECK(kind IN ('add_to_cart','begin_checkout','whatsapp_click')),
  "visitorHash" VARCHAR(64) NOT NULL,
  "sessionHash" VARCHAR(64) NOT NULL,
  "productId" INTEGER,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK(quantity BETWEEN 0 AND 20),
  source VARCHAR(24) NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "AnalyticsEvent_date_idx" ON "AnalyticsEvent" ("createdAt");
CREATE INDEX IF NOT EXISTS "AnalyticsEvent_product_date_idx" ON "AnalyticsEvent" ("productId","createdAt");
CREATE INDEX IF NOT EXISTS "Order_analytics_created_idx" ON "Order" ("createdAt");
CREATE INDEX IF NOT EXISTS "Order_analytics_delivered_idx" ON "Order" ("deliveredAt") WHERE status='delivered';
