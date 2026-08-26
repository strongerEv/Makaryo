/**
 * Pembangkit angka acak yang dapat diulang.
 * Dipakai agar data contoh terlihat wajar tetapi tetap sama setiap kali dibuat,
 * sehingga hasilnya bisa diuji.
 */
export function createRandom(seed: number) {
  let state = seed >>> 0;

  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    /** Bilangan bulat antara min dan max, keduanya termasuk. */
    int(min: number, max: number) {
      return min + Math.floor(next() * (max - min + 1));
    },
    /** true dengan peluang sebesar probability. */
    chance(probability: number) {
      return next() < probability;
    },
    pick<T>(items: readonly T[]): T {
      return items[Math.floor(next() * items.length)];
    },
  };
}

export type Random = ReturnType<typeof createRandom>;
