import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../AuthContext";

function NavItem({ to, children }) {
    const { pathname } = useLocation();
    const active = pathname === to || pathname.startsWith(to + "/");

    return (
        <Link
            to={to}
            className={
                "px-3 py-2 rounded-lg text-sm font-medium transition " +
                (active
                    ? "bg-white/15 text-white"
                    : "text-white/80 hover:text-white hover:bg-white/10")
            }
        >
            {children}
        </Link>
    );
}

export default function AppLayout({ title, subtitle, actions, children }) {
    const { user, logout } = useAuth();

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="bg-gradient-to-r from-slate-900 to-slate-700 text-white shadow">
                <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-white/10 grid place-items-center font-bold">
                            J
                        </div>
                        <div>
                            <div className="text-base font-semibold leading-tight">JudoClub Admin</div>
                            <div className="text-xs text-white/70">Leden & toernooien</div>
                        </div>
                    </div>

                    <nav className="hidden sm:flex items-center gap-1">
                        <NavItem to="/">Home</NavItem>
                        <NavItem to="/members">Leden</NavItem>
                        <NavItem to="/admin">Admin</NavItem>
                    </nav>

                    <div className="flex items-center gap-3">
                        <div className="hidden sm:block text-right">
                            <div className="text-sm font-medium">{user?.email}</div>
                            <div className="text-xs text-white/70">Ingelogd</div>
                        </div>

                        <button
                            type="button"
                            onClick={logout}
                            className="appearance-none inline-flex items-center justify-center
           rounded-xl px-4 py-2 text-sm font-semibold
           bg-red-600 text-white
           hover:bg-red-700
           focus:outline-none focus:ring-4 focus:ring-red-200
           transition"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-5xl px-4 py-8">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
                        {subtitle && <p className="text-sm text-slate-600 mt-1">{subtitle}</p>}
                    </div>
                    {actions && <div className="flex gap-2">{actions}</div>}
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    {children}
                </div>
            </main>
        </div>
    );
}
