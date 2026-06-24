/**
 * animations.test.js
 * Unit tests untuk assets/js/animations.js
 *
 * Requirements: 1.2, 1.5, 1.7, 2.2, 14.4
 *
 * Strategy:
 * - GSAP dimuat via CDN (tidak di-install sebagai npm package).
 * - Kita sediakan mock minimal di `globalThis` sebelum file diimport.
 * - Karena ES module di-cache, state internal modul (_activeTl, _animationDone)
 *   diuji melalui behavior publik (fungsi return value, mock call counts).
 * - Setiap describe-block menguji satu aspek dari kontrak publik modul.
 */

import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';

// ─────────────────────────────────────────────────────────────────────────────
// Buat timeline mock yang bisa di-configure per test
// ─────────────────────────────────────────────────────────────────────────────

let _gsapMock;
let _tlMock;
let _capturedOnComplete;

function resetMocks() {
    _tlMock = {
        fromTo: vi.fn().mockReturnThis(),
        to:     vi.fn().mockReturnThis(),
        kill:   vi.fn(),
        /** Memicu onComplete seolah-olah GSAP timeline selesai */
        _finish() {
            if (typeof _capturedOnComplete === 'function') {
                _capturedOnComplete();
            }
        },
    };

    _gsapMock = {
        registerPlugin: vi.fn(),
        set:     vi.fn(),
        fromTo:  vi.fn(),
        timeline: vi.fn((opts) => {
            _capturedOnComplete = opts?.onComplete;
            return _tlMock;
        }),
    };

    _capturedOnComplete = undefined;

    globalThis.gsap = _gsapMock;
    globalThis.ScrollTrigger = { _name: 'ScrollTrigger' };
}

// ─────────────────────────────────────────────────────────────────────────────
// Setup DOM minimal sesuai index.html
// ─────────────────────────────────────────────────────────────────────────────

