<?php
echo "CheckoutService (integración, requiere MySQL + pdo_mysql)\n";

/**
 * Usa una base de datos APARTE (DB_NAME_TEST, por defecto
 * supermarket_simulator_test) para no tocar los datos reales.
 */
function testPdo(): PDO
{
    if (!extension_loaded('pdo_mysql')) {
        throw new SkipTest('falta la extensión pdo_mysql');
    }
    Env::load(dirname(__DIR__) . '/.env');
    $db = Env::get('DB_NAME_TEST', 'supermarket_simulator_test');

    // Seguro anti-desastres: este helper hace DROP DATABASE. Solo se permite
    // un identificador simple que termine en _test y que no sea la BD real.
    if (!preg_match('/^[A-Za-z0-9_]{1,50}_test$/', $db)
        || $db === Env::get('DB_NAME', 'supermarket_simulator')) {
        throw new Exception("DB_NAME_TEST inválido ('$db'): debe terminar en _test y ser distinta de DB_NAME");
    }
    $opts = [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC];
    $dsn = fn(string $extra) => sprintf('mysql:host=%s;port=%s%s;charset=utf8mb4',
        Env::get('DB_HOST', '127.0.0.1'), Env::get('DB_PORT', '3306'), $extra);
    try {
        $root = new PDO($dsn(''), Env::get('DB_USER', 'root'), Env::get('DB_PASS', ''), $opts);
    } catch (PDOException $e) {
        throw new SkipTest('sin conexión a MySQL');
    }
    $root->exec("DROP DATABASE IF EXISTS `$db`");
    $root->exec("CREATE DATABASE `$db`");
    $root->exec("USE `$db`");
    // init.sql crea/usa supermarket_simulator: se omiten esas dos líneas.
    $sql = preg_replace('/^(CREATE DATABASE|USE)\b.*;$/mi', '', file_get_contents(dirname(__DIR__) . '/database/init.sql'));
    $root->exec($sql);
    $root->exec("INSERT INTO categorias (id, nombre) VALUES (1, 'Test')");
    $root->exec("INSERT INTO productos (id, sku, nombre, categoria_id, precio_base, iva_pct, stock, imagen_url, is_active) VALUES
        (1, 'A-1', 'Leche', 1, 1000.00, 0.00, 10, 'x', 1),
        (2, 'B-2', 'Queso', 1, 4900.00, 5.00, 3, 'x', 1),
        (3, 'C-3', 'Inactivo', 1, 100.00, 0.00, 5, 'x', 0)");
    $root->exec("INSERT INTO jornadas (id, estado) VALUES (1, 'abierta'), (2, 'cerrada')");
    return $root;
}

function makeCheckout(PDO $pdo): CheckoutService
{
    return new CheckoutService($pdo, new ProductoRepository($pdo), new VentaRepository($pdo),
        new JornadaRepository($pdo), new PricingService());
}

function stockOf(PDO $pdo, int $id): int
{
    return (int) $pdo->query("SELECT stock FROM productos WHERE id = $id")->fetchColumn();
}

T::test('registra la venta, descuenta stock y calcula el cambio', function () {
    $pdo = testPdo();
    $r = makeCheckout($pdo)->procesarCompra(1, 'Ana', ['A-1' => 2, 'B-2' => 1], '10000.00');
    T::same('6900.00', $r['subtotal']);
    T::same('245.00', $r['iva_total']);
    T::same('7145.00', $r['total']);
    T::same('2855.00', $r['cambio']);
    T::same(8, stockOf($pdo, 1));
    T::same(2, stockOf($pdo, 2));
    T::same(1, (int) $pdo->query('SELECT COUNT(*) FROM ventas')->fetchColumn());
    T::same(2, (int) $pdo->query('SELECT COUNT(*) FROM detalles_venta')->fetchColumn());
});

T::test('efectivo insuficiente: excepción y nada se persiste', function () {
    $pdo = testPdo();
    T::throws(InvalidArgumentException::class, fn() =>
        makeCheckout($pdo)->procesarCompra(1, 'Ana', ['A-1' => 2], '1000.00'));
    T::same(10, stockOf($pdo, 1));
    T::same(0, (int) $pdo->query('SELECT COUNT(*) FROM ventas')->fetchColumn());
});

T::test('stock insuficiente: rollback total (otras líneas no se descuentan)', function () {
    $pdo = testPdo();
    T::throws(RuntimeException::class, fn() =>
        makeCheckout($pdo)->procesarCompra(1, 'Ana', ['A-1' => 1, 'B-2' => 4], '99999.00'));
    T::same(10, stockOf($pdo, 1));
    T::same(3, stockOf($pdo, 2));
    T::same(0, (int) $pdo->query('SELECT COUNT(*) FROM ventas')->fetchColumn());
});

T::test('jornada cerrada o inexistente se rechaza', function () {
    $pdo = testPdo();
    T::throws(RuntimeException::class, fn() =>
        makeCheckout($pdo)->procesarCompra(2, 'Ana', ['A-1' => 1], '5000.00'));
    T::throws(InvalidArgumentException::class, fn() =>
        makeCheckout($pdo)->procesarCompra(99, 'Ana', ['A-1' => 1], '5000.00'));
    T::same(false, $pdo->inTransaction());
});

T::test('producto inactivo o inexistente se rechaza', function () {
    $pdo = testPdo();
    foreach (['C-3', 'ZZZ'] as $sku) {
        T::throws(InvalidArgumentException::class, fn() =>
            makeCheckout($pdo)->procesarCompra(1, 'Ana', [$sku => 1], '5000.00'), $sku);
    }
});

T::test('valida entradas: carrito vacío, nombre vacío, efectivo mal formado', function () {
    $pdo = testPdo();
    $c = makeCheckout($pdo);
    T::throws(InvalidArgumentException::class, fn() => $c->procesarCompra(1, 'Ana', [], '1.00'));
    T::throws(InvalidArgumentException::class, fn() => $c->procesarCompra(1, '  ', ['A-1' => 1], '5000.00'));
    T::throws(InvalidArgumentException::class, fn() => $c->procesarCompra(1, 'Ana', ['A-1' => 1], '5000'));
});

T::test('rollback revierte venta y stock cuando falla tras insertar el encabezado', function () {
    $pdo = testPdo();
    // Falla al registrar el detalle: ya se escribieron encabezado y descuento de stock.
    $ventas = new class($pdo) extends VentaRepository {
        public function crearDetalle(array $datos): int
        {
            throw new RuntimeException('fallo simulado');
        }
    };
    $checkout = new CheckoutService($pdo, new ProductoRepository($pdo), $ventas,
        new JornadaRepository($pdo), new PricingService());

    T::throws(RuntimeException::class, fn() =>
        $checkout->procesarCompra(1, 'Ana', ['A-1' => 2], '10000.00'));
    T::same(0, (int) $pdo->query('SELECT COUNT(*) FROM ventas')->fetchColumn(), 'ventas');
    T::same(10, stockOf($pdo, 1), 'stock');
    T::same(false, $pdo->inTransaction());
});
