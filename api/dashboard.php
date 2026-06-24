<?php

/**
 * Endpoint Statistik Dashboard — GET /api/?endpoint=dashboard
 *
 * Mengembalikan snapshot statistik ringkas untuk halaman dashboard admin:
 * jumlah RSVP hadir, RSVP tidak hadir, dan total ucapan buku tamu.
 *
 * Endpoint ini hanya dapat diakses oleh admin yang sudah login.
 *
 * Response structure:
 * {
 *   "success": true,
 *   "data": {
 *     "rsvp_hadir":       N,
 *     "rsvp_tidak_hadir": N,
 *     "total_guestbook":  N
 *   }
 * }
 *
 * Requirements: 16.1
 */

require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/helpers.php';
require_once __DIR__ . '/../includes/db.php';

// Pastikan admin sudah login dan sesi masih valid
requireAuth();

// Hanya method GET yang diizinkan
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError(405, 'Method tidak diizinkan. Gunakan GET.');
}

try {
    $pdo = getDB();

    // ── 1. Hitung RSVP dengan attendance = 'hadir' ────────────────────────────
    $stmtHadir = $pdo->prepare(
        "SELECT COUNT(*) AS total FROM rsvp WHERE attendance = 'hadir'"
    );
    $stmtHadir->execute();
    $rsvpHadir = (int) $stmtHadir->fetch()['total'];

    // ── 2. Hitung RSVP dengan attendance = 'tidak_hadir' ─────────────────────
    $stmtTidakHadir = $pdo->prepare(
        "SELECT COUNT(*) AS total FROM rsvp WHERE attendance = 'tidak_hadir'"
    );
    $stmtTidakHadir->execute();
    $rsvpTidakHadir = (int) $stmtTidakHadir->fetch()['total'];

    // ── 3. Hitung total semua entri buku tamu ─────────────────────────────────
    $stmtGuestbook = $pdo->prepare(
        'SELECT COUNT(*) AS total FROM guestbook'
    );
    $stmtGuestbook->execute();
    $totalGuestbook = (int) $stmtGuestbook->fetch()['total'];

    // ── Kirim response JSON ───────────────────────────────────────────────────
    sendJson([
        'success' => true,
        'data'    => [
            'rsvp_hadir'       => $rsvpHadir,
            'rsvp_tidak_hadir' => $rsvpTidakHadir,
            'total_guestbook'  => $totalGuestbook,
        ],
    ]);

} catch (Exception $e) {
    sendError(500, 'Terjadi kesalahan saat memuat statistik dashboard.');
}
