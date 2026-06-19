import { Router } from "express";
import { z } from "zod";

import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { readJsonFile, writeJsonFile } from "../lib/jsonStore.js";

export const categoriesRouter = Router();

type Category = {
  id: number;
  name: string;
};

const FILE_NAME = "categories.json";

const DEFAULT_CATEGORIES: Category[] = [
  { id: 1, name: "Clothes" },
  { id: 2, name: "Accessories" },
  { id: 3, name: "Shoes" },
  { id: 4, name: "Bags" },
];

const categorySchema = z.object({
  name: z.string().min(1),
});

function canManage(role?: string) {
  return role === "admin" || role === "warehouse";
}

async function readCategories(): Promise<Category[]> {
  const categories = await readJsonFile<Category[]>(FILE_NAME, DEFAULT_CATEGORIES);
  if (!Array.isArray(categories) || categories.length === 0) {
    await writeJsonFile(FILE_NAME, DEFAULT_CATEGORIES);
    return DEFAULT_CATEGORIES;
  }

  return categories
    .map((category) => ({
      id: Number(category.id),
      name: String(category.name).trim(),
    }))
    .filter((category) => category.name.length > 0);
}

async function writeCategories(categories: Category[]) {
  await writeJsonFile(FILE_NAME, categories);
}

categoriesRouter.use(requireAuth);

categoriesRouter.get("/", async (req: AuthRequest, res, next) => {
  try {
    const categories = await readCategories();
    res.json({ categories });
  } catch (error) {
    next(error);
  }
});

categoriesRouter.post("/", async (req: AuthRequest, res, next) => {
  try {
    if (!canManage(req.user?.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const data = categorySchema.parse(req.body);
    const categories = await readCategories();

    const exists = categories.some(
      (category) => category.name.toLowerCase() === data.name.trim().toLowerCase()
    );

    if (exists) {
      return res.status(409).json({ message: "Category already exists" });
    }

    const created: Category = {
      id: Date.now(),
      name: data.name.trim(),
    };

    categories.unshift(created);
    await writeCategories(categories);

    res.status(201).json({ category: created });
  } catch (error) {
    next(error);
  }
});

categoriesRouter.patch("/:id", async (req: AuthRequest, res, next) => {
  try {
    if (!canManage(req.user?.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const id = Number(req.params.id);
    const data = categorySchema.parse(req.body);
    const categories = await readCategories();

    const index = categories.findIndex((category) => category.id === id);
    if (index === -1) {
      return res.status(404).json({ message: "Category not found" });
    }

    categories[index] = {
      ...categories[index],
      name: data.name.trim(),
    };

    await writeCategories(categories);
    res.json({ category: categories[index] });
  } catch (error) {
    next(error);
  }
});

categoriesRouter.delete("/:id", async (req: AuthRequest, res, next) => {
  try {
    if (!canManage(req.user?.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const id = Number(req.params.id);
    const categories = await readCategories();
    const nextCategories = categories.filter((category) => category.id !== id);

    await writeCategories(nextCategories);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});