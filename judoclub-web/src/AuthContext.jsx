import { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      const res = await api.get("/api/me", { headers: { Accept: "application/json" } });
      setUser(res.data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(email, password) {
    await api.get("/sanctum/csrf-cookie");
    await api.post("/login", { email, password }, { headers: { Accept: "application/json" } });
    await refresh();
  }

  async function logout() {
    await api.post("/logout", {}, { headers: { Accept: "application/json" } });
    setUser(null);
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
