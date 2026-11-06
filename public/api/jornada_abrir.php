<?php

declare(strict_types=1);

require_once __DIR__ . '/../../src/bootstrap.php';

// POST /api/jornada_abrir.php (sin cuerpo) -> 201; 409 si ya hay una abierta
Api::handle('POST', function (): array {
    $pdo = Database::connection();

    return (new JornadaService($pdo, new JornadaRepository($pdo)))->abrir();
}, 201);
