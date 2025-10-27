import React from "react";
import { Navigate } from "react-router-dom";
import { authService } from "../services/authService";

const ProtectedRoute = ({
  children,
  requiredRole,
}: {
  children: React.ReactElement;
  requiredRole?: string;
}) => {
  const token = authService.getToken();
  const user = authService.getUser();

  if (!token) {
    alert("Access denied. Please log in.");
    return <Navigate to="/" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    alert("You do not have permission to access this page.");
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
