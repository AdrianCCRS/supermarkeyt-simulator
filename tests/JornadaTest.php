<?php
echo "Jornadas (servicio + API)\n";

function makeJornadas(PDO $pdo): JornadaService
{
    return new JornadaService($pdo, new JornadaRepository($pdo));
}

T::test('actual devuelve la jornada abierta con su resumen', function () {
    $pdo = testPdo();
    $j = makeJornadas($pdo)->actual();
    T::same(1, (int) $j['id']);
    T::same('abierta', $j['estado']);
    T::same(0, $j['ventas_completadas']);
    T::same('0.00', $j['total_vendido']);
});

T::test('el resumen cuenta las ventas completadas de la jornada', function () {
    $pdo = testPdo();
    makeCheckout($pdo)->procesarCompra(1, 'Ana', ['A-1' => 2, 'B-2' => 1], '10000.00');
    makeCheckout($pdo)->procesarCompra(1, 'Luis', ['A-1' => 1], '5000.00');
    $j = makeJornadas($pdo)->actual();
    T::same(2, $j['ventas_completadas']);
    T::same('8145.00', $j['total_vendido']);
});

T::test('no se puede abrir otra jornada mientras hay una abierta', function () {
    $pdo = testPdo();
    T::throws(RuntimeException::class, fn() => makeJornadas($pdo)->abrir());
});

T::test('la BD impide dos jornadas abiertas aunque se salte el servicio', function () {
    $pdo = testPdo();
    T::throws(PDOException::class, fn() => $pdo->exec("INSERT INTO jornadas (estado) VALUES ('abierta')"));
});

T::test('cerrar y volver a abrir', function () {
    $pdo = testPdo();
    $svc = makeJornadas($pdo);
    $cerrada = $svc->cerrar(1);
    T::same('cerrada', $cerrada['estado']);
    T::same(true, $cerrada['fecha_fin'] !== null);
    T::same(null, $svc->actual());
    $nueva = $svc->abrir();
    T::same('abierta', $nueva['estado']);
    T::same(true, (int) $nueva['id'] > 2);
});

T::test('cerrar dos veces o una inexistente falla', function () {
    $pdo = testPdo();
    $svc = makeJornadas($pdo);
    T::throws(RuntimeException::class, fn() => $svc->cerrar(2), 'ya cerrada');
    T::throws(InvalidArgumentException::class, fn() => $svc->cerrar(99), 'inexistente');
    T::same(false, $pdo->inTransaction());
});

T::test('tras cerrar, el checkout rechaza cobros en esa jornada', function () {
    $pdo = testPdo();
    makeJornadas($pdo)->cerrar(1);
    T::throws(RuntimeException::class, fn() =>
        makeCheckout($pdo)->procesarCompra(1, 'Ana', ['A-1' => 1], '5000.00'));
    T::same(10, stockOf($pdo, 1));
});

T::test('API: actual 200 y 404 sin jornada abierta', function () {
    $pdo = testPdo();
    [$s, , $j] = http('GET', '/api/jornada_actual.php');
    T::same(200, $s);
    T::same(1, (int) $j['data']['id']);
    $pdo->exec("UPDATE jornadas SET estado = 'cerrada'");
    [$s] = http('GET', '/api/jornada_actual.php');
    T::same(404, $s);
});

T::test('API: abrir da 409 si hay una abierta y 201 si no', function () {
    $pdo = testPdo();
    [$s] = http('POST', '/api/jornada_abrir.php');
    T::same(409, $s);
    $pdo->exec("UPDATE jornadas SET estado = 'cerrada'");
    [$s, , $j] = http('POST', '/api/jornada_abrir.php');
    T::same(201, $s);
    T::same('abierta', $j['data']['estado']);
    [$s] = http('GET', '/api/jornada_abrir.php');
    T::same(405, $s);
});

T::test('API: cerrar devuelve resumen; 409, 404, 422 y 400 en los errores', function () {
    testPdo();
    http('POST', '/api/checkout.php', checkoutBody());
    [$s, , $j] = http('POST', '/api/jornada_cerrar.php', '{"jornada_id":1}');
    T::same(200, $s);
    T::same('cerrada', $j['data']['estado']);
    T::same(1, $j['data']['ventas_completadas']);
    T::same('7145.00', $j['data']['total_vendido']);
    [$s] = http('POST', '/api/jornada_cerrar.php', '{"jornada_id":1}');
    T::same(409, $s, 'ya cerrada');
    [$s] = http('POST', '/api/jornada_cerrar.php', '{"jornada_id":99}');
    T::same(404, $s, 'inexistente');
    [$s] = http('POST', '/api/jornada_cerrar.php', '{"jornada_id":"1"}');
    T::same(422, $s, 'tipo');
    [$s] = http('POST', '/api/jornada_cerrar.php', '[]');
    T::same(400, $s, 'cuerpo');
});

// ---- Cierre con faltantes y sobrantes (ajuste de stock) ----
function stockDe(PDO $pdo, string $sku): int
{
    return (int) $pdo->query("SELECT stock FROM productos WHERE sku = '$sku'")->fetchColumn();
}

