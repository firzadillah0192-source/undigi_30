/**
 * rsvp.js — Logika form RSVP
 * Handles validation, auto-fill from URL, and form submission.
 *
 * Exported as ES module (named exports) AND attached to window.WeddingRSVP.
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

// ---------------------------------------------------------------------------
// Pure validation function (exported for property-based testing in task 8.6)
// ---------------------------------------------------------------------------

/**
 * Validates RSVP form data.
 *
 * @param {{ guest_name: string, attendance: string, guest_count: number|string }} data
 * @returns {boolean} true only when all fields pass their rules
 */
export function validateRSVP(data) {
  const nameOk =
    typeof data.guest_name === "string" && data.guest_name.trim().length > 0;

  const attendanceOk =
    data.attendance === "hadir" || data.attendance === "tidak_hadir";

  const count = parseInt(data.guest_count, 10);
  const countOk = !isNaN(count) && count >= 1 && count <= 10;

  return nameOk && attendanceOk && countOk;
}

// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------

/**
 * Shows a per-field error message.
 * @param {string} fieldId  – id of the <span class="form-error"> element
 * @param {string} message
 */
function showFieldError(fieldId, message) {
  const el = document.getElementById(fieldId);
  if (el) {
    el.textContent = message;
    el.style.display = "block";
  }
}

/**
 * Clears all per-field error messages on the RSVP form.
 */
function clearFieldErrors() {
  ["rsvp-name-error", "rsvp-attendance-error", "rsvp-count-error"].forEach(
    (id) => {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = "";
        el.style.display = "";
      }
    }
  );
}

/**
 * Shows the inline feedback banner.
 * @param {"success"|"error"} type
 * @param {string} message
 */
function showFeedback(type, message) {
  const el = document.getElementById("rsvp-feedback");
  if (!el) return;
  el.textContent = message;
  el.className = `form-feedback form-feedback--${type}`;
  el.hidden = false;
}

/** Hides the inline feedback banner. */
function hideFeedback() {
  const el = document.getElementById("rsvp-feedback");
  if (el) {
    el.hidden = true;
    el.textContent = "";
    el.className = "form-feedback";
  }
}

// ---------------------------------------------------------------------------
// Auto-fill from ?to= URL parameter (Requirement 9.2)
// ---------------------------------------------------------------------------

/**
 * Reads the `?to=` query parameter and pre-fills the guest_name field.
 * Safe to call before DOMContentLoaded if the element already exists.
 */
function autoFillGuestName() {
  try {
    const params = new URLSearchParams(window.location.search);
    const toParam = params.get("to");
    if (toParam && toParam.trim().length > 0) {
      const nameInput = document.getElementById("rsvp-name");
      if (nameInput && !nameInput.value) {
        nameInput.value = toParam.trim();
      }
    }
  } catch {
    // URLSearchParams not available (non-browser env) — silently skip
  }
}

// ---------------------------------------------------------------------------
// Form submission handler
// ---------------------------------------------------------------------------

/**
 * Collects form values, validates them, and submits via fetch POST.
 * @param {Event} event  – the form submit event
 */
async function handleRSVPSubmit(event) {
  event.preventDefault();

  clearFieldErrors();
  hideFeedback();

  const form = document.getElementById("form-rsvp");
  if (!form) return;

  const guestName = (form.querySelector('[name="guest_name"]')?.value ?? "");
  const attendance = (form.querySelector('[name="attendance"]')?.value ?? "");
  const guestCountRaw = form.querySelector('[name="guest_count"]')?.value ?? "1";
  const phone = (form.querySelector('[name="phone"]')?.value ?? "");

  const data = {
    guest_name: guestName,
    attendance: attendance,
    guest_count: guestCountRaw,
  };

  // ----- Client-side validation (Requirement 9.3, 9.4) -----
  let hasError = false;

  if (!guestName.trim()) {
    showFieldError("rsvp-name-error", "Nama tamu tidak boleh kosong.");
    hasError = true;
  }

  if (!attendance || !["hadir", "tidak_hadir"].includes(attendance)) {
    showFieldError(
      "rsvp-attendance-error",
      "Pilih konfirmasi kehadiran terlebih dahulu."
    );
    hasError = true;
  }

  const count = parseInt(guestCountRaw, 10);
  if (isNaN(count) || count < 1 || count > 10) {
    showFieldError(
      "rsvp-count-error",
      "Jumlah tamu harus berupa angka antara 1 sampai 10."
    );
    hasError = true;
  }

  if (hasError) return; // Do NOT submit — form stays filled (Requirement 9.4)

  // ----- Submit (Requirement 9.5) -----
  const submitBtn = document.getElementById("btn-rsvp-submit");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Mengirim…";
  }

  try {
    const payload = {
      guest_name: guestName.trim(),
      phone: phone.trim(),
      attendance: attendance,
      guest_count: count,
    };

    const response = await fetch("/api/?endpoint=rsvp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      // Success: show message and reset form
      showFeedback(
        "success",
        result.message ||
          "Terima kasih! Konfirmasi kehadiran Anda telah kami terima."
      );
      form.reset();
      // Re-apply auto-fill after reset so the name is still there
      autoFillGuestName();
    } else {
      // API returned an error: show message, DO NOT reset form (Requirement 9.5)
      showFeedback(
        "error",
        result.error || "Gagal mengirim RSVP. Silakan coba lagi."
      );
    }
  } catch {
    // Network / parse error: show message, DO NOT reset form
    showFeedback(
      "error",
      "Terjadi kesalahan jaringan. Periksa koneksi Anda dan coba lagi."
    );
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Kirim RSVP";
    }
  }
}

// ---------------------------------------------------------------------------
// Initialisation
// ---------------------------------------------------------------------------

/**
 * Binds the RSVP form event listener and auto-fills guest name.
 * Call once after the DOM is ready.
 */
export function initRSVP() {
  autoFillGuestName();

  const form = document.getElementById("form-rsvp");
  if (form) {
    form.addEventListener("submit", handleRSVPSubmit);
  }
}

// ---------------------------------------------------------------------------
// Auto-init on DOMContentLoaded (when loaded as a plain <script> tag)
// ---------------------------------------------------------------------------
if (typeof window !== "undefined" && typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initRSVP);
  } else {
    // Already loaded (e.g. script placed at bottom of <body>)
    initRSVP();
  }

  // Expose on global namespace for non-module consumers
  window.WeddingRSVP = { validateRSVP, initRSVP };
}
