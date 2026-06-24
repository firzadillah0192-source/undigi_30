<?php

/**
 * API Front Controller — Website Undangan Digital Pernikahan
 *
 * File ini bertindak sebagai single entry point untuk semua request API.
 * Membaca parameter `endpoint` dari query string dan me-routing request
 * ke file endpoint yang sesuai di folder `api/`.
 *
 * URL format : /api/?endpoint={nama}&action={aksi}&...
 *
 * Requirements: 17.4, 19.2
 */

// ─── Bootstrap ────────────────────────────────────────────────────────────────

// Muat konfigurasi global (set CORS headers + Content-Type + konstanta aplikasi)
require_once __DIR__ . '/../includes/config.php';

// Muat fungsi utilitas: sanitizeText, sendJson, sendError, dll.
require_once __DIR__ . '/../includes/helpers.php';

// ─── Tangani OPTIONS Preflight ────────────────────────────────────────────────

/**
 * Browser mengirim OPTIONS request sebelum cross-origin request yang sebenarnya.
 * Setelah config.php sudah mengirim header CORS, kita cukup balas 200 dan keluar.
 * Requirements: 19.2
 */
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ─── Routing Endpoint ─────────────────────────────────────────────────────────

/**
 * Daftar endpoint yang valid beserta path file-nya.
 * Key   : nilai parameter ?endpoint=
 * Value : path absolut ke file handler endpoint
 */
$endpoints = [
    'auth'        => __DIR__ . '/auth.php',
    'content'     => __DIR__ . '/content.php',
    'rsvp'        => __DIR__ . '/rsvp.php',
    'guestbook'   => __DIR__ . '/guestbook.php',
    'couple'      => __DIR__ . '/couple.php',
    'events'      => __DIR__ . '/events.php',
    'gallery'     => __DIR__ . '/gallery.php',
    'love-story'  => __DIR__ . '/love-story.php',
    'envelope'    => __DIR__ . '/envelope.php',
    'music'       => __DIR__ . '/music.php',
    'settings'    => __DIR__ . '/settings.php',
    'dashboard'   => __DIR__ . '/dashboard.php',
];

// Baca dan sanitasi parameter endpoint (hanya izinkan karakter alfanumerik + tanda hubung)
$rawEndpoint = isset($_GET['endpoint']) ? $_GET['endpoint'] : '';
$endpoint    = preg_replace('/[^a-z0-9\-]/', '', strtolower($rawEndpoint));

// Pastikan endpoint diisi
if ($endpoint === '') {
    sendError(400, 'Parameter endpoint diperlukan.');
}

// Periksa apakah endpoint terdaftar
if (!array_key_exists($endpoint, $endpoints)) {
    sendError(404, "Endpoint '{$endpoint}' tidak ditemukan.");
}

$endpointFile = $endpoints[$endpoint];

// Pastikan file handler benar-benar ada di filesystem
if (!file_exists($endpointFile)) {
    sendError(503, "Endpoint '{$endpoint}' belum tersedia.");
}

// ─── Delegasi ke Handler Endpoint ────────────────────────────────────────────

// Muat file endpoint yang sesuai; $_GET, $_POST, $_FILES, dll. tetap tersedia
require_once $endpointFile;
