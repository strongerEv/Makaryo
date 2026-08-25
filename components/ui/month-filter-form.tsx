import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import { cn } from "@/lib/utils/cn";
import { recentMonths } from "@/lib/utils/period";

/** Filter periode bulanan yang berjalan tanpa JavaScript (form GET biasa). */
export function MonthFilterForm({
  action,
  value,
  className,
  children,
}: {
  action: string;
  value: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const months = recentMonths();

  return (
    <form action={action} className={cn("flex flex-wrap items-end gap-3", className)}>
      <Field label="Periode" htmlFor="bulan" className="min-w-[200px]">
        <Select id="bulan" name="bulan" defaultValue={value}>
          {months.map((month) => (
            <option key={month.value} value={month.value}>
              {month.label}
            </option>
          ))}
        </Select>
      </Field>
      {children}
      <Button type="submit" variant="outline">
        Terapkan
      </Button>
    </form>
  );
}
