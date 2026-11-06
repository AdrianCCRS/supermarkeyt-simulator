<?php

declare(strict_types=1);

require_once __DIR__ . '/../../src/bootstrap.php';

// POST /api/jornada_cerrar.php {"jornada_id": 2} -> jornada cerrada con su resumen
Api::handle('POST', function (): array {
    $id = Api::jsonBody()['jornada_id'] ?? null;

    if (!is_int($id) || $id <= 0) {
        throw new ApiException(422, 'jornada_id debe ser un entero positivo');
    }

    $pdo = Database::connection();
    $repo = new JornadaRepository($pdo);

    if ($repo->findById($id) === null) {
        throw new ApiException(404, 'Jornada no encontrada');
    }

    return (new JornadaService($pdo, $repo))->cerrar($id);
});
