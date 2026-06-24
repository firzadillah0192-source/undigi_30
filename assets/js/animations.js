/**
 * animations.js
 * GSAP Opening Animation + ScrollTrigger — Digital Wedding Invitation
 *
 * Exported functions:
 *   - playOpeningAnimation(onComplete)  — animasi opening amplop, total ≤ 4 detik (Req. 1.2)
 *   - initScrollAnimations()            — scroll-triggered entrance per [data-animate] (Req. 2.2, 14.4)
 *   - skipAnimation()                   — skip / hentikan animasi opening (Req. 1.7)
 *
 * GSAP dan ScrollTrigger dimuat via CDN (global `gsap` dan `ScrollTrigger`).
 * File ini bisa di-import sebagai ES module ATAU dijalankan langsung di browser
 * (fungsi juga di-attach ke `window` untuk penggunaan non-module).
 *
 * Requirements: 1.2, 1.5, 1.7, 2.2, 3.2, 4.2, 6.4, 7.2, 14.4
 */

'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// State internal
// ─────────────────────────────────────────────────────────────────────────────

/** Timeline GSAP aktif (null jika animasi belum dimulai atau sudah selesai) */
let _activeTl = null;

/** Flag: apakah animasi opening sudah selesai/diskip */
let _animationDone = false;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Scroll ke section pertama setelah cover.
 * Dipanggil otomatis oleh `onComplete` animation dan `skipAnimation`.
 * Req. 1.5
 */
