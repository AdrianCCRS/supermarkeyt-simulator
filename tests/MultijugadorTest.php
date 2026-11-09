<?php
echo "Varios jugadores a la vez (jornada y stock propios)\n";

/** El jugador 2 existe en las pruebas con su propia jornada abierta (id 3). */
function conJugador2(PDO $pdo): void
{
    $pdo->exec("INSERT INTO jornadas (id, estado, jugador) VALUES (3, 'abierta', '" . JUG2 . "')");
}

function stockDeJugador(PDO $pdo, string $jugador, string $sku): int
{
    return (int) $pdo->query("SELECT COALESCE((SELECT sj.stock FROM stock_jugador sj JOIN productos p ON p.id = sj.producto_id
        WHERE sj.jugador = '$jugador' AND p.sku = '$sku'), (SELECT stock FROM productos WHERE sku = '$sku'))")->fetchColumn();
}

T::test('cada jugador puede tener su propia jornada abierta a la vez', function () {
    $pdo = testPdo();
    $svc = makeJornadas($pdo);
    $j2 = $svc->abrir(JUG2);
    T::same('abierta', $j2['estado']);
    T::same(JUG2, $j2['jugador']);
    T::same(1, (int) $svc->actual(JUG)['id'], 'la del jugador 1 sigue siendo la suya');
    T::same((int) $j2['id'], (int) $svc->actual(JUG2)['id']);
    T::throws(RuntimeException::class, fn() => $svc->abrir(JUG2), 'el mismo jugador no puede abrir dos');
});

T::test('un jugador sin jornada no ve la de otro', function () {
    $pdo = testPdo();
    T::same(null, makeJornadas($pdo)->actual(JUG2));
});

T::test('el stock es propio: lo que vende uno no le quita al otro', function () {
    $pdo = testPdo();
    conJugador2($pdo);
    makeCheckout($pdo)->procesarCompra(1, 'Ana', ['A-1' => 4], '10000.00');                 // jugador 1
    T::same(6, stockDeJugador($pdo, JUG, 'A-1'));
    T::same(10, stockDeJugador($pdo, JUG2, 'A-1'), 'el jugador 2 sigue con el stock base');
    $checkout2 = new CheckoutService($pdo, new ProductoRepository($pdo, JUG2), new VentaRepository($pdo), new JornadaRepository($pdo), new PricingService());
    $checkout2->procesarCompra(3, 'Luis', ['A-1' => 10], '99999.00');                       // puede comprar las 10 aunque el 1 gastó 4
    T::same(0, stockDeJugador($pdo, JUG2, 'A-1'));
    T::same(6, stockDeJugador($pdo, JUG, 'A-1'));
});

T::test('el cierre de un jugador solo ajusta SU stock', function () {
    $pdo = testPdo();
    conJugador2($pdo);
    makeJornadas($pdo)->cerrar(1, ['A-1' => 3], ['B-2' => 2]);
    T::same(7, stockDeJugador($pdo, JUG, 'A-1'));
    T::same(5, stockDeJugador($pdo, JUG, 'B-2'));
    T::same(10, stockDeJugador($pdo, JUG2, 'A-1'), 'el otro no cambió');
    T::same(3, stockDeJugador($pdo, JUG2, 'B-2'));
    T::same('abierta', makeJornadas($pdo)->actual(JUG2)['estado'], 'su jornada sigue abierta');
});

T::test('cancelar una venta devuelve el stock al jugador, no a los demás', function () {
    $pdo = testPdo();
    conJugador2($pdo);
    $v = makeCheckout($pdo)->procesarCompra(1, 'Ana', ['A-1' => 2], '10000.00');
    $ventas = new VentaService($pdo, new VentaRepository($pdo), new ProductoRepository($pdo, JUG), new JornadaRepository($pdo));
    $ventas->cancelar((int) $v['venta_id']);
    T::same(10, stockDeJugador($pdo, JUG, 'A-1'));
    T::same(10, stockDeJugador($pdo, JUG2, 'A-1'));
});

T::test('un producto nuevo aparece también para quien ya tenía su stock', function () {
    $pdo = testPdo();
    (new ProductoRepository($pdo, JUG))->getAll();                                   // crea sus filas
    $pdo->exec("INSERT INTO productos (id, sku, nombre, categoria_id, precio_base, iva_pct, stock, imagen_url, is_active) VALUES (9, 'N-9', 'Nuevo', 1, 100.00, 0.00, 7, 'x', 1)");
    $skus = array_column((new ProductoRepository($pdo, JUG))->getAll(), 'sku');
    T::same(true, in_array('N-9', $skus, true));
    T::same(7, stockDeJugador($pdo, JUG, 'N-9'));
});

