"use client";

import { ArrowLeftRight } from "lucide-react";
import { useActionState, useState } from "react";

import { submitSwapRequestAction, type ActionState } from "@/app/(host)/tukar-shift/actions";
import { Alert } from "@/components/ui/alert";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

const INITIAL: ActionState = {};

export type SwapOption = {
  assignmentId: string;
  hostName: string;
  label: string;
  workDate: string;
};

export function SwapRequestForm({
  mine,
  others,
}: {
  mine: SwapOption[];
  others: SwapOption[];
}) {
  const [state, formAction] = useActionState(submitSwapRequestAction, INITIAL);
  const [milikku, setMilikku] = useState(mine[0]?.assignmentId ?? "");

  // Menukar dua shift di hari yang sama tidak masuk akal — orangnya tetap harus
  // ada di dua tempat. Jadi tanggal yang sama dengan pilihan sendiri disaring.
  const tanggalku = mine.find((item) => item.assignmentId === milikku)?.workDate;
  const tujuanTersedia = others.filter((item) => item.workDate !== tanggalku);

  if (mine.length === 0) {
    return (
      <Card>
        <CardHeader title="Ajukan tukar shift" description="Tukar salah satu shiftmu dengan host lain." />
        <Alert tone="info">
          Belum ada shiftmu yang bisa ditukar. Tukar shift hanya berlaku untuk jadwal yang sudah terbit dan
          minimal H-1 sebelum tanggalnya.
        </Alert>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Ajukan tukar shift"
        description="Pilih shiftmu, lalu shift host lain yang mau ditukar. Admin yang menyetujui."
      />

      {state.error ? (
        <Alert tone="error" className="mb-3">
          {state.error}
        </Alert>
      ) : null}
      {state.success ? (
        <Alert tone="success" className="mb-3">
          {state.success}
        </Alert>
      ) : null}

      <form action={formAction} className="space-y-4">
        <Field label="Shiftmu" htmlFor="shift-milikku" required>
          <Select
            id="shift-milikku"
            name="requesterAssignmentId"
            value={milikku}
            onChange={(event) => setMilikku(event.target.value)}
            required
          >
            {mine.map((item) => (
              <option key={item.assignmentId} value={item.assignmentId}>
                {item.label}
              </option>
            ))}
          </Select>
        </Field>

        <div className="flex justify-center">
          <span className="inline-flex size-9 items-center justify-center rounded-full bg-primary-soft text-primary">
            <ArrowLeftRight className="size-4" aria-hidden />
          </span>
        </div>

        <Field
          label="Ditukar dengan"
          htmlFor="shift-tujuan"
          required
          hint="Hanya shift host lain yang sudah terbit dan minimal H-1."
        >
          <Select id="shift-tujuan" name="targetAssignmentId" defaultValue="" required>
            <option value="" disabled>
              Pilih shift host lain…
            </option>
            {tujuanTersedia.map((item) => (
              <option key={item.assignmentId} value={item.assignmentId}>
                {item.hostName} — {item.label}
              </option>
            ))}
          </Select>
        </Field>

        {tujuanTersedia.length === 0 ? (
          <Alert tone="warning">
            Tidak ada shift host lain yang bisa ditukar dengan pilihanmu saat ini.
          </Alert>
        ) : null}

        <Field label="Alasan" htmlFor="alasan-tukar" hint="Opsional, tapi membantu admin memutuskan.">
          <Textarea id="alasan-tukar" name="reason" rows={3} maxLength={500} placeholder="Contoh: ada acara keluarga." />
        </Field>

        <SubmitButton block disabled={tujuanTersedia.length === 0} pendingLabel="Mengirim…">
          Ajukan tukar shift
        </SubmitButton>
      </form>
    </Card>
  );
}
