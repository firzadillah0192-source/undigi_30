/**
 * guestbook.js — Logika form buku tamu
 * Handles validation, initial load, and form submission.
 *
 * Exported as ES module (named exports) AND attached to window.WeddingGuestbook.
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 */

// ---------------------------------------------------------------------------
// Pure validation function (exported for property-based testing in task 8.8)
// ---------------------------------------------------------------------------

/**
 * Validates guestbook form data.
 *
 * Rules (Requirement 10.2, 10.3):
 *  - sender_name must be a non-empty string after trim
 *  - message must be a non-empty string after trim
 *  - message.length must be ≤ 500 (raw length, not trimmed — matches maxlength attr)
 *
 * @param {{ sender_name: string, message: string }} data
 * @returns {boolean} true only when all conditions pass
 */
export function validateGuestbook(data) {
  const nameOk =
    typeof data.sender_name === "string" &&
    data.sender_name.trim().length > 0;

  const messageOk =
    typeof data.message === "string" &&
    data.message.trim().length > 0 &&
    data.message.length <= 500;

  return nameOk && messageOk;
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
 * Clears all per-field error messages on the guestbook form.
 */
function clearFieldErrors() {
  ["gb-name-error", "gb-message-error"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = "";
      el.style.display = "";
    }
  });
}

/**
 * Shows the inline feedback banner.
 * @param {"success"|"error"} type
 * @param {string} message
 */
function showFeedback(type, message) {
  const el = document.getElementById("gb-feedback");
  if (!el) return;
  el.textContent = message;
  el.className = `form-feedback form-feedback--${type}`;
  el.hidden = false;
}

/** Hides the inline feedback banner. */
function hideFeedback() {
  const el = document.getElementById("gb-feedback");
  if (el) {
    el.hidden = true;
    el.textContent = "";
    el.className = "form-feedback";
  }
}

/**
 * Updates the character counter display.
 * @param {number} currentLength
 */
function updateCharCount(currentLength) {
  const counter = document.getElementById("gb-char-count");
  if (counter) {
    counter.textContent = `${currentLength}/500`;
  }
}

// ---------------------------------------------------------------------------
// DOM rendering helpers
// ---------------------------------------------------------------------------

/**
 * Escapes text for safe HTML insertion (prevent XSS).
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return String(text).replace(/[&<>"']/g, (ch) => map[ch]);
}

/**
 * Creates a guestbook entry DOM element.
 * @param {{ sender_name: string, message: string, submitted_at: string }} entry
 * @returns {HTMLElement}
 */
function createEntryElement(entry) {
  const div = document.createElement("div");
  div.className = "guestbook-entry";
  div.innerHTML = `
    <div class="guestbook-entry__name">${escapeHtml(entry.sender_name)}</div>
    <div class="guestbook-entry__message">${escapeHtml(entry.message)}</div>
    <div class="guestbook-entry__meta">${escapeHtml(entry.submitted_at ?? "")}</div>
  `;
  return div;
}

/**
 * Shows the empty-state message inside the guestbook list.
 * Called when there are no entries to display.
 */
function showEmptyState() {
  const list = document.getElementById("guestbook-list");
  if (!list) return;

  // Only add if not already there
  if (!list.querySelector(".guestbook-empty")) {
    const p = document.createElement("p");
    p.className = "guestbook-empty";
    p.textContent = "Jadilah yang pertama memberikan ucapan!";
    list.appendChild(p);
  }
}

/**
 * Removes the empty-state message if present.
 */
function removeEmptyState() {
  const el = document.querySelector(".guestbook-empty");
  if (el) el.remove();
}

/**
 * Prepends a new entry to the top of the guestbook list (Requirement 10.4).
 * @param {{ sender_name: string, message: string, submitted_at: string }} entry
 */
function prependEntry(entry) {
  const list = document.getElementById("guestbook-list");
  if (!list) return;

  removeEmptyState();

  const entryEl = createEntryElement(entry);
  list.insertBefore(entryEl, list.firstChild);
}

// ---------------------------------------------------------------------------
// Initial load — GET /api/?endpoint=guestbook (Requirement 10.5)
// ---------------------------------------------------------------------------

/**
 * Loads all existing guestbook entries from the API and renders them
 * in newest-first order.
 */
