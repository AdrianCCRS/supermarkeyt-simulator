<?php

declare(strict_types=1);

require_once __DIR__ . '/../../src/bootstrap.php';

// POST /api/venta_cancelar.php {"venta_id": 9} -> venta cancelada y stock devuelto
Api::handle('POST', function (): array {
    $id = Api::jsonBody()['venta_id'] ?? null;

    if (!is_int($id) || $id <= 0) {
        throw new ApiException(422, 'venta_id debe ser un entero positivo');
    }

    $jugador = Api::jugador();
    $pdo = Database::connection();
    $ventas = new VentaRepository($pdo);
    $jornadas = new JornadaRepository($pdo);
    $venta = $ventas->getById($id);

    // 404 si no existe o es de la jornada de otro jugador
    if ($venta === null || ($jornadas->findById((int) $venta['jornada_id'])['jugador'] ?? null) !== $jugador) {
        throw new ApiException(404, 'Venta no encontrada');
    }

    return (new VentaService(
        $pdo,
        $ventas,
        new ProductoRepository($pdo, $jugador),
        $jornadas
    ))->cancelar($id);
});
