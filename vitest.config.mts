import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
  // tsconfig memakai jsx: "preserve" karena Next yang mengubahnya saat build.
  // Vitest tidak lewat Next, jadi transformasinya diminta di sini — tanpa ini,
  // test yang memuat modul .tsx gagal terurai.
  oxc: { jsx: { runtime: "automatic" } },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
      // Lihat test/stubs/server-only.ts.
      "server-only": fileURLToPath(new URL("./test/stubs/server-only.ts", import.meta.url)),
    },
  },
});
