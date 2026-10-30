import type { Prisma } from "@/prisma/generated/client";

export type StockChange = { itemId: string; qty: number };

export class InsufficientStockError extends Error {}

/**
 * Tambah reservasi secara atomik. WHERE ikut memeriksa sisa stok supaya dua
 * request bersamaan tidak bisa memesan melebihi stok gudang.
 */
async function reserveOne(tx: Prisma.TransactionClient, change: StockChange) {
  const updated = await tx.$executeRaw`
    UPDATE "item"
    SET "onRequest" = "onRequest" + ${change.qty}, "updatedAt" = NOW()
    WHERE "id" = ${change.itemId}
      AND "stockGudang" - "onRequest" >= ${change.qty}
  `;
  if (updated > 0) return;

  const item = await tx.item.findUnique({
    where: { id: change.itemId },
    select: { name: true, unit: true, stockGudang: true, onRequest: true },
  });
  const available = item ? item.stockGudang - item.onRequest : 0;
  throw new InsufficientStockError(
    `Stok ${item?.name ?? "item"} tidak cukup. Tersedia ${available} ${item?.unit ?? "unit"}, diminta ${change.qty}.`,
  );
}

async function releaseOne(tx: Prisma.TransactionClient, change: StockChange) {
  await tx.$executeRaw`
    UPDATE "item"
    SET "onRequest" = GREATEST("onRequest" - ${change.qty}, 0), "updatedAt" = NOW()
    WHERE "id" = ${change.itemId}
  `;
}

/** qty positif = pesan tambahan, negatif = lepas reservasi. */
export async function adjustReservation(
  tx: Prisma.TransactionClient,
  changes: StockChange[],
) {
  for (const change of changes) {
    if (change.qty > 0) await reserveOne(tx, change);
    else if (change.qty < 0)
      await releaseOne(tx, { ...change, qty: -change.qty });
  }
}

export async function releaseStock(
  tx: Prisma.TransactionClient,
  changes: StockChange[],
) {
  for (const change of changes) {
    if (change.qty > 0) await releaseOne(tx, change);
  }
}
