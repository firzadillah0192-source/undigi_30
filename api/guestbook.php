<?php

/**
 * Endpoint Buku Tamu — Website Undangan Digital Pernikahan
 *
 * Menangani semua operasi pada tabel `guestbook`:
 *
 * - GET  ?endpoint=guestbook              : Ambil daftar ucapan (newest-first),
 *                                           mendukung pagination opsional via ?page= dan ?limit=
 * - POST ?endpoint=guestbook              : Kirim ucapan baru (publik, tanpa auth)
 * - DELETE ?endpoint=guestbook&id={id}    : Hapus satu ucapan (admin only)
 *
 * Validasi:
 * - sender_name : wajib, tidak boleh kosong setelah trim, maks. 100 char
 * - message     : wajib, tidak boleh kosong setelah trim, maks. 500 char
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 19.3, 19.6
 */

require_once __DIR__ . '/../includes/config.php';
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/helpers.php';
require_once __DIR__ . '/../includes/auth.php';

$method = $_SERVER['REQUEST_METHOD'];

// ─── GET: Ambil daftar ucapan (publik, newest-first, pagination opsional) ─────

if ($method === 'GET') {
    handleGetGuestbook();
    exit;
}

// ─── POST: Kirim ucapan baru (publik) ─────────────────────────────────────────

if ($method === 'POST') {
    handlePostGuestbook();
    exit;
}

// ─── DELETE: Hapus satu ucapan (admin only) ───────────────────────────────────

if ($method === 'DELETE') {
    requireAuth();
    handleDeleteGuestbook();
    exit;
}

// Method tidak didukung
sendError(405, 'Method tidak diizinkan.');

// =============================================================================
// Handler Functions
// =============================================================================

/**
 * GET — Kembalikan daftar ucapan newest-first dengan pagination opsional.
 *
 * Query params:
 *   ?page=1   — nomor halaman (default 1, minimum 1)
 *   ?limit=20 — jumlah item per halaman (default 20, minimum 1, maksimum 100)
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "items": [ { id, sender_name, message, submitted_at }, ... ],
 *     "pagination": { "page": 1, "limit": 20, "total": 42, "total_pages": 3 }
 *   }
 * }
 *
 * Requirements: 10.1, 10.5
 */
