-- Jumlah stok yang sudah dijanjikan ke request terbuka (belum keluar gudang).
ALTER TABLE "item" ADD COLUMN "onRequest" INTEGER NOT NULL DEFAULT 0;

-- Backfill dari request yang masih terbuka dan belum keluar gudang.
-- Request dengan surat jalan CONFIRMED/COMPLETED sudah mengurangi stok gudang,
-- jadi tidak boleh dihitung lagi sebagai reservasi.
UPDATE "item" i
SET "onRequest" = COALESCE(
    (
        SELECT SUM(ri."qty")
        FROM "request_item" ri
        JOIN "request" r ON r."id" = ri."requestId"
        LEFT JOIN "delivery_note" dn ON dn."requestId" = r."id"
        WHERE ri."itemId" = i."id"
          AND r."status" IN ('PENDING_ADMIN', 'PENDING_DIRECTOR', 'APPROVED')
          AND (dn."id" IS NULL OR dn."status" = 'ISSUED')
    ),
    0
);
