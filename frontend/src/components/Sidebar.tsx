import { Link, NavLink } from "react-router-dom";

import {
  getCurrentUser,
  getHomeRouteForRole,
  getRoleLabel,
  logout,
} from "../services/authService";
import type { UserRole } from "../types/User";

type NavItem = {
  to: string;
  label: string;
  roles: UserRole[];
};

const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", roles: ["admin", "cashier", "warehouse"] },
  { to: "/sales", label: "Sales POS", roles: ["admin", "cashier"] },
  { to: "/cash-register", label: "Cash Register", roles: ["admin", "cashier"] },
  { to: "/sales-history", label: "Sales History", roles: ["admin", "cashier"] },
  { to: "/returns", label: "Returns", roles: ["admin", "cashier"] },
  { to: "/barcode-labels", label: "Barcode Labels", roles: ["admin", "cashier"] },
  { to: "/products", label: "Products", roles: ["admin", "warehouse"] },
  { to: "/purchases", label: "Purchases", roles: ["admin", "warehouse"] },
  { to: "/inventory", label: "Inventory", roles: ["admin", "warehouse"] },
  { to: "/stock-report", label: "Stock Report", roles: ["admin", "warehouse"] },
  { to: "/expenses", label: "Expenses", roles: ["admin"] },
  { to: "/profit-report", label: "Profit Report", roles: ["admin"] },
  { to: "/audit-logs", label: "Audit Logs", roles: ["admin"] },
  { to: "/settings", label: "Settings", roles: ["admin"] },
  { to: "/users", label: "Users", roles: ["admin"] },
];

export default function Sidebar() {
  const currentUser = getCurrentUser();

  if (!currentUser) {
    return null;
  }

  const visibleItems = NAV_ITEMS.filter((item) =>
    item.roles.includes(currentUser.role)
  );

  const handleLogout = () => {
    logout();
    window.location.href = "/";
  };

  return (
    <aside className="flex h-screen w-64 flex-col bg-slate-950 text-white">
      <div className="border-b border-white/10 p-5">
        <Link
          to={getHomeRouteForRole(currentUser.role)}
          className="text-2xl font-bold tracking-tight"
        >
          POS SaaS
        </Link>

        <div className="mt-4 rounded-2xl bg-white/5 p-3">
          <div className="text-sm font-semibold">{currentUser.name}</div>
          <div className="mt-1 text-xs text-slate-300">
            {getRoleLabel(currentUser.role)}
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-auto p-3">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              [
                "block rounded-xl px-3 py-3 text-sm font-medium transition",
                isActive
                  ? "bg-white text-slate-950"
                  : "text-slate-200 hover:bg-white/10",
              ].join(" ")
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <button
          onClick={handleLogout}
          className="w-full rounded-xl bg-white/10 px-3 py-3 text-sm font-medium text-white hover:bg-white/15"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}