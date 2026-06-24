/**
 * Unit tests for validateGuestbook (guestbook.js)
 * Requirements: 10.1, 10.2, 10.3
 */
import { describe, it, expect } from "vitest";
import { validateGuestbook } from "../../assets/js/guestbook.js";

describe("validateGuestbook", () => {
  // --- Valid cases ---
  it("returns true when sender_name and message are both valid", () => {
    expect(validateGuestbook({ sender_name: "Budi", message: "Selamat!" })).toBe(true);
  });

  it("returns true when message is exactly 500 characters", () => {
    const msg = "a".repeat(500);
    expect(validateGuestbook({ sender_name: "Ani", message: msg })).toBe(true);
  });

  // --- sender_name failures ---
  it("returns false when sender_name is empty string", () => {
    expect(validateGuestbook({ sender_name: "", message: "Selamat!" })).toBe(false);
  });

  it("returns false when sender_name is only whitespace", () => {
    expect(validateGuestbook({ sender_name: "   ", message: "Selamat!" })).toBe(false);
  });

  it("returns false when sender_name is missing (undefined)", () => {
    expect(validateGuestbook({ sender_name: undefined, message: "Selamat!" })).toBe(false);
  });

  // --- message failures ---
  it("returns false when message is empty string", () => {
    expect(validateGuestbook({ sender_name: "Budi", message: "" })).toBe(false);
  });

  it("returns false when message is only whitespace", () => {
    expect(validateGuestbook({ sender_name: "Budi", message: "   " })).toBe(false);
  });

  it("returns false when message exceeds 500 characters", () => {
    const msg = "b".repeat(501);
    expect(validateGuestbook({ sender_name: "Budi", message: msg })).toBe(false);
  });

  it("returns false when message is undefined", () => {
    expect(validateGuestbook({ sender_name: "Budi", message: undefined })).toBe(false);
  });

  // --- both fields invalid ---
  it("returns false when both fields are empty", () => {
    expect(validateGuestbook({ sender_name: "", message: "" })).toBe(false);
  });
});
