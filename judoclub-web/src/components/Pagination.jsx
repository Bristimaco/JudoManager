import { Button } from "./ui";

export default function Pagination({ meta, onPage }) {
    if (!meta) return null;

    // support: meta as {current_page,...} OR meta as {meta:{...}}
    const m = meta.meta ?? meta;

    const current_page = Number(m.current_page ?? 1);
    const last_page = Number(m.last_page ?? 1);
    const total = Number(m.total ?? 0);

    return (
        <div className="mt-4 flex items-center justify-between gap-3">
            <div className="text-xs text-slate-600">
                Pagina <span className="font-medium text-slate-900">{current_page}</span> van{" "}
                <span className="font-medium text-slate-900">{last_page}</span> • {total} items
            </div>

            <div className="flex gap-2">
                <Button
                    variant="secondary"
                    type="button"
                    onClick={() => onPage(Math.max(1, current_page - 1))}
                    disabled={current_page <= 1}
                >
                    ← Vorige
                </Button>

                <Button
                    variant="secondary"
                    type="button"
                    onClick={() => onPage(Math.min(last_page, current_page + 1))}
                    disabled={current_page >= last_page}
                >
                    Volgende →
                </Button>
            </div>
        </div>
    );
}
