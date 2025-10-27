import axios from "axios";

const API = import.meta.env.VITE_API_BASE_URL;

export const authService = {
  login: async (username: string, password: string) => {
    const response = await axios.post(`${API}/auth/login`, {
      username,
      password,
    });

    localStorage.setItem("token", response.data.token);
    localStorage.setItem("user", JSON.stringify({
      username,
      role: response.data.role,
      id: response.data.id, // optional
    }));

    return response.data;
  },

  logout: async () => {
  const token = localStorage.getItem("token");

  if (!token) {
    console.warn("⚠️ Logout skipped: no token found.");
    return;
  }

  try {
    const response = await axios.post(
      `${API}/auth/logout`,
      {},
      {
        headers: {
          "X-OBSERVATORY-AUTH": token,
        },
        validateStatus: () => true, // handle all statuses manually
      }
    );

    if (response.status === 200) {
      console.log("✅ Logout succeeded:", response.status);
    } else {
      console.warn("❌ Logout failed. Status:", response.status);
    }
  } catch (err: any) {
    console.error("❌ Logout threw error:", err.message || err);
  } finally {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    console.log("🧹 Local storage cleared.");
  }
},

  getToken: () => localStorage.getItem("token"),

  getUser: () => {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  },

  isAuthenticated: () => !!localStorage.getItem("token"),

  getAuthHeaders: () => {
    const token = localStorage.getItem("token");
    return {
      "X-OBSERVATORY-AUTH": token,
    };
  },
};
