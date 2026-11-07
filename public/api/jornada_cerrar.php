<?php

declare(strict_types=1);

require_once __DIR__ . '/../../src/bootstrap.php';

// POST /api/jornada_cerrar.php {"jornada_id": 2, "faltantes": {"LAC-001": 1}, "sobrantes": {"LAC-002": 3}}
// -> jornada cerrada con su resumen. "faltantes" y "sobrantes" son opcionales ({sku: cantidad entera >= 1}).

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

Api::handle('POST', function (): array {
    $body = Api::jsonBody();
    $id = $body['jornada_id'] ?? null;

    if (!is_int($id) || $id <= 0) {
        throw new ApiException(422, 'jornada_id debe ser un entero positivo');
    }
    $faltantes = mapaDeCantidades($body['faltantes'] ?? null, 'faltantes');
    $sobrantes = mapaDeCantidades($body['sobrantes'] ?? null, 'sobrantes');

    $pdo = Database::connection();
    $repo = new JornadaRepository($pdo);

    if ($repo->findById($id) === null) {
        throw new ApiException(404, 'Jornada no encontrada');
    }

    return (new JornadaService($pdo, $repo))->cerrar($id, $faltantes, $sobrantes);
});
