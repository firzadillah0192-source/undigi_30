<?php

/**
 * Helper Upload File — Website Undangan Digital Pernikahan
 *
 * Menyediakan fungsi untuk memvalidasi dan menyimpan file upload secara aman,
 * serta menghapus file dengan validasi path untuk mencegah directory traversal.
 *
 * Requirements: 3.4, 6.5, 6.6, 7.3, 7.4, 13.5
 */

require_once __DIR__ . '/config.php';

/**
 * Validasi dan simpan file upload ke subfolder yang ditentukan.
 *
 * Langkah validasi:
 * 1. Cek error upload dari PHP
 * 2. Validasi ukuran file terhadap $maxSize
 * 3. Deteksi tipe MIME sebenarnya via finfo (bukan dari header client)
 * 4. Cocokkan tipe MIME dengan daftar yang diizinkan
 * 5. Generate nama file acak dengan bin2hex(random_bytes(16))
 * 6. Pindahkan file dari tmp ke direktori tujuan
 *
 * @param array  $file         Elemen dari $_FILES (memiliki key: tmp_name, size, error)
 * @param string $subdir       Subfolder di dalam uploads/, misal: 'gallery', 'couple'
 * @param array  $allowedTypes Array tipe MIME yang diizinkan, misal: ALLOWED_IMAGE_TYPES
 * @param int    $maxSize      Ukuran maksimum file dalam bytes, misal: MAX_IMAGE_SIZE
 *
 * @return string Path relatif file yang tersimpan, misal: 'uploads/gallery/abc123.jpg'
 *
 * @throws RuntimeException Jika validasi gagal atau file gagal disimpan
 *
 * Requirements: 6.5, 6.6, 7.3, 7.4, 13.5
 */
function validateAndSaveFile(array $file, string $subdir, array $allowedTypes, int $maxSize): string
{
    // 1. Cek error upload PHP
    if (!isset($file['error']) || $file['error'] !== UPLOAD_ERR_OK) {
        $uploadErrors = [
            UPLOAD_ERR_INI_SIZE   => 'File melebihi batas upload_max_filesize.',
            UPLOAD_ERR_FORM_SIZE  => 'File melebihi batas MAX_FILE_SIZE form.',
            UPLOAD_ERR_PARTIAL    => 'File hanya terupload sebagian.',
            UPLOAD_ERR_NO_FILE    => 'Tidak ada file yang diupload.',
            UPLOAD_ERR_NO_TMP_DIR => 'Folder temporary tidak ditemukan.',
            UPLOAD_ERR_CANT_WRITE => 'Gagal menulis file ke disk.',
            UPLOAD_ERR_EXTENSION  => 'Upload dihentikan oleh ekstensi PHP.',
        ];
        $errorCode    = $file['error'] ?? -1;
        $errorMessage = $uploadErrors[$errorCode] ?? 'Error upload tidak diketahui.';
        throw new RuntimeException($errorMessage);
    }

    // 2. Validasi ukuran file
    if ($file['size'] > $maxSize) {
        $maxMb = round($maxSize / (1024 * 1024), 0);
        throw new RuntimeException("Ukuran file melebihi batas {$maxMb} MB.");
    }

    // 3. Deteksi tipe MIME sebenarnya melalui finfo (tidak bergantung pada header client)
    if (!is_readable($file['tmp_name'])) {
        throw new RuntimeException('File temporary tidak dapat dibaca.');
    }
    $finfo    = new finfo(FILEINFO_MIME_TYPE);
    $mimeType = $finfo->file($file['tmp_name']);
    if ($mimeType === false) {
        throw new RuntimeException('Gagal mendeteksi tipe file.');
    }

    // 4. Validasi tipe MIME terhadap daftar yang diizinkan
    if (!in_array($mimeType, $allowedTypes, true)) {
        throw new RuntimeException('Format file tidak didukung.');
    }

    // 5. Tentukan ekstensi berdasarkan MIME type yang terdeteksi
    $ext = match ($mimeType) {
        'image/jpeg' => 'jpg',
        'image/png'  => 'png',
        'image/webp' => 'webp',
        'audio/mpeg' => 'mp3',
        'audio/ogg'  => 'ogg',
        default      => throw new RuntimeException('Tipe MIME tidak memiliki ekstensi yang valid.'),
    };

    // 6. Generate nama file acak yang aman (32 karakter hex)
    $filename = bin2hex(random_bytes(16)) . '.' . $ext;

    // 7. Pastikan direktori tujuan ada dan dapat ditulis
    $destDir = UPLOAD_BASE . '/' . $subdir;
    if (!is_dir($destDir)) {
        if (!mkdir($destDir, 0755, true)) {
            throw new RuntimeException('Gagal membuat direktori upload.');
        }
    }
    if (!is_writable($destDir)) {
        throw new RuntimeException('Direktori upload tidak dapat ditulis.');
    }

    // 8. Pindahkan file dari lokasi temporary ke tujuan akhir
    $destPath     = $destDir . '/' . $filename;
    $relativePath = 'uploads/' . $subdir . '/' . $filename;

    if (!move_uploaded_file($file['tmp_name'], $destPath)) {
        throw new RuntimeException('Gagal menyimpan file.');
    }

    // Kembalikan path relatif (misal: 'uploads/gallery/abc123.jpg')
    return $relativePath;
}

