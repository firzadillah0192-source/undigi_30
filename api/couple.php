<?php

/**
 * Endpoint Admin: Data Mempelai — Website Undangan Digital Pernikahan
 *
 * Mengelola data profil mempelai pria (groom) dan wanita (bride).
 *
 * Endpoint:
 *   PUT  /api/?endpoint=couple&role={groom|bride}         Update data mempelai
 *   POST /api/?endpoint=couple&role={groom|bride}&action=photo  Upload foto mempelai
 *
 * Requirements: 3.3, 3.4, 17.1, 17.4, 17.5, 17.6
 */

require_once __DIR__ . '/../includes/config.php';
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/helpers.php';
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/upload.php';

// Semua endpoint di sini membutuhkan autentikasi admin
requireAuth();

$method = $_SERVER['REQUEST_METHOD'];
$role   = isset($_GET['role']) ? strtolower(trim($_GET['role'])) : '';
$action = isset($_GET['action']) ? strtolower(trim($_GET['action'])) : '';

// Validasi nilai role: hanya 'groom' atau 'bride'
if (!in_array($role, ['groom', 'bride'], true)) {
    sendError(400, "Parameter 'role' harus 'groom' atau 'bride'.");
}

$db = getDB();

// ─── PUT: Update data teks mempelai ──────────────────────────────────────────
if ($method === 'PUT') {
    // Baca body JSON
    $raw  = file_get_contents('php://input');
    $body = json_decode($raw, true);

    if (!is_array($body)) {
        sendError(400, 'Request body harus berupa JSON yang valid.');
    }

    // Sanitasi dan validasi panjang field sesuai batas domain (design.md)
    $fullName   = sanitizeText($body['full_name']   ?? '', 100);
    $nickname   = sanitizeText($body['nickname']    ?? '', 50);
    $fatherName = sanitizeText($body['father_name'] ?? '', 100);
    $motherName = sanitizeText($body['mother_name'] ?? '', 100);

    // Validasi field wajib: full_name tidak boleh kosong
    if ($fullName === '') {
        sendError(400, 'Nama lengkap tidak boleh kosong.');
    }

    try {
        $stmt = $db->prepare(
            'UPDATE couple
                SET full_name   = :full_name,
                    nickname    = :nickname,
                    father_name = :father_name,
                    mother_name = :mother_name,
                    updated_at  = datetime(\'now\',\'localtime\')
              WHERE role = :role'
        );
        $stmt->execute([
            ':full_name'   => $fullName,
            ':nickname'    => $nickname,
            ':father_name' => $fatherName,
            ':mother_name' => $motherName,
            ':role'        => $role,
        ]);

        if ($stmt->rowCount() === 0) {
            sendError(404, "Data mempelai dengan role '{$role}' tidak ditemukan.");
        }

        // Ambil data terbaru untuk response
        $fetch = $db->prepare('SELECT * FROM couple WHERE role = :role');
        $fetch->execute([':role' => $role]);
        $data = $fetch->fetch();

        sendJson(['success' => true, 'data' => $data, 'message' => 'Data mempelai berhasil diperbarui.']);

    } catch (PDOException $e) {
        sendError(500, 'Gagal memperbarui data mempelai: ' . $e->getMessage());
    }
}

// ─── POST: Upload foto mempelai ───────────────────────────────────────────────
if ($method === 'POST' && $action === 'photo') {
    if (!isset($_FILES['photo'])) {
        sendError(400, 'File foto tidak ditemukan dalam request.');
    }

    try {
        $relativePath = validateAndSaveFile(
            $_FILES['photo'],
            'couple',
            ALLOWED_IMAGE_TYPES,
            MAX_IMAGE_SIZE
        );

        // Ambil foto lama untuk dihapus setelah upload sukses
        $fetchOld = $db->prepare('SELECT photo_path FROM couple WHERE role = :role');
        $fetchOld->execute([':role' => $role]);
        $old = $fetchOld->fetch();

        // Simpan path foto baru ke database
        $stmt = $db->prepare(
            'UPDATE couple
                SET photo_path = :photo_path,
                    updated_at = datetime(\'now\',\'localtime\')
              WHERE role = :role'
        );
        $stmt->execute([
            ':photo_path' => $relativePath,
            ':role'       => $role,
        ]);

        // Hapus foto lama jika ada
        if (!empty($old['photo_path'])) {
            try {
                deleteFile($old['photo_path']);
            } catch (RuntimeException $ignored) {
                // Kegagalan hapus foto lama tidak membatalkan operasi ini
            }
        }

        sendJson([
            'success'  => true,
            'data'     => ['photo_path' => $relativePath],
            'message'  => 'Foto mempelai berhasil diupload.',
        ]);

    } catch (RuntimeException $e) {
        sendError(422, $e->getMessage());
    } catch (PDOException $e) {
        sendError(500, 'Gagal menyimpan path foto: ' . $e->getMessage());
    }
}

// Method tidak didukung
sendError(405, 'Method tidak didukung untuk endpoint ini.');
