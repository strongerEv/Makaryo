"use client";

import { useState } from "react";

import { buttonClass } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

export type ConfirmRequest = {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
};

/** Konfirmasi ringan untuk perubahan simulasi yang menghapus isi. */
export function useConfirm() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);

  const dialog = (
    <Modal
      open={request !== null}
      onClose={() => setRequest(null)}
      title={request?.title ?? ""}
      description={request?.description}
    >
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setRequest(null)} className={buttonClass({ variant: "ghost" })}>
          Batal
        </button>
        <button
          type="button"
          onClick={() => {
            request?.onConfirm();
            setRequest(null);
          }}
          className={buttonClass({ variant: "danger" })}
        >
          {request?.confirmLabel}
        </button>
      </div>
    </Modal>
  );

  return { ask: setRequest, dialog };
}
