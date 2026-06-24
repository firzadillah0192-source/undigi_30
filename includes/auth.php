<?php

/**
 * Helper Autentikasi Sesi — Website Undangan Digital Pernikahan
 *
 * Menyediakan fungsi-fungsi untuk:
 * - Memverifikasi sesi admin yang aktif dan belum kedaluwarsa
 * - Rate limiting login (cek, catat, dan reset percobaan gagal)
 * - Pengelolaan CSRF token untuk proteksi form
 *
 * Requirements: 15.2, 15.3, 15.5, 15.6, 15.7, 19.4, 19.5
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

/**
 * Memastikan request berasal dari admin yang sudah login dan sesinya masih valid.
 *
 * Perilaku:
 * - Mulai sesi jika belum aktif.
 * - Cek keberadaan `$_SESSION['admin_id']`.
 * - Cek timestamp `$_SESSION['last_activity']` — jika lebih dari SESSION_LIFETIME
 *   detik yang lalu, sesi dianggap kedaluwarsa dan dihancurkan.
 * - Jika sesi valid, perbarui `last_activity` ke waktu sekarang.
 * - Jika sesi tidak valid, redirect ke `admin/login.html` dan hentikan eksekusi.
 *
 * Requirements: 15.2, 15.5, 19.5
 *
 * @return void
 */
function requireAuth(): void
{
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }

    $isLoggedIn    = isset($_SESSION['admin_id']);
    $hasActivity   = isset($_SESSION['last_activity']);
    $isExpired     = $hasActivity && (time() - $_SESSION['last_activity']) > SESSION_LIFETIME;

    if (!$isLoggedIn || $isExpired) {
        // Hancurkan sesi yang ada sebelum redirect
        $_SESSION = [];

        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(
                session_name(),
                '',
                time() - 42000,
                $params['path'],
                $params['domain'],
                $params['secure'],
                $params['httponly']
            );
        }

        session_destroy();

        // Redirect ke halaman login; hentikan eksekusi setelah header dikirim
        header('Location: /admin/login.html');
        exit;
    }

    // Perbarui timestamp aktivitas terakhir (sliding expiry)
    $_SESSION['last_activity'] = time();
}

/**
 * Memeriksa apakah username boleh melakukan percobaan login.
 *
 * Membaca kolom `failed_attempts` dan `locked_until` dari tabel `admin_users`.
 * Jika `locked_until` belum lewat, mengembalikan `false` (akun terkunci).
 * Jika `locked_until` sudah lewat atau NULL, mengembalikan `true` (boleh coba login).
 *
 * Requirements: 15.6, 15.7
 *
 * @param  string $username Username yang akan diperiksa.
 * @return bool `true` jika diizinkan login, `false` jika masih terkunci.
 */
function checkRateLimit(string $username): bool
{
    $db   = getDB();
    $stmt = $db->prepare(
        'SELECT failed_attempts, locked_until FROM admin_users WHERE username = :username'
    );
    $stmt->execute([':username' => $username]);
    $row = $stmt->fetch();

    // Username tidak ditemukan — biarkan proses auth normal menangani ini
    if ($row === false) {
        return true;
    }

    // Jika locked_until terisi dan belum kedaluwarsa, akun masih terkunci
    if (!empty($row['locked_until'])) {
        $lockedUntil = strtotime($row['locked_until']);
        if ($lockedUntil !== false && time() < $lockedUntil) {
            return false;
        }
    }

    return true;
}

/**
 * Mengembalikan sisa waktu lockout dalam detik untuk username tertentu.
 *
 * Berguna untuk menampilkan pesan "Coba lagi dalam X menit" di response API.
 *
 * @param  string $username Username yang diperiksa.
 * @return int Sisa detik lockout; 0 jika tidak terkunci atau username tidak ditemukan.
 */
function getRateLimitRemainingSeconds(string $username): int
{
    $db   = getDB();
    $stmt = $db->prepare(
        'SELECT locked_until FROM admin_users WHERE username = :username'
    );
    $stmt->execute([':username' => $username]);
    $row = $stmt->fetch();

    if ($row === false || empty($row['locked_until'])) {
        return 0;
    }

    $lockedUntil = strtotime($row['locked_until']);
    if ($lockedUntil === false) {
        return 0;
    }

    $remaining = $lockedUntil - time();
    return $remaining > 0 ? $remaining : 0;
}

