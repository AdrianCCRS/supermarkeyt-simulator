<?php

declare(strict_types=1);

require_once __DIR__ . '/../../src/bootstrap.php';

// GET /api/jornada_actual.php -> la jornada abierta con su resumen (404 si no hay)
Api::handle('GET', function (): array {
    $pdo = Database::connection();
    $jornada = (new JornadaService($pdo, new JornadaRepository($pdo)))->actual();

    if ($jornada === null) {
        throw new ApiException(404, 'No hay una jornada abierta');
    }

    return $jornada;
});
