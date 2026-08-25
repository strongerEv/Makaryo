"use client";

import { useActionState } from "react";

import { resetPasswordAction, type AuthState } from "@/app/(auth)/actions";
import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

const INITIAL: AuthState = {};

export function ResetPasswordForm() {
  const [state, formAction] = useActionState(resetPasswordAction, INITIAL);

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}

      <Field label="Kata sandi baru" htmlFor="password" required hint="Minimal 8 karakter.">
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </Field>

      <Field label="Ulangi kata sandi baru" htmlFor="passwordConfirmation" required>
        <Input
          id="passwordConfirmation"
          name="passwordConfirmation"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </Field>

      <SubmitButton block size="lg" pendingLabel="Menyimpan…">
        Simpan kata sandi
      </SubmitButton>
    </form>
  );
}
