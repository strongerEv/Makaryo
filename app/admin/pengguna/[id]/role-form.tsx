"use client";

import { ShieldCheck } from "lucide-react";
import { useActionState } from "react";

import { updateUserRoleAction, type ActionState } from "@/app/admin/pengguna/actions";
import { Alert } from "@/components/ui/alert";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { ROLE_LABEL, type UserRole } from "@/lib/types/database";

const INITIAL: ActionState = {};

const ROLES: { value: UserRole; description: string }[] = [
  { value: "host", description: "Hanya melihat dan mengisi datanya sendiri." },
  { value: "admin", description: "Mengelola jadwal, absensi, approval, dan laporan." },
  { value: "super_admin", description: "Semua hak admin, plus mengubah peran pengguna." },
];

/**
 * Pengubah peran — hanya dirender untuk super admin.
 *
 * Admin biasa tidak melihat kartu ini sama sekali, dan andaikan formulirnya
 * dipaksa terkirim, server action menolaknya lewat requireSuperAdmin.
 */
export function RoleForm({
  userId,
  userName,
  currentRole,
  isSelf,
}: {
  userId: string;
  userName: string;
  currentRole: UserRole;
  isSelf: boolean;
}) {
  const [state, ubah] = useActionState(updateUserRoleAction, INITIAL);

  return (
    <Card>
      <CardHeader
        title="Peran pengguna"
        description="Menentukan bagian aplikasi mana yang bisa dibuka."
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

      {isSelf ? (
        <Alert tone="info" className="mb-3">
          Ini akunmu sendiri. Menurunkan peranmu akan langsung mencabut aksesmu ke halaman ini.
        </Alert>
      ) : null}

      <form action={ubah} className="space-y-4">
        <input type="hidden" name="userId" value={userId} />

        <Field label={`Peran ${userName}`} htmlFor="peran-pengguna" required>
          <Select id="peran-pengguna" name="role" defaultValue={currentRole} required>
            {ROLES.map((role) => (
              <option key={role.value} value={role.value}>
                {ROLE_LABEL[role.value]}
              </option>
            ))}
          </Select>
        </Field>

        <ul className="space-y-1.5 rounded-[var(--radius-md)] bg-surface-muted p-3.5">
          {ROLES.map((role) => (
            <li key={role.value} className="text-[12px] leading-snug text-ink-muted">
              <span className="font-semibold text-ink">{ROLE_LABEL[role.value]}</span> — {role.description}
            </li>
          ))}
        </ul>

        <SubmitButton block pendingLabel="Menyimpan…">
          <ShieldCheck className="size-4" aria-hidden />
          Simpan peran
        </SubmitButton>
      </form>
    </Card>
  );
}
