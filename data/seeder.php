<?php

/**
 * Seeder — Data Awal Website Undangan Digital Pernikahan
 *
 * Script ini mengisi database dengan data admin default dan konten demo
 * (data mempelai, settings). Aman untuk dijalankan berulang kali karena
 * menggunakan INSERT OR IGNORE — tidak ada duplikasi data.
 *
 * Cara menjalankan:
 *   php data/seeder.php
 *
 * Requirements: 15.1, 19.1
 */

// ─── Bootstrap ────────────────────────────────────────────────────────────────

// Pastikan script dijalankan dari root project agar path relatif konsisten
chdir(dirname(__DIR__));

require_once __DIR__ . '/../includes/config.php';
require_once __DIR__ . '/../includes/db.php';

$pdo = getDB();

echo "=== Seeder Undangan Digital Pernikahan ===" . PHP_EOL;
echo PHP_EOL;

// ─── 1. Admin Default ─────────────────────────────────────────────────────────
// Requirements: 15.1 — sistem harus memiliki akun admin default
// Password di-hash dengan PASSWORD_BCRYPT agar aman disimpan di database

echo "[1/3] Seeding admin default..." . PHP_EOL;

$defaultPassword = 'admin123';
$passwordHash    = password_hash($defaultPassword, PASSWORD_BCRYPT);

$stmt = $pdo->prepare(
    "INSERT OR IGNORE INTO admin_users (username, password_hash)
     VALUES (:username, :password_hash)"
);

$stmt->execute([
    ':username'      => 'admin',
    ':password_hash' => $passwordHash,
]);

if ($stmt->rowCount() > 0) {
    echo "    ✓ Admin 'admin' berhasil dibuat (password: admin123)" . PHP_EOL;
    echo "    ⚠ Harap ganti password admin setelah login pertama!" . PHP_EOL;
} else {
    echo "    - Admin 'admin' sudah ada, dilewati." . PHP_EOL;
}

echo PHP_EOL;

// ─── 2. Data Mempelai Contoh ──────────────────────────────────────────────────
// Requirements: 19.1 — data demo untuk keperluan pengembangan dan presentasi
// Tabel couple sudah memiliki dua baris (groom, bride) dari schema.sql,
// seeder ini memperbarui data menggunakan UPDATE hanya jika masih kosong.

echo "[2/3] Seeding data mempelai contoh..." . PHP_EOL;

// Data mempelai pria (groom)
$groomData = [
    'full_name'   => 'Ahmad Fauzi',
    'nickname'    => 'Ahmad',
    'father_name' => 'Bapak Hasan',
    'mother_name' => 'Ibu Fatimah',
];

// Data mempelai wanita (bride)
$brideData = [
    'full_name'   => 'Siti Rahayu',
    'nickname'    => 'Siti',
    'father_name' => 'Bapak Ridwan',
    'mother_name' => 'Ibu Aminah',
];

// Hanya update jika full_name masih kosong (belum pernah diisi)
$updateCouple = $pdo->prepare(
    "UPDATE couple
     SET full_name   = :full_name,
         nickname    = :nickname,
         father_name = :father_name,
         mother_name = :mother_name,
         updated_at  = datetime('now','localtime')
     WHERE role = :role
       AND (full_name = '' OR full_name IS NULL)"
);

$updateCouple->execute(array_merge([':role' => 'groom'], array_combine(
    array_map(fn($k) => ':' . $k, array_keys($groomData)),
    array_values($groomData)
)));
if ($updateCouple->rowCount() > 0) {
    echo "    ✓ Mempelai pria: {$groomData['full_name']}" . PHP_EOL;
} else {
    echo "    - Data mempelai pria sudah ada atau telah diisi, dilewati." . PHP_EOL;
}

$updateCouple->execute(array_merge([':role' => 'bride'], array_combine(
    array_map(fn($k) => ':' . $k, array_keys($brideData)),
    array_values($brideData)
)));
if ($updateCouple->rowCount() > 0) {
    echo "    ✓ Mempelai wanita: {$brideData['full_name']}" . PHP_EOL;
} else {
    echo "    - Data mempelai wanita sudah ada atau telah diisi, dilewati." . PHP_EOL;
}

echo PHP_EOL;

// ─── 3. Settings Hashtag dan Teks Pembuka ────────────────────────────────────
// Requirements: 19.1 — nilai awal pengaturan website
// Menggunakan INSERT OR IGNORE — tidak akan menimpa data yang sudah diubah admin

echo "[3/3] Seeding settings..." . PHP_EOL;

$settings = [
    'couple_hashtag' => '#AhmadSitiWedding',
    'opening_text'   => 'Bismillahirrahmanirrahim. Dengan memohon rahmat dan ridho Allah SWT, kami mengundang Bapak/Ibu/Saudara/i untuk hadir di hari istimewa kami.',
    'website_title'  => 'Undangan Pernikahan Ahmad & Siti',
];

$insertSetting = $pdo->prepare(
    "INSERT OR IGNORE INTO settings (key, value) VALUES (:key, :value)"
);

foreach ($settings as $key => $value) {
    $insertSetting->execute([':key' => $key, ':value' => $value]);
    if ($insertSetting->rowCount() > 0) {
        echo "    ✓ Setting '{$key}' berhasil ditambahkan." . PHP_EOL;
    } else {
        echo "    - Setting '{$key}' sudah ada, dilewati." . PHP_EOL;
    }
}

echo PHP_EOL;
echo "=== Seeder selesai dijalankan ===" . PHP_EOL;
echo PHP_EOL;
