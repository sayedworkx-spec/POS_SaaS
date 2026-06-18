import type { UserRole } from "../types/User";

export type AppRouteAccess = {
  path: string;
  roles: UserRole[];
};

export const ROUTE_ACCESS: AppRouteAccess[] = [
  { path: "/home", roles: ["admin", "cashier", "warehouse"] },
  { path: "/dashboard", roles: ["admin", "cashier", "warehouse"] },
  { path: "/sales", roles: ["admin", "cashier"] },
  { path: "/cash-register", roles: ["admin", "cashier"] },
  { path: "/returns", roles: ["admin", "cashier"] },
  { path: "/expenses", roles: ["admin", "cashier"] },
  { path: "/inventory", roles: ["admin", "warehouse", "cashier"] },
  { path: "/pnl", roles: ["admin"] },
  { path: "/profit-report", roles: ["admin"] },
  { path: "/audit-logs", roles: ["admin"] },
  { path: "/products", roles: ["admin", "warehouse"] },
  { path: "/users", roles: ["admin"] },
];

export function canAccessPath(role: UserRole | undefined, path: string) {
  if (!role) return false;

  const match = ROUTE_ACCESS.find((item) => item.path === path);
  if (!match) return true;

  return match.roles.includes(role);
}