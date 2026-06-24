<?php

/**
 * Konfigurasi Global — Website Undangan Digital Pernikahan
 *
 * File ini mendefinisikan semua konstanta konfigurasi yang digunakan
 * di seluruh aplikasi: path database, path upload, batas ukuran file,
 * tipe file yang diizinkan, dan pengaturan sesi/keamanan.
 *
 * Requirements: 13.5, 15.6, 19.5
 */

// ─── Path ────────────────────────────────────────────────────────────────────

/** Path absolut ke file database SQLite */
define('DB_PATH', __DIR__ . '/../data/wedding.db');

/** Base path absolut untuk folder uploads */
define('UPLOAD_BASE', __DIR__ . '/../uploads');

// ─── Batas Ukuran File ────────────────────────────────────────────────────────

/** Ukuran maksimum file gambar: 5 MB (Requirements: 13.5) */
define('MAX_IMAGE_SIZE', 5 * 1024 * 1024);

/** Ukuran maksimum file audio: 10 MB (Requirements: 13.5) */
define('MAX_AUDIO_SIZE', 10 * 1024 * 1024);

// ─── Tipe File yang Diizinkan ─────────────────────────────────────────────────

/** Tipe MIME gambar yang diizinkan: JPG, PNG, WebP */
define('ALLOWED_IMAGE_TYPES', ['image/jpeg', 'image/png', 'image/webp']);

/** Tipe MIME audio yang diizinkan: MP3 dan OGG */
define('ALLOWED_AUDIO_TYPES', ['audio/mpeg', 'audio/ogg']);

// ─── Pengaturan Sesi ──────────────────────────────────────────────────────────

/**
 * Durasi maksimum inaktivitas sesi admin: 7200 detik (2 jam)
 * Sesuai Requirements 15.2 dan 19.5: sesi berakhir otomatis setelah 2 jam
 */
define('SESSION_LIFETIME', 7200);

// ─── Pengaturan Rate Limiting Login ──────────────────────────────────────────

/**
 * Jumlah maksimum percobaan login yang gagal sebelum akun dikunci
 * Sesuai Requirements 15.6: dikunci setelah 5 kali gagal
 */
define('LOGIN_MAX_ATTEMPTS', 5);

/**
 * Durasi pemblokiran akun setelah melebihi batas percobaan login: 15 menit
 * Sesuai Requirements 15.6: pemblokiran selama 15 menit
 */
define('LOGIN_LOCKOUT_MINUTES', 15);

// ─── CORS dan Header Default ──────────────────────────────────────────────────

/**
 * Kirim header CORS dan Content-Type JSON secara default.
 * Hanya dijalankan jika skrip ini dipanggil dalam konteks HTTP request
 * (bukan dari CLI, misalnya saat testing PHPUnit).
 */
if (PHP_SAPI !== 'cli') {
    // Izinkan akses dari semua origin (dapat diperketat di environment produksi)
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token');
    header('Access-Control-Max-Age: 86400');

    // Header keamanan tambahan
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: SAMEORIGIN');
    header('X-XSS-Protection: 1; mode=block');

    // Default Content-Type JSON untuk semua response API
    header('Content-Type: application/json; charset=UTF-8');
}
