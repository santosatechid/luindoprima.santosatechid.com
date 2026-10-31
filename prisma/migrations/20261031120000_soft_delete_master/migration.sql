-- Soft delete untuk master data: item, supplier, item_category.
ALTER TABLE "item" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "supplier" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "item_category" ADD COLUMN "deletedAt" TIMESTAMP(3);
