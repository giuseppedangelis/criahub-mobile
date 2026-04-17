/**
 * Smoke tests for animal-scoping invariants (TEST-01 / RLS-03).
 *
 * Verifies that animalsService.list returns an empty paginated response
 * when harasId is missing — a critical safety net that prevents accidental
 * cross-haras queries from the client side (RLS is the real guard, but the
 * client-side check avoids the request entirely).
 *
 * Note: fetchRelative is a private helper inside animals.ts (not exported).
 * Exhaustive per-branch testing of its Supabase interaction would require
 * a heavy supabase-js mock; we instead cover the public shape guarantees
 * here and leave Supabase integration coverage to the web repo + RLS.
 */

// Keep this mock hoist-safe: jest.mock() is hoisted above imports.
jest.mock("@/src/lib/supabase", () => ({
  supabase: {
    from: jest.fn(() => {
      throw new Error("supabase.from should not be called when haras_id is missing");
    }),
  },
}));

import { animalsService } from "@/src/services/animals";

describe("animalsService.list scoping", () => {
  it("returns empty paginated response when haras_id is missing (no supabase call)", async () => {
    const result = await animalsService.list({}, { page: 1, limit: 20 });
    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.totalPages).toBeGreaterThanOrEqual(1);
  });

  it("returns empty paginated response when haras_id is null/undefined", async () => {
    const result = await animalsService.list(
      { haras_id: undefined as unknown as string },
      { page: 1, limit: 10 },
    );
    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
  });
});
