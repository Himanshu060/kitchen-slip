-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KitchenItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "typicalPrice" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "KitchenItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorNickname" (
    "id" TEXT NOT NULL,
    "rawName" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "kitchenItemId" TEXT NOT NULL,
    "timesUsed" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "VendorNickname_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillDraft" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'reading',
    "vendorId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "extracted" JSONB,
    "draft" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "billDraftId" TEXT NOT NULL,
    "slipNo" TEXT,
    "slipDate" TEXT,
    "total" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderLine" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "kitchenItemId" TEXT,
    "nameOnSlip" TEXT NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "OrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KitchenItem_name_key" ON "KitchenItem"("name");

-- CreateIndex
CREATE UNIQUE INDEX "VendorNickname_rawName_vendorId_key" ON "VendorNickname"("rawName", "vendorId");

-- CreateIndex
CREATE INDEX "BillDraft_status_idx" ON "BillDraft"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Order_billDraftId_key" ON "Order"("billDraftId");

-- AddForeignKey
ALTER TABLE "VendorNickname" ADD CONSTRAINT "VendorNickname_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorNickname" ADD CONSTRAINT "VendorNickname_kitchenItemId_fkey" FOREIGN KEY ("kitchenItemId") REFERENCES "KitchenItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillDraft" ADD CONSTRAINT "BillDraft_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_billDraftId_fkey" FOREIGN KEY ("billDraftId") REFERENCES "BillDraft"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_kitchenItemId_fkey" FOREIGN KEY ("kitchenItemId") REFERENCES "KitchenItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
