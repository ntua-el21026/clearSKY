import React, { useState } from "react";
import axios from "axios";
import { authService } from "../services/authService";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { toast } from "react-toastify";

const UserManager = (): React.ReactElement => {
  const [role, setRole] = useState("student");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [studentId, setStudentId] = useState("");

  const API = import.meta.env.VITE_API_BASE_URL;

  const getPayload = () => {
    const payload: any = { username, password, role };
    if (role === "student") payload.student_id = studentId;
    return payload;
  };

  const handleSubmit = async (type: "register" | "changePassword") => {
    try {
      const endpoint = type === "register" ? "register" : "changePassword";
      await axios.post(`${API}/auth/${endpoint}`, getPayload(), {
        headers: authService.getAuthHeaders(),
      });
      toast.success(
        type === "register"
          ? `User ${username} added successfully!`
          : "Password changed successfully!"
      );
      resetForm();
    } catch (error) {
      console.error(`${type} error:`, error);
      let errorMessage = "Unknown error";
      if (
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as any).response === "object" &&
        (error as any).response !== null &&
        "data" in (error as any).response &&
        typeof (error as any).response.data === "object" &&
        (error as any).response.data !== null &&
        "error" in (error as any).response.data
      ) {
        errorMessage = (error as any).response.data.error;
      }
      toast.error(
        type === "register"
          ? "Error adding user: " + errorMessage
          : "Error changing password: " + errorMessage
      );
    }
  };

  const resetForm = () => {
    setUsername("");
    setPassword("");
    setStudentId("");
  };

  return (
    <div className="grades-page">
      <div className="grades-card">
        <h2 className="grades-title">User Management</h2>
        <p className="grades-subtext">Add new user or change an existing user passsword.</p>

        <div className="grades-parse-grid">
          <div>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="p-2 rounded border border-gray-300 bg-gray-100 text-sm"
            >
              <option value="institution">Institution Representative</option>
              <option value="instructor">Instructor</option>
              <option value="student">Student</option>
            </select>
          </div>

         <div className="register-field">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="Enter your username"
            />
          </div>

          <div className="register-field">
            <label>Password</label>
            <div className="password-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="toggle-password"
                tabIndex={-1}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>
          {role === "student" && (
            <div className="register-field">
              <label>Student ID</label>
              <input
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                required
                placeholder="Enter student ID"
              
              />
            </div>
          )}
        </div>

        <div className="grades-actions">
          <button
            onClick={() => handleSubmit("register")}
            className="confirm-btn"
          >
            Add User
          </button>
          <button
            onClick={() => handleSubmit("changePassword")}
            className="cancel-btn"
          >
            Change Password
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserManager;
