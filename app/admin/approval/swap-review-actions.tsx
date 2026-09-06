"use client";

import { useActionState, useState } from "react";

import { reviewSwapRequestAction, type ActionState } from "@/app/admin/approval/actions";
import { Alert } from "@/components/ui/alert";
import { buttonClass } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { SubmitButton } from "@/components/ui/submit-button";

const INITIAL: ActionState = {};

/** Setujui atau tolak satu pengajuan tukar shift. */
export function SwapReviewActions({ requestId, label }: { requestId: string; label: string }) {
  const [state, review] = useActionState(reviewSwapRequestAction, INITIAL);
  const [tolakTerbuka, setTolakTerbuka] = useState(false);

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
        <SubmitButton size="sm" variant="success" pendingLabel="Menukar…">
          Setujui & tukar
        </SubmitButton>
      </form>

      <button
        type="button"
        onClick={() => setTolakTerbuka(true)}
        className={buttonClass({ variant: "outline", size: "sm" })}
      >
        Tolak
      </button>

      <Modal
        open={tolakTerbuka}
        onClose={() => setTolakTerbuka(false)}
        title="Tolak tukar shift"
        description={label}
      >
        <form
          action={(formData) => {
            review(formData);
            setTolakTerbuka(false);
          }}
          className="space-y-4"
        >
          <input type="hidden" name="requestId" value={requestId} />
          <input type="hidden" name="decision" value="rejected" />

          <Field label="Alasan penolakan" htmlFor={`tolak-tukar-${requestId}`} required>
            <Textarea
              id={`tolak-tukar-${requestId}`}
              name="note"
              rows={3}
              required
              minLength={5}
              placeholder="Contoh: shift itu butuh host yang sudah terbiasa."
            />
          </Field>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setTolakTerbuka(false)}
              className={buttonClass({ variant: "ghost" })}
            >
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
