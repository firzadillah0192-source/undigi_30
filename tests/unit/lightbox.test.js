/**
 * tests/unit/lightbox.test.js
 * Unit tests untuk lightbox.js
 * Requirements: 6.2, 6.3, 6.4, 18.3
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initLightbox, initLazyLoading, refreshGallery } from '../../assets/js/lightbox.js';

// ---------------------------------------------------------------------------
// Helper: bangun DOM minimal untuk galeri + lightbox
// ---------------------------------------------------------------------------

/**
 * Membuat gallery-grid dengan n item foto.
 * @param {number} count — jumlah item
 */
function buildGalleryDOM(count = 3) {
  document.body.innerHTML = `
    <div id="gallery-grid">
      ${Array.from({ length: count }, (_, i) => `
        <div class="gallery-item" data-index="${i}">
          <img data-src="/uploads/gallery/photo${i}.jpg" src="" alt="Foto ${i}" class="lazy" />
        </div>
      `).join('')}
    </div>

    <div id="lightbox" hidden role="dialog" aria-modal="true">
      <div class="lightbox__overlay" id="lightbox-overlay" tabindex="0"></div>
      <div class="lightbox__content">
        <button id="lightbox-close" aria-label="Tutup lightbox"></button>
        <button id="lightbox-prev"  aria-label="Foto sebelumnya"></button>
        <img id="lightbox-img" src="" alt="" />
        <button id="lightbox-next"  aria-label="Foto berikutnya"></button>
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Test suite: initLightbox
// ---------------------------------------------------------------------------

describe('initLightbox', () => {
  beforeEach(() => {
    buildGalleryDOM(3);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    // Hapus listener keyboard yang mungkin masih terpasang
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  });

  // --- Req 6.2: buka lightbox saat foto diklik ---

  it('membuka lightbox saat item galeri diklik (Req 6.2)', () => {
    initLightbox('#gallery-grid');

    const item = document.querySelector('.gallery-item');
    item.click();

    const lightbox = document.getElementById('lightbox');
    expect(lightbox.hidden).toBe(false);
  });

  it('memasang src foto yang benar ke lightbox-img saat item diklik', () => {
    initLightbox('#gallery-grid');

    // Simulasikan gambar sudah dimuat (src terisi)
    const items = document.querySelectorAll('.gallery-item');
    items[1].querySelector('img').src = 'http://localhost/uploads/gallery/photo1.jpg';

    items[1].click();

    const imgEl = document.getElementById('lightbox-img');
    expect(imgEl.src).toContain('photo1.jpg');
  });

  it('menggunakan data-src sebagai fallback jika src kosong', () => {
    initLightbox('#gallery-grid');

    const item   = document.querySelectorAll('.gallery-item')[2];
    const img    = item.querySelector('img');
    img.src      = ''; // src masih kosong
    img.dataset.src = '/uploads/gallery/photo2.jpg';

    item.click();

    const imgEl = document.getElementById('lightbox-img');
    expect(imgEl.src).toContain('photo2.jpg');
  });

  // --- Req 6.2: tutup lightbox ---

  it('menutup lightbox saat tombol close diklik (Req 6.2)', () => {
    initLightbox('#gallery-grid');

    document.querySelector('.gallery-item').click();
    expect(document.getElementById('lightbox').hidden).toBe(false);

    document.getElementById('lightbox-close').click();
    expect(document.getElementById('lightbox').hidden).toBe(true);
  });

  it('menutup lightbox saat overlay diklik (Req 6.2)', () => {
    initLightbox('#gallery-grid');

    document.querySelector('.gallery-item').click();
    expect(document.getElementById('lightbox').hidden).toBe(false);

    document.getElementById('lightbox-overlay').click();
    expect(document.getElementById('lightbox').hidden).toBe(true);
  });

  it('menutup lightbox saat Escape ditekan (Req 6.2)', () => {
    initLightbox('#gallery-grid');

    document.querySelector('.gallery-item').click();
    expect(document.getElementById('lightbox').hidden).toBe(false);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(document.getElementById('lightbox').hidden).toBe(true);
  });

  // --- Req 6.3: disable tombol prev/next di batas ---

  it('menonaktifkan tombol prev saat foto pertama ditampilkan (Req 6.3)', () => {
    initLightbox('#gallery-grid');

    document.querySelectorAll('.gallery-item')[0].click();

    const prevBtn = document.getElementById('lightbox-prev');
    expect(prevBtn.disabled).toBe(true);
    expect(prevBtn.getAttribute('aria-disabled')).toBe('true');
  });

  it('tombol prev aktif saat bukan foto pertama (Req 6.3)', () => {
    initLightbox('#gallery-grid');

    document.querySelectorAll('.gallery-item')[1].click();

    const prevBtn = document.getElementById('lightbox-prev');
    expect(prevBtn.disabled).toBe(false);
    expect(prevBtn.getAttribute('aria-disabled')).toBe('false');
  });

  it('menonaktifkan tombol next saat foto terakhir ditampilkan (Req 6.3)', () => {
    initLightbox('#gallery-grid');

    document.querySelectorAll('.gallery-item')[2].click(); // index 2 = last (total 3)

    const nextBtn = document.getElementById('lightbox-next');
    expect(nextBtn.disabled).toBe(true);
    expect(nextBtn.getAttribute('aria-disabled')).toBe('true');
  });

  it('tombol next aktif saat bukan foto terakhir (Req 6.3)', () => {
    initLightbox('#gallery-grid');

    document.querySelectorAll('.gallery-item')[1].click();

    const nextBtn = document.getElementById('lightbox-next');
    expect(nextBtn.disabled).toBe(false);
    expect(nextBtn.getAttribute('aria-disabled')).toBe('false');
  });

  // --- Navigasi prev/next ---

  it('navigasi ke foto berikutnya dengan tombol next', () => {
    initLightbox('#gallery-grid');

    const items = document.querySelectorAll('.gallery-item');
    // Pasang src berbeda agar bisa dibedakan
    items[0].querySelector('img').src = 'http://localhost/photo0.jpg';
    items[1].querySelector('img').src = 'http://localhost/photo1.jpg';

    items[0].click(); // buka foto pertama

    document.getElementById('lightbox-next').click(); // pindah ke foto ke-2

    const imgEl = document.getElementById('lightbox-img');
    expect(imgEl.src).toContain('photo1.jpg');
  });

  it('navigasi ke foto sebelumnya dengan tombol prev', () => {
    initLightbox('#gallery-grid');

    const items = document.querySelectorAll('.gallery-item');
    items[0].querySelector('img').src = 'http://localhost/photo0.jpg';
    items[1].querySelector('img').src = 'http://localhost/photo1.jpg';

    items[1].click(); // buka foto ke-2

    document.getElementById('lightbox-prev').click(); // kembali ke foto pertama

    const imgEl = document.getElementById('lightbox-img');
    expect(imgEl.src).toContain('photo0.jpg');
  });

  it('navigasi dengan ArrowRight pindah ke foto berikutnya', () => {
    initLightbox('#gallery-grid');

    const items = document.querySelectorAll('.gallery-item');
    items[0].querySelector('img').src = 'http://localhost/photo0.jpg';
    items[1].querySelector('img').src = 'http://localhost/photo1.jpg';

    items[0].click();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));

    expect(document.getElementById('lightbox-img').src).toContain('photo1.jpg');
  });

  it('navigasi dengan ArrowLeft pindah ke foto sebelumnya', () => {
    initLightbox('#gallery-grid');

    const items = document.querySelectorAll('.gallery-item');
    items[0].querySelector('img').src = 'http://localhost/photo0.jpg';
    items[1].querySelector('img').src = 'http://localhost/photo1.jpg';

    items[1].click();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));

    expect(document.getElementById('lightbox-img').src).toContain('photo0.jpg');
  });

  it('ArrowLeft tidak melakukan apa-apa di foto pertama', () => {
    initLightbox('#gallery-grid');

    const items = document.querySelectorAll('.gallery-item');
    items[0].querySelector('img').src = 'http://localhost/photo0.jpg';

    items[0].click();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));

    // Harus tetap di foto 0
    expect(document.getElementById('lightbox-img').src).toContain('photo0.jpg');
    expect(document.getElementById('lightbox-prev').disabled).toBe(true);
  });

  it('ArrowRight tidak melakukan apa-apa di foto terakhir', () => {
    initLightbox('#gallery-grid');

    const items = document.querySelectorAll('.gallery-item');
    const lastIdx = items.length - 1;
    items[lastIdx].querySelector('img').src = `http://localhost/photo${lastIdx}.jpg`;

    items[lastIdx].click();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));

    expect(document.getElementById('lightbox-next').disabled).toBe(true);
  });

  // --- Tidak ada item galeri ---

  it('tidak error ketika tidak ada item galeri', () => {
    document.getElementById('gallery-grid').innerHTML = '';
    expect(() => initLightbox('#gallery-grid')).not.toThrow();
  });

  it('tidak error ketika gallery-grid tidak ditemukan', () => {
    expect(() => initLightbox('#nonexistent-selector')).not.toThrow();
  });

  it('tidak error ketika lightbox element tidak ada di DOM', () => {
    document.getElementById('lightbox').remove();
    expect(() => initLightbox('#gallery-grid')).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Test suite: initLazyLoading (Req 18.3)
// ---------------------------------------------------------------------------

describe('initLazyLoading', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="gallery-grid">
        <div class="gallery-item">
          <img class="lazy" data-src="/uploads/gallery/a.jpg" src="" alt="Foto A" />
        </div>
        <div class="gallery-item">
          <img class="lazy" data-src="/uploads/gallery/b.jpg" src="" alt="Foto B" />
        </div>
        <div class="gallery-item">
          <img class="lazy" data-src="/uploads/gallery/c.jpg" src="" alt="Foto C" />
        </div>
      </div>
    `;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('membuat IntersectionObserver dengan rootMargin 200px (Req 18.3)', () => {
    const observerInstances = [];

    // Spy IntersectionObserver constructor
    const OriginalIO = window.IntersectionObserver;
    window.IntersectionObserver = vi.fn((callback, options) => {
      const instance = {
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn(),
        _options: options,
        _callback: callback,
      };
      observerInstances.push(instance);
      return instance;
    });

    initLazyLoading('.gallery-item img.lazy');

    expect(observerInstances.length).toBeGreaterThan(0);
    expect(observerInstances[0]._options.rootMargin).toBe('200px');

    window.IntersectionObserver = OriginalIO;
  });

  it('setiap gambar lazy di-observe oleh IntersectionObserver', () => {
    const observed = [];
    const OriginalIO = window.IntersectionObserver;

    window.IntersectionObserver = vi.fn((callback, options) => ({
      observe: vi.fn((el) => observed.push(el)),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));

    initLazyLoading('.gallery-item img.lazy');

    const lazyImgs = document.querySelectorAll('.gallery-item img.lazy');
    expect(observed.length).toBe(lazyImgs.length);

    window.IntersectionObserver = OriginalIO;
  });

  it('memuat gambar dari data-src ke src saat intersect', () => {
    let storedCallback;
    const OriginalIO = window.IntersectionObserver;

    window.IntersectionObserver = vi.fn((callback) => {
      storedCallback = callback;
      return { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() };
    });

    initLazyLoading('.gallery-item img.lazy');

    const img = document.querySelector('.gallery-item img.lazy');

    // Simulasikan intersection
    storedCallback(
      [{ isIntersecting: true, target: img }],
      { unobserve: vi.fn() }
    );

    expect(img.src).toContain('/uploads/gallery/a.jpg');
    expect(img.dataset.src).toBeUndefined();
    expect(img.classList.contains('lazy')).toBe(false);

    window.IntersectionObserver = OriginalIO;
  });

  it('tidak memuat gambar saat isIntersecting = false', () => {
    let storedCallback;
    const OriginalIO = window.IntersectionObserver;

    window.IntersectionObserver = vi.fn((callback) => {
      storedCallback = callback;
      return { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() };
    });

    initLazyLoading('.gallery-item img.lazy');

    const img = document.querySelector('.gallery-item img.lazy');
    const originalSrc = img.src;

    storedCallback(
      [{ isIntersecting: false, target: img }],
      { unobserve: vi.fn() }
    );

    expect(img.src).toBe(originalSrc); // src tidak berubah
    expect(img.dataset.src).toBe('/uploads/gallery/a.jpg');

    window.IntersectionObserver = OriginalIO;
  });

  it('menggunakan eager loading sebagai fallback jika IntersectionObserver tidak tersedia', () => {
    const OriginalIO = window.IntersectionObserver;
    // @ts-ignore
    delete window.IntersectionObserver;

    initLazyLoading('.gallery-item img.lazy');

    const imgs = document.querySelectorAll('.gallery-item img');
    imgs.forEach((img, i) => {
      const letters = ['a', 'b', 'c'];
      expect(img.src).toContain(`${letters[i]}.jpg`);
    });

    window.IntersectionObserver = OriginalIO;
  });

  it('tidak error saat tidak ada gambar yang cocok dengan selektor', () => {
    expect(() => initLazyLoading('.nonexistent-lazy-class')).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Test suite: refreshGallery
// ---------------------------------------------------------------------------

describe('refreshGallery', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('memperbarui daftar item galeri setelah konten dinamis ditambahkan', () => {
    document.body.innerHTML = `
      <div id="gallery-grid">
        <div id="lightbox" hidden role="dialog">
          <div class="lightbox__overlay" id="lightbox-overlay" tabindex="0"></div>
          <div class="lightbox__content">
            <button id="lightbox-close"></button>
            <button id="lightbox-prev"></button>
            <img id="lightbox-img" src="" alt="" />
            <button id="lightbox-next"></button>
          </div>
        </div>
      </div>
    `;

    // Awalnya grid kosong, lakukan init
    initLightbox('#gallery-grid');

    // Simulasi guest.js menambahkan foto secara dinamis
    const grid = document.getElementById('gallery-grid');
    for (let i = 0; i < 2; i++) {
      const item = document.createElement('div');
      item.className = 'gallery-item';
      const img = document.createElement('img');
      img.src = `/uploads/gallery/dynamic${i}.jpg`;
      img.alt = `Foto Dinamis ${i}`;
      item.appendChild(img);
      grid.appendChild(item);
    }

    // Panggil refresh — tidak boleh throw
    expect(() => refreshGallery('#gallery-grid')).not.toThrow();
  });

  it('tidak error saat container tidak ditemukan', () => {
    expect(() => refreshGallery('#not-exist')).not.toThrow();
  });
});