function handleGetGuestbook(): void
{
    $db = getDB();

    // ── Pagination parameters ──────────────────────────────────────────────
    $page  = isset($_GET['page'])  ? (int) $_GET['page']  : 1;
    $limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 20;

    // Clamp ke nilai yang masuk akal
    if ($page  < 1)   { $page  = 1;   }
    if ($limit < 1)   { $limit = 1;   }
    if ($limit > 100) { $limit = 100; }

    $offset = ($page - 1) * $limit;

    // ── Hitung total item ──────────────────────────────────────────────────
    $countStmt = $db->query('SELECT COUNT(*) AS total FROM guestbook');
    $total     = (int) $countStmt->fetchColumn();
    $totalPages = (int) ceil($total / $limit);

    // ── Ambil data dengan pagination ───────────────────────────────────────
    $stmt = $db->prepare(
        'SELECT id, sender_name, message, submitted_at
           FROM guestbook
          ORDER BY submitted_at DESC
          LIMIT :limit OFFSET :offset'
    );
    $stmt->bindValue(':limit',  $limit,  PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();

    $items = $stmt->fetchAll();

    sendJson([
        'success' => true,
        'data'    => [
            'items'      => $items,
            'pagination' => [
                'page'        => $page,
                'limit'       => $limit,
                'total'       => $total,
                'total_pages' => $totalPages,
            ],
        ],
    ]);
}

/**
 * POST — Terima dan simpan ucapan baru dari tamu (publik).
 *
 * Body JSON (atau form-encoded):
 * {
 *   "sender_name": "Nama Pengirim",
 *   "message":     "Ucapan tamu..."
 * }
 *
 * Validasi:
 * - sender_name wajib, tidak boleh hanya whitespace, maks. 100 char
 * - message wajib, tidak boleh hanya whitespace, maks. 500 char
 *
 * Response sukses (201):
 * {
 *   "success": true,
 *   "message": "Ucapan berhasil dikirim.",
 *   "data":    { "id": 42, "sender_name": "...", "message": "...", "submitted_at": "..." }
 * }
 *
 * Response gagal validasi (422):
 * {
 *   "success": false,
 *   "error":  "Validasi gagal.",
 *   "fields": { "sender_name": "Nama tidak boleh kosong.", "message": "..." }
 * }
 *
 * Requirements: 10.2, 10.3, 10.4, 19.3, 19.6
 */
function handlePostGuestbook(): void
{
    // ── Baca input (JSON body atau form-encoded) ───────────────────────────
    $input = parseRequestBody();

    $rawSenderName = isset($input['sender_name']) ? (string) $input['sender_name'] : '';
    $rawMessage    = isset($input['message'])     ? (string) $input['message']     : '';

    // ── Validasi sebelum sanitasi (trim untuk cek kekosongan) ─────────────
    $errors = [];

    if (trim($rawSenderName) === '') {
        $errors['sender_name'] = 'Nama pengirim tidak boleh kosong.';
    }

    if (trim($rawMessage) === '') {
        $errors['message'] = 'Pesan tidak boleh kosong.';
    } elseif (mb_strlen(trim($rawMessage)) > 500) {
        $errors['message'] = 'Pesan tidak boleh melebihi 500 karakter.';
    }

    if (!empty($errors)) {
        http_response_code(422);
        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode([
            'success' => false,
            'error'   => 'Validasi gagal.',
            'code'    => 422,
            'fields'  => $errors,
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    // ── Sanitasi input setelah validasi kekosongan ────────────────────────
    // Requirements: 19.3 — semua input teks disanitasi sebelum disimpan
    $senderName = sanitizeText($rawSenderName, 100);
    $message    = sanitizeText($rawMessage, 500);

    // ── Pastikan hasil sanitasi tidak menjadi kosong ──────────────────────
    // (strip_tags bisa menghapus konten yang hanya berisi tag)
    if ($senderName === '') {
        http_response_code(422);
        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode([
            'success' => false,
            'error'   => 'Validasi gagal.',
            'code'    => 422,
            'fields'  => ['sender_name' => 'Nama pengirim tidak valid.'],
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($message === '') {
        http_response_code(422);
        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode([
            'success' => false,
            'error'   => 'Validasi gagal.',
            'code'    => 422,
            'fields'  => ['message' => 'Pesan tidak valid.'],
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    // ── Simpan ke database ────────────────────────────────────────────────
    $db   = getDB();
    $stmt = $db->prepare(
        'INSERT INTO guestbook (sender_name, message)
              VALUES (:sender_name, :message)'
    );
    $stmt->execute([
        ':sender_name' => $senderName,
        ':message'     => $message,
    ]);

    $newId = (int) $db->lastInsertId();

    // ── Ambil data yang baru saja disimpan untuk response ─────────────────
    $fetchStmt = $db->prepare(
        'SELECT id, sender_name, message, submitted_at
           FROM guestbook
          WHERE id = :id'
    );
    $fetchStmt->execute([':id' => $newId]);
    $newEntry = $fetchStmt->fetch();

    sendJson([
        'success' => true,
        'message' => 'Ucapan berhasil dikirim.',
        'data'    => $newEntry,
    ], 201);
}

/**
 * DELETE — Hapus satu ucapan berdasarkan ID (admin only).
 *
 * Query param: ?id={id}
 *
 * Response sukses (200):
 * { "success": true, "message": "Ucapan berhasil dihapus." }
 *
 * Response gagal (400 / 404):
 * { "success": false, "error": "...", "code": 400|404 }
 *
 * Requirements: 10.6, 10.7, 19.6
 */
function handleDeleteGuestbook(): void
{
    // ── Validasi parameter id ─────────────────────────────────────────────
    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;

    if ($id <= 0) {
        sendError(400, 'Parameter id tidak valid.');
    }

    $db = getDB();

    // ── Pastikan ucapan ada sebelum dihapus ───────────────────────────────
    $checkStmt = $db->prepare(
        'SELECT id FROM guestbook WHERE id = :id'
    );
    $checkStmt->execute([':id' => $id]);

    if ($checkStmt->fetch() === false) {
        sendError(404, 'Ucapan tidak ditemukan.');
    }

    // ── Hapus dari database ───────────────────────────────────────────────
    $deleteStmt = $db->prepare(
        'DELETE FROM guestbook WHERE id = :id'
    );
    $deleteStmt->execute([':id' => $id]);

    sendJson([
        'success' => true,
        'message' => 'Ucapan berhasil dihapus.',
    ]);
}

// =============================================================================
// Utility
// =============================================================================

/**
 * Baca request body sebagai array asosiatif.
 *
 * Mendukung dua format:
 * - application/json    : decode JSON body
 * - application/x-www-form-urlencoded / multipart/form-data : gunakan $_POST
 *
 * @return array<string, mixed>
 */
function parseRequestBody(): array
{
    $contentType = isset($_SERVER['CONTENT_TYPE'])
        ? strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'])[0]))
        : '';

    if ($contentType === 'application/json') {
        $body = file_get_contents('php://input');
        if ($body === false || $body === '') {
            return [];
        }
        $decoded = json_decode($body, true);
        return is_array($decoded) ? $decoded : [];
    }

    // Form-encoded / multipart
    return $_POST;
}
