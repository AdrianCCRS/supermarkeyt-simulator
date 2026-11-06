
<?php

class CheckoutService
{
    public function __construct(
        private PDO $pdo,
        private ProductoRepository $productoRepository,
        private VentaRepository $ventaRepository,
        private JornadaRepository $jornadaRepository,
        private PricingService $pricingService
    ) {}

    public function procesarCompra(
        int $jornadaId,
        string $clienteNombre,
        array $carrito,
        string $efectivoRecibido
    ): array {
        // 1. Validaciones de entrada
        $clienteNombre = trim($clienteNombre);

        if ($jornadaId <= 0) {
            throw new InvalidArgumentException(
                "El identificador de jornada es inválido"
            );
        }

        if ($clienteNombre === '' ||
            mb_strlen($clienteNombre) > 100) {
            throw new InvalidArgumentException(
                "El nombre del cliente es inválido"
            );
        }

        $this->validarCarrito($carrito);

        $efectivoCentavos = $this->decimalACentavos(
            $efectivoRecibido
        );

        // 2. Iniciar transacción
        $this->pdo->beginTransaction();

        try {
            // 3. Comprobar jornada y bloquear su fila
            $jornada = $this->jornadaRepository
                ->findByIdForUpdate($jornadaId);

            if ($jornada === null) {
                throw new InvalidArgumentException(
                    "Jornada no encontrada"
                );
            }

            if ($jornada['estado'] !== 'abierta') {
                throw new RuntimeException(
                    "La jornada no está abierta"
                );
            }

            // 4. Consultar productos
            $skus = array_keys($carrito);

            $productos = $this->productoRepository
                ->getBySkus($skus);

            if (count($productos) !== count($skus)) {
                throw new InvalidArgumentException(
                    "Uno o más productos no existen o están inactivos"
                );
            }

            // 5. Validar disponibilidad
            foreach ($productos as $producto) {
                $sku = $producto['sku'];
                $cantidad = $carrito[$sku];

                if ((int) $producto['stock'] < $cantidad) {
                    throw new RuntimeException(
                        "Stock insuficiente para: $sku"
                    );
                }
            }

            // 6. Calcular ticket
            $ticket = $this->pricingService
                ->calcularTicket($productos, $carrito);

            // 7. Validar efectivo y calcular cambio
            $totalCentavos = $this->decimalACentavos(
                $ticket['total']
            );

            if ($efectivoCentavos < $totalCentavos) {
                throw new InvalidArgumentException(
                    "El efectivo recibido es insuficiente"
                );
            }

            $cambioCentavos =
                $efectivoCentavos - $totalCentavos;

            $cambio = $this->centavosADecimal(
                $cambioCentavos
            );

            // 8. Crear encabezado de venta
            $ventaId = $this->ventaRepository->crearVenta([
                'cliente_nombre' => $clienteNombre,
                'subtotal' => $ticket['subtotal'],
                'iva_total' => $ticket['iva_total'],
                'descuento_total' => $ticket['descuento_total'],
                'total' => $ticket['total'],
                'efectivo_recibido' => $efectivoRecibido,
                'cambio' => $cambio,
                'fecha_hora' => date('Y-m-d H:i:s'),
                'estado' => 'completada',
                'jornada_id' => $jornadaId
            ]);

            // 9. Generar número comercial
            $numeroVenta = 'V-' . str_pad(
                (string) $ventaId,
                6,
                '0',
                STR_PAD_LEFT
            );

            $this->ventaRepository->setNumeroVenta(
                $ventaId,
                $numeroVenta
            );

            // 10. Registrar detalles y descontar stock
            // Se usa un orden estable de productos.
            $detalles = $ticket['detalles'];

            usort(
                $detalles,
                fn($a, $b) =>
                    $a['producto_id'] <=> $b['producto_id']
            );

            foreach ($detalles as $detalle) {
                $this->productoRepository->descontarStock(
                    (int) $detalle['producto_id'],
                    (int) $detalle['cantidad']
                );

                $this->ventaRepository->crearDetalle([
                    'venta_id' => $ventaId,
                    'producto_id' => $detalle['producto_id'],
                    'cantidad' => $detalle['cantidad'],
                    'precio_unitario' => $detalle['precio_unitario'],
                    'iva_pct' => $detalle['iva_pct'],
                    'subtotal_linea' => $detalle['subtotal_linea'],
                    'iva_linea' => $detalle['iva_linea'],
                    'total_linea' => $detalle['total_linea']
                ]);
            }

            // 11. Confirmar transacción
            $this->pdo->commit();

            // 12. Comprobante de venta
            return [
                'venta_id' => $ventaId,
                'numero_venta' => $numeroVenta,
                'cliente_nombre' => $clienteNombre,
                'jornada_id' => $jornadaId,
                'detalles' => $detalles,
                'subtotal' => $ticket['subtotal'],
                'iva_total' => $ticket['iva_total'],
                'descuento_total' => $ticket['descuento_total'],
                'total' => $ticket['total'],
                'efectivo_recibido' => $efectivoRecibido,
                'cambio' => $cambio,
                'estado' => 'completada'
            ];

        } catch (Throwable $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }

            throw $e;
        }
    }

    private function validarCarrito(array $carrito): void
    {
        if (empty($carrito)) {
            throw new InvalidArgumentException(
                "El carrito no puede estar vacío"
            );
        }

        foreach ($carrito as $sku => $cantidad) {
            if (!is_string($sku) ||
                trim($sku) === '') {
                throw new InvalidArgumentException(
                    "SKU inválido"
                );
            }

            if (!is_int($cantidad) || $cantidad <= 0) {
                throw new InvalidArgumentException(
                    "Cantidad inválida para: $sku"
                );
            }
        }
    }

    private function decimalACentavos(string $valor): int
    {
        if (!preg_match(
            '/^\d{1,10}\.\d{2}$/',
            $valor
        )) {
            throw new InvalidArgumentException(
                "Formato monetario inválido"
            );
        }

        [$entero, $decimal] = explode('.', $valor);

        return (int) $entero * 100 + (int) $decimal;
    }

    private function centavosADecimal(int $centavos): string
    {
        if ($centavos < 0) {
            throw new InvalidArgumentException(
                "Importe negativo no permitido"
            );
        }

        return intdiv($centavos, 100) . '.' .
            str_pad(
                (string) ($centavos % 100),
                2,
                '0',
                STR_PAD_LEFT
            );
    }
}
