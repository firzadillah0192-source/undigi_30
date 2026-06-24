/**
 * music.js — Background Music Controller
 *
 * Handles background music playback for the digital wedding invitation.
 *
 * Key behaviours:
 *  - initMusic(audioUrl): initialises the audio element and toggle button.
 *  - If audioUrl is falsy: button is set to disabled and we return early (Req 13.6).
 *  - Audio is created with loop=true, preload='none' — NOT autoplayed on load (Req 13.1).
 *  - After "Buka Undangan" animation completes, music starts automatically by
 *    listening for the `animations:complete` custom event (Req 13.2).
 *  - Button #music-toggle toggles play/pause and updates icon + aria-label (Req 13.3, 13.4).
 *  - Also listens for `music:ready` custom event (dispatched by guest.js) to
 *    allow dynamic initialisation after data loads.
 *
 * Exported as named export + window.WeddingMusic for non-module consumers.
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.6
 */

// ---------------------------------------------------------------------------
// SVG icons
// ---------------------------------------------------------------------------

const ICON_PLAY = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;

const ICON_PAUSE = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

/** @type {HTMLAudioElement|null} */
let audioEl = null;

/** Tracks whether music has been started at least once (to satisfy autoplay policy). */
let hasStarted = false;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Updates the toggle button icon and aria-label to reflect the current
 * play/pause state.
 *
 * @param {HTMLButtonElement} btn
 * @param {boolean} isPlaying
 */
function updateButtonState(btn, isPlaying) {
  if (!btn) return;
  btn.innerHTML = isPlaying ? ICON_PAUSE : ICON_PLAY;
  btn.setAttribute(
    "aria-label",
    isPlaying ? "Jeda musik" : "Putar musik"
  );
}

/**
 * Attempts to start playback. Browsers may reject the promise if no prior
 * user gesture has occurred; the rejection is swallowed silently because the
 * `animations:complete` event is fired after the user has already interacted
 * with the "Buka Undangan" button.
 *
 * @param {HTMLButtonElement} btn
 * @returns {Promise<void>}
 */
async function startPlayback(btn) {
  if (!audioEl) return;
  try {
    await audioEl.play();
    hasStarted = true;
    updateButtonState(btn, true);
  } catch {
    // Autoplay blocked — user must press the toggle manually.
    updateButtonState(btn, false);
  }
}

// ---------------------------------------------------------------------------
// Exported initialiser
// ---------------------------------------------------------------------------

/**
 * Initialises the background music controller.
 *
 * @param {string|null|undefined} audioUrl  – URL of the audio file.
 *   Pass null/falsy when no music has been uploaded (Req 13.6).
 */
export function initMusic(audioUrl) {
  const btn = /** @type {HTMLButtonElement|null} */ (
    document.getElementById("music-toggle")
  );

  // Req 13.6: no audio configured → disable button and bail out.
  if (!audioUrl) {
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = ICON_PLAY;
      btn.setAttribute("aria-label", "Putar musik");
    }
    return;
  }

  // ------------------------------------------------------------------
  // Build the <audio> element
  // ------------------------------------------------------------------
  audioEl = new Audio();
  audioEl.loop = true;
  audioEl.preload = "none"; // do NOT buffer until user initiates playback
  audioEl.src = audioUrl;

  // Sync button state whenever the audio element changes state externally
  // (e.g. browser pause due to tab hidden, or media session controls).
  audioEl.addEventListener("play", () => updateButtonState(btn, true));
  audioEl.addEventListener("pause", () => updateButtonState(btn, false));
  audioEl.addEventListener("ended", () => {
    // loop=true so this shouldn't fire, but handle defensively.
    hasStarted = false;
    updateButtonState(btn, false);
  });

  // ------------------------------------------------------------------
  // Enable and wire up the toggle button (Req 13.3, 13.4)
  // ------------------------------------------------------------------
  if (btn) {
    btn.disabled = false;
    updateButtonState(btn, false); // initial state: paused

    btn.addEventListener("click", () => {
      toggleMusic();
    });
  }
}

/**
 * Memulai pemutaran audio.
 * Requirement 13.3, 13.4
 */
export function playMusic() {
  const btn = /** @type {HTMLButtonElement|null} */ (
    document.getElementById("music-toggle")
  );
  if (audioEl) {
    startPlayback(btn);
  }
}

/**
 * Menghentikan pemutaran audio.
 * Requirement 13.3, 13.4
 */
export function pauseMusic() {
  if (audioEl) {
    audioEl.pause();
  }
}

/**
 * Mengubah status putar/jeda audio.
 * Requirement 13.4
 */
export function toggleMusic() {
  if (!audioEl) return;
  const btn = /** @type {HTMLButtonElement|null} */ (
    document.getElementById("music-toggle")
  );

  if (audioEl.paused) {
    startPlayback(btn);
  } else {
    audioEl.pause();
  }
}

// ---------------------------------------------------------------------------
// Controller Event Listeners
// ---------------------------------------------------------------------------

const handleAnimationsComplete = () => {
  const btn = /** @type {HTMLButtonElement|null} */ (
    document.getElementById("music-toggle")
  );
  if (!hasStarted && audioEl) {
    startPlayback(btn);
  }
};

const handleMusicReady = (/** @type {CustomEvent} */ e) => {
  // Re-initialise: clean up any previous audio element first.
  if (audioEl) {
    audioEl.pause();
    audioEl.src = "";
    audioEl = null;
    hasStarted = false;
  }
  // Cek e.detail.src (dari test) atau e.detail.audioUrl (dari guest.js)
  const url = e.detail?.src ?? e.detail?.audioUrl ?? null;
  initMusic(url);
};

/**
 * Menginisialisasi event listeners global untuk musik.
 * Dipanggil otomatis saat load dan secara manual dalam unit test.
 */
export function initMusicController() {
  document.removeEventListener("animations:complete", handleAnimationsComplete);
  document.addEventListener("animations:complete", handleAnimationsComplete, { once: true });

  document.removeEventListener("music:ready", handleMusicReady);
  document.addEventListener("music:ready", handleMusicReady);
}

// ---------------------------------------------------------------------------
// Auto-init on DOMContentLoaded ketika dimuat via plain <script>
// ---------------------------------------------------------------------------
if (typeof window !== "undefined" && typeof document !== "undefined") {
  initMusicController();
  // Expose pada global namespace untuk non-module consumers.
  window.WeddingMusic = {
    initMusic,
    playMusic,
    pauseMusic,
    toggleMusic,
    initMusicController
  };
}
