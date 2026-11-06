
<?php

class ProductoRepository
{
    public function __construct(
        private PDO $pdo
    ) {}

    public function getById(int $id): ?array
    {
        $query = $this->pdo->prepare(
            "SELECT
                p.id,
                p.sku,
                p.nombre,
                p.categoria_id,
                p.precio_base,
                p.iva_pct,
                p.stock,
                p.imagen_url
            FROM productos AS p
            WHERE p.id = ?
              AND p.is_active = 1"
        );

        $query->execute([$id]);

        $producto = $query->fetch(PDO::FETCH_ASSOC);

        return $producto ?: null;
    }

    public function getSeveralById(array $ids): array
    {
        if (empty($ids)) {
            return [];
        }

        foreach ($ids as $id) {
            if (!is_int($id) || $id <= 0) {
                throw new InvalidArgumentException(
                    "Los IDs deben ser enteros positivos"
                );
            }
        }

        $ids = array_values(array_unique($ids));

        $placeholders = implode(
            ',',
            array_fill(0, count($ids), '?')
        );

        $query = $this->pdo->prepare(
            "SELECT
                p.id,
                p.sku,
                p.nombre,
                p.categoria_id,
                p.precio_base,
                p.iva_pct,
                p.stock,
                p.imagen_url
            FROM productos AS p
            WHERE p.id IN ($placeholders)
              AND p.is_active = 1"
        );

        $query->execute($ids);

        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getAll(): array
    {
        $query = $this->pdo->prepare(
            "SELECT
                p.id,
                p.sku,
                p.nombre,
                p.categoria_id,
                p.precio_base,
                p.iva_pct,
                p.stock,
                p.imagen_url
            FROM productos AS p
            WHERE p.is_active = 1"
        );

        $query->execute();

        return $query->fetchAll(PDO::FETCH_ASSOC);
    }
    public function getBySkus(array $skus): array
    {
        if (empty($skus)) {
            return [];
        }
        foreach ($skus as $sku) {
        if (!is_string($sku) || trim($sku) === '') {
            throw new InvalidArgumentException(
                "Los SKUs deben ser textos no vacíos"
            );
        }
}

        $skus = array_values(array_unique($skus));

        $placeholders = implode(
            ',',
            array_fill(0, count($skus), '?')
        );

        $query = $this->pdo->prepare(
            "SELECT
                p.id,
                p.sku,
                p.nombre,
                p.categoria_id,
                p.precio_base,
                p.iva_pct,
                p.stock,
                p.imagen_url
            FROM productos AS p
            WHERE p.sku IN ($placeholders)
              AND p.is_active = 1"
        );

        $query->execute($skus);

        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function descontarStock(int $productoId, int $cantidad): void
    {
        if ($cantidad <= 0) {
            throw new InvalidArgumentException(
                "La cantidad a descontar debe ser mayor que cero"
            );
        }
        
        $query = $this->pdo->prepare(
            "UPDATE productos
            SET stock = stock - ?
            WHERE id = ? AND stock >= ?"
        );

        $query->execute([$cantidad, $productoId, $cantidad]);

        if ($query->rowCount() === 0) {
        throw new RuntimeException(
            "No se pudo descontar el stock para el producto con ID $productoId. Puede que no haya suficiente stock."
        );
        }
    }
}
