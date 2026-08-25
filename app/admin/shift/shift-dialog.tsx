"use client";

import { Pencil, Plus } from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import { createShiftAction, updateShiftAction, type ActionState } from "@/app/admin/shift/actions";
import { Alert } from "@/components/ui/alert";
import { buttonClass } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { SubmitButton } from "@/components/ui/submit-button";
import type { Shift } from "@/lib/types/database";

const INITIAL: ActionState = {};

const COLORS = [
  { value: "primary", label: "Ungu" },
  { value: "coral", label: "Merah" },
  { value: "amber", label: "Kuning" },
  { value: "emerald", label: "Hijau" },
  { value: "sky", label: "Biru" },
];

/** Satu dialog untuk membuat maupun mengubah shift. */
export function ShiftDialog({
  mode,
  shift,
  nextSortOrder = 1,
}: {
  mode: "create" | "edit";
  shift?: Shift;
  nextSortOrder?: number;
}) {
  const [open, setOpen] = useState(false);
  const action = mode === "create" ? createShiftAction : updateShiftAction;
  const [state, formAction] = useActionState(action, INITIAL);

  useEffect(() => {
    if (state.success) setOpen(false);
  }, [state.success]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={buttonClass({ variant: mode === "create" ? "primary" : "ghost", size: mode === "create" ? "md" : "sm" })}
      >
        {mode === "create" ? (
          <>
            <Plus className="size-4" aria-hidden />
            Tambah shift
          </>
        ) : (
          <>
            <Pencil className="size-4" aria-hidden />
            Ubah
          </>
        )}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={mode === "create" ? "Tambah shift" : `Ubah ${shift?.name}`}
        description="Shift yang melewati tengah malam boleh diisi — jam selesai lebih kecil berarti berakhir keesokan hari."
      >
        <form action={formAction} className="space-y-4">
          {state.error ? <Alert tone="error">{state.error}</Alert> : null}
          {shift ? <input type="hidden" name="shiftId" value={shift.id} /> : null}

          <Field label="Nama shift" htmlFor={`name-${shift?.id ?? "new"}`} required>
            <Input
              id={`name-${shift?.id ?? "new"}`}
              name="name"
              required
              minLength={2}
              defaultValue={shift?.name ?? ""}
              placeholder="Contoh: Shift Pagi"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Jam mulai" htmlFor={`start-${shift?.id ?? "new"}`} required>
              <Input
                id={`start-${shift?.id ?? "new"}`}
                name="startTime"
                type="time"
                required
                defaultValue={shift?.start_time?.slice(0, 5) ?? "06:00"}
              />
            </Field>
            <Field label="Jam selesai" htmlFor={`end-${shift?.id ?? "new"}`} required>
              <Input
                id={`end-${shift?.id ?? "new"}`}
                name="endTime"
                type="time"
                required
                defaultValue={shift?.end_time?.slice(0, 5) ?? "11:00"}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Host minimum" htmlFor={`min-${shift?.id ?? "new"}`} required>
              <Input
                id={`min-${shift?.id ?? "new"}`}
                name="minHosts"
                type="number"
                min={0}
                max={99}
                required
                defaultValue={shift?.min_hosts ?? 1}
              />
            </Field>
            <Field label="Urutan tampil" htmlFor={`order-${shift?.id ?? "new"}`}>
              <Input
                id={`order-${shift?.id ?? "new"}`}
                name="sortOrder"
                type="number"
                min={0}
                max={99}
                defaultValue={shift?.sort_order ?? nextSortOrder}
              />
            </Field>
            <Field label="Warna" htmlFor={`color-${shift?.id ?? "new"}`}>
              <Select id={`color-${shift?.id ?? "new"}`} name="color" defaultValue={shift?.color ?? "primary"}>
                {COLORS.map((color) => (
                  <option key={color.value} value={color.value}>
                    {color.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setOpen(false)} className={buttonClass({ variant: "ghost" })}>
              Batal
            </button>
            <SubmitButton pendingLabel="Menyimpan…">
              {mode === "create" ? "Tambah shift" : "Simpan perubahan"}
            </SubmitButton>
          </div>
        </form>
      </Modal>
    </>
  );
}
