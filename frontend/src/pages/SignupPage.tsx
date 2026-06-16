import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import AuthLayout from "../layouts/AuthLayout";
import { getHomeRouteForRole, signup } from "../services/authService";
import type { UserRole } from "../types/User";

export default function SignupPage() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("cashier");
  const [error, setError] = useState("");

  function handleSignup() {
    try {
      const user = signup({
        name,
        email,
        password,
        role,
      });

      navigate(getHomeRouteForRole(user.role), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create account");
    }
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="mb-2 text-center text-3xl font-bold">Create Account</h1>
        <p className="mb-8 text-center text-sm text-slate-500">
          Add a cashier or warehouse user
        </p>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium">Name</label>
          <input
            type="text"
            className="w-full rounded-xl border p-3"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium">Email</label>
          <input
            type="email"
            className="w-full rounded-xl border p-3"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium">Password</label>
          <input
            type="password"
            className="w-full rounded-xl border p-3"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="w-full rounded-xl border p-3"
          >
            <option value="cashier">Cashier</option>
            <option value="warehouse">Warehouse</option>
          </select>
        </div>

        <button
          className="w-full rounded-xl bg-blue-600 p-3 font-semibold text-white hover:bg-blue-700"
          onClick={handleSignup}
        >
          Create Account
        </button>

        <div className="mt-4 text-center text-sm">
          <Link to="/" className="text-blue-600 hover:underline">
            Back to login
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}