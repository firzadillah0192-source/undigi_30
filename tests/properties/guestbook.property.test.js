/**
 * Property tests untuk guestbook.js
 *
 * Validates: Requirements 10.2, 10.3
 */

import { it } from "@fast-check/vitest";
import fc from "fast-check";
import { validateGuestbook } from "../../assets/js/guestbook.js";

/**
 * Property 9: validateGuestbook konsisten dengan aturan validasi buku tamu
 *
 * Untuk sembarang objek data ucapan, validateGuestbook(data) harus mengembalikan false
 * jika dan hanya jika salah satu kondisi ini terpenuhi:
 *  - sender_name kosong atau hanya whitespace
 *  - message kosong atau hanya whitespace
 *  - message.length > 500
 *
 * Validates: Requirements 10.2, 10.3
 */
it.prop([
  fc.record({
    sender_name: fc.oneof(
      fc.constant(""),
      fc.string(),
      fc.string({ minLength: 1 }).map((s) => "   " + s + "   ") // whitespace-padded
    ),
    message: fc.oneof(
      fc.constant(""),
      fc.string({ maxLength: 500 }),     // valid panjang
      fc.string({ minLength: 501, maxLength: 600 }) // melebihi batas
    ),
  }),
])(
  "Feature: digital-wedding-invitation, Property 9: validateGuestbook konsisten dengan aturan validasi buku tamu",
  (data) => {
    // Hitung ekspektasi secara independen berdasarkan aturan domain
    const nameOk =
      typeof data.sender_name === "string" && data.sender_name.trim().length > 0;
    const messageOk =
      typeof data.message === "string" &&
      data.message.trim().length > 0 &&
      data.message.length <= 500;

    const expected = nameOk && messageOk;

    expect(validateGuestbook(data)).toBe(expected);
  }
);
