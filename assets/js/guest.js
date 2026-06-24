/**
 * guest.js — Logika utama Guest Page
 *
 * Tanggung jawab:
 *  - Membaca ?to= dari URL → personalisasi nama tamu
 *  - Fetch GET /api/?endpoint=content → render semua 12 section
 *  - Skeleton UI saat loading
 *  - Fallback ke localStorage cache jika API gagal
 *  - Menyembunyikan section kondisional (countdown, maps, envelope)
 *  - Placeholder SVG untuk foto 404
 *
 * Named exports  : buildGreeting, init
 * Window global  : window.WeddingGuest
 *
 * Requirements: 1.3, 1.4, 3.5, 4.6, 5.4, 8.4, 8.5, 11.7
 *
 * Fungsi-fungsi berikut akan ditambahkan oleh task lanjutan:
 *  - shareWhatsApp, copyLink   (8.11)
 *  - generateICS, downloadICS  (8.13)
 *  - validateTextLength        (8.15)
 *  - validateTimeRange         (8.17)
 *  - sanitizeText              (8.19)
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Cache key di localStorage untuk fallback konten. */
const CACHE_KEY = "wedding_content_cache";

/** Placeholder SVG untuk foto yang gagal dimuat. */
const PHOTO_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' " +
  "width='200' height='200' viewBox='0 0 200 200'%3E" +
  "%3Crect width='200' height='200' fill='%23C8DDB0'/%3E" +
  "%3Ctext x='50%25' y='50%25' dominant-baseline='middle' " +
  "text-anchor='middle' fill='%234A7C59' font-size='14'%3E📷%3C/text%3E" +
  "%3C/svg%3E";

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/**
 * Membangun string salam yang mengandung nama tamu secara verbatim.
 * Requirement 1.3, 1.4 — Property 1.
 *
 * @param {string|null|undefined} name  – nama dari ?to= parameter
 * @returns {string}  salam yang mengandung nama, atau salam default
 */
export function buildGreeting(name) {
  if (!name || typeof name !== "string" || name.trim() === "") {
    return "Kepada Yth. Tamu Undangan";
  }
  return `Kepada Yth. ${name}`;
}

/**
 * Membaca nilai parameter ?to= dari URL saat ini.
 * @returns {string}  nama tamu (bisa kosong)
 */
function getGuestNameFromURL() {
  try {
    return new URLSearchParams(window.location.search).get("to") ?? "";
  } catch {
    return "";
  }
}

/**
 * Memformat tanggal ISO (YYYY-MM-DD) ke format lokal Indonesia.
 * @param {string|null|undefined} isoDate
 * @returns {string}
 */
function formatDate(isoDate) {
  if (!isoDate) return "Segera diumumkan";
  try {
    const d = new Date(isoDate + "T00:00:00");
    return d.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return isoDate;
  }
}

/**
 * Memformat waktu HH:MM ke format 2-digit.
 * @param {string|null|undefined} t
 * @returns {string}
 */
function formatTime(t) {
  if (!t) return "Segera diumumkan";
  return t;
}

/**
 * Memasang onerror handler placeholder SVG pada sebuah <img>.
 * @param {HTMLImageElement} img
 */
function attachPhotoFallback(img) {
  img.addEventListener("error", function onErr() {
    img.removeEventListener("error", onErr);
    img.src = PHOTO_PLACEHOLDER;
    img.alt = "Foto tidak tersedia";
  });
}

// ---------------------------------------------------------------------------
// Skeleton UI helpers
// ---------------------------------------------------------------------------

/** Tampilkan semua skeleton loader (sudah ada di HTML, cukup unhide). */
function showSkeletons() {
  document.querySelectorAll(".skeleton-loader").forEach((el) => {
    el.removeAttribute("aria-hidden");
    el.style.display = "";
  });
}

/** Sembunyikan semua skeleton loader setelah konten dirender. */
function hideSkeletons() {
  document.querySelectorAll(".skeleton-loader").forEach((el) => {
    el.setAttribute("aria-hidden", "true");
    el.style.display = "none";
  });
}

