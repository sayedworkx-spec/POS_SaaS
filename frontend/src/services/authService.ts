import {
  apiFetch,
  clearStoredToken,
  getStoredToken,
  readApiError,
  setStoredToken,
} from "./api";
import { addAuditLog } from "./auditService";
import type { User, UserRole } from "../types/User";

const USERS_KEY = "users";
const CURRENT_USER_KEY = "currentUser";

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
    if (parts.length < 2) {
      return null;
    }

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

function seedUsers(): User[] {
  return [
    {
      id: 1,
      name: "Administrator",
      email: "admin@demo.com",
      password: "admin123",
      role: "admin",
      isActive: true,
    },
    {
      id: 2,
      name: "Cashier",
      email: "cashier@demo.com",
      password: "cashier123",
      role: "cashier",
      isActive: true,
    },
    {
      id: 3,
      name: "Warehouse",
      email: "warehouse@demo.com",
      password: "warehouse123",
      role: "warehouse",
      isActive: true,
    },
  ];
}

function readLegacyUsers(): User[] {
  const raw = localStorage.getItem(USERS_KEY);

  if (!raw) {
    const seeded = seedUsers();
    localStorage.setItem(USERS_KEY, JSON.stringify(seeded));
    return seeded;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) {
      const seeded = seedUsers();
      localStorage.setItem(USERS_KEY, JSON.stringify(seeded));
      return seeded;
    }

    const normalized = parsed.map((item) =>
      normalizeUser(item as Record<string, unknown>)
    );

    localStorage.setItem(USERS_KEY, JSON.stringify(normalized));
    return normalized;
  } catch {
    const seeded = seedUsers();
    localStorage.setItem(USERS_KEY, JSON.stringify(seeded));
    return seeded;
  }
}

function writeLegacyUsers(users: User[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function createLegacyUserRecord(input: {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
  isActive?: boolean;
}) {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const password = input.password;

  if (!name || !email || !password) {
    throw new Error("All fields are required");
  }

  const users = readLegacyUsers();
  const emailExists = users.some((item) => item.email.toLowerCase() === email);

  if (emailExists) {
    throw new Error("Email already exists");
  }

  const newUser: User = {
    id: Date.now(),
    name,
    email,
    password,
    role: input.role ?? "cashier",
    isActive: input.isActive ?? true,
  };

  writeLegacyUsers([...users, newUser]);
  return newUser;
}

export function getUsers(): User[] {
  return readLegacyUsers();
}

export function getUserById(userId: number): User | null {
  return readLegacyUsers().find((user) => user.id === userId) ?? null;
}

export function getCurrentUser(): User | null {
  const stored = readStoredCurrentUser();
  if (stored) {
    return stored;
  }

  const token = getStoredToken();
  if (!token) {
    return null;
  }

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
    void addAuditLog("LOGIN_FAILED", `Failed login attempt for ${email.trim().toLowerCase()}`, "System");
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

  void addAuditLog("USER_CREATED", `${data.user.name} (${data.user.role})`, data.user.name);

  return data.user;
}

export const signup = register;

export function createUser(input: {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
  isActive?: boolean;
}) {
  return createLegacyUserRecord(input);
}

export function updateUser(
  userId: number,
  updates: Partial<Pick<User, "name" | "email" | "password" | "role" | "isActive">>
) {
  const users = readLegacyUsers();
  const index = users.findIndex((user) => user.id === userId);

  if (index === -1) {
    throw new Error("User not found");
  }

  const current = users[index];
  const updated: User = {
    ...current,
    ...updates,
    name: updates.name !== undefined ? updates.name.trim() : current.name,
    email:
      updates.email !== undefined
        ? updates.email.trim().toLowerCase()
        : current.email,
    role: updates.role ?? current.role,
    isActive: updates.isActive ?? current.isActive,
  };

  users[index] = updated;
  writeLegacyUsers(users);
  return updated;
}

export function deleteUser(userId: number) {
  const users = readLegacyUsers();
  writeLegacyUsers(users.filter((user) => user.id !== userId));
}

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