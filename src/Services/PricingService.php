
<?php

class PricingService
{
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

            $subtotales[$sku] = $precioCentavos
                * $cantidades[$sku];
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
        if (!preg_match('/^\d+\.\d{2}$/', $valor)) {
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
