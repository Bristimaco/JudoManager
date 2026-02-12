import { useState } from "react";
import { useAuth } from "./AuthContext";
import { useNavigate } from "react-router-dom";
import { Alert, Button, Input } from "./components/ui";

export default function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();

  const [email, setEmail] = useState("admin@judoclub.test");
  const [password, setPassword] = useState("password");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("");
    setLoading(true);
    try {
      await login(email, password);
      nav("/");
    } catch (e) {
      setMsg("Login mislukt. Controleer je email en wachtwoord.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-700 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center text-white">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-white/10 grid place-items-center font-bold text-lg">
            J
          </div>
          <h1 className="mt-4 text-2xl font-semibold">JudoClub Admin</h1>
          <p className="mt-1 text-sm text-white/70">Inloggen om leden te beheren</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6">
          {msg && (
            <div className="mb-4">
              <Alert variant="error">{msg}</Alert>
            </div>
          )}

          <form onSubmit={onSubmit} className="grid gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Email</label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="naam@club.be"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Wachtwoord</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? "Bezig..." : "Login"}
            </Button>
          </form>

          <div className="mt-4 text-xs text-slate-500">
            Tip: later voegen we roles en “wachtwoord vergeten” toe.
          </div>
        </div>
      </div>
    </div>
  );
}
