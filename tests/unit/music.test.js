/**
 * Unit tests for assets/js/music.js
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.6
 */

import { beforeEach, describe, it, expect, vi } from "vitest";
import { initMusic, playMusic, pauseMusic, toggleMusic } from "../../assets/js/music.js";

// ---------------------------------------------------------------------------
// jsdom helpers
// ---------------------------------------------------------------------------

/**
 * Creates (or resets) the #music-toggle button in the DOM.
 * @returns {HTMLButtonElement}
 */
function setupButton() {
  let btn = document.getElementById("music-toggle");
  if (btn) btn.remove();
  btn = document.createElement("button");
  btn.id = "music-toggle";
  btn.setAttribute("aria-label", "Putar musik");
  btn.disabled = true;
  document.body.appendChild(btn);
  return btn;
}

// ---------------------------------------------------------------------------
// HTMLAudioElement mock (jsdom does not implement media APIs)
// ---------------------------------------------------------------------------

class MockAudio {
  constructor() {
    this.src = "";
    this.loop = false;
    this.preload = "";
    this.paused = true;
    this._listeners = {};
    this.play = vi.fn(() => {
      this.paused = false;
      this._emit("play");
      return Promise.resolve();
    });
    this.pause = vi.fn(() => {
      this.paused = true;
      this._emit("pause");
    });
  }
  addEventListener(event, cb) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(cb);
  }
  _emit(event) {
    (this._listeners[event] || []).forEach((cb) => cb());
  }
}

let mockAudioInstance;

beforeEach(() => {
  // Reset DOM
  setupButton();

  // Provide a fresh MockAudio for each test so module state is clean
  mockAudioInstance = new MockAudio();
  vi.stubGlobal("Audio", vi.fn(() => mockAudioInstance));
});

// ---------------------------------------------------------------------------
// Requirement 13.6 — Button disabled when no audio URL
// ---------------------------------------------------------------------------

describe("initMusic — no audio URL (Req 13.6)", () => {
  it("disables the button when audioUrl is null", () => {
    const btn = document.getElementById("music-toggle");
    btn.disabled = false; // start enabled to confirm we disable it

    initMusic(null);

    expect(btn.disabled).toBe(true);
  });

  it("disables the button when audioUrl is empty string", () => {
    const btn = document.getElementById("music-toggle");
    btn.disabled = false;

    initMusic("");

    expect(btn.disabled).toBe(true);
  });

  it("does NOT create an Audio element when audioUrl is null", () => {
    initMusic(null);
    expect(window.Audio).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Requirement 13.3 — Button enabled and shows play icon after valid init
// ---------------------------------------------------------------------------

describe("initMusic — with valid audio URL (Req 13.3)", () => {
  it("enables the toggle button", () => {
    initMusic("/uploads/music/song.mp3");
    const btn = document.getElementById("music-toggle");
    expect(btn.disabled).toBe(false);
  });

  it("sets aria-label to 'Putar musik' initially (paused state)", () => {
    initMusic("/uploads/music/song.mp3");
    const btn = document.getElementById("music-toggle");
    expect(btn.getAttribute("aria-label")).toBe("Putar musik");
  });

  it("creates an Audio element with correct src", () => {
    initMusic("/uploads/music/song.mp3");
    expect(mockAudioInstance.src).toBe("/uploads/music/song.mp3");
  });

  it("sets loop = true", () => {
    initMusic("/uploads/music/song.mp3");
    expect(mockAudioInstance.loop).toBe(true);
  });

  it("sets preload = 'none' (Req 13.1 — no preload on page load)", () => {
    initMusic("/uploads/music/song.mp3");
    expect(mockAudioInstance.preload).toBe("none");
  });
});

// ---------------------------------------------------------------------------
// Requirement 13.1 — Music does NOT auto-play on page load
// ---------------------------------------------------------------------------

describe("Req 13.1 — no autoplay on page load", () => {
  it("does NOT call audio.play() immediately after initMusic", () => {
    initMusic("/uploads/music/song.mp3");
    expect(mockAudioInstance.play).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Requirement 13.2 — Auto-play starts after 'animations:complete' event
// ---------------------------------------------------------------------------

describe("Req 13.2 — auto-play after animations:complete event", () => {
  it("calls audio.play() when animations:complete is dispatched", async () => {
    // initMusicController binds the event listener; call initMusic to set up audio
    const { initMusicController } = await import("../../assets/js/music.js");
    initMusic("/uploads/music/song.mp3");
    initMusicController();

    document.dispatchEvent(new CustomEvent("animations:complete"));

    expect(mockAudioInstance.play).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Requirement 13.4 — Toggle play/pause on button click
// ---------------------------------------------------------------------------

describe("toggleMusic (Req 13.4)", () => {
  it("calls audio.play() when audio is paused", () => {
    initMusic("/uploads/music/song.mp3");
    mockAudioInstance.paused = true;

    toggleMusic();

    expect(mockAudioInstance.play).toHaveBeenCalledTimes(1);
    expect(mockAudioInstance.pause).not.toHaveBeenCalled();
  });

  it("calls audio.pause() when audio is playing", () => {
    initMusic("/uploads/music/song.mp3");
    mockAudioInstance.paused = false;

    toggleMusic();

    expect(mockAudioInstance.pause).toHaveBeenCalledTimes(1);
    expect(mockAudioInstance.play).not.toHaveBeenCalled();
  });

  it("does nothing when called before initMusic", () => {
    // music not initialised — should not throw
    expect(() => toggleMusic()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Requirement 13.3 — Icon reflects current status
// ---------------------------------------------------------------------------

describe("Button icon reflects play state (Req 13.3)", () => {
  it("shows pause icon in innerHTML after audio.play fires the 'play' event", () => {
    initMusic("/uploads/music/song.mp3");
    const btn = document.getElementById("music-toggle");

    // Simulate the 'play' event (triggered by MockAudio.play via _emit)
    mockAudioInstance._emit("play");

    expect(btn.innerHTML).toContain("rect"); // pause icon has <rect> elements
    expect(btn.getAttribute("aria-label")).toBe("Jeda musik");
  });

  it("shows play icon in innerHTML after audio.pause fires the 'pause' event", () => {
    initMusic("/uploads/music/song.mp3");
    const btn = document.getElementById("music-toggle");

    // First go to playing state, then pause
    mockAudioInstance._emit("play");
    mockAudioInstance._emit("pause");

    expect(btn.innerHTML).toContain("polygon"); // play icon has <polygon>
    expect(btn.getAttribute("aria-label")).toBe("Putar musik");
  });
});

// ---------------------------------------------------------------------------
// music:ready custom event — dynamic initialisation from guest.js
// ---------------------------------------------------------------------------

describe("music:ready event (dynamic init from guest.js)", () => {
  it("calls initMusic with the src from event detail", async () => {
    const { initMusicController } = await import("../../assets/js/music.js");
    initMusicController();

    document.dispatchEvent(
      new CustomEvent("music:ready", {
        detail: { src: "/uploads/music/dynamic.mp3", name: "dynamic.mp3" },
      })
    );

    const btn = document.getElementById("music-toggle");
    expect(btn.disabled).toBe(false);
    expect(mockAudioInstance.src).toBe("/uploads/music/dynamic.mp3");
  });

  it("disables button when music:ready fires with null src", async () => {
    const { initMusicController } = await import("../../assets/js/music.js");
    initMusicController();

    const btn = document.getElementById("music-toggle");
    btn.disabled = false; // ensure it starts enabled

    document.dispatchEvent(
      new CustomEvent("music:ready", { detail: { src: null } })
    );

    expect(btn.disabled).toBe(true);
  });
});