function setupDOM() {
    document.body.innerHTML = `
        <section id="cover" class="section section--cover">
            <div class="envelope-stage">
                <div class="envelope">
                    <div class="envelope-lid"></div>
                    <div class="invitation-card"></div>
                </div>
                <div class="flower-petals">
                    <span class="petal petal--1"></span>
                    <span class="petal petal--2"></span>
                </div>
            </div>
            <div class="cover-content"></div>
            <button id="btn-skip-animation">Lewati</button>
        </section>
        <section id="bismillah" class="section section--bismillah">
            <p data-animate>Bismillah</p>
        </section>
        <section id="couple" class="section section--couple">
            <div data-animate>Couple</div>
        </section>
        <section id="events" class="section section--events">
            <div data-animate>Events</div>
        </section>
    `;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pasang GSAP mock sebelum import modul (modul akan membaca globalThis.gsap
// pada waktu eksekusi fungsi, bukan waktu parse — aman untuk mock awal)
// ─────────────────────────────────────────────────────────────────────────────
resetMocks();
setupDOM();

// Import SETELAH globalThis.gsap tersedia
const {
    playOpeningAnimation,
    initScrollAnimations,
    skipAnimation,
    setupSkipListeners,
    _resetState,
} = await import('../../assets/js/animations.js');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('animations.js', () => {

    beforeEach(() => {
        resetMocks();
        setupDOM();
        // Reset state internal modul agar setiap test mulai dari state bersih
        _resetState();
        // Pastikan matchMedia mengembalikan prefers-reduced-motion: false (default)
        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            value: vi.fn().mockReturnValue({ matches: false }),
        });
        // Mock scrollIntoView — jsdom tidak mengimplementasikannya
        Element.prototype.scrollIntoView = vi.fn();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 1. window.WeddingAnimations namespace
    // ─────────────────────────────────────────────────────────────────────────

    describe('window.WeddingAnimations', () => {
        it('mengekspor semua fungsi publik ke window.WeddingAnimations', () => {
            expect(window.WeddingAnimations).toBeDefined();
            expect(typeof window.WeddingAnimations.playOpeningAnimation).toBe('function');
            expect(typeof window.WeddingAnimations.initScrollAnimations).toBe('function');
            expect(typeof window.WeddingAnimations.skipAnimation).toBe('function');
            expect(typeof window.WeddingAnimations.setupSkipListeners).toBe('function');
        });

        it('fungsi yang di-attach ke window identik dengan named export', () => {
            expect(window.WeddingAnimations.playOpeningAnimation).toBe(playOpeningAnimation);
            expect(window.WeddingAnimations.initScrollAnimations).toBe(initScrollAnimations);
            expect(window.WeddingAnimations.skipAnimation).toBe(skipAnimation);
            expect(window.WeddingAnimations.setupSkipListeners).toBe(setupSkipListeners);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 2. playOpeningAnimation — Req. 1.2
    // ─────────────────────────────────────────────────────────────────────────

    describe('playOpeningAnimation()', () => {
        it('memanggil gsap.timeline() tepat sekali', () => {
            playOpeningAnimation();
            expect(_gsapMock.timeline).toHaveBeenCalledTimes(1);
        });

        it('mengembalikan object timeline (bukan null)', () => {
            const tl = playOpeningAnimation();
            expect(tl).not.toBeNull();
            expect(tl).toBe(_tlMock);
        });

        it('memanggil gsap.set() minimal 5 kali untuk reset state awal elemen', () => {
            playOpeningAnimation();
            expect(_gsapMock.set.mock.calls.length).toBeGreaterThanOrEqual(5);
        });

        it('memiliki tepat 1 fromTo (envelope) + 4 to (lid, card, petals, cover) = 5 step', () => {
            playOpeningAnimation();
            expect(_tlMock.fromTo).toHaveBeenCalledTimes(1);
            expect(_tlMock.to).toHaveBeenCalledTimes(4);
        });

        it('step 1: animasikan .envelope dari {y:100, opacity:0} ke {y:0, opacity:1}', () => {
            playOpeningAnimation();
            const [selector, fromVars, toVars] = _tlMock.fromTo.mock.calls[0];
            expect(selector).toBe('.envelope');
            expect(fromVars).toMatchObject({ y: 100, opacity: 0 });
            expect(toVars).toMatchObject({ y: 0, opacity: 1 });
        });

        it('step 2: animasikan .envelope-lid ke rotateX: -160', () => {
            playOpeningAnimation();
            const [selector, vars] = _tlMock.to.mock.calls[0];
            expect(selector).toBe('.envelope-lid');
            expect(vars).toMatchObject({ rotateX: -160 });
        });

        it('step 3: animasikan .invitation-card ke {y: -80, opacity: 1}', () => {
            playOpeningAnimation();
            const [selector, vars] = _tlMock.to.mock.calls[1];
            expect(selector).toBe('.invitation-card');
            expect(vars).toMatchObject({ y: -80, opacity: 1 });
        });

        it('step 4: animasikan .flower-petals ke {scale: 1, opacity: 1} dengan stagger > 0', () => {
            playOpeningAnimation();
            const [selector, vars] = _tlMock.to.mock.calls[2];
            expect(selector).toBe('.flower-petals');
            expect(vars).toMatchObject({ scale: 1, opacity: 1 });
            expect(vars.stagger).toBeGreaterThan(0);
        });

        it('step 5: animasikan .cover-content ke {opacity: 1, y: 0}', () => {
            playOpeningAnimation();
            const [selector, vars] = _tlMock.to.mock.calls[3];
            expect(selector).toBe('.cover-content');
            expect(vars).toMatchObject({ opacity: 1, y: 0 });
        });

        it('durasi setiap step ≤ 1 detik (Req. 1.2 — total ≤ 4 detik)', () => {
            playOpeningAnimation();
            // fromTo step
            const toVarsFromTo = _tlMock.fromTo.mock.calls[0][2];
            expect(toVarsFromTo.duration).toBeLessThanOrEqual(1);
            // to steps
            _tlMock.to.mock.calls.forEach(([, vars]) => {
                expect(vars.duration).toBeLessThanOrEqual(1);
            });
        });

        it('jumlah total durasi step ≤ 4 detik (Req. 1.2)', () => {
            playOpeningAnimation();
            const fromToDur  = _tlMock.fromTo.mock.calls[0][2].duration;
            const toDurs     = _tlMock.to.mock.calls.map(([, v]) => v.duration);
            const totalNaive = [fromToDur, ...toDurs].reduce((a, b) => a + b, 0);
            // Bahkan tanpa memperhitungkan overlap, total naive ≤ 4 detik
            expect(totalNaive).toBeLessThanOrEqual(4);
        });

        it('memanggil callback onComplete setelah timeline selesai', () => {
            const cb = vi.fn();
            playOpeningAnimation(cb);
            _tlMock._finish();
            expect(cb).toHaveBeenCalledTimes(1);
        });

        it('tidak throw jika onComplete tidak diberikan', () => {
            playOpeningAnimation(); // tanpa callback
            expect(() => _tlMock._finish()).not.toThrow();
        });

        it('mengembalikan null dan memanggil callback langsung jika GSAP tidak tersedia', () => {
            delete globalThis.gsap;
            const cb = vi.fn();
            const result = playOpeningAnimation(cb);
            expect(result).toBeNull();
            expect(cb).toHaveBeenCalledTimes(1);
            // Restore
            resetMocks();
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 3. skipAnimation — Req. 1.7
    // ─────────────────────────────────────────────────────────────────────────

    describe('skipAnimation()', () => {
        it('membunuh timeline aktif saat dipanggil selama animasi berlangsung', () => {
            playOpeningAnimation();
            skipAnimation();
            expect(_tlMock.kill).toHaveBeenCalledTimes(1);
        });

        it('memanggil gsap.set() untuk semua elemen di state akhir saat skip', () => {
            playOpeningAnimation();
            _gsapMock.set.mockClear(); // bersihkan calls dari playOpeningAnimation
            skipAnimation();
            expect(_gsapMock.set).toHaveBeenCalled();
        });

        it('memanggil gsap.set pada .envelope ke state akhir (y:0, opacity:1)', () => {
            playOpeningAnimation();
            _gsapMock.set.mockClear();
            skipAnimation();
            const envelopeCall = _gsapMock.set.mock.calls.find(([sel]) => sel === '.envelope');
            expect(envelopeCall).toBeDefined();
            expect(envelopeCall[1]).toMatchObject({ y: 0, opacity: 1 });
        });

        it('memanggil gsap.set pada .cover-content ke state akhir (opacity:1, y:0)', () => {
            playOpeningAnimation();
            _gsapMock.set.mockClear();
            skipAnimation();
            const coverCall = _gsapMock.set.mock.calls.find(([sel]) => sel === '.cover-content');
            expect(coverCall).toBeDefined();
            expect(coverCall[1]).toMatchObject({ opacity: 1, y: 0 });
        });

        it('memanggil callback onComplete yang diberikan', () => {
            playOpeningAnimation();
            const cb = vi.fn();
            skipAnimation(cb);
            expect(cb).toHaveBeenCalledTimes(1);
        });

        it('tidak throw jika dipanggil tanpa animasi aktif', () => {
            expect(() => skipAnimation()).not.toThrow();
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 4. setupSkipListeners — Req. 1.7
    // ─────────────────────────────────────────────────────────────────────────

    describe('setupSkipListeners()', () => {
        it('meng-skip animasi dan memanggil callback saat tombol #btn-skip-animation diklik', () => {
            // Mulai animasi baru (state internal akan menjadi aktif)
            // Karena module state di-share, gunakan cara simulasi berbeda:
            // setupSkipListeners memanggil skipAnimation yang membunuh _activeTl
            playOpeningAnimation();
            const cb = vi.fn();
            setupSkipListeners(cb);

            const btnSkip = document.getElementById('btn-skip-animation');
            expect(btnSkip).not.toBeNull();
            btnSkip.click();

            expect(cb).toHaveBeenCalled();
        });

        it('tidak throw jika #btn-skip-animation tidak ada di DOM', () => {
            document.getElementById('btn-skip-animation')?.remove();
            playOpeningAnimation();
            expect(() => setupSkipListeners()).not.toThrow();
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 5. initScrollAnimations — Req. 2.2, 14.4
    // ─────────────────────────────────────────────────────────────────────────

    describe('initScrollAnimations()', () => {
        it('mendaftarkan ScrollTrigger plugin via gsap.registerPlugin()', () => {
            initScrollAnimations();
            expect(_gsapMock.registerPlugin).toHaveBeenCalledWith(globalThis.ScrollTrigger);
        });

        it('memanggil gsap.fromTo() satu kali untuk setiap elemen [data-animate]', () => {
            const elCount = document.querySelectorAll('[data-animate]').length;
            initScrollAnimations();
            expect(_gsapMock.fromTo).toHaveBeenCalledTimes(elCount);
        });

        it('setiap fromTo dimulai dari opacity: 0, y: 30 (initial hidden state)', () => {
            initScrollAnimations();
            _gsapMock.fromTo.mock.calls.forEach(([, fromVars]) => {
                expect(fromVars).toMatchObject({ opacity: 0, y: 30 });
            });
        });

        it('setiap fromTo berakhir di opacity: 1, y: 0 (visible state)', () => {
            initScrollAnimations();
            _gsapMock.fromTo.mock.calls.forEach(([, , toVars]) => {
                expect(toVars).toMatchObject({ opacity: 1, y: 0 });
            });
        });

        it('durasi scroll animation antara 200ms (0.2) dan 600ms (0.6) — Req. 14.4', () => {
            initScrollAnimations();
            _gsapMock.fromTo.mock.calls.forEach(([, , toVars]) => {
                expect(toVars.duration).toBeGreaterThanOrEqual(0.2);
                expect(toVars.duration).toBeLessThanOrEqual(0.6);
            });
        });

        it('ScrollTrigger.start ditetapkan "top 80%"', () => {
            initScrollAnimations();
            _gsapMock.fromTo.mock.calls.forEach(([, , toVars]) => {
                expect(toVars.scrollTrigger).toBeDefined();
                expect(toVars.scrollTrigger.start).toBe('top 80%');
            });
        });

        it('ScrollTrigger.once ditetapkan true — animasi hanya sekali per sesi (Req. 2.2)', () => {
            initScrollAnimations();
            _gsapMock.fromTo.mock.calls.forEach(([, , toVars]) => {
                expect(toVars.scrollTrigger.once).toBe(true);
            });
        });

        it('setiap ScrollTrigger.trigger merujuk ke elemen DOM yang sesuai', () => {
            const els = [...document.querySelectorAll('[data-animate]')];
            initScrollAnimations();
            _gsapMock.fromTo.mock.calls.forEach(([el, , toVars]) => {
                expect(toVars.scrollTrigger.trigger).toBe(el);
            });
        });

        it('tidak throw jika GSAP tidak tersedia', () => {
            delete globalThis.gsap;
            expect(() => initScrollAnimations()).not.toThrow();
            resetMocks(); // restore
        });

        it('tidak throw jika ScrollTrigger tidak tersedia', () => {
            delete globalThis.ScrollTrigger;
            expect(() => initScrollAnimations()).not.toThrow();
            globalThis.ScrollTrigger = { _name: 'ScrollTrigger' }; // restore
        });

        it('tidak memanggil fromTo jika ScrollTrigger tidak tersedia', () => {
            delete globalThis.ScrollTrigger;
            initScrollAnimations();
            expect(_gsapMock.fromTo).not.toHaveBeenCalled();
            globalThis.ScrollTrigger = { _name: 'ScrollTrigger' }; // restore
        });

        it('jika prefers-reduced-motion aktif: set opacity:1 y:0 langsung, tanpa fromTo', () => {
            Object.defineProperty(window, 'matchMedia', {
                writable: true,
                value: vi.fn().mockReturnValue({ matches: true }),
            });

            _gsapMock.fromTo.mockClear();
            _gsapMock.set.mockClear();

            initScrollAnimations();

            // Tidak boleh memanggil fromTo
            expect(_gsapMock.fromTo).not.toHaveBeenCalled();

            // Semua set() harus menetapkan opacity: 1, y: 0
            _gsapMock.set.mock.calls.forEach(([, vars]) => {
                expect(vars).toMatchObject({ opacity: 1, y: 0 });
            });

            // Jumlah set() sesuai jumlah elemen [data-animate]
            const elCount = document.querySelectorAll('[data-animate]').length;
            expect(_gsapMock.set.mock.calls.length).toBe(elCount);
        });
    });
});
