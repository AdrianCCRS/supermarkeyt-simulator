<?php
// Mini arnés de pruebas sin dependencias. Uso: php tests/run.php

foreach (['Services/PricingService', 'Services/CheckoutService', 'Services/JornadaService',
          'Services/VentaService', 'Services/ProductoService', 'Repositories/CategoriaRepository',
          'Repositories/StockJugadorRepository', 'Repositories/ProductoRepository', 'Repositories/VentaRepository',
          'Repositories/JornadaRepository', 'Repositories/JugadorRepository', 'Services/RankingService',
          'Http/Api', 'Http/LimitePeticiones', 'Config/Env'] as $f) {
    require_once __DIR__ . "/../src/$f.php";
}

// Jugadores de prueba: identificadores anónimos como los que genera el navegador
const JUG = '11111111-1111-4111-8111-111111111111';
const JUG2 = '22222222-2222-4222-8222-222222222222';
const ADM = ['X-Admin-Token' => 'token-de-prueba'];

final class T
{
    public static int $passed = 0;
    public static int $failed = 0;
    public static int $skipped = 0;

    public static function test(string $name, callable $fn): void
    {
        try {
            $fn();
            self::$passed++;
            echo "  ok   $name\n";
        } catch (SkipTest $e) {
            self::$skipped++;
            echo "  skip $name ({$e->getMessage()})\n";
        } catch (Throwable $e) {
            self::$failed++;
            echo "  FAIL $name: " . $e->getMessage() . "\n";
        }
    }

    public static function same(mixed $expected, mixed $actual, string $msg = ''): void
    {
        if ($expected !== $actual) {
            throw new Exception(
                ($msg ? "$msg: " : '') . 'esperado ' . var_export($expected, true)
                . ', obtenido ' . var_export($actual, true)
            );
        }
    }

    public static function throws(string $class, callable $fn, string $msg = ''): void
    {
        try {
            $fn();
        } catch (Throwable $e) {
            if (!$e instanceof $class) {
                throw new Exception("$msg: se esperaba $class, llegó " . get_class($e));
            }
            return;
        }
        throw new Exception("$msg: se esperaba $class y no se lanzó nada");
    }
}

final class SkipTest extends Exception {}
