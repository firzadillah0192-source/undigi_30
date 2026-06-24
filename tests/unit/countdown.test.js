/**
 * Unit tests — countdown.js
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { calculateCountdown, startCountdownTimer } from "../../assets/js/countdown.js";

// ─── calculateCountdown ─────────────────────────────────────────────────────

describe("calculateCountdown — pure function", () => {
  it("returns all-zero with elapsed:false when targetDate is null", () => {
    const result = calculateCountdown(null);
    expect(result).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0, elapsed: false });
  });

  it("returns all-zero with elapsed:false when targetDate is undefined", () => {
    const result = calculateCountdown(undefined);
    expect(result).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0, elapsed: false });
  });

  it("returns elapsed:true for a past date", () => {
    const past = new Date(Date.now() - 60_000); // 1 menit lalu
    const result = calculateCountdown(past);
    expect(result.elapsed).toBe(true);
    expect(result.days).toBe(0);
    expect(result.hours).toBe(0);
    expect(result.minutes).toBe(0);
    expect(result.seconds).toBe(0);
  });

  it("returns elapsed:false for a future date", () => {
    const future = new Date(Date.now() + 3_600_000); // 1 jam ke depan
    const result = calculateCountdown(future);
    expect(result.elapsed).toBe(false);
  });

  it("hours is always 0–23", () => {
    const future = new Date(Date.now() + 3_600_000 * 50); // ~50 jam
    const { hours } = calculateCountdown(future);
    expect(hours).toBeGreaterThanOrEqual(0);
    expect(hours).toBeLessThanOrEqual(23);
  });

  it("minutes is always 0–59", () => {
    const future = new Date(Date.now() + 3_600_000 * 50);
    const { minutes } = calculateCountdown(future);
    expect(minutes).toBeGreaterThanOrEqual(0);
    expect(minutes).toBeLessThanOrEqual(59);
  });

  it("seconds is always 0–59", () => {
    const future = new Date(Date.now() + 3_600_000 * 50);
    const { seconds } = calculateCountdown(future);
    expect(seconds).toBeGreaterThanOrEqual(0);
    expect(seconds).toBeLessThanOrEqual(59);
  });

  it("all values are non-negative integers", () => {
    const future = new Date(Date.now() + 86_400_000 * 3); // 3 hari
    const { days, hours, minutes, seconds } = calculateCountdown(future);
    expect(days).toBeGreaterThanOrEqual(0);
    expect(hours).toBeGreaterThanOrEqual(0);
    expect(minutes).toBeGreaterThanOrEqual(0);
    expect(seconds).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(days)).toBe(true);
    expect(Number.isInteger(hours)).toBe(true);
    expect(Number.isInteger(minutes)).toBe(true);
    expect(Number.isInteger(seconds)).toBe(true);
  });

  it("calculates exactly 1 day, 2 hours, 3 minutes, 4 seconds ahead", () => {
    const diffMs = (1 * 86400 + 2 * 3600 + 3 * 60 + 4) * 1000;
    const target = new Date(Date.now() + diffMs);
    const { days, hours, minutes, seconds, elapsed } = calculateCountdown(target);
    // Toleransi 1 detik karena eksekusi kode membutuhkan waktu
    expect(elapsed).toBe(false);
    expect(days).toBe(1);
    expect(hours).toBe(2);
    expect(minutes).toBe(3);
    // seconds bisa 3 atau 4 tergantung timing
    expect(seconds).toBeGreaterThanOrEqual(2);
    expect(seconds).toBeLessThanOrEqual(4);
  });
});

// ─── startCountdownTimer — DOM interaction ───────────────────────────────────

describe("startCountdownTimer — DOM interaction", () => {
  beforeEach(() => {
    // Setup DOM minimal sesuai HTML structure di task
    document.body.innerHTML = `
      <section id="countdown" class="section section--countdown">
        <div class="countdown-grid">
          <div class="counter">
            <span class="counter__value" id="countdown-days">00</span>
            <span class="counter__label">Hari</span>
          </div>
          <span class="counter--separator">:</span>
          <div class="counter">
            <span class="counter__value" id="countdown-hours">00</span>
            <span class="counter__label">Jam</span>
          </div>
          <span class="counter--separator">:</span>
          <div class="counter">
            <span class="counter__value" id="countdown-minutes">00</span>
            <span class="counter__label">Menit</span>
          </div>
          <span class="counter--separator">:</span>
          <div class="counter">
            <span class="counter__value" id="countdown-seconds">00</span>
            <span class="counter__label">Detik</span>
          </div>
        </div>
        <p class="countdown-elapsed" id="countdown-elapsed" hidden>
          Alhamdulillah, Acara Telah Berlangsung
        </p>
      </section>
    `;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("hides section and returns null when targetDate is null", () => {
    const intervalId = startCountdownTimer(null, "countdown");
    expect(intervalId).toBeNull();
    expect(document.getElementById("countdown").hidden).toBe(true);
  });

  it("returns a non-null interval ID for a future date", () => {
    const future = new Date(Date.now() + 3_600_000);
    const intervalId = startCountdownTimer(future, "countdown");
    // setInterval may return a number or Timeout object depending on env
    expect(intervalId).not.toBeNull();
    expect(intervalId).not.toBeUndefined();
    clearInterval(intervalId);
  });

  it("updates DOM elements on tick for a future date", () => {
    const future = new Date(Date.now() + 86_400_000 + 3_600_000); // 1 hari + 1 jam
    startCountdownTimer(future, "countdown");

    expect(document.getElementById("countdown-days").textContent).not.toBe("00");
    // Setidaknya detik atau hari harus terisi
    const days = document.getElementById("countdown-days").textContent;
    expect(days.length).toBeGreaterThanOrEqual(2); // zero-padded
  });

  it("shows elapsed text and hides grid when date has passed", () => {
    const past = new Date(Date.now() - 1000); // 1 detik lalu
    startCountdownTimer(past, "countdown");

    const elElapsed = document.getElementById("countdown-elapsed");
    const elGrid = document.querySelector(".countdown-grid");
    expect(elElapsed.hidden).toBe(false);
    expect(elGrid.hidden).toBe(true);
  });

  it("elapsed text is hidden initially when date is in future", () => {
    const future = new Date(Date.now() + 3_600_000);
    startCountdownTimer(future, "countdown");

    const elElapsed = document.getElementById("countdown-elapsed");
    expect(elElapsed.hidden).toBe(true);
  });

  it("section is visible when targetDate is a future date", () => {
    const section = document.getElementById("countdown");
    section.hidden = true; // paksa tersembunyi dulu
    const future = new Date(Date.now() + 3_600_000);
    startCountdownTimer(future, "countdown");
    expect(section.hidden).toBe(false);
  });

  it("elapsed text shows after timer triggers on expired date via setInterval", () => {
    // Mulai dengan future date tapi langsung expired setelah 1 tick
    const almostNow = new Date(Date.now() + 500); // 500ms ke depan
    startCountdownTimer(almostNow, "countdown");

    // Maju waktu lebih dari 1 detik agar tick berikutnya mendeteksi elapsed
    vi.advanceTimersByTime(2000);

    const elElapsed = document.getElementById("countdown-elapsed");
    const elGrid = document.querySelector(".countdown-grid");
    expect(elElapsed.hidden).toBe(false);
    expect(elGrid.hidden).toBe(true);
  });
});
