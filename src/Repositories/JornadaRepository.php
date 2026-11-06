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