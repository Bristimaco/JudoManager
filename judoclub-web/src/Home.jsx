import { Link } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import { Button } from "./components/ui";

function Tile({ title, desc, to, accent = "blue", disabled = false }) {
  const accents = {
    blue: "from-blue-700 to-blue-500",
    emerald: "from-emerald-700 to-emerald-500",
  };

  if (disabled) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 opacity-70">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        <div className="mt-1 text-sm text-slate-600">{desc}</div>
        <div className="mt-4 inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
          Binnenkort
        </div>
      </div>
    );
  }

  return (
    <Link
      to={to}
      className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition"
    >
      <div className={"h-10 w-10 rounded-xl grid place-items-center text-white bg-gradient-to-r " + accents[accent]}>
        <span className="font-bold">{title[0]}</span>
      </div>
      <div className="mt-4">
        <div className="text-base font-semibold text-slate-900 group-hover:underline">{title}</div>
        <div className="mt-1 text-sm text-slate-600">{desc}</div>
      </div>
      <div className="mt-5 text-sm font-medium text-slate-900">Open →</div>
    </Link>
  );
}

export default function Home() {
  return (
    <AppLayout
      title="Overzicht"
      subtitle="Beheer leden en straks ook toernooien & inschrijvingen."
      actions={
        <>
          <Link to="/members/new">
            <Button variant="blue">+ Nieuw lid</Button>
          </Link>
        </>
      }
    >
      <div className="grid sm:grid-cols-2 gap-4">
        <Tile
          title="Leden"
          desc="Zoek leden, voeg nieuwe leden toe en beheer profielen."
          to="/members"
          accent="blue"
        />
        <Tile
          title="Toernooien"
          desc="Maak toernooien aan en schrijf leden in (komt straks)."
          to="/tournaments"
          accent="emerald"
          disabled
        />
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <div className="text-sm font-semibold text-slate-900">Volgende stap</div>
        <div className="mt-1 text-sm text-slate-600">
          Na de UI werken we aan <span className="font-medium text-slate-900">Toernooien + Inschrijvingen</span>.
        </div>
      </div>
    </AppLayout>
  );
}
