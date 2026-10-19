-- AlterTable
ALTER TABLE "StockQuoteCache" ADD COLUMN "marketTime" DATETIME;
ALTER TABLE "StockQuoteCache" ADD COLUMN "name" TEXT;

-- CreateTable
CREATE TABLE "Setting" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "openingBalance" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Subscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "interval" TEXT NOT NULL DEFAULT 'MONTHLY',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "billingDay" INTEGER NOT NULL DEFAULT 1,
    "note" TEXT,
    "categoryId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Subscription_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Subscription" ("amount", "categoryId", "createdAt", "id", "interval", "isActive", "startDate", "title", "updatedAt") SELECT "amount", "categoryId", "createdAt", "id", "interval", "isActive", coalesce("startDate", CURRENT_TIMESTAMP) AS "startDate", "title", "updatedAt" FROM "Subscription";
DROP TABLE "Subscription";
ALTER TABLE "new_Subscription" RENAME TO "Subscription";
CREATE INDEX "Subscription_categoryId_idx" ON "Subscription"("categoryId");
CREATE TABLE "new_Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "amount" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "note" TEXT,
    "categoryId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transaction_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Transaction" ("amount", "categoryId", "createdAt", "date", "id", "note", "type", "updatedAt") SELECT "amount", "categoryId", "createdAt", "date", "id", "note", "type", "updatedAt" FROM "Transaction";
DROP TABLE "Transaction";
ALTER TABLE "new_Transaction" RENAME TO "Transaction";
CREATE INDEX "Transaction_date_idx" ON "Transaction"("date");
CREATE INDEX "Transaction_categoryId_idx" ON "Transaction"("categoryId");
CREATE UNIQUE INDEX "Transaction_subscriptionId_date_key" ON "Transaction"("subscriptionId", "date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
