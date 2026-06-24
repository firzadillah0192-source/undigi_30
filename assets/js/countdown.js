/**
 * countdown.js — Countdown Timer untuk Undangan Digital
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

/**
 * Kalkulasi selisih waktu murni antara sekarang dan targetDate.
 * Pure function — tanpa side effect, tanpa akses DOM.
 *
 * @param {Date|null} targetDate — tanggal target acara
 * @returns {{ days: number, hours: number, minutes: number, seconds: number, elapsed: boolean }}
 */
export function calculateCountdown(targetDate) {
  // Requirement 5.4: handle null tanpa error
  if (targetDate === null || targetDate === undefined) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, elapsed: false };
  }

  const now = Date.now();
  const target = targetDate instanceof Date ? targetDate.getTime() : new Date(targetDate).getTime();
  
  // Jika target date tidak valid (misal new Date(NaN))
  if (isNaN(target)) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, elapsed: false };
  }

  const diffMs = target - now;

  // Requirement 5.3: tanggal sudah lewat
  if (diffMs <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, elapsed: true };
  }

  // Hitung komponen waktu dari total detik
  const totalSeconds = Math.floor(diffMs / 1000);
  const seconds = totalSeconds % 60;                   // 0–59
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;                   // 0–59
  const totalHours = Math.floor(totalMinutes / 60);
  const hours = totalHours % 24;                       // 0–23
  const days = Math.floor(totalHours / 24);            // ≥ 0

  return { days, hours, minutes, seconds, elapsed: false };
}

/**
 * Pad angka menjadi minimal 2 digit, misal 5 → "05".
 * @param {number} n
 * @returns {string}
 */
function pad(n) {
  return String(n).padStart(2, "0");
}

/**
 * Mulai countdown timer yang update DOM setiap 1 detik.
 *
 * @param {Date|null} targetDate — tanggal target acara
 * @param {string} containerId  — ID container section countdown (default: "countdown")
 * @returns {number|null} — interval ID untuk cleanup, atau null jika targetDate null
 */
export function startCountdownTimer(targetDate, containerId = "countdown") {
  const section = document.getElementById(containerId);

  // Requirement 5.4: sembunyikan section jika targetDate null
  if (targetDate === null || targetDate === undefined) {
    if (section) {
      section.hidden = true;
    }
    return null;
  }

  // Pastikan section terlihat
  if (section) {
    section.hidden = false;
  }

  const elDays    = document.getElementById("countdown-days");
  const elHours   = document.getElementById("countdown-hours");
  const elMinutes = document.getElementById("countdown-minutes");
  const elSeconds = document.getElementById("countdown-seconds");
  const elElapsed = document.getElementById("countdown-elapsed");
  const elGrid    = section ? section.querySelector(".countdown-grid") : null;

  // intervalId harus dideklarasikan lebih dulu agar tick() bisa mereferensinya
  let intervalId = null;

  function tick() {
    const { days, hours, minutes, seconds, elapsed } = calculateCountdown(targetDate);

    if (elapsed) {
      // Requirement 5.3: tampilkan teks elapsed, sembunyikan grid
      if (elGrid)    elGrid.hidden = true;
      if (elElapsed) elElapsed.hidden = false;
      // Hentikan interval — sudah tidak perlu update lagi
      if (intervalId !== null) clearInterval(intervalId);
      return;
    }

    // Requirement 5.1 & 5.2: update nilai setiap 1 detik
    if (elDays)    elDays.textContent    = pad(days);
    if (elHours)   elHours.textContent   = pad(hours);
    if (elMinutes) elMinutes.textContent = pad(minutes);
    if (elSeconds) elSeconds.textContent = pad(seconds);

    // Pastikan teks elapsed tersembunyi dan grid tampil
    if (elGrid)    elGrid.hidden    = false;
    if (elElapsed) elElapsed.hidden = true;
  }

  // Jalankan sekali langsung, lalu setiap 1 detik
  tick();
  intervalId = setInterval(tick, 1000);

  return intervalId;
}

// Ekspor ke window untuk penggunaan non-module (script tag biasa)
if (typeof window !== "undefined") {
  window.WeddingCountdown = {
    calculateCountdown,
    startCountdownTimer,
  };
}
