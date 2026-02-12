import { Link } from "react-router-dom";
import AppLayout from "./components/AppLayout";

function Tile({ title, desc, to }) {
    return (
        <Link
            to={to}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition"
        >
            <div className="text-base font-semibold text-slate-900">{title}</div>
            <div className="mt-1 text-sm text-slate-600">{desc}</div>
            <div className="mt-5 text-sm font-medium text-slate-900">Beheren →</div>
        </Link>
    );
}

export default function AdminPage() {
    return (
        <AppLayout
            title="Admin"
            subtitle="Beheer vaste lijsten voor de applicatie."
        >
            <div className="grid sm:grid-cols-3 gap-4">
                <Tile
                    title="Gordels"
                    desc="Lijst van gordels (wit, geel, ...)."
                    to="/admin/lookups/belts"
                />
                <Tile
                    title="Leeftijdscategorieën"
                    desc="U11, U13, U15, U18, ..."
                    to="/admin/lookups/age_categories"
                />
                <Tile
                    title="Gewichtscategorieën"
                    desc="-46 kg, -50 kg, -55 kg, ..."
                    to="/admin/lookups/weight_categories"
                />
            </div>
        </AppLayout>
    );
}
