<?php

/**
 * Endpoint Admin: Pengaturan Umum — Website Undangan Digital Pernikahan
 *
 * Mengelola pengaturan umum website yang disimpan sebagai key-value pairs
 * dalam tabel settings.
 *
 * Endpoint:
 *   PUT /api/?endpoint=settings   Update satu atau lebih key pengaturan
 *
 * Key yang didukung:
 *   - opening_text   (maks. 500 karakter)
 *   - couple_hashtag (maks. 100 karakter)
 *   - website_title  (maks. 200 karakter)
 *
 * Requirements: 2.3, 2.4, 2.5, 17.3, 17.4, 17.5
 */

require_once __DIR__ . '/../includes/config.php';
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/helpers.php';
require_once __DIR__ . '/../includes/auth.php';

// Semua endpoint di sini membutuhkan autentikasi admin
requireAuth();

$method = $_SERVER['REQUEST_METHOD'];
$db     = getDB();

// ─── PUT: Update pengaturan ───────────────────────────────────────────────────
if ($method === 'PUT') {
    $raw  = file_get_contents('php://input');
    $body = json_decode($raw, true);

    if (!is_array($body)) {
        sendError(400, 'Request body harus berupa JSON yang valid.');
    }

    // Definisikan key yang diizinkan beserta batas panjang masing-masing
    $allowedKeys = [
        'opening_text'   => 500,
        'couple_hashtag' => 100,
        'website_title'  => 200,
    ];

    // Filter body hanya ke key yang diizinkan
    $toUpdate = array_intersect_key($body, $allowedKeys);

    if (empty($toUpdate)) {
        sendError(400, 'Tidak ada key pengaturan yang valid dalam request. Key yang didukung: ' . implode(', ', array_keys($allowedKeys)));
    }

    try {
        $updated = [];

        $upsert = $db->prepare(
            'UPDATE settings
                SET value      = :value,
                    updated_at = datetime(\'now\',\'localtime\')
              WHERE key = :key'
        );

        foreach ($toUpdate as $key => $rawValue) {
            $maxLength    = $allowedKeys[$key];
            $sanitized    = sanitizeText((string) $rawValue, $maxLength);

            $upsert->execute([
                ':value' => $sanitized,
                ':key'   => $key,
            ]);

            $updated[$key] = $sanitized;
        }

        // Kembalikan semua nilai settings yang ada untuk konfirmasi
        $allSettings = [];
        $rows = $db->query('SELECT key, value FROM settings')->fetchAll();
        foreach ($rows as $row) {
            $allSettings[$row['key']] = $row['value'];
        }

        sendJson([
            'success' => true,
            'data'    => $allSettings,
            'message' => 'Pengaturan berhasil diperbarui.',
        ]);

    } catch (PDOException $e) {
        sendError(500, 'Gagal memperbarui pengaturan: ' . $e->getMessage());
    }
}

// Method tidak didukung
sendError(405, 'Method tidak didukung untuk endpoint ini.');
