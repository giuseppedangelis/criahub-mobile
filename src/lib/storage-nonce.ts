/**
 * RLS-04 (D-01/D-02): nonce para impedir enumeração de paths do storage.
 *
 * Gera um token curto e aleatório para injetar no path do arquivo antes do
 * filename. Se um atacante souber `harasId` + `animalId` + `Date.now()`
 * aproximado, ainda não consegue adivinhar o path porque o nonce quebra
 * previsibilidade.
 *
 * Tenta `crypto.randomUUID()` (disponível no JS engine do RN 0.81 via Hermes
 * com polyfill, mas nem sempre). Fallback determinístico usa Date.now() +
 * base36 de Math.random — ~8 chars, entropia equivalente a ~42 bits.
 */
export function storageNonce(): string {
  try {
    const g = globalThis as unknown as { crypto?: { randomUUID?: () => string } };
    if (g.crypto && typeof g.crypto.randomUUID === "function") {
      return g.crypto.randomUUID();
    }
  } catch {
    // cai no fallback
  }
  // Fallback: ~12 chars entropia. Mantém compactação em paths de storage.
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}
