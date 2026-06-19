import { apiFetch, readApiError } from "./api";
import type { Category } from "../types/Category";

const CATEGORIES_CACHE_KEY = "categories_cache";

const defaultCategories: Category[] = [
  { id: 1, name: "Clothes" },
  { id: 2, name: "Accessories" },
  { id: 3, name: "Shoes" },
  { id: 4, name: "Bags" },
];

function normalizeCategory(raw: any): Category {
  return {
    id: Number(raw?.id ?? Date.now()),
    name: String(raw?.name ?? "").trim() || "Category",
  };
}

function readCache(): Category[] {
  const raw = localStorage.getItem(CATEGORIES_CACHE_KEY);

  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => normalizeCategory(item));
  } catch {
    return [];
  }
}

function writeCache(categories: Category[]) {
  localStorage.setItem(CATEGORIES_CACHE_KEY, JSON.stringify(categories));
}

function upsertCache(category: Category) {
  const current = readCache();
  const index = current.findIndex((item) => item.id === category.id);

  if (index === -1) {
    current.unshift(category);
  } else {
    current[index] = category;
  }

  writeCache(current);
}

export function getCategories(): Category[] {
  const cached = readCache();
  return cached.length > 0 ? cached.slice().sort((a, b) => a.id - b.id) : defaultCategories;
}

export function getCategoryById(categoryId: number): Category | undefined {
  return getCategories().find((category) => category.id === categoryId);
}

export function getCategoryNameById(categoryId: number): string {
  return getCategoryById(categoryId)?.name ?? `Category ${categoryId}`;
}

export async function syncCategoriesCache() {
  const response = await apiFetch("/categories");

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  const payload = (await response.json()) as { categories?: unknown };
  const categories = Array.isArray(payload.categories)
    ? payload.categories.map((item) => normalizeCategory(item))
    : [];

  writeCache(categories);
  return categories;
}

export async function addCategory(name: string) {
  const trimmed = name.trim();

  if (!trimmed) {
    throw new Error("Category name is required");
  }

  const response = await apiFetch("/categories", {
    method: "POST",
    body: JSON.stringify({ name: trimmed }),
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  const payload = (await response.json()) as { category?: unknown };
  const saved = normalizeCategory(payload.category);

  upsertCache(saved);
  return saved;
}