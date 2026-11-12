<?php

declare(strict_types=1);

require_once __DIR__ . '/../../src/bootstrap.php';

// GET /api/ranking.php   (X-Jugador es opcional)
// -> {"top": [{"posicion": 1, "apodo": "Ana", "puntos": 1200}, ... hasta 5],
//     "yo": null | {"apodo": "Ana" | null, "puntos": 1200, "posicion": 1 | null}}
// Nunca devuelve identificadores de jugador.

Api::handle('GET', function (): array {
    $jugador = Api::jugador(false);
    $pdo = Database::connection();

    LimitePeticiones::exigir($pdo, 'ranking', 120);

    $datos = (new RankingService($pdo, new JugadorRepository($pdo)))->ranking($jugador);

    // El top es público, pero «yo» es personal. Sin X-Jugador la respuesta es la misma para todos y puede guardarse
    // en cualquier caché; con X-Jugador solo en la del navegador. Vary evita que una caché mezcle ambas variantes.
    // Se pone al final: si algo falla antes, queda el no-store de Api::handle.
    header('Cache-Control: ' . ($jugador === null ? 'public' : 'private') . ', max-age=30');
    header('Vary: X-Jugador');

    return $datos;
});
