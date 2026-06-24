<?php

/**
 * Endpoint Admin: Detail Acara — Website Undangan Digital Pernikahan
 *
 * Mengelola data detail acara pernikahan: akad dan resepsi secara independen.
 *
 * Endpoint:
 *   PUT /api/?endpoint=events&type={akad|resepsi}   Update detail acara
 *
 * Requirements: 4.5, 4.6, 17.2, 17.4, 17.5, 17.6
 */

require_once __DIR__ . '/../includes/config.php';
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/helpers.php';
require_once __DIR__ . '/../includes/auth.php';

// Semua endpoint di sini membutuhkan autentikasi admin
requireAuth();

$method = $_SERVER['REQUEST_METHOD'];
$type   = isset($_GET['type']) ? strtolower(trim($_GET['type'])) : '';

// Validasi nilai type: hanya 'akad' atau 'resepsi'
if (!in_array($type, ['akad', 'resepsi'], true)) {
    sendError(400, "Parameter 'type' harus 'akad' atau 'resepsi'.");
}

$db = getDB();

// ─── PUT: Update detail acara ─────────────────────────────────────────────────
if ($method === 'PUT') {
    $raw  = file_get_contents('php://input');
    $body = json_decode($raw, true);

    if (!is_array($body)) {
        sendError(400, 'Request body harus berupa JSON yang valid.');
    }

    // Sanitasi field teks sesuai batas domain (design.md)
    $eventDate    = sanitizeText($body['event_date']    ?? '', 20);
    $startTime    = sanitizeText($body['start_time']    ?? '', 10);
    $endTime      = sanitizeText($body['end_time']      ?? '', 10);
    $venueName    = sanitizeText($body['venue_name']    ?? '', 200);
    $address      = sanitizeText($body['address']       ?? '', 500);
    $mapsUrl      = sanitizeText($body['maps_url']      ?? '', 500);
    $mapsEmbedUrl = sanitizeText($body['maps_embed_url'] ?? '', 1000);

    // Validasi rentang waktu jika kedua field waktu diisi
    if ($startTime !== '' && $endTime !== '') {
        if (!validateTimeRange($startTime, $endTime)) {
            sendError(400, 'Waktu selesai tidak boleh lebih awal dari waktu mulai.');
        }
    }

    try {
        $stmt = $db->prepare(
            'UPDATE events
                SET event_date     = :event_date,
                    start_time     = :start_time,
                    end_time       = :end_time,
                    venue_name     = :venue_name,
                    address        = :address,
                    maps_url       = :maps_url,
                    maps_embed_url = :maps_embed_url,
                    updated_at     = datetime(\'now\',\'localtime\')
              WHERE type = :type'
        );
        $stmt->execute([
            ':event_date'     => $eventDate    !== '' ? $eventDate    : null,
            ':start_time'     => $startTime    !== '' ? $startTime    : null,
            ':end_time'       => $endTime      !== '' ? $endTime      : null,
            ':venue_name'     => $venueName,
            ':address'        => $address,
            ':maps_url'       => $mapsUrl,
            ':maps_embed_url' => $mapsEmbedUrl,
            ':type'           => $type,
        ]);

        if ($stmt->rowCount() === 0) {
            sendError(404, "Data acara dengan type '{$type}' tidak ditemukan.");
        }

        // Ambil data terbaru untuk response
        $fetch = $db->prepare('SELECT * FROM events WHERE type = :type');
        $fetch->execute([':type' => $type]);
        $data = $fetch->fetch();

        sendJson(['success' => true, 'data' => $data, 'message' => 'Detail acara berhasil diperbarui.']);

    } catch (PDOException $e) {
        sendError(500, 'Gagal memperbarui data acara: ' . $e->getMessage());
    }
}

// Method tidak didukung
sendError(405, 'Method tidak didukung untuk endpoint ini.');
