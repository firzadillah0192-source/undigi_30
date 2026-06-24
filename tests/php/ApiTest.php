<?php

use PHPUnit\Framework\TestCase;

final class ApiTest extends TestCase
{
    private function runApi(string $query, string $method = 'GET'): array
    {
        $root = dirname(__DIR__, 2);
        $script = tempnam(sys_get_temp_dir(), 'api_test_') . '.php';
        $code = <<<'PHP'
<?php
parse_str($argv[1], $_GET);
$_SERVER['REQUEST_METHOD'] = $argv[2];
$_SERVER['REQUEST_URI'] = '/api/?' . $argv[1];
$_SERVER['HTTP_HOST'] = 'localhost';
chdir($argv[3]);
require $argv[3] . '/api/index.php';
PHP;
        file_put_contents($script, $code);

        $cmd = escapeshellarg(PHP_BINARY) . ' ' . escapeshellarg($script) . ' ' . escapeshellarg($query) . ' ' . escapeshellarg($method) . ' ' . escapeshellarg($root);
        $output = shell_exec($cmd);
        unlink($script);

        return json_decode((string) $output, true) ?: [];
    }

    public function testContentEndpointReturnsStructuredData(): void
    {
        $data = $this->runApi('endpoint=content');

        $this->assertTrue($data['success'] ?? false);
        $this->assertArrayHasKey('settings', $data['data']);
        $this->assertArrayHasKey('couple', $data['data']);
        $this->assertArrayHasKey('events', $data['data']);
        $this->assertArrayHasKey('gallery', $data['data']);
    }

    public function testUnknownEndpointReturnsError(): void
    {
        $data = $this->runApi('endpoint=unknown');

        $this->assertFalse($data['success'] ?? true);
        $this->assertSame(404, $data['code'] ?? null);
    }
}
