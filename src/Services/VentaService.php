<?php

class VentaService
{
    public function __construct(
        private PDO $pdo,
        private VentaRepository $ventas,
        private ProductoRepository $productos,
        private JornadaRepository $jornadas
    ) {}

    /**
     * Cancela una venta completada y devuelve el stock al inventario.
     *
     * Orden de bloqueos (igual que CheckoutService, para evitar deadlocks):
     * jornada -> venta -> productos en orden ascendente de id.
     * Solo se cancelan ventas de una jornada abierta: una jornada cerrada
     * ya tiene su resumen entregado y no debe cambiar.
     */
    public function cancelar(int $ventaId): array
    {
        $venta = $this->ventas->getById($ventaId);

        if ($venta === null) {
            throw new InvalidArgumentException('Venta no encontrada');
        }

        $this->pdo->beginTransaction();

        try {
            $jornada = $this->jornadas
                ->findByIdForUpdate((int) $venta['jornada_id']);

            if ($jornada === null || $jornada['estado'] !== 'abierta') {
                throw new RuntimeException(
                    'No se pueden cancelar ventas de una jornada cerrada'
                );
            }

            // Se vuelve a leer ya con la fila bloqueada: otro proceso pudo
            // cancelarla entre la lectura anterior y el bloqueo.
            $venta = $this->ventas->getByIdForUpdate($ventaId);

            if ($venta['estado'] !== 'completada') {
                throw new RuntimeException('La venta ya está cancelada');
            }

            $detalles = $this->ventas->getDetallesByVentaId($ventaId);

            usort(
                $detalles,
                fn($a, $b) => $a['producto_id'] <=> $b['producto_id']
            );

            foreach ($detalles as $detalle) {
                $this->productos->devolverStock(
                    (int) $detalle['producto_id'],
                    (int) $detalle['cantidad']
                );
            }

            $this->ventas->marcarCancelada($ventaId);

            $this->pdo->commit();
        } catch (Throwable $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }

            throw $e;
        }

        $venta = $this->ventas->getById($ventaId);
        $venta['detalles'] = $this->ventas->getDetallesByVentaId($ventaId);

        return $venta;
    }
}