T::test('cerrar descuenta los faltantes y repone los sobrantes del stock', function () {
    $pdo = testPdo();
    makeJornadas($pdo)->cerrar(1, ['A-1' => 2], ['B-2' => 1]);
    T::same(8, stockDe($pdo, 'A-1'), 'faltante descontado');
    T::same(4, stockDe($pdo, 'B-2'), 'sobrante repuesto');
});

T::test('los faltantes nunca dejan el stock por debajo de 0', function () {
    $pdo = testPdo();
    $j = makeJornadas($pdo)->cerrar(1, ['B-2' => 99]);
    T::same('cerrada', $j['estado']);
    T::same(0, stockDe($pdo, 'B-2'));
});

T::test('un SKU desconocido o una cantidad inválida cancelan TODO el cierre', function () {
    $pdo = testPdo();
    $svc = makeJornadas($pdo);
    T::throws(InvalidArgumentException::class, fn() => $svc->cerrar(1, ['A-1' => 2, 'NO-EXISTE' => 1]), 'sku');
    T::throws(InvalidArgumentException::class, fn() => $svc->cerrar(1, ['A-1' => 0]), 'cero');
    T::throws(InvalidArgumentException::class, fn() => $svc->cerrar(1, [], ['A-1' => '2']), 'texto');
    T::same(10, stockDe($pdo, 'A-1'), 'el stock no cambió');
    T::same('abierta', $svc->actual()['estado'], 'la jornada sigue abierta');
});

T::test('API: cerrar con faltantes/sobrantes ajusta el stock; datos mal formados dan 422', function () {
    $pdo = testPdo();
    [$s] = http('POST', '/api/jornada_cerrar.php', '{"jornada_id":1,"faltantes":"x"}');
    T::same(422, $s, 'faltantes no es objeto');
    [$s] = http('POST', '/api/jornada_cerrar.php', '{"jornada_id":1,"faltantes":{"A-1":0}}');
    T::same(422, $s, 'cantidad cero');
    [$s] = http('POST', '/api/jornada_cerrar.php', '{"jornada_id":1,"sobrantes":{"A-1":"2"}}');
    T::same(422, $s, 'cantidad texto');
    [$s] = http('POST', '/api/jornada_cerrar.php', '{"jornada_id":1,"faltantes":{"ZZZ":1}}');
    T::same(422, $s, 'sku desconocido');
    T::same(10, stockDe($pdo, 'A-1'), 'nada cambió con los errores');
    [$s] = http('POST', '/api/jornada_cerrar.php', '{"jornada_id":1,"faltantes":{"A-1":3},"sobrantes":{"B-2":2}}');
    T::same(200, $s, 'cierre correcto');
    T::same(7, stockDe($pdo, 'A-1'));
    T::same(5, stockDe($pdo, 'B-2'));
});

// ---- Pérdidas, sobrecobros y tope de stock en el cierre ----
T::test('cerrar guarda la pérdida y el sobrecobro en la jornada', function () {
    $pdo = testPdo();
    $j = makeJornadas($pdo)->cerrar(1, [], [], '7100.00', '1250.50');
    T::same('7100.00', $j['perdida_total']);
    T::same('1250.50', $j['sobrecobro_total']);
    $fila = $pdo->query("SELECT perdida_total, sobrecobro_total FROM jornadas WHERE id = 1")->fetch(PDO::FETCH_ASSOC);
    T::same('7100.00', $fila['perdida_total'], 'guardada en la BD');
    T::same('1250.50', $fila['sobrecobro_total']);
});

T::test('sin importes, la jornada se cierra con 0.00', function () {
    $pdo = testPdo();
    $j = makeJornadas($pdo)->cerrar(1);
    T::same('0.00', $j['perdida_total']);
    T::same('0.00', $j['sobrecobro_total']);
});

T::test('los sobrantes no pasan del tope de stock (se recorta, el cierre no falla)', function () {
    $pdo = testPdo();
    $pdo->exec("UPDATE productos SET stock = " . (ProductoService::MAX_STOCK - 1) . " WHERE sku = 'A-1'");
    $j = makeJornadas($pdo)->cerrar(1, [], ['A-1' => 50]);
    T::same('cerrada', $j['estado']);
    T::same(ProductoService::MAX_STOCK, stockDe($pdo, 'A-1'), 'recortado al máximo');
});

T::test('API: importes del cierre se validan (422) y se guardan', function () {
    $pdo = testPdo();
    foreach (['"perdida":7100', '"perdida":"abc"', '"sobrecobro":"-5.00"', '"perdida":"1.234"'] as $malo) {
        [$s] = http('POST', '/api/jornada_cerrar.php', '{"jornada_id":1,' . $malo . '}');
        T::same(422, $s, $malo);
    }
    T::same('abierta', $pdo->query("SELECT estado FROM jornadas WHERE id = 1")->fetchColumn(), 'sigue abierta tras los errores');
    [$s, , $j] = http('POST', '/api/jornada_cerrar.php', '{"jornada_id":1,"perdida":"5000","sobrecobro":"120.5"}');
    T::same(200, $s);
    T::same('5000.00', $j['data']['perdida_total']);
    T::same('120.50', $j['data']['sobrecobro_total']);
});
