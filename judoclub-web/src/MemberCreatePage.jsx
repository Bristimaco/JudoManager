import { useState } from "react";
import { api } from "./api";
import { Link, useNavigate } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import { Alert, Button, Input, Select } from "./components/ui";
import { formatDateBE } from "./utils/date";
import { useEffect } from "react";

export default function MemberCreatePage() {
  const nav = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [belt, setBelt] = useState("");
  const [active, setActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const [belts, setBelts] = useState([]);
  const [beltsLoading, setBeltsLoading] = useState(true);

  const [ageCategory, setAgeCategory] = useState("");
  const [ageCategories, setAgeCategories] = useState([]);
  const [ageLoading, setAgeLoading] = useState(true);

  const [weightCategory, setWeightCategory] = useState("");
  const [weightCategories, setWeightCategories] = useState([]);
  const [weightLoading, setWeightLoading] = useState(true);

  useEffect(() => {
    loadBelts();
    loadAgeCategories();
    loadWeightCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadWeightCategories() {
    setWeightLoading(true);
    try {
      const res = await api.get("/api/lookups", {
        params: { type: "weight_categories" },
        headers: { Accept: "application/json" },
      });
      setWeightCategories((res.data ?? []).filter((x) => x.active));
    } finally {
      setWeightLoading(false);
    }
  }

  async function loadAgeCategories() {
    setAgeLoading(true);
    try {
      const res = await api.get("/api/lookups", {
        params: { type: "age_categories" },
        headers: { Accept: "application/json" },
      });
      setAgeCategories((res.data ?? []).filter((x) => x.active));
    } finally {
      setAgeLoading(false);
    }
  }

  async function loadBelts() {
    setBeltsLoading(true);
    try {
      const res = await api.get("/api/lookups", {
        params: { type: "belts" },
        headers: { Accept: "application/json" },
      });
      setBelts((res.data ?? []).filter((x) => x.active));
    } finally {
      setBeltsLoading(false);
    }
  }

  function fe(name) {
    const msgs = fieldErrors?.[name];
    if (!msgs?.length) return null;
    return <div className="mt-1 text-sm text-red-600">{msgs[0]}</div>;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setSaving(true);

    try {
      await api.post(
        "/api/members",
        {
          first_name: firstName,
          last_name: lastName,
          birthdate: birthdate || null,
          belt: belt || null,
          active,
          age_category: ageCategory || null,
          weight_category: weightCategory || null,
        },
        { headers: { Accept: "application/json" } }
      );
      nav("/members");
    } catch (e) {
      const status = e?.response?.status;
      const data = e?.response?.data;

      if (status === 422 && data?.errors) {
        setFieldErrors(data.errors);
        setError("Controleer de velden.");
      } else {
        setError(`Opslaan mislukt (${status ?? "no status"})`);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout
      title="Nieuw lid"
      subtitle="Voeg een nieuw lid toe aan de judoclub."
      actions={
        <Link to="/members">
          <Button variant="secondary">← Terug</Button>
        </Link>
      }
    >
      {error && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      <form onSubmit={onSubmit} className="grid gap-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Voornaam</label>
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="bv. Briek" />
            {fe("first_name")}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Achternaam</label>
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="bv. Mattheus" />
            {fe("last_name")}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Geboortedatum</label>
            <Input type="date" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} />
            {birthdate && <div className="mt-1 text-xs text-slate-500">Weergave: {formatDateBE(birthdate)}</div>}
            {fe("birthdate")}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Leeftijdscategorie
            </label>
            <Select
              value={ageCategory}
              onChange={(e) => setAgeCategory(e.target.value)}
              disabled={ageLoading}
            >
              <option value="">
                {ageLoading ? "Leeftijdscategorieën laden..." : "— Kies een categorie —"}
              </option>
              {ageCategories.map((c) => (
                <option key={c.id} value={c.label}>
                  {c.label}
                </option>
              ))}
            </Select>
            {fe("age_category")}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Gewichtscategorie
            </label>
            <Select
              value={weightCategory}
              onChange={(e) => setWeightCategory(e.target.value)}
              disabled={weightLoading}
            >
              <option value="">
                {weightLoading ? "gewichtscategorieën laden..." : "— Kies een categorie —"}
              </option>
              {weightCategories.map((c) => (
                <option key={c.id} value={c.label}>
                  {c.label}
                </option>
              ))}
            </Select>
            {fe("weight_category")}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Gordel</label>
            <Select value={belt} onChange={(e) => setBelt(e.target.value)} disabled={beltsLoading}>
              <option value="">
                {beltsLoading ? "Gordels laden..." : "— Kies een gordel —"}
              </option>
              {belts.map((b) => (
                <option key={b.id} value={b.label}>
                  {b.label}
                </option>
              ))}
            </Select>
            {fe("belt")}
          </div>
        </div>

        <label className="flex items-center gap-3 select-none">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-200"
          />
          <span className="text-sm text-slate-700">Actief lid</span>
        </label>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button variant="blue" type="submit" disabled={saving}>
            {saving ? "Opslaan..." : "Opslaan"}
          </Button>

          <Link to="/members" className="sm:ml-auto">
            <Button variant="secondary" type="button">Annuleer</Button>
          </Link>
        </div>
      </form>
    </AppLayout>
  );
}
