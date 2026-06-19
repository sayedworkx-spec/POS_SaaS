type AnyDelegate = {
  findMany: (...args: any[]) => Promise<any>;
  findUnique?: (...args: any[]) => Promise<any>;
  findFirst?: (...args: any[]) => Promise<any>;
  create?: (...args: any[]) => Promise<any>;
  update?: (...args: any[]) => Promise<any>;
  delete?: (...args: any[]) => Promise<any>;
  count?: (...args: any[]) => Promise<any>;
};

function isDelegate(value: unknown): value is AnyDelegate {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as AnyDelegate).findMany === "function"
  );
}

function toCamelCase(value: string) {
  if (!value) return value;
  return value.charAt(0).toLowerCase() + value.slice(1);
}

function getRuntimeModels(db: any): Array<{ name: string; fields: Array<{ name: string }> }> {
  const runtimeModels = db?._runtimeDataModel?.models;
  if (runtimeModels && typeof runtimeModels === "object") {
    return Object.values(runtimeModels) as Array<{
      name: string;
      fields: Array<{ name: string }>;
    }>;
  }

  const dmmfModels = db?._dmmf?.datamodel?.models;
  if (Array.isArray(dmmfModels)) {
    return dmmfModels as Array<{
      name: string;
      fields: Array<{ name: string }>;
    }>;
  }

  return [];
}

export function getPrismaDelegate(
  db: any,
  options: {
    aliases: string[];
    requiredFields: string[];
  }
): AnyDelegate {
  for (const alias of options.aliases) {
    if (isDelegate(db?.[alias])) {
      return db[alias] as AnyDelegate;
    }
  }

  const models = getRuntimeModels(db);

  const matchedModel = models.find((model) => {
    const fieldNames = new Set((model.fields ?? []).map((field) => field.name));
    return options.requiredFields.every((field) => fieldNames.has(field));
  });

  if (matchedModel) {
    const delegateName = toCamelCase(matchedModel.name);
    if (isDelegate(db?.[delegateName])) {
      return db[delegateName] as AnyDelegate;
    }
  }

  const availableDelegates = Object.keys(db ?? {})
    .filter((key) => isDelegate(db[key]))
    .sort();

  throw new Error(
    `Prisma delegate not found: ${options.aliases.join(" | ")}. Available delegates: ${availableDelegates.join(", ")}`
  );
}