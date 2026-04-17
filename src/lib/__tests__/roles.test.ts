/**
 * Smoke tests for src/lib/roles.ts (TEST-01).
 * Covers normalization and the four role-guard helpers.
 */
import {
  getDefaultAppRouteForRole,
  getRoleLabel,
  isCreatorRole,
  isFieldStaffRole,
  isMobileSupportedRole,
  isVeterinaryRole,
  normalizeRole,
} from "@/src/lib/roles";

describe("normalizeRole", () => {
  it("normalizes common inputs", () => {
    expect(normalizeRole("admin")).toBe("admin");
    expect(normalizeRole("Admin")).toBe("admin");
    expect(normalizeRole("ADMIN")).toBe("admin");
  });

  it("normalizes veterinary variants", () => {
    expect(normalizeRole("veterinaria")).toBe("veterinario");
    expect(normalizeRole("veterinário")).toBe("veterinario");
    expect(normalizeRole("vet")).toBe("veterinario");
    expect(normalizeRole("veterinary")).toBe("veterinario");
  });

  it("normalizes creator variants", () => {
    expect(normalizeRole("criador")).toBe("criador");
    expect(normalizeRole("breeder")).toBe("breeder");
  });

  it("normalizes field staff variants", () => {
    expect(normalizeRole("peao")).toBe("peao");
    expect(normalizeRole("peão")).toBe("peao");
    expect(normalizeRole("funcionario")).toBe("funcionario");
    expect(normalizeRole("employee")).toBe("employee");
  });

  it("handles null, undefined and empty", () => {
    expect(normalizeRole(null)).toBe("unknown");
    expect(normalizeRole(undefined)).toBe("unknown");
    expect(normalizeRole("")).toBe("unknown");
  });

  it("returns unknown for unrecognized roles", () => {
    expect(normalizeRole("foo")).toBe("unknown");
    expect(normalizeRole("super-user")).toBe("unknown");
  });
});

describe("isCreatorRole", () => {
  it("accepts criador and breeder", () => {
    expect(isCreatorRole("criador")).toBe(true);
    expect(isCreatorRole("breeder")).toBe(true);
    expect(isCreatorRole("CRIADOR")).toBe(true);
  });

  it("rejects other roles", () => {
    expect(isCreatorRole("admin")).toBe(false);
    expect(isCreatorRole("vet")).toBe(false);
    expect(isCreatorRole("peao")).toBe(false);
    expect(isCreatorRole(null)).toBe(false);
    expect(isCreatorRole(undefined)).toBe(false);
  });
});

describe("isVeterinaryRole", () => {
  it("accepts vet variants", () => {
    expect(isVeterinaryRole("vet")).toBe(true);
    expect(isVeterinaryRole("veterinario")).toBe(true);
    expect(isVeterinaryRole("veterinária")).toBe(true);
    expect(isVeterinaryRole("veterinary")).toBe(true);
  });

  it("rejects other roles", () => {
    expect(isVeterinaryRole("criador")).toBe(false);
    expect(isVeterinaryRole("breeder")).toBe(false);
    expect(isVeterinaryRole("peao")).toBe(false);
    expect(isVeterinaryRole(null)).toBe(false);
  });
});

describe("isFieldStaffRole", () => {
  it("accepts peao, funcionario, employee", () => {
    expect(isFieldStaffRole("peao")).toBe(true);
    expect(isFieldStaffRole("peão")).toBe(true);
    expect(isFieldStaffRole("funcionario")).toBe(true);
    expect(isFieldStaffRole("employee")).toBe(true);
  });

  it("rejects other roles", () => {
    expect(isFieldStaffRole("criador")).toBe(false);
    expect(isFieldStaffRole("vet")).toBe(false);
    expect(isFieldStaffRole("admin")).toBe(false);
    expect(isFieldStaffRole(null)).toBe(false);
  });
});

describe("isMobileSupportedRole", () => {
  it("accepts all three supported personas", () => {
    expect(isMobileSupportedRole("criador")).toBe(true);
    expect(isMobileSupportedRole("breeder")).toBe(true);
    expect(isMobileSupportedRole("vet")).toBe(true);
    expect(isMobileSupportedRole("veterinario")).toBe(true);
    expect(isMobileSupportedRole("peao")).toBe(true);
    expect(isMobileSupportedRole("funcionario")).toBe(true);
    expect(isMobileSupportedRole("employee")).toBe(true);
  });

  it("rejects unknown, admin, assessor and advisor", () => {
    expect(isMobileSupportedRole("admin")).toBe(false);
    expect(isMobileSupportedRole("assessor")).toBe(false);
    expect(isMobileSupportedRole("advisor")).toBe(false);
    expect(isMobileSupportedRole("unknown-role")).toBe(false);
    expect(isMobileSupportedRole(null)).toBe(false);
    expect(isMobileSupportedRole(undefined)).toBe(false);
  });
});

describe("getDefaultAppRouteForRole", () => {
  it("routes field staff to campo", () => {
    expect(getDefaultAppRouteForRole("peao")).toBe("/(app)/(tabs)/campo");
    expect(getDefaultAppRouteForRole("funcionario")).toBe("/(app)/(tabs)/campo");
  });

  it("routes vet to veterinaria", () => {
    expect(getDefaultAppRouteForRole("vet")).toBe("/(app)/(tabs)/veterinaria");
  });

  it("routes creator to inicio", () => {
    expect(getDefaultAppRouteForRole("criador")).toBe("/(app)/(tabs)/inicio");
    expect(getDefaultAppRouteForRole("breeder")).toBe("/(app)/(tabs)/inicio");
  });

  it("routes unsupported to unsupported screen", () => {
    expect(getDefaultAppRouteForRole("admin")).toBe("/(app)/unsupported");
    expect(getDefaultAppRouteForRole(null)).toBe("/(app)/unsupported");
  });
});

describe("getRoleLabel", () => {
  it("returns pt-BR labels per role", () => {
    expect(getRoleLabel("admin")).toBe("Administrador");
    expect(getRoleLabel("criador")).toBe("Criador");
    expect(getRoleLabel("breeder")).toBe("Criador");
    expect(getRoleLabel("vet")).toBe("Veterinária");
    expect(getRoleLabel("peao")).toBe("Peão");
    expect(getRoleLabel("assessor")).toBe("Assessor");
    expect(getRoleLabel(null)).toBe("Perfil desconhecido");
  });
});
