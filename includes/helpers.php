<?php

/**
 * Helper Utilities — Website Undangan Digital Pernikahan
 *
 * Fungsi-fungsi utilitas inti yang digunakan di seluruh aplikasi:
 * sanitasi input, validasi data, dan pengiriman response JSON.
 *
 * Requirements: 4.5, 9.3, 17.4, 19.2, 19.3
 */

// ─── Sanitasi Input ───────────────────────────────────────────────────────────

/**
 * Sanitasi string input: hapus tag HTML, trim whitespace,
 * encode karakter khusus HTML, dan potong sesuai batas panjang.
 *
 * Semua input teks harus diproses melalui fungsi ini sebelum disimpan ke database.
 *
 * @param  string $input     String input dari user
 * @param  int    $maxLength Panjang maksimum output (dalam karakter multibyte)
 * @return string            String yang sudah disanitasi
 *
 * Requirements: 19.2, 19.3
 */
function sanitizeText(string $input, int $maxLength): string
{
    // 1. Hapus semua tag HTML
    $clean = strip_tags($input);

    // 2. Hapus whitespace di awal dan akhir
    $clean = trim($clean);

    // 3. Encode karakter khusus HTML untuk mencegah XSS
    $clean = htmlspecialchars($clean, ENT_QUOTES, 'UTF-8');

    // 4. Potong ke panjang maksimum (multibyte-safe)
    return mb_substr($clean, 0, $maxLength);
}

// ─── Validasi Data ────────────────────────────────────────────────────────────

/**
 * Validasi nilai kehadiran RSVP.
 *
 * Nilai yang valid hanya 'hadir' atau 'tidak_hadir' (strict comparison).
 *
 * @param  string $value Nilai attendance dari form RSVP
 * @return bool          true jika nilai valid, false jika tidak
 *
 * Requirements: 9.3
 */
function validateAttendance(string $value): bool
{
    return in_array($value, ['hadir', 'tidak_hadir'], true);
}

/**
 * Validasi rentang waktu: waktu selesai harus sama dengan atau setelah waktu mulai.
 *
 * Menggunakan strtotime untuk parsing string waktu dalam format HH:MM atau HH:MM:SS.
 * Mengembalikan false jika salah satu waktu tidak dapat di-parse.
 *
 * @param  string $start Waktu mulai, mis. "09:00" atau "09:00:00"
 * @param  string $end   Waktu selesai, mis. "11:00" atau "11:00:00"
 * @return bool          true jika $end >= $start, false jika tidak valid
 *
 * Requirements: 4.5
 */
function validateTimeRange(string $start, string $end): bool
{
    $startTs = strtotime($start);
    $endTs   = strtotime($end);

    // Kedua waktu harus dapat di-parse
    if ($startTs === false || $endTs === false) {
        return false;
    }

    return $endTs >= $startTs;
}

// ─── Response JSON ────────────────────────────────────────────────────────────

/**
 * Kirim response JSON dengan HTTP status code tertentu lalu hentikan eksekusi.
 *
 * Format response sukses:
 * { "success": true, "data": { ... }, "message": "Opsional" }
 *
 * @param  array $data Array data yang akan di-encode menjadi JSON
 * @param  int   $code HTTP status code (default 200)
 * @return void
 *
 * Requirements: 17.4, 19.2
 */
function sendJson(array $data, int $code = 200): void
{
    http_response_code($code);
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/**
 * Kirim response JSON error dengan HTTP status code tertentu lalu hentikan eksekusi.
 *
 * Format response error:
 * { "success": false, "error": "Deskripsi error", "code": 400 }
 *
 * @param  int    $code    HTTP status code error (mis. 400, 401, 404, 429, 500)
 * @param  string $message Pesan error yang deskriptif
 * @return void
 *
 * Requirements: 17.4, 19.3
 */
function sendError(int $code, string $message): void
{
    http_response_code($code);
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode([
        'success' => false,
        'error'   => $message,
        'code'    => $code,
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
