import { Link } from "react-router-dom";

import { getCurrentUser, getRoleLabel, logout } from "../services/authService";

export default function Navbar() {
  const currentUser = getCurrentUser();

  return (
    <header className="flex items-center justify-between border-b bg-white px-6 py-4 shadow-sm">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
      </div>

      <div className="flex items-center gap-3">
        {currentUser ? (
          <>
            <div className="text-right">
              <div className="text-sm font-semibold text-slate-900">
                {currentUser.name}
              </div>
              <div className="text-xs text-slate-500">
                {getRoleLabel(currentUser.role)}
              </div>
            </div>

            <button
              onClick={() => {
                logout();
                window.location.href = "/";
              }}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              Logout
            </button>
          </>
        ) : (
          <Link
            to="/"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            Login
          </Link>
        )}
      </div>
    </header>
  );
}