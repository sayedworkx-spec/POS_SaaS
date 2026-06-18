import { useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  Database,
  DollarSign,
  FileText,
  Home,
  Menu,
  Package,
  Receipt,
  Settings,
  ShieldCheck,
  ShoppingCart,
  SquareTerminal,
  Users,
  X,
} from "lucide-react";

import { getCurrentUser, logout } from "../services/authService";
import { NAV_ITEMS } from "../config/navigation";
import type { UserRole } from "../types/User";

type MainLayoutProps = {
  children: React.ReactNode;
};

const ICONS: Record<string, React.ReactNode> = {
  "Executive Summary": <ClipboardList className="h-4 w-4" />,
  Dashboard: <Home className="h-4 w-4" />,
  Sales: <ShoppingCart className="h-4 w-4" />,
  "Cash Register": <Receipt className="h-4 w-4" />,
  Returns: <Package className="h-4 w-4" />,
  Expenses: <DollarSign className="h-4 w-4" />,
  "Inventory Valuation": <Boxes className="h-4 w-4" />,
  "P&L Report": <BarChart3 className="h-4 w-4" />,
  "Profit Report": <FileText className="h-4 w-4" />,
  "Audit Logs": <ShieldCheck className="h-4 w-4" />,
  Products: <Database className="h-4 w-4" />,
  Users: <Users className="h-4 w-4" />,
};

export default function MainLayout({ children }: MainLayoutProps) {
  const currentUser = getCurrentUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleNavItems = useMemo(() => {
    const role = currentUser?.role as UserRole | undefined;

    return NAV_ITEMS.filter((item) => {
      if (!role) return false;
      return item.roles.includes(role);
    });
  }, [currentUser]);

  async function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen">
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-72 transform border-r bg-white shadow-sm transition-transform duration-200 lg:static lg:translate-x-0 ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <div className="text-lg font-bold">POS SaaS</div>
                <div className="text-xs text-slate-500">Operations Console</div>
              </div>

              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-2 text-slate-600 lg:hidden"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="border-b px-5 py-4">
              <div className="text-sm font-semibold">
                {currentUser?.name ?? "Guest"}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {currentUser?.email ?? "Not signed in"}
              </div>
              <div className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700">
                {currentUser?.role ?? "unknown"}
              </div>
            </div>

            <nav className="flex-1 overflow-auto px-3 py-4">
              <div className="space-y-1">
                {visibleNavItems.map((item) => {
                  const active =
                    location.pathname === item.path ||
                    location.pathname.startsWith(`${item.path}/`);

                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                        active
                          ? "bg-slate-900 text-white"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <span className="flex h-6 w-6 items-center justify-center">
                        {ICONS[item.label] ?? <SquareTerminal className="h-4 w-4" />}
                      </span>
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            </nav>

            <div className="border-t p-4">
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Settings className="h-4 w-4" />
                  Quick Actions
                </div>
                <div className="mt-3 grid gap-2">
                  <button
                    onClick={() => navigate("/home")}
                    className="rounded-xl bg-white px-3 py-2 text-left text-sm shadow-sm"
                  >
                    Go to Executive Summary
                  </button>
                  <button
                    onClick={handleLogout}
                    className="rounded-xl bg-slate-900 px-3 py-2 text-left text-sm text-white"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur">
            <div className="flex items-center justify-between px-4 py-4 lg:px-6">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMobileOpen(true)}
                  className="rounded-xl border bg-white p-2 shadow-sm lg:hidden"
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5" />
                </button>

                <div>
                  <div className="text-sm font-semibold">
                    {location.pathname.replace("/", "").toUpperCase() || "HOME"}
                  </div>
                  <div className="text-xs text-slate-500">
                    {currentUser?.role === "admin"
                      ? "Admin access"
                      : currentUser?.role === "cashier"
                        ? "Cashier access"
                        : currentUser?.role === "warehouse"
                          ? "Warehouse access"
                          : "No access"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden text-right sm:block">
                  <div className="text-sm font-semibold">
                    {currentUser?.name ?? "Guest"}
                  </div>
                  <div className="text-xs text-slate-500">
                    {currentUser?.email ?? ""}
                  </div>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                  {currentUser?.name?.slice(0, 1)?.toUpperCase() ?? "G"}
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 lg:p-6">{children}</main>
        </div>
      </div>

      {mobileOpen && (
        <button
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close overlay"
        />
      )}
    </div>
  );
}