// ---------------------------------------------------------------------------
// localStorage cache
// ---------------------------------------------------------------------------

/**
 * Simpan data konten ke localStorage sebagai fallback.
 * @param {object} data
 */
function saveToCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // Kuota habis atau private mode — abaikan
  }
}

/**
 * Baca data konten dari localStorage cache.
 * @returns {object|null}
 */
function loadFromCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Render: Settings (title, bismillah, hashtag)
// ---------------------------------------------------------------------------

/**
 * Update judul halaman, teks bismillah, dan hashtag dari settings.
 * Requirement 1.3
 *
 * @param {{ opening_text?: string, couple_hashtag?: string, website_title?: string }} settings
 */
function renderSettings(settings) {
  if (!settings) return;

  if (settings.website_title) {
    document.title = settings.website_title;
    const ogTitle = document.getElementById("og-title");
    if (ogTitle) ogTitle.content = settings.website_title;
  }

  if (settings.opening_text) {
    const bismillahOpening = document.getElementById("bismillah-opening");
    if (bismillahOpening) {
      bismillahOpening.textContent = settings.opening_text;
    }
  }

  if (settings.couple_hashtag) {
    const hashtagEl = document.getElementById("footer-hashtag");
    if (hashtagEl) hashtagEl.textContent = settings.couple_hashtag;
  }
}

// ---------------------------------------------------------------------------
// Render: Couple (Section 3)
// ---------------------------------------------------------------------------

/**
 * Isi section profil mempelai dari data API.
 * Requirement 3.5
 *
 * @param {{ groom: object, bride: object }} couple
 */
function renderCouple(couple) {
  if (!couple) return;

  /** @param {"groom"|"bride"} role @param {object} person */
  function fillPerson(role, person) {
    if (!person) return;

    const setEl = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val || "";
    };

    setEl(`${role}-name`, person.full_name);
    setEl(`${role}-nickname`, person.nickname);
    setEl(`${role}-father`, person.father_name ? `Bpk. ${person.father_name}` : "");
    setEl(`${role}-mother`, person.mother_name ? `Ibu ${person.mother_name}` : "");

    const photoEl = /** @type {HTMLImageElement|null} */ (
      document.getElementById(`${role}-photo`)
    );
    if (photoEl && person.photo_path) {
      photoEl.src = person.photo_path;
      photoEl.alt = `Foto ${person.full_name || role}`;
      attachPhotoFallback(photoEl);
    } else if (photoEl) {
      // Tidak ada foto — pasang fallback langsung
      photoEl.src = PHOTO_PLACEHOLDER;
      photoEl.alt = "Foto tidak tersedia";
    }
  }

  fillPerson("groom", couple.groom);
  fillPerson("bride", couple.bride);

  // Update cover couple names
  const groomNick = couple.groom?.nickname || couple.groom?.full_name || "Mempelai Pria";
  const brideNick = couple.bride?.nickname || couple.bride?.full_name || "Mempelai Wanita";

  const groomNameEl = document.querySelector(".cover-groom-name");
  const brideNameEl = document.querySelector(".cover-bride-name");
  if (groomNameEl) groomNameEl.textContent = groomNick;
  if (brideNameEl) brideNameEl.textContent = brideNick;

  // Footer couple names
  const footerNames = document.getElementById("footer-couple-names");
  if (footerNames) footerNames.textContent = `${groomNick} & ${brideNick}`;
}

// ---------------------------------------------------------------------------
// Render: Events (Section 4)
// ---------------------------------------------------------------------------

/**
 * Isi section detail acara (akad & resepsi).
 * Requirement 4.6 — tampilkan "Segera diumumkan" jika field kosong.
 *
 * @param {{ akad: object, resepsi: object }} events
 */
function renderEvents(events) {
  if (!events) return;

  /**
   * @param {"akad"|"resepsi"} type
   * @param {object} ev
   */
  function fillEvent(type, ev) {
    if (!ev) return;

    const setSpan = (id, val) => {
      const el = document.getElementById(id);
      if (!el) return;
      const span = el.querySelector("span") || el;
      span.textContent = val || "Segera diumumkan";
    };

    setSpan(`${type}-date`, formatDate(ev.event_date));

    // Waktu: "09.00 – 11.00" atau "Segera diumumkan"
    const timeStr =
      ev.start_time && ev.end_time
        ? `${formatTime(ev.start_time)} – ${formatTime(ev.end_time)}`
        : ev.start_time
        ? formatTime(ev.start_time)
        : null;
    setSpan(`${type}-time`, timeStr);
    setSpan(`${type}-venue`, ev.venue_name);

    const addrEl = document.getElementById(`${type}-address`);
    if (addrEl) addrEl.textContent = ev.address || "Segera diumumkan";

    // Cover date (gunakan akad sebagai tanggal utama)
    if (type === "akad" && ev.event_date) {
      const coverDate = document.getElementById("cover-date");
      if (coverDate) {
        const d = new Date(ev.event_date + "T00:00:00");
        coverDate.textContent = d.toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
      }
    }
  }

  fillEvent("akad", events.akad);
  fillEvent("resepsi", events.resepsi);
}

// ---------------------------------------------------------------------------
// Render: Countdown (Section 5) — conditional
// ---------------------------------------------------------------------------

/**
 * Sembunyikan #countdown jika tanggal akad null/kosong.
 * Requirement 5.4
 *
 * @param {{ akad?: { event_date?: string, start_time?: string } }} events
 */
function renderCountdown(events) {
  const section = document.getElementById("countdown");
  if (!section) return;

  const akadDate = events?.akad?.event_date;
  if (!akadDate) {
    section.style.display = "none";
    return;
  }

  // countdown.js menangani timer-nya sendiri — kita hanya set data attribute
  section.dataset.targetDate = akadDate;
  if (events.akad.start_time) {
    section.dataset.targetTime = events.akad.start_time;
  }
  section.style.display = "";

  // Trigger custom event agar countdown.js bisa membaca tanggal
  section.dispatchEvent(
    new CustomEvent("countdown:init", {
      detail: { date: akadDate, time: events.akad.start_time || "00:00" },
      bubbles: true,
    })
  );
}

// ---------------------------------------------------------------------------
// Render: Gallery (Section 6)
// ---------------------------------------------------------------------------

/**
 * Render grid galeri dengan lazy-loaded images.
 * Requirement 6 — isi #gallery-grid, pasang IntersectionObserver untuk lazy load.
 *
 * @param {Array<{id: number, file_path: string, caption: string}>} gallery
 */
function renderGallery(gallery) {
  const grid = document.getElementById("gallery-grid");
  if (!grid) return;

  const emptyMsg = document.getElementById("gallery-empty");

  if (!Array.isArray(gallery) || gallery.length === 0) {
    if (emptyMsg) emptyMsg.removeAttribute("hidden");
    return;
  }

  if (emptyMsg) emptyMsg.setAttribute("hidden", "");

  // Hapus item placeholder bila ada
  grid.querySelectorAll(".gallery-item").forEach((el) => el.remove());

  const supportsLazyAttr = "loading" in HTMLImageElement.prototype;

  gallery.forEach((item, idx) => {
    const figure = document.createElement("figure");
    figure.className = "gallery-item";
    figure.dataset.index = String(idx);

    const img = document.createElement("img");
    img.alt = item.caption || `Foto galeri ${idx + 1}`;
    img.width = 400;
    img.height = 300;
    img.className = "gallery-item__img";

    if (supportsLazyAttr) {
      img.loading = "lazy";
      img.src = item.file_path;
    } else {
      // Manual lazy-load via IntersectionObserver
      img.dataset.src = item.file_path;
      img.src = PHOTO_PLACEHOLDER;
    }

    attachPhotoFallback(img);

    if (item.caption) {
      const cap = document.createElement("figcaption");
      cap.className = "gallery-item__caption";
      cap.textContent = item.caption;
      figure.appendChild(img);
      figure.appendChild(cap);
    } else {
      figure.appendChild(img);
    }

    grid.appendChild(figure);
  });

  // IntersectionObserver untuk browser yang tidak support loading="lazy"
  if (!supportsLazyAttr && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = /** @type {HTMLImageElement} */ (entry.target);
            if (img.dataset.src) {
              img.src = img.dataset.src;
              delete img.dataset.src;
            }
            io.unobserve(img);
          }
        });
      },
      { rootMargin: "200px" }
    );
    grid.querySelectorAll("img[data-src]").forEach((img) => io.observe(img));
  }
}

// ---------------------------------------------------------------------------
// Render: Love Story / Timeline (Section 7)
// ---------------------------------------------------------------------------

/**
 * Render timeline kisah cinta.
 * Requirement 7 — urutan kronologis ascending (terlama → terbaru).
 *
 * @param {Array<{id:number,title:string,story_date:string,description:string,photo_path?:string}>} loveStory
 */
function renderLoveStory(loveStory) {
  const container = document.getElementById("timeline-container");
  if (!container) return;

  if (!Array.isArray(loveStory) || loveStory.length === 0) return;

  // Hapus item contoh dari HTML
  container.innerHTML = "";

  // API mengembalikan dalam urutan ascending (per sort_order / story_date)
  loveStory.forEach((item) => {
    const li = document.createElement("li");
    li.className = "timeline-item";
    li.setAttribute("data-animate", "");

    const dot = document.createElement("div");
    dot.className = "timeline-item__dot";
    dot.setAttribute("aria-hidden", "true");

    const card = document.createElement("div");
    card.className = "timeline-item__card";

    const time = document.createElement("time");
    time.className = "timeline-item__date";
    if (item.story_date) time.setAttribute("datetime", item.story_date);
    time.textContent = formatDate(item.story_date);

    const title = document.createElement("h3");
    title.className = "timeline-item__title";
    title.textContent = item.title || "";

    const desc = document.createElement("p");
    desc.className = "timeline-item__desc";
    desc.textContent = item.description || "";

    card.appendChild(time);
    card.appendChild(title);
    card.appendChild(desc);

    if (item.photo_path) {
      const img = document.createElement("img");
      img.src = item.photo_path;
      img.alt = item.title || "Foto kisah cinta";
      img.className = "timeline-item__photo";
      img.loading = "lazy";
      img.width = 300;
      img.height = 200;
      attachPhotoFallback(img);
      card.appendChild(img);
    }

    li.appendChild(dot);
    li.appendChild(card);
    container.appendChild(li);
  });
}

// ---------------------------------------------------------------------------
// Render: Maps (Section 8) — conditional
// ---------------------------------------------------------------------------

/**
 * Sembunyikan #maps jika tidak ada maps_embed_url maupun maps_url.
 * Requirement 8.4, 8.5
 *
 * @param {{ akad?: object, resepsi?: object }} events
 */
function renderMaps(events) {
  const section = document.getElementById("maps");
  if (!section) return;

  // Prioritas: akad maps, lalu resepsi maps
  const ev = events?.akad?.maps_embed_url
    ? events.akad
    : events?.resepsi?.maps_embed_url
    ? events.resepsi
    : null;

  if (!ev || (!ev.maps_embed_url && !ev.maps_url)) {
    section.style.display = "none";
    return;
  }

  section.style.display = "";

  const iframe = /** @type {HTMLIFrameElement|null} */ (
    document.getElementById("maps-iframe")
  );
  if (iframe && ev.maps_embed_url) {
    iframe.src = ev.maps_embed_url;

    // Fallback jika iframe gagal dimuat (Req 8.5)
    iframe.addEventListener("error", () => {
      iframe.style.display = "none";
      const fallback = document.getElementById("maps-fallback");
      const fallbackAddr = document.getElementById("maps-fallback-address");
      if (fallback) fallback.removeAttribute("hidden");
      if (fallbackAddr) fallbackAddr.textContent = ev.address || "Alamat belum tersedia.";
    });
  }

  const btnMaps = /** @type {HTMLAnchorElement|null} */ (
    document.getElementById("btn-open-maps")
  );
  if (btnMaps && ev.maps_url) {
    btnMaps.href = ev.maps_url;
  }
}

// ---------------------------------------------------------------------------
// Render: Envelope / Amplop Digital (Section 11) — conditional
// ---------------------------------------------------------------------------

/**
 * Render section amplop digital. Sembunyikan jika array kosong.
 * Requirement 11.7
 *
 * @param {Array<{id:number,bank_name:string,account_holder:string,account_number:string}>} envelope
 */
function renderEnvelope(envelope) {
  const section = document.getElementById("envelope");
  if (!section) return;

  if (!Array.isArray(envelope) || envelope.length === 0) {
    section.style.display = "none";
    return;
  }

  section.style.display = "";

  const grid = document.getElementById("envelope-grid");
  if (!grid) return;

  // Hapus placeholder
  grid.querySelectorAll(".envelope-card").forEach((el) => el.remove());

  envelope.forEach((item) => {
    const card = document.createElement("div");
    card.className = "envelope-card";
    card.setAttribute("data-animate", "");

    const bankName = document.createElement("p");
    bankName.className = "envelope-card__bank";
    bankName.textContent = item.bank_name || "";

    const holder = document.createElement("p");
    holder.className = "envelope-card__holder";
    holder.textContent = item.account_holder || "";

    const numberWrap = document.createElement("div");
    numberWrap.className = "envelope-card__number-wrap";

    const number = document.createElement("span");
    number.className = "envelope-card__number";
    number.textContent = item.account_number || "";
    number.id = `account-number-${item.id}`;

    const copyBtn = document.createElement("button");
    copyBtn.className = "btn btn--outline btn--copy";
    copyBtn.setAttribute("aria-label", `Salin nomor rekening ${item.bank_name}`);
    copyBtn.dataset.accountNumber = item.account_number || "";
    copyBtn.dataset.accountId = String(item.id);

    const copyIcon = document.createElement("i");
    copyIcon.setAttribute("data-feather", "copy");
    copyIcon.setAttribute("aria-hidden", "true");
    copyBtn.appendChild(copyIcon);
    copyBtn.appendChild(document.createTextNode(" Salin"));

    copyBtn.addEventListener("click", () => {
      const number = item.account_number || "";
      navigator.clipboard.writeText(number)
        .then(() => {
          const originalHTML = copyBtn.innerHTML;
          copyBtn.textContent = "Tersalin!";
          setTimeout(() => {
            copyBtn.innerHTML = originalHTML;
          }, 2000);
        })
        .catch(() => {
          alert(`Gagal menyalin otomatis. Silakan salin manual: ${number}`);
        });
    });

    numberWrap.appendChild(number);
    numberWrap.appendChild(copyBtn);
    card.appendChild(bankName);
    card.appendChild(holder);
    card.appendChild(numberWrap);
    grid.appendChild(card);
  });

  // Re-initialize Feather icons for newly injected elements
  if (typeof feather !== "undefined") {
    feather.replace({ "aria-hidden": "true" });
  }
}

// ---------------------------------------------------------------------------
// Render: Music
// ---------------------------------------------------------------------------

/**
 * Set src musik latar pada elemen <audio> dan aktifkan tombol kontrol.
 * Requirement 13 — music.js menangani play/pause; kita hanya set sumber.
 *
 * @param {{ file_path?: string, original_name?: string }|null} music
 */
function renderMusic(music) {
  const toggleBtn = document.getElementById("music-toggle");
  if (!music || !music.file_path) {
    if (toggleBtn) toggleBtn.disabled = true;
    return;
  }

  // music.js mendengarkan event 'music:ready' untuk memuat track
  document.dispatchEvent(
    new CustomEvent("music:ready", {
      detail: { src: music.file_path, name: music.original_name },
    })
  );

  if (toggleBtn) toggleBtn.disabled = false;
}

// ---------------------------------------------------------------------------
// Render: Guest name (Cover)
// ---------------------------------------------------------------------------

/**
 * Tampilkan nama tamu di cover.
 * Requirement 1.3, 1.4
 *
 * @param {string} rawName – nilai dari ?to= URL param
 */
function renderGuestName(rawName) {
  const displayEl = document.getElementById("guest-name-display");
  if (!displayEl) return;

  const name = rawName?.trim() || "";
  displayEl.textContent = name || "Tamu Undangan";

  // RSVP auto-fill — isi field nama jika belum diisi
  try {
    const rsvpInput = /** @type {HTMLInputElement|null} */ (
      document.getElementById("rsvp-guest-name")
    );
    if (rsvpInput && !rsvpInput.value && name) {
      rsvpInput.value = name;
    }
    // Guestbook auto-fill
    const gbInput = /** @type {HTMLInputElement|null} */ (
      document.getElementById("gb-sender-name")
    );
    if (gbInput && !gbInput.value && name) {
      gbInput.value = name;
    }
  } catch {
    // Non-browser environment — skip
  }
}

// ---------------------------------------------------------------------------
// Master render — wires semua section dari satu objek data
// ---------------------------------------------------------------------------

/**
 * Render semua section dari objek data yang sudah divalidasi.
 * @param {object} data  – isi dari response.data
 * @param {string} guestName
 */
function renderAll(data, guestName) {
  renderGuestName(guestName);
  renderSettings(data.settings);
  renderCouple(data.couple);
  renderEvents(data.events);
  renderCountdown(data.events);
  renderMaps(data.events);
  renderGallery(data.gallery);
  renderLoveStory(data.love_story);
  renderEnvelope(data.envelope);
  renderMusic(data.music ?? null);
  hideSkeletons();
}

// ---------------------------------------------------------------------------
// API fetch with cache fallback
// ---------------------------------------------------------------------------

/**
 * Fetch konten dari API. Jika gagal, gunakan localStorage cache.
 * Requirement 8.4, 8.5
 *
 * @returns {Promise<object|null>} data object atau null
 */
async function fetchContent() {
  try {
    const response = await fetch("/api/?endpoint=content");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = await response.json();
    if (!json.success || !json.data) throw new Error("API returned no data");
    saveToCache(json.data);
    return json.data;
  } catch (err) {
    console.warn("[guest.js] API fetch gagal, coba cache:", err.message);
    const cached = loadFromCache();
    if (cached) return cached;
    console.error("[guest.js] Tidak ada cache tersedia.");
    return null;
  }
}

// ---------------------------------------------------------------------------
// Stub placeholders — akan diimplementasi oleh task 8.11, 8.13, 8.15, 8.17, 8.19
// ---------------------------------------------------------------------------

/**
 * Bagikan via WhatsApp.
 * Requirement 12.2
 */
export function shareWhatsApp() {
  const groom = document.querySelector(".cover-groom-name")?.textContent || "Mempelai Pria";
  const bride = document.querySelector(".cover-bride-name")?.textContent || "Mempelai Wanita";
  const link = stripToParam(window.location.href);
  const text = `Halo! Kamu diundang ke pernikahan ${groom} & ${bride}. Silakan kunjungi tautan berikut untuk detail selengkapnya: ${link}`;
  const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(waUrl, "_blank");
}

/**
 * Salin tautan undangan tanpa parameter ?to=.
 * Requirement 12.3
 */
export function copyLink() {
  const link = stripToParam(window.location.href);
  const feedback = document.getElementById("copy-link-feedback");

  navigator.clipboard.writeText(link)
    .then(() => {
      if (feedback) {
        feedback.textContent = "Tersalin!";
        feedback.removeAttribute("hidden");
        feedback.style.display = "block";
        setTimeout(() => {
          feedback.setAttribute("hidden", "");
          feedback.style.display = "none";
        }, 2000);
      }
    })
    .catch(() => {
      if (feedback) {
        feedback.textContent = "Gagal menyalin link. Silakan salin manual.";
        feedback.removeAttribute("hidden");
        feedback.style.display = "block";
        setTimeout(() => {
          feedback.setAttribute("hidden", "");
          feedback.style.display = "none";
        }, 2000);
      }
    });
}

/**
 * Strip parameter ?to= dari URL.
 * @param {string} url
 * @returns {string}
 */
export function stripToParam(url) {
  if (!url) return "";
  try {
    const isAbsolute = /^[a-z0-9+.-]+:\/\//i.test(url);
    const base = isAbsolute ? undefined : (typeof window !== "undefined" ? window.location.origin : "http://localhost");
    const u = new URL(url, base);
    u.searchParams.delete("to");
    if (!isAbsolute) {
      let relative = url.startsWith("/") ? u.pathname + u.search + u.hash : (u.pathname.split("/").pop() + u.search + u.hash);
      if (!url.startsWith("/") && relative.startsWith("/")) {
        relative = relative.substring(1);
      }
      return relative;
    }
    return u.toString();
  } catch {
    return url;
  }
}

/**
 * Generate string iCalendar (.ics) dari objek event.
 * Fungsi murni — tidak ada side effect.
 * Requirement 4.3
 *
 * @param {{ title: string, date: string, start_time: string, end_time: string, address: string }} event
 * @returns {string}  iCalendar format string, atau string kosong jika input tidak valid
 */
export function generateICS(event) {
  if (!event || !event.title || !event.date || !event.start_time || !event.end_time || !event.address) {
    return "";
  }

  try {
    /**
     * Konversi "YYYY-MM-DD" + "HH:MM" ke format iCal "YYYYMMDDTHHMMSS"
     * @param {string} date   YYYY-MM-DD
     * @param {string} time   HH:MM
     * @returns {string}
     */
    function toICSDateTime(date, time) {
      const d = date.replace(/-/g, "");
      const t = time.replace(/:/g, "") + "00"; // pad seconds
      return `${d}T${t}`;
    }

    const dtStart = toICSDateTime(event.date, event.start_time);
    const dtEnd   = toICSDateTime(event.date, event.end_time);

    // UID deterministik berdasar konten agar tidak berubah di setiap generate
    const uid = `${dtStart}-${event.title.replace(/\s+/g, "")}@wedding-invitation`;

    const icsLines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Wedding Invitation//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${event.title}`,
      `LOCATION:${event.address}`,
      `UID:${uid}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ];

    return icsLines.join("\r\n");
  } catch {
    return "";
  }
}

/**
 * Buat Blob URL dari string .ics dan trigger download ke browser.
 * Tampilkan pesan error inline jika generate gagal.
 * Requirement 4.3, 4.4
 *
 * @param {object} event  – objek acara (title, date, start_time, end_time, address)
 * @param {string} [filename="event.ics"]  – nama file yang diunduh
 */
export function downloadICS(event, filename) {
  const icsString = generateICS(event);

  if (!icsString) {
    // Requirement 4.4 — tampilkan pesan error kepada Tamu
    const errContainer = document.getElementById("ics-error") || document.body;
    const msg = document.createElement("p");
    msg.className = "ics-error-message";
    msg.setAttribute("role", "alert");
    msg.textContent = "Gagal membuat file kalender. Silakan coba lagi.";
    errContainer.appendChild(msg);
    setTimeout(() => msg.remove(), 5000);
    return;
  }

  try {
    const blob = new Blob([icsString], { type: "text/calendar;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = filename || "event.ics";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch {
    const errContainer = document.getElementById("ics-error") || document.body;
    const msg = document.createElement("p");
    msg.className = "ics-error-message";
    msg.setAttribute("role", "alert");
    msg.textContent = "Gagal mengunduh file kalender. Silakan coba lagi.";
    errContainer.appendChild(msg);
    setTimeout(() => msg.remove(), 5000);
  }
}

/**
 * Validasi panjang teks. (task 8.15)
 * Fungsi murni — kembalikan true jika text.length <= maxLength, false jika melebihi.
 * Requirement 2.3, 3.3, 7.3, 10.2, 17.1, 17.2, 17.3
 *
 * @param {string} text
 * @param {number} maxLength
 * @returns {boolean}
 */
export function validateTextLength(text, maxLength) {
  const str = typeof text === "string" ? text : String(text ?? "");
  return str.length <= maxLength;
}

/**
 * Validasi rentang waktu. (task 8.17)
 * Fungsi murni — kembalikan true jika end >= start, false jika end < start.
 * Menggunakan logika yang sama dengan PHP strtotime comparison.
 * Requirement 4.5
 *
 * @param {string} start  – waktu mulai format "HH:MM"
 * @param {string} end    – waktu selesai format "HH:MM"
 * @returns {boolean}
 */
export function validateTimeRange(start, end) {
  if (!start || !end) return true; // Jika salah satu kosong, anggap valid (tidak bisa dibandingkan)
  // Gunakan tanggal referensi yang sama agar hanya waktu yang dibandingkan
  const REF_DATE = "2000-01-01";
  const startMs  = new Date(`${REF_DATE}T${start}:00`).getTime();
  const endMs    = new Date(`${REF_DATE}T${end}:00`).getTime();
  if (isNaN(startMs) || isNaN(endMs)) return true; // Format tidak valid — tidak bisa divalidasi
  return endMs >= startMs;
}

/**
 * Sanitasi input teks. (task 8.19)
 * Strip semua tag HTML, trim whitespace, truncate ke maxLength.
 * Mencerminkan perilaku PHP strip_tags + trim + mb_substr.
 * Requirement 19.2, 19.3
 *
 * @param {string} input
 * @param {number} maxLength
 * @returns {string}
 */
export function sanitizeText(input, maxLength) {
  if (input === null || input === undefined) return "";
  const str = typeof input === "string" ? input : String(input);
  // Strip semua tag HTML menggunakan regex — menghapus <tagname ...> dan </tagname>
  const stripped = str.replace(/<[^>]*>/g, "");
  const trimmed  = stripped.trim();
  // Truncate ke maxLength (tidak memotong di tengah karakter multibyte untuk ASCII-safe strings)
  return typeof maxLength === "number" && maxLength >= 0
    ? trimmed.slice(0, maxLength)
    : trimmed;
}

// ---------------------------------------------------------------------------
// init() — entry point utama
// ---------------------------------------------------------------------------

/**
 * Inisialisasi tombol bagikan di footer.
 */
function initShareButtons() {
  const btnWa = document.getElementById("btn-share-whatsapp");
  if (btnWa) {
    btnWa.addEventListener("click", () => shareWhatsApp());
  }

  const btnCopy = document.getElementById("btn-copy-link");
  if (btnCopy) {
    btnCopy.addEventListener("click", () => copyLink());
  }
}

/**
 * Inisialisasi Guest Page:
 *  1. Baca ?to= dari URL
 *  2. Tampilkan skeleton UI
 *  3. Fetch konten dari API (fallback ke cache)
 *  4. Render semua section
 *
 * Requirement 1.3, 1.4
 *
 * @returns {Promise<void>}
 */
export async function init() {
  const guestName = getGuestNameFromURL();

  // Tampilkan salam segera (sebelum API selesai) — Requirement 1.3
  renderGuestName(guestName);
  showSkeletons();
  initShareButtons();

  const data = await fetchContent();

  if (!data) {
    // Tidak ada data sama sekali — sembunyikan skeleton, tampilkan konten default
    hideSkeletons();
    return;
  }

  renderAll(data, guestName);
}

// ---------------------------------------------------------------------------
// Auto-init on DOMContentLoaded
// ---------------------------------------------------------------------------
if (typeof window !== "undefined" && typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => init());
  } else {
    init();
  }

  // Expose on global namespace for non-module consumers and other scripts
  window.WeddingGuest = {
    init,
    buildGreeting,
    shareWhatsApp,
    copyLink,
    stripToParam,
    generateICS,
    validateTextLength,
    validateTimeRange,
    sanitizeText,
  };
}
