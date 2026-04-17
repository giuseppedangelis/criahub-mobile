/**
 * Fuzz-smoke test: normalizeRole must never throw for arbitrary strings.
 */
import { normalizeRole } from "@/src/lib/roles";

function randomString(maxLen: number): string {
  const len = Math.floor(Math.random() * maxLen);
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 _-áéíóúàâêôãõç!@#$%^&*()";
  let out = "";
  for (let i = 0; i < len; i += 1) {
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return out;
}

describe("normalizeRole smoke", () => {
  it("does not throw for 100 random inputs", () => {
    for (let i = 0; i < 100; i += 1) {
      const input = randomString(32);
      expect(() => normalizeRole(input)).not.toThrow();
      const result = normalizeRole(input);
      // Always returns a non-empty string (NormalizedRole union)
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    }
  });

  it("handles nullish and empty inputs without throwing", () => {
    expect(() => normalizeRole(null)).not.toThrow();
    expect(() => normalizeRole(undefined)).not.toThrow();
    expect(() => normalizeRole("")).not.toThrow();
  });
});
