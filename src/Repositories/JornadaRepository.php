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

    public function findAll(): array{
        $query = $this->pdo->prepare("SELECT
                j.id,
                j.fecha_inicio,
                j.fecha_fin,
                j.estado
            FROM jornadas AS j");

        $query->execute();
        $result = $query->fetchAll(PDO::FETCH_ASSOC);
        return $result ?: [];
    }

    public function getByRangoFechas(string $fechaInicio, string $fechaFin): array {
        $query = $this->pdo->prepare("SELECT
                j.id,
                j.fecha_inicio,
                j.fecha_fin,
                j.estado
            FROM jornadas AS j
            WHERE j.fecha_inicio >= ?
              AND j.fecha_fin <= ?");

        $query->execute([$fechaInicio, $fechaFin]);
        $result = $query->fetchAll(PDO::FETCH_ASSOC);
        return $result ?: [];
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

    public function cerrar(int $id): void
    {
        $query = $this->pdo->prepare(
            "UPDATE jornadas
            SET estado = 'cerrada', fecha_fin = CURRENT_TIMESTAMP
            WHERE id = ? AND estado = 'abierta'"
        );

        $query->execute([$id]);
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