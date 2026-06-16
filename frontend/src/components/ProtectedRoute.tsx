import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

import { getCurrentUser, getHomeRouteForRole, hasAccess } from "../services/authService";
import type { UserRole } from "../types/User";

type Props = {
  children: ReactNode;
  allowedRoles?: UserRole[];
};

export default function ProtectedRoute({ children, allowedRoles }: Props) {
  const currentUser = getCurrentUser();

  if (!currentUser) {
    return <Navigate to="/" replace />;
  }

  if (!hasAccess(currentUser.role, allowedRoles)) {
    return <Navigate to={getHomeRouteForRole(currentUser.role)} replace />;
  }

  return <>{children}</>;
}