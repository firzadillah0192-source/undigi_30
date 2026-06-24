<?php

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../includes/auth.php';

final class AuthTest extends TestCase
{
    private string $username;

    protected function setUp(): void
    {
        $this->username = 'phpunit_' . bin2hex(random_bytes(4));
        $db = getDB();
        $stmt = $db->prepare('INSERT INTO admin_users (username, password_hash, failed_attempts, locked_until) VALUES (:username, :hash, 0, NULL)');
        $stmt->execute([
            ':username' => $this->username,
            ':hash' => password_hash('secret', PASSWORD_BCRYPT),
        ]);
    }

    protected function tearDown(): void
    {
        $db = getDB();
        $stmt = $db->prepare('DELETE FROM admin_users WHERE username = :username');
        $stmt->execute([':username' => $this->username]);
        $_SESSION = [];
    }

    public function testRateLimitLocksAfterFiveFailures(): void
    {
        for ($i = 0; $i < LOGIN_MAX_ATTEMPTS - 1; $i++) {
            recordFailedAttempt($this->username);
            $this->assertTrue(checkRateLimit($this->username));
        }

        recordFailedAttempt($this->username);

        $this->assertFalse(checkRateLimit($this->username));
        $this->assertGreaterThan(0, getRateLimitRemainingSeconds($this->username));
    }

    public function testClearFailedAttemptsUnlocksUser(): void
    {
        for ($i = 0; $i < LOGIN_MAX_ATTEMPTS; $i++) {
            recordFailedAttempt($this->username);
        }

        clearFailedAttempts($this->username);

        $db = getDB();
        $stmt = $db->prepare('SELECT failed_attempts, locked_until FROM admin_users WHERE username = :username');
        $stmt->execute([':username' => $this->username]);
        $row = $stmt->fetch();

        $this->assertSame(0, (int) $row['failed_attempts']);
        $this->assertEmpty($row['locked_until']);
        $this->assertTrue(checkRateLimit($this->username));
    }

    public function testCsrfTokenValidation(): void
    {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        $token = generateCsrfToken();

        $this->assertTrue(validateCsrfToken($token));
        $this->assertFalse(validateCsrfToken('invalid-token'));
        $this->assertFalse(validateCsrfToken(''));
    }
}
