-- Leader's "job number" is the customer PO number; keep the old values.
UPDATE "request" SET "poNo" = "jobNo" WHERE "poNo" IS NULL;

ALTER TABLE "request" ALTER COLUMN "poNo" SET NOT NULL;
ALTER TABLE "request" DROP COLUMN "jobNo";
