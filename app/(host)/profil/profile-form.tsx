"use client";

import { useActionState, useState } from "react";

import { updateOwnProfileAction, type FormState } from "@/app/(host)/profil/actions";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Field, Input, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { Profile } from "@/lib/types/database";

const INITIAL: FormState = {};

export function ProfileForm({ profile, avatarUrl }: { profile: Profile; avatarUrl: string | null }) {
  const [state, formAction] = useActionState(updateOwnProfileAction, INITIAL);
  const [preview, setPreview] = useState<string | null>(avatarUrl);

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}

      <div className="flex items-center gap-4">
        <Avatar name={profile.full_name} src={preview} size="lg" />
        <div className="min-w-0">
          <label
            htmlFor="avatar"
            className="inline-flex cursor-pointer items-center rounded-full bg-primary-soft px-4 py-2 text-[13px] font-semibold text-primary hover:bg-primary/15"
          >
            Ganti foto
          </label>
          <input
            id="avatar"
            name="avatar"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) setPreview(URL.createObjectURL(file));
            }}
          />
          <p className="mt-1.5 text-[12px] text-ink-muted">JPG, PNG, atau WebP. Maksimal 3 MB.</p>
        </div>
      </div>

      <Field label="Nama lengkap" htmlFor="fullName" required>
        <Input id="fullName" name="fullName" defaultValue={profile.full_name} required minLength={3} />
      </Field>

      <Field label="Nomor HP aktif" htmlFor="phone">
        <Input id="phone" name="phone" type="tel" inputMode="tel" defaultValue={profile.phone ?? ""} />
      </Field>

      <Field label="Tanggal lahir" htmlFor="birthDate">
        <Input id="birthDate" name="birthDate" type="date" defaultValue={profile.birth_date ?? ""} />
      </Field>

      <Field label="Alamat domisili" htmlFor="address">
        <Textarea id="address" name="address" rows={3} defaultValue={profile.address ?? ""} />
      </Field>

      <SubmitButton pendingLabel="Menyimpan…">Simpan perubahan</SubmitButton>
    </form>
  );
}
