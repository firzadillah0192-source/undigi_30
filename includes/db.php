<?php

/**
 * Koneksi Database PDO SQLite — Website Undangan Digital Pernikahan
 *
 * Menyediakan fungsi getDB() yang mengembalikan singleton instance PDO
 * terhubung ke database SQLite. Schema otomatis dijalankan saat file
 * database belum ada (first-run initialization).
 *
 * Requirements: 18.4
 */

require_once __DIR__ . '/config.php';

/**
 * Mengembalikan singleton instance PDO yang terhubung ke database SQLite.
 *
 * Perilaku:
 * - Jika file database belum ada, jalankan schema.sql untuk membuat tabel
 *   dan mengisi data awal (seed).
 * - PRAGMA journal_mode = WAL untuk performa write concurrent.
 * - PRAGMA foreign_keys = ON untuk integritas referensial.
 * - Error mode ERRMODE_EXCEPTION agar error mudah ditangkap via try/catch.
 * - Default fetch mode FETCH_ASSOC agar hasil query berupa associative array.
 *
 * @return PDO Instance PDO singleton yang sudah dikonfigurasi.
 * @throws RuntimeException Jika file schema.sql tidak ditemukan atau koneksi gagal.
 */
function getDB(): PDO
{
    static $pdo = null;

    if ($pdo !== null) {
        return $pdo;
    }

    // Cek apakah database sudah ada sebelum membuka koneksi.
    // File baru dibuat oleh PDO saat koneksi pertama kali dibuka,
    // sehingga pengecekan harus dilakukan sebelum new PDO().
    $isNewDatabase = !file_exists(DB_PATH);

    try {
        $pdo = new PDO('sqlite:' . DB_PATH);
    } catch (PDOException $e) {
        throw new RuntimeException(
            'Tidak dapat membuka database SQLite: ' . $e->getMessage(),
            (int) $e->getCode(),
            $e
        );
    }

    // Konfigurasi PDO
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

    // Aktifkan WAL mode untuk performa concurrent read/write yang lebih baik
    $pdo->exec('PRAGMA journal_mode = WAL');

    // Aktifkan foreign key enforcement (SQLite menonaktifkannya secara default)
    $pdo->exec('PRAGMA foreign_keys = ON');

    // Inisialisasi schema jika database baru dibuat
    if ($isNewDatabase) {
        $schemaPath = __DIR__ . '/../data/schema.sql';

        if (!file_exists($schemaPath)) {
            throw new RuntimeException(
                'File schema.sql tidak ditemukan di: ' . $schemaPath
            );
        }

        $schemaSql = file_get_contents($schemaPath);

        if ($schemaSql === false) {
            throw new RuntimeException(
                'Gagal membaca file schema.sql dari: ' . $schemaPath
            );
        }

        $pdo->exec($schemaSql);
    }

    return $pdo;
}
