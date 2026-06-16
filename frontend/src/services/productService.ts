import type { Product } from "../types/Product";

const STORAGE_KEY = "products";

const defaultProducts: Product[] = [
  {
    id: 1,
    sku: "P001",
    barcode: "100001",
    name: "T-Shirt Black",
    categoryId: 1,
    stock: 0,
    costPrice: 100,
    sellPrice: 180,
    reorderLevel: 10,
    isActive: true,
  },
  {
    id: 2,
    sku: "P002",
    barcode: "100002",
    name: "Jeans Blue",
    categoryId: 1,
    stock: 0,
    costPrice: 250,
    sellPrice: 400,
    reorderLevel: 10,
    isActive: true,
  },
];

function normalizeProduct(raw: any): Product {
  return {
    id: Number(raw?.id ?? Date.now()),
    sku: String(raw?.sku ?? "").trim(),
    barcode: String(raw?.barcode ?? raw?.sku ?? raw?.id ?? "").trim(),
    name: String(raw?.name ?? "").trim(),
    categoryId: Number(raw?.categoryId ?? 1),
    stock: Number(raw?.stock ?? 0),
    costPrice: Number(raw?.costPrice ?? 0),
    sellPrice: Number(raw?.sellPrice ?? 0),
    reorderLevel: Number(raw?.reorderLevel ?? 10),
    isActive: Boolean(raw?.isActive ?? true),
  };
}

function readProducts(): Product[] {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultProducts));
    return defaultProducts;
  }

  try {
    const parsed = JSON.parse(saved) as any[];
    const normalized = Array.isArray(parsed)
      ? parsed.map(normalizeProduct)
      : defaultProducts;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultProducts));
    return defaultProducts;
  }
}

function writeProducts(products: Product[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

export function getProducts(): Product[] {
  return readProducts();
}

export function getProductById(productId: number): Product | undefined {
  return readProducts().find((product) => product.id === productId);
}

export function findProductByBarcode(value: string) {
  const term = value.trim().toLowerCase();

  if (!term) return null;

  return (
    readProducts().find(
      (product) =>
        product.barcode.toLowerCase() === term ||
        product.sku.toLowerCase() === term
    ) ??
    readProducts().find(
      (product) =>
        product.barcode.toLowerCase().includes(term) ||
        product.sku.toLowerCase().includes(term) ||
        product.name.toLowerCase().includes(term)
    ) ??
    null
  );
}

export function addProduct(product: Omit<Product, "id">) {
  const products = readProducts();

  const skuExists = products.some(
    (item) => item.sku.toLowerCase() === product.sku.trim().toLowerCase()
  );
  if (skuExists) {
    throw new Error("SKU already exists");
  }

  const barcodeExists = products.some(
    (item) => item.barcode.toLowerCase() === product.barcode.trim().toLowerCase()
  );
  if (barcodeExists) {
    throw new Error("Barcode already exists");
  }

  const newProduct: Product = {
    id: Date.now(),
    ...product,
    sku: product.sku.trim(),
    barcode: product.barcode.trim(),
    name: product.name.trim(),
  };

  products.push(newProduct);
  writeProducts(products);

  return newProduct;
}

export function updateProduct(
  productId: number,
  updates: Partial<Omit<Product, "id">>
) {
  const products = readProducts();
  const index = products.findIndex((product) => product.id === productId);

  if (index === -1) {
    throw new Error("Product not found");
  }

  const nextSku =
    updates.sku !== undefined ? updates.sku.trim() : products[index].sku;
  const nextBarcode =
    updates.barcode !== undefined ? updates.barcode.trim() : products[index].barcode;

  const duplicateSku = products.some(
    (item) => item.id !== productId && item.sku.toLowerCase() === nextSku.toLowerCase()
  );
  if (duplicateSku) {
    throw new Error("SKU already exists");
  }

  const duplicateBarcode = products.some(
    (item) =>
      item.id !== productId &&
      item.barcode.toLowerCase() === nextBarcode.toLowerCase()
  );
  if (duplicateBarcode) {
    throw new Error("Barcode already exists");
  }

  products[index] = {
    ...products[index],
    ...updates,
    sku: nextSku,
    barcode: nextBarcode,
    name: updates.name !== undefined ? updates.name.trim() : products[index].name,
    categoryId:
      updates.categoryId !== undefined ? Number(updates.categoryId) : products[index].categoryId,
    stock: updates.stock !== undefined ? Number(updates.stock) : products[index].stock,
    costPrice:
      updates.costPrice !== undefined ? Number(updates.costPrice) : products[index].costPrice,
    sellPrice:
      updates.sellPrice !== undefined ? Number(updates.sellPrice) : products[index].sellPrice,
    reorderLevel:
      updates.reorderLevel !== undefined
        ? Number(updates.reorderLevel)
        : products[index].reorderLevel,
    isActive: updates.isActive ?? products[index].isActive,
  };

  writeProducts(products);
  return products[index];
}

export function deleteProduct(productId: number) {
  const products = readProducts();
  const filtered = products.filter((product) => product.id !== productId);
  writeProducts(filtered);
}

export function toggleProductStatus(productId: number) {
  const products = readProducts();
  const index = products.findIndex((product) => product.id === productId);

  if (index === -1) {
    throw new Error("Product not found");
  }

  products[index] = {
    ...products[index],
    isActive: !products[index].isActive,
  };

  writeProducts(products);
  return products[index];
}

export function updateProductStock(productId: number, quantity: number) {
  const products = readProducts();
  const product = products.find((item) => item.id === productId);

  if (!product) {
    return;
  }

  product.stock += quantity;
  writeProducts(products);
}

export function reduceProductStock(productId: number, quantity: number) {
  const products = readProducts();
  const product = products.find((item) => item.id === productId);

  if (!product) {
    return false;
  }

  if (product.stock < quantity) {
    return false;
  }

  product.stock -= quantity;
  writeProducts(products);
  return true;
}