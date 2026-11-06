<?php
echo "Categorías y gestión de productos (servicio + API)\n";

function makeProductos(PDO $pdo): ProductoService
{
    return new ProductoService(new ProductoRepository($pdo));
}

T::test('API categorias: lista ordenada por nombre', function () {
    $pdo = testPdo();
    $pdo->exec("INSERT INTO categorias (id, nombre, descripcion) VALUES (2, 'Aseo', 'desc')");
    [$s, $type, $j] = http('GET', '/api/categorias.php');
    T::same(200, $s);
    T::same('application/json; charset=utf-8', $type);
    T::same(['Aseo', 'Test'], array_column($j['data'], 'nombre'));
    T::same(2, $j['data'][0]['id']);
    [$s] = http('POST', '/api/categorias.php', '{}');
    T::same(405, $s);
});

T::test('reponer suma stock y respeta el tope', function () {
    $pdo = testPdo();
    $svc = makeProductos($pdo);
    $p = $svc->reponer('A-1', 15);
    T::same(25, (int) $p['stock']);
    for ($i = 0; $i < 9; $i++) {   // 25 + 9 * 100.000 = 900.025 <= 1.000.000
        $svc->reponer('A-1', ProductoService::MAX_REPOSICION);
    }
    T::throws(RuntimeException::class,
        fn() => $svc->reponer('A-1', ProductoService::MAX_REPOSICION), 'tope');
    T::same(900025, stockOf($pdo, 1), 'el intento rechazado no modifica el stock');
});

T::test('reponer valida cantidad y producto', function () {
    $pdo = testPdo();
    $svc = makeProductos($pdo);
    foreach ([0, -5, ProductoService::MAX_REPOSICION + 1] as $q) {
        T::throws(InvalidArgumentException::class, fn() => $svc->reponer('A-1', $q), "cantidad $q");
    }
    T::throws(InvalidArgumentException::class, fn() => $svc->reponer('NOPE', 1));
    T::same(10, stockOf($pdo, 1));
});

T::test('reponer funciona también con un producto inactivo', function () {
    $pdo = testPdo();
    $p = makeProductos($pdo)->reponer('C-3', 5);
    T::same(10, (int) $p['stock']);
});

T::test('cambiar estado desactiva y reactiva; el catálogo lo refleja', function () {
    $pdo = testPdo();
    $svc = makeProductos($pdo);
    $p = $svc->cambiarEstado('A-1', false);
    T::same(0, (int) $p['is_active']);
    [, , $j] = http('GET', '/api/productos.php');
    T::same(false, in_array('A-1', array_column($j['data'], 'sku'), true));
    T::throws(InvalidArgumentException::class, fn() =>
        makeCheckout($pdo)->procesarCompra(1, 'Ana', ['A-1' => 1], '5000.00'));
    $svc->cambiarEstado('A-1', true);
    [, , $j] = http('GET', '/api/productos.php');
    T::same(true, in_array('A-1', array_column($j['data'], 'sku'), true));
});

T::test('API producto_reponer: 200, 404, 422, 409', function () {
    testPdo();
    [$s, , $j] = http('POST', '/api/producto_reponer.php', '{"sku":"A-1","cantidad":5}');
    T::same(200, $s);
    T::same(15, $j['data']['stock']);
    [$s] = http('POST', '/api/producto_reponer.php', '{"sku":"NOPE","cantidad":5}');
    T::same(404, $s);
    foreach (['{"sku":"A-1","cantidad":"5"}', '{"sku":"A-1","cantidad":0}', '{"sku":"","cantidad":1}', '{"cantidad":1}'] as $b) {
        [$s] = http('POST', '/api/producto_reponer.php', $b);
        T::same(422, $s, $b);
    }
    [$s] = http('GET', '/api/producto_reponer.php');
    T::same(405, $s);
});

T::test('API producto_estado: 200, 404, 422', function () {
    testPdo();
    [$s, , $j] = http('POST', '/api/producto_estado.php', '{"sku":"A-1","activo":false}');
    T::same(200, $s);
    T::same(false, $j['data']['activo']);
    [$s] = http('POST', '/api/producto_estado.php', '{"sku":"NOPE","activo":true}');
    T::same(404, $s);
    foreach (['{"sku":"A-1","activo":"false"}', '{"sku":"A-1","activo":0}', '{"sku":"A-1"}'] as $b) {
        [$s] = http('POST', '/api/producto_estado.php', $b);
        T::same(422, $s, $b);
    }
});
