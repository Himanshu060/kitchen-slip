-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "KitchenItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "typicalPrice" REAL NOT NULL
);

-- CreateTable
CREATE TABLE "VendorNickname" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rawName" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "kitchenItemId" TEXT NOT NULL,
    "timesUsed" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "VendorNickname_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "VendorNickname_kitchenItemId_fkey" FOREIGN KEY ("kitchenItemId") REFERENCES "KitchenItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BillDraft" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'reading',
    "vendorId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "extracted" JSONB,
    "draft" JSONB,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BillDraft_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vendorId" TEXT NOT NULL,
    "billDraftId" TEXT NOT NULL,
    "slipNo" TEXT,
    "slipDate" TEXT,
    "total" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Order_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_billDraftId_fkey" FOREIGN KEY ("billDraftId") REFERENCES "BillDraft" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OrderLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "kitchenItemId" TEXT,
    "nameOnSlip" TEXT NOT NULL,
    "qty" REAL NOT NULL,
    "unit" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "amount" REAL NOT NULL,
    CONSTRAINT "OrderLine_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderLine_kitchenItemId_fkey" FOREIGN KEY ("kitchenItemId") REFERENCES "KitchenItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "KitchenItem_name_key" ON "KitchenItem"("name");

-- CreateIndex
CREATE UNIQUE INDEX "VendorNickname_rawName_vendorId_key" ON "VendorNickname"("rawName", "vendorId");

-- CreateIndex
CREATE INDEX "BillDraft_status_idx" ON "BillDraft"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Order_billDraftId_key" ON "Order"("billDraftId");
