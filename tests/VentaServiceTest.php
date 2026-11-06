<?php
echo "Cancelación de ventas (servicio + API)\n";

function makeVentas(PDO $pdo, ?VentaRepository $ventas = null): VentaService
{
    return new VentaService($pdo, $ventas ?? new VentaRepository($pdo),
        new ProductoRepository($pdo), new JornadaRepository($pdo));
}

T::test('cancelar devuelve el stock y marca la venta como cancelada', function () {
    $pdo = testPdo();
    $r = makeCheckout($pdo)->procesarCompra(1, 'Ana', ['A-1' => 2, 'B-2' => 1], '10000.00');
    T::same(8, stockOf($pdo, 1));
    T::same(2, stockOf($pdo, 2));

    $v = makeVentas($pdo)->cancelar($r['venta_id']);
    T::same('cancelada', $v['estado']);
    T::same(2, count($v['detalles']));
    T::same(10, stockOf($pdo, 1));
    T::same(3, stockOf($pdo, 2));
});

T::test('una venta cancelada deja de contar en el resumen de la jornada', function () {
    $pdo = testPdo();
    $a = makeCheckout($pdo)->procesarCompra(1, 'Ana', ['A-1' => 2, 'B-2' => 1], '10000.00');
    makeCheckout($pdo)->procesarCompra(1, 'Luis', ['A-1' => 1], '5000.00');
    makeVentas($pdo)->cancelar($a['venta_id']);
    $j = makeJornadas($pdo)->actual();
    T::same(1, $j['ventas_completadas']);
    T::same('1000.00', $j['total_vendido']);
});

T::test('no se puede cancelar dos veces ni una venta inexistente', function () {
    $pdo = testPdo();
    $r = makeCheckout($pdo)->procesarCompra(1, 'Ana', ['A-1' => 1], '5000.00');
    $svc = makeVentas($pdo);
    $svc->cancelar($r['venta_id']);
    T::throws(RuntimeException::class, fn() => $svc->cancelar($r['venta_id']), 'doble');
    T::throws(InvalidArgumentException::class, fn() => $svc->cancelar(999), 'inexistente');
    T::same(10, stockOf($pdo, 1), 'el stock no se devuelve dos veces');
    T::same(false, $pdo->inTransaction());
});

T::test('no se cancela una venta de una jornada cerrada', function () {
    $pdo = testPdo();
    $r = makeCheckout($pdo)->procesarCompra(1, 'Ana', ['A-1' => 2], '5000.00');
    makeJornadas($pdo)->cerrar(1);
    T::throws(RuntimeException::class, fn() => makeVentas($pdo)->cancelar($r['venta_id']));
    T::same(8, stockOf($pdo, 1));
    $e = $pdo->query('SELECT estado FROM ventas')->fetchColumn();
    T::same('completada', $e);
});

T::test('rollback: si falla al marcar la venta, el stock devuelto se revierte', function () {
    $pdo = testPdo();
    $r = makeCheckout($pdo)->procesarCompra(1, 'Ana', ['A-1' => 2], '5000.00');
    $ventas = new class($pdo) extends VentaRepository {
        public function marcarCancelada(int $id): void
        {
            throw new RuntimeException('fallo simulado');
        }
    };
    T::throws(RuntimeException::class, fn() => makeVentas($pdo, $ventas)->cancelar($r['venta_id']));
    T::same(8, stockOf($pdo, 1), 'el stock debe seguir descontado');
    T::same('completada', $pdo->query('SELECT estado FROM ventas')->fetchColumn());
    T::same(false, $pdo->inTransaction());
});

T::test('API venta_cancelar: 200, 409 doble, 404, 422, 405', function () {
    $pdo = testPdo();
    [, , $c] = http('POST', '/api/checkout.php', checkoutBody());
    $id = $c['data']['venta_id'];
    [$s, , $j] = http('POST', '/api/venta_cancelar.php', json_encode(['venta_id' => $id]));
    T::same(200, $s);
    T::same('cancelada', $j['data']['estado']);
    T::same(10, stockOf($pdo, 1));
    [$s] = http('POST', '/api/venta_cancelar.php', json_encode(['venta_id' => $id]));
    T::same(409, $s, 'doble');
    [$s] = http('POST', '/api/venta_cancelar.php', '{"venta_id":999}');
    T::same(404, $s);
    [$s] = http('POST', '/api/venta_cancelar.php', '{"venta_id":"1"}');
    T::same(422, $s);
    [$s] = http('GET', '/api/venta_cancelar.php');
    T::same(405, $s);
});

T::test('API ventas por jornada: lista, vacía y parámetro inválido', function () {
    testPdo();
    http('POST', '/api/checkout.php', checkoutBody());
    http('POST', '/api/checkout.php', checkoutBody(['cliente_nombre' => 'Luis', 'carrito' => ['A-1' => 1]]));
    [$s, , $j] = http('GET', '/api/ventas.php?jornada_id=1');
    T::same(200, $s);
    T::same(2, count($j['data']));
    T::same('Ana', $j['data'][0]['cliente_nombre']);
    [$s, , $j] = http('GET', '/api/ventas.php?jornada_id=2');
    T::same([], $j['data']);
    [$s] = http('GET', '/api/ventas.php?jornada_id=abc');
    T::same(400, $s);
});
