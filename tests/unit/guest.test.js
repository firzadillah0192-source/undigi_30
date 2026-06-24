/**
 * Unit tests for guest.js — core pure functions
 * Tests: buildGreeting (Requirement 1.3, 1.4)
 */
import { describe, it, expect } from "vitest";
import { buildGreeting } from "../../assets/js/guest.js";

describe("buildGreeting", () => {
  // Requirement 1.3 — URL ?to= disertakan
  it("mengandung nama tamu secara verbatim", () => {
    const name = "Budi Santoso";
    const result = buildGreeting(name);
    expect(result).toContain(name);
  });

  it("mengembalikan salam lengkap dengan nama", () => {
    expect(buildGreeting("Dewi")).toBe("Kepada Yth. Dewi");
  });

  it("mendukung nama dengan spasi dan karakter khusus", () => {
    const name = "Bpk. Ahmad & Ibu Siti";
    expect(buildGreeting(name)).toContain(name);
  });

  // Requirement 1.4 — ?to= tidak disertakan atau kosong
  it("menggunakan teks default jika nama null", () => {
    expect(buildGreeting(null)).toBe("Kepada Yth. Tamu Undangan");
  });

  it("menggunakan teks default jika nama undefined", () => {
    expect(buildGreeting(undefined)).toBe("Kepada Yth. Tamu Undangan");
  });

  it("menggunakan teks default jika nama string kosong", () => {
    expect(buildGreeting("")).toBe("Kepada Yth. Tamu Undangan");
  });

  it("menggunakan teks default jika nama hanya spasi", () => {
    expect(buildGreeting("   ")).toBe("Kepada Yth. Tamu Undangan");
  });

  it("menggunakan teks default jika bukan string", () => {
    // @ts-expect-error — test edge case non-string
    expect(buildGreeting(42)).toBe("Kepada Yth. Tamu Undangan");
  });
});
