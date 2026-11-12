<?php
echo "Ranking (puntos al cerrar, apodo, top 5, migración)\n";

const UUID_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const UUID_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const UUID_C = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

/** Cobra $n ventas completadas en la jornada $jornada, directamente en la base (sin pasar por el checkout). */
function ventasEnJornada(PDO $pdo, int $jornada, int $n): void
{
    $insert = $pdo->prepare("INSERT INTO ventas (cliente_nombre, subtotal, iva_total, total, efectivo_recibido, cambio, jornada_id)
        VALUES ('Ana', 1000, 0, 1000, 1000, 0, ?)");
    for ($i = 0; $i < $n; $i++) {
        $insert->execute([$jornada]);
    }
}

function totalPuntos(PDO $pdo, string $jugador): ?int
{
    $v = $pdo->query("SELECT puntos_total FROM jugadores WHERE id = '$jugador'")->fetchColumn();
    return $v === false ? null : (int) $v;
}

function puntosDeJornada(PDO $pdo, int $id): int
{
    return (int) $pdo->query("SELECT puntos FROM jornadas WHERE id = $id")->fetchColumn();
}

/** Crea un jugador del ranking directamente en la base. */
function jugadorRanking(PDO $pdo, string $id, ?string $apodo, int $puntos, string $actualizado = '2026-01-01 00:00:00'): void
{
    $pdo->prepare("INSERT INTO jugadores (id, apodo, puntos_total, actualizado) VALUES (?, ?, ?, ?)")
        ->execute([$id, $apodo, $puntos, $actualizado]);
}

function idsFalsos(int $n): array
{
    return array_map(fn($i) => sprintf('%08x-0000-4000-8000-000000000000', $i + 100), range(1, $n));
}

/** GET con cabeceras de respuesta: [status, cuerpo crudo, cabeceras en minúsculas]. */
function getConCabeceras(string $path, ?string $jugador): array
{
    TestServer::start();
    $ctx = stream_context_create(['http' => [
        'method' => 'GET', 'ignore_errors' => true,
        'header' => $jugador === null ? '' : "X-Jugador: $jugador\r\n",
    ]]);
    $raw = file_get_contents(TestServer::$base . $path, false, $ctx);
    $cab = [];
    foreach (array_slice($http_response_header, 1) as $h) {
        [$k, $v] = explode(':', $h, 2) + [1 => ''];
        $cab[strtolower($k)] = trim($v);
    }
    return [(int) substr($http_response_header[0], 9, 3), (string) $raw, $cab];
}

// ---------------------------------------------------------------- 4.1 puntos al cerrar

T::test('cierre con puntos válidos: se guardan en la jornada y suman al total del jugador', function () {
    $pdo = testPdo();
    ventasEnJornada($pdo, 1, 3);
    $cerrada = makeJornadas($pdo)->cerrar(1, [], [], '0.00', '0.00', 250);
    T::same(250, (int) $cerrada['puntos']);
    T::same(250, puntosDeJornada($pdo, 1));
    T::same(250, totalPuntos($pdo, JUG));
});

T::test('puntos de más se recortan a 100 por venta completada', function () {
    $pdo = testPdo();
    ventasEnJornada($pdo, 1, 2);
    $cerrada = makeJornadas($pdo)->cerrar(1, [], [], '0.00', '0.00', 999999);
    T::same(200, (int) $cerrada['puntos']);
    T::same(200, totalPuntos($pdo, JUG));
});

T::test('las ventas canceladas no cuentan para el máximo', function () {
    $pdo = testPdo();
    ventasEnJornada($pdo, 1, 2);
    $pdo->exec("UPDATE ventas SET estado = 'cancelada' LIMIT 1");
    T::same(100, (int) makeJornadas($pdo)->cerrar(1, [], [], '0.00', '0.00', 500)['puntos']);
});

T::test('puntos negativos quedan en 0 y el cierre no falla', function () {
    $pdo = testPdo();
    ventasEnJornada($pdo, 1, 2);
    $cerrada = makeJornadas($pdo)->cerrar(1, [], [], '0.00', '0.00', -300);
    T::same('cerrada', $cerrada['estado']);
    T::same(0, (int) $cerrada['puntos']);
    T::same(0, totalPuntos($pdo, JUG), 'la fila existe aunque no sume');
});

T::test('puntos ausentes valen 0', function () {
    $pdo = testPdo();
    ventasEnJornada($pdo, 1, 2);
    T::same(0, (int) makeJornadas($pdo)->cerrar(1)['puntos']);
});

T::test('una jornada sin ventas no da puntos, por muchos que se manden', function () {
    $pdo = testPdo();
    T::same(0, (int) makeJornadas($pdo)->cerrar(1, [], [], '0.00', '0.00', 500)['puntos']);
    T::same(0, totalPuntos($pdo, JUG));
});

T::test('el tope absoluto por jornada se aplica aunque haya muchas ventas', function () {
    $pdo = testPdo();
    ventasEnJornada($pdo, 1, 150);
    T::same(JornadaService::PUNTOS_MAX_JORNADA, (int) makeJornadas($pdo)->cerrar(1, [], [], '0.00', '0.00', 99999999)['puntos']);
});

T::test('un doble cierre no suma dos veces', function () {
    $pdo = testPdo();
    ventasEnJornada($pdo, 1, 2);
    $svc = makeJornadas($pdo);
    $svc->cerrar(1, [], [], '0.00', '0.00', 200);
    T::throws(RuntimeException::class, fn() => $svc->cerrar(1, [], [], '0.00', '0.00', 200), 'segundo cierre');
    T::same(200, totalPuntos($pdo, JUG));
    T::same(200, puntosDeJornada($pdo, 1));
});

T::test('las jornadas del mismo jugador se acumulan y no tocan a los demás', function () {
    $pdo = testPdo();
    conJugador2($pdo);
    $svc = makeJornadas($pdo);
    ventasEnJornada($pdo, 1, 1);
    $svc->cerrar(1, [], [], '0.00', '0.00', 100);
    $nueva = $svc->abrir(JUG);
    ventasEnJornada($pdo, (int) $nueva['id'], 1);
    $svc->cerrar((int) $nueva['id'], [], [], '0.00', '0.00', 70);
    T::same(170, totalPuntos($pdo, JUG));
    T::same(null, totalPuntos($pdo, JUG2), 'el otro jugador no tiene fila hasta que cierre una jornada');
});

T::test('API cierre: puntos válidos, de más, de tipo inválido y ausentes (nunca rechaza)', function () {
    $pdo = testPdo();
    ventasEnJornada($pdo, 1, 2);
    [$s, , $r] = http('POST', '/api/jornada_cerrar.php', json_encode(['jornada_id' => 1, 'puntos' => 9999]));
    T::same(200, $s);
    T::same(200, $r['data']['puntos'], 'recortado y devuelto');
    T::same(200, totalPuntos($pdo, JUG));

    foreach (['"500"' => 'texto', '12.5' => 'decimal', 'null' => 'null', '[1]' => 'lista'] as $json => $tipo) {
        $pdo = testPdo();
        ventasEnJornada($pdo, 1, 2);
        [$s, , $r] = http('POST', '/api/jornada_cerrar.php', '{"jornada_id":1,"puntos":' . $json . '}');
        T::same(200, $s, "puntos $tipo no rechaza el cierre");
        T::same(0, $r['data']['puntos'], "puntos $tipo vale 0");
    }

    $pdo = testPdo();
    [$s, , $r] = http('POST', '/api/jornada_cerrar.php', json_encode(['jornada_id' => 1]));
    T::same([200, 0], [$s, $r['data']['puntos']], 'ausente');
});

// ---------------------------------------------------------------- 4.1 migración

/** Ejecuta un script SQL con DELIMITER (como el cliente mysql) sentencia a sentencia. */
function ejecutarScriptSql(PDO $pdo, string $ruta): void
{
    $delim = ';';
    $acum = '';
    foreach (preg_split('/\R/', file_get_contents($ruta)) as $linea) {
        $t = trim($linea);
        if (preg_match('/^DELIMITER\s+(\S+)$/i', $t, $m)) {
            $delim = $m[1];
            continue;
        }
        if ($t === '' || str_starts_with($t, '--')) {
            continue;
        }
        $acum .= $linea . "\n";
        if (str_ends_with($t, $delim)) {
            $sentencia = substr(rtrim($acum), 0, -strlen($delim));
            $pdo->exec($sentencia);
            $acum = '';
        }
    }
}

T::test('migración: desde el esquema anterior, dos veces seguidas, conserva los datos y el código viejo sigue funcionando', function () {
    $pdo = testPdo();
    // Vuelve al esquema ANTERIOR al ranking
    $pdo->exec('DROP TABLE jugadores, limite_peticiones');
    $pdo->exec('ALTER TABLE jornadas DROP COLUMN puntos');
    T::same(0, (int) $pdo->query("SELECT COUNT(*) FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'jornadas' AND column_name = 'puntos'")->fetchColumn());

    $migracion = dirname(__DIR__) . '/database/migracion_ranking.sql';
    ejecutarScriptSql($pdo, $migracion);
    ejecutarScriptSql($pdo, $migracion);                      // idempotente

    $cuenta = fn(string $tabla) => (int) $pdo->query("SELECT COUNT(*) FROM information_schema.tables
        WHERE table_schema = DATABASE() AND table_name = '$tabla'")->fetchColumn();
    T::same(1, $cuenta('jugadores'));
    T::same(1, $cuenta('limite_peticiones'));
    T::same(0, (int) $pdo->query("SELECT COUNT(*) FROM information_schema.routines
        WHERE routine_schema = DATABASE() AND routine_name = 'migrar_paso'")->fetchColumn(), 'borra el procedimiento auxiliar');
    T::same(1, (int) $pdo->query("SELECT COUNT(*) FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'jornadas' AND column_name = 'puntos'")->fetchColumn());
    T::same(2, (int) $pdo->query('SELECT COUNT(*) FROM jornadas')->fetchColumn(), 'las jornadas existentes siguen ahí');
    T::same(0, puntosDeJornada($pdo, 2), 'las viejas quedan con 0 puntos');

    // El código viejo (sin puntos) sigue pudiendo abrir jornadas
    $pdo->exec("INSERT INTO jornadas (estado, jugador) VALUES ('abierta', '" . JUG2 . "')");
    // Y el esquema migrado funciona con el código nuevo
    ventasEnJornada($pdo, 1, 1);
    T::same(100, (int) makeJornadas($pdo)->cerrar(1, [], [], '0.00', '0.00', 100)['puntos']);
    $pdo->exec("INSERT INTO jugadores (id, apodo) VALUES ('" . UUID_A . "', 'Ana')");
    T::throws(PDOException::class, fn() => $pdo->exec("INSERT INTO jugadores (id, apodo) VALUES ('" . UUID_B . "', 'ANÁ')"), 'colación del apodo');
});

// ---------------------------------------------------------------- 4.2 apodo

T::test('validación del apodo: longitud, caracteres, recorte y palabras bloqueadas', function () {
    T::same('Ana', RankingService::validarApodo('  Ana  '));
    T::same('Ana López_2-b', RankingService::validarApodo('Ana  López_2-b'), 'espacios repetidos -> uno');
    T::same('ñandú', RankingService::validarApodo('ñandú'));
    T::same(str_repeat('a', 20), RankingService::validarApodo(str_repeat('a', 20)));
    foreach (['', 'ab', ' a ', str_repeat('a', 21), 'Ana!', 'Ana<b>', "Ana\nLuis", 'Ana.Luis', '😀😀😀', "\xff\xfeabc"] as $malo) {
        T::throws(InvalidArgumentException::class, fn() => RankingService::validarApodo($malo), 'inválido: ' . json_encode($malo));
    }
    foreach ([null, 5, ['Ana'], true] as $malo) {
        T::throws(InvalidArgumentException::class, fn() => RankingService::validarApodo($malo), 'tipo');
    }
    foreach (['Hijueputa', 'p u t a', 'MALPARIDO99', 'Pu7a', 'xxHitlerxx', 'Admin', 'el_admin'] as $bloqueado) {
        T::throws(InvalidArgumentException::class, fn() => RankingService::validarApodo($bloqueado), "bloqueado: $bloqueado");
    }
    foreach (['Computadora', 'Penélope', 'Analista', 'Administrativo', 'Esputo1'] as $bueno) {
        T::same($bueno, RankingService::validarApodo($bueno), "permitido: $bueno");
    }
});

T::test('API apodo: crea la fila, guarda y devuelve el apodo', function () {
    $pdo = testPdo();
    T::same(null, totalPuntos($pdo, JUG));
    [$s, $t, $r] = http('POST', '/api/apodo.php', '{"apodo":"  Ana  "}');
    T::same(200, $s);
    T::same('Ana', $r['data']['apodo']);
    T::same('Ana', $pdo->query("SELECT apodo FROM jugadores WHERE id = '" . JUG . "'")->fetchColumn());
    T::same(0, totalPuntos($pdo, JUG), 'fila creada con 0 puntos');
});

T::test('API apodo: 422 inválido (corto, largo, caracteres, bloqueado, tipo) y 400 sin cabecera', function () {
    testPdo();
    foreach (['ab', str_repeat('x', 21), 'Ana!', 'Hijueputa', 5, null] as $malo) {
        [$s, , $r] = http('POST', '/api/apodo.php', json_encode(['apodo' => $malo]));
        T::same(422, $s, 'apodo ' . json_encode($malo));
        T::same(false, $r['success']);
    }
    [$s] = http('POST', '/api/apodo.php', '{}');
    T::same(422, $s, 'sin apodo');
    [$s] = http('POST', '/api/apodo.php', '{"apodo":"Ana"}', null);
    T::same(400, $s, 'sin X-Jugador');
    [$s] = http('GET', '/api/apodo.php');
    T::same(405, $s);
});

T::test('API apodo: 409 si otro jugador lo tiene, sin distinguir mayúsculas ni tildes', function () {
    $pdo = testPdo();
    http('POST', '/api/apodo.php', '{"apodo":"Ana"}');
    foreach (['ana', 'ANA', 'Aná', 'ÁNA'] as $variante) {
        [$s, , $r] = http('POST', '/api/apodo.php', json_encode(['apodo' => $variante]), JUG2);
        T::same(409, $s, $variante);
        T::same(false, $r['success']);
    }
    T::same(false, $pdo->query("SELECT apodo FROM jugadores WHERE id = '" . JUG2 . "'")->fetchColumn(), 'el segundo no se quedó con ninguno');
    [$s] = http('POST', '/api/apodo.php', '{"apodo":"Ana2"}', JUG2);
    T::same(200, $s, 'uno distinto sí');
});

T::test('API apodo: el mismo jugador puede reponer su apodo, y cambiar mayúsculas cuenta como cambio', function () {
    $pdo = testPdo();
    http('POST', '/api/apodo.php', '{"apodo":"Ana"}');
    [$s, , $r] = http('POST', '/api/apodo.php', '{"apodo":"Ana"}');
    T::same([200, 'Ana'], [$s, $r['data']['apodo']], 'repetir el mismo no gasta el cambio ni da 409');
    [$s] = http('POST', '/api/apodo.php', '{"apodo":"ana"}');
    T::same(429, $s, 'cambiar la capitalización es un cambio y está limitado');
});

T::test('API apodo: 429 si cambia de apodo hace menos de 24 h; pasado el día se permite', function () {
    $pdo = testPdo();
    http('POST', '/api/apodo.php', '{"apodo":"Ana"}');
    [$s, , $r] = http('POST', '/api/apodo.php', '{"apodo":"Luisa"}');
    T::same(429, $s);
    T::same(false, $r['success']);
    T::same('Ana', $pdo->query("SELECT apodo FROM jugadores WHERE id = '" . JUG . "'")->fetchColumn(), 'sigue el anterior');
    $pdo->exec("UPDATE jugadores SET apodo_cambiado = apodo_cambiado - INTERVAL 25 HOUR");
    [$s, , $r] = http('POST', '/api/apodo.php', '{"apodo":"Luisa"}');
    T::same([200, 'Luisa'], [$s, $r['data']['apodo']]);
});

T::test('apodo: cambiar de apodo no mueve el desempate (actualizado) ni los puntos', function () {
    $pdo = testPdo();
    jugadorRanking($pdo, JUG, null, 50, '2026-02-02 10:00:00');
    http('POST', '/api/apodo.php', '{"apodo":"Ana"}');
    T::same('2026-02-02 10:00:00', $pdo->query("SELECT actualizado FROM jugadores WHERE id = '" . JUG . "'")->fetchColumn());
    T::same(50, totalPuntos($pdo, JUG));
});

// ---------------------------------------------------------------- 4.2 ranking

T::test('ranking: orden por puntos, desempate por quien llegó antes, solo con apodo y puntos > 0, máximo 5', function () {
    $pdo = testPdo();
    [$a, $b, $c, $d, $e, $f, $g, $h] = idsFalsos(8);
    jugadorRanking($pdo, $a, 'Alta', 900);
    jugadorRanking($pdo, $b, 'Empate Tarde', 500, '2026-03-01 00:00:00');
    jugadorRanking($pdo, $c, 'Empate Pronto', 500, '2026-02-01 00:00:00');
    jugadorRanking($pdo, $d, 'Media', 300);
    jugadorRanking($pdo, $e, 'Baja', 100);
    jugadorRanking($pdo, $f, 'Fuera', 50);                  // sexto: no entra
    jugadorRanking($pdo, $g, null, 5000);                   // sin apodo: no aparece aunque sea el mejor
    jugadorRanking($pdo, $h, 'Cero', 0);                    // 0 puntos: no aparece

    [$s, , $r] = http('GET', '/api/ranking.php', null, null);
    T::same(200, $s);
    T::same([
        ['posicion' => 1, 'apodo' => 'Alta', 'puntos' => 900],
        ['posicion' => 2, 'apodo' => 'Empate Pronto', 'puntos' => 500],
        ['posicion' => 3, 'apodo' => 'Empate Tarde', 'puntos' => 500],
        ['posicion' => 4, 'apodo' => 'Media', 'puntos' => 300],
        ['posicion' => 5, 'apodo' => 'Baja', 'puntos' => 100],
    ], $r['data']['top']);
    T::same(null, $r['data']['yo'], 'sin X-Jugador, yo es null');
});

T::test('ranking vacío: top [] y yo null', function () {
    testPdo();
    [$s, , $r] = http('GET', '/api/ranking.php', null, null);
    T::same([200, [], null], [$s, $r['data']['top'], $r['data']['yo']]);
});

T::test('ranking: nunca devuelve identificadores de jugador', function () {
    $pdo = testPdo();
    jugadorRanking($pdo, UUID_A, 'Ana', 300);
    jugadorRanking($pdo, UUID_B, 'Luis', 200);
    [$s, $cuerpo] = getConCabeceras('/api/ranking.php', UUID_B);
    T::same(200, $s);
    T::same(0, preg_match('/[0-9a-f]{8}-[0-9a-f]{4}-/i', $cuerpo), 'ni un UUID en el cuerpo');
    $r = json_decode($cuerpo, true);
    T::same(['posicion', 'apodo', 'puntos'], array_keys($r['data']['top'][0]));
    T::same(['apodo', 'puntos', 'posicion'], array_keys($r['data']['yo']));
});

T::test('ranking: «yo» con posición fuera del top, sin apodo, sin puntos y sin fila', function () {
    $pdo = testPdo();
    $ids = idsFalsos(7);
    foreach ($ids as $i => $id) {
        jugadorRanking($pdo, $id, "Jugador$i", 1000 - $i * 100);        // 1000, 900, ... 400
    }
    jugadorRanking($pdo, JUG, 'Yo mismo', 350);                         // octavo
    jugadorRanking($pdo, JUG2, null, 5000);                             // sin apodo
    jugadorRanking($pdo, UUID_A, 'Cero', 0);

    [, , $r] = http('GET', '/api/ranking.php', null, JUG);
    T::same(['apodo' => 'Yo mismo', 'puntos' => 350, 'posicion' => 8], $r['data']['yo']);
    T::same(5, count($r['data']['top']));

    [, , $r] = http('GET', '/api/ranking.php', null, JUG2);
    T::same(['apodo' => null, 'puntos' => 5000, 'posicion' => null], $r['data']['yo'], 'sin apodo no tiene posición');

    [, , $r] = http('GET', '/api/ranking.php', null, UUID_A);
    T::same(['apodo' => 'Cero', 'puntos' => 0, 'posicion' => null], $r['data']['yo'], '0 puntos no tiene posición');

    [, , $r] = http('GET', '/api/ranking.php', null, UUID_C);
    T::same(null, $r['data']['yo'], 'sin fila');

    [$s] = http('GET', '/api/ranking.php', null, 'no-es-uuid');
    T::same(400, $s, 'X-Jugador inválido');
});

T::test('ranking: la posición de un empate coincide con el orden del top', function () {
    $pdo = testPdo();
    jugadorRanking($pdo, JUG, 'Tarde', 500, '2026-03-01 00:00:00');
    jugadorRanking($pdo, JUG2, 'Pronto', 500, '2026-02-01 00:00:00');
    T::same(2, http('GET', '/api/ranking.php', null, JUG)[2]['data']['yo']['posicion']);
    T::same(1, http('GET', '/api/ranking.php', null, JUG2)[2]['data']['yo']['posicion']);
});

T::test('cierre de jornada + apodo + ranking, de punta a punta', function () {
    $pdo = testPdo();
    ventasEnJornada($pdo, 1, 2);
    http('POST', '/api/jornada_cerrar.php', json_encode(['jornada_id' => 1, 'puntos' => 180]));
    [, , $r] = http('GET', '/api/ranking.php');
    T::same([], $r['data']['top'], 'con puntos pero sin apodo no sale');
    http('POST', '/api/apodo.php', '{"apodo":"Ana"}');
    [, , $r] = http('GET', '/api/ranking.php');
    T::same([['posicion' => 1, 'apodo' => 'Ana', 'puntos' => 180]], $r['data']['top']);
    T::same(['apodo' => 'Ana', 'puntos' => 180, 'posicion' => 1], $r['data']['yo']);
});

T::test('ranking: Cache-Control corto; privado con X-Jugador y público sin él; los errores siguen sin caché', function () {
    $pdo = testPdo();
    [, , $cab] = getConCabeceras('/api/ranking.php', null);
    T::same('public, max-age=30', $cab['cache-control']);
    T::same('X-Jugador', $cab['vary']);
    [, , $cab] = getConCabeceras('/api/ranking.php', JUG);
    T::same('private, max-age=30', $cab['cache-control']);
    [$s, , $cab] = getConCabeceras('/api/ranking.php', 'malo');
    T::same(400, $s);
    T::same('no-store', $cab['cache-control']);
    // El apodo (escritura) no se guarda nunca
    TestServer::start();
    $ctx = stream_context_create(['http' => ['method' => 'POST', 'content' => '{"apodo":"Ana"}', 'ignore_errors' => true,
        'header' => "Content-Type: application/json\r\nX-Jugador: " . JUG . "\r\n"]]);
    file_get_contents(TestServer::$base . '/api/apodo.php', false, $ctx);
    T::same(true, in_array('Cache-Control: no-store', $http_response_header, true));
});

// ---------------------------------------------------------------- límite de peticiones

T::test('límite de peticiones: cuenta por IP y grupo, y se reinicia al cambiar de minuto', function () {
    $pdo = testPdo();
    $t = 1_700_000_040;                                       // inicio de un minuto
    for ($i = 0; $i < 3; $i++) {
        LimitePeticiones::exigir($pdo, 'x', 3, '203.0.113.7', $t);
    }
    $caso = fn() => LimitePeticiones::exigir($pdo, 'x', 3, '203.0.113.7', $t + 10);
    try {
        $caso();
        throw new Exception('debió dar 429');
    } catch (ApiException $e) {
        T::same(429, $e->status);
    }
    LimitePeticiones::exigir($pdo, 'x', 3, '203.0.113.8', $t);                  // otra IP
    LimitePeticiones::exigir($pdo, 'otro', 3, '203.0.113.7', $t);               // otro grupo
    LimitePeticiones::exigir($pdo, 'x', 3, '203.0.113.7', $t + 60);             // minuto siguiente
    // IPv6: dos direcciones del mismo /64 comparten contador
    for ($i = 0; $i < 3; $i++) {
        LimitePeticiones::exigir($pdo, 'v6', 3, "2001:db8:1:2::$i", $t);
    }
    T::throws(ApiException::class, fn() => LimitePeticiones::exigir($pdo, 'v6', 3, '2001:db8:1:2:ffff::9', $t), 'mismo /64');
    LimitePeticiones::exigir($pdo, 'v6', 3, '2001:db8:1:3::1', $t);             // otro /64
});

T::test('IP del cliente: CF-Connecting-IP solo se acepta si la conexión directa es local o privada', function () {
    $antes = $_SERVER;
    try {
        $_SERVER['REMOTE_ADDR'] = '127.0.0.1';
        $_SERVER['HTTP_CF_CONNECTING_IP'] = '198.51.100.9';
        T::same('198.51.100.9', LimitePeticiones::ip(), 'detrás del túnel');
        $_SERVER['REMOTE_ADDR'] = '10.89.0.1';
        T::same('198.51.100.9', LimitePeticiones::ip(), 'red privada del contenedor');
        $_SERVER['REMOTE_ADDR'] = '203.0.113.50';
        T::same('203.0.113.50', LimitePeticiones::ip(), 'directo desde internet: se ignora la cabecera falsificada');
        $_SERVER['REMOTE_ADDR'] = '127.0.0.1';
        $_SERVER['HTTP_CF_CONNECTING_IP'] = 'basura';
        T::same('127.0.0.1', LimitePeticiones::ip(), 'cabecera inválida');
        unset($_SERVER['HTTP_CF_CONNECTING_IP']);
        T::same('127.0.0.1', LimitePeticiones::ip());
    } finally {
        $_SERVER = $antes;
    }
});

T::test('API apodo: la petición 11 del minuto desde una IP recibe 429; otra IP (CF-Connecting-IP) no', function () {
    testPdo();
    $ip = ['CF-Connecting-IP' => '198.51.100.20'];
    for ($i = 0; $i < 10; $i++) {
        [$s] = http('POST', '/api/apodo.php', '{"apodo":"ab"}', JUG, $ip);
        T::same(422, $s, "petición $i");
    }
    [$s, , $r] = http('POST', '/api/apodo.php', '{"apodo":"Ana"}', JUG, $ip);
    T::same(429, $s);
    T::same(false, $r['success']);
    [$s] = http('POST', '/api/apodo.php', '{"apodo":"Ana"}', JUG, ['CF-Connecting-IP' => '198.51.100.21']);
    T::same(200, $s, 'otra IP no se ve afectada');
});
