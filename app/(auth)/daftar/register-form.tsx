"use client";

import { useActionState } from "react";

import { signUpAction, type AuthState } from "@/app/(auth)/actions";
import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

const INITIAL: AuthState = {};

export function RegisterForm() {
  const [state, formAction] = useActionState(signUpAction, INITIAL);

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}

      <Field label="Nama lengkap" htmlFor="fullName" required>
        <Input id="fullName" name="fullName" autoComplete="name" placeholder="Nama sesuai KTP" required />
      </Field>

      <Field label="Email" htmlFor="email" required hint="Dipakai untuk masuk ke aplikasi.">
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="nama@email.com"
          required
        />
      </Field>

      <Field label="Nomor HP aktif" htmlFor="phone" required>
        <Input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="08xxxxxxxxxx"
          required
        />
      </Field>

      <Field label="Kata sandi" htmlFor="password" required hint="Minimal 8 karakter.">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          placeholder="••••••••"
          required
        />
      </Field>

      <SubmitButton block size="lg" pendingLabel="Mendaftarkan…">
        Daftar
      </SubmitButton>
    </form>
  );
}
