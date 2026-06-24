<?php

/**
 * Endpoint Admin: Amplop Digital — Website Undangan Digital Pernikahan
 *
 * Mengelola entri rekening bank untuk fitur amplop digital.
 *
 * Endpoint:
 *   POST   /api/?endpoint=envelope               Tambah entri rekening baru
 *   PUT    /api/?endpoint=envelope&id={id}       Edit entri rekening
 *   DELETE /api/?endpoint=envelope&id={id}       Hapus entri rekening
 *
 * Requirements: 11.4, 11.5, 11.6, 17.4
 */

require_once __DIR__ . '/../includes/config.php';
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/helpers.php';
require_once __DIR__ . '/../includes/auth.php';

// Semua endpoint di sini membutuhkan autentikasi admin
requireAuth();

$method = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id']) ? (int) $_GET['id'] : 0;
$db     = getDB();

// ─── POST: Tambah entri rekening baru ─────────────────────────────────────────
if ($method === 'POST') {
    $raw  = file_get_contents('php://input');
    $body = json_decode($raw, true);

    if (!is_array($body)) {
        sendError(400, 'Request body harus berupa JSON yang valid.');
    }

    $bankName      = sanitizeText($body['bank_name']      ?? '', 100);
    $accountHolder = sanitizeText($body['account_holder'] ?? '', 50);
    $accountNumber = sanitizeText($body['account_number'] ?? '', 50);
    $sortOrder     = isset($body['sort_order']) ? (int) $body['sort_order'] : 0;

    // Validasi field wajib
    if ($bankName === '') {
        sendError(400, 'Nama bank tidak boleh kosong.');
    }
    if ($accountHolder === '') {
        sendError(400, 'Nama pemilik rekening tidak boleh kosong.');
    }
    if ($accountNumber === '') {
        sendError(400, 'Nomor rekening tidak boleh kosong.');
    }

    try {
        $stmt = $db->prepare(
            'INSERT INTO digital_envelope (bank_name, account_holder, account_number, sort_order)
             VALUES (:bank_name, :account_holder, :account_number, :sort_order)'
        );
        $stmt->execute([
            ':bank_name'      => $bankName,
            ':account_holder' => $accountHolder,
            ':account_number' => $accountNumber,
            ':sort_order'     => $sortOrder,
        ]);

        $newId = $db->lastInsertId();

        $fetch = $db->prepare('SELECT * FROM digital_envelope WHERE id = :id');
        $fetch->execute([':id' => $newId]);
        $data = $fetch->fetch();

        sendJson([
            'success' => true,
            'data'    => $data,
            'message' => 'Entri rekening berhasil ditambahkan.',
        ], 201);

    } catch (PDOException $e) {
        sendError(500, 'Gagal menyimpan entri rekening: ' . $e->getMessage());
    }
}

// ─── PUT: Edit entri rekening ─────────────────────────────────────────────────
if ($method === 'PUT') {
    if ($id <= 0) {
        sendError(400, "Parameter 'id' harus berupa integer positif.");
    }

    $raw  = file_get_contents('php://input');
    $body = json_decode($raw, true);

    if (!is_array($body)) {
        sendError(400, 'Request body harus berupa JSON yang valid.');
    }

    // Ambil data existing dulu untuk nilai default
    $fetch = $db->prepare('SELECT * FROM digital_envelope WHERE id = :id');
    $fetch->execute([':id' => $id]);
    $existing = $fetch->fetch();

    if (!$existing) {
        sendError(404, "Entri rekening dengan id {$id} tidak ditemukan.");
    }

    $bankName      = sanitizeText($body['bank_name']      ?? $existing['bank_name'],      100);
    $accountHolder = sanitizeText($body['account_holder'] ?? $existing['account_holder'], 50);
    $accountNumber = sanitizeText($body['account_number'] ?? $existing['account_number'], 50);
    $sortOrder     = isset($body['sort_order']) ? (int) $body['sort_order'] : (int) $existing['sort_order'];

    if ($bankName === '') {
        sendError(400, 'Nama bank tidak boleh kosong.');
    }
    if ($accountHolder === '') {
        sendError(400, 'Nama pemilik rekening tidak boleh kosong.');
    }
    if ($accountNumber === '') {
        sendError(400, 'Nomor rekening tidak boleh kosong.');
    }

    try {
        $stmt = $db->prepare(
            'UPDATE digital_envelope
                SET bank_name      = :bank_name,
                    account_holder = :account_holder,
                    account_number = :account_number,
                    sort_order     = :sort_order
              WHERE id = :id'
        );
        $stmt->execute([
            ':bank_name'      => $bankName,
            ':account_holder' => $accountHolder,
            ':account_number' => $accountNumber,
            ':sort_order'     => $sortOrder,
            ':id'             => $id,
        ]);

        // Ambil data terbaru untuk response
        $fetch->execute([':id' => $id]);
        $data = $fetch->fetch();

        sendJson(['success' => true, 'data' => $data, 'message' => 'Entri rekening berhasil diperbarui.']);

    } catch (PDOException $e) {
        sendError(500, 'Gagal memperbarui entri rekening: ' . $e->getMessage());
    }
}

// ─── DELETE: Hapus entri rekening ─────────────────────────────────────────────
if ($method === 'DELETE') {
    if ($id <= 0) {
        sendError(400, "Parameter 'id' harus berupa integer positif.");
    }

    try {
        $fetch = $db->prepare('SELECT id FROM digital_envelope WHERE id = :id');
        $fetch->execute([':id' => $id]);
        $row = $fetch->fetch();

        if (!$row) {
            sendError(404, "Entri rekening dengan id {$id} tidak ditemukan.");
        }

        $del = $db->prepare('DELETE FROM digital_envelope WHERE id = :id');
        $del->execute([':id' => $id]);

        sendJson(['success' => true, 'message' => 'Entri rekening berhasil dihapus.']);

    } catch (PDOException $e) {
        sendError(500, 'Gagal menghapus entri rekening: ' . $e->getMessage());
    }
}

// Method tidak didukung
sendError(405, 'Method tidak didukung untuk endpoint ini.');
