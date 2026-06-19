import type { UserRole } from "../types/User";

export type NavItem = {
  label: string;
  path: string;
  roles: UserRole[];
};

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Executive Summary",
    path: "/home",
    roles: ["admin", "cashier", "warehouse"],
  },
  {
    label: "Dashboard",
    path: "/dashboard",
    roles: ["admin", "cashier", "warehouse"],
  },
  {
    label: "Sales",
    path: "/sales",
    roles: ["admin", "cashier"],
  },
  {
    label: "Cash Register",
    path: "/cash-register",
    roles: ["admin", "cashier"],
  },
  {
    label: "Returns",
    path: "/returns",
    roles: ["admin", "cashier"],
  },
  {
    label: "Expenses",
    path: "/expenses",
    roles: ["admin", "cashier"],
  },
  {
    label: "Inventory Valuation",
    path: "/inventory",
    roles: ["admin", "warehouse", "cashier"],
  },
  {
    label: "P&L Report",
    path: "/pnl",
    roles: ["admin"],
  },
  {
    label: "Profit Report",
    path: "/profit-report",
    roles: ["admin"],
  },
  {
    label: "Audit Logs",
    path: "/audit-logs",
    roles: ["admin"],
  },
  {
    label: "Products",
    path: "/products",
    roles: ["admin", "warehouse"],
  },
  {
    label: "Users",
    path: "/users",
    roles: ["admin"],
  },
];