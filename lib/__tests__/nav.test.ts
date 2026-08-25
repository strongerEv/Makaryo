import { describe, expect, it } from "vitest";

import { ADMIN_NAV, HOST_NAV } from "@/components/layout/nav";
import { NAV_ICONS } from "@/components/layout/nav-icons";

/**
 * Kerangka aplikasi dirender di server sementara navigasinya berjalan di browser.
 * Menaruh komponen ikon di daftar menu membuat seluruh halaman setelah login gagal
 * dimuat, jadi bentuk datanya dikunci lewat pengujian ini.
 */
describe("daftar menu", () => {
  const items = [...HOST_NAV, ...ADMIN_NAV];

  it("menyimpan ikon sebagai nama, bukan komponen", () => {
    for (const item of items) {
      expect(typeof item.icon).toBe("string");
    }
  });

  it("hanya memuat nilai yang bisa dikirim ke browser", () => {
    expect(() => JSON.stringify(items)).not.toThrow();
    for (const item of items) {
      for (const value of Object.values(item)) {
        expect(["string", "boolean"]).toContain(typeof value);
      }
    }
  });

  it("punya ikon terdaftar untuk setiap menu", () => {
    for (const item of items) {
      expect(NAV_ICONS[item.icon]).toBeTruthy();
    }
  });

  it("menyediakan menu utama untuk bottom nav host", () => {
    expect(HOST_NAV.filter((item) => item.primary).length).toBeGreaterThanOrEqual(4);
  });
});
