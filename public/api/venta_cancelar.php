<?php

declare(strict_types=1);

require_once __DIR__ . '/../../src/bootstrap.php';

// POST /api/venta_cancelar.php {"venta_id": 9} -> venta cancelada y stock devuelto
Api::handle('POST', function (): array {
    $id = Api::jsonBody()['venta_id'] ?? null;

    if (!is_int($id) || $id <= 0) {
        throw new ApiException(422, 'venta_id debe ser un entero positivo');
    }

    $pdo = Database::connection();
    $ventas = new VentaRepository($pdo);

    if ($ventas->getById($id) === null) {
        throw new ApiException(404, 'Venta no encontrada');
    }

    return (new VentaService(
        $pdo,
        $ventas,
        new ProductoRepository($pdo),
        new JornadaRepository($pdo)
    ))->cancelar($id);
});
