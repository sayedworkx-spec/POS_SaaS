import { useMemo, useState } from "react";

import MainLayout from "../layouts/MainLayout";
import {
  createUser,
  deleteUser,
  getUsers,
  updateUser,
  getRoleLabel,
} from "../services/authService";
import type { User, UserRole } from "../types/User";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>(() => getUsers());
  const [search, setSearch] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("cashier");

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return users;
    }

    return users.filter((user) => {
      return (
        user.name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        user.role.toLowerCase().includes(term)
      );
    });
  }, [users, search]);

  function refreshUsers() {
    setUsers(getUsers());
  }

  function handleCreateUser() {
    try {
      createUser({
        name,
        email,
        password,
        role,
      });

      setName("");
      setEmail("");
      setPassword("");
      setRole("cashier");
      refreshUsers();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to create user");
    }
  }

  function handleToggleActive(user: User) {
    updateUser(user.id, { isActive: !user.isActive });
    refreshUsers();
  }

  function handleRoleChange(user: User, nextRole: UserRole) {
    updateUser(user.id, { role: nextRole });
    refreshUsers();
  }

  function handleDelete(userId: number) {
    const ok = window.confirm("Delete this user?");
    if (!ok) return;

    deleteUser(userId);
    refreshUsers();
  }

  return (
    <MainLayout>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage roles and access permissions
          </p>
        </div>

        <div className="w-full lg:w-80">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border p-3"
            placeholder="Search users..."
          />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
        <section className="rounded-2xl bg-white p-6 shadow">
          <h2 className="mb-5 text-xl font-bold">Create User</h2>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border p-3"
                placeholder="Full name"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border p-3"
                placeholder="Email"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border p-3"
                placeholder="Password"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full rounded-xl border p-3"
              >
                <option value="cashier">Cashier</option>
                <option value="warehouse">Warehouse</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <button
              onClick={handleCreateUser}
              className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700"
            >
              Create User
            </button>
          </div>
        </section>

        <section className="rounded-2xl bg-white shadow overflow-hidden">
          <div className="border-b p-5">
            <h2 className="text-xl font-bold">Users List</h2>
            <p className="mt-1 text-sm text-slate-500">
              Edit role, status, or delete a user
            </p>
          </div>

          <div className="max-h-[76vh] overflow-auto">
            {filteredUsers.length === 0 ? (
              <div className="p-6 text-slate-500">No users found</div>
            ) : (
              filteredUsers.map((user) => (
                <div key={user.id} className="border-b p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="font-semibold">{user.name}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        {user.email}
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        Role: {getRoleLabel(user.role)}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <select
                        value={user.role}
                        onChange={(e) =>
                          handleRoleChange(user, e.target.value as UserRole)
                        }
                        className="rounded-xl border px-3 py-2 text-sm"
                      >
                        <option value="admin">Admin</option>
                        <option value="cashier">Cashier</option>
                        <option value="warehouse">Warehouse</option>
                      </select>

                      <button
                        onClick={() => handleToggleActive(user)}
                        className={`rounded-xl px-4 py-2 text-sm font-medium ${
                          user.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {user.isActive ? "Active" : "Inactive"}
                      </button>

                      <button
                        onClick={() => handleDelete(user.id)}
                        className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </MainLayout>
  );
}