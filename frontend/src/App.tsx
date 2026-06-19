import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import DashboardPage from "./pages/DashboardPage";
import ProfitReportPage from "./pages/ProfitReportPage";
import ExpensesPage from "./pages/ExpensesPage";
import ProductsPage from "./pages/ProductsPage";
import UsersPage from "./pages/UsersPage";
import SalesPage from "./pages/SalesPage";
import SalesHistoryPage from "./pages/SalesHistoryPage";
import ReturnsPage from "./pages/ReturnsPage";
import PurchasesPage from "./pages/PurchasesPage";
import InventoryPage from "./pages/InventoryPage";
import StockReportPage from "./pages/StockReportPage";
import CashRegisterPage from "./pages/CashRegisterPage";
import BarcodeLabelsPage from "./pages/BarcodeLabelsPage";
import SuspendedSalesPage from "./pages/SuspendedSalesPage";
import AuditLogsPage from "./pages/AuditLogsPage";
import SettingsPage from "./pages/SettingsPage";
import ForbiddenPage from "./pages/ForbiddenPage";

import { getCurrentUser } from "./services/authService";
import type { UserRole } from "./types/User";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = getCurrentUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function RequireRoles({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}) {
  const user = getCurrentUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/forbidden" replace />;
  }

  return <>{children}</>;
}

function RootRedirect() {
  const user = getCurrentUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  switch (user.role) {
    case "admin":
      return <Navigate to="/dashboard" replace />;
    case "warehouse":
      return <Navigate to="/inventory" replace />;
    case "cashier":
    default:
      return <Navigate to="/sales" replace />;
  }
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forbidden" element={<ForbiddenPage />} />

        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <DashboardPage />
            </RequireAuth>
          }
        />

        <Route
          path="/sales"
          element={
            <RequireRoles allowedRoles={["admin", "cashier"]}>
              <SalesPage />
            </RequireRoles>
          }
        />

        <Route
          path="/suspended-sales"
          element={
            <RequireRoles allowedRoles={["admin", "cashier"]}>
              <SuspendedSalesPage />
            </RequireRoles>
          }
        />

        <Route
          path="/cash-register"
          element={
            <RequireRoles allowedRoles={["admin", "cashier"]}>
              <CashRegisterPage />
            </RequireRoles>
          }
        />

        <Route
          path="/sales-history"
          element={
            <RequireRoles allowedRoles={["admin", "cashier"]}>
              <SalesHistoryPage />
            </RequireRoles>
          }
        />

        <Route
          path="/returns"
          element={
            <RequireRoles allowedRoles={["admin", "cashier"]}>
              <ReturnsPage />
            </RequireRoles>
          }
        />

        <Route
          path="/barcode-labels"
          element={
            <RequireRoles allowedRoles={["admin", "cashier"]}>
              <BarcodeLabelsPage />
            </RequireRoles>
          }
        />

        <Route
          path="/products"
          element={
            <RequireRoles allowedRoles={["admin", "warehouse"]}>
              <ProductsPage />
            </RequireRoles>
          }
        />

        <Route
          path="/purchases"
          element={
            <RequireRoles allowedRoles={["admin", "warehouse"]}>
              <PurchasesPage />
            </RequireRoles>
          }
        />

        <Route
          path="/inventory"
          element={
            <RequireRoles allowedRoles={["admin", "warehouse"]}>
              <InventoryPage />
            </RequireRoles>
          }
        />

        <Route
          path="/stock-report"
          element={
            <RequireRoles allowedRoles={["admin", "warehouse"]}>
              <StockReportPage />
            </RequireRoles>
          }
        />

        <Route
          path="/expenses"
          element={
            <RequireRoles allowedRoles={["admin"]}>
              <ExpensesPage />
            </RequireRoles>
          }
        />

        <Route
          path="/profit-report"
          element={
            <RequireRoles allowedRoles={["admin"]}>
              <ProfitReportPage />
            </RequireRoles>
          }
        />

        <Route
          path="/audit-logs"
          element={
            <RequireRoles allowedRoles={["admin"]}>
              <AuditLogsPage />
            </RequireRoles>
          }
        />

        <Route
          path="/settings"
          element={
            <RequireRoles allowedRoles={["admin"]}>
              <SettingsPage />
            </RequireRoles>
          }
        />

        <Route
          path="/users"
          element={
            <RequireRoles allowedRoles={["admin"]}>
              <UsersPage />
            </RequireRoles>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}