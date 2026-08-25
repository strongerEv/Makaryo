"use client";

import { useActionState } from "react";

import { forgotPasswordAction, type AuthState } from "@/app/(auth)/actions";
import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

const INITIAL: AuthState = {};

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(forgotPasswordAction, INITIAL);

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}

      <Field label="Email" htmlFor="email" required>
        <Input id="email" name="email" type="email" inputMode="email" autoComplete="email" required />
      </Field>

      <SubmitButton block size="lg" pendingLabel="Mengirim…">
        Kirim tautan reset
      </SubmitButton>
    </form>
  );
}
