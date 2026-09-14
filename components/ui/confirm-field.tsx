import { Field, Input } from "@/components/ui/field";
import { KATA_KONFIRMASI } from "@/lib/utils/confirm";

/**
 * Kotak "ketik HAPUS" yang dipakai setiap dialog penghapusan.
 *
 * Dibuat satu komponen agar nama field, kata kuncinya, dan cara menyebutnya
 * selalu sama di seluruh aplikasi — kalau ditulis ulang tiap tempat, cepat atau
 * lambat salah satunya meminta kata yang berbeda dari yang diperiksa server.
 */
export function ConfirmField({
  id,
  hint,
  disabled,
}: {
  id: string;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <Field label={`Ketik ${KATA_KONFIRMASI} untuk konfirmasi`} htmlFor={id} hint={hint} required>
      <Input
        id={id}
        name="confirmation"
        required
        autoComplete="off"
        spellCheck={false}
        placeholder={KATA_KONFIRMASI}
        disabled={disabled}
      />
    </Field>
  );
}
