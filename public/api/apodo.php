<?php

declare(strict_types=1);

require_once __DIR__ . '/../../src/bootstrap.php';

// POST /api/apodo.php   (cabecera X-Jugador)   {"apodo": "Ana"}   -> {"apodo": "Ana"}
//   422 apodo inválido (3 a 20 caracteres: letras, números, espacio, _ y -; sin palabras bloqueadas)
//   409 ya lo tiene otro jugador (sin distinguir mayúsculas ni tildes)
//   429 cambió de apodo hace menos de 24 horas, o demasiadas peticiones desde esta IP

Api::handle('POST', function (): array {
    $jugador = Api::jugador();
    $body = Api::jsonBody();
    $pdo = Database::connection();

    LimitePeticiones::exigir($pdo, 'apodo', 10);

    $service = new RankingService($pdo, new JugadorRepository($pdo));

    return ['apodo' => $service->fijarApodo($jugador, $body['apodo'] ?? null)];
});
