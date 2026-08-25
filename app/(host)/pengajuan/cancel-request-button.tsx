"use client";

import { useActionState } from "react";

import { cancelLeaveRequestAction, type ActionState } from "@/app/(host)/pengajuan/actions";
import { SubmitButton } from "@/components/ui/submit-button";

const INITIAL: ActionState = {};

export function CancelRequestButton({ requestId }: { requestId: string }) {
  const [, cancel] = useActionState(cancelLeaveRequestAction, INITIAL);

  return (
    <form action={cancel}>
      <input type="hidden" name="requestId" value={requestId} />
      <SubmitButton size="sm" variant="ghost" pendingLabel="…">
        Batalkan
      </SubmitButton>
    </form>
  );
}
