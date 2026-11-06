<?php

declare(strict_types=1);

require_once __DIR__ . '/../../src/bootstrap.php';

Api::handle('GET', function (): array {
    $productos = (new ProductoRepository(Database::connection()))->getAll();

    return array_map(fn(array $p): array => [
        'id' => (int) $p['id'],
        'sku' => $p['sku'],
        'nombre' => $p['nombre'],
        'categoria_id' => (int) $p['categoria_id'],
        'precio_base' => $p['precio_base'],
        'iva_pct' => $p['iva_pct'],
        'stock' => (int) $p['stock'],
        'imagen_url' => $p['imagen_url'],
    ], $productos);
});
