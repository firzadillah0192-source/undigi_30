<?php

/**
 * Endpoint Admin: Musik Latar — Website Undangan Digital Pernikahan
 *
 * Mengelola file musik latar belakang untuk undangan digital.
 * Hanya satu musik yang aktif pada satu waktu.
 *
 * Endpoint:
 *   POST   /api/?endpoint=music           Upload file musik baru (MP3/OGG, maks. 10 MB)
 *   DELETE /api/?endpoint=music&id={id}  Hapus musik + file fisik
 *
 * Requirements: 13.5, 17.4
 */

require_once __DIR__ . '/../includes/config.php';
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/helpers.php';
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/upload.php';

// Semua endpoint di sini membutuhkan autentikasi admin
requireAuth();

$method = $_SERVER['REQUEST_METHOD'];
$db     = getDB();

// ─── POST: Upload file musik baru ─────────────────────────────────────────────
if ($method === 'POST') {
    if (!isset($_FILES['music'])) {
        sendError(400, 'File musik tidak ditemukan dalam request.');
    }

    // Simpan nama asli file untuk ditampilkan di UI
    $originalName = sanitizeText($_FILES['music']['name'] ?? '', 255);

    try {
        $relativePath = validateAndSaveFile(
            $_FILES['music'],
            'music',
            ALLOWED_AUDIO_TYPES,
            MAX_AUDIO_SIZE
        );

        // Set semua musik yang sebelumnya aktif menjadi tidak aktif
        $db->exec('UPDATE music SET is_active = 0');

        // Insert musik baru sebagai aktif
        $stmt = $db->prepare(
            'INSERT INTO music (file_path, original_name, is_active)
             VALUES (:file_path, :original_name, 1)'
        );
        $stmt->execute([
            ':file_path'     => $relativePath,
            ':original_name' => $originalName,
        ]);

        $newId = $db->lastInsertId();

        $fetch = $db->prepare('SELECT * FROM music WHERE id = :id');
        $fetch->execute([':id' => $newId]);
        $data = $fetch->fetch();

        sendJson([
            'success' => true,
            'data'    => $data,
            'message' => 'File musik berhasil diupload dan diaktifkan.',
        ], 201);

    } catch (RuntimeException $e) {
        sendError(422, $e->getMessage());
    } catch (PDOException $e) {
        sendError(500, 'Gagal menyimpan data musik: ' . $e->getMessage());
    }
}

// ─── DELETE: Hapus musik + file fisik ─────────────────────────────────────────
if ($method === 'DELETE') {
    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;

    if ($id <= 0) {
        sendError(400, "Parameter 'id' harus berupa integer positif.");
    }

    try {
        // Ambil path file sebelum dihapus
        $fetch = $db->prepare('SELECT file_path FROM music WHERE id = :id');
        $fetch->execute([':id' => $id]);
        $row = $fetch->fetch();

        if (!$row) {
            sendError(404, "Musik dengan id {$id} tidak ditemukan.");
        }

        // Hapus rekaman dari database
        $del = $db->prepare('DELETE FROM music WHERE id = :id');
        $del->execute([':id' => $id]);

        // Hapus file fisik dari disk
        if (!empty($row['file_path'])) {
            try {
                deleteFile($row['file_path']);
            } catch (RuntimeException $ignored) {
                // File mungkin sudah tidak ada; lanjutkan
            }
        }

        sendJson(['success' => true, 'message' => 'Musik berhasil dihapus.']);

    } catch (PDOException $e) {
        sendError(500, 'Gagal menghapus data musik: ' . $e->getMessage());
    }
}

// Method tidak didukung
sendError(405, 'Method tidak didukung untuk endpoint ini.');
