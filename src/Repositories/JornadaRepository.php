<?php

class JornadaRepository {
    public function __construct(private PDO $pdo) {}

    public function findById(int $id): ?array{
        $query = $this->pdo->prepare("SELECT
                j.id,
                j.fecha_inicio,
                j.fecha_fin,
                j.estado,
                j.perdida_total,
                j.sobrecobro_total,
                j.jugador
            FROM jornadas AS j
            WHERE j.id = ?");

        $query->execute([$id]);
        $result = $query->fetch(PDO::FETCH_ASSOC);
        return $result ?: null;
    }

    /** La jornada abierta de ese jugador (cada jugador tiene como máximo una). */
    public function findAbierta(string $jugador): ?array
    {
        $query = $this->pdo->prepare(
            "SELECT id, fecha_inicio, fecha_fin, estado, perdida_total, sobrecobro_total, jugador
            FROM jornadas
            WHERE estado = 'abierta' AND jugador = ?
            LIMIT 1"
        );
        $query->execute([$jugador]);

        $result = $query->fetch(PDO::FETCH_ASSOC);

        return $result ?: null;
    }

    /** Crea una jornada abierta para el jugador y devuelve su id. */
    public function abrir(string $jugador): int
    {
        $this->pdo->prepare("INSERT INTO jornadas (estado, jugador) VALUES ('abierta', ?)")->execute([$jugador]);
        $id = (int) $this->pdo->lastInsertId();                     // antes de cualquier otra sentencia
        (new StockJugadorRepository($this->pdo))->asegurar($jugador);

        return $id;
    }

    /**
     * Cierra la jornada, ajusta el stock con lo que el juego detectó y guarda las pérdidas y sobrecobros
     * (se llama dentro de la transacción del servicio):
     *   $faltantes  {sku: cantidad} unidades que salieron sin cobrarse  -> se descuentan del stock (mínimo 0)
     *   $sobrantes  {sku: cantidad} unidades cobradas de más            -> se reponen al stock (máximo $maxStock)
     *   $perdida / $sobrecobro      importes en texto con 2 decimales ("7100.00")
     */
    public function cerrar(
        int $id,
        array $faltantes = [],
        array $sobrantes = [],
        string $perdida = '0.00',
        string $sobrecobro = '0.00',
        int $maxStock = ProductoService::MAX_STOCK
    ): void {
        $jugador = $this->jugadorDe($id);
        (new StockJugadorRepository($this->pdo))->asegurar($jugador);
        $this->ajustarStock($faltantes, -1, 'faltantes', $maxStock, $jugador);
        $this->ajustarStock($sobrantes, 1, 'sobrantes', $maxStock, $jugador);

        $query = $this->pdo->prepare(
            "UPDATE jornadas
            SET estado = 'cerrada', fecha_fin = CURRENT_TIMESTAMP,
                perdida_total = ?, sobrecobro_total = ?
            WHERE id = ? AND estado = 'abierta'"
        );
        $query->execute([$perdida, $sobrecobro, $id]);
    }

    /**
     * Suma ($signo = 1) o resta ($signo = -1) unidades al stock. Valida SKU y cantidades.
     * El stock nunca baja de 0 ni sube de $maxStock (se recorta en vez de fallar, para no bloquear el cierre).
     */
    private function ajustarStock(array $mapa, int $signo, string $tipo, int $maxStock, string $jugador): void
    {
        $existe = $this->pdo->prepare("SELECT 1 FROM productos WHERE sku = ?");
        // Es el stock del JUGADOR dueño de la jornada, no el de los demás
        $ajusta = $this->pdo->prepare(
            $signo < 0
                ? "UPDATE stock_jugador SET stock = GREATEST(stock - ?, 0)
                   WHERE jugador = ? AND producto_id = (SELECT id FROM productos WHERE sku = ?)"
                : "UPDATE stock_jugador SET stock = LEAST(stock + ?, $maxStock)
                   WHERE jugador = ? AND producto_id = (SELECT id FROM productos WHERE sku = ?)"
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
            $ajusta->execute([$cantidad, $jugador, $sku]);
        }
    }

    private function jugadorDe(int $id): string
    {
        $query = $this->pdo->prepare("SELECT jugador FROM jornadas WHERE id = ?");
        $query->execute([$id]);
        $jugador = $query->fetchColumn();
        if ($jugador === false) {
            throw new InvalidArgumentException('Jornada no encontrada');
        }

        return (string) $jugador;
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
                estado,
                perdida_total,
                sobrecobro_total,
                jugador
            FROM jornadas
            WHERE id = ?
            FOR UPDATE"
        );

        $query->execute([$id]);

        $result = $query->fetch(PDO::FETCH_ASSOC);

        return $result ?: null;
    }

}