/**
 * Hapus file upload dengan validasi path keamanan.
 *
 * Memastikan path yang diberikan berada di dalam folder uploads/ (UPLOAD_BASE)
 * untuk mencegah directory traversal attack yang dapat menghapus file di luar
 * folder upload.
 *
 * @param string $path Path relatif atau absolut ke file yang akan dihapus
 *
 * @return void
 *
 * @throws RuntimeException Jika path tidak valid, path berada di luar uploads/,
 *                          atau file gagal dihapus
 *
 * Requirements: 6.7, 7.5, 13.5
 */
function deleteFile(string $path): void
{
    // Normalisasi: ubah path relatif ('uploads/gallery/file.jpg') menjadi absolut
    if (!str_starts_with($path, '/') && !preg_match('/^[A-Za-z]:[\\/]/', $path)) {
        // Path relatif — resolve dari root project (satu level di atas includes/)
        $absolutePath = realpath(__DIR__ . '/../' . ltrim($path, '/'));
    } else {
        $absolutePath = realpath($path);
    }

    // Validasi: pastikan realpath berhasil di-resolve (file harus ada)
    if ($absolutePath === false) {
        throw new RuntimeException('File tidak ditemukan atau path tidak valid.');
    }

    // Resolve UPLOAD_BASE ke path absolut yang sudah di-canonicalize
    $uploadBase = realpath(UPLOAD_BASE);
    if ($uploadBase === false) {
        throw new RuntimeException('Direktori uploads/ tidak dapat di-resolve.');
    }

    // Validasi path traversal: pastikan file berada di dalam UPLOAD_BASE
    // Tambahkan DIRECTORY_SEPARATOR di akhir $uploadBase agar tidak cocok dengan
    // prefix saja (misal: /var/www/uploads_extra tidak cocok dengan /var/www/uploads)
    $uploadBaseNorm = rtrim($uploadBase, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR;
    $absPathNorm    = rtrim($absolutePath, DIRECTORY_SEPARATOR);

    if (!str_starts_with($absPathNorm . DIRECTORY_SEPARATOR, $uploadBaseNorm)) {
        throw new RuntimeException('Akses ditolak: path file berada di luar folder uploads/.');
    }

    // Pastikan target adalah file (bukan direktori)
    if (!is_file($absolutePath)) {
        throw new RuntimeException('Target bukan file yang valid.');
    }

    // Hapus file
    if (!unlink($absolutePath)) {
        throw new RuntimeException('Gagal menghapus file.');
    }
}
