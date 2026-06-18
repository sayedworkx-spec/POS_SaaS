import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { getCurrentUser } from "./services/authService";
import { canAccessPath } from "./config/access";

import ExecutiveSummaryPage from "./pages/ExecutiveSummaryPage";
import DashboardPage from "./pages/DashboardPage";
import SalesPage from "./pages/SalesPage";
import CashRegisterPage from "./pages/CashRegisterPage";
import ProductsPage from "./pages/ProductsPage";
import UsersPage from "./pages/UsersPage";
import ProfitReportPage from "./pages/ProfitReportPage";
import PnLPage from "./pages/PnLPage";
import StockReportPage from "./pages/StockReportPage";
import ExpensesPage from "./pages/ExpensesPage";
import ReturnsPage from "./pages/ReturnsPage";
import AuditLogsPage from "./pages/AuditLogsPage";
import LoginPage from "./pages/LoginPage";
import ForbiddenPage from "./pages/ForbiddenPage";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = getCurrentUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function RoleGuard({
  children,
  path,
}: {
  children: React.ReactNode;
  path: string;
}) {
  const user = getCurrentUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!canAccessPath(user.role, path)) {
    return <Navigate to="/forbidden" replace />;
  }

  return <>{children}</>;
}

function AppHomeRedirect() {
  const user = getCurrentUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to="/home" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppHomeRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forbidden" element={<ForbiddenPage />} />

        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <ExecutiveSummaryPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/sales"
          element={
            <RoleGuard path="/sales">
              <SalesPage />
            </RoleGuard>
          }
        />

        <Route
          path="/cash-register"
          element={
            <RoleGuard path="/cash-register">
              <CashRegisterPage />
            </RoleGuard>
          }
        />

        <Route
          path="/products"
          element={
            <RoleGuard path="/products">
              <ProductsPage />
            </RoleGuard>
          }
        />

        <Route
          path="/users"
          element={
            <RoleGuard path="/users">
              <UsersPage />
            </RoleGuard>
          }
        />

        <Route
          path="/inventory"
          element={
            <ProtectedRoute>
              <StockReportPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/expenses"
          element={
            <ProtectedRoute>
              <ExpensesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/returns"
          element={
            <ProtectedRoute>
              <ReturnsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profit-report"
          element={
            <RoleGuard path="/profit-report">
              <ProfitReportPage />
            </RoleGuard>
          }
        />

        <Route
          path="/pnl"
          element={
            <RoleGuard path="/pnl">
              <PnLPage />
            </RoleGuard>
          }
        />

        <Route
          path="/audit-logs"
          element={
            <RoleGuard path="/audit-logs">
              <AuditLogsPage />
            </RoleGuard>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}