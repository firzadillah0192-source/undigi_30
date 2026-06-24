<?php

/**
 * Endpoint Admin: Love Story / Timeline — Website Undangan Digital Pernikahan
 *
 * Mengelola item timeline kisah cinta mempelai: tambah, edit, dan hapus.
 *
 * Endpoint:
 *   POST   /api/?endpoint=love-story               Tambah item baru
 *   PUT    /api/?endpoint=love-story&id={id}       Edit item yang ada
 *   DELETE /api/?endpoint=love-story&id={id}       Hapus item + file fisik foto
 *
 * Requirements: 7.3, 7.4, 7.5, 17.4, 17.5, 17.6
 */

require_once __DIR__ . '/../includes/config.php';
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/helpers.php';
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/upload.php';

// Semua endpoint di sini membutuhkan autentikasi admin
requireAuth();

$method = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id']) ? (int) $_GET['id'] : 0;
$db     = getDB();

// ─── POST: Tambah item love story baru ────────────────────────────────────────
if ($method === 'POST') {
    // Baca field dari form-data (multipart) karena bisa ada file foto
    $title       = sanitizeText($_POST['title']       ?? '', 100);
    $storyDate   = sanitizeText($_POST['story_date']  ?? '', 20);
    $description = sanitizeText($_POST['description'] ?? '', 500);
    $sortOrder   = (int) ($_POST['sort_order'] ?? 0);

    // Validasi field wajib
    if ($title === '') {
        sendError(400, 'Judul item love story tidak boleh kosong.');
    }
    if ($storyDate === '') {
        sendError(400, 'Tanggal item love story tidak boleh kosong.');
    }

    $photoPath = null;

    // Upload foto opsional
    if (isset($_FILES['photo']) && $_FILES['photo']['error'] !== UPLOAD_ERR_NO_FILE) {
        try {
            $photoPath = validateAndSaveFile(
                $_FILES['photo'],
                'love-story',
                ALLOWED_IMAGE_TYPES,
                MAX_IMAGE_SIZE
            );
        } catch (RuntimeException $e) {
            sendError(422, $e->getMessage());
        }
    }

    try {
        $stmt = $db->prepare(
            'INSERT INTO love_story (title, story_date, description, photo_path, sort_order)
             VALUES (:title, :story_date, :description, :photo_path, :sort_order)'
        );
        $stmt->execute([
            ':title'       => $title,
            ':story_date'  => $storyDate,
            ':description' => $description,
            ':photo_path'  => $photoPath,
            ':sort_order'  => $sortOrder,
        ]);

        $newId = $db->lastInsertId();

        $fetch = $db->prepare('SELECT * FROM love_story WHERE id = :id');
        $fetch->execute([':id' => $newId]);
        $data = $fetch->fetch();

        sendJson([
            'success' => true,
            'data'    => $data,
            'message' => 'Item love story berhasil ditambahkan.',
        ], 201);

    } catch (PDOException $e) {
        // Hapus file yang sudah terupload jika insert gagal
        if ($photoPath !== null) {
            try { deleteFile($photoPath); } catch (RuntimeException $ignored) {}
        }
        sendError(500, 'Gagal menyimpan item love story: ' . $e->getMessage());
    }
}

// ─── PUT: Edit item love story ────────────────────────────────────────────────
if ($method === 'PUT') {
    if ($id <= 0) {
        sendError(400, "Parameter 'id' harus berupa integer positif.");
    }

    // PUT biasanya dikirim sebagai JSON; baca body
    $raw  = file_get_contents('php://input');
    $body = json_decode($raw, true);

    if (!is_array($body)) {
        sendError(400, 'Request body harus berupa JSON yang valid.');
    }

    // Ambil item existing dulu
    $fetch = $db->prepare('SELECT * FROM love_story WHERE id = :id');
    $fetch->execute([':id' => $id]);
    $existing = $fetch->fetch();

    if (!$existing) {
        sendError(404, "Item love story dengan id {$id} tidak ditemukan.");
    }

    $title       = sanitizeText($body['title']       ?? $existing['title'],       100);
    $storyDate   = sanitizeText($body['story_date']  ?? $existing['story_date'],  20);
    $description = sanitizeText($body['description'] ?? $existing['description'], 500);
    $sortOrder   = isset($body['sort_order']) ? (int) $body['sort_order'] : (int) $existing['sort_order'];

    if ($title === '') {
        sendError(400, 'Judul item love story tidak boleh kosong.');
    }
    if ($storyDate === '') {
        sendError(400, 'Tanggal item love story tidak boleh kosong.');
    }

    try {
        $stmt = $db->prepare(
            'UPDATE love_story
                SET title       = :title,
                    story_date  = :story_date,
                    description = :description,
                    sort_order  = :sort_order
              WHERE id = :id'
        );
        $stmt->execute([
            ':title'       => $title,
            ':story_date'  => $storyDate,
            ':description' => $description,
            ':sort_order'  => $sortOrder,
            ':id'          => $id,
        ]);

        $fetch->execute([':id' => $id]);
        $data = $fetch->fetch();

        sendJson(['success' => true, 'data' => $data, 'message' => 'Item love story berhasil diperbarui.']);

    } catch (PDOException $e) {
        sendError(500, 'Gagal memperbarui item love story: ' . $e->getMessage());
    }
}

// ─── DELETE: Hapus item love story ───────────────────────────────────────────
if ($method === 'DELETE') {
    if ($id <= 0) {
        sendError(400, "Parameter 'id' harus berupa integer positif.");
    }

    try {
        $fetch = $db->prepare('SELECT photo_path FROM love_story WHERE id = :id');
        $fetch->execute([':id' => $id]);
        $row = $fetch->fetch();

        if (!$row) {
            sendError(404, "Item love story dengan id {$id} tidak ditemukan.");
        }

        $del = $db->prepare('DELETE FROM love_story WHERE id = :id');
        $del->execute([':id' => $id]);

        // Hapus file fisik foto jika ada
        if (!empty($row['photo_path'])) {
            try {
                deleteFile($row['photo_path']);
            } catch (RuntimeException $ignored) {}
        }

        sendJson(['success' => true, 'message' => 'Item love story berhasil dihapus.']);

    } catch (PDOException $e) {
        sendError(500, 'Gagal menghapus item love story: ' . $e->getMessage());
    }
}

// Method tidak didukung
sendError(405, 'Method tidak didukung untuk endpoint ini.');
