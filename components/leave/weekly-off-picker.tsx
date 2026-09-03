import { cn } from "@/lib/utils/cn";
import { WEEKDAY_LABELS, weekdayIndex } from "@/lib/utils/period";
import { todayInJakarta } from "@/lib/utils/datetime";

export type DateAvailability = {
  taken: number;
  mine: boolean;
};

/**
 * Pemilih tanggal libur mingguan berbentuk kalender.
 *
 * Host tidak bisa melihat pengajuan host lain, jadi yang ditampilkan hanyalah
 * penuh atau tidaknya sebuah tanggal — bukan siapa yang mengambilnya.
 */
export function WeeklyOffPicker({
  dates,
  availability,
  quota,
  name = "requestedDate",
}: {
  dates: string[];
  availability: Record<string, DateAvailability>;
  quota: number;
  name?: string;
}) {
  const today = todayInJakarta();
  const leadingBlanks = dates.length > 0 ? weekdayIndex(dates[0]) : 0;

  return (
    <div>
      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-ink-muted">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1" role="radiogroup" aria-label="Tanggal libur mingguan">
        {Array.from({ length: leadingBlanks }).map((_, index) => (
          <span key={`blank-${index}`} aria-hidden />
        ))}

        {dates.map((date) => {
          const info = availability[date];
          const penuh = (info?.taken ?? 0) >= quota;
          const punyaSendiri = info?.mine ?? false;
          const lewat = date < today;
          const nonaktif = penuh || punyaSendiri || lewat;

          return (
            <label
              key={date}
              className={cn(
                "group relative block",
                nonaktif ? "cursor-not-allowed" : "cursor-pointer",
              )}
            >
              <input
                type="radio"
                name={name}
                value={date}
                disabled={nonaktif}
                required
                className="peer sr-only"
              />
              <span
                className={cn(
                  "flex h-14 flex-col items-center justify-center rounded-[12px] border text-[13px] font-bold transition-colors",
                  "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary",
                  punyaSendiri
                    ? "border-emerald bg-emerald-soft text-[#1f8a51]"
                    : penuh || lewat
                      ? "border-line bg-surface-muted text-ink-muted/60"
                      : "border-line bg-surface text-ink hover:border-primary peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white",
                )}
              >
                {Number(date.slice(8, 10))}
                <span className="mt-0.5 text-[9px] font-semibold tracking-wide uppercase">
                  {punyaSendiri ? (
                    "kamu"
                  ) : penuh ? (
                    "penuh"
                  ) : lewat ? (
                    "lewat"
                  ) : (
                    <>
                      <span className="group-has-checked:hidden">kosong</span>
                      <span className="hidden group-has-checked:inline">dipilih</span>
                    </>
                  )}
                </span>
              </span>
            </label>
          );
        })}
      </div>

      <ul className="mt-3 flex flex-wrap gap-3 text-[11px] text-ink-muted">
        <li className="flex items-center gap-1.5">
          <span className="size-3 rounded border border-line bg-surface" aria-hidden />
          Tersedia
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-3 rounded border border-line bg-surface-muted" aria-hidden />
          Sudah diambil host lain
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-3 rounded border border-emerald bg-emerald-soft" aria-hidden />
          Pengajuanmu
        </li>
      </ul>

      {quota > 1 ? (
        <p className="mt-2 text-[11px] text-ink-muted">
          Tiap tanggal boleh diambil sampai {quota} host.
        </p>
      ) : null}
    </div>
  );
}
