<?php

class JornadaRepository {
    public function __construct(private PDO $pdo) {}

    public function findById(int $id): ?array{
        $query = $this->pdo->prepare("SELECT
                j.id,
                j.fecha_inicio,
                j.fecha_fin,
                j.estado
            FROM jornadas AS j
            WHERE j.id = ?");

        $query->execute([$id]);
        $result = $query->fetch(PDO::FETCH_ASSOC);
        return $result ?: null;
    }

    public function findAbierta(): ?array
    {
        $query = $this->pdo->query(
            "SELECT id, fecha_inicio, fecha_fin, estado
            FROM jornadas
            WHERE estado = 'abierta'
            LIMIT 1"
        );

        $result = $query->fetch(PDO::FETCH_ASSOC);

        return $result ?: null;
    }

    /** Crea una jornada abierta y devuelve su id. */
    public function abrir(): int
    {
        $this->pdo->exec("INSERT INTO jornadas (estado) VALUES ('abierta')");

        return (int) $this->pdo->lastInsertId();
    }

    /**
     * Cierra la jornada y ajusta el stock con lo que el juego detectó (se llama dentro de la transacción del servicio):
     *   $faltantes  {sku: cantidad} unidades que salieron sin cobrarse  -> se descuentan del stock
     *   $sobrantes  {sku: cantidad} unidades cobradas de más            -> se reponen al stock
     */
    public function cerrar(int $id, array $faltantes = [], array $sobrantes = []): void
    {
        $this->ajustarStock($faltantes, -1, 'faltantes');
        $this->ajustarStock($sobrantes, 1, 'sobrantes');

        $query = $this->pdo->prepare(
            "UPDATE jornadas
            SET estado = 'cerrada', fecha_fin = CURRENT_TIMESTAMP
            WHERE id = ? AND estado = 'abierta'"
        );
        $query->execute([$id]);
    }

    /** Suma ($signo = 1) o resta ($signo = -1) unidades al stock. Valida SKU y cantidades; el stock nunca baja de 0. */
    private function ajustarStock(array $mapa, int $signo, string $tipo): void
    {
        $existe = $this->pdo->prepare("SELECT 1 FROM productos WHERE sku = ?");
        $ajusta = $this->pdo->prepare(
            $signo < 0
                ? "UPDATE productos SET stock = GREATEST(stock - ?, 0) WHERE sku = ?"
                : "UPDATE productos SET stock = stock + ? WHERE sku = ?"
        );

        foreach ($mapa as $sku => $cantidad) {
            $sku = (string) $sku;                      // las claves numéricas de un array PHP llegan como int
            if (!is_int($cantidad) || $cantidad < 1) {
                throw new InvalidArgumentException("Cantidad de $tipo inválida para SKU $sku");
            }
            $existe->execute([$sku]);
            if ($existe->fetchColumn() === false) {
                throw new InvalidArgumentException("SKU desconocido en $tipo: $sku");
            }
            $ajusta->execute([$cantidad, $sku]);
        }
    }

    /** Ventas completadas y total vendido de una jornada. */
    public function resumen(int $id): array
    {
        $query = $this->pdo->prepare(
            "SELECT COUNT(*) AS ventas_completadas,
                    COALESCE(SUM(total), 0) AS total_vendido
            FROM ventas
            WHERE jornada_id = ? AND estado = 'completada'"
        );

        $query->execute([$id]);
        $row = $query->fetch(PDO::FETCH_ASSOC);

        return [
            'ventas_completadas' => (int) $row['ventas_completadas'],
            'total_vendido' => number_format((float) $row['total_vendido'], 2, '.', ''),
        ];
    }

    public function findByIdForUpdate(int $id): ?array
    {
        $query = $this->pdo->prepare(
            "SELECT
                id,
                fecha_inicio,
                fecha_fin,
                estado
            FROM jornadas
            WHERE id = ?
            FOR UPDATE"
        );

        $query->execute([$id]);

        $result = $query->fetch(PDO::FETCH_ASSOC);

        return $result ?: null;
    }

}