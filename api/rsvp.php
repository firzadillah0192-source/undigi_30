<?php

/**
 * Endpoint RSVP — Website Undangan Digital Pernikahan
 *
 * Menangani konfirmasi kehadiran tamu (RSVP):
 *   POST   ?endpoint=rsvp                — Kirim RSVP (publik, tanpa autentikasi)
 *   GET    ?endpoint=rsvp                — Daftar semua RSVP terurut (admin)
 *   GET    ?endpoint=rsvp&action=export  — Ekspor semua RSVP ke CSV (admin)
 *   DELETE ?endpoint=rsvp&id={id}        — Hapus satu entri RSVP (admin)
 *
 * Logika upsert (POST):
 *   Jika sudah ada entri dengan LOWER(guest_name) = LOWER(:name), lakukan UPDATE.
 *   Jika belum ada, lakukan INSERT.
 *
 * Validasi POST:
 *   - guest_name : wajib, tidak boleh kosong/hanya whitespace, maks 100 karakter
 *   - attendance : wajib, enum: 'hadir' | 'tidak_hadir'
 *   - guest_count: opsional (default 1), integer 1–10
 *   - phone       : opsional, maks 20 karakter
 *
 * Error validasi dikembalikan sebagai HTTP 422 dengan detail per field.
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 19.3, 19.6
 */

require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/auth.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? strtolower(trim($_GET['action'])) : '';

// ─── Routing per HTTP Method ──────────────────────────────────────────────────

switch ($method) {

    case 'POST':
        handleRsvpPost();
        break;

    case 'GET':
        // Semua GET memerlukan autentikasi admin
        requireAuth();
        if ($action === 'export') {
            handleRsvpExport();
        } else {
            handleRsvpGet();
        }
        break;

    case 'DELETE':
        requireAuth();
        handleRsvpDelete();
        break;

    default:
        sendError(405, 'Method tidak diizinkan.');
}

// ─── Handler: POST — Kirim RSVP (Publik) ─────────────────────────────────────

/**
 * Memproses pengiriman RSVP dari tamu.
 *
 * Alur:
 * 1. Parse JSON body.
 * 2. Sanitasi semua input teks via sanitizeText().
 * 3. Validasi semua field; kumpulkan semua error sekaligus.
 * 4. Jika ada error, kembalikan 422 dengan detail per field.
 * 5. Upsert: UPDATE jika nama sudah ada (case-insensitive), INSERT jika belum.
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 19.3, 19.6
 *
 * @return void
 */
