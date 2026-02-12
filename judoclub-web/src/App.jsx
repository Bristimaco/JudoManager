import { useState } from "react";
import { api } from "./api";

export default function App() {
  const [email, setEmail] = useState("admin@judoclub.test");
  const [password, setPassword] = useState("password");
  const [me, setMe] = useState(null);
  const [msg, setMsg] = useState("");

  async function login() {
    setMsg("");
    try {
      // 1) CSRF cookie ophalen
      await api.get("/sanctum/csrf-cookie");
      // 2) login
      await api.post("/login", { email, password });
      setMsg("✅ Logged in");
    } catch (e) {
      console.log("LOGIN ERROR", e?.response?.status, e?.response?.data, e);
      setMsg(`❌ Login failed (${e?.response?.status ?? "no status"})`);
    }
  }

  async function loadMe() {
    setMsg("");
    try {
      const res = await api.get("/api/me");
      setMe(res.data);
      setMsg("✅ /api/me loaded");
    } catch (e) {
      setMe(null);
      setMsg("❌ Not authenticated");
    }
  }

  async function logout() {
    setMsg("");
    await api.post("/api/logout");
    setMe(null);
    setMsg("👋 Logged out");
  }

  return (
    <div style={{ fontFamily: "system-ui", padding: 24, maxWidth: 520 }}>
      <h1>Judo-Manager</h1>

      <div style={{ display: "grid", gap: 8 }}>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password" type="password" />
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={login}>Login</button>
          <button onClick={loadMe}>Who am I?</button>
          <button onClick={logout}>Logout</button>
        </div>
        <p>{msg}</p>
        {me && <pre>{JSON.stringify(me, null, 2)}</pre>}
      </div>
    </div>
  );
}
