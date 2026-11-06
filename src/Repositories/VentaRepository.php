<?php

class VentaRepository{
    public function __construct(private PDO $pdo) {}

    public function crearVenta(array $datos): int{
        $query = $this->pdo->prepare("INSERT INTO ventas (
                cliente_nombre,
                subtotal,
                iva_total,
                descuento_total,
                total,
                efectivo_recibido,
                cambio,
                fecha_hora,
                estado,
                jornada_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

        $query->execute([
            $datos["cliente_nombre"],
            $datos["subtotal"],
            $datos["iva_total"],
            $datos["descuento_total"],
            $datos["total"],
            $datos["efectivo_recibido"],
            $datos["cambio"],
            $datos["fecha_hora"],
            $datos["estado"],
            $datos["jornada_id"]
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    public function crearDetalle(array $datos): int{
        $query = $this->pdo->prepare("INSERT INTO detalles_venta (
                venta_id,
                producto_id,
                cantidad,
                precio_unitario,
                iva_pct,
                subtotal_linea,
                iva_linea,
                total_linea
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        $query->execute([
            $datos["venta_id"],
            $datos["producto_id"],
            $datos["cantidad"],
            $datos["precio_unitario"],
            $datos["iva_pct"],
            $datos["subtotal_linea"],
            $datos["iva_linea"],
            $datos["total_linea"]
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    public function setNumeroVenta(int $ventaId, string $numeroVenta): void{
        $query = $this->pdo->prepare("UPDATE ventas
            SET numero_venta = ?
            WHERE id = ?");
        $query->execute([$numeroVenta, $ventaId]);
    }

    public function getById(int $id): ?array{
        $query = $this->pdo->prepare("SELECT
                v.id,
                v.numero_venta,
                v.cliente_nombre,
                v.subtotal,
                v.iva_total,
                v.descuento_total,
                v.total,
                v.efectivo_recibido,
                v.cambio,
                v.fecha_hora,
                v.estado,
                v.jornada_id
            FROM ventas AS v
            WHERE v.id = ?");

        $query->execute([$id]);
        $result = $query->fetch(PDO::FETCH_ASSOC);
        return $result ?: null;
    }

    public function getAll(): array{
        $query = $this->pdo->prepare("SELECT
                v.id,
                v.numero_venta,
                v.cliente_nombre,
                v.subtotal,
                v.iva_total,
                v.descuento_total,
                v.total,
                v.efectivo_recibido,
                v.cambio,
                v.fecha_hora,
                v.estado,
                v.jornada_id
            FROM ventas AS v");

        $query->execute();
        $result = $query->fetchAll(PDO::FETCH_ASSOC);
        return $result ?: [];
    }

}