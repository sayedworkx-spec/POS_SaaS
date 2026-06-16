import type { Category } from "../types/Category";

const STORAGE_KEY = "categories";

const defaultCategories: Category[] = [
  { id: 1, name: "Clothes" },
  { id: 2, name: "Accessories" },
  { id: 3, name: "Shoes" },
  { id: 4, name: "Bags" },
];

function readCategories(): Category[] {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultCategories));
    return defaultCategories;
  }

  try {
    const parsed = JSON.parse(raw) as Category[];
    return parsed.length > 0 ? parsed : defaultCategories;
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultCategories));
    return defaultCategories;
  }
}

function writeCategories(categories: Category[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
}

export function getCategories(): Category[] {
  return readCategories().slice().sort((a, b) => a.id - b.id);
}

export function getCategoryById(categoryId: number): Category | undefined {
  return getCategories().find((category) => category.id === categoryId);
}

export function getCategoryNameById(categoryId: number): string {
  return getCategoryById(categoryId)?.name ?? `Category ${categoryId}`;
}

export function addCategory(name: string) {
  const trimmed = name.trim();

  if (!trimmed) {
    throw new Error("Category name is required");
  }

  const categories = getCategories();

  const exists = categories.some(
    (category) => category.name.toLowerCase() === trimmed.toLowerCase()
  );

  if (exists) {
    throw new Error("Category already exists");
  }

  const newCategory: Category = {
    id: Date.now(),
    name: trimmed,
  };

  categories.push(newCategory);
  writeCategories(categories);

  return newCategory;
}