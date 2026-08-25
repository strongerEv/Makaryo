"use client";

import { useActionState } from "react";

import { changeOwnPasswordAction, type FormState } from "@/app/(host)/profil/actions";
import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

const INITIAL: FormState = {};

export function ChangePasswordForm() {
  const [state, formAction] = useActionState(changeOwnPasswordAction, INITIAL);

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}

      <Field label="Kata sandi baru" htmlFor="new-password" required hint="Minimal 8 karakter.">
        <Input id="new-password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </Field>

      <Field label="Ulangi kata sandi baru" htmlFor="new-password-confirm" required>
        <Input
          id="new-password-confirm"
          name="passwordConfirmation"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </Field>

      <SubmitButton variant="outline" pendingLabel="Menyimpan…">
        Ubah kata sandi
      </SubmitButton>
    </form>
  );
}
