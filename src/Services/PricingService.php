<?php

class PricingService
{
    /** Máximo de unidades por línea del carrito. */
    public const MAX_CANTIDAD_POR_LINEA = 1000;

    /**
     * Límite de cualquier importe, en centavos. Coincide con DECIMAL(12,2)
     * (9,999,999,999.99) y garantiza que ninguna operación intermedia
     * (subtotal * iva escalado <= 1e12 * 1e4 = 1e16) desborde un int de 64 bits.
     */
    public const MAX_IMPORTE_CENTAVOS = 999999999999;

    public function calcularTicket(
        array $productos,
        array $cantidades
    ): array {
        $subtotales = $this->getSubtotalPorProducto(
            $productos,
            $cantidades
        );

        $ivas = $this->getIvaPorProducto(
            $subtotales,
            $productos
        );

        $totales = $this->getTotalPorProducto(
            $subtotales,
            $ivas
        );

        $subtotalGeneral = array_sum($subtotales);
        $ivaTotal = array_sum($ivas);
        $descuentoTotal = 0;
        $totalGeneral = array_sum($totales) - $descuentoTotal;

        if ($totalGeneral > self::MAX_IMPORTE_CENTAVOS) {
            throw new InvalidArgumentException(
                "El total del ticket excede el máximo permitido"
            );
        }

        $detalles = [];

        foreach ($productos as $producto) {
            $sku = $producto['sku'];

            $detalles[] = [
                'producto_id' => (int) $producto['id'],
                'sku' => $sku,
                'nombre' => $producto['nombre'],
                'cantidad' => $cantidades[$sku],
                'precio_unitario' => $producto['precio_base'],
                'iva_pct' => $producto['iva_pct'],
                'subtotal_linea' => $this->centavosADecimal(
                    $subtotales[$sku]
                ),
                'iva_linea' => $this->centavosADecimal(
                    $ivas[$sku]
                ),
                'total_linea' => $this->centavosADecimal(
                    $totales[$sku]
                )
            ];
        }

        return [
            'detalles' => $detalles,
            'subtotal' => $this->centavosADecimal($subtotalGeneral),
            'iva_total' => $this->centavosADecimal($ivaTotal),
            'descuento_total' => $this->centavosADecimal($descuentoTotal),
            'total' => $this->centavosADecimal($totalGeneral)
        ];
    }

    private function getSubtotalPorProducto(
        array $productos,
        array $cantidades
    ): array {
        $subtotales = [];

        foreach ($productos as $producto) {
            $sku = $producto['sku'];

            if (
                !isset($cantidades[$sku]) ||
                !is_int($cantidades[$sku]) ||
                $cantidades[$sku] <= 0
            ) {
                throw new InvalidArgumentException(
                    "Cantidad inválida para el producto: $sku"
                );
            }

            $precioCentavos = $this->decimalACentavos(
                $producto['precio_base']
            );

            $cantidad = $cantidades[$sku];

            if ($cantidad > self::MAX_CANTIDAD_POR_LINEA) {
                throw new InvalidArgumentException(
                    "Cantidad máxima por producto excedida: $sku"
                );
            }

            // Comparación segura: no se multiplica antes de validar.
            if ($precioCentavos > intdiv(
                self::MAX_IMPORTE_CENTAVOS,
                $cantidad
            )) {
                throw new InvalidArgumentException(
                    "El importe de la línea excede el máximo permitido: $sku"
                );
            }

            $subtotales[$sku] = $precioCentavos * $cantidad;
        }

        if (array_sum($subtotales) > self::MAX_IMPORTE_CENTAVOS) {
            throw new InvalidArgumentException(
                "El importe del ticket excede el máximo permitido"
            );
        }

        return $subtotales;
    }

    private function getIvaPorProducto(
        array $subtotales,
        array $productos
    ): array {
        $ivas = [];

        foreach ($productos as $producto) {
            $sku = $producto['sku'];

            // 19.00% se representa como 1900
            $ivaEscalado = $this->decimalACentavos(
                $producto['iva_pct']
            );

            // Redondeo half-up para valores no negativos
            $ivas[$sku] = intdiv(
                $subtotales[$sku] * $ivaEscalado + 5000,
                10000
            );
        }

        return $ivas;
    }

    private function getTotalPorProducto(
        array $subtotales,
        array $ivas
    ): array {
        $totales = [];

        foreach ($subtotales as $sku => $subtotal) {
            $totales[$sku] = $subtotal + $ivas[$sku];
        }

        return $totales;
    }

    private function decimalACentavos(string $valor): int
    {
        if (!preg_match('/^\d{1,10}\.\d{2}$/', $valor)) {
            throw new InvalidArgumentException(
                "Formato decimal inválido: $valor"
            );
        }

        [$entero, $decimal] = explode('.', $valor);

        $centavos = (int) $entero * 100 + (int) $decimal;

        if ($centavos < 0) {
            throw new InvalidArgumentException(
                "El valor no puede ser negativo"
            );
        }

        return $centavos;
    }

    private function centavosADecimal(int $centavos): string
    {
        if ($centavos < 0) {
            throw new InvalidArgumentException(
                "El valor no puede ser negativo"
            );
        }

        $entero = intdiv($centavos, 100);
        $decimal = $centavos % 100;

        return $entero . '.' . str_pad(
            (string) $decimal,
            2,
            '0',
            STR_PAD_LEFT
        );
    }
}
