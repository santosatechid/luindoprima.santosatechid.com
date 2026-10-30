-- Master kategori item: kode prefix + nomor urut untuk kode item otomatis.
CREATE TABLE "item_category" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "item_category_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "item_category_code_key" ON "item_category"("code");
CREATE UNIQUE INDEX "item_category_name_key" ON "item_category"("name");

-- Backfill dari kategori lama. Prefix diambil dari kode item yang sudah ada
-- (FILM-001 → FILM) dan lastNumber dari nomor terbesar, jadi item baru
-- melanjutkan penomoran yang sudah dipakai.
WITH grouped AS (
    SELECT
        "category" AS name,
        UPPER(split_part(MIN("code"), '-', 1)) AS prefix,
        COALESCE(
            MAX(
                CASE
                    WHEN "code" ~ '^[A-Za-z]+-[0-9]+$'
                    THEN split_part("code", '-', 2)::int
                END
            ),
            0
        ) AS last_number
    FROM "item"
    GROUP BY "category"
),
uniqued AS (
    SELECT
        name,
        last_number,
        CASE
            WHEN row_number() OVER (PARTITION BY prefix ORDER BY name) = 1
            THEN prefix
            ELSE prefix || '-' || row_number() OVER (PARTITION BY prefix ORDER BY name)
        END AS code
    FROM grouped
)
INSERT INTO "item_category" ("id", "code", "name", "lastNumber", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), code, name, last_number, CURRENT_TIMESTAMP
FROM uniqued;

ALTER TABLE "item" ADD COLUMN "categoryId" TEXT;

UPDATE "item" i
SET "categoryId" = c."id"
FROM "item_category" c
WHERE c."name" = i."category";

ALTER TABLE "item" ALTER COLUMN "categoryId" SET NOT NULL;
ALTER TABLE "item" DROP COLUMN "category";

CREATE INDEX "item_categoryId_idx" ON "item"("categoryId");

ALTER TABLE "item" ADD CONSTRAINT "item_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "item_category"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
