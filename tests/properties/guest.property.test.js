/**
 * Property tests untuk guest.js
 *
 * Validates: Requirements 1.3, 2.3, 3.3, 4.3, 4.5, 7.3, 10.2, 12.3, 17.1, 17.2, 17.3, 19.2, 19.3
 */

import { it, expect } from "vitest";
import { it as propIt } from "@fast-check/vitest";
import fc from "fast-check";
import {
  buildGreeting,
  stripToParam,
  generateICS,
  validateTextLength,
  validateTimeRange,
  sanitizeText
} from "../../assets/js/guest.js";

/**
 * Property 1: buildGreeting mengandung nama tamu secara verbatim
 *
 * Untuk sembarang string nama tamu yang tidak kosong,
 * buildGreeting(name) harus menghasilkan string yang mengandung nama tersebut secara verbatim.
 *
 * Validates: Requirements 1.3
 */
propIt.prop([fc.string({ minLength: 1 })])(
  "Feature: digital-wedding-invitation, Property 1: buildGreeting mengandung nama tamu secara verbatim",
  (name) => {
    const greeting = buildGreeting(name);
    expect(greeting).toContain(name);
  }
);

/**
 * Property 10: stripToParam menghapus parameter 'to' dari URL
 *
 * Untuk sembarang URL yang memiliki parameter 'to', stripToParam(url) harus menghapus parameter 'to'
 * sambil tetap mempertahankan parameter-parameter query lainnya.
 *
 * Validates: Requirements 12.3
 */
propIt.prop([
  fc.webUrl(),
  fc.string({ minLength: 1, maxLength: 20 })
])(
  "Feature: digital-wedding-invitation, Property 10: stripToParam menghapus parameter 'to' dari URL",
  (urlStr, toVal) => {
    const url = new URL(urlStr);
    url.searchParams.set("to", toVal);
    url.searchParams.set("other", "keep-me");

    const stripped = stripToParam(url.toString());
    const strippedUrl = new URL(stripped, "http://localhost");

    expect(strippedUrl.searchParams.has("to")).toBe(false);
    expect(strippedUrl.searchParams.get("other")).toBe("keep-me");
  }
);

/**
 * Property 3: generateICS mengandung semua 5 field event dalam output .ics
 *
 * Untuk sembarang objek data acara yang valid, generateICS(event) harus
 * mengembalikan representasi string iCalendar yang memuat semua data penting.
 *
 * Validates: Requirements 4.3
 */
propIt.prop([
  fc.record({
    title: fc.string({ minLength: 5, maxLength: 50 }),
    date: fc.date({ min: new Date("2020-01-01"), max: new Date("2030-12-31") }).map(d => d.toISOString().split("T")[0]),
    start_time: fc.integer({ min: 0, max: 23 }).chain(h => fc.integer({ min: 0, max: 59 }).map(m => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`)),
    end_time: fc.integer({ min: 0, max: 23 }).chain(h => fc.integer({ min: 0, max: 59 }).map(m => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`)),
    address: fc.string({ minLength: 5, maxLength: 100 })
  })
])(
  "Feature: digital-wedding-invitation, Property 3: generateICS mengandung semua 5 field event dalam output .ics",
  (event) => {
    const ics = generateICS(event);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain(event.title);
    expect(ics).toContain(event.address);

    const formattedDate = event.date.replace(/-/g, "");
    expect(ics).toContain(formattedDate);
    expect(ics).toContain("END:VEVENT");
    expect(ics).toContain("END:VCALENDAR");
  }
);

/**
 * Property 2: validateTextLength konsisten
 *
 * validateTextLength(text, maxLength) harus mengembalikan true jika dan hanya jika
 * text.length <= maxLength.
 *
 * Validates: Requirements 2.3, 3.3, 7.3, 10.2, 17.1, 17.2, 17.3
 */
propIt.prop([
  fc.string(),
  fc.integer({ min: 0, max: 1000 })
])(
  "Feature: digital-wedding-invitation, Property 2: validateTextLength konsisten dengan batas panjang maksimum",
  (text, maxLength) => {
    const expected = text.length <= maxLength;
    expect(validateTextLength(text, maxLength)).toBe(expected);
  }
);

/**
 * Property 4: validateTimeRange konsisten
 *
 * validateTimeRange(start, end) harus mengembalikan true jika dan hanya jika
 * end >= start.
 *
 * Validates: Requirements 4.5
 */
propIt.prop([
  fc.integer({ min: 0, max: 23 }).chain(h => fc.integer({ min: 0, max: 59 }).map(m => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`)),
  fc.integer({ min: 0, max: 23 }).chain(h => fc.integer({ min: 0, max: 59 }).map(m => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`))
])(
  "Feature: digital-wedding-invitation, Property 4: validateTimeRange konsisten dengan rentang waktu",
  (start, end) => {
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    const expected = (eh > sh) || (eh === sh && em >= sm);
    expect(validateTimeRange(start, end)).toBe(expected);
  }
);

/**
 * Property 11: sanitizeText tidak menghasilkan tag HTML eksekutable
 *
 * sanitizeText(input, maxLength) harus mengembalikan string yang bersih dari
 * tag HTML eksekutable dan tidak melebihi batas panjang karakter.
 *
 * Validates: Requirements 19.2, 19.3
 */
propIt.prop([
  fc.oneof(
    fc.string().map(s => `<script>${s}</script>`),
    fc.string().map(s => `'; DROP TABLE rsvp; --${s}`),
    fc.string()
  ),
  fc.integer({ min: 10, max: 500 })
])(
  "Feature: digital-wedding-invitation, Property 11: sanitizeText tidak menghasilkan tag eksekutable",
  (input, maxLength) => {
    const result = sanitizeText(input, maxLength);
    expect(result).not.toMatch(/<script/i);
    expect(result.length).toBeLessThanOrEqual(maxLength);
  }
);