function _scrollToFirstSection() {
    // Section pertama setelah #cover (biasanya #bismillah)
    const firstSection = document.querySelector('.section:not(#cover)') ||
                         document.getElementById('bismillah');
    if (!firstSection) return;

    // Gunakan smooth scroll native agar tidak membutuhkan library tambahan
    firstSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Finalisasi state UI setelah animasi selesai atau di-skip.
 * Memastikan semua elemen berada di posisi akhir yang benar.
 */
function _finalizeAnimationState() {
    if (_animationDone) return;
    _animationDone = true;

    // Guard: jika GSAP tidak tersedia, tidak ada yang perlu di-set
    if (typeof gsap === 'undefined') return;

    // Pastikan semua target berada di state akhir (opacity/transform final)
    gsap.set('.envelope',       { y: 0, opacity: 1 });
    gsap.set('.envelope-lid',   { rotateX: -160 });
    gsap.set('.invitation-card',{ y: -80, opacity: 1 });
    gsap.set('.flower-petals',  { scale: 1, opacity: 1 });
    gsap.set('.cover-content',  { opacity: 1, y: 0 });
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * playOpeningAnimation(onComplete)
 *
 * Memainkan animasi opening amplop pernikahan:
 *   1. Amplop muncul dari bawah    (y: 100→0, opacity: 0→1)
 *   2. Lid amplop membuka          (rotateX: 0→-160)
 *   3. Kartu undangan naik         (y: 0→-80, opacity: 0→1)
 *   4. Kelopak bunga bermekaran    (scale: 0→1, opacity: 0→1, stagger)
 *   5. Cover content fade-in       (opacity: 0→1, y: 20→0)
 *
 * Total durasi timeline: ≤ 4 detik (Req. 1.2)
 *
 * @param {Function} [onComplete] - Callback setelah animasi selesai penuh.
 *                                  Dipanggil juga saat animasi di-skip.
 * @returns {gsap.core.Timeline} Timeline GSAP yang sedang berjalan
 */
function playOpeningAnimation(onComplete) {
    // Guard: jika GSAP belum tersedia, panggil callback langsung
    if (typeof gsap === 'undefined') {
        console.warn('[animations.js] GSAP tidak tersedia. Animasi dilewati.');
        _finalizeAnimationState();
        if (typeof onComplete === 'function') onComplete();
        return null;
    }

    // Daftarkan ScrollTrigger jika belum
    if (typeof ScrollTrigger !== 'undefined') {
        gsap.registerPlugin(ScrollTrigger);
    }

    // Reset ke state awal sebelum animasi
    gsap.set('.envelope',        { y: 100, opacity: 0 });
    gsap.set('.envelope-lid',    { rotateX: 0 });
    gsap.set('.invitation-card', { y: 0, opacity: 0 });
    gsap.set('.flower-petals',   { scale: 0, opacity: 0 });
    gsap.set('.cover-content',   { opacity: 0, y: 20 });

    /** Callback internal yang dipanggil GSAP saat timeline selesai */
    function _onTimelineComplete() {
        _activeTl = null;
        _finalizeAnimationState();
        _scrollToFirstSection();
        if (typeof onComplete === 'function') onComplete();
    }

    // Bangun timeline GSAP
    // Total durasi ≈ 3.4 detik (0.6 + 0.2 delay + 0.8 + overlap 0.3 + 0.6 + overlap 0.2 + 0.5 + overlap 0.1 + 0.5 = ~3.4 detik)
    // Selalu di bawah batas 4 detik (Req. 1.2)
    const tl = gsap.timeline({ onComplete: _onTimelineComplete });

    tl
        // 1. Amplop muncul dari bawah: durasi 0.6 detik
        .fromTo(
            '.envelope',
            { y: 100, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.6, ease: 'power2.out' }
        )
        // 2. Tutup amplop membuka: mulai 0.2 detik setelah step 1 selesai
        .to(
            '.envelope-lid',
            { rotateX: -160, duration: 0.8, ease: 'power1.inOut', transformOrigin: 'top center' },
            '+=0.2'
        )
        // 3. Kartu undangan naik dari dalam amplop: overlap 0.3 detik
        .to(
            '.invitation-card',
            { y: -80, opacity: 1, duration: 0.6, ease: 'power2.out' },
            '-=0.3'
        )
        // 4. Kelopak bunga bermekaran: overlap 0.2 detik, stagger antar petal
        .to(
            '.flower-petals',
            { scale: 1, opacity: 1, stagger: 0.1, duration: 0.5, ease: 'back.out(1.7)' },
            '-=0.2'
        )
        // 5. Cover content fade-in: overlap 0.1 detik
        .to(
            '.cover-content',
            { opacity: 1, y: 0, duration: 0.5, ease: 'power1.out' },
            '-=0.1'
        );

    _activeTl = tl;
    return tl;
}

/**
 * skipAnimation()
 *
 * Menghentikan animasi opening yang sedang berjalan dan langsung
 * menampilkan state akhir. Dipanggil oleh:
 *   - Tombol "Lewati" (#btn-skip-animation)
 *   - Klik pada halaman selama animasi berlangsung
 *
 * Req. 1.7
 *
 * @param {Function} [onComplete] - Callback (sama seperti yang diberikan ke playOpeningAnimation)
 */
function skipAnimation(onComplete) {
    if (_animationDone) return;

    // Hentikan timeline aktif
    if (_activeTl) {
        _activeTl.kill();
        _activeTl = null;
    }

    _finalizeAnimationState();
    _scrollToFirstSection();

    if (typeof onComplete === 'function') onComplete();
}

/**
 * initScrollAnimations()
 *
 * Mendaftarkan GSAP ScrollTrigger pada semua elemen [data-animate].
 * Setiap elemen akan ter-animasi:
 *   - opacity: 0 → 1
 *   - y: 30 → 0
 *   - duration: 0.5 detik (dalam rentang 200ms–600ms, Req. 14.4)
 *   - trigger start: "top 80%" dari viewport
 *   - once: true (hanya sekali per sesi, Req. 2.2)
 *
 * Harus dipanggil setelah DOM siap dan setelah GSAP + ScrollTrigger
 * tersedia secara global.
 *
 * Req. 2.2, 3.2, 4.2, 6.4, 7.2, 14.4
 */
function initScrollAnimations() {
    // Guard: jika GSAP atau ScrollTrigger tidak tersedia, abaikan
    if (typeof gsap === 'undefined') {
        console.warn('[animations.js] GSAP tidak tersedia. Scroll animations dilewati.');
        return;
    }
    if (typeof ScrollTrigger === 'undefined') {
        console.warn('[animations.js] ScrollTrigger tidak tersedia. Scroll animations dilewati.');
        return;
    }

    // Hormati preferensi reduced motion (WCAG 2.1 SC 2.3.3)
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
        // Langsung tampilkan semua elemen tanpa animasi
        document.querySelectorAll('[data-animate]').forEach(el => {
            gsap.set(el, { opacity: 1, y: 0 });
        });
        return;
    }

    // Daftarkan plugin
    gsap.registerPlugin(ScrollTrigger);

    // Animasikan setiap elemen [data-animate]
    document.querySelectorAll('[data-animate]').forEach(el => {
        gsap.fromTo(
            el,
            // State awal — sesuai [data-animate] CSS di animations.css
            { opacity: 0, y: 30 },
            {
                opacity: 1,
                y: 0,
                duration: 0.5,           // 500ms — masuk rentang 200ms–600ms (Req. 14.4)
                ease: 'power2.out',
                scrollTrigger: {
                    trigger: el,
                    start: 'top 80%',    // aktif saat 80% viewport dari atas tercapai
                    once: true,          // hanya sekali per sesi (Req. 2.2)
                    // toggleActions: 'play none none none' — default, cocok dengan once: true
                },
            }
        );
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Auto-setup: daftarkan event listener tombol skip dan klik saat animasi
// ─────────────────────────────────────────────────────────────────────────────

/**
 * setupSkipListeners(onComplete)
 *
 * Daftarkan listener untuk:
 *   1. Tombol skip (#btn-skip-animation) → skipAnimation()
 *   2. Klik di mana saja pada halaman selama animasi → skipAnimation()
 *
 * Req. 1.7
 *
 * @param {Function} [onComplete] - Callback sama seperti di playOpeningAnimation
 */
function setupSkipListeners(onComplete) {
    const btnSkip = document.getElementById('btn-skip-animation');

    // Handler klik tombol skip
    function handleSkip(e) {
        e.stopPropagation();
        skipAnimation(onComplete);
        // Lepas semua listener setelah skip
        cleanup();
    }

    // Handler klik seluruh halaman selama animasi berjalan
    function handlePageClick() {
        if (!_animationDone && _activeTl) {
            skipAnimation(onComplete);
            cleanup();
        }
    }

    function cleanup() {
        if (btnSkip) btnSkip.removeEventListener('click', handleSkip);
        document.removeEventListener('click', handlePageClick);
    }

    if (btnSkip) {
        btnSkip.addEventListener('click', handleSkip);
    }

    // Pasang page-click listener (hanya aktif selama animasi berjalan)
    document.addEventListener('click', handlePageClick);
}

// ─────────────────────────────────────────────────────────────────────────────
// Export — ES Module + window fallback untuk CDN usage
// ─────────────────────────────────────────────────────────────────────────────

// Pasang ke window agar bisa digunakan tanpa bundler (CDN usage)
if (typeof window !== 'undefined') {
    window.WeddingAnimations = {
        playOpeningAnimation,
        initScrollAnimations,
        skipAnimation,
        setupSkipListeners,
    };
}

// ES Module exports
export {
    playOpeningAnimation,
    initScrollAnimations,
    skipAnimation,
    setupSkipListeners,
};

/**
 * _resetState() — hanya untuk testing.
 * Reset state internal modul agar setiap test berjalan dari state bersih.
 * Tidak di-attach ke window dan tidak untuk penggunaan produksi.
 *
 * @internal
 */
export function _resetState() {
    _activeTl = null;
    _animationDone = false;
}
