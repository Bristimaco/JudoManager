export default function Button({ children, variant = "primary", ...props }) {
    const base =
        "px-4 py-2 rounded-xl font-medium transition focus:outline-none focus:ring-4";

    const variants = {
        primary:
            "bg-slate-900 text-black hover:bg-slate-800 focus:ring-slate-200",
        secondary:
            "bg-slate-100 text-slate-900 hover:bg-slate-200 focus:ring-slate-200",
        danger:
            "bg-red-600 text-red hover:bg-red-500 focus:ring-red-200",
    };

    return (
        <button className={`${base} ${variants[variant]}`} {...props}>
            {children}
        </button>
    );
}
