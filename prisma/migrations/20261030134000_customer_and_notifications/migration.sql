-- Customer master: promoted from the free-text request.customer column.
CREATE TABLE "customer" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "contact" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "note" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "customer_code_key" ON "customer"("code");
CREATE INDEX "customer_name_idx" ON "customer"("name");

-- Preserve every distinct customer name that already exists.
INSERT INTO "customer" ("id", "code", "name", "createdAt", "updatedAt")
SELECT
    'cust_' || substr(md5(random()::text || clock_timestamp()::text), 1, 20),
    'CUST-' || lpad(row_number() OVER (ORDER BY lower(trim("customer")))::text, 4, '0'),
    trim("customer"),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM (SELECT DISTINCT trim("customer") AS "customer" FROM "request" WHERE "customer" IS NOT NULL AND trim("customer") <> '') AS legacy;

ALTER TABLE "request" ADD COLUMN "poNo" TEXT;
ALTER TABLE "request" ADD COLUMN "customerId" TEXT;

UPDATE "request" AS r
SET "customerId" = c."id"
FROM "customer" AS c
WHERE r."customer" IS NOT NULL AND trim(r."customer") = c."name";

ALTER TABLE "request" DROP COLUMN "customer";
CREATE INDEX "request_customerId_idx" ON "request"("customerId");
ALTER TABLE "request" ADD CONSTRAINT "request_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Employee numbers for existing accounts, oldest first.
ALTER TABLE "user" ADD COLUMN "employeeNo" TEXT;
ALTER TABLE "user" ADD COLUMN "phone" TEXT;

WITH numbered AS (
    SELECT "id", row_number() OVER (ORDER BY "createdAt", "id") AS rn FROM "user"
)
UPDATE "user" AS u
SET "employeeNo" = 'USR-' || lpad(numbered.rn::text, 4, '0')
FROM numbered
WHERE u."id" = numbered."id";

CREATE UNIQUE INDEX "user_employeeNo_key" ON "user"("employeeNo");

CREATE TABLE "notification" (
    "id" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'WHATSAPP',
    "target" TEXT NOT NULL,
    "targetName" TEXT,
    "role" TEXT,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "entity" TEXT,
    "entityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notification_createdAt_idx" ON "notification"("createdAt");
CREATE INDEX "notification_entity_entityId_idx" ON "notification"("entity", "entityId");
