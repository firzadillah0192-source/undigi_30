<?php

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../includes/helpers.php';

final class HelpersTest extends TestCase
{
    public function testSanitizeTextStripsTagsTruncatesAndEscapes(): void
    {
        $result = sanitizeText('  <script>alert(1)</script><b>A & B</b>  ', 12);

        $this->assertStringNotContainsString('<script', $result);
        $this->assertStringNotContainsString('<b>', $result);
        $this->assertStringContainsString('alert', $result);
        $this->assertLessThanOrEqual(12, mb_strlen($result));
    }

    public function testSanitizeTextPreservesNormalText(): void
    {
        $this->assertSame('Selamat datang', sanitizeText(' Selamat datang ', 50));
    }

    public function testValidateAttendanceAcceptsOnlyKnownValues(): void
    {
        $this->assertTrue(validateAttendance('hadir'));
        $this->assertTrue(validateAttendance('tidak_hadir'));
        $this->assertFalse(validateAttendance('maybe'));
        $this->assertFalse(validateAttendance(''));
    }

    public function testValidateTimeRange(): void
    {
        $this->assertTrue(validateTimeRange('09:00', '09:00'));
        $this->assertTrue(validateTimeRange('09:00', '11:00'));
        $this->assertFalse(validateTimeRange('11:00', '09:00'));
        $this->assertFalse(validateTimeRange('not-time', '09:00'));
    }
}
