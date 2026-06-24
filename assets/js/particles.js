/**
 * particles.js — Konfigurasi tsParticles untuk Wedding Invitation
 *
 * Menampilkan efek partikel dekoratif (kelopak bunga / butiran emas) di latar belakang.
 * Dipanggil SETELAH opening animation selesai untuk menghindari gangguan CLS.
 *
 * Requirement 14.5: CLS < 0.1 — partikel berjalan di atas canvas position:fixed,
 * sehingga tidak mempengaruhi document flow sama sekali.
 */

// ─── Konfigurasi Partikel ────────────────────────────────────────────────────

/**
 * Palet warna sesuai desain "Modern Heritage":
 *   Emas    #C9A84C
 *   Hijau Tua  #2D5016
 *   Sage Green #87A878
 */
const PARTICLE_COLORS = ['#C9A84C', '#2D5016', '#87A878', '#C9A84C'];

/**
 * Path SVG kelopak bunga sederhana (ellipse yang sedikit miring).
 * Dirender sebagai custom path agar sesuai tema floral.
 */
const PETAL_SVG_PATH =
  'M 0 -10 C 5 -5, 5 5, 0 10 C -5 5, -5 -5, 0 -10 Z';

/**
 * Konfigurasi lengkap untuk tsParticles.
 * - jumlah ≤ 40 partikel
 * - opacity rendah (0.15–0.35)
 * - gerak lambat
 * - canvas tidak berinteraksi (pointer-events: none sudah di CSS)
 */
const PARTICLES_CONFIG = {
  // Tidak ada full-screen karena container sudah position:fixed via CSS
  fullScreen: { enable: false },

  // Deteksi ukuran ulang tanpa menggeser layout (resize hanya canvas)
  detectRetina: true,

  fpsLimit: 30, // Batasi frame rate agar hemat baterai di mobile

  particles: {
    number: {
      value: 35,          // ≤ 40 sesuai requirement
      density: {
        enable: true,
        area: 900,        // density berdasarkan luas area
      },
    },

    color: {
      value: PARTICLE_COLORS,
    },

    shape: {
      type: ['circle', 'path'],
      options: {
        path: {
          path: [PETAL_SVG_PATH],
        },
      },
    },

    opacity: {
      value: { min: 0.15, max: 0.35 }, // opacity rendah agar tidak mengganggu konten
      animation: {
        enable: true,
        speed: 0.4,
        minimumValue: 0.10,
        sync: false,
      },
    },

    size: {
      value: { min: 4, max: 10 },      // ukuran kecil, variatif
      animation: {
        enable: false,
      },
    },

    rotate: {
      value: { min: 0, max: 360 },
      direction: 'random',
      animation: {
        enable: true,
        speed: 3,
        sync: false,
      },
    },

    move: {
      enable: true,
      speed: { min: 0.3, max: 0.8 },  // gerak lambat
      direction: 'top',               // melayang ke atas seperti kelopak jatuh
      random: true,
      straight: false,
      outModes: {
        default: 'out',               // keluar layar → respawn di sisi lain
      },
      drift: { min: -0.3, max: 0.3 }, // sedikit melayang ke kiri/kanan
      gravity: {
        enable: true,
        acceleration: 0.05,           // gravitasi sangat lemah
        inverse: true,                // gravitasi ke atas (melayang)
      },
    },

    // Tidak ada interaksi hover/klik agar pointer-events tetap none
    interactivity: {
      detectsOn: 'window',
      events: {
        onHover: { enable: false },
        onClick: { enable: false },
        resize: true,
      },
    },
  },

  // Tidak ada link antar partikel
  interactivity: {
    detectsOn: 'window',
    events: {
      onHover: { enable: false },
      onClick: { enable: false },
      resize: { enable: true },
    },
  },

  background: {
    color: 'transparent', // transparan — background konten di belakang canvas
  },
};

// ─── Fungsi Utama ────────────────────────────────────────────────────────────

/**
 * Inisialisasi tsParticles pada container yang diberikan.
 *
 * Dipanggil SETELAH opening animation selesai (callback `onComplete`
 * dari `playOpeningAnimation`) sehingga tidak mengganggu LCP/CLS awal.
 *
 * Container `#tsparticles` sudah memiliki:
 *   position: fixed; inset: 0; z-index: 0; pointer-events: none
 * sehingga partikel tidak mempengaruhi document flow (CLS = 0).
 *
 * @param {string} containerId - ID elemen container tanpa '#', default 'tsparticles'
 * @returns {Promise<object|null>} Instance tsParticles atau null jika library tidak tersedia
 */
async function initParticles(containerId = 'tsparticles') {
  // Graceful degradation: jika tsParticles tidak tersedia, diam saja
  if (typeof window === 'undefined' || !window.tsParticles) {
    console.warn(
      '[particles.js] tsParticles library tidak ditemukan. ' +
      'Pastikan CDN dimuat sebelum memanggil initParticles().'
    );
    return null;
  }

  // Verifikasi container ada di DOM
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(
      `[particles.js] Elemen #${containerId} tidak ditemukan di DOM.`
    );
    return null;
  }

  try {
    const instance = await window.tsParticles.load({
      id: containerId,
      options: PARTICLES_CONFIG,
    });

    return instance;
  } catch (err) {
    // Gagal load partikel tidak boleh merusak halaman utama
    console.error('[particles.js] Gagal menginisialisasi tsParticles:', err);
    return null;
  }
}

/**
 * Hentikan dan hancurkan instance partikel pada container tertentu.
 * Berguna untuk cleanup atau jika user mengaktifkan mode hemat baterai.
 *
 * @param {string} containerId - ID elemen container, default 'tsparticles'
 */
function destroyParticles(containerId = 'tsparticles') {
  if (typeof window === 'undefined' || !window.tsParticles) return;

  try {
    const instance = window.tsParticles.domItem(0);
    if (instance && instance.id === containerId) {
      instance.destroy();
    }
  } catch (err) {
    // Abaikan error saat destroy
  }
}

// ─── Export ──────────────────────────────────────────────────────────────────

// ES Module export (untuk bundler atau type="module")
export { initParticles, destroyParticles, PARTICLES_CONFIG };
export default initParticles;

// Attach ke window untuk pemanggilan langsung dari script non-module (CDN style)
if (typeof window !== 'undefined') {
  window.initParticles = initParticles;
  window.destroyParticles = destroyParticles;
}