/**
 * Mencatat satu percobaan login yang gagal untuk username tertentu.
 *
 * Logika:
 * 1. Increment `failed_attempts`.
 * 2. Jika `failed_attempts` mencapai LOGIN_MAX_ATTEMPTS (5), set `locked_until`
 *    ke `now + LOGIN_LOCKOUT_MINUTES` menit.
 * 3. Jika belum mencapai batas, `locked_until` tetap NULL.
 *
 * Requirements: 15.6
 *
 * @param  string $username Username yang gagal login.
 * @return void
 */
function recordFailedAttempt(string $username): void
{
    $db = getDB();

    // Ambil jumlah percobaan saat ini
    $stmt = $db->prepare(
        'SELECT failed_attempts FROM admin_users WHERE username = :username'
    );
    $stmt->execute([':username' => $username]);
    $row = $stmt->fetch();

    if ($row === false) {
        // Username tidak ada; tidak ada yang perlu dicatat
        return;
    }

    $newAttempts = (int) $row['failed_attempts'] + 1;

    if ($newAttempts >= LOGIN_MAX_ATTEMPTS) {
        // Kunci akun selama LOGIN_LOCKOUT_MINUTES menit
        $lockedUntil = date('Y-m-d H:i:s', time() + (LOGIN_LOCKOUT_MINUTES * 60));

        $update = $db->prepare(
            'UPDATE admin_users
                SET failed_attempts = :attempts,
                    locked_until    = :locked_until
              WHERE username = :username'
        );
        $update->execute([
            ':attempts'    => $newAttempts,
            ':locked_until' => $lockedUntil,
            ':username'    => $username,
        ]);
    } else {
        // Belum mencapai batas; hanya increment counter
        $update = $db->prepare(
            'UPDATE admin_users
                SET failed_attempts = :attempts,
                    locked_until    = NULL
              WHERE username = :username'
        );
        $update->execute([
            ':attempts' => $newAttempts,
            ':username' => $username,
        ]);
    }
}

/**
 * Mereset counter percobaan gagal setelah login berhasil.
 *
 * Set `failed_attempts` ke 0 dan `locked_until` ke NULL, serta update
 * `last_login` ke waktu sekarang.
 *
 * Requirements: 15.3
 *
 * @param  string $username Username yang berhasil login.
 * @return void
 */
function clearFailedAttempts(string $username): void
{
    $db   = getDB();
    $stmt = $db->prepare(
        'UPDATE admin_users
            SET failed_attempts = 0,
                locked_until    = NULL,
                last_login      = :last_login
          WHERE username = :username'
    );
    $stmt->execute([
        ':last_login' => date('Y-m-d H:i:s'),
        ':username'   => $username,
    ]);
}

/**
 * Menghasilkan CSRF token acak dan menyimpannya dalam sesi.
 *
 * Token di-generate menggunakan `bin2hex(random_bytes(32))` yang menghasilkan
 * string hex 64 karakter yang kriptografis aman. Token yang sama digunakan
 * selama sesi berlangsung (tidak di-regenerate setiap request) agar tidak
 * memutus alur multi-tab.
 *
 * Requirements: 19.4
 *
 * @return string CSRF token aktif untuk sesi ini.
 */
function generateCsrfToken(): string
{
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }

    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }

    return $_SESSION['csrf_token'];
}

/**
 * Memvalidasi CSRF token yang dikirim oleh client.
 *
 * Menggunakan `hash_equals` untuk perbandingan yang aman terhadap timing attack.
 * Mengembalikan `false` jika sesi tidak memiliki token atau token tidak cocok.
 *
 * Requirements: 19.4
 *
 * @param  string $token Token yang diterima dari request (header atau form field).
 * @return bool `true` jika token valid, `false` jika tidak.
 */
function validateCsrfToken(string $token): bool
{
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }

    if (empty($_SESSION['csrf_token'])) {
        return false;
    }

    if (empty($token)) {
        return false;
    }

    return hash_equals($_SESSION['csrf_token'], $token);
}
