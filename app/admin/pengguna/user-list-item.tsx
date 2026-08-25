"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import {
  approveUserAction,
  rejectUserAction,
  setAccountStatusAction,
  type ActionState,
} from "@/app/admin/pengguna/actions";
import { AccountStatusBadge, Badge, EmploymentStatusBadge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Field, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { SubmitButton } from "@/components/ui/submit-button";
import { buttonClass } from "@/components/ui/button";
import type { Profile } from "@/lib/types/database";
import { ROLE_LABEL } from "@/lib/types/database";
import { formatDateShort } from "@/lib/utils/datetime";

const INITIAL: ActionState = {};

export function UserListItem({
  user,
  avatarUrl,
  isSelf,
}: {
  user: Profile;
  avatarUrl: string | null;
  isSelf: boolean;
}) {
  const [approveState, approve] = useActionState(approveUserAction, INITIAL);
  const [rejectState, reject] = useActionState(rejectUserAction, INITIAL);
  const [statusState, changeStatus] = useActionState(setAccountStatusAction, INITIAL);
  const [rejectOpen, setRejectOpen] = useState(false);

  const error = approveState.error ?? rejectState.error ?? statusState.error;

  return (
    <div className="px-4 py-4 sm:px-5 lg:grid lg:grid-cols-[minmax(0,2.2fr)_1fr_1.1fr_1fr_auto] lg:items-center lg:gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar name={user.full_name} src={avatarUrl} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">
            {user.full_name}
            {isSelf ? <span className="ml-1.5 text-[12px] font-medium text-ink-muted">(kamu)</span> : null}
          </p>
          <p className="truncate text-[12px] text-ink-muted">{user.email}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 lg:mt-0 lg:block">
        <Badge tone={user.role === "admin" ? "primary" : "neutral"}>{ROLE_LABEL[user.role]}</Badge>
        <span className="lg:hidden">
          <AccountStatusBadge status={user.account_status} />
        </span>
        <span className="lg:hidden">
          <EmploymentStatusBadge status={user.employment_status} />
        </span>
      </div>

      <div className="hidden lg:block">
        <AccountStatusBadge status={user.account_status} />
      </div>

      <div className="hidden lg:block">
        <EmploymentStatusBadge status={user.employment_status} />
        <p className="mt-1 text-[11px] text-ink-muted">Gabung {formatDateShort(user.join_date)}</p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 lg:mt-0 lg:justify-end">
        {user.account_status === "pending" ? (
          <>
            <form action={approve}>
              <input type="hidden" name="userId" value={user.id} />
              <SubmitButton size="sm" variant="success" pendingLabel="Menyetujui…">
                Setujui
              </SubmitButton>
            </form>
            <button type="button" onClick={() => setRejectOpen(true)} className={buttonClass({ variant: "outline", size: "sm" })}>
              Tolak
            </button>
          </>
        ) : null}

        {(user.account_status === "suspended" || user.account_status === "rejected") && !isSelf ? (
          <form action={changeStatus}>
            <input type="hidden" name="userId" value={user.id} />
            <input type="hidden" name="status" value="active" />
            <SubmitButton size="sm" variant="soft" pendingLabel="Mengaktifkan…">
              Aktifkan
            </SubmitButton>
          </form>
        ) : null}

        <Link href={`/admin/pengguna/${user.id}`} className={buttonClass({ variant: "ghost", size: "sm" })}>
          Detail
        </Link>
      </div>

      {error ? (
        <Alert tone="error" className="mt-3 lg:col-span-5">
          {error}
        </Alert>
      ) : null}

      <Modal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title={`Tolak pendaftaran ${user.full_name}`}
        description="Alasan penolakan akan ditampilkan kepada pendaftar."
      >
        <form
          action={(formData) => {
            reject(formData);
            setRejectOpen(false);
          }}
          className="space-y-4"
        >
          <input type="hidden" name="userId" value={user.id} />
          <Field label="Alasan penolakan" htmlFor={`note-${user.id}`} required>
            <Textarea
              id={`note-${user.id}`}
              name="note"
              rows={3}
              required
              minLength={5}
              placeholder="Contoh: data tidak sesuai, silakan daftar ulang dengan email kantor."
            />
          </Field>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setRejectOpen(false)} className={buttonClass({ variant: "ghost" })}>
              Batal
            </button>
            <SubmitButton variant="danger" pendingLabel="Menolak…">
              Tolak pendaftaran
            </SubmitButton>
          </div>
        </form>
      </Modal>
    </div>
  );
}
