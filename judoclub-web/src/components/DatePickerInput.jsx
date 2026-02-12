import * as Popover from "@radix-ui/react-popover";
import { DayPicker } from "react-day-picker";
import { format, parseISO, isValid } from "date-fns";
import { useMemo } from "react";

// Minimal calendar styling (Tailwind-ish). You can refine later.
const dayPickerClassNames = {
    months: "flex flex-col sm:flex-row gap-4",
    month: "space-y-3",
    caption: "flex justify-between items-center",
    caption_label: "text-sm font-medium text-slate-900",
    nav: "flex items-center gap-2",
    nav_button:
        "h-8 w-8 inline-flex items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50",
    table: "w-full border-collapse space-y-1",
    head_row: "flex",
    head_cell: "w-9 text-xs text-slate-500 font-medium text-center",
    row: "flex w-full mt-1",
    cell: "w-9 h-9 text-center text-sm",
    day: "w-9 h-9 rounded-xl hover:bg-slate-100",
    day_selected: "bg-slate-900 text-white hover:bg-slate-900",
    day_today: "border border-slate-300",
    day_outside: "text-slate-300",
};

function toDate(value) {
    // value can be ISO string 'YYYY-MM-DD' or Date or null
    if (!value) return null;
    if (value instanceof Date) return isValid(value) ? value : null;
    try {
        const d = parseISO(String(value));
        return isValid(d) ? d : null;
    } catch {
        return null;
    }
}

function toIso(value) {
    if (!value) return "";
    try {
        return format(value, "yyyy-MM-dd");
    } catch {
        return "";
    }
}

/**
 * DatePickerInput
 * - value: ISO string (YYYY-MM-DD) OR null/"" OR Date (optional)
 * - onChange: (isoStringOrNull) => void
 */
export default function DatePickerInput({
    value,
    onChange,
    placeholder = "Kies een datum...",
    disabled = false,
}) {
    const selected = useMemo(() => toDate(value), [value]);
    const label = selected ? format(selected, "dd/MM/yyyy") : "";

    const fromYear = 1900;
    const toYear = new Date().getFullYear();

    return (
        <Popover.Root>
            <Popover.Trigger asChild>
                <button
                    type="button"
                    disabled={disabled}
                    className={[
                        "h-10 w-full rounded-xl border border-slate-300 px-3 text-left text-sm",
                        "bg-white hover:bg-slate-50",
                        "disabled:bg-slate-100 disabled:text-slate-500 disabled:hover:bg-slate-100",
                    ].join(" ")}
                >
                    {label ? <span className="text-slate-900">{label}</span> : <span className="text-slate-500">{placeholder}</span>}
                </button>
            </Popover.Trigger>

            <Popover.Portal>
                <Popover.Content
                    sideOffset={8}
                    className="z-50 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg"
                >
                    <DayPicker
                        mode="single"
                        selected={selected ?? undefined}
                        onSelect={(d) => onChange(d ? toIso(d) : null)}
                        captionLayout="dropdown"
                        fromYear={fromYear}
                        toYear={toYear}
                        classNames={dayPickerClassNames}
                    />

                    <div className="flex justify-end gap-2 pt-3">
                        <button
                            type="button"
                            className="h-9 rounded-xl border border-slate-200 px-3 text-sm hover:bg-slate-50"
                            onClick={() => onChange(null)}
                        >
                            Wissen
                        </button>
                        <Popover.Close asChild>
                            <button
                                type="button"
                                className="h-9 rounded-xl bg-slate-900 px-3 text-sm text-white hover:opacity-90"
                            >
                                Sluiten
                            </button>
                        </Popover.Close>
                    </div>
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
}
