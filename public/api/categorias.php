<?php

declare(strict_types=1);

require_once __DIR__ . '/../../src/bootstrap.php';

// GET /api/categorias.php
Api::handle('GET', function (): array {
    $categorias = (new CategoriaRepository(Database::connection()))->getAll();

    return array_map(fn(array $c): array => [
        'id' => (int) $c['id'],
        'nombre' => $c['nombre'],
        'descripcion' => $c['descripcion'],
    ], $categorias);
});
