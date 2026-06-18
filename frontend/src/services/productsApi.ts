import { apiFetch, readApiError } from "./api";
import type { Product } from "../types/Product";

const PRODUCTS_CACHE_KEY = "products";

type ProductPayload = Omit<Product, "id">;

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
    reorderLevel: Number(raw?.reorderLevel ?? 0),
    isActive: raw?.isActive === false ? false : true,
    createdAt: raw?.createdAt ? String(raw.createdAt) : undefined,
    updatedAt: raw?.updatedAt ? String(raw.updatedAt) : undefined,
  };
}

function readCache(): Product[] {
  const raw = localStorage.getItem(PRODUCTS_CACHE_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => normalizeProduct(item));
  } catch {
    return [];
  }
}

function writeCache(products: Product[]) {
  localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(products));
}

function upsertCache(product: Product) {
  const current = readCache();
  const index = current.findIndex((item) => item.id === product.id);

  if (index === -1) {
    current.unshift(product);
  } else {
    current[index] = product;
  }

  writeCache(current);
}

function removeFromCache(productId: number) {
  const current = readCache().filter((item) => item.id !== productId);
  writeCache(current);
}

export function getProducts(): Product[] {
  return readCache();
}

export function getProductById(productId: number): Product | null {
  return readCache().find((product) => product.id === productId) ?? null;
}

export function findProductByBarcode(value: string) {
  const term = value.trim().toLowerCase();

  if (!term) return null;

  return (
    readCache().find(
      (product) =>
        product.barcode.toLowerCase() === term ||
        product.sku.toLowerCase() === term
    ) ??
    readCache().find(
      (product) =>
        product.barcode.toLowerCase().includes(term) ||
        product.sku.toLowerCase().includes(term) ||
        product.name.toLowerCase().includes(term)
    ) ??
    null
  );
}

export async function syncProductsCache() {
  const response = await apiFetch("/products");

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  const payload = (await response.json()) as { products?: unknown };

  const products = Array.isArray(payload.products)
    ? payload.products.map((item) => normalizeProduct(item))
    : [];

  writeCache(products);
  return products;
}

export async function fetchProducts() {
  return syncProductsCache();
}

export async function createProduct(product: ProductPayload) {
  const response = await apiFetch("/products", {
    method: "POST",
    body: JSON.stringify(product),
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  const payload = (await response.json()) as { product: unknown };
  const saved = normalizeProduct(payload.product);
  upsertCache(saved);
  return saved;
}

export async function updateProduct(
  productId: number,
  updates: Partial<ProductPayload>
) {
  const response = await apiFetch(`/products/${productId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  const payload = (await response.json()) as { product: unknown };
  const saved = normalizeProduct(payload.product);
  upsertCache(saved);
  return saved;
}

export async function deleteProduct(productId: number) {
  const response = await apiFetch(`/products/${productId}`, {
    method: "DELETE",
  });

  if (!response.ok && response.status !== 204) {
    throw new Error(await readApiError(response));
  }

  removeFromCache(productId);
}

export async function toggleProductStatus(productId: number) {
  const response = await apiFetch(`/products/${productId}/toggle-status`, {
    method: "PATCH",
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  const payload = (await response.json()) as { product: unknown };
  const saved = normalizeProduct(payload.product);
  upsertCache(saved);
  return saved;
}

export async function adjustProductStock(productId: number, delta: number) {
  const response = await apiFetch(`/products/${productId}/stock`, {
    method: "PATCH",
    body: JSON.stringify({ delta }),
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  const payload = (await response.json()) as { product: unknown };
  const saved = normalizeProduct(payload.product);
  upsertCache(saved);
  return saved;
}

export async function updateProductStock(productId: number, delta: number) {
  return adjustProductStock(productId, delta);
}

export async function reduceProductStock(productId: number, quantity: number) {
  return adjustProductStock(productId, -Math.abs(quantity));
}

export async function setProductStock(productId: number, stock: number) {
  const current = getProductById(productId);
  if (!current) {
    throw new Error("Product not found");
  }

  const delta = stock - current.stock;
  return adjustProductStock(productId, delta);
}