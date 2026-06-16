import { addAuditLog } from "./auditService";
import type { User, UserRole } from "../types/User";

const USERS_KEY = "users";
const CURRENT_USER_KEY = "currentUser";

const ROLE_HOMES: Record<UserRole, string> = {
  admin: "/dashboard",
  cashier: "/sales",
  warehouse: "/inventory",
};

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  cashier: "Cashier",
  warehouse: "Warehouse",
};

function normalizeRole(raw: unknown, fallback: UserRole = "cashier"): UserRole {
  if (raw === "admin" || raw === "cashier" || raw === "warehouse") {
    return raw;
  }

  return fallback;
}

function inferRole(raw: Partial<User> & Record<string, unknown>): UserRole {
  const explicit = normalizeRole(raw.role, "cashier");
  if (explicit) {
    return explicit;
  }

  const email = String(raw.email ?? "").toLowerCase();
  const name = String(raw.name ?? "").toLowerCase();

  if (email.includes("admin") || name === "admin") {
    return "admin";
  }

  return "cashier";
}

function normalizeUser(raw: Record<string, unknown>): User {
  return {
    id: Number(raw.id ?? Date.now()),
    name: String(raw.name ?? "").trim() || "User",
    email: String(raw.email ?? "").trim().toLowerCase(),
    password: String(raw.password ?? ""),
    role: inferRole(raw),
    isActive: raw.isActive === false ? false : true,
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

function readUsers(): User[] {
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

function writeUsers(users: User[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function saveCurrentUser(user: User | null) {
  if (!user) {
    localStorage.removeItem(CURRENT_USER_KEY);
    return;
  }

  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
}

function createUserRecord(input: {
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

  const users = readUsers();

  const emailExists = users.some(
    (item) => item.email.toLowerCase() === email
  );
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

  const nextUsers = [...users, newUser];
  writeUsers(nextUsers);

  return newUser;
}

export function getUsers(): User[] {
  return readUsers();
}

export function getUserById(userId: number): User | null {
  return readUsers().find((user) => user.id === userId) ?? null;
}

export function getCurrentUser(): User | null {
  const raw = localStorage.getItem(CURRENT_USER_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const currentId = Number(parsed.id ?? 0);
    const currentEmail = String(parsed.email ?? "").toLowerCase();

    const users = readUsers();
    const matched =
      users.find((user) => user.id === currentId) ??
      users.find((user) => user.email.toLowerCase() === currentEmail) ??
      null;

    if (matched) {
      saveCurrentUser(matched);
      return matched;
    }

    return normalizeUser(parsed);
  } catch {
    return null;
  }
}

export function getHomeRouteForRole(role: UserRole) {
  return ROLE_HOMES[role];
}

export function getRoleLabel(role: UserRole) {
  return ROLE_LABELS[role];
}

export function login(email: string, password: string) {
  const users = readUsers();
  const normalizedEmail = email.trim().toLowerCase();

  const user = users.find(
    (item) =>
      item.email.toLowerCase() === normalizedEmail &&
      item.password === password &&
      item.isActive
  );

  if (!user) {
    addAuditLog(
      "LOGIN_FAILED",
      `Failed login attempt for ${normalizedEmail}`,
      "System"
    );
    return null;
  }

  saveCurrentUser(user);
  addAuditLog("LOGIN", `Signed in as ${user.role}`, user.name);
  return user;
}

type SignupInput = {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
  isActive?: boolean;
};

export function signup(input: SignupInput) {
  const newUser = createUserRecord(input);
  saveCurrentUser(newUser);
  addAuditLog("USER_CREATED", `${newUser.name} (${newUser.role})`, newUser.name);
  return newUser;
}

export function createUser(input: SignupInput) {
  const newUser = createUserRecord(input);
  addAuditLog("USER_CREATED", `${newUser.name} (${newUser.role})`, newUser.name);
  return newUser;
}

type UpdateUserInput = Partial<
  Pick<User, "name" | "email" | "password" | "role" | "isActive">
>;

export function updateUser(userId: number, updates: UpdateUserInput) {
  const users = readUsers();
  const index = users.findIndex((user) => user.id === userId);

  if (index === -1) {
    throw new Error("User not found");
  }

  const updated: User = {
    ...users[index],
    ...updates,
    name: updates.name !== undefined ? updates.name.trim() : users[index].name,
    email:
      updates.email !== undefined
        ? updates.email.trim().toLowerCase()
        : users[index].email,
    role: updates.role ?? users[index].role,
    isActive: updates.isActive ?? users[index].isActive,
  };

  users[index] = updated;
  writeUsers(users);

  const current = getCurrentUser();
  if (current && current.id === userId) {
    saveCurrentUser(updated);
  }

  addAuditLog(
    "USER_UPDATED",
    `${updated.name} (${Object.keys(updates).join(", ") || "profile"})`,
    current?.name ?? "System"
  );

  return updated;
}

export function deleteUser(userId: number) {
  const users = readUsers();
  const user = users.find((item) => item.id === userId) ?? null;
  const nextUsers = users.filter((item) => item.id !== userId);
  writeUsers(nextUsers);

  const current = getCurrentUser();
  if (current && current.id === userId) {
    logout();
  }

  addAuditLog(
    "USER_DELETED",
    user ? `${user.name} (${user.email})` : `User ID ${userId}`,
    current?.name ?? "System"
  );
}

export function logout() {
  const current = getCurrentUser();
  if (current) {
    addAuditLog("LOGOUT", "Signed out", current.name);
  }

  localStorage.removeItem(CURRENT_USER_KEY);
}

export function hasAccess(userRole: UserRole, allowedRoles?: UserRole[]) {
  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }

  return allowedRoles.includes(userRole);
}