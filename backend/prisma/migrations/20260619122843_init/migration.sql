/*
  Warnings:

  - You are about to drop the column `shiftId` on the `CashMovement` table. All the data in the column will be lost.
  - You are about to drop the `Expense` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SalesReturn` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SalesReturnItem` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "CashMovement" DROP CONSTRAINT "CashMovement_shiftId_fkey";

-- DropForeignKey
ALTER TABLE "SalesReturn" DROP CONSTRAINT "SalesReturn_saleId_fkey";

-- DropForeignKey
ALTER TABLE "SalesReturnItem" DROP CONSTRAINT "SalesReturnItem_returnId_fkey";

-- AlterTable
ALTER TABLE "CashMovement" DROP COLUMN "shiftId";

-- DropTable
DROP TABLE "Expense";

-- DropTable
DROP TABLE "SalesReturn";

-- DropTable
DROP TABLE "SalesReturnItem";
