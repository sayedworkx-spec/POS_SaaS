import {
  apiFetch,
  clearStoredToken,
  getStoredToken,
  readApiError,
  setStoredToken,
} from "./api";
import { addAuditLog } from "./auditService";
import type { User, UserRole } from "../types/User";

const CURRENT_USER_KEY = "currentUser";
const USERS_CACHE_KEY = "users_cache";

type PublicUser = Omit<User, "password">;
type AuthResponse = {
  token: string;
  user: PublicUser;
};

function normalizeRole(raw: unknown, fallback: UserRole = "cashier"): UserRole {
  if (raw === "admin" || raw === "cashier" || raw === "warehouse") {
    return raw;
  }
  return fallback;
}

function normalizeUser(raw: Partial<User> & Record<string, unknown>): User {
  return {
    id: Number(raw.id ?? Date.now()),
    name: String(raw.name ?? "").trim() || "User",
    email: String(raw.email ?? "").trim().toLowerCase(),
    password:
      raw.password !== undefined && raw.password !== null
        ? String(raw.password)
        : undefined,
    role: normalizeRole(raw.role, "cashier"),
    isActive: raw.isActive === false ? false : true,
    createdAt:
      raw.createdAt !== undefined && raw.createdAt !== null
        ? String(raw.createdAt)
        : undefined,
    updatedAt:
      raw.updatedAt !== undefined && raw.updatedAt !== null
        ? String(raw.updatedAt)
        : undefined,
  };
}

function saveAuthState(token: string, user: PublicUser) {
  setStoredToken(token);
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
}

function readStoredCurrentUser(): User | null {
  const raw = localStorage.getItem(CURRENT_USER_KEY);

  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return normalizeUser(parsed);
  } catch {
    localStorage.removeItem(CURRENT_USER_KEY);
    return null;
  }
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const json = atob(padded);

    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function userFromToken(token: string): User | null {
  const payload = decodeJwtPayload(token);
  if (!payload) return null;

  const id = Number(payload.sub ?? 0);
  const email = String(payload.email ?? "").trim().toLowerCase();
  const role = normalizeRole(payload.role, "cashier");
  const name = String(payload.name ?? "").trim() || "User";

  if (!id || !email) {
    return null;
  }

  return {
    id,
    name,
    email,
    role,
    isActive: true,
  };
}

function readUsersCache(): User[] {
  const raw = localStorage.getItem(USERS_CACHE_KEY);

  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => normalizeUser(item as Record<string, unknown>));
  } catch {
    return [];
  }
}

function writeUsersCache(users: User[]) {
  localStorage.setItem(USERS_CACHE_KEY, JSON.stringify(users));
}

function upsertUserCache(user: User) {
  const current = readUsersCache();
  const index = current.findIndex((item) => item.id === user.id);

  if (index === -1) {
    current.unshift(user);
  } else {
    current[index] = user;
  }

  writeUsersCache(current);
}

function removeUserCache(userId: number) {
  writeUsersCache(readUsersCache().filter((user) => user.id !== userId));
}

export async function syncUsersCache() {
  const response = await apiFetch("/users");

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  const payload = (await response.json()) as { users?: unknown };
  const users = Array.isArray(payload.users)
    ? payload.users.map((item) => normalizeUser(item as Record<string, unknown>))
    : [];

  writeUsersCache(users);
  return users;
}

export function getUsers(): User[] {
  return readUsersCache();
}

export function getUserById(userId: number): User | null {
  return readUsersCache().find((user) => user.id === userId) ?? null;
}

export async function createUser(input: {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
  isActive?: boolean;
}) {
  const response = await apiFetch("/users", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      email: input.email,
      password: input.password,
      role: input.role ?? "cashier",
      isActive: input.isActive ?? true,
    }),
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  const payload = (await response.json()) as { user?: unknown };
  const saved = normalizeUser(payload.user as Record<string, unknown>);
  upsertUserCache(saved);

  void addAuditLog("USER_CREATED", `Created user ${saved.name}`, saved.name);

  return saved;
}

export async function updateUser(
  userId: number,
  updates: Partial<Pick<User, "name" | "email" | "password" | "role" | "isActive">>
) {
  const response = await apiFetch(`/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  const payload = (await response.json()) as { user?: unknown };
  const saved = normalizeUser(payload.user as Record<string, unknown>);
  upsertUserCache(saved);

  void addAuditLog("USER_UPDATED", `Updated user ${saved.name}`, saved.name);

  return saved;
}

export async function deleteUser(userId: number) {
  const current = getUserById(userId);

  const response = await apiFetch(`/users/${userId}`, {
    method: "DELETE",
  });

  if (!response.ok && response.status !== 204) {
    throw new Error(await readApiError(response));
  }

  removeUserCache(userId);

  void addAuditLog(
    "USER_DELETED",
    `Deleted user ${current?.name ?? userId}`,
    current?.name ?? "Admin"
  );
}

export function getCurrentUser(): User | null {
  const stored = readStoredCurrentUser();
  if (stored) return stored;

  const token = getStoredToken();
  if (!token) return null;

  const tokenUser = userFromToken(token);
  if (!tokenUser) {
    logout();
    return null;
  }

  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(tokenUser));
  return tokenUser;
}

export function getHomeRouteForRole(role: UserRole) {
  switch (role) {
    case "admin":
      return "/dashboard";
    case "warehouse":
      return "/inventory";
    case "cashier":
    default:
      return "/sales";
  }
}

export function getRoleLabel(role: UserRole) {
  switch (role) {
    case "admin":
      return "Admin";
    case "warehouse":
      return "Warehouse";
    case "cashier":
    default:
      return "Cashier";
  }
}

export function hasAccess(userRole: UserRole, allowedRoles?: UserRole[]) {
  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }

  return allowedRoles.includes(userRole);
}

export async function login(email: string, password: string) {
  const response = await apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      password,
    }),
  });

  if (!response.ok) {
    void addAuditLog(
      "LOGIN_FAILED",
      `Failed login attempt for ${email.trim().toLowerCase()}`,
      "System"
    );
    throw new Error(await readApiError(response));
  }

  const data = (await response.json()) as AuthResponse;
  saveAuthState(data.token, data.user);

  void addAuditLog("LOGIN", `Signed in as ${data.user.role}`, data.user.name);

  return data.user;
}

export async function register(input: {
  name: string;
  email: string;
  password: string;
  role?: Exclude<UserRole, "admin">;
}) {
  const response = await apiFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      email: input.email,
      password: input.password,
      role: input.role ?? "cashier",
    }),
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  const data = (await response.json()) as AuthResponse;
  saveAuthState(data.token, data.user);

  void addAuditLog(
    "USER_CREATED",
    `${data.user.name} (${data.user.role})`,
    data.user.name
  );

  return data.user;
}

export const signup = register;

export function isAuthenticated() {
  return Boolean(getStoredToken() || readStoredCurrentUser());
}

export function logout() {
  const current = getCurrentUser();
  if (current) {
    void addAuditLog("LOGOUT", "Signed out", current.name);
  }

  clearStoredToken();
  localStorage.removeItem(CURRENT_USER_KEY);
}