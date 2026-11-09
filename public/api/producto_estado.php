<?php

declare(strict_types=1);

require_once __DIR__ . '/../../src/bootstrap.php';

// POST /api/producto_estado.php {"sku": "FRU-001", "activo": false}
Api::handle('POST', function (): array {
    Api::exigirAdmin();
    $body = Api::jsonBody();
    $sku = $body['sku'] ?? null;
    $activo = $body['activo'] ?? null;

    if (!is_string($sku) || trim($sku) === '') {
        throw new ApiException(422, 'sku debe ser texto no vacío');
    }
    if (!is_bool($activo)) {
        throw new ApiException(422, 'activo debe ser true o false');
    }

    $service = new ProductoService(new ProductoRepository(Database::connection()));

    try {
        $p = $service->cambiarEstado($sku, $activo);
    } catch (InvalidArgumentException $e) {
        throw new ApiException(404, $e->getMessage());
    }

    return ['sku' => $p['sku'], 'nombre' => $p['nombre'], 'activo' => (bool) $p['is_active']];
});
