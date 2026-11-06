<?php

declare(strict_types=1);

require_once __DIR__ . '/../../src/bootstrap.php';

// GET /api/ventas.php?id=1
Api::handle('GET', function (): array {
    $id = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);

    if ($id === false) {
        throw new ApiException(400, 'El parámetro id debe ser un entero positivo');
    }

    $ventas = new VentaRepository(Database::connection());
    $venta = $ventas->getById($id);

    if ($venta === null) {
        throw new ApiException(404, 'Venta no encontrada');
    }

    $venta['detalles'] = $ventas->getDetallesByVentaId($id);

    return $venta;
});
