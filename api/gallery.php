<?php

/**
 * Endpoint Admin: Galeri Foto — Website Undangan Digital Pernikahan
 *
 * Mengelola koleksi foto galeri pernikahan: upload dan hapus foto.
 *
 * Endpoint:
 *   POST   /api/?endpoint=gallery            Upload foto galeri baru
 *   DELETE /api/?endpoint=gallery&id={id}    Hapus foto galeri + file fisik
 *
 * Requirements: 6.5, 6.6, 6.7, 17.4
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

// ─── POST: Upload foto galeri baru ────────────────────────────────────────────
if ($method === 'POST') {
    if (!isset($_FILES['photo'])) {
        sendError(400, 'File foto tidak ditemukan dalam request.');
    }

    // Sanitasi caption dan sort_order opsional
    $caption   = sanitizeText($_POST['caption']    ?? '', 255);
    $sortOrder = (int) ($_POST['sort_order'] ?? 0);

    try {
        $relativePath = validateAndSaveFile(
            $_FILES['photo'],
            'gallery',
            ALLOWED_IMAGE_TYPES,
            MAX_IMAGE_SIZE
        );

        $stmt = $db->prepare(
            'INSERT INTO gallery (file_path, caption, sort_order)
             VALUES (:file_path, :caption, :sort_order)'
        );
        $stmt->execute([
            ':file_path'  => $relativePath,
            ':caption'    => $caption,
            ':sort_order' => $sortOrder,
        ]);

        $newId = $db->lastInsertId();

        $fetch = $db->prepare('SELECT * FROM gallery WHERE id = :id');
        $fetch->execute([':id' => $newId]);
        $data = $fetch->fetch();

        sendJson([
            'success' => true,
            'data'    => $data,
            'message' => 'Foto galeri berhasil diupload.',
        ], 201);

    } catch (RuntimeException $e) {
        sendError(422, $e->getMessage());
    } catch (PDOException $e) {
        sendError(500, 'Gagal menyimpan data foto: ' . $e->getMessage());
    }
}

// ─── DELETE: Hapus foto galeri ────────────────────────────────────────────────
if ($method === 'DELETE') {
    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;

    if ($id <= 0) {
        sendError(400, "Parameter 'id' harus berupa integer positif.");
    }

    try {
        // Ambil path file sebelum dihapus
        $fetch = $db->prepare('SELECT file_path FROM gallery WHERE id = :id');
        $fetch->execute([':id' => $id]);
        $row = $fetch->fetch();

        if (!$row) {
            sendError(404, "Foto dengan id {$id} tidak ditemukan.");
        }

        // Hapus rekaman dari database
        $del = $db->prepare('DELETE FROM gallery WHERE id = :id');
        $del->execute([':id' => $id]);

        // Hapus file fisik dari disk
        if (!empty($row['file_path'])) {
            try {
                deleteFile($row['file_path']);
            } catch (RuntimeException $ignored) {
                // File mungkin sudah tidak ada; lanjutkan
            }
        }

        sendJson(['success' => true, 'message' => 'Foto galeri berhasil dihapus.']);

    } catch (PDOException $e) {
        sendError(500, 'Gagal menghapus data foto: ' . $e->getMessage());
    }
}

// Method tidak didukung
sendError(405, 'Method tidak didukung untuk endpoint ini.');
