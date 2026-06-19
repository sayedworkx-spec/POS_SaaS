import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma.js";

async function main() {
  const adminPassword = await bcrypt.hash("admin123", 10);
  const cashierPassword = await bcrypt.hash("cashier123", 10);
  const warehousePassword = await bcrypt.hash("warehouse123", 10);

  await prisma.user.upsert({
    where: { email: "admin@demo.com" },
    update: {
      name: "Administrator",
      password: adminPassword,
      role: "admin",
      isActive: true,
    },
    create: {
      name: "Administrator",
      email: "admin@demo.com",
      password: adminPassword,
      role: "admin",
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { email: "cashier@demo.com" },
    update: {
      name: "Cashier",
      password: cashierPassword,
      role: "cashier",
      isActive: true,
    },
    create: {
      name: "Cashier",
      email: "cashier@demo.com",
      password: cashierPassword,
      role: "cashier",
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { email: "warehouse@demo.com" },
    update: {
      name: "Warehouse",
      password: warehousePassword,
      role: "warehouse",
      isActive: true,
    },
    create: {
      name: "Warehouse",
      email: "warehouse@demo.com",
      password: warehousePassword,
      role: "warehouse",
      isActive: true,
    },
  });

  const products = [
    {
      sku: "P001",
      barcode: "10000001",
      name: "T-Shirt Black",
      categoryId: 1,
      stock: 50,
      costPrice: 100,
      sellPrice: 180,
      reorderLevel: 10,
      isActive: true,
    },
    {
      sku: "P002",
      barcode: "10000002",
      name: "Jeans Blue",
      categoryId: 1,
      stock: 39,
      costPrice: 250,
      sellPrice: 400,
      reorderLevel: 10,
      isActive: true,
    },
    {
      sku: "P003",
      barcode: "10000003",
      name: "DG Shirt",
      categoryId: 1,
      stock: 5,
      costPrice: 150,
      sellPrice: 250,
      reorderLevel: 10,
      isActive: true,
    },
    {
      sku: "P004",
      barcode: "10000004",
      name: "Leather Belt",
      categoryId: 2,
      stock: 20,
      costPrice: 80,
      sellPrice: 150,
      reorderLevel: 8,
      isActive: true,
    },
    {
      sku: "P005",
      barcode: "10000005",
      name: "Sneakers White",
      categoryId: 3,
      stock: 12,
      costPrice: 500,
      sellPrice: 750,
      reorderLevel: 5,
      isActive: true,
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { sku: product.sku },
      update: product,
      create: product,
    });
  }

  console.log("Seed completed");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });