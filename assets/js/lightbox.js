/**
 * lightbox.js — Galeri lightbox & lazy loading
 *
 * Fitur:
 *  - initLightbox(gallerySelector)  — buka/navigasi/tutup lightbox foto galeri
 *  - initLazyLoading(selector)      — lazy-load gambar via IntersectionObserver
 *
 * Requirements: 6.2, 6.3, 6.4, 18.3
 *
 * Diekspor sebagai ES module (named exports) dan juga dipasang ke
 * window.WeddingLightbox untuk penggunaan non-module.
 */

// ---------------------------------------------------------------------------
// State lightbox
// ---------------------------------------------------------------------------

/** @type {HTMLElement[]} Daftar item galeri yang saat ini aktif */
let galleryItems = [];

/** @type {number} Index foto yang sedang ditampilkan di lightbox */
let currentIndex = -1;

// ---------------------------------------------------------------------------
// Referensi elemen DOM (diambil saat init)
// ---------------------------------------------------------------------------

/** @type {HTMLElement|null} */
let lightboxEl = null;
/** @type {HTMLElement|null} */
let overlayEl = null;
/** @type {HTMLImageElement|null} */
let imgEl = null;
/** @type {HTMLButtonElement|null} */
let prevBtn = null;
/** @type {HTMLButtonElement|null} */
let nextBtn = null;
/** @type {HTMLButtonElement|null} */
let closeBtn = null;

// ---------------------------------------------------------------------------
// Elemen yang bisa difokus (focus trap)
// ---------------------------------------------------------------------------

/** Daftar selektor elemen yang dapat difokus di dalam lightbox */
const FOCUSABLE_SELECTORS =
  'button:not([disabled]), [tabindex]:not([tabindex="-1"])';

// ---------------------------------------------------------------------------
// Helper: buka / tutup lightbox
// ---------------------------------------------------------------------------

/**
 * Memperbarui tampilan tombol prev/next berdasarkan index saat ini.
 * Tombol di-disable di foto pertama/terakhir (Requirement 6.3).
 */
function updateNavButtons() {
  if (!prevBtn || !nextBtn) return;

  const isFirst = currentIndex === 0;
  const isLast  = currentIndex === galleryItems.length - 1;

  prevBtn.disabled = isFirst;
  prevBtn.setAttribute('aria-disabled', String(isFirst));

  nextBtn.disabled = isLast;
  nextBtn.setAttribute('aria-disabled', String(isLast));
}

/**
 * Memuat foto ke lightbox sesuai index yang diberikan.
 * @param {number} index  — index foto dalam galleryItems
 */
function showPhoto(index) {
  if (index < 0 || index >= galleryItems.length) return;

  currentIndex = index;

  const item      = galleryItems[index];
  const imgInItem = item.querySelector('img');
  if (!imgInItem || !imgEl) return;

  // Gunakan src attribute (bukan reflected property) agar tidak tertipu resolusi URL jsdom/browser.
  // Jika src attribute kosong, gunakan data-src (lazy-loaded image belum dimuat).
  const srcAttr = imgInItem.getAttribute('src') || '';
  const src = srcAttr.trim() ? imgInItem.src : (imgInItem.dataset.src || imgInItem.src || '');
  const alt = imgInItem.alt || `Foto galeri ${index + 1}`;

  // Sembunyikan foto lama selama loading
  imgEl.style.opacity = '0';
  imgEl.src  = src;
  imgEl.alt  = alt;

  imgEl.onload  = () => { imgEl.style.opacity = '1'; };
  imgEl.onerror = () => { imgEl.style.opacity = '1'; };

  updateNavButtons();
}

/**
 * Membuka lightbox dan menampilkan foto pada index yang diberikan.
 * @param {number} index
 */
function openLightbox(index) {
  if (!lightboxEl) return;

  showPhoto(index);

  lightboxEl.hidden = false;
  lightboxEl.removeAttribute('hidden');
  document.body.style.overflow = 'hidden'; // cegah scroll background

  // Fokus ke tombol close agar keyboard dapat mengakses segera
  requestAnimationFrame(() => {
    if (closeBtn) closeBtn.focus();
  });

  // Pasang listener keyboard saat lightbox terbuka
  document.addEventListener('keydown', handleKeydown);
}

/**
 * Menutup lightbox dan mengembalikan fokus ke item galeri yang diklik.
 */
function closeLightbox() {
  if (!lightboxEl) return;

  lightboxEl.hidden = true;
  document.body.style.overflow = '';

  // Kembalikan fokus ke item galeri yang terakhir dibuka
  if (currentIndex >= 0 && galleryItems[currentIndex]) {
    const triggerImg = galleryItems[currentIndex].querySelector('img');
    if (triggerImg) triggerImg.focus();
  }

  // Lepas listener keyboard
  document.removeEventListener('keydown', handleKeydown);

  currentIndex = -1;
}

// ---------------------------------------------------------------------------
// Navigasi
// ---------------------------------------------------------------------------

/** Tampilkan foto sebelumnya (jika ada). */
function prevPhoto() {
  if (currentIndex > 0) showPhoto(currentIndex - 1);
}

/** Tampilkan foto berikutnya (jika ada). */
function nextPhoto() {
  if (currentIndex < galleryItems.length - 1) showPhoto(currentIndex + 1);
}

// ---------------------------------------------------------------------------
// Keyboard handler (ArrowLeft / ArrowRight / Escape + focus trap)
// ---------------------------------------------------------------------------

/**
 * Menangani keyboard saat lightbox terbuka.
 * @param {KeyboardEvent} e
 */
function handleKeydown(e) {
  switch (e.key) {
    case 'Escape':
      e.preventDefault();
      closeLightbox();
      break;

    case 'ArrowLeft':
      e.preventDefault();
      prevPhoto();
      break;

    case 'ArrowRight':
      e.preventDefault();
      nextPhoto();
      break;

    case 'Tab':
      // Focus trap: paksa fokus tetap di dalam lightbox
      trapFocus(e);
      break;
  }
}

/**
 * Menjaga fokus keyboard tetap di dalam lightbox (focus trap).
 * @param {KeyboardEvent} e
 */
function trapFocus(e) {
  if (!lightboxEl) return;

  const focusable = Array.from(
    lightboxEl.querySelectorAll(FOCUSABLE_SELECTORS)
  ).filter(el => !el.hidden && el.offsetParent !== null);

  if (focusable.length === 0) return;

  const first = focusable[0];
  const last  = focusable[focusable.length - 1];

  if (e.shiftKey) {
    // Shift+Tab: jika fokus di elemen pertama, pindah ke terakhir
    if (document.activeElement === first) {
      e.preventDefault();
      last.focus();
    }
  } else {
    // Tab: jika fokus di elemen terakhir, pindah ke pertama
    if (document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
}

// ---------------------------------------------------------------------------
// initLightbox — pasang click handler ke semua .gallery-item (Req 6.2, 6.3)
// ---------------------------------------------------------------------------

/**
 * Menginisialisasi lightbox pada klik foto galeri.
 *
 * @param {string} [gallerySelector='#gallery-grid'] — selektor container galeri
 *
 * Requirement 6.2: buka lightbox saat foto diklik
 * Requirement 6.3: nonaktifkan tombol prev di foto pertama & next di foto terakhir
 */
export function initLightbox(gallerySelector = '#gallery-grid') {
  // Ambil referensi elemen lightbox
  lightboxEl = document.getElementById('lightbox');
  overlayEl  = document.getElementById('lightbox-overlay');
  imgEl      = document.getElementById('lightbox-img');
  prevBtn    = document.getElementById('lightbox-prev');
  nextBtn    = document.getElementById('lightbox-next');
  closeBtn   = document.getElementById('lightbox-close');

  if (!lightboxEl) return; // Lightbox tidak ada di halaman ini

  // Kumpulkan semua item galeri
  const container = document.querySelector(gallerySelector);
  if (!container) return;

  galleryItems = Array.from(container.querySelectorAll('.gallery-item'));

  if (galleryItems.length === 0) return;

  // Pasang click handler ke setiap item galeri
  galleryItems.forEach((item, idx) => {
    item.style.cursor = 'pointer';

    // Buat gambar dalam item dapat difokus keyboard
    const img = item.querySelector('img');
    if (img) {
      img.setAttribute('tabindex', '0');
      img.setAttribute('role', 'button');
      img.setAttribute('aria-label', `Buka foto ${idx + 1} dalam lightbox`);

      // Buka lightbox dengan Enter/Space dari keyboard
      img.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openLightbox(idx);
        }
      });
    }

    item.addEventListener('click', () => openLightbox(idx));
  });

  // Tombol close — tutup lightbox (Requirement 6.2)
  if (closeBtn) {
    closeBtn.addEventListener('click', closeLightbox);
  }

  // Klik overlay — tutup lightbox (Requirement 6.2)
  if (overlayEl) {
    overlayEl.addEventListener('click', closeLightbox);
  }

  // Tombol navigasi prev/next (Requirement 6.3)
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (!prevBtn.disabled) prevPhoto();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (!nextBtn.disabled) nextPhoto();
    });
  }

  // Cegah klik di dalam konten lightbox dari menutup overlay
  const content = lightboxEl.querySelector('.lightbox__content');
  if (content) {
    content.addEventListener('click', (e) => e.stopPropagation());
  }
}

// ---------------------------------------------------------------------------
// initLazyLoading — IntersectionObserver dengan rootMargin 200px (Req 18.3)
// ---------------------------------------------------------------------------

/**
 * Menerapkan lazy loading pada gambar galeri menggunakan IntersectionObserver.
 * Gambar dimuat ketika berada dalam jarak 200px dari viewport (Requirement 18.3).
 *
 * @param {string} [selector='.gallery-item img.lazy'] — selektor gambar lazy
 */
export function initLazyLoading(selector = '.gallery-item img.lazy') {
  const images = Array.from(document.querySelectorAll(selector));
  if (images.length === 0) return;

  // Fallback ke eager loading jika IntersectionObserver tidak didukung
  if (!('IntersectionObserver' in window)) {
    images.forEach(img => {
      if (img.dataset.src) {
        img.src = img.dataset.src;
        img.classList.remove('lazy');
      }
    });
    return;
  }

  /**
   * Callback IntersectionObserver: muat gambar saat memasuki area observasi.
   * @param {IntersectionObserverEntry[]} entries
   * @param {IntersectionObserver} observer
   */
  function onIntersect(entries, observer) {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;

      const img = /** @type {HTMLImageElement} */ (entry.target);

      if (img.dataset.src) {
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
        img.classList.remove('lazy');

        // Hapus blur/placeholder class setelah gambar dimuat
        img.addEventListener('load', () => {
          img.classList.add('lazy--loaded');
        }, { once: true });
      }

      observer.unobserve(img);
    });
  }

  const observer = new IntersectionObserver(onIntersect, {
    rootMargin: '200px', // muat 200px sebelum masuk viewport (Requirement 18.3)
    threshold: 0,
  });

  images.forEach(img => observer.observe(img));
}

// ---------------------------------------------------------------------------
// Fungsi refresh: perbarui daftar item galeri setelah konten dimuat dinamis
// ---------------------------------------------------------------------------

/**
 * Memperbarui daftar item galeri (berguna setelah guest.js merender foto dari API).
 * Dipanggil oleh guest.js setelah populasi dinamis gallery-grid selesai.
 *
 * @param {string} [gallerySelector='#gallery-grid']
 */
export function refreshGallery(gallerySelector = '#gallery-grid') {
  const container = document.querySelector(gallerySelector);
  if (!container) return;

  galleryItems = Array.from(container.querySelectorAll('.gallery-item'));

  // Re-attach click handler dan atribut accessibility
  galleryItems.forEach((item, idx) => {
    item.style.cursor = 'pointer';

    const img = item.querySelector('img');
    if (img) {
      // Hindari duplikasi listener dengan cloneNode tidak praktis,
      // gunakan data attribute sebagai penanda
      if (img.dataset.lightboxBound) return;
      img.dataset.lightboxBound = '1';

      img.setAttribute('tabindex', '0');
      img.setAttribute('role', 'button');
      img.setAttribute('aria-label', `Buka foto ${idx + 1} dalam lightbox`);

      img.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openLightbox(idx);
        }
      });
    }

    // Tandai item agar tidak bind ulang
    if (!item.dataset.lightboxBound) {
      item.dataset.lightboxBound = '1';
      item.addEventListener('click', () => openLightbox(idx));
    }
  });
}

// ---------------------------------------------------------------------------
// Auto-init saat DOMContentLoaded (ketika dimuat sebagai <script> biasa)
// ---------------------------------------------------------------------------
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const run = () => {
    initLightbox('#gallery-grid');
    initLazyLoading('.gallery-item img.lazy');
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }

  // Expose ke namespace global untuk konsumen non-module
  window.WeddingLightbox = {
    initLightbox,
    initLazyLoading,
    refreshGallery,
  };
}
