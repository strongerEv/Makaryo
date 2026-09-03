import { cn } from "@/lib/utils/cn";

/**
 * Logo Makaryo.
 *
 * `tone="light"` dipakai di atas latar gelap — misalnya panel ungu di halaman
 * masuk — supaya teksnya tetap terbaca.
 */
export function Brand({
  className,
  compact,
  tone = "dark",
  size = "md",
}: {
  className?: string;
  compact?: boolean;
  tone?: "dark" | "light";
  size?: "md" | "lg";
}) {
  const terang = tone === "light";

  return (
    <span className={cn("inline-flex items-center", size === "lg" ? "gap-3" : "gap-2.5", className)}>
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-[14px] font-black",
          size === "lg" ? "size-11 rounded-[16px] text-[18px]" : "size-9 text-[15px]",
          terang ? "bg-white text-primary" : "bg-primary text-white",
        )}
      >
        M
      </span>
      {!compact ? (
        <span
          className={cn(
            "font-extrabold tracking-tight",
            size === "lg" ? "text-[21px]" : "text-[17px]",
            terang ? "text-white" : "text-ink",
          )}
        >
          Makaryo
        </span>
      ) : null}
    </span>
  );
}
