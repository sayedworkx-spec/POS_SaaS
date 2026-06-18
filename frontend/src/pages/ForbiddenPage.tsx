import { useNavigate } from "react-router-dom";

export default function ForbiddenPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow">
        <h1 className="text-2xl font-bold">403 - Forbidden</h1>
        <p className="mt-2 text-sm text-slate-500">
          You do not have permission to access this page.
        </p>

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => navigate("/home")}
            className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white"
          >
            Go Home
          </button>
          <button
            onClick={() => navigate(-1)}
            className="rounded-xl border bg-white px-4 py-3 text-sm font-medium"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}