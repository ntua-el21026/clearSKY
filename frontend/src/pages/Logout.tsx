import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/authService";

const Logout = () => {
  const logoutCalled = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (logoutCalled.current) return;
    logoutCalled.current = true;

    const doLogout = async () => {
      await authService.logout();
      navigate("/"); // redirect to login page
    };

    doLogout();
  }, [navigate]);

  return <div className="p-6 text-center">Logging out...</div>;
};

export default Logout;
