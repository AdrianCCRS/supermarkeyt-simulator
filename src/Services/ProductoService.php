<?php

class ProductoService
{
    public const MAX_STOCK = 1000000;
    public const MAX_REPOSICION = 100000;

    public function __construct(private ProductoRepository $productos) {}

    public function reponer(string $sku, int $cantidad): array
    {
        if ($cantidad <= 0 || $cantidad > self::MAX_REPOSICION) {
            throw new InvalidArgumentException(
                'La cantidad debe estar entre 1 y ' . self::MAX_REPOSICION
            );
        }

        $producto = $this->existente($sku);

        if (!$this->productos->reponerStock(
            (int) $producto['id'],
            $cantidad,
            self::MAX_STOCK
        )) {
            throw new RuntimeException(
                'El stock resultante superaría el máximo de ' . self::MAX_STOCK
            );
        }

        return $this->existente($sku);
    }

    public function cambiarEstado(string $sku, bool $activo): array
    {
        $producto = $this->existente($sku);
        $this->productos->setActivo((int) $producto['id'], $activo);

        return $this->existente($sku);
    }

    private function existente(string $sku): array
    {
        $producto = $this->productos->findBySku($sku);

        if ($producto === null) {
            throw new InvalidArgumentException('Producto no encontrado');
        }

        return $producto;
    }
}
