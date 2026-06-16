import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import AuthLayout from "../layouts/AuthLayout";
import { getCurrentUser, getHomeRouteForRole, login } from "../services/authService";

export default function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("admin@demo.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");

  useEffect(() => {
    const currentUser = getCurrentUser();

    if (currentUser) {
      navigate(getHomeRouteForRole(currentUser.role), { replace: true });
    }
  }, [navigate]);

  function handleLogin() {
    const user = login(email, password);

    if (!user) {
      setError("Invalid email or password");
      return;
    }

    navigate(getHomeRouteForRole(user.role), { replace: true });
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="mb-2 text-center text-3xl font-bold">POS SaaS</h1>
        <p className="mb-8 text-center text-sm text-slate-500">
          Sign in to continue
        </p>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium">Email</label>
          <input
            type="email"
            className="w-full rounded-xl border p-3"
            placeholder="Enter email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium">Password</label>
          <input
            type="password"
            className="w-full rounded-xl border p-3"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button
          className="w-full rounded-xl bg-blue-600 p-3 font-semibold text-white hover:bg-blue-700"
          onClick={handleLogin}
        >
          Login
        </button>

        <div className="mt-4 text-center text-sm">
          <Link to="/signup" className="text-blue-600 hover:underline">
            Create Account
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}