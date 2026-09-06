"use client";

import { useActionState } from "react";

import { cancelSwapRequestAction, type ActionState } from "@/app/(host)/tukar-shift/actions";
import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";

const INITIAL: ActionState = {};

export function CancelSwapButton({ requestId }: { requestId: string }) {
  const [state, cancel] = useActionState(cancelSwapRequestAction, INITIAL);

  return (
    <form action={cancel}>
      <input type="hidden" name="requestId" value={requestId} />
      <SubmitButton size="sm" variant="ghost" pendingLabel="…">
        Batalkan
      </SubmitButton>
      {state.error ? (
        <Alert tone="error" className="mt-2">
          {state.error}
        </Alert>
      ) : null}
    </form>
  );
}
