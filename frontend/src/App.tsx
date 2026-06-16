import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import DashboardPage from "./pages/DashboardPage";
import ProductsPage from "./pages/ProductsPage";
import PurchasesPage from "./pages/PurchasesPage";
import InventoryPage from "./pages/InventoryPage";
import StockReportPage from "./pages/StockReportPage";
import SalesPage from "./pages/SalesPage";
import SalesHistoryPage from "./pages/SalesHistoryPage";
import ReturnsPage from "./pages/ReturnsPage";
import BarcodeLabelsPage from "./pages/BarcodeLabelsPage";
import CashRegisterPage from "./pages/CashRegisterPage";
import ExpensesPage from "./pages/ExpensesPage";
import ProfitReportPage from "./pages/ProfitReportPage";
import UsersPage from "./pages/UsersPage";
import AuditLogsPage from "./pages/AuditLogsPage";
import SettingsPage from "./pages/SettingsPage";
import ReceiptPage from "./pages/ReceiptPage";

import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={["admin", "cashier", "warehouse"]}>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/sales"
          element={
            <ProtectedRoute allowedRoles={["admin", "cashier"]}>
              <SalesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/cash-register"
          element={
            <ProtectedRoute allowedRoles={["admin", "cashier"]}>
              <CashRegisterPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/sales-history"
          element={
            <ProtectedRoute allowedRoles={["admin", "cashier"]}>
              <SalesHistoryPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/receipt/:invoiceNumber"
          element={
            <ProtectedRoute allowedRoles={["admin", "cashier"]}>
              <ReceiptPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/returns"
          element={
            <ProtectedRoute allowedRoles={["admin", "cashier"]}>
              <ReturnsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/barcode-labels"
          element={
            <ProtectedRoute allowedRoles={["admin", "cashier"]}>
              <BarcodeLabelsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/products"
          element={
            <ProtectedRoute allowedRoles={["admin", "warehouse"]}>
              <ProductsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/purchases"
          element={
            <ProtectedRoute allowedRoles={["admin", "warehouse"]}>
              <PurchasesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/inventory"
          element={
            <ProtectedRoute allowedRoles={["admin", "warehouse"]}>
              <InventoryPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/stock-report"
          element={
            <ProtectedRoute allowedRoles={["admin", "warehouse"]}>
              <StockReportPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/expenses"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <ExpensesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profit-report"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <ProfitReportPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/audit-logs"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AuditLogsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <SettingsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/users"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <UsersPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}