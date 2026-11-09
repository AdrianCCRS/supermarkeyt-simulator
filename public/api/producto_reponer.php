<?php

declare(strict_types=1);

require_once __DIR__ . '/../../src/bootstrap.php';

// POST /api/producto_reponer.php {"sku": "FRU-001", "cantidad": 20}
Api::handle('POST', function (): array {
    Api::exigirAdmin();
    $body = Api::jsonBody();
    $sku = $body['sku'] ?? null;
    $cantidad = $body['cantidad'] ?? null;

    if (!is_string($sku) || trim($sku) === '') {
        throw new ApiException(422, 'sku debe ser texto no vacío');
    }
    if (!is_int($cantidad)) {
        throw new ApiException(422, 'cantidad debe ser un entero');
    }

    $service = new ProductoService(new ProductoRepository(Database::connection()));

    try {
        $p = $service->reponer($sku, $cantidad);
    } catch (InvalidArgumentException $e) {
        // "Producto no encontrado" -> 404; el resto de validaciones -> 422
        throw $e->getMessage() === 'Producto no encontrado'
            ? new ApiException(404, $e->getMessage())
            : $e;
    }

    return ['sku' => $p['sku'], 'nombre' => $p['nombre'], 'stock' => (int) $p['stock']];
});
