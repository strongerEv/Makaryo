"use client";

import { Eye, EyeOff } from "lucide-react";
import { useId, useState, type ComponentProps } from "react";

import { Input } from "@/components/ui/field";
import { cn } from "@/lib/utils/cn";

/**
 * Isian yang tersembunyi sampai tombol matanya ditekan.
 *
 * Dipakai bukan hanya untuk kata sandi: email pun layak disembunyikan saat
 * masuk dari ponsel di tempat ramai, karena alamat email sudah cukup untuk
 * mengenali seseorang dan mengincar akunnya.
 *
 * Saat tersembunyi, jenis isiannya dipaksa menjadi `password` — hanya itu cara
 * peramban menyamarkan isi bawaan. `visibleType` menyimpan jenis aslinya agar
 * papan ketik ponsel dan pemeriksaan bawaan peramban kembali benar begitu
 * isinya ditampilkan.
 */
export function SecretInput({
  visibleType = "text",
  label,
  className,
  ...props
}: Omit<ComponentProps<"input">, "type"> & {
  visibleType?: "text" | "email";
  /** Disebut pada tombolnya, mis. "email" → "Tampilkan email". */
  label: string;
}) {
  const [terlihat, setTerlihat] = useState(false);
  const bantuan = useId();

  return (
    <div className="relative">
      <Input
        {...props}
        type={terlihat ? visibleType : "password"}
        className={cn("pr-12", className)}
        aria-describedby={bantuan}
      />

      <button
        type="button"
        onClick={() => setTerlihat((sebelum) => !sebelum)}
        aria-pressed={terlihat}
        aria-controls={props.id}
        className="absolute inset-y-0 right-0 inline-flex w-12 items-center justify-center rounded-r-[var(--radius-md)] text-ink-muted transition-colors hover:text-ink focus:text-ink focus:outline-none"
      >
        {terlihat ? <EyeOff className="size-[18px]" aria-hidden /> : <Eye className="size-[18px]" aria-hidden />}
        <span className="sr-only">{terlihat ? `Sembunyikan ${label}` : `Tampilkan ${label}`}</span>
      </button>

      <span id={bantuan} className="sr-only">
        {terlihat ? `${label} sedang ditampilkan` : `${label} disembunyikan`}
      </span>
    </div>
  );
}
