import { Navigate } from "react-router-dom";
import { getCurrentUser } from "../services/authService";

type Props = {
  children: React.ReactNode;
};

export default function AdminRoute({
  children,
}: Props) {

  const user = getCurrentUser();

  if (!user) {
    return <Navigate to="/" />;
  }

  if (user.role !== "admin") {
    return (
      <div className="p-10 text-red-600 text-2xl">
        Access Denied
      </div>
    );
  }

  return children;
}