import { Link } from "react-router-dom";
import { authService } from "../services/authService";
import logo from "../assets/clearSkyLogo.png";
import "../styles.css";

interface User {
  role: "institution" | "student" | "instructor" | string;
}

const Navbar = () => {
  const user: User | null = authService.getUser();
  if (!user) return null;

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <img src={logo} alt="ClearSKY Logo" className="logo" />
        <span className="brand-text">clearSKY</span>
      </div>
      <div className="navbar-links">
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/statistics">Statistics</Link>

        {user.role === "institution" && (
          <Link to="/user-manager">User Manager</Link>
        )}
        {user.role === "student" && (
          <Link to="/viewgrades">View Grades</Link>
        )}
        {user.role === "instructor" && (
          <>
            <Link to="/postgrades">Post Grades</Link>
            <Link to="/review-requests">Review Requests</Link>
          </>
        )}
        <Link to="/logout" className="logout-link">Logout</Link>

      </div>
    </nav>

  );
};

export default Navbar;
