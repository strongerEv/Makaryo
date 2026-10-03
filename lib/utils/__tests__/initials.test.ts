import { describe, expect, it } from "vitest";

import { initials } from "@/lib/utils/initials";

describe("initials", () => {
  it("mengambil huruf depan dua kata pertama", () => {
    expect(initials("Enhas Nurhasim")).toBe("EN");
    expect(initials("Siti Nurhaliza Ramadhani")).toBe("SN");
  });

  it("mengambil dua huruf untuk nama satu kata", () => {
    expect(initials("Jarwo")).toBe("JA");
  });

  it("tahan terhadap spasi berlebih dan tanda baca", () => {
    expect(initials("  ani   lestari ")).toBe("AL");
    expect(initials("M. Rizky")).toBe("MR");
    expect(initials("Nur-Aini Safitri")).toBe("NS");
  });

  it("tidak pernah mengembalikan untaian kosong", () => {
    expect(initials("")).toBe("?");
    expect(initials("   ")).toBe("?");
    expect(initials("---")).toBe("?");
  });

  it("menghormati jumlah huruf yang diminta", () => {
    expect(initials("Budi Santoso Wijaya", 3)).toBe("BSW");
    expect(initials("Budi", 3)).toBe("BUD");
  });
});
