<?php

namespace Tests\Concerns;

/**
 * Real-time progress output for slow Laravel test suites.
 *
 * PHPUnit captures each test's standard output (echo/print) and only flushes it
 * after the whole suite finishes, which makes long runs look frozen. This trait
 * writes straight to the STDERR stream instead, bypassing that buffer, so lines
 * appear in the terminal the moment the test reaches them — with both
 * `php artisan test` and `php artisan test --testdox`.
 *
 * A "▶ TestMethod" banner is printed automatically the first time a test emits a
 * line, so steps stay attributable when several classes run under one --filter.
 * The trait never touches assertions and never triggers the PHPUnit "printed
 * output" risky-test warning (that only applies to the buffered stdout stream).
 *
 * Usage:
 *
 *     class SlowTest extends TestCase
 *     {
 *         use StreamsProgress;
 *
 *         public function test_long_flow(): void
 *         {
 *             $this->step('seeding the database');       //  • Step 1 — seeding...
 *             $this->note('plans, features and pivots'); //      · plans...
 *             $this->section('hitting the API');         // banner + separator
 *             ...
 *         }
 *     }
 *
 * Set LIVE_TEST_OUTPUT=0 (e.g. in CI logs) to silence every line.
 */
trait StreamsProgress
{
    private ?string $liveLastTest = null;

    private int $liveStepNumber = 0;

    /** Numbered step line, e.g. "  • Step 1 — seeding the database". */
    protected function step(string $message): void
    {
        $this->liveStepNumber++;

        $this->live('  • Step '.$this->liveStepNumber.' — '.$message);
    }

    /** Indented sub-detail beneath the current step. */
    protected function note(string $message): void
    {
        $this->live('      · '.$message);
    }

    /** Major phase banner with a separator. */
    protected function section(string $message): void
    {
        $this->live('');
        $this->live('  '.$message);
        $this->live('  '.str_repeat('-', 58));
    }

    /** Emit one line straight to STDERR without buffering. */
    private function live(string $message): void
    {
        if (! $this->liveOutputEnabled() || ! defined('STDERR')) {
            return;
        }

        if ($this->liveLastTest !== $this->liveTestKey()) {
            $this->liveLastTest = $this->liveTestKey();

            fwrite(STDERR, PHP_EOL.'▶ '.$this->humanizedTestName().PHP_EOL);
            fwrite(STDERR, '  '.str_repeat('-', 58).PHP_EOL);
        }

        fwrite(STDERR, $message.PHP_EOL);
        fflush(STDERR);
    }

    private function liveOutputEnabled(): bool
    {
        $env = getenv('LIVE_TEST_OUTPUT');

        return $env === false || filter_var($env, FILTER_VALIDATE_BOOLEAN);
    }

    private function liveTestKey(): string
    {
        return static::class.'::'.(method_exists($this, 'name') ? $this->name() : '');
    }

    private function humanizedTestName(): string
    {
        $method = method_exists($this, 'name') ? (string) $this->name() : '';
        $method = (string) preg_replace('/^test_/', '', $method);
        $method = str_replace('_', ' ', $method);

        return static::class.' — '.ucfirst($method);
    }
}
