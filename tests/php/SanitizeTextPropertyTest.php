<?php

use PHPUnit\Framework\TestCase;
use Eris\Generator;
use Eris\TestTrait;

require_once __DIR__ . '/../../includes/helpers.php';

final class SanitizeTextPropertyTest extends TestCase
{
    use TestTrait;

    public function testSanitizeTextNeverReturnsScriptTagAndRespectsMaxLength(): void
    {
        $this
            ->forAll(Generator\string(), Generator\choose(1, 500))
            ->then(function (string $input, int $maxLength): void {
                $result = sanitizeText('<script>' . $input . '</script>', $maxLength);

                $this->assertStringNotContainsString('<script', strtolower($result));
                $this->assertLessThanOrEqual($maxLength, mb_strlen($result));
            });
    }
}
