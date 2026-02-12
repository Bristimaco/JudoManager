export function Button({ variant = "default", className = "", ...props }) {
    const base =
        "appearance-none inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium transition focus:outline-none focus:ring-4 disabled:opacity-60";

    const variants = {
        default:
            "bg-white text-slate-900 border border-slate-300 hover:bg-slate-100 focus:ring-slate-200",
        primary:
            "bg-white text-slate-900 border border-slate-300 hover:bg-slate-100 focus:ring-slate-200",
        blue:
            "bg-white text-slate-900 border border-slate-300 hover:bg-slate-100 focus:ring-slate-200",
        secondary:
            "bg-white text-slate-900 border border-slate-300 hover:bg-slate-100 focus:ring-slate-200",
        danger:
            "bg-white text-slate-900 border border-slate-300 hover:bg-slate-100 focus:ring-slate-200",
    };

    return (
        <button
            className={`${base} ${variants[variant] ?? variants.default} ${className}`}
            {...props}
        />
    );
}

export function Input({ className = "", ...props }) {
    return (
        <input
            className={
                "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none transition " +
                "focus:ring-4 focus:ring-slate-200 focus:border-slate-300 " +
                className
            }
            {...props}
        />
    );
}

export function Select({ className = "", children, ...props }) {
    return (
        <select
            className={
                "w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none transition " +
                "focus:ring-4 focus:ring-slate-200 focus:border-slate-300 " +
                className
            }
            {...props}
        >
            {children}
        </select>
    );
}

export function Alert({ variant = "error", children }) {
    const styles =
        variant === "error"
            ? "bg-red-50 border-red-200 text-red-700"
            : "bg-emerald-50 border-emerald-200 text-emerald-700";
    return <div className={`rounded-xl border px-4 py-3 text-sm ${styles}`}>{children}</div>;
}

export function Badge({ tone = "neutral", children }) {
    const tones = {
        neutral: "bg-slate-100 text-slate-600",
        ok: "bg-emerald-50 text-emerald-700",
        warn: "bg-amber-50 text-amber-700",
    };
    return (
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${tones[tone]}`}>
            {children}
        </span>
    );
}
