<?php

declare(strict_types=1);

require_once __DIR__ . '/../../src/bootstrap.php';

// POST /api/jornada_cerrar.php
//   {"jornada_id": 2, "faltantes": {"LAC-001": 1}, "sobrantes": {"LAC-002": 3}, "perdida": "7100.00", "sobrecobro": "0.00"}
// -> jornada cerrada con su resumen. Todo menos jornada_id es opcional:
//   faltantes / sobrantes: {sku: cantidad entera >= 1} (ajustan el stock)
//   perdida / sobrecobro: importes en texto con hasta 2 decimales (se guardan en la jornada)
//   puntos: entero (ausente o inválido = 0). El servidor lo recorta a [0, 100 x ventas completadas] y responde con el valor guardado.

/** Valida un mapa {sku: cantidad}; null equivale a vacío. */
function mapaDeCantidades(mixed $valor, string $campo): array
{
    if ($valor === null) {
        return [];
    }
    if (!is_array($valor)) {
        throw new ApiException(422, "$campo debe ser un objeto {sku: cantidad}");
    }
    foreach ($valor as $sku => $cantidad) {
        if (!is_int($cantidad) || $cantidad < 1) {
            throw new ApiException(422, "$campo: la cantidad de $sku debe ser un entero positivo");
        }
    }
    return $valor;
}

/** Valida un importe en texto ("7100" o "7100.50"); null equivale a "0.00". Devuelve siempre con 2 decimales. */
function importeTexto(mixed $valor, string $campo): string
{
    if ($valor === null) {
        return '0.00';
    }
    if (!is_string($valor) || !preg_match('/^\d{1,10}(\.\d{1,2})?$/', $valor)) {
        throw new ApiException(422, "$campo debe ser un importe en texto, por ejemplo \"7100.00\"");
    }
    return number_format((float) $valor, 2, '.', '');
}

Api::handle('POST', function (): array {
    $body = Api::jsonBody();
    $id = $body['jornada_id'] ?? null;

    if (!is_int($id) || $id <= 0) {
        throw new ApiException(422, 'jornada_id debe ser un entero positivo');
    }
    $faltantes = mapaDeCantidades($body['faltantes'] ?? null, 'faltantes');
    $sobrantes = mapaDeCantidades($body['sobrantes'] ?? null, 'sobrantes');
    $perdida = importeTexto($body['perdida'] ?? null, 'perdida');
    $sobrecobro = importeTexto($body['sobrecobro'] ?? null, 'sobrecobro');

    // Nunca se rechaza el cierre por los puntos: lo que no sea un entero cuenta como 0
    $puntos = is_int($body['puntos'] ?? null) ? $body['puntos'] : 0;

    $pdo = Database::connection();
    $repo = new JornadaRepository($pdo);

    Api::jornadaDe($repo, $id, Api::jugador());      // 404 si no existe o es de otro jugador

    return (new JornadaService($pdo, $repo))->cerrar($id, $faltantes, $sobrantes, $perdida, $sobrecobro, $puntos);
});
