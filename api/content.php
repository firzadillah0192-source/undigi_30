<?php

/**
 * Endpoint Konten Publik — GET /api/?endpoint=content
 *
 * Mengembalikan semua konten undangan dalam satu response JSON terstruktur.
 * Tidak memerlukan autentikasi — endpoint ini bersifat publik.
 *
 * Response structure:
 * {
 *   "success": true,
 *   "data": {
 *     "settings": { "opening_text": "...", "couple_hashtag": "...", ... },
 *     "couple": {
 *       "groom": { "id": 1, "role": "groom", "full_name": "...", ... },
 *       "bride": { "id": 2, "role": "bride", "full_name": "...", ... }
 *     },
 *     "events": {
 *       "akad":    { "id": 1, "type": "akad", "event_date": "...", ... },
 *       "resepsi": { "id": 2, "type": "resepsi", "event_date": "...", ... }
 *     },
 *     "gallery":          [ { "id": 1, "file_path": "...", "caption": "...", "sort_order": 0 }, ... ],
 *     "love_story":       [ { "id": 1, "title": "...", "story_date": "...", ... }, ... ],
 *     "digital_envelope": [ { "id": 1, "bank_name": "...", ... }, ... ],
 *     "music": { "id": 1, "file_path": "...", "original_name": "..." } | null
 *   }
 * }
 *
 * Requirements: 1.1, 2.1, 3.1, 4.1, 6.1, 7.1, 8.1, 11.1, 13.1
 */

// Pastikan hanya method GET yang diizinkan
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError(405, 'Method tidak diizinkan. Gunakan GET.');
}

// Muat koneksi database (db.php sudah ter-require melalui router atau require di sini)
require_once __DIR__ . '/../includes/db.php';

try {
    $pdo = getDB();

    // ── 1. Settings: kembalikan sebagai key→value object ─────────────────────
    $settingsRows = $pdo
        ->query('SELECT key, value FROM settings')
        ->fetchAll(PDO::FETCH_ASSOC);

    $settings = [];
    foreach ($settingsRows as $row) {
        $settings[$row['key']] = $row['value'];
    }

    // ── 2. Couple: dua baris dikunci oleh role (groom / bride) ───────────────
    $coupleRows = $pdo
        ->query('SELECT id, role, full_name, nickname, father_name, mother_name, photo_path, updated_at FROM couple')
        ->fetchAll(PDO::FETCH_ASSOC);

    $couple = ['groom' => null, 'bride' => null];
    foreach ($coupleRows as $row) {
        $couple[$row['role']] = $row;
    }

    // ── 3. Events: dua baris dikunci oleh type (akad / resepsi) ──────────────
    $eventRows = $pdo
        ->query('SELECT id, type, event_date, start_time, end_time, venue_name, address, maps_url, maps_embed_url, updated_at FROM events')
        ->fetchAll(PDO::FETCH_ASSOC);

    $events = ['akad' => null, 'resepsi' => null];
    foreach ($eventRows as $row) {
        $events[$row['type']] = $row;
    }

    // ── 4. Gallery: urut sort_order ASC ──────────────────────────────────────
    $gallery = $pdo
        ->query('SELECT id, file_path, caption, sort_order, created_at FROM gallery ORDER BY sort_order ASC, id ASC')
        ->fetchAll(PDO::FETCH_ASSOC);

    // ── 5. Love Story: urut story_date ASC ───────────────────────────────────
    $loveStory = $pdo
        ->query('SELECT id, title, story_date, description, photo_path, sort_order, created_at FROM love_story ORDER BY story_date ASC, id ASC')
        ->fetchAll(PDO::FETCH_ASSOC);

    // ── 6. Digital Envelope: urut sort_order ASC ─────────────────────────────
    $digitalEnvelope = $pdo
        ->query('SELECT id, bank_name, account_holder, account_number, sort_order, created_at FROM digital_envelope ORDER BY sort_order ASC, id ASC')
        ->fetchAll(PDO::FETCH_ASSOC);

    // ── 7. Music: hanya yang is_active = 1, ambil yang paling baru ───────────
    $musicStmt = $pdo->query(
        'SELECT id, file_path, original_name, is_active, uploaded_at FROM music WHERE is_active = 1 ORDER BY uploaded_at DESC, id DESC LIMIT 1'
    );
    $music = $musicStmt->fetch(PDO::FETCH_ASSOC);
    // fetch() mengembalikan false jika tidak ada data; normalisasi ke null
    if ($music === false) {
        $music = null;
    }

    // ── Kirim response JSON ───────────────────────────────────────────────────
    sendJson([
        'success' => true,
        'data'    => [
            'settings'         => $settings,
            'couple'           => $couple,
            'events'           => $events,
            'gallery'          => $gallery,
            'love_story'       => $loveStory,
            'digital_envelope' => $digitalEnvelope,
            'music'            => $music,
        ],
    ]);

} catch (Exception $e) {
    // Sembunyikan detail error internal dari respons publik
    sendError(500, 'Terjadi kesalahan saat memuat konten. Silakan coba lagi.');
}
