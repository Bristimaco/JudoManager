import { useEffect, useState } from "react";
import { api } from "./api";
import { Link, useNavigate, useParams } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import { Alert, Badge, Button, Input, Select } from "./components/ui";
import { formatDateBE } from "./utils/date";
import DatePickerInput from "./components/DatePickerInput";

export default function MemberDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [gender, setGender] = useState("");
  const [birthdate, setBirthdate] = useState(""); // ISO yyyy-mm-dd of ""
  const [belt, setBelt] = useState("");
  const [active, setActive] = useState(true);

  const [belts, setBelts] = useState([]);
  const [beltsLoading, setBeltsLoading] = useState(true);

  const [ageCategory, setAgeCategory] = useState("");
  const [ageCategories, setAgeCategories] = useState([]);
  const [ageLoading, setAgeLoading] = useState(true);

  const [weightCategory, setWeightCategory] = useState("");
  const [weightCategories, setWeightCategories] = useState([]);
  const [weightLoading, setWeightLoading] = useState(true);

  const [genderMeta, setGenderMeta] = useState(null); // { values: [...], labels: {...} }
  const [genderMetaLoading, setGenderMetaLoading] = useState(true);

  // ✅ helper: ondersteunt zowel array response als paginator {data, meta, links}
  function pluckData(res) {
    if (!res) return [];
    const d = res.data;
    return Array.isArray(d) ? d : (d?.data ?? []);
  }

  async function loadMeta() {
    setGenderMetaLoading(true);
    try {
      const res = await api.get("/api/meta", { headers: { Accept: "application/json" } });
      setGenderMeta(res?.data?.genders ?? null);
    } catch (e) {
      setGenderMeta(null);
      // niet hard-failen, maar wel info geven
      setError((prev) => prev || `Meta laden mislukt (${e?.response?.status ?? e?.message ?? "no status"})`);
    } finally {
      setGenderMetaLoading(false);
    }
  }

  async function loadWeightCategories(currentGender) {
    if (!currentGender) {
      setWeightCategories([]);
      setWeightLoading(false);
      return;
    }

    setWeightLoading(true);
    try {
      const res = await api.get("/api/lookups", {
        params: { type: "weight_categories", gender: currentGender, per_page: 200, page: 1 },
        headers: { Accept: "application/json" },
      });

      const data = pluckData(res);
      setWeightCategories(data.filter((x) => x.active));
    } catch (e) {
      setWeightCategories([]);
      setError((prev) => prev || `Gewichtscategorieën laden mislukt (${e?.response?.status ?? e?.message ?? "no status"})`);
    } finally {
      setWeightLoading(false);
    }
  }

  async function loadAgeCategories() {
    setAgeLoading(true);
    try {
      const res = await api.get("/api/lookups", {
        params: { type: "age_categories", per_page: 200, page: 1 },
        headers: { Accept: "application/json" },
      });

      const data = pluckData(res);
      setAgeCategories(data.filter((x) => x.active));
    } catch (e) {
      setAgeCategories([]);
      setError((prev) => prev || `Leeftijdscategorieën laden mislukt (${e?.response?.status ?? e?.message ?? "no status"})`);
    } finally {
      setAgeLoading(false);
    }
  }

  async function loadBelts() {
    setBeltsLoading(true);
    try {
      const res = await api.get("/api/lookups", {
        params: { type: "belts", per_page: 200, page: 1 },
        headers: { Accept: "application/json" },
      });

      const data = pluckData(res);
      setBelts(data.filter((x) => x.active));
    } catch (e) {
      setBelts([]);
      setError((prev) => prev || `Gordels laden mislukt (${e?.response?.status ?? e?.message ?? "no status"})`);
    } finally {
      setBeltsLoading(false);
    }
  }

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/api/members/${id}`, { headers: { Accept: "application/json" } });
      const m = res.data;

      setFirstName(m.first_name ?? "");
      setLastName(m.last_name ?? "");
      setLicenseNumber(m.license_number ?? "");
      setGender(m.gender ?? "");
      setBirthdate(m.birthdate ? String(m.birthdate).split("T")[0] : "");
      setBelt(m.belt ?? "");
      setActive(!!m.active);
      setAgeCategory(m.age_category ?? "");
      setWeightCategory(m.weight_category ?? "");

      // ✅ dit kan nu niet meer crashen door paginated lookups
      await loadWeightCategories(m.gender ?? "");
    } catch (e) {
      console.error("MEMBER LOAD ERROR", e);
      setError(`Laden mislukt (${e?.response?.status ?? e?.message ?? "no status"})`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMeta();
    load();
    loadBelts();
    loadAgeCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (loading) return;
    setWeightCategory("");
    loadWeightCategories(gender);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gender]);

  function fe(name) {
    const msgs = fieldErrors?.[name];
    if (!msgs?.length) return null;
    return <div className="mt-1 text-sm text-red-600">{msgs[0]}</div>;
  }

  const genderLabel = (v) => genderMeta?.labels?.[v] ?? v;

  async function onSave(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setFieldErrors({});

    try {
      await api.put(
        `/api/members/${id}`,
        {
          license_number: licenseNumber,
          first_name: firstName,
          last_name: lastName,
          birthdate: birthdate || null,
          belt: belt || null,
          active,
          age_category: ageCategory || null,
          gender: gender || null,
          weight_category: gender ? weightCategory || null : null,
        },
        { headers: { Accept: "application/json" } }
      );

      await load();
    } catch (e) {
      const status = e?.response?.status;
      const data = e?.response?.data;

      if (status === 422 && data?.errors) {
        setFieldErrors(data.errors);
        setError("Controleer de velden.");
      } else {
        setError(`Opslaan mislukt (${status ?? e?.message ?? "no status"})`);
      }
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    const ok = window.confirm("Ben je zeker dat je dit lid wil verwijderen?");
    if (!ok) return;

    setDeleting(true);
    setError("");

    try {
      await api.delete(`/api/members/${id}`, { headers: { Accept: "application/json" } });
      nav("/members");
    } catch (e) {
      setError(`Verwijderen mislukt (${e?.response?.status ?? e?.message ?? "no status"})`);
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <AppLayout title={`Lid #${id}`} subtitle="Gegevens laden...">
        <div className="animate-pulse space-y-3">
          <div className="h-10 bg-slate-100 rounded-xl" />
          <div className="h-10 bg-slate-100 rounded-xl" />
          <div className="h-10 bg-slate-100 rounded-xl" />
          <div className="h-10 bg-slate-100 rounded-xl" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title={`Lid #${id}`}
      subtitle="Bewerk gegevens en beheer status."
      actions={
        <>
          <Link to="/members">
            <Button variant="secondary">← Terug</Button>
          </Link>
          <Badge tone={active ? "ok" : "neutral"}>{active ? "Actief" : "Inactief"}</Badge>
        </>
      }
    >
      {error && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      <form onSubmit={onSave} className="grid gap-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Voornaam</label>
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            {fe("first_name")}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Achternaam</label>
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            {fe("last_name")}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Geboortedatum</label>
            <DatePickerInput
              value={birthdate || null}
              onChange={(iso) => setBirthdate(iso ?? "")}
              placeholder="Kies geboortedatum..."
            />
            {birthdate && <div className="mt-1 text-xs text-slate-500">Weergave: {formatDateBE(birthdate)}</div>}
            {fe("birthdate")}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Leeftijdscategorie</label>
            <Select value={ageCategory} onChange={(e) => setAgeCategory(e.target.value)} disabled={ageLoading}>
              <option value="">{ageLoading ? "Leeftijdscategorieën laden..." : "— Geen / kies —"}</option>
              {ageCategories.map((c) => (
                <option key={c.id} value={c.label}>
                  {c.label}
                </option>
              ))}
            </Select>
            {fe("age_category")}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Geslacht</label>
            <Select value={gender ?? ""} onChange={(e) => setGender(e.target.value)} disabled={genderMetaLoading || !genderMeta}>
              <option value="">{genderMetaLoading ? "Geslachten laden..." : "— Geen / kies —"}</option>
              {(genderMeta?.values ?? []).map((v) => (
                <option key={v} value={v}>
                  {genderLabel(v)}
                </option>
              ))}
            </Select>
            {fe("gender")}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Gordel</label>
            <Select value={belt ?? ""} onChange={(e) => setBelt(e.target.value)} disabled={beltsLoading}>
              <option value="">{beltsLoading ? "Gordels laden..." : "— Geen / kies —"}</option>
              {belts.map((b) => (
                <option key={b.id} value={b.label}>
                  {b.label}
                </option>
              ))}
            </Select>
            {fe("belt")}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Gewichtscategorie</label>
            <Select value={weightCategory} onChange={(e) => setWeightCategory(e.target.value)} disabled={!gender || weightLoading}>
              <option value="">
                {!gender ? "Kies eerst geslacht..." : weightLoading ? "Gewichtscategorieën laden..." : "— Geen / kies —"}
              </option>
              {weightCategories.map((c) => (
                <option key={c.id} value={c.label}>
                  {c.label}
                </option>
              ))}
            </Select>
            {fe("weight_category")}
          </div>
          <div />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Licentienummer</label>
            <Input value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} />
            {fe("license_number")}
          </div>
          <div>
            <label className="flex items-center gap-3 select-none">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-200"
              />
              <span className="text-sm text-slate-700">Actief lid</span>
            </label>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button variant="primary" type="submit" disabled={saving}>
            {saving ? "Opslaan..." : "Opslaan"}
          </Button>

          <Button variant="danger" type="button" onClick={onDelete} disabled={deleting} className="sm:ml-auto">
            {deleting ? "Verwijderen..." : "Verwijder"}
          </Button>
        </div>
      </form>
    </AppLayout>
  );
}
