<?php

declare(strict_types=1);

require_once __DIR__ . '/../../src/bootstrap.php';

/*
 * GET /api/ventas.php?id=1          -> una venta con sus detalles
 * GET /api/ventas.php?jornada_id=2  -> ventas de una jornada (sin detalles)
 */
Api::handle('GET', function (): array {
    $positivo = ['options' => ['min_range' => 1]];
    $jugador = Api::jugador();
    $pdo = Database::connection();
    $ventas = new VentaRepository($pdo);
    $jornadas = new JornadaRepository($pdo);

    if (isset($_GET['jornada_id'])) {
        $jornadaId = filter_var($_GET['jornada_id'], FILTER_VALIDATE_INT, $positivo);

        if ($jornadaId === false) {
            throw new ApiException(400, 'jornada_id debe ser un entero positivo');
        }

        Api::jornadaDe($jornadas, $jornadaId, $jugador);

        return $ventas->getByJornadaId($jornadaId);
    }

    $id = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT, $positivo);

    if ($id === false) {
        throw new ApiException(400, 'Indica id (entero positivo) o jornada_id');
    }

    $venta = $ventas->getById($id);

    if ($venta === null || ($jornadas->findById((int) $venta['jornada_id'])['jugador'] ?? null) !== $jugador) {
        throw new ApiException(404, 'Venta no encontrada');
    }

    $venta['detalles'] = $ventas->getDetallesByVentaId($id);

    return $venta;
});
