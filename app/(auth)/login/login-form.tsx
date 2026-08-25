"use client";

import Link from "next/link";
import { useActionState } from "react";

import { signInAction, type AuthState } from "@/app/(auth)/actions";
import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

const INITIAL: AuthState = {};

export function LoginForm({ linkError }: { linkError?: string }) {
  const [state, formAction] = useActionState(signInAction, INITIAL);
  const error = state.error ?? linkError;

  return (
    <form action={formAction} className="space-y-4">
      {error ? <Alert tone="error">{error}</Alert> : null}

      <Field label="Email" htmlFor="email" required>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="nama@email.com"
          required
        />
      </Field>

      <Field label="Kata sandi" htmlFor="password" required>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          required
        />
      </Field>

      <div className="flex justify-end">
        <Link href="/lupa-password" className="text-[13px] font-semibold text-primary hover:underline">
          Lupa kata sandi?
        </Link>
      </div>

      <SubmitButton block size="lg" pendingLabel="Masuk…">
        Masuk
      </SubmitButton>
    </form>
  );
}
