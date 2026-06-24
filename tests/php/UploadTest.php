<?php

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../includes/upload.php';

final class UploadTest extends TestCase
{
    public function testOversizedFileIsRejected(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Ukuran file melebihi batas');

        $tmp = tempnam(sys_get_temp_dir(), 'upload_');
        file_put_contents($tmp, 'plain text');

        try {
            validateAndSaveFile([
                'tmp_name' => $tmp,
                'size' => MAX_IMAGE_SIZE + 1,
                'error' => UPLOAD_ERR_OK,
            ], 'gallery', ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE);
        } finally {
            if (is_file($tmp)) {
                unlink($tmp);
            }
        }
    }

    public function testInvalidMimeTypeIsRejected(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Format file tidak didukung');

        $tmp = tempnam(sys_get_temp_dir(), 'upload_');
        file_put_contents($tmp, 'plain text');

        try {
            validateAndSaveFile([
                'tmp_name' => $tmp,
                'size' => filesize($tmp),
                'error' => UPLOAD_ERR_OK,
            ], 'gallery', ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE);
        } finally {
            if (is_file($tmp)) {
                unlink($tmp);
            }
        }
    }

    public function testDeleteFileRejectsPathOutsideUploads(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Akses ditolak');

        $tmp = tempnam(sys_get_temp_dir(), 'outside_upload_');

        try {
            deleteFile($tmp);
        } finally {
            if (is_file($tmp)) {
                unlink($tmp);
            }
        }
    }
}
