import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "../pages/Login";
import Logout from "../pages/Logout";
import Dashboard from "../pages/Dashboard";
import UserManager from "../pages/UserManager";
import NavbarLayout from "../layouts/NavbarLayout";
import ProtectedRoute from "./ProtectedRoute";
import StatisticsPage from "../pages/Statistics";
import PostGrades from "../pages/PostGrades";
import ViewGrades from "../pages/ViewGrades";
import ReviewRequests from "../pages/ReviewRequests";



const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Login />} />
        <Route path="/logout" element={<Logout />} />

        {/* Protected layout for all logged-in users */}
        <Route
          element={
            <ProtectedRoute>
              <NavbarLayout />
            </ProtectedRoute>
          }
        >
          {/* Accessible to all authenticated users */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/statistics" element={<StatisticsPage />} />
          <Route path="/postgrades" element={<PostGrades />} />

          {/* Admin-only route */}

          {/* Institution-only route */}
          <Route
            path="/user-manager"
            element={
              <ProtectedRoute requiredRole="institution">
                <UserManager />
              </ProtectedRoute>
            }
          />
          <Route
            path="/viewgrades"
            element={
              <ProtectedRoute requiredRole="student">
                <ViewGrades />
              </ProtectedRoute>
            }
          />
          <Route
            path="/review-requests"
            element={
              <ProtectedRoute requiredRole="instructor">
                <ReviewRequests />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Catch-all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;
