"use client";

import { useActionState, useState } from "react";

import { reviewLeaveRequestAction, type ActionState } from "@/app/admin/approval/actions";
import { Alert } from "@/components/ui/alert";
import { buttonClass } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { SubmitButton } from "@/components/ui/submit-button";

const INITIAL: ActionState = {};

export function ReviewActions({ requestId, hostName }: { requestId: string; hostName: string }) {
  const [state, review] = useActionState(reviewLeaveRequestAction, INITIAL);
  const [rejectOpen, setRejectOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {state.error ? (
        <Alert tone="error" className="w-full">
          {state.error}
        </Alert>
      ) : null}

      <form action={review}>
        <input type="hidden" name="requestId" value={requestId} />
        <input type="hidden" name="decision" value="approved" />
        <SubmitButton size="sm" variant="success" pendingLabel="…">
          Setujui
        </SubmitButton>
      </form>

      <button type="button" onClick={() => setRejectOpen(true)} className={buttonClass({ variant: "outline", size: "sm" })}>
        Tolak
      </button>

      <Modal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title={`Tolak pengajuan ${hostName}`}
        description="Alasan penolakan dikirim ke host bersama notifikasi."
      >
        <form
          action={(formData) => {
            review(formData);
            setRejectOpen(false);
          }}
          className="space-y-4"
        >
          <input type="hidden" name="requestId" value={requestId} />
          <input type="hidden" name="decision" value="rejected" />
          <Field label="Alasan penolakan" htmlFor={`reject-${requestId}`} required>
            <Textarea
              id={`reject-${requestId}`}
              name="note"
              rows={3}
              required
              minLength={5}
              placeholder="Contoh: shift hari itu sudah kekurangan host."
            />
          </Field>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setRejectOpen(false)} className={buttonClass({ variant: "ghost" })}>
              Batal
            </button>
            <SubmitButton variant="danger" pendingLabel="Menolak…">
              Tolak pengajuan
            </SubmitButton>
          </div>
        </form>
      </Modal>
    </div>
  );
}
