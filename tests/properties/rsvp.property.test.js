/**
 * Property tests untuk rsvp.js
 *
 * Validates: Requirements 9.3, 9.4, 19.6
 */

import { it } from "@fast-check/vitest";
import fc from "fast-check";
import { validateRSVP } from "../../assets/js/rsvp.js";

/**
 * Property 7: validateRSVP konsisten dengan semua kombinasi input valid/invalid
 *
 * Untuk sembarang objek data RSVP, validateRSVP(data) harus mengembalikan false
 * jika dan hanya jika salah satu kondisi ini terpenuhi:
 *  - guest_name kosong atau hanya whitespace
 *  - attendance bukan 'hadir' atau 'tidak_hadir'
 *  - guest_count di luar rentang 1–10
 *
 * Validates: Requirements 9.3, 9.4, 19.6
 */
it.prop([
  fc.record({
    guest_name: fc.oneof(
      fc.constant(""),
      fc.string(),
      fc.string({ minLength: 1 }).map((s) => "   " + s + "   ") // string dengan whitespace
    ),
    attendance: fc.oneof(
      fc.constant("hadir"),
      fc.constant("tidak_hadir"),
      fc.string() // termasuk nilai tidak valid
    ),
    guest_count: fc.oneof(
      fc.integer({ min: 1, max: 10 }),   // valid range
      fc.integer({ min: -10, max: 0 }),  // di bawah batas
      fc.integer({ min: 11, max: 20 })   // di atas batas
    ),
  }),
])(
  "Feature: digital-wedding-invitation, Property 7: validateRSVP konsisten dengan semua kombinasi input valid/invalid",
  (data) => {
    // Hitung ekspektasi secara independen berdasarkan aturan domain
    const nameOk =
      typeof data.guest_name === "string" && data.guest_name.trim().length > 0;
    const attendanceOk =
      data.attendance === "hadir" || data.attendance === "tidak_hadir";
    const count = parseInt(data.guest_count, 10);
    const countOk = !isNaN(count) && count >= 1 && count <= 10;

    const expected = nameOk && attendanceOk && countOk;

    expect(validateRSVP(data)).toBe(expected);
  }
);
