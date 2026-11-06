<?php

class ProductoRepository
{
    public function __construct(
        private PDO $pdo
    ) {}

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

    /**
     * Igual que getBySkus() pero bloquea las filas (FOR UPDATE).
     * Debe llamarse dentro de una transacción. Ordena por id para
     * adquirir los bloqueos siempre en el mismo orden y evitar deadlocks.
     */
    public function getBySkusForUpdate(array $skus): array
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
              AND p.is_active = 1
            ORDER BY p.id
            FOR UPDATE"
        );

        $query->execute($skus);

        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    /** Busca por SKU sin filtrar por is_active (para administración). */
    public function findBySku(string $sku): ?array
    {
        $query = $this->pdo->prepare(
            "SELECT id, sku, nombre, stock, is_active
            FROM productos
            WHERE sku = ?"
        );

        $query->execute([$sku]);

        $producto = $query->fetch(PDO::FETCH_ASSOC);

        return $producto ?: null;
    }

    /** Suma stock sin tope (devolución por venta cancelada). */
    public function devolverStock(int $productoId, int $cantidad): void
    {
        if ($cantidad <= 0) {
            throw new InvalidArgumentException(
                "La cantidad a devolver debe ser mayor que cero"
            );
        }

        $query = $this->pdo->prepare(
            "UPDATE productos SET stock = stock + ? WHERE id = ?"
        );

        $query->execute([$cantidad, $productoId]);

        if ($query->rowCount() === 0) {
            throw new RuntimeException(
                "No se pudo devolver el stock del producto con ID $productoId"
            );
        }
    }

    /**
     * Reposición de inventario con tope. Devuelve false si el resultado
     * superaría $maxStock (no modifica nada en ese caso).
     */
    public function reponerStock(int $productoId, int $cantidad, int $maxStock): bool
    {
        $query = $this->pdo->prepare(
            "UPDATE productos
            SET stock = stock + ?
            WHERE id = ? AND stock <= ?"
        );

        $query->execute([$cantidad, $productoId, $maxStock - $cantidad]);

        return $query->rowCount() === 1;
    }

    public function setActivo(int $productoId, bool $activo): void
    {
        $query = $this->pdo->prepare(
            "UPDATE productos SET is_active = ? WHERE id = ?"
        );

        $query->execute([$activo ? 1 : 0, $productoId]);
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
            WHERE id = ?
              AND is_active = 1
              AND stock >= ?"
        );

        $query->execute([$cantidad, $productoId, $cantidad]);

        if ($query->rowCount() === 0) {
        throw new RuntimeException(
            "No se pudo descontar el stock para el producto con ID $productoId. Puede que no haya suficiente stock o que el producto esté inactivo."
        );
        }
    }
}
