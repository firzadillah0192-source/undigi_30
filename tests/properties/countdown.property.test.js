/**
 * Property tests untuk countdown.js
 *
 * Validates: Requirements 5.1, 5.2
 */

import { it } from "@fast-check/vitest";
import fc from "fast-check";
import { calculateCountdown } from "../../assets/js/countdown.js";

/**
 * Property 5: countdown timer non-negatif dan konsisten untuk tanggal masa depan
 *
 * Untuk sembarang tanggal target di masa depan:
 * - days >= 0
 * - hours dalam rentang 0–23
 * - minutes dalam rentang 0–59
 * - seconds dalam rentang 0–59
 * - elapsed === false
 *
 * Validates: Requirements 5.1, 5.2
 */
it.prop([fc.date({ min: new Date(Date.now() + 60_000) })])(
  "Feature: digital-wedding-invitation, Property 5: countdown timer non-negatif dan konsisten untuk tanggal masa depan",
  (futureDate) => {
    const r = calculateCountdown(futureDate);

    // Semua komponen non-negatif
    expect(r.days).toBeGreaterThanOrEqual(0);
    expect(r.hours).toBeGreaterThanOrEqual(0);
    expect(r.minutes).toBeGreaterThanOrEqual(0);
    expect(r.seconds).toBeGreaterThanOrEqual(0);

    // Batas atas komponen waktu
    expect(r.hours).toBeLessThanOrEqual(23);
    expect(r.minutes).toBeLessThanOrEqual(59);
    expect(r.seconds).toBeLessThanOrEqual(59);

    // Tanggal masa depan → belum lewat
    expect(r.elapsed).toBe(false);
  }
);
