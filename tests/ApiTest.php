<?php
echo "API HTTP (servidor embebido de PHP + MySQL)\n";

/**
 * Levanta `php -S` apuntando a la BD de pruebas (DB_NAME sobrescribe el .env)
 * y comprueba códigos HTTP, cabeceras y cuerpos JSON reales.
 */
final class TestServer
{
    private static $proc = null;
    public static string $base = '';

    public static function start(): void
    {
        if (self::$proc !== null) {
            return;
        }
        $probe = stream_socket_server('tcp://127.0.0.1:0');
        $port = (int) substr(strrchr(stream_socket_get_name($probe, false), ':'), 1);
        fclose($probe);

        $env = array_merge(getenv(), [
            'DB_NAME' => Env::get('DB_NAME_TEST', 'supermarket_simulator_test'),
            'ADMIN_TOKEN' => 'token-de-prueba',
        ]);
        self::$proc = proc_open(
            [PHP_BINARY, '-S', "127.0.0.1:$port", '-t', dirname(__DIR__) . '/public'],
            [0 => ['file', '/dev/null', 'r'], 1 => ['file', '/dev/null', 'w'], 2 => ['file', '/dev/null', 'w']],
            $pipes, null, $env
        );
        register_shutdown_function(fn() => proc_terminate(self::$proc));

        for ($i = 0; $i < 50; $i++) {
            if ($c = @fsockopen('127.0.0.1', $port)) {
                fclose($c);
                self::$base = "http://127.0.0.1:$port";
                return;
            }
            usleep(100000);
        }
        throw new Exception('el servidor de pruebas no arrancó');
    }
}

/** @return array{0:int,1:string,2:mixed} [status, content-type, json decodificado] */
function http(string $method, string $path, ?string $body = null, ?string $jugador = JUG, array $extra = []): array
{
    TestServer::start();
    $cabeceras = "Content-Type: application/json\r\n" . ($jugador === null ? '' : "X-Jugador: $jugador\r\n");
    foreach ($extra as $k => $v) {
        $cabeceras .= "$k: $v\r\n";
    }
    $ctx = stream_context_create(['http' => [
        'method' => $method,
        'header' => $cabeceras,
        'content' => $body ?? '',
        'ignore_errors' => true,
    ]]);
    $raw = file_get_contents(TestServer::$base . $path, false, $ctx);
    $status = (int) substr($http_response_header[0], 9, 3);
    $type = '';
    foreach ($http_response_header as $h) {
        if (stripos($h, 'Content-Type:') === 0) {
            $type = trim(substr($h, 13));
        }
    }
    return [$status, $type, json_decode((string) $raw, true)];
}

function checkoutBody(array $over = []): string
{
    return json_encode($over + [
        'jornada_id' => 1,
        'cliente_nombre' => 'Ana',
        'carrito' => ['A-1' => 2, 'B-2' => 1],
        'efectivo_recibido' => '10000.00',
    ]);
}

T::test('método incorrecto: 405 con JSON', function () {
    testPdo();
    [$s, $type, $j] = http('POST', '/api/productos.php', '{}');
    T::same(405, $s);
    T::same('application/json; charset=utf-8', $type);
    T::same(false, $j['success']);
    [$s] = http('GET', '/api/checkout.php');
    T::same(405, $s);
});

T::test('GET productos: 200, solo activos y tipos correctos', function () {
    testPdo();
    [$s, $type, $j] = http('GET', '/api/productos.php');
    T::same(200, $s);
    T::same('application/json; charset=utf-8', $type);
    T::same(true, $j['success']);
    T::same(3, count($j['data']), 'el inactivo no debe aparecer');
    T::same(1, $j['data'][0]['id']);
    T::same(10, $j['data'][0]['stock']);
    T::same('1000.00', $j['data'][0]['precio_base']);
});

T::test('checkout: cuerpo vacío, JSON inválido, [] y escalar dan 400', function () {
    testPdo();
    foreach (['', '{bad', '[]', '[1,2]', '"x"', '5'] as $body) {
        [$s, , $j] = http('POST', '/api/checkout.php', $body);
        T::same(400, $s, "cuerpo: $body");
        T::same(false, $j['success']);
    }
});

T::test('checkout: {} y tipos incorrectos dan 422', function () {
    testPdo();
    foreach (['{}', checkoutBody(['jornada_id' => '1']), checkoutBody(['carrito' => 'x']),
              checkoutBody(['efectivo_recibido' => 10000])] as $body) {
        [$s] = http('POST', '/api/checkout.php', $body);
        T::same(422, $s, $body);
    }
});

T::test('checkout válido: 201, comprobante calculado en servidor y venta persistida', function () {
    $pdo = testPdo();
    // El cliente intenta colar un precio: debe ignorarse.
    $body = checkoutBody(['precio_total' => '1.00']);
    [$s, , $j] = http('POST', '/api/checkout.php', $body);
    T::same(201, $s);
    T::same('6900.00', $j['data']['subtotal']);
    T::same('7145.00', $j['data']['total']);
    T::same('2855.00', $j['data']['cambio']);
    T::same(8, stockOf($pdo, 1));
    T::same(1, (int) $pdo->query('SELECT COUNT(*) FROM ventas')->fetchColumn());
});

T::test('checkout: efectivo insuficiente 422, sin stock 409, jornada cerrada 409', function () {
    $pdo = testPdo();
    [$s] = http('POST', '/api/checkout.php', checkoutBody(['efectivo_recibido' => '10.00']));
    T::same(422, $s);
    [$s] = http('POST', '/api/checkout.php', checkoutBody(['carrito' => ['A-1' => 11], 'efectivo_recibido' => '99999.00']));
    T::same(409, $s);
    [$s] = http('POST', '/api/checkout.php', checkoutBody(['jornada_id' => 2]));
    T::same(409, $s);
    T::same(10, stockOf($pdo, 1));
    T::same(0, (int) $pdo->query('SELECT COUNT(*) FROM ventas')->fetchColumn());
});

T::test('GET ventas: 200 con detalles, 404 inexistente, 400 id inválido', function () {
    testPdo();
    [, , $c] = http('POST', '/api/checkout.php', checkoutBody());
    [$s, , $j] = http('GET', '/api/ventas.php?id=' . $c['data']['venta_id']);
    T::same(200, $s);
    T::same($c['data']['numero_venta'], $j['data']['numero_venta']);
    T::same(2, count($j['data']['detalles']));
    [$s] = http('GET', '/api/ventas.php?id=9999');
    T::same(404, $s);
    foreach (['', '?id=abc', '?id=0', '?id=-1'] as $q) {
        [$s] = http('GET', "/api/ventas.php$q");
        T::same(400, $s, $q);
    }
});