function handleRsvpPost(): void
{
    // ── 1. Parse JSON body ────────────────────────────────────────────────────
    $rawBody = file_get_contents('php://input');
    $body    = json_decode($rawBody);

    if ($body === null && $rawBody !== '') {
        sendError(400, 'Request body bukan JSON yang valid.');
    }

    // Ambil nilai raw dari body; fallback ke string kosong/default jika tidak ada
    $rawGuestName  = isset($body->guest_name)  ? (string) $body->guest_name  : '';
    $rawAttendance = isset($body->attendance)  ? (string) $body->attendance  : '';
    $rawGuestCount = isset($body->guest_count) ? $body->guest_count          : 1;
    $rawPhone      = isset($body->phone)       ? (string) $body->phone       : '';

    // ── 2. Sanitasi input teks ────────────────────────────────────────────────
    // Requirements: 19.3
    $guestName  = sanitizeText($rawGuestName, 100);
    $attendance = sanitizeText($rawAttendance, 20);
    $phone      = sanitizeText($rawPhone, 20);

    // guest_count: pastikan integer
    $guestCount = filter_var($rawGuestCount, FILTER_VALIDATE_INT);
    if ($guestCount === false) {
        $guestCount = 0; // akan gagal validasi di bawah
    }

    // ── 3. Validasi ───────────────────────────────────────────────────────────
    // Requirements: 9.3, 9.4, 19.6
    $errors = [];

    // Validasi guest_name: tidak boleh kosong setelah sanitasi
    if ($guestName === '') {
        $errors['guest_name'] = 'Nama tamu wajib diisi.';
    }

    // Validasi attendance: harus salah satu nilai enum yang valid
    if (!validateAttendance($attendance)) {
        $errors['attendance'] = "Nilai kehadiran tidak valid. Gunakan 'hadir' atau 'tidak_hadir'.";
    }

    // Validasi guest_count: integer 1–10
    // Requirements: 9.4
    if ($guestCount < 1 || $guestCount > 10) {
        $errors['guest_count'] = 'Jumlah tamu harus antara 1 dan 10.';
    }

    // Kembalikan semua error sekaligus jika ada
    if (!empty($errors)) {
        http_response_code(422);
        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode([
            'success' => false,
            'error'   => 'Validasi gagal. Periksa field yang ditandai.',
            'code'    => 422,
            'fields'  => $errors,
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    // ── 4. Upsert berdasarkan LOWER(guest_name) ───────────────────────────────
    // Requirements: 9.6
    $db = getDB();

    // Cek apakah entri dengan nama yang sama (case-insensitive) sudah ada
    $checkStmt = $db->prepare(
        'SELECT id FROM rsvp WHERE LOWER(guest_name) = LOWER(:name)'
    );
    $checkStmt->execute([':name' => $guestName]);
    $existing = $checkStmt->fetch();

    $now = date('Y-m-d H:i:s');

    if ($existing !== false) {
        // UPDATE — timpa data yang sudah ada
        // Pertahankan guest_name asli dari data baru (Requirements 9.6)
        $updateStmt = $db->prepare(
            'UPDATE rsvp
                SET guest_name  = :guest_name,
                    phone       = :phone,
                    attendance  = :attendance,
                    guest_count = :guest_count,
                    updated_at  = :updated_at
              WHERE id = :id'
        );
        $updateStmt->execute([
            ':guest_name'  => $guestName,
            ':phone'       => $phone,
            ':attendance'  => $attendance,
            ':guest_count' => $guestCount,
            ':updated_at'  => $now,
            ':id'          => (int) $existing['id'],
        ]);

        sendJson([
            'success' => true,
            'message' => 'RSVP berhasil diperbarui.',
            'data'    => [
                'id'          => (int) $existing['id'],
                'guest_name'  => $guestName,
                'attendance'  => $attendance,
                'guest_count' => $guestCount,
                'updated'     => true,
            ],
        ]);
    } else {
        // INSERT — tambah entri baru
        $insertStmt = $db->prepare(
            'INSERT INTO rsvp (guest_name, phone, attendance, guest_count, submitted_at, updated_at)
             VALUES (:guest_name, :phone, :attendance, :guest_count, :submitted_at, :updated_at)'
        );
        $insertStmt->execute([
            ':guest_name'  => $guestName,
            ':phone'       => $phone,
            ':attendance'  => $attendance,
            ':guest_count' => $guestCount,
            ':submitted_at' => $now,
            ':updated_at'  => $now,
        ]);

        $newId = (int) $db->lastInsertId();

        sendJson([
            'success' => true,
            'message' => 'RSVP berhasil dikirim. Terima kasih!',
            'data'    => [
                'id'          => $newId,
                'guest_name'  => $guestName,
                'attendance'  => $attendance,
                'guest_count' => $guestCount,
                'updated'     => false,
            ],
        ], 201);
    }
}

// ─── Handler: GET — Daftar RSVP (Admin) ──────────────────────────────────────

/**
 * Mengembalikan semua data RSVP terurut dari terbaru ke terlama.
 *
 * Response menyertakan statistik ringkas (total hadir, total tidak hadir,
 * total tamu yang hadir) untuk kemudahan tampilan di Admin Panel.
 *
 * Requirements: 9.7, 9.8
 *
 * @return void
 */
function handleRsvpGet(): void
{
    $db = getDB();

    // Ambil semua entri RSVP diurutkan dari terbaru
    $stmt = $db->query(
        'SELECT id, guest_name, phone, attendance, guest_count, submitted_at, updated_at
           FROM rsvp
          ORDER BY submitted_at DESC'
    );
    $rows = $stmt->fetchAll();

    // Hitung statistik ringkas
    $totalHadir      = 0;
    $totalTidakHadir = 0;
    $totalTamuHadir  = 0;

    foreach ($rows as $row) {
        if ($row['attendance'] === 'hadir') {
            $totalHadir++;
            $totalTamuHadir += (int) $row['guest_count'];
        } else {
            $totalTidakHadir++;
        }
    }

    sendJson([
        'success' => true,
        'data'    => [
            'rsvp'  => $rows,
            'stats' => [
                'total_hadir'       => $totalHadir,
                'total_tidak_hadir' => $totalTidakHadir,
                'total_tamu_hadir'  => $totalTamuHadir,
            ],
        ],
    ]);
}

// ─── Handler: GET &action=export — Ekspor CSV (Admin) ────────────────────────

/**
 * Menghasilkan file CSV berisi semua data RSVP dan memicunya sebagai download.
 *
 * Header CSV:
 *   ID, Nama Tamu, No. Telepon, Kehadiran, Jumlah Tamu, Tanggal Kirim, Terakhir Diperbarui
 *
 * Requirements: 9.9
 *
 * @return void
 */
function handleRsvpExport(): void
{
    $db = getDB();

    $stmt = $db->query(
        'SELECT id, guest_name, phone, attendance, guest_count, submitted_at, updated_at
           FROM rsvp
          ORDER BY submitted_at DESC'
    );
    $rows = $stmt->fetchAll();

    // Set header HTTP untuk download CSV
    header('Content-Type: text/csv; charset=UTF-8');
    header('Content-Disposition: attachment; filename="rsvp.csv"');
    header('Cache-Control: no-cache, no-store, must-revalidate');
    header('Pragma: no-cache');
    header('Expires: 0');

    // Tambahkan BOM UTF-8 agar Excel membaca encoding dengan benar
    echo "\xEF\xBB\xBF";

    // Buka output buffer sebagai stream CSV
    $output = fopen('php://output', 'w');

    // Tulis baris header
    fputcsv($output, [
        'ID',
        'Nama Tamu',
        'No. Telepon',
        'Kehadiran',
        'Jumlah Tamu',
        'Tanggal Kirim',
        'Terakhir Diperbarui',
    ]);

    // Tulis baris data
    foreach ($rows as $row) {
        fputcsv($output, [
            $row['id'],
            $row['guest_name'],
            $row['phone'],
            $row['attendance'] === 'hadir' ? 'Hadir' : 'Tidak Hadir',
            $row['guest_count'],
            $row['submitted_at'],
            $row['updated_at'],
        ]);
    }

    fclose($output);
    exit;
}

// ─── Handler: DELETE — Hapus Entri RSVP (Admin) ──────────────────────────────

/**
 * Menghapus satu entri RSVP berdasarkan ID.
 *
 * Mengembalikan 404 jika entri dengan ID tersebut tidak ditemukan.
 *
 * Requirements: 9.8
 *
 * @return void
 */
function handleRsvpDelete(): void
{
    // Ambil dan validasi ID dari query string
    $rawId = isset($_GET['id']) ? $_GET['id'] : '';
    $id    = filter_var($rawId, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);

    if ($id === false) {
        sendError(400, 'Parameter id tidak valid. Harus berupa integer positif.');
    }

    $db = getDB();

    // Pastikan entri benar-benar ada sebelum dihapus
    $checkStmt = $db->prepare('SELECT id FROM rsvp WHERE id = :id');
    $checkStmt->execute([':id' => $id]);

    if ($checkStmt->fetch() === false) {
        sendError(404, "Entri RSVP dengan id {$id} tidak ditemukan.");
    }

    // Hapus entri
    $deleteStmt = $db->prepare('DELETE FROM rsvp WHERE id = :id');
    $deleteStmt->execute([':id' => $id]);

    sendJson([
        'success' => true,
        'message' => "Entri RSVP dengan id {$id} berhasil dihapus.",
    ]);
}
