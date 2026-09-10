"use client";

import { CheckCircle2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { buttonClass } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

/**
 * Kabar berhasil setelah akun dihapus.
 *
 * Penghapusan dilakukan dari halaman detail orang itu sendiri, jadi setelah
 * selesai admin dialihkan ke daftar pengguna — kalau tetap di sana, halamannya
 * memuat profil yang sudah tidak ada dan tampil kosong. Pesannya dibawa lewat
 * parameter alamat, lalu parameternya dibersihkan begitu dialog ditutup supaya
 * tidak muncul lagi saat halaman dimuat ulang.
 */
export function DeletedDialog({ message }: { message: string }) {
  const router = useRouter();
  // Alamat halaman saat ini, bukan alamat tetap — supaya pembersihannya tetap
  // benar walau komponen ini dipakai di halaman lain.
  const pathname = usePathname();
  const [open, setOpen] = useState(true);

  const tutup = () => {
    setOpen(false);
    router.replace(pathname);
  };

  if (!open) return null;

  return (
    <Modal open onClose={tutup} title="Akun dihapus" className="sm:max-w-[440px]">
      <div className="flex gap-3">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-soft text-emerald">
          <CheckCircle2 className="size-5" aria-hidden />
        </span>
        <p className="text-[13px] leading-relaxed text-ink">{message}</p>
      </div>

      <div className="mt-5 flex justify-end">
        <button type="button" onClick={tutup} className={buttonClass({ variant: "primary" })}>
          Mengerti
        </button>
      </div>
    </Modal>
  );
}