T::test('API: sin X-Jugador (o inválido) 400; con él, cada jugador ve lo suyo', function () {
    $pdo = testPdo();
    conJugador2($pdo);
    [$s] = http('GET', '/api/jornada_actual.php', null, null);
    T::same(400, $s, 'sin cabecera');
    [$s] = http('GET', '/api/jornada_actual.php', null, 'no-es-un-uuid');
    T::same(400, $s, 'cabecera inválida');
    [$s, , $j] = http('GET', '/api/jornada_actual.php', null, JUG2);
    T::same(200, $s);
    T::same(3, $j['data']['id']);
    [, , $j] = http('GET', '/api/jornada_actual.php', null, JUG);
    T::same(1, $j['data']['id']);
    [$s] = http('GET', '/api/jornada_actual.php', null, '33333333-3333-4333-8333-333333333333');
    T::same(404, $s, 'un jugador nuevo no tiene jornada');
});

T::test('API: no se puede cobrar, cerrar ni ver la jornada de otro jugador (404)', function () {
    $pdo = testPdo();
    conJugador2($pdo);
    [$s] = http('POST', '/api/checkout.php', checkoutBody(['jornada_id' => 3]));                    // el jugador 1 intenta usar la 3
    T::same(404, $s, 'checkout');
    [$s] = http('POST', '/api/jornada_cerrar.php', '{"jornada_id":3}');
    T::same(404, $s, 'cerrar');
    [$s] = http('GET', '/api/ventas.php?jornada_id=3');
    T::same(404, $s, 'ventas de la jornada');
    T::same('abierta', $pdo->query('SELECT estado FROM jornadas WHERE id = 3')->fetchColumn(), 'sigue abierta');
    T::same(0, (int) $pdo->query('SELECT COUNT(*) FROM ventas')->fetchColumn());
});

T::test('API: las ventas y cancelaciones de otro jugador no se ven ni se tocan', function () {
    $pdo = testPdo();
    conJugador2($pdo);
    [, , $c] = http('POST', '/api/checkout.php', checkoutBody());
    $id = $c['data']['venta_id'];
    [$s] = http('GET', "/api/ventas.php?id=$id", null, JUG2);
    T::same(404, $s, 'ver venta ajena');
    [$s] = http('POST', '/api/venta_cancelar.php', json_encode(['venta_id' => $id]), JUG2);
    T::same(404, $s, 'cancelar venta ajena');
    [$s] = http('GET', "/api/ventas.php?id=$id");
    T::same(200, $s, 'el dueño sí la ve');
});

T::test('API: productos con X-Jugador muestra SU stock', function () {
    $pdo = testPdo();
    conJugador2($pdo);
    http('POST', '/api/checkout.php', checkoutBody());                               // jugador 1 vende 2 de A-1
    [, , $a] = http('GET', '/api/productos.php', null, JUG);
    [, , $b] = http('GET', '/api/productos.php', null, JUG2);
    T::same(8, $a['data'][0]['stock']);
    T::same(10, $b['data'][0]['stock']);
});

T::test('API: reponer y activar/desactivar exigen el token de administración', function () {
    testPdo();
    [$s] = http('POST', '/api/producto_reponer.php', '{"sku":"A-1","cantidad":5}');
    T::same(403, $s, 'sin token');
    [$s] = http('POST', '/api/producto_reponer.php', '{"sku":"A-1","cantidad":5}', JUG, ['X-Admin-Token' => 'otro']);
    T::same(403, $s, 'token incorrecto');
    [$s] = http('POST', '/api/producto_estado.php', '{"sku":"A-1","activo":false}');
    T::same(403, $s, 'estado sin token');
    [$s] = http('POST', '/api/producto_reponer.php', '{"sku":"A-1","cantidad":5}', JUG, ADM);
    T::same(200, $s, 'con token');
});

T::test('consultar el catálogo con un identificador cualquiera no escribe nada en la base', function () {
    $pdo = testPdo();
    [$s, , $j] = http('GET', '/api/productos.php', null, '99999999-9999-4999-8999-999999999999');
    T::same(200, $s);
    T::same(10, $j['data'][0]['stock'], 've el stock base');
    T::same(0, (int) $pdo->query('SELECT COUNT(*) FROM stock_jugador')->fetchColumn(), 'sin filas nuevas');
    http('GET', '/api/jornada_actual.php', null, '99999999-9999-4999-8999-999999999999');
    T::same(0, (int) $pdo->query('SELECT COUNT(*) FROM jornadas WHERE jugador = \'99999999-9999-4999-8999-999999999999\'')->fetchColumn());
});

T::test('las respuestas de la API no se guardan en caché y no filtran el motivo de un error interno', function () {
    testPdo();
    TestServer::start();
    $ctx = stream_context_create(['http' => ['method' => 'GET', 'header' => "X-Jugador: " . JUG . "\r\n", 'ignore_errors' => true]]);
    file_get_contents(TestServer::$base . '/api/productos.php', false, $ctx);
    $h = implode("\n", $http_response_header);
    T::same(true, stripos($h, 'Cache-Control: no-store') !== false, 'Cache-Control');
    T::same(true, stripos($h, 'X-Content-Type-Options: nosniff') !== false, 'nosniff');
    // los errores 500 no cuentan qué falló
    [$s, , $j] = http('GET', '/api/ventas.php?id=1', null, JUG);
    T::same(false, isset($j['trace']) || (isset($j['error']) && str_contains((string) $j['error'], 'SQLSTATE')));
});
