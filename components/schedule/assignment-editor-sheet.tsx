"use client";

import { Trash2 } from "lucide-react";
import { useActionState, useEffect } from "react";

import {
  assignHostAction,
  removeAssignmentAction,
  updateAssignmentAction,
  type ActionState,
} from "@/app/admin/jadwal/actions";
import { Alert } from "@/components/ui/alert";
import { buttonClass } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatClock, formatDate } from "@/lib/utils/datetime";

const INITIAL: ActionState = {};

export type EditorShift = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
};

export type EditorHost = {
  id: string;
  name: string;
};

/**
 * Penugasan yang sedang dibuka editornya.
 *
 * `id` kosong berarti mode tambah — host dan shiftnya belum ada, tinggal dipilih.
 */
export type EditorTarget = {
  id: string | null;
  hostId: string;
  shiftId: string;
  workDate: string;
  hostName?: string;
  status?: "draft" | "published" | "cancelled";
};

/**
 * Satu-satunya formulir edit penugasan, dipakai tampilan harian, mingguan, dan
 * bulanan. Semua tampilan memakai aturan dan pesan galat yang sama karena
 * memanggil server action yang sama.
 *
 * Pemanggilnya wajib merender komponen ini hanya ketika ada target — dengan
 * begitu tiap pembukaan dimulai dari status aksi yang bersih, bukan menampilkan
 * sisa pesan dari penugasan yang diedit sebelumnya.
 */
export function AssignmentEditorSheet({
  target,
  shifts,
  hosts,
  onClose,
}: {
  target: EditorTarget;
  shifts: EditorShift[];
  hosts: EditorHost[];
  onClose: () => void;
}) {
  const [saveState, save] = useActionState(
    target.id ? updateAssignmentAction : assignHostAction,
    INITIAL,
  );
  const [removeState, remove] = useActionState(removeAssignmentAction, INITIAL);

  const berhasil = saveState.success ?? removeState.success;
  const galat = saveState.error ?? removeState.error;

  useEffect(() => {
    if (berhasil) onClose();
    // `onClose` sengaja tidak diikutkan: pemanggilnya kerap memberi fungsi baru
    // tiap render, dan itu akan menutup dialog berulang kali.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [berhasil]);

  const modeTambah = target.id === null;

  return (
    <Modal
      open
      onClose={onClose}
      title={modeTambah ? "Tambah penugasan" : "Ubah penugasan"}
      description={
        modeTambah
          ? formatDate(target.workDate)
          : `${target.hostName ?? "Host"} · ${formatDate(target.workDate)}`
      }
    >
      <div className="space-y-4">
        {galat ? <Alert tone="error">{galat}</Alert> : null}

        {target.status === "published" ? (
          <Alert tone="info">
            Penugasan ini sudah terbit dan terlihat host. Perubahannya akan dikabarkan ke mereka.
          </Alert>
        ) : null}

        <form action={save} className="space-y-4">
          {target.id ? <input type="hidden" name="assignmentId" value={target.id} /> : null}

          <Field label="Host" htmlFor="editor-host" required>
            <Select id="editor-host" name="hostId" defaultValue={target.hostId} required>
              {modeTambah ? (
                <option value="" disabled>
                  Pilih host…
                </option>
              ) : null}
              {hosts.map((host) => (
                <option key={host.id} value={host.id}>
                  {host.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Shift" htmlFor="editor-shift" required>
            <Select id="editor-shift" name="shiftId" defaultValue={target.shiftId} required>
              {shifts.map((shift) => (
                <option key={shift.id} value={shift.id}>
                  {shift.name} · {formatClock(shift.startTime)}–{formatClock(shift.endTime)}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Tanggal" htmlFor="editor-tanggal" required>
            <Input id="editor-tanggal" name="workDate" type="date" defaultValue={target.workDate} required />
          </Field>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className={buttonClass({ variant: "ghost" })}>
              Batal
            </button>
            <SubmitButton pendingLabel="Menyimpan…">{modeTambah ? "Tambahkan" : "Simpan"}</SubmitButton>
          </div>
        </form>

        {target.id ? (
          <form action={remove} className="border-t border-line pt-4">
            <input type="hidden" name="assignmentId" value={target.id} />
            <SubmitButton block variant="outline" pendingLabel="Menghapus…">
              <Trash2 className="size-4 text-coral" aria-hidden />
              Hapus penugasan ini
            </SubmitButton>
          </form>
        ) : null}
      </div>
    </Modal>
  );
}
