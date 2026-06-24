<?php

/**
 * Endpoint Autentikasi Admin — Website Undangan Digital Pernikahan
 *
 * Menangani dua aksi:
 *   POST ?endpoint=auth&action=login   — verifikasi kredensial + session
 *   POST ?endpoint=auth&action=logout  — hancurkan sesi
 *
 * Keamanan yang diterapkan:
 * - Validasi CSRF token (Requirements 15.7, 19.4)
 * - Rate limiting: kunci 15 menit setelah 5 gagal (Requirements 15.6)
 * - Verifikasi password dengan password_verify / bcrypt (Requirements 15.3)
 * - Session ID di-regenerate setelah login berhasil (Requirements 15.2)
 * - Sesi menyimpan admin_id, last_activity, dan username (Requirements 15.2, 15.5)
 *
 * Requirements: 15.2, 15.3, 15.5, 15.6, 15.7
 */

// Pastikan semua helper sudah dimuat (dipanggil via api/index.php yang sudah require config + helpers)
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/auth.php';

$method = $_SERVER['REQUEST_METHOD'];

// Izinkan GET khusus untuk mendapatkan CSRF token (menghindari deadlock login)
// Requirements: 19.4
if ($method === 'GET' && isset($_GET['action']) && $_GET['action'] === 'csrf') {
    $token = generateCsrfToken();
    sendJson([
        'success' => true,
        'csrf_token' => $token,
    ]);
}

// Hanya izinkan method POST untuk aksi lainnya
if ($method !== 'POST') {
    sendError(405, 'Method tidak diizinkan. Gunakan POST.');
}

// Baca action dari query string
$action = isset($_GET['action']) ? strtolower(trim($_GET['action'])) : '';

// ─── Routing Aksi ─────────────────────────────────────────────────────────────

switch ($action) {

    // ── LOGIN ─────────────────────────────────────────────────────────────────
    case 'login':
        handleLogin();
        break;

    // ── LOGOUT ────────────────────────────────────────────────────────────────
    case 'logout':
        handleLogout();
        break;

    default:
        sendError(400, "Action '{$action}' tidak dikenali. Gunakan 'login' atau 'logout'.");
}

// ─── Handler: Login ───────────────────────────────────────────────────────────

/**
 * Memproses request login admin.
 *
 * Alur:
 * 1. Parse JSON body — ambil username, password, dan csrf_token.
 * 2. Validasi CSRF token dari sesi yang aktif.
 * 3. Periksa rate limit; jika terkunci, kembalikan 429 beserta sisa detik.
 * 4. Query database untuk menemukan admin dengan username tersebut.
 * 5. Verifikasi password dengan password_verify (bcrypt).
 * 6. Jika salah: catat failed attempt, kembalikan 401.
 * 7. Jika benar: reset failed attempts, regenerate session ID,
 *    set session vars, kembalikan 200.
 *
 * Requirements: 15.2, 15.3, 15.5, 15.6, 15.7
 *
 * @return void
 */
function handleLogin(): void
{
    // ── 1. Parse JSON body ────────────────────────────────────────────────────
    $rawBody = file_get_contents('php://input');
    $body    = json_decode($rawBody);

    $username  = isset($body->username)   ? trim((string) $body->username)   : '';
    $password  = isset($body->password)   ? (string) $body->password         : '';
    $csrfToken = isset($body->csrf_token) ? (string) $body->csrf_token       : '';

    // Field username dan password wajib diisi
    if ($username === '' || $password === '') {
        sendError(400, 'Username dan password wajib diisi.');
    }

    // ── 2. Validasi CSRF token ────────────────────────────────────────────────
    // Requirements: 15.7, 19.4
    if (!validateCsrfToken($csrfToken)) {
        sendError(403, 'Token CSRF tidak valid atau sudah kedaluwarsa.');
    }

    // ── 3. Cek rate limit ─────────────────────────────────────────────────────
    // Requirements: 15.6
    if (!checkRateLimit($username)) {
        $remainingSeconds = getRateLimitRemainingSeconds($username);
        http_response_code(429);
        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode([
            'success'           => false,
            'error'             => 'Terlalu banyak percobaan login. Akun sementara dikunci.',
            'code'              => 429,
            'retry_after'       => $remainingSeconds,
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    // ── 4. Query database ─────────────────────────────────────────────────────
    $db   = getDB();
    $stmt = $db->prepare(
        'SELECT id, username, password_hash FROM admin_users WHERE username = :username'
    );
    $stmt->execute([':username' => $username]);
    $admin = $stmt->fetch();

    // ── 5. Verifikasi password ────────────────────────────────────────────────
    // Requirements: 15.3
    $passwordValid = $admin !== false && password_verify($password, $admin['password_hash']);

    if (!$passwordValid) {
        // ── 6. Login gagal: catat percobaan, kembalikan error umum ────────────
        // Catat failed attempt hanya jika username ada di DB (recordFailedAttempt
        // sudah menangani kasus username tidak ada dengan graceful return).
        recordFailedAttempt($username);

        // Pesan error disengaja generik agar tidak bocorkan informasi
        sendError(401, 'Username atau password salah.');
    }

    // ── 7. Login berhasil ─────────────────────────────────────────────────────

    // Reset failed attempts dan update last_login
    // Requirements: 15.3
    clearFailedAttempts($admin['username']);

    // Mulai atau resume sesi
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }

    // Regenerate session ID untuk mencegah session fixation attack
    // Requirements: 15.2
    session_regenerate_id(true);

    // Set variabel sesi
    // Requirements: 15.2, 15.5
    $_SESSION['admin_id']      = (int) $admin['id'];
    $_SESSION['username']      = $admin['username'];
    $_SESSION['last_activity'] = time();

    sendJson([
        'success' => true,
        'message' => 'Login berhasil.',
        'data'    => [
            'username' => $admin['username'],
        ],
    ]);
}

// ─── Handler: Logout ──────────────────────────────────────────────────────────

/**
 * Memproses request logout admin.
 *
 * Menghancurkan sesi yang aktif: mengosongkan $_SESSION, menghapus cookie sesi,
 * dan memanggil session_destroy().
 *
 * Requirements: 15.5
 *
 * @return void
 */
function handleLogout(): void
{
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }

    // Kosongkan semua variabel sesi
    $_SESSION = [];

    // Hapus cookie sesi dari browser jika ada
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

    // Hancurkan data sesi di server
    session_destroy();

    sendJson([
        'success' => true,
        'message' => 'Logout berhasil.',
    ]);
}