async function loadGuestbook() {
  const list = document.getElementById("guestbook-list");
  if (!list) return;

  try {
    const response = await fetch("/api/?endpoint=guestbook");
    const result = await response.json();

    if (response.ok && result.success && Array.isArray(result.data)) {
      if (result.data.length === 0) {
        showEmptyState();
      } else {
        // Server returns newest-first (idx_guestbook_time DESC index)
        result.data.forEach((entry) => {
          list.appendChild(createEntryElement(entry));
        });
      }
    } else {
      // API error — show empty state rather than a broken list
      showEmptyState();
    }
  } catch {
    // Network error — silently degrade to empty state
    showEmptyState();
  }
}

// ---------------------------------------------------------------------------
// Form submission handler
// ---------------------------------------------------------------------------

/**
 * Collects form values, validates them, and submits via fetch POST.
 * On success: prepend entry to list, reset form, show success feedback.
 * On failure: show error feedback, DO NOT reset form (Requirement 10.3, 10.4).
 * @param {Event} event  – the form submit event
 */
async function handleGuestbookSubmit(event) {
  event.preventDefault();

  clearFieldErrors();
  hideFeedback();

  const form = document.getElementById("form-guestbook");
  if (!form) return;

  const senderName = form.querySelector('[name="sender_name"]')?.value ?? "";
  const message = form.querySelector('[name="message"]')?.value ?? "";

  // ----- Client-side validation (Requirement 10.2, 10.3) -----
  let hasError = false;

  if (!senderName.trim()) {
    showFieldError("gb-name-error", "Nama tidak boleh kosong.");
    hasError = true;
  }

  if (!message.trim()) {
    showFieldError("gb-message-error", "Pesan ucapan tidak boleh kosong.");
    hasError = true;
  } else if (message.length > 500) {
    showFieldError(
      "gb-message-error",
      "Pesan ucapan tidak boleh melebihi 500 karakter."
    );
    hasError = true;
  }

  if (hasError) return; // Do NOT submit — keep form filled (Requirement 10.3)

  // ----- Submit (Requirement 10.4) -----
  const submitBtn = document.getElementById("btn-gb-submit");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Mengirim…";
  }

  try {
    const payload = {
      sender_name: senderName.trim(),
      message: message.trim(),
    };

    const response = await fetch("/api/?endpoint=guestbook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      // Success: prepend the new entry to the list (newest first)
      const newEntry = result.data ?? {
        sender_name: payload.sender_name,
        message: payload.message,
        submitted_at: new Date().toLocaleString("id-ID"),
      };
      prependEntry(newEntry);

      // Reset form and char counter (Requirement 10.4)
      form.reset();
      updateCharCount(0);

      showFeedback(
        "success",
        result.message || "Ucapan Anda telah berhasil dikirim. Terima kasih!"
      );
    } else {
      // API returned an error: show message, DO NOT reset form
      showFeedback(
        "error",
        result.error || "Gagal mengirim ucapan. Silakan coba lagi."
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
      submitBtn.textContent = "Kirim Ucapan";
    }
  }
}

// ---------------------------------------------------------------------------
// Character counter
// ---------------------------------------------------------------------------

/**
 * Attaches an `input` listener to the message textarea so the counter
 * updates in real-time (shows "X/500").
 */
function initCharCounter() {
  const textarea = document.getElementById("gb-message");
  if (!textarea) return;

  // Set initial count in case the field already has a value
  updateCharCount(textarea.value.length);

  textarea.addEventListener("input", () => {
    updateCharCount(textarea.value.length);
  });
}

// ---------------------------------------------------------------------------
// Initialisation
// ---------------------------------------------------------------------------

/**
 * Binds the guestbook form event listener, sets up the char counter, and
 * loads existing entries from the API.
 * Call once after the DOM is ready.
 */
export async function initGuestbook() {
  initCharCounter();

  const form = document.getElementById("form-guestbook");
  if (form) {
    form.addEventListener("submit", handleGuestbookSubmit);
  }

  await loadGuestbook();
}

// ---------------------------------------------------------------------------
// Auto-init on DOMContentLoaded (when loaded as a plain <script> tag)
// ---------------------------------------------------------------------------
if (typeof window !== "undefined" && typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initGuestbook();
    });
  } else {
    // Already loaded (e.g. script placed at bottom of <body>)
    initGuestbook();
  }

  // Expose on global namespace for non-module consumers
  window.WeddingGuestbook = { validateGuestbook, initGuestbook };
}
